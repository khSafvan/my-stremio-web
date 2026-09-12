// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const ReactIs = require('react-is');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const { default: Icon } = require('@stremio/stremio-icons/react');
const { Button } = require('stremio/components');
const CONSTANTS = require('stremio/common/CONSTANTS');
const useTranslate = require('stremio/common/useTranslate');
const MetaRowPlaceholder = require('./MetaRowPlaceholder');
const styles = require('./styles');

const MetaRow = ({
    className,
    title,
    catalog,
    message,
    itemComponent,
    notifications,
    posterShape
}) => {
    const t = useTranslate();

    const catalogTitle = React.useMemo(() => {
        return title ?? t.catalogTitle(catalog);
    }, [title, catalog, t.catalogTitle]);

    const items = React.useMemo(() => {
        return catalog?.items ?? catalog?.content?.content;
    }, [catalog]);

    const href = React.useMemo(() => {
        return catalog?.deepLinks?.discover ?? catalog?.deepLinks?.library;
    }, [catalog]);

    const rowPosterShape = React.useMemo(() => {
        if (typeof posterShape === 'string') return posterShape;
        if (typeof catalog?.posterShape === 'string')
            return catalog.posterShape;
        if (catalog?.type === 'continue_watching') return 'landscape';
        return items?.[0]?.posterShape || 'poster';
    }, [posterShape, catalog?.posterShape, catalog?.type, items]);

    return (
        <div className={classnames(className, styles['meta-row-container'])}>
            <div className={styles['header-container']}>
                {typeof catalogTitle === 'string' && catalogTitle.length > 0 ? (
                    <div
                        className={styles['title-container']}
                        title={catalogTitle}
                    >
                        {catalogTitle}
                    </div>
                ) : null}
                {href ? (
                    <Button
                        className={styles['see-all-container']}
                        title={t.string('BUTTON_SEE_ALL')}
                        href={href}
                        tabIndex={-1}
                    >
                        <div className={styles['label']}>
                            {t.string('BUTTON_SEE_ALL')}
                        </div>
                        <Icon
                            className={styles['icon']}
                            name={'chevron-forward'}
                        />
                    </Button>
                ) : null}
            </div>
            {typeof message === 'string' && message.length > 0 ? (
                <div className={styles['message-container']} title={message}>
                    {message}
                </div>
            ) : (
                <div className={styles['meta-items-container']}>
                    {ReactIs.isValidElementType(itemComponent) &&
                    Array.isArray(items)
                        ? items
                              .slice(0, CONSTANTS.CATALOG_PREVIEW_SIZE)
                              .map((item, index) => {
                                  const itemShape =
                                      item.posterShape || rowPosterShape;
                                  return React.createElement(itemComponent, {
                                      ...item,
                                      key: index,
                                      className: classnames(
                                          styles['meta-item'],
                                          styles[`poster-shape-${itemShape}`]
                                      ),
                                      posterShape: itemShape,
                                      notifications
                                  });
                              })
                        : null}
                    {Array(
                        Math.max(
                            0,
                            CONSTANTS.CATALOG_PREVIEW_SIZE -
                                (Array.isArray(items) ? items.length : 0)
                        )
                    )
                        .fill(null)
                        .map((_, index) => (
                            <div
                                key={index}
                                className={classnames(
                                    styles['meta-item'],
                                    styles[`poster-shape-${rowPosterShape}`]
                                )}
                            />
                        ))}
                </div>
            )}
        </div>
    );
};

MetaRow.Placeholder = MetaRowPlaceholder;

MetaRow.propTypes = {
    className: PropTypes.string,
    title: PropTypes.string,
    message: PropTypes.string,
    catalog: PropTypes.shape({
        id: PropTypes.string,
        name: PropTypes.string,
        type: PropTypes.string,
        addon: PropTypes.shape({
            manifest: PropTypes.shape({
                id: PropTypes.string,
                name: PropTypes.string
            })
        }),
        content: PropTypes.shape({
            content: PropTypes.oneOfType([
                PropTypes.string,
                PropTypes.arrayOf(
                    PropTypes.shape({
                        posterShape: PropTypes.string
                    })
                )
            ])
        }),
        items: PropTypes.arrayOf(
            PropTypes.shape({
                posterShape: PropTypes.string
            })
        ),
        deepLinks: PropTypes.shape({
            discover: PropTypes.string,
            library: PropTypes.string
        })
    }),
    itemComponent: PropTypes.elementType,
    notifications: PropTypes.object
};

module.exports = MetaRow;
