#!/usr/bin/env bash
# Copyright (C) 2017-2026 Smart code 203358507
#
# scripts/dev.sh
# Runs Stremio Desktop directly with Cargo / Rust.
#
# Usage:
#   ./scripts/dev.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PROJECT_ROOT}"

# Ensure cargo is on PATH
export PATH="${HOME}/.cargo/bin:${PATH}"

# Ensure streaming server bundle is present
if [ ! -f "server/server.js" ]; then
    echo "==> server.js not found. Downloading streaming server bundle..."
    "${SCRIPT_DIR}/download-server.sh"
fi

if ! command -v cargo >/dev/null 2>&1; then
    echo "Error: Cargo / Rust is required to run the desktop application." >&2
    exit 1
fi

echo "==> Launching Springroll Desktop with Cargo..."
exec cargo run --bin springroll
