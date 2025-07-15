@echo off
echo ==================================
echo Testing Like-I-Said Dashboard
echo ==================================
echo.
echo This will test the dashboard executable
echo and show any error messages if it crashes.
echo.
echo Starting dashboard.exe...
echo.

dashboard.exe

echo.
echo ==================================
echo Dashboard closed
echo Exit code: %errorlevel%
echo ==================================
echo.
pause