@echo off
chcp 65001 >nul 2>&1

:: Navigate to project root (parent of scripts\)
cd /d "%~dp0\.."

echo.
echo ===============================================
echo   Opening Settings File
echo ===============================================
echo.
echo The settings file will open in Notepad.
echo Edit the values, save (Ctrl+S), and close.
echo.

notepad .env

pause
