import { PlaybackProgressItem } from './types';

const SIMKL_API_BASE = 'https://api.simkl.com';
const STORAGE_KEY_PROGRESS = 'springroll_playback_progress';
const STORAGE_KEY_TOKEN = 'springroll_simkl_token';
const STORAGE_KEY_CLIENT_ID = 'springroll_simkl_client_id';

// Fallback client ID for public read-only requests if needed
const DEFAULT_SIMKL_CLIENT_ID = '4f039a894765d70b7416fb9ce8bfa6395b0c80c2fbf5a0fa0287a9167c13dc1e';

// Throttling state to respect SIMKL's 1 POST/sec and 30-second interval guidelines
let lastPostTimestamp = 0;
const mediaLastSyncMap = new Map<string, number>();

/**
 * Gets the current SIMKL OAuth or user access token from localStorage.
 */
export function getSimklToken(): string | null {
    try {
        return localStorage.getItem(STORAGE_KEY_TOKEN);
    } catch {
        return null;
    }
}

/**
 * Sets the SIMKL OAuth access token in localStorage.
 */
export function setSimklToken(token: string): void {
    try {
        localStorage.setItem(STORAGE_KEY_TOKEN, token);
    } catch (e) {
        console.error('Failed to save SIMKL token:', e);
    }
}

/**
 * Gets the SIMKL client ID.
 */
export function getSimklClientId(): string {
    try {
        return localStorage.getItem(STORAGE_KEY_CLIENT_ID) || DEFAULT_SIMKL_CLIENT_ID;
    } catch {
        return DEFAULT_SIMKL_CLIENT_ID;
    }
}

/**
 * Retrieves the local-first "Continue Watching" queue.
 */
export function getLocalContinueWatching(): PlaybackProgressItem[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_PROGRESS);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];

        // Return unfinished items (progress < 80%) sorted by most recently watched
        return parsed
            .filter((item) => !item.completed && item.progressPercent < 80)
            .sort((a, b) => b.lastWatchedAt - a.lastWatchedAt);
    } catch {
        return [];
    }
}

/**
 * Saves or updates a playback progress item locally.
 */
function saveLocalProgress(item: PlaybackProgressItem): void {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_PROGRESS);
        let list: PlaybackProgressItem[] = [];
        if (raw) {
            try {
                list = JSON.parse(raw);
            } catch {}
        }

        // Deduplicate by mediaId + season + episode
        const key = `${item.mediaId}_${item.season ?? 0}_${item.episode ?? 0}`;
        list = list.filter((p) => `${p.mediaId}_${p.season ?? 0}_${p.episode ?? 0}` !== key);

        list.unshift(item);

        // Keep maximum 50 recent items
        if (list.length > 50) {
            list = list.slice(0, 50);
        }

        localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(list));
        window.dispatchEvent(new CustomEvent('springroll_continue_watching_updated', { detail: list }));
    } catch (e) {
        console.error('Failed to save local playback progress:', e);
    }
}

/**
 * Fetches "Continue Watching" progress items from SIMKL /sync/playback or local storage fallback.
 */
export async function fetchContinueWatching(): Promise<PlaybackProgressItem[]> {
    const token = getSimklToken();
    const clientId = getSimklClientId();

    // If unauthenticated, immediately return local-first progress
    if (!token) {
        return getLocalContinueWatching();
    }

    try {
        const response = await fetch(`${SIMKL_API_BASE}/sync/playback`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'simkl-api-key': clientId,
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            return getLocalContinueWatching();
        }

        const data = await response.json();
        const items: PlaybackProgressItem[] = [];

        // Parse movies from SIMKL playback response
        if (Array.isArray(data.movies)) {
            for (const entry of data.movies) {
                const movie = entry.movie;
                if (!movie) continue;
                items.push({
                    mediaId: movie.ids?.imdb || String(movie.ids?.simkl),
                    simklId: movie.ids?.simkl,
                    tmdbId: movie.ids?.tmdb,
                    type: 'movie',
                    title: movie.title || 'Movie',
                    posterUrl: movie.poster ? `https://simkl.in/posters/${movie.poster}_m.jpg` : undefined,
                    progressPercent: Math.round(entry.progress || 0),
                    currentTimeSeconds: 0,
                    durationSeconds: 0,
                    lastWatchedAt: new Date(entry.last_watched_at || Date.now()).getTime(),
                    completed: (entry.progress || 0) >= 80,
                });
            }
        }

        // Parse shows from SIMKL playback response
        if (Array.isArray(data.shows)) {
            for (const entry of data.shows) {
                const show = entry.show;
                const ep = entry.episode;
                if (!show) continue;
                items.push({
                    mediaId: show.ids?.imdb || String(show.ids?.simkl),
                    simklId: show.ids?.simkl,
                    tmdbId: show.ids?.tmdb,
                    type: 'show',
                    title: show.title || 'Series',
                    season: ep?.season,
                    episode: ep?.episode,
                    posterUrl: show.poster ? `https://simkl.in/posters/${show.poster}_m.jpg` : undefined,
                    progressPercent: Math.round(entry.progress || 0),
                    currentTimeSeconds: 0,
                    durationSeconds: 0,
                    lastWatchedAt: new Date(entry.last_watched_at || Date.now()).getTime(),
                    completed: (entry.progress || 0) >= 80,
                });
            }
        }

        return items.filter((item) => !item.completed && item.progressPercent < 80);
    } catch {
        return getLocalContinueWatching();
    }
}

/**
 * Updates playback progress. Throttles requests according to SIMKL guidelines:
 * - Syncs immediately on pause or stop (forceSync = true)
 * - Otherwise throttles to at most once per 30 seconds per item
 * - Enforces minimum 1000ms delay between consecutive POSTs
 */
export async function syncPlaybackProgress(
    item: PlaybackProgressItem,
    forceSync = false
): Promise<void> {
    // 1. Always save to local storage first (instant responsiveness)
    saveLocalProgress(item);

    const token = getSimklToken();
    const clientId = getSimklClientId();
    if (!token) return;

    const key = `${item.mediaId}_${item.season ?? 0}_${item.episode ?? 0}`;
    const now = Date.now();
    const lastItemSync = mediaLastSyncMap.get(key) || 0;

    // Check throttle (30s) unless forced (e.g. video pause or player exit)
    if (!forceSync && now - lastItemSync < 30000) {
        return;
    }

    // Enforce 1 POST/sec rule
    if (now - lastPostTimestamp < 1000) {
        return;
    }

    lastPostTimestamp = now;
    mediaLastSyncMap.set(key, now);

    try {
        const payload: any = {};
        if (item.type === 'movie') {
            payload.movies = [
                {
                    title: item.title,
                    ids: {
                        ...(item.mediaId.startsWith('tt') ? { imdb: item.mediaId } : {}),
                        ...(item.simklId ? { simkl: item.simklId } : {}),
                    },
                    progress: Math.min(100, Math.max(0, Math.round(item.progressPercent))),
                },
            ];
        } else {
            payload.shows = [
                {
                    title: item.title,
                    ids: {
                        ...(item.mediaId.startsWith('tt') ? { imdb: item.mediaId } : {}),
                        ...(item.simklId ? { simkl: item.simklId } : {}),
                    },
                    seasons: [
                        {
                            number: item.season || 1,
                            episodes: [
                                {
                                    number: item.episode || 1,
                                    progress: Math.min(100, Math.max(0, Math.round(item.progressPercent))),
                                },
                            ],
                        },
                    ],
                },
            ];
        }

        await fetch(`${SIMKL_API_BASE}/sync/playback`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'simkl-api-key': clientId,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
    } catch (e) {
        console.warn('Failed to sync progress to SIMKL cloud:', e);
    }
}

/**
 * Marks a movie or episode as completed (scrobbles to /sync/history).
 * Called when playback crosses the >= 80% threshold.
 */
export async function markMediaCompleted(item: PlaybackProgressItem): Promise<void> {
    item.completed = true;
    item.progressPercent = 100;
    saveLocalProgress(item);

    const token = getSimklToken();
    const clientId = getSimklClientId();
    if (!token) return;

    const now = Date.now();
    if (now - lastPostTimestamp < 1000) {
        await new Promise((r) => setTimeout(r, 1100));
    }
    lastPostTimestamp = Date.now();

    try {
        const payload: any = {};
        if (item.type === 'movie') {
            payload.movies = [
                {
                    title: item.title,
                    ids: {
                        ...(item.mediaId.startsWith('tt') ? { imdb: item.mediaId } : {}),
                        ...(item.simklId ? { simkl: item.simklId } : {}),
                    },
                },
            ];
        } else {
            payload.shows = [
                {
                    title: item.title,
                    ids: {
                        ...(item.mediaId.startsWith('tt') ? { imdb: item.mediaId } : {}),
                        ...(item.simklId ? { simkl: item.simklId } : {}),
                    },
                    seasons: [
                        {
                            number: item.season || 1,
                            episodes: [{ number: item.episode || 1 }],
                        },
                    ],
                },
            ];
        }

        await fetch(`${SIMKL_API_BASE}/sync/history`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'simkl-api-key': clientId,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
    } catch (e) {
        console.warn('Failed to scrobble completed item to SIMKL:', e);
    }
}
