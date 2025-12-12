#!/bin/bash
cd "$(dirname "$0")/.."
set -e

SECURITY_CODE=$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 6)

echo "---------------------------------------------------"
echo "[WARN] DANGER ZONE"
echo "[WARN] You are about to DESTROY containers and PERMANENTLY DELETE volumes."
echo "---------------------------------------------------"
echo "To confirm, type the following security phrase: $SECURITY_CODE"
read -p "Enter Phrase: " USER_INPUT

if [ "$USER_INPUT" != "$SECURITY_CODE" ]; then
    echo
    echo "[ERROR] Verification failed! Phrase did not match."
    echo "[INFO] Operation cancelled. No data was deleted."
    exit 1
fi

echo
echo "[INFO] Verification successful."
echo "[WARN] Destroying containers and volumes..."
docker-compose down -v
echo "[DONE] Clean slate."