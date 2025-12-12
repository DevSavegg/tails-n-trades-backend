@echo off
cd /d "%~dp0.."
setlocal

set "securityCode=%RANDOM%"

echo [WARN] You are about to DESTROY containers and PERMANENTLY DELETE volumes (Database Data).
echo [WARN] To confirm, please type the following security code: %securityCode%
echo.

set /p "userInput=Enter Code: "

if "%userInput%" neq "%securityCode%" (
    echo.
    echo [ERROR] Verification failed! Code did not match.
    echo [INFO] Operation cancelled. No data was deleted.
    pause
    exit /b 1
)

echo.
echo [INFO] Verification successful.
echo [WARN] Destroying containers and volumes...
docker-compose down -v
echo [DONE] Clean slate.
pause