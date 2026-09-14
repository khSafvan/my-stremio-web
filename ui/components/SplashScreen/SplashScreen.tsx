import React, { useEffect, useState } from 'react';
import classnames from 'classnames';
import styles from './SplashScreen.less';

export type SplashScreenProps = {
    className?: string;
    statusText?: string;
    onFinished?: () => void;
    autoFadeDelay?: number; // ms, optional
};

export const SplashScreen: React.FC<SplashScreenProps> = ({
    className,
    statusText = 'FREEDOM TO STREAM',
    onFinished,
    autoFadeDelay
}) => {
    const [isFadingOut, setIsFadingOut] = useState(false);

    useEffect(() => {
        if (typeof autoFadeDelay === 'number' && autoFadeDelay > 0) {
            const timer = setTimeout(() => {
                setIsFadingOut(true);
                if (onFinished) {
                    setTimeout(onFinished, 600); // match fadeOut animation duration
                }
            }, autoFadeDelay);
            return () => clearTimeout(timer);
        }
    }, [autoFadeDelay, onFinished]);

    return (
        <div
            className={classnames(styles['springroll-splash-container'], {
                [styles['fade-out']]: isFadingOut
            }, className)}
            role="status"
            aria-label="Springroll starting..."
        >
            <div className={styles['splash-ambient-background']} />

            <div className={styles['splash-content']}>
                {/* Hero Animated Symbol */}
                <div className={styles['splash-emblem-wrapper']}>
                    <svg
                        className={styles['splash-symbol-svg']}
                        viewBox="0 0 120 120"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <defs>
                            <linearGradient id="splashGoldGrad" x1="20" y1="20" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                                <stop offset="0%" stopColor="#FFE082" />
                                <stop offset="50%" stopColor="#FFC107" />
                                <stop offset="100%" stopColor="#FF8F00" />
                            </linearGradient>

                            <linearGradient id="splashReelRing" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
                                <stop offset="0%" stopColor="#FFC107" stopOpacity="0.9" />
                                <stop offset="50%" stopColor="#FF6600" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="#FFC107" stopOpacity="0.9" />
                            </linearGradient>

                            <linearGradient id="splashShimmer" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
                                <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.75" />
                                <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                            </linearGradient>

                            <filter id="splashEmblemGlow" x="-30%" y="-30%" width="160%" height="160%">
                                <feDropShadow dx="0" dy="8" stdDeviation="16" floodColor="#FFC107" floodOpacity="0.35" />
                                <feDropShadow dx="0" dy="2" stdDeviation="6" floodColor="#FF6600" floodOpacity="0.25" />
                            </filter>
                        </defs>

                        {/* Rotating Projector Sprocket Orbit Ring */}
                        <circle
                            className={styles['splash-orbit-ring']}
                            cx="60"
                            cy="60"
                            r="52"
                            stroke="url(#splashReelRing)"
                            strokeWidth="2.5"
                            strokeDasharray="12 9"
                            strokeLinecap="round"
                        />

                        {/* Ambient Glowing Halo */}
                        <circle
                            className={styles['splash-ambient-halo']}
                            cx="60"
                            cy="60"
                            r="42"
                            fill="rgba(255, 193, 7, 0.09)"
                        />

                        {/* Center Cinema Ticket Emblem */}
                        <g className={styles['splash-ticket-group']} filter="url(#splashEmblemGlow)">
                            {/* Ticket Body */}
                            <rect
                                className={styles['splash-ticket-rect']}
                                x="24"
                                y="34"
                                width="72"
                                height="52"
                                rx="12"
                                fill="url(#splashGoldGrad)"
                            />

                            {/* Left Sprockets */}
                            <rect className={styles['splash-sprocket-dot']} x="32" y="42" width="7" height="11" rx="3.5" fill="#0D0D11" />
                            <rect className={styles['splash-sprocket-dot']} x="32" y="67" width="7" height="11" rx="3.5" fill="#0D0D11" />

                            {/* Right Sprockets */}
                            <rect className={styles['splash-sprocket-dot']} x="81" y="42" width="7" height="11" rx="3.5" fill="#0D0D11" />
                            <rect className={styles['splash-sprocket-dot']} x="81" y="67" width="7" height="11" rx="3.5" fill="#0D0D11" />

                            {/* Center Cinema Play Glyph */}
                            <path
                                className={styles['splash-play-glyph']}
                                d="M53 47 L72 60 L53 73 Z"
                                fill="#0D0D11"
                            />

                            {/* Light Beam Shimmer */}
                            <rect
                                className={styles['splash-shimmer-beam']}
                                x="24"
                                y="34"
                                width="72"
                                height="52"
                                rx="12"
                                fill="url(#splashShimmer)"
                            />
                        </g>
                    </svg>
                </div>

                {/* Animated Springroll Wordmark */}
                <div className={styles['splash-wordmark-container']}>
                    <h1 className={styles['splash-wordmark']}>
                        <span className={styles['wordmark-spring']}>spring</span>
                        <span className={styles['wordmark-roll']}>roll</span>
                    </h1>
                </div>

                {/* Subtitle Slogan */}
                <div className={styles['splash-tagline']}>
                    {statusText}
                </div>

                {/* High-Tech Glowing Laser Sweep Progress Indicator */}
                <div className={styles['splash-progress-track']}>
                    <div className={styles['splash-progress-beam']} />
                </div>
            </div>
        </div>
    );
};

export default SplashScreen;
