import { MultiRatings } from './types';

const STORAGE_KEY_OMDB = 'springroll_omdb_api_key';
const DEFAULT_OMDB_KEY = 'b8b321c1'; // Fallback public dev key

/**
 * Gets OMDb API key from localStorage or fallback.
 */
export function getOmdbApiKey(): string {
    try {
        return localStorage.getItem(STORAGE_KEY_OMDB) || DEFAULT_OMDB_KEY;
    } catch {
        return DEFAULT_OMDB_KEY;
    }
}

/**
 * Fetches structured ratings (Rotten Tomatoes Tomatometer, IMDb, Metacritic) from OMDb API.
 */
export async function fetchOmdbRatings(imdbId: string, customApiKey?: string): Promise<MultiRatings> {
    if (!imdbId) return {};
    const apiKey = customApiKey || getOmdbApiKey();

    const cleanImdb = imdbId.startsWith('tt') ? imdbId : `tt${imdbId}`;

    try {
        const response = await fetch(`https://www.omdbapi.com/?i=${encodeURIComponent(cleanImdb)}&apikey=${apiKey}`);
        if (!response.ok) return {};

        const data = await response.json();
        if (data.Response === 'False') {
            return {};
        }

        const ratings: MultiRatings = {};

        if (data.imdbRating && data.imdbRating !== 'N/A') {
            ratings.imdb = `${data.imdbRating}/10`;
        }

        if (Array.isArray(data.Ratings)) {
            const rt = data.Ratings.find((r: any) => r.Source === 'Rotten Tomatoes');
            if (rt?.Value) {
                ratings.rottenTomatoes = rt.Value;
            }

            const meta = data.Ratings.find((r: any) => r.Source === 'Metacritic');
            if (meta?.Value) {
                ratings.metacritic = meta.Value;
            }
        }

        return ratings;
    } catch (e) {
        console.warn(`Failed to fetch OMDb ratings for ${imdbId}:`, e);
        return {};
    }
}
