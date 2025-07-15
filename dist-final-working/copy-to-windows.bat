@echo off
echo ==================================
echo Copy Dashboard to Windows
echo ==================================
echo.
echo This script will copy the dashboard files to your Windows Desktop
echo.

set "DESKTOP=%USERPROFILE%\Desktop\LikeISaidDashboard"

echo Creating directory: %DESKTOP%
mkdir "%DESKTOP%" 2>nul

echo.
echo Copying files...
echo Please copy these files manually to %DESKTOP%:
echo.
echo 1. dashboard.exe
echo 2. dashboard-server-bridge.js  
echo 3. test-dashboard.bat
echo 4. README-FINAL-WORKING.md
echo.
echo After copying, navigate to %DESKTOP% and run dashboard.exe
echo.
pause