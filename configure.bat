@echo off
REM Like-I-Said Dashboard Configuration Utility for Windows
REM This batch file provides easy access to configuration options

setlocal enabledelayedexpansion

echo.
echo ╔══════════════════════════════════════════╗
echo ║    Like-I-Said Dashboard Configuration   ║
echo ║               Quick Access               ║
echo ╚══════════════════════════════════════════╝
echo.

REM Check if Node.js is available
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ✗ Node.js not found in PATH
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Check if configuration files exist
if not exist "configure-dashboard.cjs" (
    echo ✗ Configuration utility not found
    echo Please ensure all files are in the current directory
    echo.
    pause
    exit /b 1
)

REM Show menu if no arguments provided
if "%1"=="" goto :menu

REM Handle command line arguments
if /i "%1"=="config" goto :configure
if /i "%1"=="setup" goto :setup
if /i "%1"=="show" goto :show
if /i "%1"=="reset" goto :reset
if /i "%1"=="validate" goto :validate
if /i "%1"=="start" goto :start
if /i "%1"=="help" goto :help

echo Unknown command: %1
goto :help

:menu
echo What would you like to do?
echo.
echo 1. Configure dashboard settings
echo 2. Quick setup with defaults
echo 3. Show current configuration
echo 4. Validate configuration
echo 5. Reset to defaults
echo 6. Start dashboard
echo 7. Help
echo 8. Exit
echo.
set /p choice="Enter your choice (1-8): "

if "%choice%"=="1" goto :configure
if "%choice%"=="2" goto :setup
if "%choice%"=="3" goto :show
if "%choice%"=="4" goto :validate
if "%choice%"=="5" goto :reset
if "%choice%"=="6" goto :start
if "%choice%"=="7" goto :help
if "%choice%"=="8" goto :exit
echo Invalid choice. Please try again.
echo.
goto :menu

:configure
echo.
echo Running configuration wizard...
node configure-dashboard.cjs configure
goto :end

:setup
echo.
echo Running quick setup...
node configure-dashboard.cjs setup
goto :end

:show
echo.
echo Displaying current configuration...
node configure-dashboard.cjs show
echo.
pause
goto :menu

:validate
echo.
echo Validating configuration...
node configure-dashboard.cjs validate
echo.
pause
goto :menu

:reset
echo.
echo Resetting configuration to defaults...
node configure-dashboard.cjs reset
echo.
pause
goto :menu

:start
echo.
echo Starting dashboard...
if exist "dashboard-launcher-configurable.cjs" (
    node dashboard-launcher-configurable.cjs
) else if exist "dashboard-launcher-windows.cjs" (
    node dashboard-launcher-windows.cjs
) else (
    echo ✗ Dashboard launcher not found
    echo Please ensure dashboard-launcher-configurable.cjs is in the current directory
)
goto :end

:help
echo.
echo Like-I-Said Dashboard Configuration Utility
echo.
echo Usage:
echo   configure.bat [command]
echo.
echo Commands:
echo   config      Run configuration wizard
echo   setup       Quick setup with defaults
echo   show        Display current configuration
echo   validate    Validate configuration
echo   reset       Reset to defaults
echo   start       Start the dashboard
echo   help        Show this help
echo.
echo Examples:
echo   configure.bat config
echo   configure.bat setup
echo   configure.bat start
echo.
pause
goto :menu

:exit
echo.
echo Goodbye!
exit /b 0

:end
echo.
echo Operation completed.
echo.
set /p continue="Press Enter to return to menu or type 'exit' to quit: "
if /i "%continue%"=="exit" goto :exit
goto :menu