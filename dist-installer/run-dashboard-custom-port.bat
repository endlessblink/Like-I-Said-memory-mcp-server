@echo off
:: Like-I-Said Dashboard Launcher - Custom Port
:: Allows you to specify any port

echo ========================================
echo Like-I-Said Dashboard - Custom Port
echo ========================================
echo.

:: Check if executable exists
if not exist "%~dp0like-i-said-dashboard-win.exe" (
    echo ERROR: like-i-said-dashboard-win.exe not found!
    pause
    exit /b 1
)

:: Ask for port number
set /p PORT="Enter port number (default 3001): "
if "%PORT%"=="" set PORT=3001

echo.
echo Starting dashboard on port %PORT%...
echo Dashboard will open at: http://localhost:%PORT%
echo.

:: Run the dashboard with custom port
"%~dp0like-i-said-dashboard-win.exe"

:: If it exits immediately, pause to see any errors
if %errorlevel% neq 0 (
    echo.
    echo Dashboard exited with an error.
    pause
)