@echo off
title Testing Like-I-Said MCP v2 Complete System
echo ===================================================
echo    Testing Like-I-Said MCP v2 Complete System
echo ===================================================
echo.

REM Test 1: MCP Server
echo 1. Testing MCP Server...
echo {"jsonrpc": "2.0", "id": 1, "method": "tools/list"} | node server.js >server-test.tmp
findstr "add_memory" server-test.tmp >nul
if %errorlevel% equ 0 (
    echo [PASS] MCP Server returns 6 tools
) else (
    echo [FAIL] MCP Server test failed
    type server-test.tmp
)
del server-test.tmp

REM Test 2: CLI Installation
echo.
echo 2. Testing CLI Installation...
echo [....] Running CLI install test (this may take 5-10 seconds)...
timeout /t 1 /nobreak >nul
call node cli.js install >cli-test.tmp 2>&1
timeout /t 1 /nobreak >nul
findstr "Installation Complete" cli-test.tmp >nul
if %errorlevel% equ 0 (
    echo [PASS] CLI installation works
) else (
    echo [FAIL] CLI installation failed
    type cli-test.tmp
)
del cli-test.tmp

REM Test 3: Dashboard Build
echo.
echo 3. Testing Dashboard Build...
call npm run build >build-test.tmp 2>&1
findstr "built in" build-test.tmp >nul
if %errorlevel% equ 0 (
    echo [PASS] Dashboard builds successfully
) else (
    echo [FAIL] Dashboard build failed
    type build-test.tmp
)
del build-test.tmp

REM Test 4: Config Files Created
echo.
echo 4. Testing Config Files...
if exist "%APPDATA%\Claude\claude_desktop_config.json" (
    echo [PASS] Claude config exists
) else (
    echo [FAIL] Claude config missing
)

if exist "%USERPROFILE%\.cursor\mcp.json" (
    echo [PASS] Cursor config exists
) else (
    echo [FAIL] Cursor config missing
)

REM Test 5: Package Creation
echo.
echo 5. Testing NPM Package...
call npm pack >package-test.tmp 2>&1
if exist endlessblink-like-i-said-v2-*.tgz (
    echo [PASS] NPM package created
    for %%f in (endlessblink-like-i-said-v2-*.tgz) do echo Package: %%f
) else (
    echo [FAIL] NPM package creation failed
    type package-test.tmp
)
del package-test.tmp

echo.
echo ===================================================
echo                  TEST SUMMARY
echo ===================================================
echo.
echo Next Steps:
echo 1. Start dashboard: npm run dev:full
echo 2. Test in browser: http://localhost:5173
echo 3. Test AI integration in Claude Desktop
echo 4. Publish to NPM: npm publish --access public
echo.
echo Manual Tests Needed:
echo - Restart Claude Desktop and test MCP tools
echo - Check dashboard UI in browser
echo - Test memory CRUD operations
echo - Verify cross-platform compatibility
echo.
pause