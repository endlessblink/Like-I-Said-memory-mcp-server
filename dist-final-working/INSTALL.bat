@echo off
setlocal enabledelayedexpansion

echo ============================================
echo     Like-I-Said Dashboard Auto-Installer
echo             Version 2.4.8
echo ============================================
echo.

:: Check if running as admin
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo This installer needs to run as Administrator to install Node.js
    echo.
    echo Right-click this file and select "Run as administrator"
    echo.
    pause
    exit /b 1
)

:: Check if Node.js is installed
echo Checking for Node.js...
where node >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Node.js is already installed
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo   Version: !NODE_VERSION!
    
    :: Check if version is adequate (v16 or higher)
    for /f "tokens=2 delims=v." %%a in ("!NODE_VERSION!") do set MAJOR_VERSION=%%a
    if !MAJOR_VERSION! geq 16 (
        echo   ✓ Version is compatible
        goto :npm_install
    ) else (
        echo   ⚠ Version is too old (need v16 or higher)
        goto :install_node
    )
) else (
    echo ✗ Node.js is not installed
    goto :install_node
)

:install_node
echo.
echo ==================================
echo Installing Node.js v20 LTS...
echo ==================================
echo.

:: Determine architecture
if "%PROCESSOR_ARCHITECTURE%"=="AMD64" (
    set NODE_URL=https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi
    set NODE_MSI=node-v20.11.0-x64.msi
) else (
    set NODE_URL=https://nodejs.org/dist/v20.11.0/node-v20.11.0-x86.msi
    set NODE_MSI=node-v20.11.0-x86.msi
)

echo Downloading Node.js...
echo This may take a few minutes...
echo.

:: Download using PowerShell
powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%NODE_URL%' -OutFile '%NODE_MSI%' -UseBasicParsing}"

if not exist "%NODE_MSI%" (
    echo.
    echo ❌ Failed to download Node.js
    echo.
    echo Please download manually from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo.
echo ✓ Download complete!
echo.
echo Installing Node.js (please wait)...
msiexec /i "%NODE_MSI%" /qn /norestart

:: Wait for installation to complete
timeout /t 10 /nobreak >nul

:: Clean up installer
del "%NODE_MSI%" >nul 2>&1

echo ✓ Node.js installed successfully!
echo.

:: Refresh PATH
call refreshenv >nul 2>&1
set "PATH=%PATH%;%ProgramFiles%\nodejs;%APPDATA%\npm"

:npm_install
echo ==================================
echo Installing Dashboard Dependencies
echo ==================================
echo.

:: Check if node_modules already exists
if exist "node_modules" (
    echo Dependencies already installed, checking for updates...
    call npm update --production
) else (
    echo Installing dependencies (this may take a few minutes)...
    call npm install --production
)

if %errorlevel% neq 0 (
    echo.
    echo ❌ Failed to install dependencies
    echo.
    echo Possible issues:
    echo - No internet connection
    echo - Corporate firewall blocking npm
    echo - Corrupted package.json
    echo.
    pause
    exit /b 1
)

echo.
echo ============================================
echo     ✅ Installation Complete!
echo ============================================
echo.
echo Starting Like-I-Said Dashboard...
echo.
timeout /t 2 /nobreak >nul

:: Start the dashboard
start "" dashboard.exe

echo Dashboard is starting in your browser...
echo.
echo You can close this window.
echo To run again, just double-click: dashboard.exe
echo.
timeout /t 5 /nobreak >nul
exit