@echo off
echo Starting Windows Syncthing...
echo.

REM Check if Syncthing is already running
tasklist /FI "IMAGENAME eq syncthing.exe" 2>NUL | find /I /N "syncthing.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo Syncthing is already running!
    echo Opening web interface...
    start http://localhost:8385
    timeout /t 3
    exit /b
)

REM Start Syncthing
echo Starting Syncthing service...
cd /d "D:\APPSNospaces\syncthing"

if not exist "syncthing.exe" (
    echo ERROR: syncthing.exe not found!
    echo Please run the installer first.
    pause
    exit /b 1
)

start "" syncthing.exe --no-browser

REM Wait for startup
echo Waiting for Syncthing to start...
timeout /t 5 > nul

REM Open web interface
echo Opening web interface...
start http://localhost:8385

echo.
echo ===================================
echo Syncthing is now running!
echo Web UI: http://localhost:8385
echo.
echo To stop: Close this window or
echo          kill syncthing.exe in Task Manager
echo ===================================
echo.
pause