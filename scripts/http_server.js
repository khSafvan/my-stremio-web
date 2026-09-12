#!/usr/bin/env node

// Copyright (C) 2017-2026 Smart code 203358507

/**
 * @file scripts/http_server.js
 * Production static file server for Stremio Web build artifacts.
 */

const path = require('path');
const express = require('express');

const INDEX_CACHE = 7200; // 2 hours
const ASSETS_CACHE = 2629744; // ~1 month
const HTTP_PORT = parseInt(process.env.PORT || '8080', 10);

const buildPath = path.resolve(__dirname, '..', 'build');
const indexPath = path.join(buildPath, 'index.html');

const app = express();

// Security and basic headers
app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// Serve static assets with appropriate cache control
app.use(express.static(buildPath, {
    setHeaders: (res, filePath) => {
        if (filePath === indexPath) {
            res.set('Cache-Control', `public, max-age=${INDEX_CACHE}`);
        } else {
            res.set('Cache-Control', `public, max-age=${ASSETS_CACHE}, immutable`);
        }
    }
}));

// Fallback route for 404s
app.all('*', (_req, res) => {
    res.status(404).send('<!DOCTYPE html><html><head><title>404 Not Found</title></head><body><h1>404! Page not found</h1></body></html>');
});

const server = app.listen(HTTP_PORT, () => {
    console.info(`Stremio Web server listening on port: ${HTTP_PORT}`);
});

// Graceful shutdown handling
const shutdown = () => {
    console.info('Received termination signal. Closing HTTP server...');
    server.close(() => {
        console.info('HTTP server closed successfully.');
        process.exit(0);
    });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = app;
