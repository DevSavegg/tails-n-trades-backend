#!/bin/bash
cd "$(dirname "$0")/.."
set -e

echo "[INFO] Restarting System..."

echo "[TASK] Stopping containers..."
docker-compose down

echo "[TASK] Rebuilding and Starting..."
docker-compose up -d --build

echo "[WAIT] Waiting for containers to stabilize..."
sleep 5

echo "[TASK] Running Database Migrations..."
docker exec -it tails_n_trades_backend bun run db:migrate

echo "---------------------------------------------------"
echo "[DONE] System Restarted Successfully!"
echo "       > App:        http://localhost:3000"
echo "       > Swagger UI: http://localhost:3000/swagger"
echo "---------------------------------------------------"