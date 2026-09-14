import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useCore } from 'stremio/core';
import { useToast } from 'stremio/common';
import Icon from '@stremio/stremio-icons/react';
import ModalDialog from '../ModalDialog';
import Button from '../Button';
import {
    AIOStreamsConfig,
    loadAIOConfig,
    saveAIOConfig,
    clearAIOConfig,
    importAIOConfiguration,
    exportAIOConfiguration,
    testAIOConnection,
    fetchAIOManifest,
} from 'stremio/services/AIOStreams';
import styles from './AIOStreamsModal.less';

interface Props {
    onCloseRequest?: (event?: any) => void;
    initialUrl?: string;
}

type TabType = 'import' | 'config' | 'export';

const AIOStreamsModal: React.FC<Props> = ({ onCloseRequest, initialUrl }) => {
    const { t } = useTranslation();
    const core = useCore();
    const toast = useToast();

    const [activeTab, setActiveTab] = useState<TabType>('import');
    const [manifestUrlInput, setManifestUrlInput] = useState(initialUrl || '');
    const [jsonTemplateInput, setJsonTemplateInput] = useState('');
    const [activeConfig, setActiveConfig] = useState<AIOStreamsConfig | null>(() => loadAIOConfig());

    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{
        success: boolean;
        latencyMs?: number;
        error?: string;
        manifest?: any;
    } | null>(null);

    // Sync initialUrl if provided
    useEffect(() => {
        if (initialUrl) {
            setManifestUrlInput(initialUrl);
        } else if (activeConfig?.manifestUrl) {
            setManifestUrlInput(activeConfig.manifestUrl);
        }
    }, [initialUrl, activeConfig]);

    const runConnectionTest = useCallback(async (url: string) => {
        if (!url) return;
        setIsTesting(true);
        setTestResult(null);
        try {
            const res = await testAIOConnection(url);
            setTestResult(res);
            if (res.success) {
                toast.show({
                    type: 'success',
                    title: `AIOStreams Connected (${res.latencyMs}ms)`,
                    timeout: 3000,
                });
            } else {
                toast.show({
                    type: 'error',
                    title: `AIOStreams test failed: ${res.error}`,
                    timeout: 4000,
                });
            }
        } catch (e: any) {
            setTestResult({ success: false, latencyMs: 0, error: e.message });
        } finally {
            setIsTesting(false);
        }
    }, [toast]);

    const handleImport = useCallback(async () => {
        const inputToParse = jsonTemplateInput.trim() || manifestUrlInput.trim();
        if (!inputToParse) {
            toast.show({
                type: 'error',
                title: 'Please enter an AIOStreams URL or JSON template',
                timeout: 3000,
            });
            return;
        }

        try {
            const config = importAIOConfiguration(inputToParse);
            setActiveConfig(config);
            saveAIOConfig(config);
            setManifestUrlInput(config.manifestUrl);

            toast.show({
                type: 'success',
                title: 'AIOStreams configuration activated!',
                timeout: 3500,
            });

            // Automatically ping instance to check status
            runConnectionTest(config.manifestUrl);
            setActiveTab('config');
        } catch (err: any) {
            toast.show({
                type: 'error',
                title: `Import failed: ${err.message || 'Invalid format'}`,
                timeout: 5000,
            });
        }
    }, [jsonTemplateInput, manifestUrlInput, toast, runConnectionTest]);

    const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            if (content) {
                setJsonTemplateInput(content);
                try {
                    const config = importAIOConfiguration(content);
                    setActiveConfig(config);
                    saveAIOConfig(config);
                    setManifestUrlInput(config.manifestUrl);
                    toast.show({
                        type: 'success',
                        title: `Imported template "${file.name}" successfully!`,
                        timeout: 3500,
                    });
                    runConnectionTest(config.manifestUrl);
                    setActiveTab('config');
                } catch (err: any) {
                    toast.show({
                        type: 'error',
                        title: `Failed to import template file: ${err.message}`,
                        timeout: 5000,
                    });
                }
            }
        };
        reader.readAsText(file);
    }, [toast, runConnectionTest]);

    const handleInstallToSpringroll = useCallback(async () => {
        if (!activeConfig?.manifestUrl) {
            toast.show({
                type: 'error',
                title: 'No active AIOStreams manifest URL to install',
                timeout: 3000,
            });
            return;
        }

        try {
            toast.show({
                type: 'info',
                title: 'Fetching AIOStreams manifest...',
                timeout: 2000,
            });

            const manifest = await fetchAIOManifest(activeConfig.manifestUrl);

            core.transport.dispatch({
                action: 'Ctx',
                args: {
                    action: 'InstallAddon',
                    args: {
                        transportUrl: activeConfig.manifestUrl,
                        manifest,
                        flags: {
                            official: false,
                            protected: false,
                        },
                    },
                },
            });

            toast.show({
                type: 'success',
                title: `Installed "${manifest.name || 'AIOStreams'}" into Springroll Addons!`,
                timeout: 4000,
            });
        } catch (err: any) {
            toast.show({
                type: 'error',
                title: `Failed to install addon: ${err.message}`,
                timeout: 5000,
            });
        }
    }, [activeConfig, core, toast]);

    const handleClearConfig = useCallback(() => {
        clearAIOConfig();
        setActiveConfig(null);
        setTestResult(null);
        setManifestUrlInput('');
        setJsonTemplateInput('');
        toast.show({
            type: 'info',
            title: 'AIOStreams configuration cleared',
            timeout: 2500,
        });
    }, [toast]);

    const exportJson = useMemo(() => {
        if (!activeConfig) return '';
        return exportAIOConfiguration(activeConfig);
    }, [activeConfig]);

    const handleCopyExport = useCallback(() => {
        if (!exportJson) return;
        navigator.clipboard.writeText(exportJson);
        toast.show({
            type: 'success',
            title: 'Configuration JSON copied to clipboard!',
            timeout: 2500,
        });
    }, [exportJson, toast]);

    const handleDownloadExport = useCallback(() => {
        if (!exportJson) return;
        const blob = new Blob([exportJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'aiostreams-config.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.show({
            type: 'success',
            title: 'Downloaded aiostreams-config.json',
            timeout: 2500,
        });
    }, [exportJson, toast]);

    const modalButtons = useMemo(() => {
        return [
            {
                label: t('BUTTON_CLOSE', { defaultValue: 'Close' }),
                props: {
                    onClick: onCloseRequest,
                },
            },
        ];
    }, [onCloseRequest, t]);

    return (
        <ModalDialog
            className={styles['aiostreams-modal-dialog']}
            title="AIOStreams Aggregator Manager"
            buttons={modalButtons}
            dataset={null}
            background={null}
            onCloseRequest={onCloseRequest}
        >
            <div className={styles['aiostreams-content']}>
                <div className={styles['tab-bar']}>
                    <button
                        className={`${styles['tab-button']} ${activeTab === 'import' ? styles['active'] : ''}`}
                        onClick={() => setActiveTab('import')}
                    >
                        Import & Connect
                    </button>
                    <button
                        className={`${styles['tab-button']} ${activeTab === 'config' ? styles['active'] : ''}`}
                        onClick={() => setActiveTab('config')}
                    >
                        Active Setup
                    </button>
                    <button
                        className={`${styles['tab-button']} ${activeTab === 'export' ? styles['active'] : ''}`}
                        onClick={() => setActiveTab('export')}
                    >
                        Export & Share
                    </button>
                </div>

                {activeTab === 'import' && (
                    <React.Fragment>
                        <p className={styles['section-desc']}>
                            Connect an AIOStreams instance or import configuration templates (Core Builds, Tamtaro, Grabberhawk) to aggregate Real-Debrid, TorBox, Torrentio, Comet, and MediaFusion into a single fast stream resolver.
                        </p>

                        <div className={styles['form-group']}>
                            <label>AIOStreams Manifest / Setup URL</label>
                            <span className={styles['hint']}>
                                Paste your AIO manifest URL (e.g. <code>https://aiostreams.domain.com/ey.../manifest.json</code> or <code>stremio://...</code>)
                            </span>
                            <input
                                type="text"
                                className={styles['text-input']}
                                placeholder="https://your-aiostreams-instance.com/.../manifest.json"
                                value={manifestUrlInput}
                                onChange={(e) => setManifestUrlInput(e.target.value)}
                            />
                        </div>

                        <div className={styles['dropzone-row']}>
                            <div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Import Template File</div>
                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                                    Load exported <code>aiostreams-config.json</code>
                                </div>
                            </div>
                            <div className={styles['file-input-wrapper']}>
                                <button className={`${styles['btn']} ${styles['btn-secondary']}`}>
                                    <Icon name="attachment" className={styles['mini-icon']} />
                                    Browse JSON...
                                </button>
                                <input type="file" accept=".json,application/json" onChange={handleFileUpload} />
                            </div>
                        </div>

                        <div className={styles['form-group']}>
                            <label>Or Paste Raw JSON Configuration</label>
                            <textarea
                                className={styles['text-input']}
                                placeholder='{"addons": [...], "services": [...], "formatter": {...}}'
                                value={jsonTemplateInput}
                                onChange={(e) => setJsonTemplateInput(e.target.value)}
                            />
                        </div>

                        <div className={styles['button-row']}>
                            <button className={`${styles['btn']} ${styles['btn-primary']}`} onClick={handleImport}>
                                <Icon name="check" className={styles['mini-icon']} />
                                Import & Activate
                            </button>

                            {manifestUrlInput && (
                                <button
                                    className={`${styles['btn']} ${styles['btn-secondary']}`}
                                    onClick={() => runConnectionTest(manifestUrlInput)}
                                    disabled={isTesting}
                                >
                                    {isTesting ? 'Testing...' : 'Test Connection'}
                                </button>
                            )}
                        </div>

                        {testResult && (
                            <div
                                className={`${styles['status-card']} ${
                                    testResult.success ? styles['online'] : styles['offline']
                                }`}
                            >
                                <div className={styles['status-info']}>
                                    <div className={styles['status-title']}>
                                        {testResult.success ? 'Instance Online' : 'Connection Failed'}
                                    </div>
                                    <div className={styles['status-meta']}>
                                        {testResult.success
                                            ? `Latency: ${testResult.latencyMs}ms | Addon: ${testResult.manifest?.name || 'AIOStreams'}`
                                            : testResult.error}
                                    </div>
                                </div>
                            </div>
                        )}
                    </React.Fragment>
                )}

                {activeTab === 'config' && (
                    <React.Fragment>
                        {activeConfig ? (
                            <React.Fragment>
                                <div
                                    className={`${styles['status-card']} ${
                                        testResult?.success ? styles['online'] : styles['testing']
                                    }`}
                                >
                                    <div className={styles['status-info']}>
                                        <div className={styles['status-title']}>
                                            Active Manifest Endpoint
                                        </div>
                                        <div className={styles['status-meta']}>
                                            {activeConfig.manifestUrl}
                                        </div>
                                    </div>
                                    <button
                                        className={`${styles['btn']} ${styles['btn-secondary']}`}
                                        onClick={() => runConnectionTest(activeConfig.manifestUrl)}
                                        disabled={isTesting}
                                    >
                                        {isTesting ? 'Pinging...' : 'Ping'}
                                    </button>
                                </div>

                                <div className={styles['form-group']}>
                                    <label>Configured Scrapers & Addons ({activeConfig.addons?.length || 0})</label>
                                    <div className={styles['badges-grid']}>
                                        {activeConfig.addons && activeConfig.addons.length > 0 ? (
                                            activeConfig.addons.map((addon, idx) => (
                                                <span key={idx} className={`${styles['badge']} ${styles['scraper']}`}>
                                                    {addon.name || addon.type || 'Addon'}
                                                </span>
                                            ))
                                        ) : (
                                            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
                                                Server default scrapers active (Torrentio, Comet, MediaFusion)
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className={styles['form-group']}>
                                    <label>Debrid & Streaming Services ({activeConfig.services?.length || 0})</label>
                                    <div className={styles['badges-grid']}>
                                        {activeConfig.services && activeConfig.services.length > 0 ? (
                                            activeConfig.services.map((srv, idx) => (
                                                <span key={idx} className={`${styles['badge']} ${styles['debrid']}`}>
                                                    {srv.name || srv.id}
                                                </span>
                                            ))
                                        ) : (
                                            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
                                                Server handles debrid credentials directly
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className={styles['button-row']}>
                                    <button
                                        className={`${styles['btn']} ${styles['btn-primary']}`}
                                        onClick={handleInstallToSpringroll}
                                    >
                                        <Icon name="addons" className={styles['mini-icon']} />
                                        Install into Springroll Addons
                                    </button>
                                    <button
                                        className={`${styles['btn']} ${styles['btn-danger']}`}
                                        onClick={handleClearConfig}
                                    >
                                        Clear Configuration
                                    </button>
                                </div>
                            </React.Fragment>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '2rem 0', color: 'rgba(255,255,255,0.5)' }}>
                                No active AIOStreams configuration. Go to the "Import & Connect" tab to set one up.
                            </div>
                        )}
                    </React.Fragment>
                )}

                {activeTab === 'export' && (
                    <React.Fragment>
                        <p className={styles['section-desc']}>
                            Export your active setup as an <code>aiostreams-config.json</code> template. You can share this with friends, backup your scrapers and filters, or import it into any other AIOStreams web instance.
                        </p>

                        {exportJson ? (
                            <React.Fragment>
                                <div className={styles['form-group']}>
                                    <textarea
                                        className={styles['text-input']}
                                        readOnly
                                        rows={10}
                                        value={exportJson}
                                    />
                                </div>

                                <div className={styles['button-row']}>
                                    <button
                                        className={`${styles['btn']} ${styles['btn-primary']}`}
                                        onClick={handleCopyExport}
                                    >
                                        <Icon name="copy" className={styles['mini-icon']} />
                                        Copy JSON
                                    </button>
                                    <button
                                        className={`${styles['btn']} ${styles['btn-secondary']}`}
                                        onClick={handleDownloadExport}
                                    >
                                        <Icon name="download" className={styles['mini-icon']} />
                                        Download aiostreams-config.json
                                    </button>
                                </div>
                            </React.Fragment>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '2rem 0', color: 'rgba(255,255,255,0.5)' }}>
                                Configure an AIOStreams instance first before exporting.
                            </div>
                        )}
                    </React.Fragment>
                )}
            </div>
        </ModalDialog>
    );
};

export default AIOStreamsModal;
