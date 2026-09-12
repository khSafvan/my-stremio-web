#!/usr/bin/env bash
# Copyright (C) 2017-2026 Smart code 203358507
#
# scripts/test.sh
# Runs all Jest unit tests, route regression specs, and translation validation.
#
# Usage:
#   ./scripts/test.sh
#   ./scripts/test.sh --watch

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

echo "==> Running test suite..."

command -v pnpm >/dev/null 2>&1 || { echo "Error: pnpm is required" >&2; exit 1; }

# Forward any flags directly to Jest if provided
if [ "$#" -gt 0 ]; then
    exec pnpm test "$@"
fi

# Run standard test suite
pnpm test

echo "==> Verifying translation keys..."
pnpm run scan-translations

echo "==> All test suites passed successfully!"
