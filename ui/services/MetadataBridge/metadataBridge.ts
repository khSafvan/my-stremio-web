// Metadata Bridge: Maps TMDb & SIMKL records into standardized Springroll Meta items

import {
    fetchTmdbTrending,
    fetchTmdbPopular,
    fetchTmdbTopRated,
    fetchTmdbDetails,
    fetchTmdbClearLogo,
    fetchTmdbExternalIds,
    getPosterUrl,
    getBackdropUrl,
    TmdbMediaItem
} from './tmdbClient';
import { fetchSimklAiringAnime, fetchSimklTrendingAnime, resolveCrossId, SimklAnimeItem } from './simklClient';

export interface SpringrollCatalogItem {
    id: string; // Standard IMDb 'tt...' or 'tmdb:...'
    type: 'movie' | 'series' | 'anime';
    name: string;
    poster: string | null;
    background: string | null;
    logo?: string | null;
    description?: string;
    releaseInfo?: string;
    imdbRating?: string;
    genres?: string[];
}

export const getTrendingFeed = async (mediaType: 'all' | 'movie' | 'tv' = 'all'): Promise<SpringrollCatalogItem[]> => {
    const rawItems = await fetchTmdbTrending(mediaType, 'day');
    return rawItems.map(item => {
        const isMovie = item.media_type === 'movie' || (mediaType === 'movie') || Boolean(item.title);
        const name = item.title || item.name || 'Untitled';
        const year = (item.release_date || item.first_air_date || '').slice(0, 4);
        const rating = item.vote_average ? item.vote_average.toFixed(1) : undefined;
        
        return {
            id: `tmdb:${item.id}`,
            type: isMovie ? 'movie' : 'series',
            name,
            poster: getPosterUrl(item.poster_path),
            background: getBackdropUrl(item.backdrop_path),
            description: item.overview,
            releaseInfo: year,
            imdbRating: rating
        };
    });
};

export const getPopularFeed = async (mediaType: 'movie' | 'tv' = 'movie'): Promise<SpringrollCatalogItem[]> => {
    const rawItems = await fetchTmdbPopular(mediaType, 1);
    return rawItems.map(item => {
        const isMovie = mediaType === 'movie';
        const name = item.title || item.name || 'Untitled';
        const year = (item.release_date || item.first_air_date || '').slice(0, 4);
        const rating = item.vote_average ? item.vote_average.toFixed(1) : undefined;
        
        return {
            id: `tmdb:${item.id}`,
            type: isMovie ? 'movie' : 'series',
            name,
            poster: getPosterUrl(item.poster_path),
            background: getBackdropUrl(item.backdrop_path),
            description: item.overview,
            releaseInfo: year,
            imdbRating: rating
        };
    });
};

export const getTopRatedFeed = async (mediaType: 'movie' | 'tv' = 'movie'): Promise<SpringrollCatalogItem[]> => {
    const rawItems = await fetchTmdbTopRated(mediaType, 1);
    return rawItems.map(item => {
        const isMovie = mediaType === 'movie';
        const name = item.title || item.name || 'Untitled';
        const year = (item.release_date || item.first_air_date || '').slice(0, 4);
        const rating = item.vote_average ? item.vote_average.toFixed(1) : undefined;
        
        return {
            id: `tmdb:${item.id}`,
            type: isMovie ? 'movie' : 'series',
            name,
            poster: getPosterUrl(item.poster_path),
            background: getBackdropUrl(item.backdrop_path),
            description: item.overview,
            releaseInfo: year,
            imdbRating: rating
        };
    });
};

export const getAnimeFeed = async (): Promise<SpringrollCatalogItem[]> => {
    const animeList = await fetchSimklTrendingAnime('week');
    return animeList.map(anime => {
        // Use resolved IMDb ID if available; fallback to mal or simkl
        const standardId = anime.ids.imdb
            ? anime.ids.imdb
            : anime.ids.tmdb
                ? `tmdb:${anime.ids.tmdb}`
                : `simkl:${anime.ids.simkl}`;

        return {
            id: standardId,
            type: 'series',
            name: anime.title,
            poster: anime.poster ? `https://simkl.in/posters/${anime.poster}_m.webp` : null,
            background: anime.fanart ? `https://simkl.in/fanart/${anime.fanart}_medium.webp` : null,
            releaseInfo: anime.year ? String(anime.year) : undefined,
            imdbRating: anime.rating ? anime.rating.toFixed(1) : undefined
        };
    });
};
