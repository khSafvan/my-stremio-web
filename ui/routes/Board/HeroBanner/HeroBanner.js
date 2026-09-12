// Copyright (C) 2017-2026 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const { useNavigateWithOrigin } = require('stremio-router');
const { useCore } = require('stremio/core');
const { default: Icon } = require('@stremio/stremio-icons/react');
const { default: Button } = require('stremio/components/Button');
const { default: Image } = require('stremio/components/Image');
const {
    default: getMetaDetailsHref
} = require('stremio/common/getMetaDetailsHref');
const useTranslate = require('stremio/common/useTranslate');
const styles = require('./styles');

const ROTATION_INTERVAL = 8000;

const HeroBanner = ({ catalogs, continueWatching, library }) => {
    const t = useTranslate();
    const core = useCore();
    const { navigateWithOrigin } = useNavigateWithOrigin();
    const [activeIndex, setActiveIndex] = React.useState(0);
    const [isPaused, setIsPaused] = React.useState(false);

    // Collect top featured candidates from ready catalogs and continue watching
    const featuredItems = React.useMemo(() => {
        const pool = [];
        // Add continue watching items first if present
        if (
            continueWatching &&
            Array.isArray(continueWatching.items) &&
            continueWatching.items.length > 0
        ) {
            pool.push(...continueWatching.items.slice(0, 2));
        }
        // Extract top items from ready catalogs
        if (Array.isArray(catalogs)) {
            for (const item of catalogs) {
                if (
                    item?.catalog?.content?.type === 'Ready' &&
                    Array.isArray(item.catalog.content.content)
                ) {
                    pool.push(...item.catalog.content.content.slice(0, 3));
                    if (pool.length >= 6) break;
                }
            }
        }
        // Deduplicate by id
        const seen = new Set();
        return pool
            .filter((item) => {
                const id = item?.id || item?._id;
                if (!id || seen.has(id)) return false;
                seen.add(id);
                return true;
            })
            .slice(0, 5);
    }, [catalogs, continueWatching]);

    const activeItem = featuredItems[activeIndex] || null;

    // Auto-cycle through items
    React.useEffect(() => {
        if (featuredItems.length <= 1 || isPaused) return;

        const timer = setInterval(() => {
            setActiveIndex((prev) => (prev + 1) % featuredItems.length);
        }, ROTATION_INTERVAL);

        return () => clearInterval(timer);
    }, [featuredItems.length, isPaused]);

    const nextSlide = React.useCallback(() => {
        if (featuredItems.length > 0) {
            setActiveIndex((prev) => (prev + 1) % featuredItems.length);
        }
    }, [featuredItems.length]);

    const prevSlide = React.useCallback(() => {
        if (featuredItems.length > 0) {
            setActiveIndex(
                (prev) =>
                    (prev - 1 + featuredItems.length) % featuredItems.length
            );
        }
    }, [featuredItems.length]);

    // Check if active item is saved in user watchlist / library
    const inWatchlist = React.useMemo(() => {
        if (!activeItem || !library?.items) return false;
        const activeId = activeItem.id || activeItem._id;
        return library.items.some((item) => (item.id || item._id) === activeId);
    }, [activeItem, library?.items]);

    const onToggleWatchlist = React.useCallback(
        (e) => {
            if (e) e.stopPropagation();
            if (!activeItem) return;
            const activeId = activeItem.id || activeItem._id;

            core.transport.dispatch({
                action: 'Ctx',
                args: {
                    action: inWatchlist ? 'RemoveFromLibrary' : 'AddToLibrary',
                    args: inWatchlist ? activeId : activeItem
                }
            });
        },
        [activeItem, inWatchlist, core]
    );

    if (!activeItem) {
        return <div className={styles['hero-banner-placeholder']} />;
    }

    const detailsHref = getMetaDetailsHref(activeItem.deepLinks);
    const playerHref = activeItem.deepLinks?.player || null;
    const bannerImage = activeItem.background || activeItem.poster || null;
    const itemType = activeItem.type ? activeItem.type.toUpperCase() : null;
    const isContinueWatching = Boolean(activeItem.progress || activeItem.state);

    // Extract genres list
    const genres = Array.isArray(activeItem.genres)
        ? activeItem.genres
        : typeof activeItem.genre === 'string'
          ? activeItem.genre.split(',').map((s) => s.trim())
          : [];

    const audioBadgeLabel = 'SUB | DUB';
    const playLabel = isContinueWatching
        ? t.stringWithPrefix('ContinueWatching', '', 'CONTINUE WATCHING')
        : t.stringWithPrefix('StartWatching', '', 'START WATCHING');
    const watchlistLabel = inWatchlist
        ? t.stringWithPrefix('InWatchlist', '', 'IN WATCHLIST')
        : t.stringWithPrefix('AddToWatchlist', '', 'ADD TO WATCHLIST');
    const detailsLabel = t.string('LIBRARY_DETAILS', 'DETAILS');

    return (
        <div
            className={styles['hero-banner-container']}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            {/* Cinematic Multi-Stop Scrim Background */}
            <div className={styles['backdrop-wrapper']}>
                {bannerImage ? (
                    <Image
                        className={styles['backdrop-image']}
                        src={bannerImage}
                        alt={activeItem.name || ''}
                    />
                ) : (
                    <div className={styles['backdrop-fallback']} />
                )}
                <div className={styles['backdrop-vignette-left']} />
                <div className={styles['backdrop-vignette-bottom']} />
                <div className={styles['backdrop-vignette-top']} />
            </div>

            {/* Banner Foreground Content Block */}
            <div className={styles['hero-content']}>
                {/* Crunchyroll Tags & Badges */}
                <div className={styles['badge-container']}>
                    <span className={styles['audio-badge']}>
                        {audioBadgeLabel}
                    </span>
                    {itemType ? (
                        <span className={styles['type-badge']}>{itemType}</span>
                    ) : null}
                    {activeItem.releaseInfo ? (
                        <span className={styles['meta-badge']}>
                            {activeItem.releaseInfo}
                        </span>
                    ) : null}
                    {activeItem.imdbRating || activeItem.rating ? (
                        <span className={styles['rating-badge']}>
                            ★ {activeItem.imdbRating || activeItem.rating}
                        </span>
                    ) : null}
                </div>

                <h1 className={styles['hero-title']} title={activeItem.name}>
                    {activeItem.name}
                </h1>

                {/* Genre chips row */}
                {genres.length > 0 ? (
                    <div className={styles['genres-row']}>
                        {genres.slice(0, 3).map((genre, idx) => (
                            <span key={idx} className={styles['genre-tag']}>
                                {genre}
                            </span>
                        ))}
                    </div>
                ) : null}

                {activeItem.description ? (
                    <p className={styles['hero-description']}>
                        {activeItem.description}
                    </p>
                ) : null}

                {/* Crunchyroll Style Actions Row */}
                <div className={styles['actions-row']}>
                    {playerHref ? (
                        <Button
                            className={classnames(
                                styles['action-btn'],
                                styles['play-btn']
                            )}
                            title={
                                isContinueWatching
                                    ? t.string(
                                          'BUTTON_CONTINUE_WATCHING',
                                          'CONTINUE WATCHING'
                                      )
                                    : t.string('BUTTON_PLAY', 'START WATCHING')
                            }
                            onClick={() => navigateWithOrigin(playerHref)}
                        >
                            <Icon
                                className={styles['btn-icon']}
                                name={'play'}
                            />
                            <span className={styles['btn-label']}>
                                {playLabel}
                            </span>
                        </Button>
                    ) : null}

                    {/* Add to Watchlist Button */}
                    <Button
                        className={classnames(
                            styles['action-btn'],
                            styles['watchlist-btn'],
                            {
                                [styles['in-watchlist']]: inWatchlist
                            }
                        )}
                        title={watchlistLabel}
                        onClick={onToggleWatchlist}
                    >
                        <Icon
                            className={styles['btn-icon']}
                            name={inWatchlist ? 'checkmark' : 'add-to-library'}
                        />
                        <span className={styles['btn-label']}>
                            {watchlistLabel}
                        </span>
                    </Button>

                    {detailsHref ? (
                        <Button
                            className={classnames(
                                styles['action-btn'],
                                styles['details-btn']
                            )}
                            title={detailsLabel}
                            onClick={() => navigateWithOrigin(detailsHref)}
                        >
                            <Icon
                                className={styles['btn-icon']}
                                name={'about'}
                            />
                            <span className={styles['btn-label']}>
                                {detailsLabel}
                            </span>
                        </Button>
                    ) : null}
                </div>
            </div>

            {/* Interactive Preview Ticker (Bottom-Right) */}
            {featuredItems.length > 1 ? (
                <div className={styles['preview-ticker-container']}>
                    {featuredItems.map((item, index) => {
                        const isActive = index === activeIndex;
                        const thumb =
                            item.thumbnail || item.background || item.poster;
                        return (
                            <div
                                key={item.id || item._id || index}
                                className={classnames(styles['preview-card'], {
                                    [styles['active']]: isActive
                                })}
                                onClick={() => setActiveIndex(index)}
                                title={item.name}
                            >
                                <div
                                    className={styles['preview-thumb-wrapper']}
                                >
                                    {thumb ? (
                                        <Image
                                            className={styles['preview-thumb']}
                                            src={thumb}
                                            alt={item.name || ''}
                                        />
                                    ) : (
                                        <div
                                            className={
                                                styles['preview-fallback']
                                            }
                                        />
                                    )}
                                    {isActive ? (
                                        <div
                                            className={
                                                styles['preview-progress-bar']
                                            }
                                            style={{
                                                animationDuration: `${ROTATION_INTERVAL}ms`,
                                                animationPlayState: isPaused
                                                    ? 'paused'
                                                    : 'running'
                                            }}
                                        />
                                    ) : null}
                                </div>
                                <span className={styles['preview-title']}>
                                    {item.name}
                                </span>
                            </div>
                        );
                    })}
                </div>
            ) : null}

            {/* Nav Arrows */}
            {featuredItems.length > 1 ? (
                <>
                    <button
                        className={classnames(
                            styles['nav-arrow'],
                            styles['nav-prev']
                        )}
                        onClick={prevSlide}
                        aria-label="Previous featured item"
                    >
                        <Icon name={'chevron-back'} />
                    </button>
                    <button
                        className={classnames(
                            styles['nav-arrow'],
                            styles['nav-next']
                        )}
                        onClick={nextSlide}
                        aria-label="Next featured item"
                    >
                        <Icon name={'chevron-forward'} />
                    </button>
                </>
            ) : null}
        </div>
    );
};

HeroBanner.propTypes = {
    catalogs: PropTypes.array,
    continueWatching: PropTypes.object,
    library: PropTypes.object
};

module.exports = HeroBanner;
