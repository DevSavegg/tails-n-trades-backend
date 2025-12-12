#!/bin/bash
cd "$(dirname "$0")/.."
set -e

echo "[INFO] Stopping System..."

docker-compose down

echo "[DONE] System stopped. Data preserved."