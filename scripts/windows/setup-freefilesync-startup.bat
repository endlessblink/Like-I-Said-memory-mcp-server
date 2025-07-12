@echo off
echo Setting up FreeFileSync RealTimeSync for Windows startup...

echo.
echo Step 1: Create your sync configuration
echo - Open FreeFileSync and configure your sync job
echo - Save as: like-i-said-sync.ffs_batch
echo - Open RealTimeSync and load the batch file
echo - Save as: like-i-said-sync.ffs_real

echo.
echo Step 2: Add to Windows startup
echo - Press Win+R, type: shell:startup
echo - Create shortcut with target:
echo   "C:\Program Files\FreeFileSync\RealTimeSync.exe" "D:\APPSNospaces\like-i-said-mcp-server-v2\like-i-said-sync.ffs_real"

echo.
echo Step 3: Alternative batch file method
echo - If shortcut doesn't work, create startup-realtimesync.cmd in startup folder:
echo   start "" "C:\Program Files\FreeFileSync\RealTimeSync.exe" "D:\APPSNospaces\like-i-said-mcp-server-v2\like-i-said-sync.ffs_real"
echo   exit

echo.
echo Configuration complete! RealTimeSync will now start with Windows and monitor continuously.
pause