#!/usr/bin/env bash
# Copyright (C) 2017-2026 Smart code 203358507
#
# scripts/run-server.sh
# Runs the bundled local Stremio Streaming Server (EngineFS) on port 11470.
#
# Usage:
#   ./scripts/run-server.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PROJECT_ROOT}"

# Auto-detect Node from NVM if not present in current shell PATH
if ! command -v node >/dev/null 2>&1; then
    if [ -d "${HOME}/.nvm/versions/node" ]; then
        LATEST_NODE=$(ls -d "${HOME}/.nvm/versions/node"/v* 2>/dev/null | tail -n 1)
        if [ -n "${LATEST_NODE}" ] && [ -d "${LATEST_NODE}/bin" ]; then
            export PATH="${LATEST_NODE}/bin:${PATH}"
        fi
    fi
fi

SERVER_FILE="${PROJECT_ROOT}/server/server.js"

if [ ! -f "${SERVER_FILE}" ]; then
    echo "==> server.js not found. Downloading..."
    "${SCRIPT_DIR}/download-server.sh"
fi

# Auto-detect Bun or Node runtime
JS_RUNNER=""
if command -v bun >/dev/null 2>&1; then
    JS_RUNNER="bun"
elif command -v node >/dev/null 2>&1; then
    JS_RUNNER="node"
else
    echo "Error: Bun or Node.js is required to execute the streaming server." >&2
    exit 1
fi

# Performance Optimizations
export UV_THREADPOOL_SIZE="${UV_THREADPOOL_SIZE:-32}"
export NODE_ENV="production"
export SETTINGS_PATH="${SETTINGS_PATH:-${PROJECT_ROOT}/server}"

# Leverage hardware-accelerated system FFmpeg/FFprobe if present
if command -v ffmpeg >/dev/null 2>&1; then
    export FFMPEG_BIN="${FFMPEG_BIN:-$(command -v ffmpeg)}"
fi
if command -v ffprobe >/dev/null 2>&1; then
    export FFPROBE_BIN="${FFPROBE_BIN:-$(command -v ffprobe)}"
fi

echo "==> Launching Tuned Stremio Streaming Server via ${JS_RUNNER} on 127.0.0.1:11470..."
echo "    • Runtime: ${JS_RUNNER}"
echo "    • Threadpool: ${UV_THREADPOOL_SIZE} workers"
echo "    • Max Heap: 4096 MB"
echo "    • Settings: ${SETTINGS_PATH}/server-settings.json"
echo "    • FFmpeg: ${FFMPEG_BIN:-bundled}"

if [ "${JS_RUNNER}" = "bun" ]; then
    exec bun "${SERVER_FILE}"
else
    exec node --max-old-space-size=4096 --no-warnings "${SERVER_FILE}"
fi
