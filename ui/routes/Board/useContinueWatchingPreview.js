// Copyright (C) 2017-2026 Smart code 203358507

const React = require('react');
const { useModelState } = require('stremio/common');
const { getLocalContinueWatching } = require('stremio/services/UnifiedMedia');

const useContinueWatchingPreview = () => {
    const [simklProgress, setSimklProgress] = React.useState(() => getLocalContinueWatching());

    React.useEffect(() => {
        const onUpdate = (event) => {
            setSimklProgress(event.detail || getLocalContinueWatching());
        };
        window.addEventListener('springroll_continue_watching_updated', onUpdate);
        return () => window.removeEventListener('springroll_continue_watching_updated', onUpdate);
    }, []);

    const action = React.useMemo(
        () => ({
            action: 'Load',
            args: {
                model: 'LibraryWithFilters',
                args: {
                    request: {
                        type: null,
                        sort: undefined
                    }
                }
            }
        }),
        []
    );

    const continueWatching = useModelState({
        model: 'continue_watching',
        action
    });
    const continueWatchingPreview = useModelState({
        model: 'continue_watching_preview'
    });

    const catalog = React.useMemo(() => {
        const previewItems = Array.isArray(continueWatchingPreview?.items)
            ? continueWatchingPreview.items
            : [];
        const cwItems = Array.isArray(continueWatching?.catalog)
            ? continueWatching.catalog
            : Array.isArray(continueWatching?.catalog?.items)
              ? continueWatching.catalog.items
              : [];

        // Map SIMKL / local progress into Continue Watching format
        const simklItems = (simklProgress || []).map((item) => ({
            _id: item.mediaId,
            id: item.mediaId,
            name: item.title,
            type: item.type === 'show' ? 'series' : item.type,
            poster: item.backdropUrl || item.posterUrl,
            posterShape: 'landscape',
            progress: item.progressPercent,
            state: {
                time: item.currentTimeSeconds,
                duration: item.durationSeconds,
            },
            deepLinks: {
                metaDetailsVideos: `#/metadetails/${item.type === 'show' ? 'series' : 'movie'}/${item.mediaId}`,
            }
        }));

        // Deduplicate items by _id or id
        const seen = new Set();
        const merged = [];

        for (const item of [...simklItems, ...previewItems, ...cwItems]) {
            const key = item._id || item.id;
            if (key && !seen.has(key)) {
                seen.add(key);
                merged.push({
                    ...item,
                    posterShape: 'landscape'
                });
            }
        }

        return {
            id: 'board_continue_watching',
            name: 'Continue Watching',
            type: 'continue_watching',
            posterShape: 'landscape',
            items: merged,
            deepLinks: {
                library: '#/continuewatching'
            }
        };
    }, [continueWatching?.catalog, continueWatchingPreview?.items]);

    return catalog;
};

module.exports = useContinueWatchingPreview;
