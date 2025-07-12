@echo off
echo Running fixed Syncthing setup...
powershell.exe -ExecutionPolicy Bypass -File "%~dp0auto-install-syncthing-fixed.ps1"
pause