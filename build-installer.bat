@echo off
:: Build Like-I-Said Dashboard Installer

echo ========================================
echo Building Like-I-Said Dashboard Installer
echo ========================================
echo.

:: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed
    pause
    exit /b 1
)

:: Install dependencies if needed
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
)

:: Build the dashboard UI
echo Building dashboard UI...
call npm run build

:: Run the build script
echo Creating standalone executables...
node scripts/build-dashboard-installer.js

echo.
echo ========================================
echo Build complete!
echo.
echo Next steps:
echo 1. Test the executable in dist-installer/
echo 2. Run Inno Setup with installer/windows-installer.iss
echo 3. Distribute the installer!
echo ========================================
echo.
pause