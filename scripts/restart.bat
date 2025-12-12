@echo off
cd /d "%~dp0.."
echo [INFO] Restarting System...

echo [TASK] Stopping containers...
docker-compose down

echo [TASK] Rebuilding and Starting...
docker-compose up -d --build

if %errorlevel% neq 0 (
    echo [ERROR] Docker failed to start.
    pause
    exit /b %errorlevel%
)

echo [WAIT] Waiting for containers to stabilize...
timeout /t 5 /nobreak >nul

echo [TASK] Running Database Migrations...
docker exec -it tails_n_trades_backend bun run db:migrate

echo.
echo ---------------------------------------------------
echo [DONE] System Restarted Successfully!
echo        ^> App:        http://localhost:3000
echo        ^> Swagger UI: http://localhost:3000/swagger
echo ---------------------------------------------------
echo.
pause