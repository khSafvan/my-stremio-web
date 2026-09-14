import { AIOStreamsConfig } from './types';

const STORAGE_KEY = 'springroll_aiostreams_config';
export const AIO_CONFIG_CHANGE_EVENT = 'springroll_aiostreams_config_changed';

/**
 * Loads the active AIOStreams configuration from localStorage.
 */
export function loadAIOConfig(): AIOStreamsConfig | null {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return null;
        return JSON.parse(stored);
    } catch (e) {
        console.warn('Failed to parse saved AIOStreams configuration from localStorage:', e);
        return null;
    }
}

/**
 * Saves or updates the active AIOStreams configuration in localStorage and broadcasts an update event.
 */
export function saveAIOConfig(config: AIOStreamsConfig): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
        window.dispatchEvent(new CustomEvent(AIO_CONFIG_CHANGE_EVENT, { detail: config }));
    } catch (e) {
        console.error('Failed to save AIOStreams configuration to localStorage:', e);
    }
}

/**
 * Clears the saved AIOStreams configuration.
 */
export function clearAIOConfig(): void {
    try {
        localStorage.removeItem(STORAGE_KEY);
        window.dispatchEvent(new CustomEvent(AIO_CONFIG_CHANGE_EVENT, { detail: null }));
    } catch (e) {
        console.error('Failed to clear AIOStreams configuration from localStorage:', e);
    }
}
