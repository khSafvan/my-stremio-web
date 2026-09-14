import React from 'react';
import classnames from 'classnames';
import styles from './SpringrollLoader.less';

export type SpringrollLoaderProps = {
    className?: string;
    size?: 'small' | 'medium' | 'large' | 'fullscreen' | number;
    label?: string;
    showReelRing?: boolean;
    colorVariant?: 'gold' | 'orange';
    progress?: number; // 0 to 100
};

export const SpringrollLoader: React.FC<SpringrollLoaderProps> = ({
    className,
    size = 'medium',
    label,
    showReelRing = true,
    colorVariant = 'gold',
    progress
}) => {
    const isFullscreen = size === 'fullscreen';
    const numericSize = typeof size === 'number'
        ? size
        : size === 'small'
            ? 36
            : size === 'large' || size === 'fullscreen'
                ? 100
                : 64;

    const hasProgress = typeof progress === 'number' && progress >= 0;

    return (
        <div
            className={classnames(
                styles['springroll-loader-wrapper'],
                styles[`variant-${colorVariant}`],
                {
                    [styles['is-fullscreen']]: isFullscreen,
                    [styles['has-label']]: Boolean(label),
                    [styles['has-progress']]: hasProgress
                },
                className
            )}
            style={typeof size === 'number' ? { width: numericSize, height: numericSize } : undefined}
            role="progressbar"
            aria-label={label || 'Loading...'}
            aria-valuenow={hasProgress ? Math.round(progress) : undefined}
        >
            <div
                className={styles['loader-symbol-container']}
                style={{ width: numericSize, height: numericSize }}
            >
                <svg
                    className={styles['springroll-symbol-svg']}
                    viewBox="0 0 100 100"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <defs>
                        {/* Golden Ticket Gradient */}
                        <linearGradient id="loaderTicketGold" x1="15" y1="20" x2="85" y2="80" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stopColor="#FFE082" />
                            <stop offset="45%" stopColor="#FFC107" />
                            <stop offset="100%" stopColor="#FF8F00" />
                        </linearGradient>

                        {/* Orange Ticket Gradient */}
                        <linearGradient id="loaderTicketOrange" x1="15" y1="20" x2="85" y2="80" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stopColor="#FF9E40" />
                            <stop offset="50%" stopColor="#FF6600" />
                            <stop offset="100%" stopColor="#E65100" />
                        </linearGradient>

                        {/* Outer Film Reel Ring Gradient */}
                        <linearGradient id="loaderReelGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stopColor="#FFC107" stopOpacity="0.95" />
                            <stop offset="50%" stopColor="#FF6600" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#FFC107" stopOpacity="0.95" />
                        </linearGradient>

                        {/* Light Shimmer Beam */}
                        <linearGradient id="loaderShimmerGrad" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
                            <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.6" />
                            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                        </linearGradient>

                        <filter id="loaderGlow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor={colorVariant === 'orange' ? '#FF6600' : '#FFC107'} floodOpacity="0.4" />
                        </filter>
                    </defs>

                    {/* Outer Rotating Projector Reel Track Ring */}
                    {showReelRing && (
                        <circle
                            className={styles['reel-track-ring']}
                            cx="50"
                            cy="50"
                            r="44"
                            stroke="url(#loaderReelGrad)"
                            strokeWidth="2.5"
                            strokeDasharray="9 7"
                            strokeLinecap="round"
                        />
                    )}

                    {/* Ambient Glow Aura */}
                    <circle
                        className={styles['ambient-pulse-aura']}
                        cx="50"
                        cy="50"
                        r="34"
                        fill={colorVariant === 'orange' ? 'rgba(255, 102, 0, 0.08)' : 'rgba(255, 193, 7, 0.08)'}
                    />

                    {/* Floating Center Ticket Base */}
                    <g className={styles['floating-ticket-group']} filter="url(#loaderGlow)">
                        {/* Main Ticket Shape */}
                        <rect
                            className={styles['ticket-body']}
                            x="20"
                            y="28"
                            width="60"
                            height="44"
                            rx="10"
                            fill={colorVariant === 'orange' ? 'url(#loaderTicketOrange)' : 'url(#loaderTicketGold)'}
                        />

                        {/* Left Sprocket Film Perforations */}
                        <rect
                            className={classnames(styles['sprocket-dot'], styles['sprocket-left-1'])}
                            x="26"
                            y="35"
                            width="6"
                            height="9"
                            rx="3"
                            fill="#0D0D11"
                        />
                        <rect
                            className={classnames(styles['sprocket-dot'], styles['sprocket-left-2'])}
                            x="26"
                            y="56"
                            width="6"
                            height="9"
                            rx="3"
                            fill="#0D0D11"
                        />

                        {/* Right Sprocket Film Perforations */}
                        <rect
                            className={classnames(styles['sprocket-dot'], styles['sprocket-right-1'])}
                            x="68"
                            y="35"
                            width="6"
                            height="9"
                            rx="3"
                            fill="#0D0D11"
                        />
                        <rect
                            className={classnames(styles['sprocket-dot'], styles['sprocket-right-2'])}
                            x="68"
                            y="56"
                            width="6"
                            height="9"
                            rx="3"
                            fill="#0D0D11"
                        />

                        {/* Center Cinema Play Arrow */}
                        <path
                            className={styles['play-arrow-glyph']}
                            d="M44 40 L60 50 L44 60 Z"
                            fill="#0D0D11"
                        />

                        {/* Shimmer Sweep Overlay */}
                        <rect
                            className={styles['shimmer-sweep']}
                            x="20"
                            y="28"
                            width="60"
                            height="44"
                            rx="10"
                            fill="url(#loaderShimmerGrad)"
                        />
                    </g>
                </svg>

                {/* Circular Progress Ring Overlay if progress is provided */}
                {hasProgress && (
                    <svg className={styles['progress-ring-svg']} viewBox="0 0 100 100">
                        <circle
                            className={styles['progress-bg']}
                            cx="50"
                            cy="50"
                            r="44"
                            stroke="rgba(255, 255, 255, 0.08)"
                            strokeWidth="3"
                            fill="none"
                        />
                        <circle
                            className={styles['progress-indicator']}
                            cx="50"
                            cy="50"
                            r="44"
                            stroke="#FF6600"
                            strokeWidth="3"
                            fill="none"
                            strokeDasharray={2 * Math.PI * 44}
                            strokeDashoffset={2 * Math.PI * 44 * (1 - Math.min(100, Math.max(0, progress)) / 100)}
                            strokeLinecap="round"
                        />
                    </svg>
                )}
            </div>

            {/* Status Label & Percentage */}
            {(label || hasProgress) && (
                <div className={styles['loader-label-container']}>
                    {label && (
                        <span className={styles['loader-label-text']}>
                            {label}
                            <span className={styles['loader-ellipsis']} />
                        </span>
                    )}
                    {hasProgress && (
                        <span className={styles['loader-progress-percent']}>
                            {Math.round(progress)}%
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};

export default SpringrollLoader;
