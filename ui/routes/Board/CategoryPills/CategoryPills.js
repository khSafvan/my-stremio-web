// Copyright (C) 2017-2026 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const { default: Icon } = require('@stremio/stremio-icons/react');
const useTranslate = require('stremio/common/useTranslate');
const { ICON_FOR_TYPE } = require('stremio/common/CONSTANTS');
const styles = require('./styles');

const DEFAULT_CATEGORIES = ['all', 'movie', 'series', 'anime', 'channel'];

const CategoryPills = ({
    categories = DEFAULT_CATEGORIES,
    selected = 'all',
    onSelect,
    viewMode = 'shelves',
    onViewModeChange
}) => {
    const t = useTranslate();

    const getCategoryLabel = (category) => {
        if (category === 'all') {
            return t.string('TYPE_ALL');
        }
        return t.stringWithPrefix(category, 'TYPE_');
    };

    const getCategoryIcon = (category) => {
        if (category === 'all') {
            return 'discover';
        }
        if (ICON_FOR_TYPE.has(category)) {
            return ICON_FOR_TYPE.get(category);
        }
        return 'movies';
    };

    return (
        <div className={styles['category-pills-wrapper']}>
            <div className={styles['category-pills-container']}>
                {categories.map((category) => {
                    const isSelected = category === selected;
                    const label = getCategoryLabel(category);
                    const iconName = getCategoryIcon(category);

                    return (
                        <button
                            key={category}
                            type={'button'}
                            className={classnames(styles['pill-button'], {
                                [styles['selected']]: isSelected
                            })}
                            onClick={() => onSelect && onSelect(category)}
                        >
                            <Icon className={styles['pill-icon']} name={iconName} />
                            <span className={styles['pill-label']}>{label}</span>
                        </button>
                    );
                })}
            </div>

            {typeof onViewModeChange === 'function' && (
                <div className={styles['view-switcher-container']}>
                    <button
                        type={'button'}
                        className={classnames(styles['view-button'], {
                            [styles['selected']]: viewMode === 'shelves'
                        })}
                        title={'Shelves View'}
                        onClick={() => onViewModeChange('shelves')}
                    >
                        <Icon className={styles['view-icon']} name={'episodes'} />
                        <span className={styles['view-label']}>Shelves</span>
                    </button>
                    <button
                        type={'button'}
                        className={classnames(styles['view-button'], {
                            [styles['selected']]: viewMode === 'grid'
                        })}
                        title={'Catalog Grid View'}
                        onClick={() => onViewModeChange('grid')}
                    >
                        <Icon className={styles['view-icon']} name={'discover'} />
                        <span className={styles['view-label']}>Grid</span>
                    </button>
                </div>
            )}
        </div>
    );
};

CategoryPills.propTypes = {
    categories: PropTypes.arrayOf(PropTypes.string),
    selected: PropTypes.string,
    onSelect: PropTypes.func,
    viewMode: PropTypes.oneOf(['shelves', 'grid']),
    onViewModeChange: PropTypes.func
};

module.exports = CategoryPills;
