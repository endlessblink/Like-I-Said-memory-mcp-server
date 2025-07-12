@echo off
cd /d "%~dp0\..\.."
echo Starting Like-I-Said Dashboard...
echo.

REM Clean up ports first
echo Cleaning up existing processes on ports 3001 and 5173...
call "%~dp0cleanup-ports.bat"
echo.

echo This will start:
echo - API Server on http://localhost:3001
echo - React Dashboard on http://localhost:5173
echo.
npm run dev:full