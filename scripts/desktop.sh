#!/usr/bin/env bash
# Copyright (C) 2017-2026 Smart code 203358507
#
# scripts/desktop.sh
# Manages the Tauri v2 Linux desktop application build and dev workflow.
#
# Usage:
#   ./scripts/desktop.sh         # Launch Tauri desktop app in dev mode
#   ./scripts/desktop.sh build   # Build production desktop binary & bundles

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PROJECT_ROOT}"

# Add cargo and node to PATH if needed
export PATH="${HOME}/.cargo/bin:${PATH}"

# Auto-detect Node & pnpm from NVM if not present in current shell PATH
if ! command -v node >/dev/null 2>&1 || ! command -v pnpm >/dev/null 2>&1; then
    if [ -d "${HOME}/.nvm/versions/node" ]; then
        LATEST_NODE=$(ls -d "${HOME}/.nvm/versions/node"/v* 2>/dev/null | tail -n 1)
        if [ -n "${LATEST_NODE}" ] && [ -d "${LATEST_NODE}/bin" ]; then
            export PATH="${LATEST_NODE}/bin:${PATH}"
        fi
    fi
fi

command -v node >/dev/null 2>&1 || { echo "Error: node is required" >&2; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "Error: pnpm is required" >&2; exit 1; }
command -v cargo >/dev/null 2>&1 || { echo "Error: cargo is required" >&2; exit 1; }

# Ensure server bundle is downloaded
if [ ! -f "server/server.js" ]; then
    echo "==> server.js not found. Downloading streaming server bundle..."
    "${SCRIPT_DIR}/download-server.sh"
fi

# Ensure frontend production bundle exists
if [ ! -d "build" ]; then
    echo "==> Building frontend assets for desktop..."
    pnpm run build
fi

MODE="${1:-dev}"

if [ "${MODE}" = "build" ]; then
    echo "==> Building Stremio Linux desktop application (Tauri v2)..."
    exec pnpm run tauri:build
else
    echo "==> Launching Stremio desktop application in dev mode..."
    exec pnpm run tauri:dev
fi
