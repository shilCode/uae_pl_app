@echo off
chcp 65001 >nul 2>&1
title Polish Consulate Appointment Checker

:: Navigate to project root (parent of scripts\)
cd /d "%~dp0\.."

echo.
echo ===============================================
echo   Polish Consulate Appointment Checker
echo   Starting continuous monitoring...
echo ===============================================
echo.

:: Check if setup was run
if not exist "node_modules" (
    echo ERROR: Dependencies not installed!
    echo Please double-click "Setup.bat" in the scripts\ folder first.
    echo.
    pause
    exit /b 1
)

:: Show current settings
echo Current settings:
echo -----------------
if exist ".env" (
    findstr /R "^SERVICE_TYPE= ^LOCATION= ^NUM_PEOPLE= ^POLL_INTERVAL_MS= ^MAX_CAPTCHA_ATTEMPTS=" .env 2>nul
)
echo.
echo The checker will:
echo   1. Open Chrome and go to the consulate website
echo   2. Try to solve the CAPTCHA automatically
echo   3. Fill in your visa details
echo   4. Check for available appointments
echo   5. If found: alert you with sound + notification
echo   6. If not found: close browser, wait, and repeat
echo.
echo To stop: press Ctrl+C or close this window
echo.
echo Starting in 3 seconds...
timeout /t 3 /nobreak >nul

call npm run check

echo.
echo Checker stopped.
pause
