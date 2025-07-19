@echo off
echo ===========================================
echo Like-I-Said Dashboard Launcher
echo ===========================================
echo.

rem Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies - this may take a few minutes...
    call npm install
    if errorlevel 1 (
        echo.
        echo ERROR: Failed to install dependencies!
        echo Please make sure Node.js is installed from https://nodejs.org/
        pause
        exit /b 1
    )
    echo.
)

rem Start both servers in development mode
echo Starting servers...
echo - API Server: http://localhost:3001
echo - Dashboard: http://localhost:5173
echo.
echo The dashboard will open automatically in your browser.
echo Press Ctrl+C to stop the servers.
echo.

call npm run dev:full

pause