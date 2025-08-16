@echo off
setlocal enabledelayedexpansion

echo =====================================
echo  Like-I-Said MCP v2 Auto Installer
echo =====================================
echo.

:: Check if running as Administrator
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [✓] Running as Administrator
) else (
    echo [!] This installer requires Administrator privileges
    echo [!] Please right-click and "Run as Administrator"
    pause
    exit /b 1
)

:: Set installation path
set "INSTALL_PATH=D:\APPSNospaces\Like-I-said-mcp-server-v2"
set "SOURCE_PATH=%~dp0"

echo [1/6] Setting up installation directory...
if not exist "D:\APPSNospaces" mkdir "D:\APPSNospaces"
if not exist "%INSTALL_PATH%" mkdir "%INSTALL_PATH%"

echo [2/6] Copying files...
xcopy "%SOURCE_PATH%*" "%INSTALL_PATH%\" /E /H /C /I /Y >nul 2>&1
if %errorLevel% neq 0 (
    echo [✗] Failed to copy files
    pause
    exit /b 1
)

echo [3/6] Installing Node.js dependencies...
cd /d "%INSTALL_PATH%"
call npm install
if %errorLevel% neq 0 (
    echo [✗] Failed to install dependencies
    echo [!] Make sure Node.js is installed and in PATH
    pause
    exit /b 1
)

echo [4/6] Testing server...
timeout /t 2 /nobreak >nul
echo ^{"jsonrpc": "2.0", "id": 1, "method": "tools/list"^} | node server.js >test_output.tmp 2>&1
findstr /c:"add_memory" test_output.tmp >nul
if %errorLevel% == 0 (
    echo [✓] Server test passed
    del test_output.tmp
) else (
    echo [✗] Server test failed
    type test_output.tmp
    del test_output.tmp
    pause
    exit /b 1
)

echo [5/6] Configuring MCP clients...

:: Configure Cursor
echo.
echo Configuring Cursor MCP...
set "CURSOR_CONFIG_DIR=%APPDATA%\Cursor\User\globalStorage\cursor.mcp"
if not exist "%CURSOR_CONFIG_DIR%" mkdir "%CURSOR_CONFIG_DIR%"

echo ^{> "%CURSOR_CONFIG_DIR%\mcp.json"
echo   "mcpServers": ^{>> "%CURSOR_CONFIG_DIR%\mcp.json"
echo     "like-i-said-v2": ^{>> "%CURSOR_CONFIG_DIR%\mcp.json"
echo       "command": "cmd",>> "%CURSOR_CONFIG_DIR%\mcp.json"
echo       "args": [>> "%CURSOR_CONFIG_DIR%\mcp.json"
echo         "/c",>> "%CURSOR_CONFIG_DIR%\mcp.json"
echo         "node",>> "%CURSOR_CONFIG_DIR%\mcp.json"
echo         "%INSTALL_PATH:\=\\%\\server.js">> "%CURSOR_CONFIG_DIR%\mcp.json"
echo       ],>> "%CURSOR_CONFIG_DIR%\mcp.json"
echo       "cwd": "%INSTALL_PATH:\=\\%",>> "%CURSOR_CONFIG_DIR%\mcp.json"
echo       "env": ^{>> "%CURSOR_CONFIG_DIR%\mcp.json"
echo         "NODE_PATH": "C:\\Program Files\\nodejs">> "%CURSOR_CONFIG_DIR%\mcp.json"
echo       ^}>> "%CURSOR_CONFIG_DIR%\mcp.json"
echo     ^}>> "%CURSOR_CONFIG_DIR%\mcp.json"
echo   ^}>> "%CURSOR_CONFIG_DIR%\mcp.json"
echo ^}>> "%CURSOR_CONFIG_DIR%\mcp.json"

echo [✓] Cursor configuration created

:: Configure Claude Desktop
echo.
echo Configuring Claude Desktop...
set "CLAUDE_CONFIG_DIR=%APPDATA%\Claude"
if not exist "%CLAUDE_CONFIG_DIR%" mkdir "%CLAUDE_CONFIG_DIR%"

echo ^{> "%CLAUDE_CONFIG_DIR%\claude_desktop_config.json"
echo   "mcpServers": ^{>> "%CLAUDE_CONFIG_DIR%\claude_desktop_config.json"
echo     "like-i-said-memory-v2": ^{>> "%CLAUDE_CONFIG_DIR%\claude_desktop_config.json"
echo       "command": "node",>> "%CLAUDE_CONFIG_DIR%\claude_desktop_config.json"
echo       "args": ["server.js"],>> "%CLAUDE_CONFIG_DIR%\claude_desktop_config.json"
echo       "cwd": "%INSTALL_PATH:\=\\%">> "%CLAUDE_CONFIG_DIR%\claude_desktop_config.json"
echo     ^}>> "%CLAUDE_CONFIG_DIR%\claude_desktop_config.json"
echo   ^}>> "%CLAUDE_CONFIG_DIR%\claude_desktop_config.json"
echo ^}>> "%CLAUDE_CONFIG_DIR%\claude_desktop_config.json"

echo [✓] Claude Desktop configuration created

echo [6/6] Final verification...
echo.
echo =====================================
echo        Installation Complete!
echo =====================================
echo.
echo Server installed to: %INSTALL_PATH%
echo.
echo Configured clients:
echo [✓] Cursor MCP        : %CURSOR_CONFIG_DIR%\mcp.json
echo [✓] Claude Desktop    : %CLAUDE_CONFIG_DIR%\claude_desktop_config.json
echo.
echo Available tools: add_memory, get_memory, list_memories, delete_memory, search_memories, test_tool
echo.
echo NEXT STEPS:
echo 1. Restart Cursor (if using Cursor)
echo 2. Restart Claude Desktop (if using Claude Desktop)
echo 3. Check MCP settings in your client to verify connection
echo.
echo Configuration files created for easy reference:
echo - %INSTALL_PATH%\cursor-windows-config.json
echo - %INSTALL_PATH%\claude-desktop-config.json
echo.
pause