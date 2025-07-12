@echo off
echo Cleaning up ports...

REM Kill processes on port 3001 (API)
echo Checking port 3001...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001') do (
    echo Killing process %%a on port 3001
    taskkill /F /PID %%a 2>nul
)

REM Kill processes on port 5173 (UI)  
echo Checking port 5173...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do (
    echo Killing process %%a on port 5173
    taskkill /F /PID %%a 2>nul
)

echo Ports cleaned up!