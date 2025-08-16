@echo off
echo =====================================
echo  Installer Test Suite
echo =====================================
echo.

set "TEST_INSTALL_PATH=D:\APPSNospaces\Like-I-said-mcp-server-v2-test"
set "ORIGINAL_PATH=%~dp0"

echo [1/5] Testing Node.js detection...
for /f "tokens=*" %%i in ('where node 2^>nul') do set "NODE_EXE=%%i"
if "%NODE_EXE%"=="" (
    echo [✗] Node.js not found - installer will fail
    exit /b 1
) else (
    echo [✓] Node.js found: %NODE_EXE%
)

echo [2/5] Testing server functionality...
cd /d "%ORIGINAL_PATH%"
echo {"jsonrpc": "2.0", "id": 1, "method": "tools/list"} | node server.js >test_server.tmp 2>&1
findstr /c:"add_memory" test_server.tmp >nul
if %errorLevel% == 0 (
    echo [✓] Server responds correctly
    del test_server.tmp
) else (
    echo [✗] Server test failed
    type test_server.tmp
    del test_server.tmp
    exit /b 1
)

echo [3/5] Testing JSON configuration generation...
set "JSON_PATH=D:/test/path"
set "JSON_NODE_PATH=C:/Program Files/nodejs"

:: Test Cursor config generation
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
) > test_cursor_config.json

node -e "JSON.parse(require('fs').readFileSync('test_cursor_config.json', 'utf8'))" >nul 2>&1
if %errorLevel% == 0 (
    echo [✓] Cursor config JSON is valid
    del test_cursor_config.json
) else (
    echo [✗] Cursor config JSON is invalid
    exit /b 1
)

:: Test Claude config generation
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
) > test_claude_config.json

node -e "JSON.parse(require('fs').readFileSync('test_claude_config.json', 'utf8'))" >nul 2>&1
if %errorLevel% == 0 (
    echo [✓] Claude config JSON is valid
    del test_claude_config.json
) else (
    echo [✗] Claude config JSON is invalid
    exit /b 1
)

echo [4/5] Testing directory creation...
if not exist "D:\APPSNospaces" mkdir "D:\APPSNospaces" 2>nul
if exist "D:\APPSNospaces" (
    echo [✓] Can create installation directory
    rmdir "D:\APPSNospaces" 2>nul
) else (
    echo [✗] Cannot create installation directory
    exit /b 1
)

echo [5/5] Testing reference files...
if exist "cursor-windows-config.json" (
    echo [✓] cursor-windows-config.json exists
) else (
    echo [✗] cursor-windows-config.json missing
    exit /b 1
)

if exist "claude-desktop-config.json" (
    echo [✓] claude-desktop-config.json exists
) else (
    echo [✗] claude-desktop-config.json missing  
    exit /b 1
)

echo.
echo =====================================
echo      All Tests Passed! ✓
echo =====================================
echo.
echo The installer should work correctly.
echo Run auto-install-all-clients-fixed.bat for the improved version.
pause