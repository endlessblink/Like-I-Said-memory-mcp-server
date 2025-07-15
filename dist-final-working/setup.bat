@echo off
echo ==================================
echo Like-I-Said Dashboard Setup
echo Version 2.4.8
echo ==================================
echo.
echo This will install the dashboard dependencies.
echo Make sure you have Node.js installed.
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH!
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo Then run this setup again.
    echo.
    pause
    exit /b 1
)

echo Found Node.js: 
node --version
echo.
pause

echo.
echo Installing dependencies...
echo This may take a few minutes...
echo.

call npm install --production

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to install dependencies
    echo Please check your internet connection and try again
    echo.
    pause
    exit /b 1
)

echo.
echo ==================================
echo Setup Complete!
echo ==================================
echo.
echo You can now run: dashboard.exe
echo.
echo First run will ask you to configure:
echo - Memory directory path
echo - Task directory path
echo.
pause