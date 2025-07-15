@echo off
cd /d "D:\APPSNospaces\like-i-said-mcp-server-v2\dist-final-working"

echo ==================================
echo Like-I-Said Dashboard Launcher
echo ==================================
echo.
echo Working directory: %CD%
echo.

if not exist "dashboard.exe" (
    echo ERROR: dashboard.exe not found!
    echo Expected location: %CD%\dashboard.exe
    echo.
    echo Files in this directory:
    dir /b
    echo.
    pause
    exit /b 1
)

if not exist "dashboard-server-bridge.js" (
    echo ERROR: dashboard-server-bridge.js not found!
    echo This file is required for the dashboard to work.
    echo.
    pause
    exit /b 1
)

echo All required files found!
echo.
echo Starting dashboard...
echo.

dashboard.exe

echo.
echo Dashboard closed with exit code: %errorlevel%
echo.
pause