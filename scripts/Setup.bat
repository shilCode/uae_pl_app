@echo off
chcp 65001 >nul 2>&1
title Polish Consulate Appointment Checker - Setup
echo.
echo ===============================================
echo   Polish Consulate Appointment Checker
echo   First-Time Setup
echo ===============================================
echo.

:: Navigate to project root (parent of scripts\)
cd /d "%~dp0\.."

:: ── Check for Node.js ──
echo [1/3] Checking for Node.js...
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo    Node.js not found!
    echo.
    echo    Please install Node.js first:
    echo    1. Go to https://nodejs.org
    echo    2. Download the LTS version
    echo    3. Run the installer (click Next through everything)
    echo    4. Restart your computer
    echo    5. Double-click this file again
    echo.
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('node -v') do echo    OK - Node.js %%i found
)

:: ── Install project dependencies ──
echo [2/3] Installing project dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo    ERROR: npm install failed
    pause
    exit /b 1
)
echo    OK - Dependencies installed

:: ── Install Playwright browser ──
echo [3/3] Installing Chrome for testing...
call npx playwright install chromium
if %ERRORLEVEL% NEQ 0 (
    echo    ERROR: Playwright browser install failed
    pause
    exit /b 1
)
echo    OK - Chrome installed

echo.
echo ===============================================
echo   SETUP COMPLETE!
echo.
echo   To start checking for appointments:
echo     Double-click "Start Checker.bat" in scripts\
echo.
echo   To change settings:
echo     Double-click "Open Settings.bat" in scripts\
echo ===============================================
echo.
pause
