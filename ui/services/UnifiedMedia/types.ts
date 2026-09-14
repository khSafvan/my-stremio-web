export interface MultiRatings {
    imdb?: string;               // e.g. "8.6/10" or "8.6"
    rottenTomatoes?: string;     // e.g. "92%"
    metacritic?: string;         // e.g. "79/100"
    aniListScore?: number;       // e.g. 84 (0-100)
    tmdbScore?: number;          // e.g. 8.2 (0-10)
}

export interface TrailerInfo {
    youtubeKey: string;
    title?: string;
    embedUrl: string;            // https://www.youtube-nocookie.com/embed/{key}?autoplay=1
    pipedStreamUrl?: string;     // https://pipedapi.kavin.rocks/streams/{key}
}

export interface OpenSubTrack {
    id: string;
    language: string;
    languageName?: string;
    format: 'vtt' | 'srt';
    url?: string;
    fileId?: number;
    hearingImpaired?: boolean;
    downloads?: number;
}

export interface PlaybackProgressItem {
    mediaId: string;             // Normalized IMDb ID (e.g. "tt1234567") or SIMKL ID
    simklId?: number;
    tmdbId?: number;
    type: 'movie' | 'show' | 'anime';
    title: string;
    posterUrl?: string;
    backdropUrl?: string;
    season?: number;
    episode?: number;
    progressPercent: number;     // 0 - 100
    currentTimeSeconds: number;
    durationSeconds: number;
    lastWatchedAt: number;       // Unix timestamp in ms
    completed: boolean;          // true if >= 80%
}

export interface AnimeMetadata {
    romajiTitle?: string;
    englishTitle?: string;
    nativeTitle?: string;
    episodesCount?: number;
    nextAiringEpisode?: {
        episode: number;
        airingAt: number;        // Unix timestamp in seconds
    };
    averageScore?: number;
    bannerUrl?: string;
    trailerKey?: string;
    status?: string;
}

export interface UnifiedMediaDetails {
    imdbId: string;
    tmdbId?: number;
    simklId?: number;
    title: string;
    overview: string;
    posterUrl: string;
    backdropUrl?: string;
    logoUrl?: string;            // ClearLogo transparent title PNG
    type: 'movie' | 'series' | 'anime';
    ratings: MultiRatings;
    trailer?: TrailerInfo;
    anime?: AnimeMetadata;
    genres?: string[];
    releaseYear?: string;
}
