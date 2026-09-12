// Copyright (C) 2017-2026 Smart code 203358507

const React = require('react');
const classnames = require('classnames');
const useTranslate = require('stremio/common/useTranslate');
const { default: useVisibleCatalogs } = require('stremio/common/useVisibleCatalogs');
const { useStreamingServer, useNotifications, withCoreSuspender, useProfile } = require('stremio/common');
const { Button, ContinueWatchingItem, EventModal, LibItem, MainNavBars, MetaItem, MetaRow } = require('stremio/components');
const { default: Icon } = require('@stremio/stremio-icons/react');
const useBoard = require('./useBoard');
const useContinueWatchingPreview = require('./useContinueWatchingPreview');
const useBoardLibrary = require('./useBoardLibrary');
const HeroBanner = require('./HeroBanner');
const CategoryPills = require('./CategoryPills');
const styles = require('./styles');
const { default: StreamingServerWarning } = require('./StreamingServerWarning');

const THRESHOLD = 5;

const Board = () => {
    const t = useTranslate();
    const streamingServer = useStreamingServer();
    const continueWatchingPreview = useContinueWatchingPreview();
    const [board, loadBoardRows] = useBoard();
    const notifications = useNotifications();
    const profile = useProfile();
    const libraryCatalog = useBoardLibrary();
    const [selectedCategory, setSelectedCategory] = React.useState('all');

    const showStreamingServerWarning = React.useMemo(() => {
        return streamingServer.settings !== null && streamingServer.settings.type === 'Err' && (
            isNaN(profile.settings.streamingServerWarningDismissed.getTime()) ||
            profile.settings.streamingServerWarningDismissed.getTime() < Date.now());
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
    // 1 (HeroBanner) + optional continue watching + optional new episodes + optional library + 1 (CategoryPills)
    const boardCatalogsOffset = React.useMemo(() => {
        let count = 2;
        if (continueWatchingPreview.items.length > 0) count += 1;
        if (newEpisodesCatalog && newEpisodesCatalog.items.length > 0) count += 1;
        if (libraryCatalog && libraryCatalog.items.length > 0) count += 1;
        return count;
    }, [continueWatchingPreview.items.length, newEpisodesCatalog, libraryCatalog]);

    const { catalogRows, scrollContainerRef, onScroll } = useVisibleCatalogs({
        catalogs: board.catalogs,
        loadRange: loadBoardRows,
        leadingRows: boardCatalogsOffset,
        preloadRows: THRESHOLD,
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
            if (catalog.content?.type === 'Ready' && Array.isArray(catalog.content.content)) {
                return catalog.content.content.some((item) => item.type === selectedCategory);
            }
            return false;
        });
    }, [catalogRows, selectedCategory]);

    const discoverUrl = React.useMemo(() => {
        return selectedCategory === 'all' ? '#/discover' : `#/discover/${selectedCategory}`;
    }, [selectedCategory]);

    return (
        <div className={styles['board-container']}>
            <EventModal />
            <MainNavBars className={styles['board-content-container']} route={'board'}>
                <div ref={scrollContainerRef} className={styles['board-content']} onScroll={onScroll}>
                    {/* 1. Cinematic Hero Banner Carousel */}
                    <HeroBanner
                        catalogs={catalogRows}
                        continueWatching={continueWatchingPreview}
                    />

                    {/* 2. Continue Watching Shelf */}
                    {continueWatchingPreview.items.length > 0 ? (
                        <MetaRow
                            className={classnames(styles['board-row'], styles['continue-watching-row'], 'animation-fade-in')}
                            title={t.string('BOARD_CONTINUE_WATCHING')}
                            catalog={continueWatchingPreview}
                            itemComponent={ContinueWatchingItem}
                            notifications={notifications}
                        />
                    ) : null}

                    {/* 3. New Episodes Shelf */}
                    {newEpisodesCatalog && newEpisodesCatalog.items.length > 0 ? (
                        <MetaRow
                            className={classnames(styles['board-row'], styles['board-row-poster'], 'animation-fade-in')}
                            title={t.stringWithPrefix('NewEpisodes', '', 'New Episodes')}
                            catalog={newEpisodesCatalog}
                            itemComponent={LibItem}
                            notifications={notifications}
                        />
                    ) : null}

                    {/* 4. Your Library Shelf */}
                    {libraryCatalog && libraryCatalog.items.length > 0 ? (
                        <MetaRow
                            className={classnames(styles['board-row'], styles['board-row-poster'], 'animation-fade-in')}
                            title={t.stringWithPrefix('Library', '', 'Your Library')}
                            catalog={libraryCatalog}
                            itemComponent={LibItem}
                            notifications={notifications}
                        />
                    ) : null}

                    {/* 5. Flat Category & Quick Filter Pills */}
                    <CategoryPills
                        selected={selectedCategory}
                        onSelect={setSelectedCategory}
                    />

                    {/* 6. Dynamic Catalogs */}
                    {filteredCatalogRows.map(({ catalog, index }) => {
                        switch (catalog.content?.type) {
                            case 'Ready': {
                                return (
                                    <MetaRow
                                        key={index}
                                        className={classnames(styles['board-row'], styles[`board-row-${catalog.content.content[0].posterShape}`], 'animation-fade-in')}
                                        catalog={catalog}
                                        itemComponent={MetaItem}
                                    />
                                );
                            }
                            case 'Err': {
                                if (catalog.content.content !== 'EmptyContent') {
                                    return (
                                        <MetaRow
                                            key={index}
                                            className={classnames(styles['board-row'], 'animation-fade-in')}
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
                                        className={classnames(styles['board-row'], styles['board-row-poster'], 'animation-fade-in')}
                                        catalog={catalog}
                                        title={t.catalogTitle(catalog)}
                                    />
                                );
                            }
                        }
                    })}

                    {/* Fallback exploration card when filtered category has no immediate rows */}
                    {selectedCategory !== 'all' && filteredCatalogRows.length === 0 ? (
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
                </div>
            </MainNavBars>
            {showStreamingServerWarning ? (
                <StreamingServerWarning className={styles['board-warning-container']} />
            ) : null}
        </div>
    );
};

const BoardFallback = () => (
    <div className={styles['board-container']}>
        <MainNavBars className={styles['board-content-container']} route={'board'} />
    </div>
);

module.exports = withCoreSuspender(Board, BoardFallback);
