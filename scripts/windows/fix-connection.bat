@echo off
REM ================================================================
REM Like-I-Said MCP Server - Windows Connection Fix Helper
REM Safe script to fix common Windows MCP connection issues
REM ================================================================

echo.
echo ========================================================
echo   Like-I-Said MCP Server - Windows Connection Fixer
echo ========================================================
echo.

REM Check if running as admin (optional features)
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [Running with Administrator privileges]
    set IS_ADMIN=true
) else (
    echo [Running with standard privileges]
    set IS_ADMIN=false
)

echo.
echo Step 1: Checking Node.js installation...
echo ----------------------------------------
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found in PATH!
    echo.
    echo Please install Node.js v16+ from: https://nodejs.org
    echo Then run this script again.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js found: %NODE_VERSION%

REM Check Node version is 16+
for /f "tokens=2 delims=v." %%i in ('node --version') do set NODE_MAJOR=%%i
if %NODE_MAJOR% LSS 16 (
    echo [WARNING] Node.js version is below v16. Please upgrade.
)

echo.
echo Step 2: Setting Environment Variables...
echo ----------------------------------------

REM Check current values
if "%MCP_MODE%"=="" (
    echo [FIXING] MCP_MODE not set - setting to true
    set MCP_MODE=true
    
    REM Try to set permanently (user level)
    setx MCP_MODE true >nul 2>&1
    if errorlevel 1 (
        echo [WARNING] Could not set MCP_MODE permanently. Set manually with: setx MCP_MODE true
    ) else (
        echo [OK] MCP_MODE set permanently
    )
) else (
    echo [OK] MCP_MODE already set to: %MCP_MODE%
)

if "%MCP_QUIET%"=="" (
    echo [FIXING] MCP_QUIET not set - setting to true
    set MCP_QUIET=true
    
    setx MCP_QUIET true >nul 2>&1
    if errorlevel 1 (
        echo [WARNING] Could not set MCP_QUIET permanently. Set manually with: setx MCP_QUIET true
    ) else (
        echo [OK] MCP_QUIET set permanently
    )
) else (
    echo [OK] MCP_QUIET already set to: %MCP_QUIET%
)

echo.
echo Step 3: Checking Required Directories...
echo ----------------------------------------

if not exist memories (
    echo [FIXING] Creating memories directory...
    mkdir memories
    echo [OK] memories directory created
) else (
    echo [OK] memories directory exists
)

if not exist tasks (
    echo [FIXING] Creating tasks directory...
    mkdir tasks
    echo [OK] tasks directory created
) else (
    echo [OK] tasks directory exists
)

echo.
echo Step 4: Verifying File Permissions...
echo ----------------------------------------

REM Check if we can write to directories
echo test > memories\test.tmp 2>nul
if errorlevel 1 (
    echo [WARNING] Cannot write to memories directory
    if "%IS_ADMIN%"=="true" (
        echo [FIXING] Attempting to fix permissions...
        icacls memories /grant %USERNAME%:F >nul 2>&1
        echo [OK] Permissions updated for memories
    ) else (
        echo [INFO] Run as administrator to fix permissions automatically
    )
) else (
    del memories\test.tmp >nul 2>&1
    echo [OK] memories directory is writable
)

echo test > tasks\test.tmp 2>nul
if errorlevel 1 (
    echo [WARNING] Cannot write to tasks directory
    if "%IS_ADMIN%"=="true" (
        echo [FIXING] Attempting to fix permissions...
        icacls tasks /grant %USERNAME%:F >nul 2>&1
        echo [OK] Permissions updated for tasks
    ) else (
        echo [INFO] Run as administrator to fix permissions automatically
    )
) else (
    del tasks\test.tmp >nul 2>&1
    echo [OK] tasks directory is writable
)

echo.
echo Step 5: Creating Startup Scripts...
echo ----------------------------------------

REM Create a Windows-friendly startup script
echo @echo off > start-mcp-windows.bat
echo REM Auto-generated MCP startup script for Windows >> start-mcp-windows.bat
echo set MCP_MODE=true >> start-mcp-windows.bat
echo set MCP_QUIET=true >> start-mcp-windows.bat
echo echo Starting Like-I-Said MCP Server... >> start-mcp-windows.bat
echo node "%~dp0mcp-server-wrapper.js" >> start-mcp-windows.bat

echo [OK] Created start-mcp-windows.bat

REM Create a PowerShell version too
echo # Auto-generated MCP startup script for PowerShell > start-mcp-windows.ps1
echo $env:MCP_MODE = "true" >> start-mcp-windows.ps1
echo $env:MCP_QUIET = "true" >> start-mcp-windows.ps1
echo Write-Host "Starting Like-I-Said MCP Server..." >> start-mcp-windows.ps1
echo node "$PSScriptRoot\mcp-server-wrapper.js" >> start-mcp-windows.ps1

echo [OK] Created start-mcp-windows.ps1

echo.
echo Step 6: Testing MCP Server...
echo ----------------------------------------

echo [TEST] Attempting to start MCP server...
REM Create a test runner
echo @echo off > test-server.bat
echo set MCP_MODE=true >> test-server.bat
echo set MCP_QUIET=true >> test-server.bat
echo timeout /t 1 /nobreak ^>nul >> test-server.bat
echo echo {"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"0.1.0","capabilities":{}},"id":1} ^| node server-markdown.js >> test-server.bat

call test-server.bat >test-output.txt 2>&1
timeout /t 2 /nobreak >nul

findstr /C:"jsonrpc" test-output.txt >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Server may not be responding correctly
    echo Check test-output.txt for details
) else (
    echo [OK] Server responds to MCP protocol
)

del test-server.bat >nul 2>&1
del test-output.txt >nul 2>&1

echo.
echo ========================================================
echo                    FIXES APPLIED!
echo ========================================================
echo.
echo Next Steps:
echo -----------
echo.
echo 1. Update your Claude configuration to use:
echo    Command: %CD%\start-mcp-windows.bat
echo.
echo 2. Or for PowerShell users:
echo    Command: powershell.exe -File "%CD%\start-mcp-windows.ps1"
echo.
echo 3. Test the connection:
echo    - Close Claude completely
echo    - Restart Claude
echo    - Check if Like-I-Said tools appear
echo.
echo 4. If issues persist, run diagnostics:
echo    node scripts\windows\diagnose-connection.js
echo.

REM Create a configuration helper file
echo Creating configuration helper...
echo ========================================= > CLAUDE_CONFIG_HELP.txt
echo Claude Configuration for Windows >> CLAUDE_CONFIG_HELP.txt
echo ========================================= >> CLAUDE_CONFIG_HELP.txt
echo. >> CLAUDE_CONFIG_HELP.txt
echo For Claude Desktop, add to your config: >> CLAUDE_CONFIG_HELP.txt
echo. >> CLAUDE_CONFIG_HELP.txt
echo { >> CLAUDE_CONFIG_HELP.txt
echo   "mcpServers": { >> CLAUDE_CONFIG_HELP.txt
echo     "like-i-said-memory-v2": { >> CLAUDE_CONFIG_HELP.txt
echo       "command": "%CD%\\start-mcp-windows.bat" >> CLAUDE_CONFIG_HELP.txt
echo     } >> CLAUDE_CONFIG_HELP.txt
echo   } >> CLAUDE_CONFIG_HELP.txt
echo } >> CLAUDE_CONFIG_HELP.txt
echo. >> CLAUDE_CONFIG_HELP.txt
echo For Claude Code CLI: >> CLAUDE_CONFIG_HELP.txt
echo claude mcp add like-i-said-memory-v2 -- "%CD%\\start-mcp-windows.bat" >> CLAUDE_CONFIG_HELP.txt

echo [OK] Configuration helper saved to CLAUDE_CONFIG_HELP.txt
echo.
echo Press any key to exit...
pause >nul