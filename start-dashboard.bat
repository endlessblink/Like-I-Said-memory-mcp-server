@echo off
REM Enable UTF-8 for better character support
chcp 65001 >nul 2>&1

echo.
echo Starting Like-I-Said Dashboard...
echo.

REM Start a background process to open browser after dashboard starts
start /min cmd /c "timeout /t 10 /nobreak >nul & if exist .dashboard-port (for /f %%p in (.dashboard-port) do start http://localhost:%%p)"

REM Run the dashboard normally - it will show its own nice output
npm run dashboard

REM This only runs if dashboard exits
echo.
echo Dashboard stopped.
pause