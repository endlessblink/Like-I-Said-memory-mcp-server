@echo off
REM Enable UTF-8 for emoji support
chcp 65001 >nul 2>&1

echo.
echo Starting Like-I-Said Dashboard...
echo.

REM Start browser opener in background
start /B powershell -WindowStyle Hidden -Command "Start-Sleep -Seconds 8; if (Test-Path '.dashboard-port') { $port = Get-Content '.dashboard-port' -Raw; $port = $port.Trim(); Start-Process \"http://localhost:$port\" }"

REM Run the dashboard normally and show all its output
npm run dashboard

REM This only runs if dashboard exits
echo.
echo Dashboard stopped.
pause