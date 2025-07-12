@echo off
setlocal enabledelayedexpansion

REM Sync Windows Like-I-Said MCP Server to WSL
REM This script syncs changes from Windows to WSL environment

echo === Like-I-Said MCP Server v2 - Windows to WSL Sync ===
echo.

REM Configuration
set WINDOWS_DIR=D:\APPSNospaces\like-i-said-mcp-server-v2
set WSL_DIR=/home/endlessblink/projects/like-i-said-mcp-server-v2

REM Check if in correct directory
cd /d %WINDOWS_DIR% 2>nul
if errorlevel 1 (
    echo Error: Cannot find Windows directory at %WINDOWS_DIR%
    pause
    exit /b 1
)

echo [1/4] Checking git status in Windows...
git status --porcelain > temp_status.txt
set /p STATUS=<temp_status.txt
del temp_status.txt

if not "%STATUS%"=="" (
    echo Found uncommitted changes in Windows:
    git status --short
    echo.
    echo Auto-committing changes...
    git add -A
    git commit -m "Auto-sync: Windows changes %date% %time%" -m "Auto-synced before WSL sync"
    echo Changes committed
) else (
    echo No uncommitted changes in Windows
)

echo.
echo [2/4] Syncing to WSL...
wsl -e bash -c "cd %WSL_DIR% && bash sync-from-windows.sh"

echo.
echo [3/4] Verifying sync...
wsl -e bash -c "cd %WSL_DIR% && git status --short"

echo.
echo [4/4] Sync Summary
echo ==================
echo Windows: %WINDOWS_DIR%
echo WSL: %WSL_DIR%
echo Last Sync: %date% %time%
echo ==================

echo.
echo === Sync completed successfully! ===
echo WSL environment is now up-to-date with Windows
echo.
pause