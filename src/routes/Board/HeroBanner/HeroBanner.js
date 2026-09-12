// Copyright (C) 2017-2026 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const { useNavigateWithOrigin } = require('stremio-router');
const { default: Icon } = require('@stremio/stremio-icons/react');
const { default: Button } = require('stremio/components/Button');
const { default: Image } = require('stremio/components/Image');
const { default: getMetaDetailsHref } = require('stremio/common/getMetaDetailsHref');
const useTranslate = require('stremio/common/useTranslate');
const styles = require('./styles');

const ROTATION_INTERVAL = 7000;

const HeroBanner = ({ catalogs, continueWatching }) => {
    const t = useTranslate();
    const { navigateWithOrigin } = useNavigateWithOrigin();
    const [activeIndex, setActiveIndex] = React.useState(0);
    const [isPaused, setIsPaused] = React.useState(false);

    // Collect top featured candidates from ready catalogs or continue watching
    const featuredItems = React.useMemo(() => {
        const pool = [];
        // Add continue watching first if present
        if (continueWatching && Array.isArray(continueWatching.items) && continueWatching.items.length > 0) {
            pool.push(...continueWatching.items.slice(0, 2));
        }
        // Extract top items from ready catalogs
        if (Array.isArray(catalogs)) {
            for (const item of catalogs) {
                if (item?.catalog?.content?.type === 'Ready' && Array.isArray(item.catalog.content.content)) {
                    pool.push(...item.catalog.content.content.slice(0, 3));
                    if (pool.length >= 6) break;
                }
            }
        }
        // Deduplicate by id
        const seen = new Set();
        return pool.filter((item) => {
            const id = item?.id || item?._id;
            if (!id || seen.has(id)) return false;
            seen.add(id);
            return true;
        }).slice(0, 5);
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
            setActiveIndex((prev) => (prev - 1 + featuredItems.length) % featuredItems.length);
        }
    }, [featuredItems.length]);

    if (!activeItem) {
        return <div className={styles['hero-banner-placeholder']} />;
    }

    const detailsHref = getMetaDetailsHref(activeItem.deepLinks);
    const playerHref = activeItem.deepLinks?.player || null;
    const bannerImage = activeItem.background || activeItem.poster || null;
    const itemType = activeItem.type ? activeItem.type.toUpperCase() : null;

    return (
        <div
            className={styles['hero-banner-container']}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            {/* Background Backdrop Layer */}
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
                <div className={styles['backdrop-overlay']} />
            </div>

            {/* Banner Foreground Content */}
            <div className={styles['hero-content']}>
                {itemType ? (
                    <div className={styles['badge-container']}>
                        <span className={styles['type-badge']}>{itemType}</span>
                        {activeItem.releaseInfo ? (
                            <span className={styles['meta-badge']}>{activeItem.releaseInfo}</span>
                        ) : null}
                    </div>
                ) : null}

                <h1 className={styles['hero-title']} title={activeItem.name}>
                    {activeItem.name}
                </h1>

                {activeItem.description ? (
                    <p className={styles['hero-description']}>
                        {activeItem.description}
                    </p>
                ) : null}

                <div className={styles['actions-row']}>
                    {playerHref ? (
                        <Button
                            className={classnames(styles['action-btn'], styles['play-btn'])}
                            title={t.string('BUTTON_PLAY')}
                            onClick={() => navigateWithOrigin(playerHref)}
                        >
                            <Icon className={styles['btn-icon']} name={'play'} />
                            <span className={styles['btn-label']}>{t.string('BUTTON_PLAY')}</span>
                        </Button>
                    ) : null}

                    {detailsHref ? (
                        <Button
                            className={classnames(styles['action-btn'], styles['details-btn'])}
                            title={t.string('LIBRARY_DETAILS')}
                            onClick={() => navigateWithOrigin(detailsHref)}
                        >
                            <Icon className={styles['btn-icon']} name={'about'} />
                            <span className={styles['btn-label']}>{t.string('LIBRARY_DETAILS')}</span>
                        </Button>
                    ) : null}
                </div>
            </div>

            {/* Carousel Navigation Controls */}
            {featuredItems.length > 1 ? (
                <>
                    <button
                        className={classnames(styles['nav-arrow'], styles['nav-prev'])}
                        onClick={prevSlide}
                        aria-label="Previous featured item"
                    >
                        <Icon name={'chevron-back'} />
                    </button>
                    <button
                        className={classnames(styles['nav-arrow'], styles['nav-next'])}
                        onClick={nextSlide}
                        aria-label="Next featured item"
                    >
                        <Icon name={'chevron-forward'} />
                    </button>

                    <div className={styles['dots-container']}>
                        {featuredItems.map((_, index) => (
                            <button
                                key={index}
                                className={classnames(styles['dot'], {
                                    [styles['active']]: index === activeIndex
                                })}
                                onClick={() => setActiveIndex(index)}
                                aria-label={`Go to slide ${index + 1}`}
                            />
                        ))}
                    </div>
                </>
            ) : null}
        </div>
    );
};

HeroBanner.propTypes = {
    catalogs: PropTypes.array,
    continueWatching: PropTypes.object,
};

module.exports = HeroBanner;
