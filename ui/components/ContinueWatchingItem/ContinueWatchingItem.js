// Copyright (C) 2017-2026 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const { useCore } = require('stremio/core');
const LibItem = require('stremio/components/LibItem');

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

    return (
        <LibItem
            {...props}
            _id={_id}
            poster={landscapePoster}
            posterShape={'landscape'}
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
