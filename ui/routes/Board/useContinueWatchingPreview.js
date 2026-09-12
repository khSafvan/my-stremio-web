// Copyright (C) 2017-2026 Smart code 203358507

const React = require('react');
const { useModelState } = require('stremio/common');

const useContinueWatchingPreview = () => {
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

        // Deduplicate items by _id or id
        const seen = new Set();
        const merged = [];

        for (const item of [...previewItems, ...cwItems]) {
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
