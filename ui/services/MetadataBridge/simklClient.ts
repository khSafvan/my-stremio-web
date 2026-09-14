// SIMKL API Client for Springroll Unified Anime & Cross-ID Bridge

const SIMKL_BASE_URL = 'https://api.simkl.com';

// Public client id for free read requests (can be overridden by user in settings)
const DEFAULT_SIMKL_CLIENT_ID = 'e15b53d5a5704a29a502f6bc4dbcf0c7974e64f7b60f58fb3b4b9b9a695392e9';

export const getSimklClientId = (): string => {
    try {
        return localStorage.getItem('springroll_simkl_client_id') || DEFAULT_SIMKL_CLIENT_ID;
    } catch {
        return DEFAULT_SIMKL_CLIENT_ID;
    }
};

export const setSimklClientId = (clientId: string): void => {
    try {
        localStorage.setItem('springroll_simkl_client_id', clientId.trim());
    } catch (e) {
        console.error('Failed to save SIMKL client ID:', e);
    }
};

export interface SimklIdBridge {
    simkl?: number;
    imdb?: string;
    tmdb?: number;
    mal?: number;
    tvdb?: number;
    anidb?: number;
}

export interface SimklAnimeItem {
    title: string;
    poster: string;
    fanart?: string;
    year?: number;
    ids: SimklIdBridge;
    rank?: number;
    rating?: number;
    anime_type?: string;
}

export const fetchSimklAiringAnime = async (): Promise<SimklAnimeItem[]> => {
    const clientId = getSimklClientId();
    const url = `${SIMKL_BASE_URL}/anime/airing?client_id=${clientId}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`SIMKL airing fetch failed: ${resp.status}`);
    return await resp.json();
};

export const fetchSimklTrendingAnime = async (
    filter: 'today' | 'week' | 'month' = 'week'
): Promise<SimklAnimeItem[]> => {
    const clientId = getSimklClientId();
    const url = `${SIMKL_BASE_URL}/anime/trending/${filter}?client_id=${clientId}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`SIMKL trending fetch failed: ${resp.status}`);
    return await resp.json();
};

export const resolveCrossId = async (
    params: { imdb?: string; tmdb?: string | number; mal?: string | number; simkl?: string | number }
): Promise<SimklIdBridge | null> => {
    try {
        const clientId = getSimklClientId();
        const queryParams = new URLSearchParams({ client_id: clientId });
        if (params.imdb) queryParams.set('imdb', params.imdb);
        if (params.tmdb) queryParams.set('tmdb', String(params.tmdb));
        if (params.mal) queryParams.set('mal', String(params.mal));
        if (params.simkl) queryParams.set('simkl', String(params.simkl));

        const url = `${SIMKL_BASE_URL}/search/id?${queryParams.toString()}`;
        const resp = await fetch(url);
        if (!resp.ok) return null;
        const data = await resp.json();
        return Array.isArray(data) && data[0] ? data[0].ids : data.ids || null;
    } catch {
        return null;
    }
};
