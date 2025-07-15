@echo off
:: Like-I-Said Dashboard Launcher for Windows
:: Place this in the same folder as like-i-said-dashboard-win.exe

echo Starting Like-I-Said Dashboard...
echo.

:: Check if executable exists
if not exist "%~dp0like-i-said-dashboard-win.exe" (
    echo ERROR: like-i-said-dashboard-win.exe not found!
    echo Please ensure this batch file is in the same folder as the executable.
    pause
    exit /b 1
)

:: Run the dashboard
"%~dp0like-i-said-dashboard-win.exe"

:: If it exits immediately, pause to see any errors
if %errorlevel% neq 0 (
    echo.
    echo Dashboard exited with an error.
    pause
)