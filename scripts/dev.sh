#!/usr/bin/env bash
# Copyright (C) 2017-2026 Smart code 203358507
#
# scripts/dev.sh
# Starts the local development server for Stremio Web with hot reload.
#
# Usage:
#   ./scripts/dev.sh
#   PORT=8081 ./scripts/dev.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PROJECT_ROOT}"

# Auto-detect Node & pnpm from NVM if not present in current shell PATH
if ! command -v node >/dev/null 2>&1 || ! command -v pnpm >/dev/null 2>&1; then
    if [ -d "${HOME}/.nvm/versions/node" ]; then
        LATEST_NODE=$(ls -d "${HOME}/.nvm/versions/node"/v* 2>/dev/null | tail -n 1)
        if [ -n "${LATEST_NODE}" ] && [ -d "${LATEST_NODE}/bin" ]; then
            export PATH="${LATEST_NODE}/bin:${PATH}"
        fi
    fi
fi

echo "==> Starting Stremio Web in development mode..."

# Verify Node.js requirement (>= 22)
if ! command -v node >/dev/null 2>&1; then
    echo "Error: 'node' executable not found. Please ensure Node.js (>=22) is installed." >&2
    exit 1
fi

NODE_MAJOR=$(node -v | tr -d 'v' | cut -d. -f1)
if [ "${NODE_MAJOR}" -lt 22 ]; then
    echo "Warning: Node.js version is $(node -v). Recommended version is >= 22." >&2
fi

# Verify pnpm package manager
if ! command -v pnpm >/dev/null 2>&1; then
    echo "Error: 'pnpm' executable not found. Install with: npm install -g pnpm" >&2
    exit 1
fi

# Ensure dependencies are installed (idempotent)
if [ ! -d "node_modules" ]; then
    echo "==> node_modules not found. Running pnpm install..."
    pnpm install
fi

echo "==> Launching Webpack dev server..."
exec pnpm start
