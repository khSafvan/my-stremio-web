// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const { useNavigate } = require('react-router');
const { default: toPath } = require('stremio-router/toPath');
const { useGoBack } = require('stremio-router');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const { useTranslation } = require('react-i18next');
const { default: Icon } = require('@stremio/stremio-icons/react');
const { Button, Image, MultiselectMenu, AIOStreamsModal } = require('stremio/components');
const { useCore } = require('stremio/core');
const { loadAIOConfig, fetchAddonStreams } = require('stremio/services/AIOStreams');
const { MetadataBridge } = require('stremio/services');
const Stream = require('./Stream');
const styles = require('./styles');
const { usePlatform, useProfile } = require('stremio/common');
const { default: SeasonEpisodePicker } = require('../EpisodePicker');

const ALL_ADDONS_KEY = 'ALL';

const StreamsList = ({ className, video, type, metaId, onEpisodeSearch, ...props }) => {
    const { t } = useTranslation();
    const core = useCore();
    const platform = usePlatform();
    const profile = useProfile();
    const navigate = useNavigate();
    const goBack = useGoBack();
    const streamsContainerRef = React.useRef(null);
    const [selectedAddon, setSelectedAddon] = React.useState(ALL_ADDONS_KEY);
    const [isAIOModalOpen, setIsAIOModalOpen] = React.useState(false);
    const [aioStreams, setAioStreams] = React.useState(null);
    const [loadingAio, setLoadingAio] = React.useState(false);

    React.useEffect(() => {
        let cancelled = false;
        async function loadAio() {
            const rawId = metaId || (video?.id ? video.id.split(':')[0] : null);
            if (!rawId) return;

            setLoadingAio(true);
            try {
                let imdbId = rawId;
                if (rawId.startsWith('tmdb:')) {
                    const mediaType = type === 'series' ? 'tv' : 'movie';
                    const ext = await MetadataBridge.fetchTmdbExternalIds(mediaType, rawId.replace('tmdb:', ''));
                    if (ext?.imdb_id) {
                        imdbId = ext.imdb_id;
                    }
                }

                const aioConfig = loadAIOConfig();
                const manifestUrl = aioConfig?.manifestUrl || 'https://aiostreams.viren070.me';

                const mediaReq = {
                    type: type === 'series' ? 'series' : 'movie',
                    imdbId,
                    season: typeof video?.season === 'number' ? video.season : undefined,
                    episode: typeof video?.episode === 'number' ? video.episode : undefined,
                };

                const fetched = await fetchAddonStreams(manifestUrl, mediaReq);
                if (!cancelled) {
                    const mapped = fetched.map((stream) => {
                        return {
                            name: stream.name || 'AIOStreams',
                            description: stream.description || stream.title || 'Stream',
                            url: stream.url,
                            addonName: stream.name || 'AIOStreams',
                            thumbnail: stream.thumbnail,
                            behaviorHints: stream.behaviorHints,
                            onClick: async () => {
                                try {
                                    const encoded = await core.transport.encodeStream({
                                        name: stream.name || 'AIOStreams',
                                        description: stream.description || stream.title || '',
                                        url: stream.url,
                                        behaviorHints: stream.behaviorHints
                                    });
                                    navigate(`/player/${encodeURIComponent(encoded)}`);
                                } catch (e) {
                                    console.error('Failed to encode AIO stream:', e);
                                }
                            }
                        };
                    });
                    setAioStreams(mapped);
                }
            } catch (err) {
                console.warn('AIOStreams fetch error in StreamsList:', err);
            } finally {
                if (!cancelled) setLoadingAio(false);
            }
        }
        loadAio();
        return () => {
            cancelled = true;
        };
    }, [metaId, video, type, core.transport, navigate]);
    const onAddonSelected = React.useCallback((value) => {
        streamsContainerRef.current.scrollTo({ top: 0, left: 0, behavior: platform.name === 'ios' ? 'smooth' : 'instant' });
        setSelectedAddon(value);
    }, [platform]);
    const showInstallAddonsButton = React.useMemo(() => {
        return !profile || profile.auth === null || profile.auth?.user?.isNewUser === true && !video?.upcoming;
    }, [profile, video]);
    const backButtonOnClick = React.useCallback(() => {
        if (video.deepLinks && typeof video.deepLinks.metaDetailsVideos === 'string') {
            const navigateTo = `${video.deepLinks.metaDetailsVideos}${
                typeof video.season === 'number'
                    ? `?${new URLSearchParams({ 'season': video.season })}`
                    : ''}`;
            navigate(toPath(navigateTo), { replace: true });
        } else {
            goBack();
        }
    }, [video, navigate, goBack]);
    const countLoadingAddons = React.useMemo(() => {
        return props.streams.filter((stream) => stream.content.type === 'Loading').length;
    }, [props.streams]);
    const streamsByAddon = React.useMemo(() => {
        return props.streams
            .filter((streams) => streams.content.type === 'Ready')
            .reduce((streamsByAddon, streams) => {
                streamsByAddon[streams.addon.transportUrl] = {
                    addon: streams.addon,
                    streams: streams.content.content.map((stream) => ({
                        ...stream,
                        onClick: () => {
                            core.transport.analytics({
                                event: 'StreamClicked',
                                args: {
                                    stream
                                }
                            });
                        },
                        addonName: streams.addon.manifest.name
                    }))
                };

                return streamsByAddon;
            }, {});
    }, [props.streams]);
    const effectiveSelectedAddon = Object.prototype.hasOwnProperty.call(streamsByAddon, selectedAddon) ? selectedAddon : ALL_ADDONS_KEY;
    const filteredStreams = React.useMemo(() => {
        return effectiveSelectedAddon === ALL_ADDONS_KEY ?
            Object.values(streamsByAddon).map(({ streams }) => streams).flat(1)
            :
            streamsByAddon[effectiveSelectedAddon].streams;
    }, [streamsByAddon, effectiveSelectedAddon]);
    const selectableOptions = React.useMemo(() => {
        return {
            options: [
                {
                    value: ALL_ADDONS_KEY,
                    label: t('ALL_ADDONS'),
                    title: t('ALL_ADDONS')
                },
                ...Object.keys(streamsByAddon).map((transportUrl) => ({
                    value: transportUrl,
                    label: streamsByAddon[transportUrl].addon.manifest.name,
                    title: streamsByAddon[transportUrl].addon.manifest.name,
                }))
            ],
            value: effectiveSelectedAddon,
            onSelect: onAddonSelected
        };
    }, [streamsByAddon, effectiveSelectedAddon, onAddonSelected, t]);

    const handleEpisodePicker = React.useCallback((season, episode) => {
        onEpisodeSearch(season, episode);
    }, [onEpisodeSearch]);

    return (
        <div className={classnames(className, styles['streams-list-container'])}>
            <div className={styles['select-choices-wrapper']}>
                {
                    video ?
                        <React.Fragment>
                            <Button className={classnames(styles['button-container'], styles['back-button-container'])} tabIndex={0} onClick={backButtonOnClick}>
                                <Icon className={styles['icon']} name={'chevron-back'} />
                            </Button>
                            <div className={styles['episode-title']}>
                                {typeof video.season === 'number' && typeof video.episode === 'number'
                                    ? `S${video.season}E${video.episode}${video.title ? ` ${video.title}` : ''}`
                                    : (video.title ?? '')}
                            </div>
                        </React.Fragment>
                        :
                        null
                }
                {
                    Object.keys(streamsByAddon).length > 1 ?
                        <MultiselectMenu
                            {...selectableOptions}
                            className={styles['select-input-container']}
                        />
                        :
                        null
                }
            </div>
            {
                loadingAio && (!aioStreams || aioStreams.length === 0) && props.streams.length === 0 ? (
                    <div className={styles['streams-container']}>
                        <Stream.Placeholder />
                        <Stream.Placeholder />
                    </div>
                ) : (aioStreams && aioStreams.length > 0) || filteredStreams.length > 0 ? (
                    <div className={styles['streams-container']} ref={streamsContainerRef}>
                        {((aioStreams && aioStreams.length > 0) ? aioStreams : filteredStreams).map((stream, index) => (
                            <Stream
                                key={index}
                                videoId={video?.id}
                                videoReleased={video?.released}
                                addonName={stream.addonName || 'AIOStreams'}
                                name={stream.name}
                                description={stream.description}
                                thumbnail={stream.thumbnail}
                                progress={stream.progress}
                                deepLinks={stream.deepLinks}
                                onClick={stream.onClick}
                            />
                        ))}
                        <Button className={styles['install-button-container']} title={'Configure AIOStreams'} onClick={() => setIsAIOModalOpen(true)}>
                            <Icon className={styles['icon']} name={'settings'} />
                            <div className={styles['label']}>{'Configure AIOStreams'}</div>
                        </Button>
                    </div>
                ) : (
                    <div className={styles['message-container']}>
                        {
                            type === 'series' ?
                                <SeasonEpisodePicker className={styles['search']} onSubmit={handleEpisodePicker} />
                                : null
                        }
                        {
                            video?.upcoming ?
                                <div className={styles['label']}>{t('UPCOMING')}...</div>
                                : null
                        }
                        <Image className={styles['image']} src={require('/assets/images/empty.png')} alt={' '} />
                        <div className={styles['label']}>{t('NO_STREAM')}</div>
                        <Button className={styles['install-button-container']} title={'Configure AIOStreams'} onClick={() => setIsAIOModalOpen(true)}>
                            <Icon className={styles['icon']} name={'settings'} />
                            <div className={styles['label']}>{'Configure AIOStreams'}</div>
                        </Button>
                    </div>
                )
            }
            {isAIOModalOpen && (
                <AIOStreamsModal onCloseRequest={() => setIsAIOModalOpen(false)} />
            )}
        </div>
    );
};

StreamsList.propTypes = {
    className: PropTypes.string,
    streams: PropTypes.arrayOf(PropTypes.object).isRequired,
    video: PropTypes.object,
    type: PropTypes.string,
    onEpisodeSearch: PropTypes.func
};

module.exports = StreamsList;
