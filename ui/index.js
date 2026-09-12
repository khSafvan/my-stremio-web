// Copyright (C) 2017-2026 Smart code 203358507

/**
 * @file src/index.js
 * Primary application entry point for Stremio Web.
 * Initializes error monitoring, client platform heuristics, internationalization,
 * and mounts the React root application tree with all top-level context providers.
 */

// Initialize Sentry error reporting if a DSN is provided via environment
if (typeof process.env.SENTRY_DSN === 'string') {
    const Sentry = require('@sentry/browser');
    Sentry.init({ dsn: process.env.SENTRY_DSN });
}

// Detect client platform; disable mobile viewport restrictions on desktop environments
const Bowser = require('bowser');
const browser = Bowser.parse(window.navigator?.userAgent || '');
if (browser?.platform?.type === 'desktop') {
    document.querySelector('meta[name="viewport"]')?.setAttribute('content', '');
}

const React = require('react');
const ReactDOM = require('react-dom/client');
const { HashRouter } = require('react-router-dom');
const i18n = require('i18next');
const { initReactI18next } = require('react-i18next');
const stremioTranslations = require('stremio-translations');
const App = require('./App');
const { default: WebUpdateScreen } = require('./App/WebUpdateScreen');
const { CoreProvider } = require('./core');
const { FileDropProvider, PlatformProvider } = require('./common');

// Map dictionary of translations into i18next resource format
const translations = Object.fromEntries(
    Object.entries(stremioTranslations()).map(([key, value]) => [
        key,
        { translation: value }
    ])
);

// Initialize i18next internationalization engine
i18n
    .use(initReactI18next)
    .init({
        resources: translations,
        lng: 'en-US',
        fallbackLng: 'en-US',
        interpolation: {
            escapeValue: false
        }
    });

/**
 * Application metadata passed to the core state machine
 * @type {{ appVersion: string | undefined, shellVersion: string | null }}
 */
const appInfo = {
    appVersion: process.env.VERSION,
    shellVersion: null
};

// Mount root React component into DOM
const root = ReactDOM.createRoot(document.getElementById('app'));
root.render(
    <React.StrictMode>
        <PlatformProvider>
            <CoreProvider appInfo={appInfo}>
                <FileDropProvider>
                    <HashRouter>
                        <>
                            <WebUpdateScreen />
                            <App />
                        </>
                    </HashRouter>
                </FileDropProvider>
            </CoreProvider>
        </PlatformProvider>
    </React.StrictMode>
);

