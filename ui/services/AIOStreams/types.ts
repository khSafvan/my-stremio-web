export interface StremioBehaviorHints {
    notWebReady?: boolean;
    bingeGroup?: string;
    proxyHeaders?: {
        request?: Record<string, string>;
        response?: Record<string, string>;
    };
    countryWhitelist?: string[];
    headers?: Record<string, string>;
}

export interface StremioStream {
    name?: string;               // e.g. "AIOStreams | 4K RD+"
    title?: string;              // e.g. "Movie.2024.2160p... \n💾 18.4 GB | 👤 120"
    description?: string;        // Alternative/legacy description text
    url?: string;                // Direct HTTP(S) stream link (Debrid, MP4/MKV, HLS)
    infoHash?: string;           // P2P/Torrent infoHash (if un-cached or P2P mode)
    fileIdx?: number;            // Index of the file within multi-file torrents
    behaviorHints?: StremioBehaviorHints;
    addonName?: string;
}

export interface StremioStreamResponse {
    streams: StremioStream[];
}

export type MediaRequest = 
    | { type: 'movie'; imdbId: string }
    | { type: 'series'; imdbId: string; season: number; episode: number };

export interface AIOScraperAddon {
    id?: string;
    name: string;
    type: string; // e.g. 'torrentio', 'comet', 'mediafusion', 'torbox', 'jackett'
    enabled: boolean;
    instanceUrl?: string;
    options?: Record<string, any>;
}

export interface AIODebridService {
    id: string; // e.g. 'realdebrid', 'torbox', 'alldebrid', 'premiumize', 'debridlink'
    name: string;
    enabled: boolean;
    apiKey?: string;
    token?: string;
    options?: Record<string, any>;
}

export interface AIOFormatterConfig {
    name?: string;
    description?: string;
}

export interface AIOFiltersConfig {
    resolutions?: string[];
    maxSize?: number; // GB
    minSize?: number; // GB
    excludeKeywords?: string[];
    requireCached?: boolean;
    prioritizeHdr?: boolean;
    prioritize4k?: boolean;
}

export interface AIOStreamsConfig {
    instanceUrl: string;           // Base AIOStreams instance host (e.g. "https://aiostreams.viren070.me")
    manifestUrl: string;           // Complete manifest URL with config token (e.g. "https://.../{token}/manifest.json")
    configToken?: string;          // Encoded or server token segment
    services?: AIODebridService[];
    addons?: AIOScraperAddon[];
    formatter?: AIOFormatterConfig;
    filters?: AIOFiltersConfig;
    directPlayOnly?: boolean;      // Filter out non-direct/P2P links for web players
    timeoutMs?: number;
    updatedAt?: number;
}

export interface AIOStreamsTemplate {
    version?: string | number;
    instanceUrl?: string;
    manifestUrl?: string;
    services?: AIODebridService[];
    addons?: AIOScraperAddon[];
    formatter?: AIOFormatterConfig;
    filters?: AIOFiltersConfig;
    options?: Record<string, any>;
}
