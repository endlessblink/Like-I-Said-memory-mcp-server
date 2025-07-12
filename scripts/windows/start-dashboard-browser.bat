@echo off
cd /d "%~dp0\..\.."
echo Starting Like-I-Said Dashboard...
echo.
echo This will start:
echo - API Server on http://localhost:3001
echo - React Dashboard on http://localhost:5173
echo.
echo The dashboard will open in your browser after startup...
echo.
start /B npm run dev:full
timeout /t 5 /nobreak > nul
start http://localhost:5173