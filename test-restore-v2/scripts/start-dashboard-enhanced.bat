@echo off
setlocal enabledelayedexpansion
title Like-I-Said Dashboard
color 0A

echo.
echo ========================================
echo   Like-I-Said Memory Dashboard v2
echo ========================================
echo.

REM Check if npm is available
where npm >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo ERROR: npm is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Start the dashboard in background, redirecting output to a log file
echo Starting dashboard server...
echo This may take a moment on first run...
echo.

if exist "dashboard.log" del "dashboard.log"
start /B cmd /c "npm run dashboard >dashboard.log 2>&1"

REM Wait for .dashboard-port file with timeout
set COUNTER=0
:WAIT_LOOP
if exist ".dashboard-port" goto PORT_FOUND
set /a COUNTER+=1
if %COUNTER% geq 30 (
    color 0C
    echo.
    echo ERROR: Dashboard failed to start within 30 seconds
    echo Check dashboard.log for details
    pause
    exit /b 1
)
echo | set /p="."
timeout /t 1 /nobreak >nul
goto WAIT_LOOP

:PORT_FOUND
REM Read the port
set /p PORT=<.dashboard-port

REM Clear and show success
cls
color 0A
echo.
echo ============================================================
echo.
echo    ✅ LIKE-I-SAID DASHBOARD IS READY!
echo.
echo    📌 Click to open: http://localhost:%PORT%
echo.
echo    Alternative URLs:
echo    - http://127.0.0.1:%PORT%
echo    - http://[::1]:%PORT% (IPv6)
echo.
echo ============================================================
echo.
echo 🚀 Opening dashboard in your default browser...

REM Open browser
start http://localhost:%PORT%

echo.
echo ✨ Dashboard Features:
echo    - Memory Management & Search
echo    - Task Tracking & Organization  
echo    - Real-time Updates
echo    - AI Enhancement Tools
echo.
echo 📝 Logs: dashboard.log
echo.
echo Press Ctrl+C to stop the server
echo ============================================================

REM Keep window open and show server output
type dashboard.log 2>nul
tail -f dashboard.log 2>nul || (
    REM If tail is not available, just keep the window open
    pause >nul
)