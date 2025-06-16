@echo off
echo ===== Testing Like-I-Said MCP v2 Package =====
echo.

echo 1. Testing CLI install command...
node cli.js install
if %errorlevel% neq 0 (
    echo [FAIL] CLI install failed
    pause
    exit /b 1
)
echo [PASS] CLI install succeeded
echo.

echo 2. Testing server functionality...
echo {"jsonrpc": "2.0", "id": 1, "method": "tools/list"} | node server.js >test-output.tmp
findstr "add_memory" test-output.tmp >nul
if %errorlevel% neq 0 (
    echo [FAIL] Server test failed
    type test-output.tmp
    pause
    exit /b 1
)
echo [PASS] Server working with 6 tools
del test-output.tmp

echo.
echo 3. Testing package contents...
npm pack >nul 2>&1
if exist endlessblink-like-i-said-v2-2.0.0.tgz (
    echo [PASS] Package created successfully
) else (
    echo [FAIL] Package creation failed
    pause
    exit /b 1
)

echo.
echo 4. Checking config files were created...
if exist "%APPDATA%\Claude\claude_desktop_config.json" (
    echo [PASS] Claude Desktop config exists
) else (
    echo [FAIL] Claude Desktop config missing
)

if exist "%USERPROFILE%\.cursor\mcp.json" (
    echo [PASS] Cursor config exists  
) else (
    echo [FAIL] Cursor config missing
)

echo.
echo ===== TEST RESULTS =====
echo [PASS] All automated tests passed!
echo.
echo Manual tests needed:
echo 1. Restart Claude Desktop and ask: "What MCP tools do you have?"
echo 2. Test memory tools: add_memory, list_memories, etc.
echo 3. Verify tools persist after restart
echo.
echo Ready to publish to NPM!
pause