@echo off
echo 🖥️ Claude Desktop DXT Installation Test
echo ====================================
echo.
echo This will start a web-based Claude Desktop simulator
echo where you can visually test the DXT installation process.
echo.

REM Change to the WSL project directory
echo 📁 Changing to project directory...
wsl cd /home/endlessblink/projects/like-i-said-mcp-server-v2

REM Build the container using WSL
echo 📦 Building Claude Desktop test container...
wsl docker build -f Dockerfile.claude-simple -t claude-desktop-test .

if %ERRORLEVEL% neq 0 (
    echo ❌ Failed to build container
    echo.
    echo 💡 Try running this from WSL instead:
    echo    wsl
    echo    cd /home/endlessblink/projects/like-i-said-mcp-server-v2
    echo    ./run-claude-desktop-test.sh
    pause
    exit /b 1
)

echo.
echo 🚀 Starting Claude Desktop test environment...
echo.
echo 🌐 The web interface will be available at:
echo    http://localhost:8080
echo.
echo 📋 What you can do:
echo    ✅ Install DXT extension (simulates drag-and-drop)
echo    ✅ Test MCP server connection  
echo    ✅ View installation logs
echo    ✅ See all 11 tools working
echo.
echo 🔄 Starting container...

REM Start the container using WSL
wsl docker run --rm -p 8080:8080 --name claude-desktop-test claude-desktop-test

echo.
echo ❌ Container stopped
pause