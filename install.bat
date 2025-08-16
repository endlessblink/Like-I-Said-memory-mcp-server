@echo off
echo =====================================
echo   Like-I-Said MCP v2 Simple Installer
echo =====================================
echo.

:: Enable verbose logging
set "LOG_FILE=%~dp0install.log"
echo Installation started at %date% %time% > "%LOG_FILE%"
echo Current directory: %CD% >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"

echo [LOG] Verbose logging enabled: %LOG_FILE%

:: Check Node.js
echo [LOG] Checking Node.js... >> "%LOG_FILE%"
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [✗] Node.js required
    echo ERROR: Node.js not found in PATH >> "%LOG_FILE%"
    pause & exit /b 1
)
echo [✓] Node.js found
echo Node.js found at: >> "%LOG_FILE%"
where node >> "%LOG_FILE%"

:: Set paths
set "INSTALL_PATH=%USERPROFILE%\mcp-servers\like-i-said-v2"
set "CURRENT_DIR=%CD%"
echo Install path: %INSTALL_PATH% >> "%LOG_FILE%"
echo Current directory: %CURRENT_DIR% >> "%LOG_FILE%"

:: Check if we have the server files
echo [LOG] Checking server files... >> "%LOG_FILE%"
if not exist "server.js" (
    echo [✗] server.js not found in current directory
    echo ERROR: server.js not found in %CD% >> "%LOG_FILE%"
    echo Run this installer from the source directory
    pause & exit /b 1
)

echo [✓] Source files found
echo [✓] Install target: %INSTALL_PATH%
echo Source files found in: %CD% >> "%LOG_FILE%"

:: Create installation directory
echo [LOG] Creating directories... >> "%LOG_FILE%"
if not exist "%USERPROFILE%\mcp-servers" (
    mkdir "%USERPROFILE%\mcp-servers"
    echo Created %USERPROFILE%\mcp-servers >> "%LOG_FILE%"
)
if not exist "%INSTALL_PATH%" (
    mkdir "%INSTALL_PATH%"
    echo Created %INSTALL_PATH% >> "%LOG_FILE%"
)

:: Copy files
echo.
echo [1/3] Copying files...
echo [LOG] Copying files to %INSTALL_PATH%... >> "%LOG_FILE%"
copy "server.js" "%INSTALL_PATH%\" >>"%LOG_FILE%" 2>&1
copy "dashboard-server.js" "%INSTALL_PATH%\" >>"%LOG_FILE%" 2>&1
copy "simple-dashboard.html" "%INSTALL_PATH%\" >>"%LOG_FILE%" 2>&1
copy "package.json" "%INSTALL_PATH%\" >>"%LOG_FILE%" 2>&1
copy "start.bat" "%INSTALL_PATH%\" >>"%LOG_FILE%" 2>&1
copy "install.bat" "%INSTALL_PATH%\" >>"%LOG_FILE%" 2>&1
echo [✓] Files copied

:: Install dependencies
echo.
echo [2/3] Installing dependencies...
echo [LOG] Installing npm dependencies... >> "%LOG_FILE%"
cd /d "%INSTALL_PATH%"
echo Changed to directory: %CD% >> "%LOG_FILE%"
call npm install --omit=optional >>"%LOG_FILE%" 2>&1
if %errorlevel% neq 0 (
    echo [✗] npm install failed
    echo ERROR: npm install failed with exit code %errorlevel% >> "%LOG_FILE%"
    pause & exit /b 1
)
echo [✓] Dependencies installed
echo npm install completed successfully >> "%LOG_FILE%"

:: Configure MCP clients
echo.
echo [3/3] Configuring MCP clients...

:: Test server first
echo [✓] Testing server...
echo {"jsonrpc": "2.0", "id": 1, "method": "tools/list"} | node server.js >test.tmp 2>&1
findstr /c:"add_memory" test.tmp >nul
if %errorlevel% neq 0 (
    echo [✗] Server test failed
    type test.tmp
    del test.tmp
    pause & exit /b 1
)
del test.tmp
echo [✓] Server working

:: Get Windows username dynamically
echo [LOG] Getting Windows username... >> "%LOG_FILE%"
for /f "tokens=*" %%i in ('whoami') do set "CURRENT_USER=%%i"
for /f "tokens=2 delims=\" %%i in ("%CURRENT_USER%") do set "USERNAME=%%i"

echo [✓] Windows Username: %USERNAME%
echo Current Windows user: %USERNAME% >> "%LOG_FILE%"

:: Configure Cursor - Global config (verified path)
echo [LOG] Configuring Cursor MCP... >> "%LOG_FILE%"
set "CURSOR_CONFIG=C:\Users\%USERNAME%\.cursor\mcp.json"
echo Cursor config path: %CURSOR_CONFIG% >> "%LOG_FILE%"
if not exist "C:\Users\%USERNAME%\.cursor" (
    mkdir "C:\Users\%USERNAME%\.cursor"
    echo Created Cursor directory >> "%LOG_FILE%"
)
(
echo {
echo   "mcpServers": {
echo     "like-i-said-memory-v2": {
echo       "command": "node",
echo       "args": ["%INSTALL_PATH%\\server.js"],
echo       "cwd": "%INSTALL_PATH%"
echo     }
echo   }
echo }
) > "%CURSOR_CONFIG%" 2>>"%LOG_FILE%"
if exist "%CURSOR_CONFIG%" (
    echo [✓] Cursor: %CURSOR_CONFIG%
    echo Cursor config file created successfully >> "%LOG_FILE%"
) else (
    echo [✗] Failed to create Cursor config >> "%LOG_FILE%"
)

:: Configure Claude Desktop (verified path)
echo [LOG] Configuring Claude Desktop MCP... >> "%LOG_FILE%"
set "CLAUDE_CONFIG=C:\Users\%USERNAME%\AppData\Roaming\Claude\claude_desktop_config.json"
echo Claude config path: %CLAUDE_CONFIG% >> "%LOG_FILE%"
if not exist "C:\Users\%USERNAME%\AppData\Roaming\Claude" (
    mkdir "C:\Users\%USERNAME%\AppData\Roaming\Claude"
    echo Created Claude directory >> "%LOG_FILE%"
)
(
echo {
echo   "mcpServers": {
echo     "like-i-said-memory-v2": {
echo       "command": "node",
echo       "args": ["%INSTALL_PATH%\\server.js"],
echo       "cwd": "%INSTALL_PATH%"
echo     }
echo   }
echo }
) > "%CLAUDE_CONFIG%" 2>>"%LOG_FILE%"
if exist "%CLAUDE_CONFIG%" (
    echo [✓] Claude Desktop: %CLAUDE_CONFIG%
    echo Claude config file created successfully >> "%LOG_FILE%"
) else (
    echo [✗] Failed to create Claude config >> "%LOG_FILE%"
)

:: Configure Windsurf (verified path)
echo [LOG] Configuring Windsurf MCP... >> "%LOG_FILE%"
set "WINDSURF_CONFIG=C:\Users\%USERNAME%\.codeium\windsurf\mcp_config.json"
echo Windsurf config path: %WINDSURF_CONFIG% >> "%LOG_FILE%"
if not exist "C:\Users\%USERNAME%\.codeium\windsurf" (
    mkdir "C:\Users\%USERNAME%\.codeium\windsurf"
    echo Created Windsurf directory >> "%LOG_FILE%"
)
(
echo {
echo   "mcpServers": {
echo     "like-i-said-memory-v2": {
echo       "command": "node",
echo       "args": ["%INSTALL_PATH%\\server.js"],
echo       "cwd": "%INSTALL_PATH%"
echo     }
echo   }
echo }
) > "%WINDSURF_CONFIG%" 2>>"%LOG_FILE%"
if exist "%WINDSURF_CONFIG%" (
    echo [✓] Windsurf: %WINDSURF_CONFIG%
    echo Windsurf config file created successfully >> "%LOG_FILE%"
) else (
    echo [✗] Failed to create Windsurf config >> "%LOG_FILE%"
)

echo.
echo =====================================
echo      Installation Complete! 🎉
echo =====================================
echo.
echo 📍 Location: %INSTALL_PATH%
echo 🚀 Start dashboard: cd "%INSTALL_PATH%" && start.bat
echo.
echo 🔄 NEXT STEPS:
echo   1. Restart Cursor, Claude Desktop, and Windsurf completely
echo   2. Test: "Use add_memory to save: Hello World"
echo   3. If tools don't appear, check the config files were created:
echo      - Cursor: %CURSOR_CONFIG%
echo      - Claude: %CLAUDE_CONFIG%  
echo      - Windsurf: %WINDSURF_CONFIG%
echo.
echo 📋 VERBOSE LOG: %LOG_FILE%
echo    Check this file if you encounter any issues.
echo.
echo Installation completed at %date% %time% >> "%LOG_FILE%"
echo ================================================ >> "%LOG_FILE%"
pause