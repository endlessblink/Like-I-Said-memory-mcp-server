@echo off
echo.
echo ==================================
echo Like-I-Said MCP Server Test Script
echo ==================================
echo.

echo Checking Node.js installation...
node --version
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    pause
    exit /b 1
)

echo.
echo Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Starting development servers...
echo API Server will run on port 3002
echo Dashboard will run on port 5173
echo.
echo Press Ctrl+C to stop the servers
echo.
call npm run dev:full

pause