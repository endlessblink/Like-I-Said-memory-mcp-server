@echo off
echo =====================================
echo    Like-I-Said MCP v2 Starter
echo =====================================
echo.

:: Check if we're in the right directory
if not exist "server.js" (
    echo [✗] server.js not found
    echo [!] Run this from the installation directory
    pause
    exit /b 1
)

:: Check Node.js
where node >nul 2>&1
if %errorLevel% neq 0 (
    echo [✗] Node.js not found in PATH
    pause
    exit /b 1
)

echo [✓] Starting MCP server and dashboard...
echo.

:: Start dashboard in background
start "MCP Dashboard" cmd /c "node dashboard-server.js"

:: Give it a moment to start
timeout /t 2 /nobreak >nul

echo =====================================
echo         Server Started! 🎉
echo =====================================
echo.
echo 🌐 Dashboard: http://localhost:3001
echo 🔧 API: http://localhost:3001/api/memories
echo.
echo 📋 Available MCP tools:
echo   • add_memory, get_memory, list_memories
echo   • delete_memory, search_memories, test_tool
echo.
echo 🔄 To stop: Close the dashboard window or Ctrl+C
echo.
echo Opening dashboard in browser...
start http://localhost:3001

pause