import { UnifiedMediaDetails, TrailerInfo } from './types';
import { fetchOmdbRatings } from './omdbClient';
import { fetchAniListMetadata } from './anilistClient';
import {
    fetchTmdbExternalIds,
    fetchTmdbClearLogo,
    getBackdropUrl,
    getPosterUrl,
} from '../MetadataBridge/tmdbClient';

const TMDB_API_BASE = 'https://api.themoviedb.org/3';

// Fallback public key for development
const DEFAULT_TMDB_API_KEY = '454c0cfbda12c3f87b8b2a1a8e1b3c7c';

function getTmdbApiKey(): string {
    try {
        return localStorage.getItem('springroll_tmdb_api_key') || DEFAULT_TMDB_API_KEY;
    } catch {
        return DEFAULT_TMDB_API_KEY;
    }
}

/**
 * Builds standard trailer URLs for embedded iframes and zero-key stream proxies.
 */
export function buildTrailerInfo(youtubeKey: string, title?: string): TrailerInfo {
    return {
        youtubeKey,
        title,
        embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeKey}?autoplay=1`,
        pipedStreamUrl: `https://pipedapi.kavin.rocks/streams/${youtubeKey}`,
    };
}

/**
 * Resolves complete unified media details for any IMDb ID, querying TMDb, OMDb, and AniList in parallel.
 */
export async function resolveMediaDetails(options: {
    imdbId: string;
    isAnime?: boolean;
    malId?: number;
    titleFallback?: string;
}): Promise<UnifiedMediaDetails> {
    const { imdbId, isAnime = false, malId, titleFallback = '' } = options;
    const tmdbKey = getTmdbApiKey();

    const cleanImdb = imdbId.startsWith('tt') ? imdbId : `tt${imdbId}`;

    // Parallel fetch: TMDb lookup + OMDb ratings + optional AniList
    const [tmdbFindRes, omdbRatings, aniListMeta] = await Promise.all([
        fetch(`${TMDB_API_BASE}/find/${cleanImdb}?api_key=${tmdbKey}&external_source=imdb_id`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
        fetchOmdbRatings(cleanImdb),
        isAnime || malId
            ? fetchAniListMetadata({
                  idMal: malId,
                  search: titleFallback || undefined,
              })
            : Promise.resolve(null),
    ]);

    let title = titleFallback;
    let overview = '';
    let posterUrl = '';
    let backdropUrl: string | undefined;
    let tmdbId: number | undefined;
    let type: 'movie' | 'series' | 'anime' = isAnime ? 'anime' : 'movie';
    let tmdbScore: number | undefined;
    let genres: string[] = [];
    let releaseYear: string | undefined;

    // Process TMDb item if found
    const movieResult = tmdbFindRes?.movie_results?.[0];
    const tvResult = tmdbFindRes?.tv_results?.[0];
    const match = movieResult || tvResult;

    if (match) {
        title = match.title || match.name || titleFallback;
        overview = match.overview || '';
        posterUrl = match.poster_path ? getPosterUrl(match.poster_path, 'w780') : '';
        backdropUrl = match.backdrop_path ? getBackdropUrl(match.backdrop_path, 'original') : undefined;
        tmdbId = match.id;
        tmdbScore = match.vote_average ? Math.round(match.vote_average * 10) / 10 : undefined;
        type = movieResult ? 'movie' : isAnime ? 'anime' : 'series';

        const dateStr = match.release_date || match.first_air_date;
        if (dateStr) {
            releaseYear = dateStr.slice(0, 4);
        }
    }

    // Resolve Trailer & ClearLogo in parallel if we have tmdbId
    let trailer: TrailerInfo | undefined;
    let logoUrl: string | undefined;

    const subTasks: Promise<any>[] = [];

    // Subtask 1: Fetch ClearLogo from TMDb
    if (tmdbId) {
        const mediaType = movieResult ? 'movie' : 'tv';
        subTasks.push(
            fetchTmdbClearLogo(mediaType, tmdbId).then((logo) => {
                if (logo) logoUrl = logo;
            })
        );

        // Subtask 2: Fetch Trailer from TMDb
        subTasks.push(
            fetch(`${TMDB_API_BASE}/${mediaType}/${tmdbId}/videos?api_key=${tmdbKey}`)
                .then((r) => (r.ok ? r.json() : null))
                .then((videoData) => {
                    if (videoData?.results && Array.isArray(videoData.results)) {
                        const tr = videoData.results.find(
                            (v: any) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
                        );
                        if (tr?.key) {
                            trailer = buildTrailerInfo(tr.key, tr.name || `${title} Trailer`);
                        }
                    }
                })
                .catch(() => null)
        );
    }

    await Promise.allSettled(subTasks);

    // If anime provided a trailer and TMDb didn't have one
    if (!trailer && aniListMeta?.trailerKey) {
        trailer = buildTrailerInfo(aniListMeta.trailerKey, `${title} Trailer`);
    }

    return {
        imdbId: cleanImdb,
        tmdbId,
        title,
        overview,
        posterUrl,
        backdropUrl,
        logoUrl,
        type,
        ratings: {
            ...omdbRatings,
            ...(tmdbScore ? { tmdbScore } : {}),
            ...(aniListMeta?.averageScore ? { aniListScore: aniListMeta.averageScore } : {}),
        },
        trailer,
        anime: aniListMeta || undefined,
        genres,
        releaseYear,
    };
}
