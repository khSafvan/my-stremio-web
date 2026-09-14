// Copyright (C) 2017-2026 Smart code 203358507

const React = require('react');
const classnames = require('classnames');
const useTranslate = require('stremio/common/useTranslate');
const { withCoreSuspender, useProfile, useNotifications } = require('stremio/common');
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
const useContinueWatchingPreview = require('./useContinueWatchingPreview');
const useBoardLibrary = require('./useBoardLibrary');
const HeroBanner = require('./HeroBanner');
const CategoryPills = require('./CategoryPills');
const styles = require('./styles');
const { useSearchParams, useNavigate } = require('react-router-dom');
const { useCore } = require('stremio/core');
const { MetadataBridge } = require('stremio/services');

const Board = () => {
    const t = useTranslate();
    const core = useCore();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const continueWatchingPreview = useContinueWatchingPreview();
    const notifications = useNotifications();
    const profile = useProfile();
    const libraryCatalog = useBoardLibrary();
    const scrollContainerRef = React.useRef(null);

    const categoryParam = searchParams.get('category') || searchParams.get('type') || 'all';
    const [selectedCategory, setSelectedCategory] = React.useState(categoryParam);
    const [nativeShelves, setNativeShelves] = React.useState([]);

    React.useEffect(() => {
        let cancelled = false;
        async function loadShelves() {
            try {
                const shelves = [];
                if (selectedCategory === 'anime') {
                    const [trendingAnime, airingAnime] = await Promise.all([
                        MetadataBridge.getAnimeFeed().catch(() => []),
                        MetadataBridge.fetchSimklAiringAnime().then(list => list.map(anime => ({
                            id: anime.ids?.imdb || (anime.ids?.tmdb ? `tmdb:${anime.ids.tmdb}` : `simkl:${anime.ids?.simkl}`),
                            type: 'series',
                            name: anime.title,
                            poster: anime.poster ? `https://simkl.in/posters/${anime.poster}_m.webp` : null,
                            background: anime.fanart ? `https://simkl.in/fanart/${anime.fanart}_medium.webp` : null,
                            releaseInfo: anime.year ? String(anime.year) : undefined,
                            imdbRating: anime.rating ? anime.rating.toFixed(1) : undefined
                        }))).catch(() => [])
                    ]);
                    shelves.push({ id: 'anime_trending', title: 'Trending Anime', type: 'series', items: trendingAnime });
                    if (airingAnime.length > 0) {
                        shelves.push({ id: 'anime_airing', title: 'Currently Airing Anime', type: 'series', items: airingAnime });
                    }
                } else if (selectedCategory === 'movie') {
                    const [trending, popular, topRated] = await Promise.all([
                        MetadataBridge.getTrendingFeed('movie').catch(() => []),
                        MetadataBridge.getPopularFeed('movie').catch(() => []),
                        MetadataBridge.getTopRatedFeed('movie').catch(() => []),
                    ]);
                    shelves.push({ id: 'movies_trending', title: 'Trending Movies', type: 'movie', items: trending });
                    shelves.push({ id: 'movies_popular', title: 'Popular Movies', type: 'movie', items: popular });
                    shelves.push({ id: 'movies_top_rated', title: 'Top Rated Movies', type: 'movie', items: topRated });
                } else if (selectedCategory === 'series') {
                    const [trending, popular, topRated] = await Promise.all([
                        MetadataBridge.getTrendingFeed('tv').catch(() => []),
                        MetadataBridge.getPopularFeed('tv').catch(() => []),
                        MetadataBridge.getTopRatedFeed('tv').catch(() => []),
                    ]);
                    shelves.push({ id: 'series_trending', title: 'Trending Series', type: 'series', items: trending });
                    shelves.push({ id: 'series_popular', title: 'Popular Series', type: 'series', items: popular });
                    shelves.push({ id: 'series_top_rated', title: 'Top Rated Series', type: 'series', items: topRated });
                } else {
                    // All
                    const [trendingToday, trendingMovies, trendingSeries, anime, popularMovies] = await Promise.all([
                        MetadataBridge.getTrendingFeed('all').catch(() => []),
                        MetadataBridge.getTrendingFeed('movie').catch(() => []),
                        MetadataBridge.getTrendingFeed('tv').catch(() => []),
                        MetadataBridge.getAnimeFeed().catch(() => []),
                        MetadataBridge.getPopularFeed('movie').catch(() => []),
                    ]);
                    shelves.push({ id: 'all_trending', title: 'Trending Today', type: 'all', items: trendingToday });
                    shelves.push({ id: 'movies_trending', title: 'Trending Movies', type: 'movie', items: trendingMovies });
                    shelves.push({ id: 'series_trending', title: 'Trending TV Shows', type: 'series', items: trendingSeries });
                    shelves.push({ id: 'anime_trending', title: 'Trending Anime', type: 'series', items: anime });
                    shelves.push({ id: 'movies_popular', title: 'Popular Movies', type: 'movie', items: popularMovies });
                }
                if (!cancelled) {
                    setNativeShelves(shelves);
                }
            } catch (err) {
                console.warn('Failed to load native shelves:', err);
            }
        }
        loadShelves();
        return () => {
            cancelled = true;
        };
    }, [selectedCategory]);

    const nativeCatalogRows = React.useMemo(() => {
        return nativeShelves.map((shelf) => ({
            id: shelf.id,
            name: shelf.title,
            type: shelf.type,
            content: {
                type: 'Ready',
                content: shelf.items.map((item) => ({
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
                }))
            }
        }));
    }, [nativeShelves]);

    const allGridItems = React.useMemo(() => {
        const items = [];
        const seen = new Set();
        for (const catalog of nativeCatalogRows) {
            if (Array.isArray(catalog.content?.content)) {
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
    }, [nativeCatalogRows]);

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
                >
                    {/* 1. Cinematic Hero Banner Carousel */}
                    <HeroBanner
                        catalogs={nativeCatalogRows.map((cat) => ({ catalog: cat }))}
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

                            {/* Native High-Performance TMDb & SIMKL Catalogs */}
                            {nativeCatalogRows.map((catalog) => (
                                <MetaRow
                                    key={catalog.id}
                                    className={classnames(
                                        styles['board-row'],
                                        styles['board-row-poster'],
                                        'animation-fade-in'
                                    )}
                                    title={catalog.name}
                                    catalog={catalog}
                                    itemComponent={MetaItem}
                                />
                            ))}

                            {/* Fallback exploration card when category has no immediate rows */}
                            {selectedCategory !== 'all' && nativeCatalogRows.length === 0 ? (
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
