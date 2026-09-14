import React from 'react';
import classnames from 'classnames';
import styles from './SpringrollIcon.less';

export type SpringrollIconProps = {
    className?: string;
    size?: number | string;
    colorVariant?: 'gold' | 'orange' | 'white';
    onClick?: () => void;
    title?: string;
};

export const SpringrollIcon: React.FC<SpringrollIconProps> = ({
    className,
    size = 32,
    colorVariant = 'gold',
    onClick,
    title = 'Springroll'
}) => {
    const sizeStyle = typeof size === 'number' ? { width: `${size}px`, height: `${size}px` } : { width: size, height: size };

    const getColors = () => {
        switch (colorVariant) {
            case 'orange':
                return {
                    primary: '#FF6600',
                    secondary: '#FF8A3D',
                    cutout: '#0D0D11'
                };
            case 'white':
                return {
                    primary: '#FFFFFF',
                    secondary: '#E0E0E6',
                    cutout: '#0D0D11'
                };
            case 'gold':
            default:
                return {
                    primary: '#FFC107',
                    secondary: '#FFD54F',
                    cutout: '#0D0D11'
                };
        }
    };

    const colors = getColors();

    return (
        <div
            className={classnames(styles['springroll-icon-container'], className, {
                [styles['clickable']]: typeof onClick === 'function',
                [styles[`variant-${colorVariant}`]]: Boolean(colorVariant)
            })}
            style={sizeStyle}
            onClick={onClick}
            title={title}
        >
            <svg
                className={styles['svg-icon']}
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                {/* Cinema ticket body */}
                <rect x="2" y="5" width="28" height="22" rx="5" fill={colors.primary} />
                {/* Left sprocket holes */}
                <rect x="6" y="9" width="3.5" height="4" rx="1.5" fill={colors.cutout} />
                <rect x="6" y="19" width="3.5" height="4" rx="1.5" fill={colors.cutout} />
                {/* Right sprocket holes */}
                <rect x="22.5" y="9" width="3.5" height="4" rx="1.5" fill={colors.cutout} />
                <rect x="22.5" y="19" width="3.5" height="4" rx="1.5" fill={colors.cutout} />
                {/* Play triangle */}
                <path d="M14 11.5L19.5 16L14 20.5V11.5Z" fill={colors.cutout} />
            </svg>
        </div>
    );
};

export default SpringrollIcon;
