import React from 'react';
import classnames from 'classnames';
import SpringrollIcon, { SpringrollIconProps } from '../SpringrollIcon';
import styles from './SpringrollLogo.less';

type Props = {
    className?: string;
    showWordmark?: boolean;
    iconVariant?: 'gold' | 'orange' | 'white';
    iconSize?: number | string;
    onClick?: () => void;
};

export const SpringrollLogo: React.FC<Props> = ({
    className,
    showWordmark = true,
    iconVariant = 'gold',
    iconSize = 30,
    onClick
}) => {
    return (
        <div
            className={classnames(styles['springroll-logo-container'], className, {
                [styles['clickable']]: typeof onClick === 'function'
            })}
            onClick={onClick}
            title="Springroll"
        >
            <SpringrollIcon
                className={styles['springroll-icon']}
                size={iconSize}
                colorVariant={iconVariant}
            />
            {showWordmark && (
                <span className={styles['springroll-wordmark']}>
                    <span className={styles['wordmark-spring']}>spring</span>
                    <span className={styles['wordmark-roll']}>roll</span>
                </span>
            )}
        </div>
    );
};

export default SpringrollLogo;
