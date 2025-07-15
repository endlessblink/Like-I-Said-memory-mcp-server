@echo off
:: Like-I-Said Dashboard Launcher - Port 3002
:: Use this when port 3001 is already in use

echo Starting Like-I-Said Dashboard on port 3002...
echo.

:: Set custom port
set PORT=3002

:: Check if executable exists
if not exist "%~dp0like-i-said-dashboard-win.exe" (
    echo ERROR: like-i-said-dashboard-win.exe not found!
    echo Please ensure this batch file is in the same folder as the executable.
    pause
    exit /b 1
)

echo Dashboard will open at: http://localhost:3002
echo.

:: Run the dashboard with custom port
"%~dp0like-i-said-dashboard-win.exe"

:: If it exits immediately, pause to see any errors
if %errorlevel% neq 0 (
    echo.
    echo Dashboard exited with an error.
    pause
)