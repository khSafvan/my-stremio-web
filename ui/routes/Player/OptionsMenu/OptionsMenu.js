// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const { useTranslation } = require('react-i18next');
const { usePlatform, useToast } = require('stremio/common');
const { default: usePlayOnDevice } = require('../usePlayOnDevice');
const Option = require('./Option');
const styles = require('./styles');

const OptionsMenu = React.memo(React.forwardRef(({ className, stream, playbackDevices, extraSubtitlesTracks, selectedExtraSubtitlesTrackId }, ref) => {
    const { t } = useTranslation();
    const platform = usePlatform();
    const toast = useToast();
    const { streamingUrl, playOnDevice } = usePlayOnDevice(stream);
    const [downloadUrl, magnetUrl] = React.useMemo(() => {
        return stream !== null ?
            stream.deepLinks &&
            stream.deepLinks.externalPlayer &&
            [
                stream.deepLinks.externalPlayer.download,
                stream.deepLinks.externalPlayer.magnet,
            ]
            :
            [null, null];
    }, [stream]);
    const externalDevices = React.useMemo(() => {
        return playbackDevices.filter(({ type }) => type === 'external');
    }, [playbackDevices]);

    const subtitlesTrackUrl = React.useMemo(() => {
        const track = extraSubtitlesTracks?.find(({ id }) => id === selectedExtraSubtitlesTrackId);
        return track?.fallbackUrl ?? track?.url ?? null;
    }, [extraSubtitlesTracks, selectedExtraSubtitlesTrackId]);

    const onCopyStreamButtonClick = React.useCallback(() => {
        if (streamingUrl || downloadUrl) {
            navigator.clipboard.writeText(streamingUrl || downloadUrl)
                .then(() => {
                    toast.show({
                        type: 'success',
                        title: 'Copied',
                        message: t('PLAYER_COPY_STREAM_SUCCESS'),
                        timeout: 3000
                    });
                })
                .catch((e) => {
                    console.error(e);
                    toast.show({
                        type: 'error',
                        title: t('ERROR'),
                        message: `${t('PLAYER_COPY_STREAM_ERROR')}: ${streamingUrl || downloadUrl}`,
                        timeout: 3000
                    });
                });
        }
    }, [streamingUrl, downloadUrl]);
    const onCopyMagnetButtonClick = React.useCallback(() => {
        if (magnetUrl) {
            navigator.clipboard.writeText(magnetUrl)
                .then(() => {
                    toast.show({
                        type: 'success',
                        title: 'Copied',
                        message: t('PLAYER_COPY_MAGNET_LINK_SUCCESS'),
                        timeout: 3000
                    });
                })
                .catch((e) => {
                    console.error(e);
                    toast.show({
                        type: 'error',
                        title: t('Error'),
                        message: `${t('PLAYER_COPY_MAGNET_LINK_ERROR')}: ${magnetUrl}`,
                        timeout: 3000
                    });
                });
        }
    }, [magnetUrl]);
    const onDownloadVideoButtonClick = React.useCallback(() => {
        if (downloadUrl) {
            platform.openExternal(downloadUrl);
        }
    }, [downloadUrl]);

    const onDownloadSubtitlesClick = React.useCallback(() => {
        subtitlesTrackUrl && platform.openExternal(subtitlesTrackUrl);
    }, [subtitlesTrackUrl]);

    const [aiEnhancement, setAiEnhancement] = React.useState(() => {
        try {
            return localStorage.getItem('stremio_ai_enhancement') || 'off';
        } catch (e) {
            return 'off';
        }
    });

    const onSelectAiEnhancement = React.useCallback((mode) => {
        setAiEnhancement(mode);
        try {
            localStorage.setItem('stremio_ai_enhancement', mode);
        } catch (e) {}

        if (platform?.shell && typeof platform.shell.send === 'function') {
            platform.shell.send('mpv-set-ai-enhancement', [mode]);
        }

        const title = mode === 'cas' 
            ? 'AMD FidelityFX CAS (Enabled)'
            : mode === 'anime4k'
                ? 'Anime4K Lite (Enabled)'
                : 'AI Video Enhancement: Off';

        const desc = mode === 'cas'
            ? 'Adaptive sharpening active (Movies & TV)'
            : mode === 'anime4k'
                ? 'Edge restore active (Anime)'
                : 'Zero GPU shader overhead (Default)';

        toast.show({
            type: mode === 'off' ? 'info' : 'success',
            title: title,
            message: desc,
            timeout: 2500
        });
    }, [platform?.shell, toast]);

    const onMouseDown = React.useCallback((event) => {
        event.nativeEvent.optionsMenuClosePrevented = true;
    }, []);

    return (
        <div ref={ref} className={classnames(className, styles['options-menu-container'])} onMouseDown={onMouseDown}>
            {
                streamingUrl || downloadUrl ?
                    <Option
                        icon={'link'}
                        label={t('CTX_COPY_STREAM_LINK')}
                        disabled={stream === null}
                        onClick={onCopyStreamButtonClick}
                    />
                    :
                    null
            }
            {
                magnetUrl ?
                    <Option
                        icon={'magnet-link'}
                        label={t('CTX_COPY_MAGNET_LINK')}
                        disabled={stream === null}
                        onClick={onCopyMagnetButtonClick}
                    />
                    :
                    null
            }
            {
                downloadUrl ?
                    <Option
                        icon={'download'}
                        label={t('CTX_DOWNLOAD_VIDEO')}
                        disabled={stream === null}
                        onClick={onDownloadVideoButtonClick}
                    />
                    :
                    null
            }
            {
                subtitlesTrackUrl ?
                    <Option
                        icon={'download'}
                        label={t('CTX_DOWNLOAD_SUBS')}
                        disabled={stream === null}
                        onClick={onDownloadSubtitlesClick}
                    />
                    :
                    null
            }
            {
                streamingUrl && externalDevices.map(({ id, name }) => (
                    <Option
                        key={id}
                        icon={'vlc'}
                        label={t('PLAYER_PLAY_IN', { device: name })}
                        deviceId={id}
                        disabled={stream === null}
                        onClick={playOnDevice}
                    />
                ))
            }
            <div className={styles['section-divider']} />
            <div className={styles['section-title']}>AI Video Enhancement</div>
            <Option
                icon={'close'}
                label={'Off (Default)'}
                active={aiEnhancement === 'off'}
                onClick={() => onSelectAiEnhancement('off')}
            />
            <Option
                icon={'movies'}
                label={'FidelityFX CAS (Movies/TV)'}
                active={aiEnhancement === 'cas'}
                onClick={() => onSelectAiEnhancement('cas')}
            />
            <Option
                icon={'anime'}
                label={'Anime4K (Anime/Art)'}
                active={aiEnhancement === 'anime4k'}
                onClick={() => onSelectAiEnhancement('anime4k')}
            />
        </div>
    );
}));

OptionsMenu.propTypes = {
    className: PropTypes.string,
    stream: PropTypes.object,
    playbackDevices: PropTypes.array,
    extraSubtitlesTracks: PropTypes.array,
    selectedExtraSubtitlesTrackId: PropTypes.string,
};

module.exports = OptionsMenu;
