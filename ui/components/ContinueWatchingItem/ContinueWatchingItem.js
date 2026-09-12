// Copyright (C) 2017-2026 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const { useCore } = require('stremio/core');
const LibItem = require('stremio/components/LibItem');

const getEpisodeSubtitle = (props) => {
    let epTag = '';
    if (typeof props.season === 'number' && typeof props.episode === 'number') {
        epTag = `S${props.season} E${props.episode}`;
    } else if (
        typeof props.state?.season === 'number' &&
        typeof props.state?.episode === 'number'
    ) {
        epTag = `S${props.state.season} E${props.state.episode}`;
    } else if (typeof props.state?.video_id === 'string') {
        const match = props.state.video_id.match(/:(\d+):(\d+)$/);
        if (match) {
            epTag = `S${match[1]} E${match[2]}`;
        }
    }

    const title = props.episodeTitle || props.state?.title || props.videoTitle;
    if (epTag && title) {
        return `${epTag} • ${title}`;
    }
    if (epTag) {
        return epTag;
    }
    if (title) {
        return title;
    }
    if (props.type === 'movie') {
        return 'Movie';
    }
    return '';
};

const ContinueWatchingItem = ({ _id, notifications, ...props }) => {
    const core = useCore();

    const onDismissClick = React.useCallback(
        (event) => {
            event.preventDefault();
            if (typeof _id === 'string') {
                core.transport.dispatch({
                    action: 'Ctx',
                    args: {
                        action: 'RewindLibraryItem',
                        args: _id
                    }
                });
                core.transport.dispatch({
                    action: 'Ctx',
                    args: {
                        action: 'DismissNotificationItem',
                        args: _id
                    }
                });
            }
        },
        [_id]
    );

    const landscapePoster = props.thumbnail || props.background || props.poster;
    const subtitle = React.useMemo(() => getEpisodeSubtitle(props), [props]);

    return (
        <LibItem
            {...props}
            _id={_id}
            poster={landscapePoster}
            posterShape={'landscape'}
            subtitle={subtitle}
            actionMenu={true}
            posterChangeCursor={true}
            notifications={notifications}
            onDismissClick={onDismissClick}
        />
    );
};

ContinueWatchingItem.propTypes = {
    _id: PropTypes.string,
    notifications: PropTypes.object,
    poster: PropTypes.string,
    thumbnail: PropTypes.string,
    background: PropTypes.string,
    deepLinks: PropTypes.shape({
        metaDetailsVideos: PropTypes.string,
        metaDetailsStreams: PropTypes.string,
        player: PropTypes.string
    })
};

module.exports = ContinueWatchingItem;
