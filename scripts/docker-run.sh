#!/usr/bin/env bash
# Copyright (C) 2017-2026 Smart code 203358507
#
# scripts/docker-run.sh
# Builds and runs Stremio Web inside a Docker container.
#
# Usage:
#   ./scripts/docker-run.sh
#   PORT=9090 ./scripts/docker-run.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PROJECT_ROOT}"

PORT="${PORT:-8080}"
IMAGE_NAME="stremio-web"
CONTAINER_NAME="stremio-web-app"

if ! command -v docker >/dev/null 2>&1; then
    echo "Error: 'docker' CLI is not installed or not in PATH." >&2
    exit 1
fi

echo "==> Building Docker image '${IMAGE_NAME}'..."
docker build -t "${IMAGE_NAME}" .

# Stop existing container with same name if running
if docker ps -q -f name="^/${CONTAINER_NAME}$" | grep -q .; then
    echo "==> Stopping running container '${CONTAINER_NAME}'..."
    docker stop "${CONTAINER_NAME}"
fi

if docker ps -aq -f name="^/${CONTAINER_NAME}$" | grep -q .; then
    echo "==> Removing existing container '${CONTAINER_NAME}'..."
    docker rm "${CONTAINER_NAME}"
fi

echo "==> Running container on http://localhost:${PORT}..."
docker run --rm -it -p "${PORT}:8080" --name "${CONTAINER_NAME}" "${IMAGE_NAME}"
