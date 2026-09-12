#!/usr/bin/env bash
# Copyright (C) 2017-2026 Smart code 203358507
#
# scripts/download-server.sh
# Downloads the official desktop Stremio Streaming Server bundle.
#
# Usage:
#   ./scripts/download-server.sh
#   SERVER_VERSION=v4.21.1 ./scripts/download-server.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PROJECT_ROOT}"

SERVER_VERSION="${SERVER_VERSION:-v4.21.1}"
SERVER_URL="https://dl.strem.io/server/${SERVER_VERSION}/desktop/server.js"
SERVER_DIR="${PROJECT_ROOT}/server"
SERVER_TARGET="${SERVER_DIR}/server.js"

mkdir -p "${SERVER_DIR}"

echo "==> Fetching Stremio Streaming Server ${SERVER_VERSION}..."
curl -fsSL -o "${SERVER_TARGET}" "${SERVER_URL}"

echo "==> Stremio Streaming Server bundle saved to ${SERVER_TARGET} ($(du -h "${SERVER_TARGET}" | cut -f1))"
