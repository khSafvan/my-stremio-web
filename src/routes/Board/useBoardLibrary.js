// Copyright (C) 2017-2026 Smart code 203358507

const React = require('react');
const { useModelState } = require('stremio/common');

const useBoardLibrary = () => {
    const action = React.useMemo(() => ({
        action: 'Load',
        args: {
            model: 'LibraryWithFilters',
            args: {
                request: {
                    type: null,
                    sort: undefined,
                }
            }
        }
    }), []);

    const library = useModelState({ model: 'library', action });

    const libraryCatalog = React.useMemo(() => {
        const items = Array.isArray(library?.catalog)
            ? library.catalog
            : Array.isArray(library?.catalog?.items)
                ? library.catalog.items
                : [];

        if (items.length === 0) {
            return null;
        }

        return {
            id: 'board_library',
            name: 'Library',
            type: 'all',
            items: items,
            deepLinks: {
                library: '#/library'
            }
        };
    }, [library?.catalog]);

    return libraryCatalog;
};

module.exports = useBoardLibrary;
