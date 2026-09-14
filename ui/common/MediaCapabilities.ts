// Copyright (C) 2017-2024 Smart code / Stremio authors
// Enhanced video format & codec capabilities detector for optimal Direct Play & Smart Transmuxing

export interface MediaCapabilities {
    formats: string[];
    videoCodecs: string[];
    audioCodecs: string[];
    maxAudioChannels: number;
}

interface CodecConfig {
    codec: string;
    aliases?: string[];
    mimes: string[];
    force?: boolean;
}

const VIDEO_CODEC_CONFIGS: CodecConfig[] = [
    {
        codec: 'h264',
        aliases: ['avc', 'avc1'],
        mimes: [
            'video/mp4; codecs="avc1.42E01E"',
            'video/mp4; codecs="avc1.640028"',
            'video/mp4; codecs="avc1.4d401f"',
        ],
        force: typeof window !== 'undefined' && !!(window.chrome || (window as unknown as { cast?: unknown }).cast),
    },
    {
        codec: 'h265',
        aliases: ['hevc', 'hev1', 'hvc1'],
        mimes: [
            'video/mp4; codecs="hev1.1.6.L150.B0"',
            'video/mp4; codecs="hvc1.1.6.L150.B0"',
            'video/mp4; codecs="hev1.2.4.L153.B0"',
        ],
    },
    {
        codec: 'vp8',
        mimes: [
            'video/webm; codecs="vp8"',
            'video/mp4; codecs="vp8"',
        ],
    },
    {
        codec: 'vp9',
        mimes: [
            'video/webm; codecs="vp9"',
            'video/mp4; codecs="vp9"',
            'video/mp4; codecs="vp09.00.10.08"',
        ],
    },
    {
        codec: 'av1',
        aliases: ['av01'],
        mimes: [
            'video/mp4; codecs="av01.0.08M.08"',
            'video/mp4; codecs="av01.0.05M.08"',
            'video/webm; codecs="av01.0.08M.08"',
        ],
    },
];

const AUDIO_CODEC_CONFIGS: CodecConfig[] = [
    {
        codec: 'aac',
        mimes: [
            'audio/mp4; codecs="mp4a.40.2"',
            'audio/aac',
        ],
    },
    {
        codec: 'mp3',
        mimes: [
            'audio/mp4; codecs="mp3"',
            'audio/mpeg',
        ],
    },
    {
        codec: 'opus',
        mimes: [
            'audio/mp4; codecs="opus"',
            'audio/ogg; codecs="opus"',
            'audio/webm; codecs="opus"',
        ],
    },
    {
        codec: 'vorbis',
        mimes: [
            'audio/mp4; codecs="vorbis"',
            'audio/ogg; codecs="vorbis"',
            'audio/webm; codecs="vorbis"',
        ],
    },
    {
        codec: 'flac',
        mimes: [
            'audio/flac',
            'audio/mp4; codecs="flac"',
        ],
    },
    {
        codec: 'ac3',
        mimes: [
            'audio/mp4; codecs="ac-3"',
            'audio/mp4; codecs="ac3"',
        ],
    },
    {
        codec: 'eac3',
        aliases: ['ec-3'],
        mimes: [
            'audio/mp4; codecs="ec-3"',
            'audio/mp4; codecs="eac3"',
        ],
    },
];

function canPlayConfig(config: CodecConfig, mediaElement: HTMLVideoElement): string[] {
    if (config.force) {
        return [config.codec, ...(config.aliases || [])];
    }
    if (typeof mediaElement.canPlayType !== 'function') {
        return [];
    }

    const isSupported = config.mimes.some((mime) => {
        const canPlay = mediaElement.canPlayType(mime);
        return canPlay === 'probably' || canPlay === 'maybe';
    });

    return isSupported ? [config.codec, ...(config.aliases || [])] : [];
}

function getMaxAudioChannels(): number {
    if (typeof window === 'undefined') {
        return 2;
    }
    if (/firefox/i.test(window.navigator.userAgent)) {
        return 6;
    }

    try {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
            const ctx = new AudioContextClass();
            const channels = ctx.destination?.maxChannelCount;
            ctx.close().catch(() => {});
            if (channels && channels > 0) {
                return channels;
            }
        }
    } catch {
        // Fallback gracefully
    }

    return 2;
}

let cachedCapabilities: MediaCapabilities | null = null;

export function getMediaCapabilities(forceRefresh = false): MediaCapabilities {
    if (cachedCapabilities && !forceRefresh) {
        return cachedCapabilities;
    }

    if (typeof document === 'undefined') {
        return {
            formats: ['mp4', 'matroska,webm'],
            videoCodecs: ['h264', 'hevc', 'h265', 'vp8', 'vp9', 'av1'],
            audioCodecs: ['aac', 'mp3', 'opus', 'vorbis', 'flac', 'ac3', 'eac3'],
            maxAudioChannels: 2,
        };
    }

    const mediaElement = document.createElement('video');
    const formats = ['mp4'];

    const canPlayWebM = mediaElement.canPlayType('video/webm');
    const canPlayMatroska = mediaElement.canPlayType('video/x-matroska');
    const isChromeOrCast = !!(window.chrome || (window as unknown as { cast?: unknown }).cast);

    if (canPlayWebM || canPlayMatroska || isChromeOrCast) {
        formats.push('matroska,webm');
    }
    if (mediaElement.canPlayType('video/ogg')) {
        formats.push('ogg');
    }

    const videoCodecs = VIDEO_CODEC_CONFIGS.flatMap((config) => canPlayConfig(config, mediaElement));
    const audioCodecs = AUDIO_CODEC_CONFIGS.flatMap((config) => canPlayConfig(config, mediaElement));
    const maxAudioChannels = getMaxAudioChannels();

    cachedCapabilities = {
        formats,
        videoCodecs: Array.from(new Set(videoCodecs)),
        audioCodecs: Array.from(new Set(audioCodecs)),
        maxAudioChannels,
    };

    return cachedCapabilities;
}

export default getMediaCapabilities;
