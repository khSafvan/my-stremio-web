import { useEffect, useState } from 'react';
import EventEmitter from 'eventemitter3';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

const isTauri = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
if (isTauri && typeof window !== 'undefined') {
    // Notify @stremio/stremio-video that native shell is present so transcoding is bypassed
    (window as any).qt = (window as any).qt || { webChannelTransport: true };
}

const IPC = globalThis?.chrome?.webview;
const LEGACY_IPC = globalThis?.qt?.webChannelTransport;
if (LEGACY_IPC && typeof LEGACY_IPC === 'object' && 'onmessage' in LEGACY_IPC) {
    LEGACY_IPC.onmessage = () => { /* empty */ };
}

const events = new EventEmitter();

enum ShellEventType {
    SIGNAL = 1,
    INIT = 3,
    INVOKE_METHOD = 6,
}

type ShellEvent = {
    id: number;
    type: ShellEventType;
};

type ShellEventInit = ShellEvent & {
    data: {
        transport: {
            properties: string[][],
        }
    };
};

type ShellEventSignal = ShellEvent & {
    args: string[];
};

type ShellMessage = {
    data: string;
};

const useShell = (): Shell => {
    const [state, setState] = useState<ShellState>({
        initialized: isTauri,
        version: isTauri ? '4.4.168' : null,
        windowClosed: false,
        windowHidden: false,
    });
    const [capabilities, setCapabilities] = useState<ShellCapabilities>({
        gpuVideoProcessing: isTauri,
        nativeAssSubtitles: isTauri,
    });

    const on = (name: string, listener: (arg: any) => void) => events.on(name, listener);
    const off = (name: string, listener: (arg: any) => void) => events.off(name, listener);

    const send = (method: string, ...args: (string | number | object)[]) => {
        if (isTauri) {
            const argPayload = args.length > 0 ? (args.length === 1 ? args[0] : args) : null;
            invoke('shell_send_mpv', {
                method,
                args: argPayload,
            }).catch((err) => {
                console.error('[Tauri Shell] shell_send_mpv error:', err);
            });
            return;
        }

        try {
            IPC?.postMessage(JSON.stringify({
                id: 0,
                type: ShellEventType.INVOKE_METHOD,
                args: [method, ...args],
            }));
        } catch (e) {
            console.error('Shell', 'Failed to send event', e);
        }
    };

    useEffect(() => {
        const onWindowVisibilityChanged = (data: WindowVisibility) => {
            setState((state) => ({
                ...state,
                windowClosed: data.visible === false && data.visibility === 0,
            }));
        };

        const onWindowStateChanged = (data: WindowState) => {
            setState((state) => ({
                ...state,
                windowHidden: data.state === 9,
            }));
        };

        on('win-visibility-changed', onWindowVisibilityChanged);
        on('win-state-changed', onWindowStateChanged);

        return () => {
            off('win-visibility-changed', onWindowVisibilityChanged);
            off('win-state-changed', onWindowStateChanged);
        };
    }, []);

    useEffect(() => {
        if (isTauri) {
            let unlistenProp: (() => void) | undefined;
            let unlistenReady: (() => void) | undefined;

            listen('mpv-prop-change', (event: { payload: { name: string; data: any } }) => {
                events.emit('mpv-prop-change', event.payload);
            }).then((unlisten) => {
                unlistenProp = unlisten;
            });

            listen('mpv-event-video-ready', () => {
                events.emit('mpv-event-video-ready');
            }).then((unlisten) => {
                unlistenReady = unlisten;
            });

            return () => {
                unlistenProp?.();
                unlistenReady?.();
            };
        }

        const onMessage = (message: ShellMessage) => {
            try {
                const event = JSON.parse(message.data) as ShellEvent;

                if (event.type === ShellEventType.INIT) {
                    const { data } = event as ShellEventInit;
                    const shellProperties = Object.fromEntries(data.transport.properties
                        .filter((property) => property.length >= 4 && property[1])
                        .map(([, name,, value]) => [name, value]));

                    setState((state) => ({
                        ...state,
                        initialized: true,
                        version: shellProperties.shellVersion ?? null,
                    }));
                    setCapabilities({
                        gpuVideoProcessing: shellProperties.gpuVideoProcessing === 'true',
                        nativeAssSubtitles: shellProperties.nativeAssSubtitles === 'true',
                    });
                }

                if (event.type === ShellEventType.SIGNAL) {
                    const { args } = event as ShellEventSignal;
                    const [methodName, methodArg] = args;
                    events.emit(methodName, methodArg);
                }
            } catch (e) {
                console.error('Shell', 'Failed to handle event', e);
            }
        };

        IPC?.addEventListener('message', onMessage);
        IPC?.postMessage(JSON.stringify({
            id: 0,
            type: ShellEventType.INIT,
        }));

        return () => IPC?.removeEventListener('message', onMessage);
    }, []);

    return {
        active: isTauri || !!IPC,
        send,
        on,
        off,
        state,
        capabilities,
    };
};

export default useShell;
