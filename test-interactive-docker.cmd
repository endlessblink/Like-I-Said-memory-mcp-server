@echo off
echo.
echo ============================================
echo Interactive Docker Test Environment
echo ============================================
echo.
echo This will start a clean Docker container where you can:
echo - Test global installation: npm install -g @endlessblink/like-i-said-v2
echo - Test local installation: npx @endlessblink/like-i-said-v2 like-i-said-v2 install
echo - Test various scenarios without affecting your system
echo.
echo Building Docker image...
docker build -f Dockerfile.interactive -t like-i-said-interactive .

echo.
echo Starting interactive container...
echo.
docker run --rm -it --name like-i-said-test like-i-said-interactive

echo.
echo ============================================
echo Container closed
echo ============================================
pause