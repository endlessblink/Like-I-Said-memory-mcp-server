@echo off
:: One-click installer that handles everything

echo ============================================
echo    Like-I-Said Dashboard Quick Start
echo ============================================
echo.

:: Try PowerShell script first (better experience)
where powershell >nul 2>&1
if %errorlevel% equ 0 (
    echo Starting smart installer...
    powershell -ExecutionPolicy Bypass -File "%~dp0install-helper.ps1"
) else (
    :: Fallback to basic batch installer
    call "%~dp0INSTALL.bat"
)