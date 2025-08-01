@echo off
echo Starting Like-I-Said Dashboard...
echo.

:: Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo Failed to install dependencies!
        pause
        exit /b 1
    )
    echo.
)

:: Skip build - use development mode instead
echo Starting in development mode...

:: Start both servers
echo Starting API server on port 3001...
echo Starting React dashboard on port 5173...
echo.
echo Once started, open your browser to: http://localhost:5173
echo.
call npm run dev:full

pause