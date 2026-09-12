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

command -v pnpm >/dev/null 2>&1 || { echo "Error: pnpm is required" >&2; exit 1; }

FIX_MODE=false
if [ "${1:-}" = "--fix" ]; then
    FIX_MODE=true
fi

if [ "${FIX_MODE}" = true ]; then
    echo "==> Running ESLint auto-fix..."
    pnpm run lint:fix

    echo "==> Formatting code with Prettier..."
    pnpm run format
    echo "==> Auto-fix complete."
else
    echo "==> Running ESLint check..."
    pnpm run lint

    echo "==> Running Prettier format check..."
    pnpm run format:check || {
        echo "Tip: Run './scripts/lint.sh --fix' or 'pnpm run format' to reformat code automatically."
    }
    echo "==> Lint checks completed."
fi
