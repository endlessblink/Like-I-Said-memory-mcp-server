@echo off
echo === Quick Test (Skipping CLI) ===
echo.

REM Test 1: MCP Server
echo 1. Testing MCP Server...
echo {"jsonrpc": "2.0", "id": 1, "method": "tools/list"} | node server.js >nul 2>&1
if %errorlevel% equ 0 (
    echo [PASS] MCP Server works
) else (
    echo [FAIL] MCP Server failed
)

REM Test 2: Dashboard Build
echo.
echo 2. Testing Dashboard Build...
if exist "dist\index.html" (
    echo [PASS] Dashboard already built
) else (
    echo [INFO] Building dashboard...
    call npm run build
)

REM Test 3: Config Files
echo.
echo 3. Testing Config Files...
if exist "%APPDATA%\Claude\claude_desktop_config.json" (
    echo [PASS] Claude config exists
)
if exist "%USERPROFILE%\.cursor\mcp.json" (
    echo [PASS] Cursor config exists
)

echo.
echo === Starting Dashboard ===
echo.
npm run dev:full