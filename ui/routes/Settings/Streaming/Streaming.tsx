import React, { forwardRef, useCallback, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '@stremio/stremio-icons/react';
import { Button, MultiselectMenu, AIOStreamsModal } from 'stremio/components';
import { useToast } from 'stremio/common';
import { loadAIOConfig, AIO_CONFIG_CHANGE_EVENT, AIOStreamsConfig } from 'stremio/services/AIOStreams';
import { Section, Option } from '../components';
import URLsManager from './URLsManager';
import useStreamingOptions from './useStreamingOptions';
import styles from './Streaming.less';

type Props = {
    profile: Profile,
    streamingServer: StreamingServer,
};

const Streaming = forwardRef<HTMLDivElement, Props>(({ profile, streamingServer }: Props, ref) => {
    const { t } = useTranslation();
    const toast = useToast();

    const [isAIOModalOpen, setIsAIOModalOpen] = useState(false);
    const [aioConfig, setAioConfig] = useState<AIOStreamsConfig | null>(() => loadAIOConfig());

    useEffect(() => {
        const handleConfigChange = (e: any) => {
            setAioConfig(e.detail || loadAIOConfig());
        };
        window.addEventListener(AIO_CONFIG_CHANGE_EVENT, handleConfigChange);
        return () => window.removeEventListener(AIO_CONFIG_CHANGE_EVENT, handleConfigChange);
    }, []);

    const {
        streamingServerRemoteUrlInput,
        remoteEndpointSelect,
        cacheSizeSelect,
        torrentProfileSelect,
        transcodingProfileSelect,
    } = useStreamingOptions(streamingServer);

    const onCopyRemoteUrl = useCallback(() => {
        if (streamingServer.remoteUrl) {
            navigator.clipboard.writeText(streamingServer.remoteUrl);

            toast.show({
                type: 'success',
                title: t('SETTINGS_REMOTE_URL_COPIED'),
                timeout: 2500,
            });
        }
    }, [streamingServer.remoteUrl]);

    return (
        <Section ref={ref} label={'SETTINGS_NAV_STREAMING'}>
            <URLsManager selectedUrl={profile.settings.streamingServerUrl} settings={streamingServer.settings} />
            <Option className={styles['configure-input-container']} label={'AIOStreams Aggregator'}>
                <div className={styles['label']} title={aioConfig?.manifestUrl || 'Decoupled multi-scraper & debrid aggregator'}>
                    {aioConfig?.manifestUrl ? `Active (${aioConfig.instanceUrl})` : 'Not Configured (Connect Debrid & Scrapers)'}
                </div>
                <Button className={styles['configure-button-container']} title={'Configure AIOStreams'} onClick={() => setIsAIOModalOpen(true)}>
                    <Icon className={styles['icon']} name={'settings'} />
                </Button>
            </Option>
            {
                isAIOModalOpen &&
                    <AIOStreamsModal onCloseRequest={() => setIsAIOModalOpen(false)} />
            }

            {
                streamingServerRemoteUrlInput.value !== null &&
                    <Option className={styles['configure-input-container']} label={'SETTINGS_REMOTE_URL'}>
                        <div className={styles['label']} title={streamingServerRemoteUrlInput.value}>{streamingServerRemoteUrlInput.value}</div>
                        <Button className={styles['configure-button-container']} title={t('SETTINGS_COPY_REMOTE_URL')} onClick={onCopyRemoteUrl}>
                            <Icon className={styles['icon']} name={'link'} />
                        </Button>
                    </Option>
            }
            {
                profile.auth !== null && profile.auth.user !== null && remoteEndpointSelect !== null &&
                    <Option label={'SETTINGS_HTTPS_ENDPOINT'}>
                        <MultiselectMenu
                            className={'multiselect'}
                            {...remoteEndpointSelect}
                        />
                    </Option>
            }
            {
                cacheSizeSelect !== null &&
                    <Option label={'SETTINGS_SERVER_CACHE_SIZE'}>
                        <MultiselectMenu
                            className={'multiselect'}
                            {...cacheSizeSelect}
                        />
                    </Option>
            }
            {
                torrentProfileSelect !== null &&
                    <Option label={'SETTINGS_SERVER_TORRENT_PROFILE'}>
                        <MultiselectMenu
                            className={'multiselect'}
                            {...torrentProfileSelect}
                        />
                    </Option>
            }
            {
                transcodingProfileSelect !== null &&
                    <Option label={'SETTINGS_TRANSCODE_PROFILE'}>
                        <MultiselectMenu
                            className={'multiselect'}
                            {...transcodingProfileSelect}
                        />
                    </Option>
            }
        </Section>
    );
});

export default Streaming;
