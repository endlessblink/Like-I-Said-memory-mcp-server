@echo off
echo ==================================
echo Testing Like-I-Said Dashboard
echo ==================================
echo.
echo Current directory: %CD%
echo.

if exist "%CD%\dashboard.exe" (
    echo Found dashboard.exe in current directory
    echo Starting...
    echo.
    "%CD%\dashboard.exe"
) else (
    echo ERROR: dashboard.exe not found in current directory
    echo Please make sure you are running this from the correct folder
    echo.
    echo Looking for dashboard.exe...
    dir /b *.exe 2>nul
    if errorlevel 1 (
        echo No .exe files found in this directory
    )
)

echo.
echo ==================================
echo Dashboard closed
echo Exit code: %errorlevel%
echo ==================================
echo.
pause