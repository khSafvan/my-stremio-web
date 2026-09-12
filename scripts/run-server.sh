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

if ! command -v node >/dev/null 2>&1; then
    echo "Error: Node.js is required to execute the streaming server." >&2
    exit 1
fi

echo "==> Launching Stremio Streaming Server on 127.0.0.1:11470..."
exec node "${SERVER_FILE}"
