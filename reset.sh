#!/bin/bash
echo "[WARN] Destroying containers and volumes..."
docker-compose down -v
echo "[DONE] Clean slate."