@echo off
echo.
echo ========================================
echo Testing New User Installation Experience
echo ========================================
echo.

:: Create a temporary test directory
set TEST_DIR=%TEMP%\like-i-said-test-%RANDOM%
echo Creating test directory: %TEST_DIR%
mkdir "%TEST_DIR%"
cd /d "%TEST_DIR%"

echo.
echo Current directory: %CD%
echo.
echo Starting fresh installation...
echo.

:: Run the installation command
call npx @endlessblink/like-i-said-v2@latest like-i-said-v2 install

echo.
echo ========================================
echo Test complete!
echo Test directory: %TEST_DIR%
echo.
echo To clean up, delete: %TEST_DIR%
echo ========================================
pause