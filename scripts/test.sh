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

RUNNER=""
if command -v bun >/dev/null 2>&1; then
    RUNNER="bun"
elif command -v pnpm >/dev/null 2>&1; then
    RUNNER="pnpm"
elif command -v npm >/dev/null 2>&1; then
    RUNNER="npm"
elif command -v npx >/dev/null 2>&1; then
    RUNNER="npx"
else
    echo "Error: JS runner (bun, pnpm, or npm) is required for tests" >&2
    exit 1
fi

# Forward any flags directly to Jest if provided
if [ "$#" -gt 0 ]; then
    if [ "${RUNNER}" = "bun" ]; then
        exec bun test "$@"
    elif [ "${RUNNER}" = "pnpm" ]; then
        exec pnpm test "$@"
    elif [ "${RUNNER}" = "npm" ]; then
        exec npm test -- "$@"
    else
        exec npx jest "$@"
    fi
fi

# Run standard test suite
if [ "${RUNNER}" = "bun" ]; then
    bun run test
    echo "==> Verifying translation keys..."
    bun run scan-translations
elif [ "${RUNNER}" = "pnpm" ]; then
    pnpm test
    echo "==> Verifying translation keys..."
    pnpm run scan-translations
elif [ "${RUNNER}" = "npm" ]; then
    npm test
    echo "==> Verifying translation keys..."
    npm run scan-translations
else
    npx jest
    echo "==> Verifying translation keys..."
    npx jest ./tests/i18nScan.test.js
fi

echo "==> All test suites passed successfully!"
