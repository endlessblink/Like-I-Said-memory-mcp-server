@echo off
setlocal enabledelayedexpansion

echo =====================================
echo  Like-I-Said MCP v2 Auto Installer
echo          (No Admin Required)
echo =====================================
echo.

:: Check Node.js first
echo [0/6] Checking prerequisites...
for /f "tokens=*" %%i in ('where node 2^>nul') do set "NODE_EXE=%%i"
if "%NODE_EXE%"=="" (
    echo [✗] Node.js not found in PATH
    echo [!] Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

for %%i in ("%NODE_EXE%") do set "NODE_DIR=%%~dpi"
set "NODE_DIR=%NODE_DIR:~0,-1%"
echo [✓] Node.js found at: %NODE_DIR%

:: Use user directory instead of system directory
set "USER_MCP_DIR=%USERPROFILE%\mcp-servers"
set "INSTALL_PATH=%USER_MCP_DIR%\like-i-said-v2"
set "SOURCE_PATH=%~dp0"

echo [✓] Installing to user directory (no admin needed): %INSTALL_PATH%

:: Check for existing installation
if exist "%INSTALL_PATH%\server.js" (
    echo [!] Installation already exists
    set /p "OVERWRITE=Overwrite? (y/n): "
    if /i "!OVERWRITE!" neq "y" exit /b 0
)

echo [1/6] Setting up directories...
if not exist "%USER_MCP_DIR%" mkdir "%USER_MCP_DIR%"
if not exist "%INSTALL_PATH%" mkdir "%INSTALL_PATH%"

echo [2/6] Copying files...
xcopy "%SOURCE_PATH%*" "%INSTALL_PATH%\" /E /H /C /I /Y >nul 2>&1
if %errorLevel% neq 0 (
    echo [✗] Failed to copy files
    pause
    exit /b 1
)

echo [3/6] Installing dependencies...
cd /d "%INSTALL_PATH%"
call npm install
if %errorLevel% neq 0 (
    echo [✗] npm install failed
    pause
    exit /b 1
)

echo [4/6] Testing server...
echo {"jsonrpc": "2.0", "id": 1, "method": "tools/list"} | node server.js >test.tmp 2>&1
findstr /c:"add_memory" test.tmp >nul
if %errorLevel% == 0 (
    echo [✓] Server test passed
    del test.tmp
) else (
    echo [✗] Server test failed
    type test.tmp
    del test.tmp
    pause
    exit /b 1
)

echo [5/6] Configuring clients...

:: Configure Cursor (user directory)
set "CURSOR_CONFIG_DIR=%APPDATA%\Cursor\User\globalStorage\cursor.mcp"
if not exist "%CURSOR_CONFIG_DIR%" mkdir "%CURSOR_CONFIG_DIR%"

set "JSON_PATH=%INSTALL_PATH:\=/%"
set "JSON_NODE_PATH=%NODE_DIR:\=/%"

(
echo {
echo   "mcpServers": {
echo     "like-i-said-v2": {
echo       "command": "cmd",
echo       "args": ["/c", "node", "%JSON_PATH%/server.js"],
echo       "cwd": "%JSON_PATH%",
echo       "env": {"NODE_PATH": "%JSON_NODE_PATH%"}
echo     }
echo   }
echo }
) > "%CURSOR_CONFIG_DIR%\mcp.json"

echo [✓] Cursor configured

:: Configure Claude Desktop (user directory)
set "CLAUDE_CONFIG_DIR=%APPDATA%\Claude"
if not exist "%CLAUDE_CONFIG_DIR%" mkdir "%CLAUDE_CONFIG_DIR%"

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

echo [✓] Claude Desktop configured

echo [6/6] Starting services...
echo.
echo =====================================
echo    Installation Complete! 🎉
echo =====================================
echo.
echo 📍 Installed to: %INSTALL_PATH%
echo 🔧 Cursor config: %CURSOR_CONFIG_DIR%\mcp.json
echo 🔧 Claude config: %CLAUDE_CONFIG_DIR%\claude_desktop_config.json
echo.
echo 🚀 STARTING WEB DASHBOARD...
echo    Visit: http://localhost:3001
echo.

:: Start the dashboard in background
start "MCP Dashboard" cmd /c "cd /d \"%INSTALL_PATH%\" && node dashboard-server.js"

:: Give it a moment to start
timeout /t 3 /nobreak >nul

echo 📋 Available tools: add_memory, get_memory, list_memories, delete_memory, search_memories, test_tool
echo.
echo 🔄 NEXT STEPS:
echo 1. Visit http://localhost:3001 for the web interface
echo 2. Restart Cursor IDE (tools will appear in MCP settings)
echo 3. Restart Claude Desktop
echo 4. Test with: "Use the test_tool to verify MCP connection"
echo.
echo 🛠️ Manual controls:
echo   Start dashboard: cd "%INSTALL_PATH%" ^&^& node dashboard-server.js
echo   Test MCP server: cd "%INSTALL_PATH%" ^&^& node server.js
echo.
pause