@echo off
chcp 65001 >nul 2>&1
title Polish Consulate - Single Check

:: Navigate to project root (parent of scripts\)
cd /d "%~dp0\.."

echo.
echo ===============================================
echo   Polish Consulate - Single Check
echo ===============================================
echo.

if not exist "node_modules" (
    echo ERROR: Dependencies not installed!
    echo Please double-click "Setup.bat" in the scripts\ folder first.
    echo.
    pause
    exit /b 1
)

call npm run check:once

echo.
pause
