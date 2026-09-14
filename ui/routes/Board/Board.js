// Copyright (C) 2017-2026 Smart code 203358507

const React = require('react');
const classnames = require('classnames');
const useTranslate = require('stremio/common/useTranslate');
const {
    default: useVisibleCatalogs
} = require('stremio/common/useVisibleCatalogs');
const {
    useStreamingServer,
    useNotifications,
    withCoreSuspender,
    useProfile
} = require('stremio/common');
const {
    Button,
    ContinueWatchingItem,
    EventModal,
    LibItem,
    MainNavBars,
    MetaItem,
    MetaRow
} = require('stremio/components');
const { default: Icon } = require('@stremio/stremio-icons/react');
const useBoard = require('./useBoard');
const useContinueWatchingPreview = require('./useContinueWatchingPreview');
const useBoardLibrary = require('./useBoardLibrary');
const HeroBanner = require('./HeroBanner');
const CategoryPills = require('./CategoryPills');
const styles = require('./styles');
const { default: StreamingServerWarning } = require('./StreamingServerWarning');
const { useSearchParams, useNavigate } = require('react-router-dom');
const { useCore } = require('stremio/core');
const { MetadataBridge } = require('stremio/services');

const THRESHOLD = 5;

const Board = () => {
    const t = useTranslate();
    const core = useCore();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const streamingServer = useStreamingServer();
    const continueWatchingPreview = useContinueWatchingPreview();
    const [board, loadBoardRows] = useBoard();
    const notifications = useNotifications();
    const profile = useProfile();
    const libraryCatalog = useBoardLibrary();

    const categoryParam = searchParams.get('category') || searchParams.get('type') || 'all';
    const [selectedCategory, setSelectedCategory] = React.useState(categoryParam);
    const [bridgeFeed, setBridgeFeed] = React.useState(null);

    React.useEffect(() => {
        let cancelled = false;
        async function loadFeed() {
            try {
                if (selectedCategory === 'anime') {
                    const anime = await MetadataBridge.getAnimeFeed();
                    if (!cancelled) {
                        setBridgeFeed({ type: 'anime', title: 'SIMKL Trending & Airing Anime', items: anime });
                    }
                } else if (selectedCategory === 'movie') {
                    const movies = await MetadataBridge.getTrendingFeed('movie');
                    if (!cancelled) {
                        setBridgeFeed({ type: 'movie', title: 'TMDb Trending Movies', items: movies });
                    }
                } else if (selectedCategory === 'series') {
                    const series = await MetadataBridge.getTrendingFeed('tv');
                    if (!cancelled) {
                        setBridgeFeed({ type: 'series', title: 'TMDb Trending Series', items: series });
                    }
                } else {
                    const trending = await MetadataBridge.getTrendingFeed('all');
                    if (!cancelled) {
                        setBridgeFeed({ type: 'all', title: 'Trending Today', items: trending });
                    }
                }
            } catch (err) {
                console.warn('Failed to load bridge feed in Board:', err);
            }
        }
        loadFeed();
        return () => {
            cancelled = true;
        };
    }, [selectedCategory]);

    const bridgeCatalogRow = React.useMemo(() => {
        if (!bridgeFeed || !Array.isArray(bridgeFeed.items) || bridgeFeed.items.length === 0) {
            return null;
        }

        const mapped = bridgeFeed.items.map((item) => ({
            id: item.id,
            _id: item.id,
            name: item.name,
            type: item.type,
            poster: item.poster,
            posterShape: 'poster',
            background: item.background,
            releaseInfo: item.releaseInfo,
            imdbRating: item.imdbRating,
            description: item.description,
            deepLinks: {
                metaDetailsVideos: `#/metadetails/${item.type}/${item.id}`
            }
        }));

        return {
            id: `bridge_${bridgeFeed.type}`,
            name: bridgeFeed.title,
            type: bridgeFeed.type,
            content: {
                type: 'Ready',
                content: mapped
            }
        };
    }, [bridgeFeed]);

    const allGridItems = React.useMemo(() => {
        const items = [];
        const seen = new Set();

        if (bridgeCatalogRow?.content?.content) {
            for (const item of bridgeCatalogRow.content.content) {
                const key = item.id || item._id;
                if (key && !seen.has(key)) {
                    seen.add(key);
                    items.push(item);
                }
            }
        }

        for (const { catalog } of filteredCatalogRows) {
            if (catalog?.content?.type === 'Ready' && Array.isArray(catalog.content.content)) {
                for (const item of catalog.content.content) {
                    const key = item.id || item._id;
                    if (key && !seen.has(key)) {
                        seen.add(key);
                        items.push(item);
                    }
                }
            }
        }

        return items;
    }, [bridgeCatalogRow, filteredCatalogRows]);

    React.useEffect(() => {
        if (categoryParam && categoryParam !== selectedCategory) {
            setSelectedCategory(categoryParam);
        }
    }, [categoryParam]);

    const onSelectCategory = React.useCallback((cat) => {
        setSelectedCategory(cat);
        if (cat === 'all') {
            setSearchParams({}, { replace: true });
        } else {
            setSearchParams({ category: cat }, { replace: true });
        }
    }, [setSearchParams]);

    const viewParam = searchParams.get('view') || 'shelves';
    const [viewMode, setViewMode] = React.useState(viewParam);

    React.useEffect(() => {
        if (viewParam && viewParam !== viewMode) {
            setViewMode(viewParam);
        }
    }, [viewParam]);

    const onViewModeChange = React.useCallback((mode) => {
        setViewMode(mode);
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            if (mode === 'grid') {
                next.set('view', 'grid');
            } else {
                next.delete('view');
            }
            return next;
        }, { replace: true });
    }, [setSearchParams]);

    // Auto-reconnect to streaming server if previously failed
    React.useEffect(() => {
        if (streamingServer.settings !== null && streamingServer.settings.type === 'Err') {
            const timer = setInterval(async () => {
                try {
                    const res = await fetch('http://127.0.0.1:11470/settings', { mode: 'cors' });
                    if (res.ok) {
                        core.transport.dispatch({
                            action: 'StreamingServer',
                            args: {
                                action: 'Reload'
                            }
                        });
                        clearInterval(timer);
                    }
                } catch (_) {}
            }, 2500);
            return () => clearInterval(timer);
        }
    }, [streamingServer.settings, core]);

    const showStreamingServerWarning = React.useMemo(() => {
        return (
            streamingServer.settings !== null &&
            streamingServer.settings.type === 'Err' &&
            (isNaN(
                profile.settings.streamingServerWarningDismissed.getTime()
            ) ||
                profile.settings.streamingServerWarningDismissed.getTime() <
                    Date.now())
        );
    }, [profile.settings, streamingServer.settings]);

    // Derive new episodes shelf from library items with active notification counts
    const newEpisodesCatalog = React.useMemo(() => {
        if (!libraryCatalog?.items || !notifications?.items) {
            return null;
        }
        const itemsWithNewEpisodes = libraryCatalog.items.filter((item) => {
            const count = notifications.items?.[item._id]?.length ?? 0;
            return count > 0;
        });
        if (itemsWithNewEpisodes.length === 0) {
            return null;
        }
        return {
            id: 'board_new_episodes',
            name: 'New Episodes',
            type: 'series',
            items: itemsWithNewEpisodes,
            deepLinks: {
                library: '#/library'
            }
        };
    }, [libraryCatalog?.items, notifications?.items]);

    // Leading rows for visible catalogs virtualization calculation:
    // 1 (HeroBanner) + continue watching (1) + optional new episodes + optional library + 1 (CategoryPills)
    const boardCatalogsOffset = React.useMemo(() => {
        let count = 3;
        if (newEpisodesCatalog && newEpisodesCatalog.items.length > 0)
            count += 1;
        if (libraryCatalog && libraryCatalog.items.length > 0) count += 1;
        return count;
    }, [newEpisodesCatalog, libraryCatalog]);

    const { catalogRows, scrollContainerRef, onScroll } = useVisibleCatalogs({
        catalogs: board.catalogs,
        loadRange: loadBoardRows,
        leadingRows: boardCatalogsOffset,
        preloadRows: THRESHOLD
    });

    // Filter catalog rows according to selected category pill
    const filteredCatalogRows = React.useMemo(() => {
        if (selectedCategory === 'all') {
            return catalogRows;
        }
        return catalogRows.filter(({ catalog }) => {
            if (catalog.type === selectedCategory) {
                return true;
            }
            if (
                catalog.content?.type === 'Ready' &&
                Array.isArray(catalog.content.content)
            ) {
                return catalog.content.content.some(
                    (item) => item.type === selectedCategory
                );
            }
            return false;
        });
    }, [catalogRows, selectedCategory]);

    const discoverUrl = React.useMemo(() => {
        return selectedCategory === 'all'
            ? '#/discover'
            : `#/discover/${selectedCategory}`;
    }, [selectedCategory]);

    return (
        <div className={styles['board-container']}>
            <EventModal />
            <MainNavBars
                className={styles['board-content-container']}
                route={'board'}
            >
                <div
                    ref={scrollContainerRef}
                    className={styles['board-content']}
                    onScroll={onScroll}
                >
                    {/* 1. Cinematic Hero Banner Carousel */}
                    <HeroBanner
                        catalogs={catalogRows}
                        continueWatching={continueWatchingPreview}
                        library={libraryCatalog}
                    />

                    {/* 2. Flat Category & Quick Filter Pills with View Switcher */}
                    <CategoryPills
                        selected={selectedCategory}
                        onSelect={onSelectCategory}
                        viewMode={viewMode}
                        onViewModeChange={onViewModeChange}
                    />

                    {viewMode === 'grid' ? (
                        /* Deep Catalog Grid Mode */
                        <div className={styles['board-grid-section']}>
                            {allGridItems.length > 0 ? (
                                <div className={styles['board-grid-container']}>
                                    {allGridItems.map((item, idx) => (
                                        <div key={item.id || item._id || idx} className={styles['grid-meta-item']}>
                                            <MetaItem {...item} />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className={styles['category-empty-state']}>
                                    <div className={styles['empty-title']}>
                                        {t.stringWithPrefix(selectedCategory, 'TYPE_')}
                                    </div>
                                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                                        Loading catalog items...
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Curated Horizontal Shelves Mode */
                        <React.Fragment>
                            {/* 3. Continue Watching Shelf (16:9 Landscape) */}
                            {continueWatchingPreview.items.length > 0 ? (
                                <MetaRow
                                    className={classnames(
                                        styles['board-row'],
                                        styles['board-row-landscape'],
                                        'animation-fade-in'
                                    )}
                                    title={t.string('BOARD_CONTINUE_WATCHING')}
                                    catalog={continueWatchingPreview}
                                    itemComponent={ContinueWatchingItem}
                                    notifications={notifications}
                                    posterShape={'landscape'}
                                />
                            ) : (
                                <div
                                    className={classnames(
                                        styles['board-row'],
                                        styles['continue-watching-empty-section'],
                                        'animation-fade-in'
                                    )}
                                >
                                    <div className={styles['section-header']}>
                                        <div className={styles['section-title']}>
                                            {t.string('BOARD_CONTINUE_WATCHING')}
                                        </div>
                                    </div>
                                    <div
                                        className={
                                            styles['continue-watching-empty-card']
                                        }
                                    >
                                        <Icon
                                            className={styles['empty-icon']}
                                            name={'play'}
                                        />
                                        <div className={styles['empty-text']}>
                                            <span className={styles['empty-headline']}>
                                                {t.string(
                                                    'BOARD_CONTINUE_WATCHING_EMPTY'
                                                )}
                                            </span>
                                            <span className={styles['empty-subtext']}>
                                                {t.stringWithPrefix(
                                                    'ContinueWatching',
                                                    'Hint',
                                                    'Resume series and episodes with 16:9 thumbnails right from your homescreen.'
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 4. Your Watchlist / Library Shelf */}
                            {libraryCatalog && libraryCatalog.items.length > 0 ? (
                                <MetaRow
                                    className={classnames(
                                        styles['board-row'],
                                        styles['board-row-poster'],
                                        'animation-fade-in'
                                    )}
                                    title={t.stringWithPrefix(
                                        'Library',
                                        '',
                                        'Your Watchlist'
                                    )}
                                    catalog={libraryCatalog}
                                    itemComponent={LibItem}
                                    notifications={notifications}
                                />
                            ) : null}

                            {/* 5. New Episodes Shelf */}
                            {newEpisodesCatalog &&
                            newEpisodesCatalog.items.length > 0 ? (
                                <MetaRow
                                    className={classnames(
                                        styles['board-row'],
                                        styles['board-row-poster'],
                                        'animation-fade-in'
                                    )}
                                    title={t.stringWithPrefix(
                                        'NewEpisodes',
                                        '',
                                        'New Episodes'
                                    )}
                                    catalog={newEpisodesCatalog}
                                    itemComponent={LibItem}
                                    notifications={notifications}
                                />
                            ) : null}

                            {/* 6. Decoupled Catalog Feed (TMDb / SIMKL Bridge) */}
                            {bridgeCatalogRow ? (
                                <MetaRow
                                    key={bridgeCatalogRow.id}
                                    className={classnames(
                                        styles['board-row'],
                                        styles['board-row-poster'],
                                        'animation-fade-in'
                                    )}
                                    catalog={bridgeCatalogRow}
                                    itemComponent={MetaItem}
                                />
                            ) : null}

                            {/* 7. Dynamic Addon Catalogs */}
                            {filteredCatalogRows.map(({ catalog, index }) => {
                                switch (catalog.content?.type) {
                                    case 'Ready': {
                                        return (
                                            <MetaRow
                                                key={index}
                                                className={classnames(
                                                    styles['board-row'],
                                                    styles[
                                                        `board-row-${catalog.content.content[0].posterShape}`
                                                    ],
                                                    'animation-fade-in'
                                                )}
                                                catalog={catalog}
                                                itemComponent={MetaItem}
                                            />
                                        );
                                    }
                                    case 'Err': {
                                        if (
                                            catalog.content.content !== 'EmptyContent'
                                        ) {
                                            return (
                                                <MetaRow
                                                    key={index}
                                                    className={classnames(
                                                        styles['board-row'],
                                                        'animation-fade-in'
                                                    )}
                                                    catalog={catalog}
                                                    message={catalog.content.content}
                                                />
                                            );
                                        }
                                        return null;
                                    }
                                    default: {
                                        return (
                                            <MetaRow.Placeholder
                                                key={index}
                                                className={classnames(
                                                    styles['board-row'],
                                                    styles['board-row-poster'],
                                                    'animation-fade-in'
                                                )}
                                                catalog={catalog}
                                                title={t.catalogTitle(catalog)}
                                            />
                                        );
                                    }
                                }
                            })}

                            {/* Fallback exploration card when filtered category has no immediate rows */}
                            {selectedCategory !== 'all' &&
                            filteredCatalogRows.length === 0 &&
                            !bridgeCatalogRow ? (
                                <div className={styles['category-empty-state']}>
                                    <div className={styles['empty-title']}>
                                        {t.stringWithPrefix(selectedCategory, 'TYPE_')}
                                    </div>
                                    <Button
                                        className={styles['empty-action-btn']}
                                        href={discoverUrl}
                                    >
                                        <Icon name={'discover'} />
                                        <span>{t.string('NAV_DISCOVER')}</span>
                                    </Button>
                                </div>
                            ) : null}
                        </React.Fragment>
                    )}
                </div>
            </MainNavBars>
            {showStreamingServerWarning ? (
                <StreamingServerWarning
                    className={styles['board-warning-container']}
                />
            ) : null}
        </div>
    );
};

const BoardFallback = () => (
    <div className={styles['board-container']}>
        <MainNavBars
            className={styles['board-content-container']}
            route={'board'}
        />
    </div>
);

module.exports = withCoreSuspender(Board, BoardFallback);
