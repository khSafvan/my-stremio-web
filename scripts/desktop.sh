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

# Ensure cargo is on PATH
export PATH="${HOME}/.cargo/bin:${PATH}"

if ! command -v cargo >/dev/null 2>&1; then
    echo "Error: Cargo / Rust is required to run/build the desktop application." >&2
    exit 1
fi

MODE="${1:-dev}"

if [ "${MODE}" = "build" ] || [ "${MODE}" = "--release" ] || [ "${MODE}" = "release" ]; then
    exec "${SCRIPT_DIR}/build.sh" "$@"
else
    exec "${SCRIPT_DIR}/dev.sh"
fi
