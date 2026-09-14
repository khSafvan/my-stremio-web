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
