import React, { forwardRef, useMemo } from 'react';
import classNames from 'classnames';
import { Image, SpringrollLoader } from 'stremio/components';
import styles from './Buffering.less';

type Props = {
    className?: string;
    logo?: string;
    progress?: number;
};

const Buffering = forwardRef<HTMLDivElement, Props>(({ className, logo, progress = 0 }, ref) => {
    const style = useMemo(() => {
        return {
            clipPath: `inset(0 ${100 - progress}% 0 0)`,
        };
    }, [progress]);

    // If a specific stream or channel logo is passed, show the dual-layered clip-path image
    if (logo && logo.length > 0) {
        return (
            <div ref={ref} className={classNames(className, styles['buffering'])}>
                <Image
                    className={styles['logo']}
                    style={style}
                    src={logo}
                    alt={' '}
                    fallbackSrc={require('/assets/images/springroll_symbol.png')}
                />
                <Image
                    className={classNames(styles['logo'], styles['background'])}
                    src={logo}
                    alt={' '}
                    fallbackSrc={require('/assets/images/springroll_symbol.png')}
                />
                {progress > 0 && progress < 100 && (
                    <div className={styles['progress-label']}>
                        {Math.round(progress)}%
                    </div>
                )}
            </div>
        );
    }

    // Default: Cinema-grade animated looping Springroll symbol loader
    return (
        <div ref={ref} className={classNames(className, styles['buffering'])}>
            <SpringrollLoader
                size={96}
                progress={progress > 0 ? progress : undefined}
                label="Buffering"
                colorVariant="gold"
            />
        </div>
    );
});

export default Buffering;
