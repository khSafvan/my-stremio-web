// TMDb API Client for Springroll Catalog & Discovery

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

// Default public read token / key fallback (can be overridden by user in settings)
const DEFAULT_TMDB_API_KEY = 'e61ff0eb0b2f5b682662c5957d191d89';

export const getTmdbApiKey = (): string => {
    try {
        return localStorage.getItem('springroll_tmdb_api_key') || DEFAULT_TMDB_API_KEY;
    } catch {
        return DEFAULT_TMDB_API_KEY;
    }
};

export const setTmdbApiKey = (key: string): void => {
    try {
        localStorage.setItem('springroll_tmdb_api_key', key.trim());
    } catch (e) {
        console.error('Failed to save TMDb API key:', e);
    }
};

export interface TmdbMediaItem {
    id: number;
    title?: string;
    name?: string;
    overview: string;
    poster_path: string | null;
    backdrop_path: string | null;
    release_date?: string;
    first_air_date?: string;
    vote_average: number;
    vote_count: number;
    genre_ids: number[];
    media_type?: 'movie' | 'tv';
}

export interface TmdbImageRecord {
    file_path: string;
    iso_639_1: string | null;
    width: number;
    height: number;
}

export interface TmdbImagesResponse {
    id: number;
    logos: TmdbImageRecord[];
    backdrops: TmdbImageRecord[];
    posters: TmdbImageRecord[];
}

export const getBackdropUrl = (path: string | null, size: 'w780' | 'w1280' | 'original' = 'w1280'): string => {
    if (!path) return '';
    return `${TMDB_IMAGE_BASE}/${size}${path}`;
};

export const getPosterUrl = (path: string | null, size: 'w342' | 'w500' | 'w780' | 'original' = 'w500'): string => {
    if (!path) return '';
    return `${TMDB_IMAGE_BASE}/${size}${path}`;
};

export const getLogoUrl = (path: string | null, size: 'w300' | 'w500' | 'original' = 'w500'): string => {
    if (!path) return '';
    return `${TMDB_IMAGE_BASE}/${size}${path}`;
};

export const fetchTmdbTrending = async (
    mediaType: 'all' | 'movie' | 'tv' = 'all',
    timeWindow: 'day' | 'week' = 'day'
): Promise<TmdbMediaItem[]> => {
    const key = getTmdbApiKey();
    const url = `${TMDB_BASE_URL}/trending/${mediaType}/${timeWindow}?api_key=${key}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`TMDb trending fetch failed: ${resp.status}`);
    const data = await resp.json();
    return data.results || [];
};

export const fetchTmdbPopular = async (
    mediaType: 'movie' | 'tv' = 'movie',
    page: number = 1
): Promise<TmdbMediaItem[]> => {
    const key = getTmdbApiKey();
    const url = `${TMDB_BASE_URL}/${mediaType}/popular?api_key=${key}&page=${page}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`TMDb popular fetch failed: ${resp.status}`);
    const data = await resp.json();
    return data.results || [];
};

export const fetchTmdbClearLogo = async (
    mediaType: 'movie' | 'tv',
    tmdbId: number | string
): Promise<string | null> => {
    try {
        const key = getTmdbApiKey();
        const url = `${TMDB_BASE_URL}/${mediaType}/${tmdbId}/images?api_key=${key}&include_image_language=en,null`;
        const resp = await fetch(url);
        if (!resp.ok) return null;
        const data: TmdbImagesResponse = await resp.json();
        
        // Find English logo first, or first available transparent PNG logo
        const englishLogo = data.logos.find(l => l.iso_639_1 === 'en');
        const fallbackLogo = data.logos[0];
        const selected = englishLogo || fallbackLogo;
        
        return selected ? getLogoUrl(selected.file_path) : null;
    } catch {
        return null;
    }
};

export const fetchTmdbExternalIds = async (
    mediaType: 'movie' | 'tv',
    tmdbId: number | string
): Promise<{ imdb_id?: string; tvdb_id?: number } | null> => {
    try {
        const key = getTmdbApiKey();
        const url = `${TMDB_BASE_URL}/${mediaType}/${tmdbId}/external_ids?api_key=${key}`;
        const resp = await fetch(url);
        if (!resp.ok) return null;
        return await resp.json();
    } catch {
        return null;
    }
};
