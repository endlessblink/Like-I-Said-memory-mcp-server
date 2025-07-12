@echo off
echo Running automated Syncthing setup...
powershell.exe -ExecutionPolicy Bypass -File "%~dp0auto-install-syncthing.ps1"
pause
