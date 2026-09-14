#!/usr/bin/env bash
# Copyright (C) 2017-2026 Smart code 203358507
#
# scripts/build.sh
# Builds the Stremio Desktop native binary directly with Cargo / Rust.
#
# Usage:
#   ./scripts/build.sh            # Builds debug binary (target/debug/stremio)
#   ./scripts/build.sh --release  # Builds optimized release binary (target/release/stremio)

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
    echo "Error: Cargo / Rust is required to build the desktop application." >&2
    exit 1
fi

MODE="${1:-}"

if [ "${MODE}" = "--release" ] || [ "${MODE}" = "release" ]; then
    echo "==> Compiling optimized release binary with Cargo..."
    cargo build --release --bin springroll
    echo "==> Release binary compiled to: ${PROJECT_ROOT}/target/release/springroll"
else
    echo "==> Compiling Springroll Desktop binary with Cargo..."
    cargo build --bin springroll
    echo "==> Binary compiled to: ${PROJECT_ROOT}/target/debug/springroll"
fi
