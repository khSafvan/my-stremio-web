import { OpenSubTrack } from './types';

const OPENSUB_API_BASE = 'https://api.opensubtitles.com/api/v1';
const STORAGE_KEY_OPENSUB_KEY = 'springroll_opensubtitles_api_key';

// Fallback public key for development
const DEFAULT_OPENSUB_KEY = 'YOUR_OPENSUBTITLES_API_KEY';

/**
 * Gets OpenSubtitles API key from localStorage or fallback.
 */
export function getOpenSubtitlesApiKey(): string {
    try {
        return localStorage.getItem(STORAGE_KEY_OPENSUB_KEY) || DEFAULT_OPENSUB_KEY;
    } catch {
        return DEFAULT_OPENSUB_KEY;
    }
}

/**
 * Searches for subtitles using the OpenSubtitles.com REST API v1.
 */
export async function searchOpenSubtitles(options: {
    imdbId: string;
    languages?: string;
    season?: number;
    episode?: number;
    apiKey?: string;
}): Promise<OpenSubTrack[]> {
    const { imdbId, languages = 'en', season, episode } = options;
    const apiKey = options.apiKey || getOpenSubtitlesApiKey();

    // Strip "tt" prefix if present for numeric IMDb ID query
    const cleanImdb = imdbId.replace(/^tt/i, '');

    const params = new URLSearchParams({
        imdb_id: cleanImdb,
        languages,
    });

    if (typeof season === 'number' && typeof episode === 'number') {
        params.append('season_number', String(season));
        params.append('episode_number', String(episode));
    }

    try {
        const response = await fetch(`${OPENSUB_API_BASE}/subtitles?${params.toString()}`, {
            method: 'GET',
            headers: {
                'Api-Key': apiKey,
                'User-Agent': 'Springroll v1.0',
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            return [];
        }

        const data = await response.json();
        if (!data || !Array.isArray(data.data)) {
            return [];
        }

        return data.data.map((item: any) => {
            const attrs = item.attributes;
            const file = attrs.files?.[0];

            return {
                id: item.id,
                language: attrs.language || 'en',
                languageName: attrs.feature_details?.movie_name || attrs.language,
                format: (attrs.format || 'vtt').toLowerCase() as 'vtt' | 'srt',
                fileId: file?.file_id,
                url: file?.file_id ? `${OPENSUB_API_BASE}/download` : undefined,
                hearingImpaired: !!attrs.hearing_impaired,
                downloads: attrs.download_count || 0,
            };
        });
    } catch (e) {
        console.warn('Failed to fetch OpenSubtitles REST v1 subtitles:', e);
        return [];
    }
}

export interface SubtitleTrackItem {
    id: string;
    lang: string;
    label: string;
    origin: string;
    url?: string | null;
    embedded?: boolean;
    exclusive?: boolean;
    local?: boolean;
}

/**
 * Downloads a subtitle file directly from OpenSubtitles REST API v1.
 * Returns the direct link or direct text content.
 */
export async function downloadSubtitleUrl(fileId: number, apiKey?: string): Promise<string | null> {
    const key = apiKey || getOpenSubtitlesApiKey();

    try {
        const response = await fetch(`${OPENSUB_API_BASE}/download`, {
            method: 'POST',
            headers: {
                'Api-Key': key,
                'User-Agent': 'Springroll v1.0',
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ file_id: fileId }),
        });

        if (!response.ok) return null;
        const data = await response.json();
        return data.link || null;
    } catch {
        return null;
    }
}

/**
 * Resolves full subtitle tracks for any media (movies, series episodes),
 * leveraging both direct high-speed OpenSubtitles endpoints and official REST v1.
 */
export async function fetchUnifiedSubtitles(options: {
    type?: string;
    id: string;
    season?: number;
    episode?: number;
    languages?: string;
}): Promise<SubtitleTrackItem[]> {
    const { type = 'movie', id, season, episode, languages = 'en' } = options;
    const apiKey = getOpenSubtitlesApiKey();
    const results: SubtitleTrackItem[] = [];

    let cleanId = id;
    let seasonNum = season;
    let episodeNum = episode;

    // Parse series Season/Episode if embedded in ID (e.g. tt0944947:1:1 or tmdb:1399:1:1)
    if (cleanId.includes(':')) {
        const parts = cleanId.split(':');
        if (cleanId.startsWith('tmdb:') && parts.length >= 4) {
            seasonNum = Number(parts[2]);
            episodeNum = Number(parts[3]);
        } else if (!cleanId.startsWith('tmdb:') && parts.length >= 3) {
            seasonNum = Number(parts[1]);
            episodeNum = Number(parts[2]);
        }
    }

    // Resolve tmdb: prefix to IMDb ID if necessary
    if (cleanId.startsWith('tmdb:')) {
        try {
            const { fetchTmdbExternalIds } = await import('../MetadataBridge/tmdbClient');
            const parts = cleanId.split(':');
            const rawTmdbId = parts[1];
            const mediaType = type === 'series' || type === 'tv' ? 'tv' : 'movie';
            const ext = await fetchTmdbExternalIds(mediaType, rawTmdbId);
            if (ext?.imdb_id) {
                if (seasonNum !== undefined && episodeNum !== undefined) {
                    cleanId = `${ext.imdb_id}:${seasonNum}:${episodeNum}`;
                } else {
                    cleanId = ext.imdb_id;
                }
            }
        } catch (e) {
            console.warn('[OpenSubtitles] Failed resolving TMDb to IMDb for subtitles:', e);
        }
    }

    const normalizedType = type === 'tv' ? 'series' : type;

    // 0. Active AIOStreams instance subtitles (if user has configured AIOStreams with subtitles)
    try {
        const { loadAIOConfig } = await import('../AIOStreams/storage');
        const aioConfig = loadAIOConfig();
        if (aioConfig?.manifestUrl) {
            const { fetchAddonSubtitles } = await import('../AIOStreams/aiostreamsClient');
            const aioSubs = await fetchAddonSubtitles(aioConfig.manifestUrl, {
                type: normalizedType,
                id: cleanId,
            });
            if (Array.isArray(aioSubs)) {
                for (const sub of aioSubs) {
                    if (sub && sub.url) {
                        results.push({
                            id: `aio_${sub.id || Math.random().toString(36).slice(2)}`,
                            lang: sub.lang || 'eng',
                            label: sub.label || sub.subtitleFileName || sub.movieReleaseName || sub.lang || 'AIO Subtitles',
                            origin: 'AIOStreams',
                            url: sub.url,
                            embedded: false,
                        });
                    }
                }
            }
        }
    } catch (e) {
        console.warn('[OpenSubtitles] AIOStreams subtitles lookup error:', e);
    }

    // 1. Direct high-speed OpenSubtitles endpoint (Zero-config, fast, no rate-limits)
    try {
        const directUrl = `https://opensubtitles-v3.strem.io/subtitles/${normalizedType}/${encodeURIComponent(cleanId)}.json`;
        const res = await fetch(directUrl);
        if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.subtitles)) {
                for (const sub of data.subtitles) {
                    if (sub && sub.id && sub.url) {
                        results.push({
                            id: `opensub_${sub.id}`,
                            lang: sub.lang || 'eng',
                            label: sub.subtitleFileName || sub.movieReleaseName || sub.lang || 'Subtitles',
                            origin: 'OpenSubtitles',
                            url: sub.url,
                            embedded: false,
                        });
                    }
                }
            }
        }
    } catch (e) {
        console.warn('[OpenSubtitles] Direct subtitles lookup error:', e);
    }

    // 2. Official OpenSubtitles REST API v1 if custom API key is present
    if (apiKey && apiKey !== DEFAULT_OPENSUB_KEY) {
        try {
            const imdbBase = cleanId.split(':')[0];
            const apiTracks = await searchOpenSubtitles({
                imdbId: imdbBase,
                languages,
                season: seasonNum,
                episode: episodeNum,
                apiKey,
            });

            for (const t of apiTracks) {
                const subId = `opensub_v1_${t.id}`;
                if (!results.some((r) => r.id === subId)) {
                    results.push({
                        id: subId,
                        lang: t.language,
                        label: t.languageName || t.language,
                        origin: 'OpenSubtitles v1',
                        url: t.url,
                        embedded: false,
                    });
                }
            }
        } catch (e) {
            console.warn('[OpenSubtitles] REST v1 search error:', e);
        }
    }

    return results;
}
