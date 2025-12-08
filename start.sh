#!/bin/bash

set -e

echo "[INFO] Starting System..."

docker-compose up -d --build

echo "[WAIT] Waiting for containers to stabilize..."
sleep 5

echo "[TASK] Running Database Migrations..."
docker exec -it tails_n_trades_backend npx @better-auth/cli migrate

echo "---------------------------------------------------"
echo "[DONE] System is running!"
echo "       > App:        http://localhost:3000"
echo "       > Swagger UI: http://localhost:3000/swagger"
echo "---------------------------------------------------"