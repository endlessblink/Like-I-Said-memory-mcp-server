@echo off
echo ==================================
echo Copying All Required Files
echo ==================================
echo.

set "SOURCE=."
set "DEST=dist-final-working"

echo Creating directories...
if not exist "%DEST%\lib" mkdir "%DEST%\lib"
if not exist "%DEST%\dist" mkdir "%DEST%\dist"
if not exist "%DEST%\node_modules" mkdir "%DEST%\node_modules"

echo.
echo Copying core files...
copy /Y "dashboard-server-bridge.js" "%DEST%\" >nul
copy /Y "package.json" "%DEST%\" >nul
copy /Y "package-lock.json" "%DEST%\" >nul
copy /Y "manifest.json" "%DEST%\" >nul

echo Copying lib directory...
xcopy /Y /E /I "lib\*.*" "%DEST%\lib\" >nul

echo Copying dist directory (built dashboard)...
xcopy /Y /E /I "dist\*.*" "%DEST%\dist\" >nul

echo.
echo IMPORTANT: You also need to run 'npm install' in the destination directory
echo to install all node_modules dependencies.
echo.
echo Files copied to: %DEST%
echo.
echo Next steps:
echo 1. Navigate to D:\APPSNospaces\like-i-said-mcp-server-v2\dist-final-working
echo 2. Run: npm install
echo 3. Run: dashboard.exe
echo.
pause