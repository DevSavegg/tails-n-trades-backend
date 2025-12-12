@echo off
cd /d "%~dp0.."
echo [INFO] Stopping System...

docker-compose down

echo.
echo [DONE] System stopped. Data preserved.
pause