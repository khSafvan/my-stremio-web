import React from 'react';
import classnames from 'classnames';
import styles from './SeriviaLogo.less';

type Props = {
    className?: string;
    showWordmark?: boolean;
    onClick?: () => void;
};

export const SeriviaLogo: React.FC<Props> = ({ className, showWordmark = true, onClick }) => {
    return (
        <div
            className={classnames(styles['serivia-logo-container'], className, {
                [styles['clickable']]: typeof onClick === 'function'
            })}
            onClick={onClick}
            title="Serivia"
        >
            <svg
                className={styles['serivia-icon']}
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                {/* Yellow cinema ticket emblem */}
                <rect x="2" y="5" width="28" height="22" rx="5" fill="#FFC107" />
                {/* Sprocket perforations */}
                <rect x="6" y="9" width="3.5" height="4" rx="1.5" fill="#0D0D11" />
                <rect x="6" y="19" width="3.5" height="4" rx="1.5" fill="#0D0D11" />
                <rect x="22.5" y="9" width="3.5" height="4" rx="1.5" fill="#0D0D11" />
                <rect x="22.5" y="19" width="3.5" height="4" rx="1.5" fill="#0D0D11" />
                {/* Center playback indicator */}
                <path d="M14 11.5L19.5 16L14 20.5V11.5Z" fill="#0D0D11" />
            </svg>
            {showWordmark && <span className={styles['serivia-wordmark']}>serivia</span>}
        </div>
    );
};

export default SeriviaLogo;
