@echo off
setlocal enabledelayedexpansion
cls

echo ============================================
echo   Like-I-Said Dashboard Startup Script
echo   Version: 2.6.17
echo ============================================
echo.

:: Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo [INFO] Node.js version:
node --version
echo.

:: Set up environment variables
set "MEMORY_PATH=%USERPROFILE%\like-i-said-mcp\memories"
set "TASK_PATH=%USERPROFILE%\like-i-said-mcp\tasks"

:: Create directories if they don't exist
echo [INFO] Creating data directories...
if not exist "%MEMORY_PATH%" (
    mkdir "%MEMORY_PATH%" 2>nul
    if !errorlevel! equ 0 (
        echo [OK] Created memories directory: %MEMORY_PATH%
    ) else (
        echo [WARNING] Could not create memories directory
    )
)

if not exist "%TASK_PATH%" (
    mkdir "%TASK_PATH%" 2>nul
    if !errorlevel! equ 0 (
        echo [OK] Created tasks directory: %TASK_PATH%
    ) else (
        echo [WARNING] Could not create tasks directory
    )
)

echo.
echo [INFO] Configuration:
echo   - Memory Path: %MEMORY_PATH%
echo   - Task Path: %TASK_PATH%
echo.

:: Find available port for API server
echo [INFO] Finding available port for API server...
set "PORT=3008"
set "PORTS_TO_TRY=3008 3007 3006 3005 3004 3002 3001"

for %%p in (%PORTS_TO_TRY%) do (
    netstat -ano | findstr :%%p >nul 2>&1
    if !errorlevel! neq 0 (
        set "PORT=%%p"
        echo [OK] Using port %%p for API server
        goto :portfound
    ) else (
        echo [INFO] Port %%p is already in use
    )
)

:portfound
echo.

:: Check if npm packages are installed
if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    call npm install
    if !errorlevel! neq 0 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
)

:: Kill any existing processes on our ports
echo [INFO] Cleaning up any existing processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%PORT%') do (
    taskkill /PID %%a /F >nul 2>&1
)

:: Start the dashboard
echo.
echo ============================================
echo   Starting Dashboard Services
echo ============================================
echo.

:: Create a temporary script to run both servers
echo @echo off > "%TEMP%\run-dashboard.bat"
echo title Like-I-Said Dashboard >> "%TEMP%\run-dashboard.bat"
echo cd /d "%~dp0" >> "%TEMP%\run-dashboard.bat"
echo set PORT=%PORT% >> "%TEMP%\run-dashboard.bat"
echo set MEMORY_PATH=%MEMORY_PATH% >> "%TEMP%\run-dashboard.bat"
echo set TASK_PATH=%TASK_PATH% >> "%TEMP%\run-dashboard.bat"
echo echo Starting API server on port %PORT%... >> "%TEMP%\run-dashboard.bat"
echo npm run dev:full >> "%TEMP%\run-dashboard.bat"

:: Start the dashboard in a new window
start "Like-I-Said Dashboard" "%TEMP%\run-dashboard.bat"

:: Wait a moment for servers to start
timeout /t 5 /nobreak >nul

echo.
echo ============================================
echo   Dashboard Starting...
echo ============================================
echo.
echo [INFO] API Server: http://localhost:%PORT%
echo [INFO] Dashboard UI: http://localhost:5173
echo [INFO] Alternative UI: http://localhost:5183
echo.
echo [INFO] Testing API connection...

:: Test the API
timeout /t 3 /nobreak >nul
curl -s http://localhost:%PORT%/api/status >nul 2>&1
if !errorlevel! equ 0 (
    echo [OK] API server is responding
) else (
    echo [WARNING] API server not responding yet, it may still be starting
)

echo.
echo ============================================
echo   Dashboard is starting up!
echo ============================================
echo.
echo The dashboard should open automatically in your browser.
echo If not, navigate to: http://localhost:5173
echo.
echo Press Ctrl+C in the dashboard window to stop the servers.
echo.

:: Try to open the dashboard in the default browser
timeout /t 3 /nobreak >nul
start "" "http://localhost:5173"

echo This window can be closed.
pause