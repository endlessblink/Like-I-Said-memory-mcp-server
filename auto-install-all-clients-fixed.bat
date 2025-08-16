@echo off
setlocal enabledelayedexpansion

echo =====================================
echo  Like-I-Said MCP v2 Auto Installer
echo =====================================
echo.

:: Check if running as Administrator (recommended but not required)
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [✓] Running as Administrator
    set "IS_ADMIN=true"
) else (
    echo [!] Not running as Administrator (recommended for system-wide install)
    set "IS_ADMIN=false"
)

:: Detect Node.js installation
echo [0/7] Checking prerequisites...
for /f "tokens=*" %%i in ('where node 2^>nul') do set "NODE_EXE=%%i"
if "%NODE_EXE%"=="" (
    echo [✗] Node.js not found in PATH
    echo [!] Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

:: Get Node.js directory
for %%i in ("%NODE_EXE%") do set "NODE_DIR=%%~dpi"
set "NODE_DIR=%NODE_DIR:~0,-1%"
echo [✓] Node.js found at: %NODE_DIR%

:: Set installation path
set "INSTALL_PATH=D:\APPSNospaces\Like-I-said-mcp-server-v2"
set "SOURCE_PATH=%~dp0"

:: Check for existing installation
if exist "%INSTALL_PATH%\server.js" (
    echo [!] Installation already exists at %INSTALL_PATH%
    set /p "OVERWRITE=Overwrite existing installation? (y/n): "
    if /i "!OVERWRITE!" neq "y" (
        echo Installation cancelled by user
        pause
        exit /b 0
    )
)

echo [1/7] Setting up installation directory...
if not exist "D:\APPSNospaces" mkdir "D:\APPSNospaces" 2>nul
if not exist "%INSTALL_PATH%" mkdir "%INSTALL_PATH%" 2>nul
if not exist "%INSTALL_PATH%" (
    echo [✗] Failed to create installation directory
    echo [!] Check permissions or try running as Administrator
    pause
    exit /b 1
)

echo [2/7] Copying files...
xcopy "%SOURCE_PATH%*" "%INSTALL_PATH%\" /E /H /C /I /Y >nul 2>&1
if %errorLevel% neq 0 (
    echo [✗] Failed to copy files
    goto :cleanup_on_error
)

echo [3/7] Installing Node.js dependencies...
cd /d "%INSTALL_PATH%"
call npm install >nul 2>&1
if %errorLevel% neq 0 (
    echo [✗] Failed to install dependencies
    echo [!] Check internet connection and Node.js installation
    goto :cleanup_on_error
)

echo [4/7] Testing server functionality...
timeout /t 2 /nobreak >nul
echo {"jsonrpc": "2.0", "id": 1, "method": "tools/list"} | node server.js >test_output.tmp 2>&1
findstr /c:"add_memory" test_output.tmp >nul
if %errorLevel% == 0 (
    echo [✓] Server test passed - 6 tools detected
    del test_output.tmp
) else (
    echo [✗] Server test failed
    echo Server output:
    type test_output.tmp
    del test_output.tmp
    goto :cleanup_on_error
)

echo [5/7] Configuring MCP clients...

:: Configure Cursor
echo.
echo Configuring Cursor MCP...
set "CURSOR_CONFIG_DIR=%APPDATA%\Cursor\User\globalStorage\cursor.mcp"
if not exist "%CURSOR_CONFIG_DIR%" mkdir "%CURSOR_CONFIG_DIR%" 2>nul

:: Use forward slashes for JSON (Windows handles both)
set "JSON_PATH=%INSTALL_PATH:\=/%"
set "JSON_NODE_PATH=%NODE_DIR:\=/%"

(
echo {
echo   "mcpServers": {
echo     "like-i-said-v2": {
echo       "command": "cmd",
echo       "args": [
echo         "/c",
echo         "node",
echo         "%JSON_PATH%/server.js"
echo       ],
echo       "cwd": "%JSON_PATH%",
echo       "env": {
echo         "NODE_PATH": "%JSON_NODE_PATH%"
echo       }
echo     }
echo   }
echo }
) > "%CURSOR_CONFIG_DIR%\mcp.json"

:: Validate Cursor JSON
node -e "JSON.parse(require('fs').readFileSync('%CURSOR_CONFIG_DIR%\\mcp.json', 'utf8'))" >nul 2>&1
if %errorLevel% == 0 (
    echo [✓] Cursor configuration created and validated
) else (
    echo [✗] Cursor configuration JSON is invalid
    goto :cleanup_on_error
)

:: Configure Claude Desktop
echo.
echo Configuring Claude Desktop...
set "CLAUDE_CONFIG_DIR=%APPDATA%\Claude"
if not exist "%CLAUDE_CONFIG_DIR%" mkdir "%CLAUDE_CONFIG_DIR%" 2>nul

(
echo {
echo   "mcpServers": {
echo     "like-i-said-memory-v2": {
echo       "command": "node",
echo       "args": ["server.js"],
echo       "cwd": "%JSON_PATH%"
echo     }
echo   }
echo }
) > "%CLAUDE_CONFIG_DIR%\claude_desktop_config.json"

:: Validate Claude JSON
node -e "JSON.parse(require('fs').readFileSync('%CLAUDE_CONFIG_DIR%\\claude_desktop_config.json', 'utf8'))" >nul 2>&1
if %errorLevel% == 0 (
    echo [✓] Claude Desktop configuration created and validated
) else (
    echo [✗] Claude Desktop configuration JSON is invalid
    goto :cleanup_on_error
)

echo [6/7] Final verification...
echo {"jsonrpc": "2.0", "id": 1, "method": "tools/list"} | node server.js >final_test.tmp 2>&1
findstr /c:"test_tool" final_test.tmp >nul
if %errorLevel% == 0 (
    echo [✓] Final server verification passed
    del final_test.tmp
) else (
    echo [✗] Final server verification failed
    type final_test.tmp
    del final_test.tmp
    goto :cleanup_on_error
)

echo [7/7] Installation complete!
echo.
echo =====================================
echo        Installation Complete!
echo =====================================
echo.
echo Server installed to: %INSTALL_PATH%
echo Node.js detected at: %NODE_DIR%
echo.
echo Configured clients:
echo [✓] Cursor MCP        : %CURSOR_CONFIG_DIR%\mcp.json
echo [✓] Claude Desktop    : %CLAUDE_CONFIG_DIR%\claude_desktop_config.json
echo.
echo Available tools: add_memory, get_memory, list_memories, delete_memory, search_memories, test_tool
echo.
echo NEXT STEPS:
echo 1. Restart Cursor IDE (if using Cursor)
echo 2. Restart Claude Desktop (if using Claude Desktop)
echo 3. Test with: "Use the test_tool to verify MCP is working"
echo.
echo Troubleshooting:
echo - Check server: cd "%INSTALL_PATH%" ^&^& node server.js
echo - View configs: dir "%CURSOR_CONFIG_DIR%" ^&^& dir "%CLAUDE_CONFIG_DIR%"
echo.
pause
exit /b 0

:cleanup_on_error
echo.
echo [!] Installation failed. Cleaning up...
if exist "%INSTALL_PATH%" (
    echo Removing partial installation: %INSTALL_PATH%
    rmdir /s /q "%INSTALL_PATH%" 2>nul
)
echo.
echo Common solutions:
echo - Run as Administrator
echo - Check internet connection
echo - Verify Node.js installation: node --version
echo - Ensure disk space available
pause
exit /b 1