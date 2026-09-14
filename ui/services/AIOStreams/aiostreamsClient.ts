import {
    StremioStream,
    StremioStreamResponse,
    MediaRequest,
    AIOStreamsConfig,
    AIOStreamsTemplate,
} from './types';

/**
 * Normalizes any Stremio or AIOStreams URL:
 * - Converts `stremio://` protocol to `https://`
 * - Removes trailing slashes
 * - Strips trailing `/manifest.json`
 */
export function normalizeAddonBaseUrl(rawUrl: string): string {
    if (!rawUrl || typeof rawUrl !== 'string') return '';
    let url = rawUrl.trim();

    if (url.startsWith('stremio://')) {
        url = 'https://' + url.slice('stremio://'.length);
    }

    return url
        .replace(/\/manifest\.json$/i, '')
        .replace(/\/+$/, '');
}

/**
 * Builds the complete manifest URL from a base or manifest URL.
 */
export function buildManifestUrl(url: string): string {
    const clean = normalizeAddonBaseUrl(url);
    if (!clean) return '';
    return `${clean}/manifest.json`;
}

/**
 * Safely decodes base64 strings, supporting URL-safe base64 (- and _) and UTF-8 characters.
 */
function safeBase64Decode(str: string): string | null {
    try {
        let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4 !== 0) {
            base64 += '=';
        }
        const binary = atob(base64);
        const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
        return new TextDecoder().decode(bytes);
    } catch {
        return null;
    }
}

/**
 * Safely encodes UTF-8 string to URL-safe base64 without padding.
 */
function safeBase64Encode(str: string): string {
    const bytes = new TextEncoder().encode(str);
    const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
    return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

/**
 * Parses an AIOStreams URL to extract the instance host, the configuration token segment,
 * and decodes the embedded configuration if present.
 */
export function parseAIOManifestUrl(inputUrl: string): {
    instanceUrl: string;
    configToken?: string;
    decodedConfig?: Partial<AIOStreamsTemplate>;
} {
    const clean = normalizeAddonBaseUrl(inputUrl);
    if (!clean) {
        return { instanceUrl: '' };
    }

    try {
        const parsed = new URL(clean);
        const pathSegments = parsed.pathname.split('/').filter(Boolean);

        const instanceUrl = `${parsed.protocol}//${parsed.host}`;
        if (pathSegments.length === 0) {
            return { instanceUrl };
        }

        const configToken = pathSegments[pathSegments.length - 1];
        let decodedConfig: Partial<AIOStreamsTemplate> | undefined;

        // Attempt to decode base64 token
        const decodedText = safeBase64Decode(configToken);
        if (decodedText) {
            try {
                const parsedJson = JSON.parse(decodedText);
                if (typeof parsedJson === 'object' && parsedJson !== null) {
                    decodedConfig = parsedJson;
                }
            } catch {
                // Not JSON, token might be an encrypted server UUID or hash
            }
        }

        return {
            instanceUrl,
            configToken,
            decodedConfig,
        };
    } catch {
        return { instanceUrl: clean };
    }
}

/**
 * Imports an AIOStreams configuration or template from:
 * 1. A full manifest URL (e.g. `https://my-aio.com/ey.../manifest.json` or `stremio://...`)
 * 2. An exported JSON string or template object (`aiostreams-config.json`)
 * 3. A base64 configuration string
 */
export function importAIOConfiguration(
    input: string | AIOStreamsTemplate,
    fallbackInstanceUrl = 'https://aiostreams.viren070.me'
): AIOStreamsConfig {
    let rawObj: any = null;
    let manifestUrl = '';
    let instanceUrl = fallbackInstanceUrl;
    let configToken: string | undefined;

    if (typeof input === 'object' && input !== null) {
        rawObj = input;
    } else if (typeof input === 'string') {
        const trimmed = input.trim();

        // Case A: URL input (starts with http://, https://, or stremio://)
        if (/^(https?:\/\/|stremio:\/\/)/i.test(trimmed)) {
            const parsed = parseAIOManifestUrl(trimmed);
            instanceUrl = parsed.instanceUrl || fallbackInstanceUrl;
            configToken = parsed.configToken;
            manifestUrl = buildManifestUrl(trimmed);

            if (parsed.decodedConfig) {
                rawObj = parsed.decodedConfig;
            }
        } else {
            // Case B: Try parsing as JSON directly
            try {
                rawObj = JSON.parse(trimmed);
            } catch {
                // Case C: Try decoding as base64 string
                const decoded = safeBase64Decode(trimmed);
                if (decoded) {
                    try {
                        rawObj = JSON.parse(decoded);
                    } catch {
                        // Not JSON
                    }
                }
            }
        }
    }

    if (!rawObj && !manifestUrl) {
        throw new Error('Invalid AIOStreams configuration. Expected a valid URL, JSON export, or template.');
    }

    if (rawObj) {
        if (rawObj.instanceUrl && typeof rawObj.instanceUrl === 'string') {
            instanceUrl = normalizeAddonBaseUrl(rawObj.instanceUrl);
        }
        if (rawObj.manifestUrl && typeof rawObj.manifestUrl === 'string') {
            manifestUrl = buildManifestUrl(rawObj.manifestUrl);
        }
    }

    // If manifest URL was not given directly, construct one if possible
    if (!manifestUrl && rawObj) {
        // If we have an instance URL and can serialize the template into base64
        const token = safeBase64Encode(JSON.stringify(rawObj));
        manifestUrl = `${instanceUrl}/${token}/manifest.json`;
        configToken = token;
    }

    return {
        instanceUrl,
        manifestUrl,
        configToken,
        services: Array.isArray(rawObj?.services) ? rawObj.services : [],
        addons: Array.isArray(rawObj?.addons) ? rawObj.addons : [],
        formatter: rawObj?.formatter || {},
        filters: rawObj?.filters || {},
        directPlayOnly: true,
        timeoutMs: 12000,
        updatedAt: Date.now(),
    };
}

/**
 * Exports an AIOStreamsConfig into a clean JSON template compatible with
 * the AIOStreams dashboard and community template configurators.
 */
export function exportAIOConfiguration(config: AIOStreamsConfig): string {
    const template: AIOStreamsTemplate = {
        version: '1.0.0',
        instanceUrl: config.instanceUrl,
        manifestUrl: config.manifestUrl,
        services: config.services || [],
        addons: config.addons || [],
        formatter: config.formatter || {},
        filters: config.filters || {},
    };

    return JSON.stringify(template, null, 2);
}

/**
 * Fetches the manifest.json of an AIOStreams or Stremio addon to verify connectivity and metadata.
 */
export async function fetchAIOManifest(addonUrl: string, timeoutMs = 8000): Promise<any> {
    const manifestUrl = buildManifestUrl(addonUrl);
    if (!manifestUrl) throw new Error('Invalid Addon URL');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(manifestUrl, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            signal: controller.signal,
        });

        if (!response.ok) {
            throw new Error(`Manifest request failed with status HTTP ${response.status}`);
        }

        return await response.json();
    } catch (err: any) {
        if (err.name === 'AbortError') {
            throw new Error(`Connection timed out after ${timeoutMs}ms`);
        }
        throw err;
    } finally {
        clearTimeout(timeoutId);
    }
}

/**
 * Tests connection latency and health against an AIOStreams manifest endpoint.
 */
export async function testAIOConnection(manifestUrl: string): Promise<{
    success: boolean;
    latencyMs: number;
    manifest?: any;
    error?: string;
}> {
    const startTime = performance.now();
    try {
        const manifest = await fetchAIOManifest(manifestUrl, 6000);
        const latencyMs = Math.round(performance.now() - startTime);
        return { success: true, latencyMs, manifest };
    } catch (err: any) {
        const latencyMs = Math.round(performance.now() - startTime);
        return { success: false, latencyMs, error: err.message || 'Connection failed' };
    }
}

/**
 * Fetches available streams from an AIOStreams or Stremio addon endpoint.
 * 
 * @param addonUrl - Base addon URL (e.g. "https://aio.example.com/xyz123" or ".../manifest.json")
 * @param media - Media target details (movie or series)
 * @param timeoutMs - Request timeout in milliseconds (default: 12000)
 */
export async function fetchAddonStreams(
    addonUrl: string,
    media: MediaRequest,
    timeoutMs = 12000
): Promise<StremioStream[]> {
    const cleanBaseUrl = normalizeAddonBaseUrl(addonUrl);
    if (!cleanBaseUrl) return [];

    // Format target identifier: "tt1234567" or "tt1234567:1:1"
    const videoId = media.type === 'series'
        ? `${media.imdbId}:${media.season}:${media.episode}`
        : media.imdbId;

    const endpoint = `${cleanBaseUrl}/stream/${media.type}/${encodeURIComponent(videoId)}.json`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
            signal: controller.signal,
        });

        if (!response.ok) {
            throw new Error(`Addon returned HTTP ${response.status}: ${response.statusText}`);
        }

        const data: StremioStreamResponse = await response.json();

        if (!data || !Array.isArray(data.streams)) {
            return [];
        }

        return data.streams;
    } catch (err: any) {
        if (err.name === 'AbortError') {
            throw new Error(`Stream request timed out after ${timeoutMs}ms`);
        }
        throw err;
    } finally {
        clearTimeout(timeoutId);
    }
}

/**
 * Filters streams according to playback capabilities:
 * - Direct HTTP links vs raw P2P infoHash
 * - Web-ready verification (notWebReady behavior hint)
 */
export function filterPlayableStreams(
    streams: StremioStream[],
    options: { directPlayOnly?: boolean; requireWebReady?: boolean } = {}
): StremioStream[] {
    const { directPlayOnly = true, requireWebReady = true } = options;

    return streams.filter((stream) => {
        if (!stream) return false;

        // If direct HTTP playback is requested, ensure stream has an HTTP url
        if (directPlayOnly) {
            const hasHttpUrl = typeof stream.url === 'string' && /^https?:\/\//i.test(stream.url);
            if (!hasHttpUrl) return false;
        }

        // If web-ready is required, filter out streams flagged as notWebReady
        if (requireWebReady && stream.behaviorHints?.notWebReady) {
            return false;
        }

        return true;
    });
}
