#!/usr/bin/env bash
# Copyright (C) 2017-2026 Smart code 203358507
#
# scripts/build.sh
# Creates a production bundle in the 'build' directory.
#
# Usage:
#   ./scripts/build.sh
#   CLEAN=true ./scripts/build.sh

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

echo "==> Building Stremio Web for production..."

# Verify Node.js and pnpm
command -v node >/dev/null 2>&1 || { echo "Error: node is required" >&2; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "Error: pnpm is required" >&2; exit 1; }

# Optional clean step before build
if [ "${CLEAN:-false}" = "true" ] && [ -d "build" ]; then
    echo "==> Cleaning previous build directory..."
    rm -rf build
fi

# Ensure dependencies are up-to-date (idempotent)
if [ ! -d "node_modules" ]; then
    echo "==> Installing dependencies with pnpm..."
    pnpm install --frozen-lockfile
fi

echo "==> Running production webpack build..."
pnpm run build

echo "==> Build completed successfully. Output saved to '${PROJECT_ROOT}/build'."
