#!/usr/bin/env bash
# Copyright (C) 2017-2026 Smart code 203358507
#
# scripts/lint.sh
# Runs ESLint and Prettier checks across the repository.
#
# Usage:
#   ./scripts/lint.sh          # Check only
#   ./scripts/lint.sh --fix    # Automatically fix issues

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
    echo "Error: JS runner (bun, pnpm, or npm) is required for linting" >&2
    exit 1
fi

FIX_MODE=false
if [ "${1:-}" = "--fix" ]; then
    FIX_MODE=true
fi

if [ "${FIX_MODE}" = true ]; then
    echo "==> Running ESLint auto-fix..."
    if [ "${RUNNER}" = "bun" ]; then
        bun run lint:fix
        echo "==> Formatting code with Prettier..."
        bun run format
    elif [ "${RUNNER}" = "pnpm" ]; then
        pnpm run lint:fix
        echo "==> Formatting code with Prettier..."
        pnpm run format
    else
        npm run lint:fix
        echo "==> Formatting code with Prettier..."
        npm run format
    fi
    echo "==> Auto-fix complete."
else
    echo "==> Running ESLint check..."
    if [ "${RUNNER}" = "bun" ]; then
        bun run lint
        echo "==> Running Prettier format check..."
        bun run format:check || {
            echo "Tip: Run './scripts/lint.sh --fix' to reformat code automatically."
        }
    elif [ "${RUNNER}" = "pnpm" ]; then
        pnpm run lint
        echo "==> Running Prettier format check..."
        pnpm run format:check || {
            echo "Tip: Run './scripts/lint.sh --fix' to reformat code automatically."
        }
    else
        npm run lint
        echo "==> Running Prettier format check..."
        npm run format:check || {
            echo "Tip: Run './scripts/lint.sh --fix' to reformat code automatically."
        }
    fi
    echo "==> Lint checks completed."
fi
