# Like-I-Said Dashboard Launcher
# This script starts the dashboard and automatically opens it in your browser

$ErrorActionPreference = "Stop"
$Host.UI.RawUI.WindowTitle = "Like-I-Said Dashboard"

# Colors
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }
function Write-Error { Write-Host $args -ForegroundColor Red }

Clear-Host
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Like-I-Said Memory Dashboard v2" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if npm is available
try {
    $null = Get-Command npm -ErrorAction Stop
} catch {
    Write-Error "ERROR: npm is not installed or not in PATH"
    Write-Host "Please install Node.js from https://nodejs.org/"
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Info "Starting dashboard server..."
Write-Info "This may take a moment on first run..."
Write-Host ""

# Start the dashboard process
$dashboardProcess = Start-Process npm -ArgumentList "run dashboard" -NoNewWindow -PassThru -RedirectStandardOutput "dashboard.log" -RedirectStandardError "dashboard-error.log"

# Wait for port file with progress
$timeout = 30
$elapsed = 0
Write-Host -NoNewline "Waiting for server to start"

while (-not (Test-Path ".dashboard-port") -and $elapsed -lt $timeout) {
    Write-Host -NoNewline "."
    Start-Sleep -Seconds 1
    $elapsed++
}

if (-not (Test-Path ".dashboard-port")) {
    Write-Host ""
    Write-Error "ERROR: Dashboard failed to start within $timeout seconds"
    Write-Host "Check dashboard.log and dashboard-error.log for details"
    
    if (Test-Path "dashboard-error.log") {
        Write-Host ""
        Write-Warning "Error log contents:"
        Get-Content "dashboard-error.log" | Select-Object -Last 10
    }
    
    Read-Host "Press Enter to exit"
    exit 1
}

# Read the port
$port = Get-Content ".dashboard-port" -Raw -ErrorAction SilentlyContinue
$port = $port.Trim()

# Clear and show success
Clear-Host
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Success "   ✅ LIKE-I-SAID DASHBOARD IS READY!"
Write-Host ""
Write-Host "   📌 " -NoNewline
Write-Host "Click to open: " -NoNewline -ForegroundColor White
Write-Host "http://localhost:$port" -ForegroundColor Cyan -NoNewline
Write-Host " (Ctrl+Click in most terminals)" -ForegroundColor Gray
Write-Host ""
Write-Info "   Alternative URLs:"
Write-Host "   - http://127.0.0.1:$port"
Write-Host "   - http://[::1]:$port (IPv6)"
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""

# Open in default browser
Write-Info "🚀 Opening dashboard in your default browser..."
Start-Process "http://localhost:$port"

Write-Host ""
Write-Success "✨ Dashboard Features:"
Write-Host "   - Memory Management & Search"
Write-Host "   - Task Tracking & Organization"
Write-Host "   - Real-time Updates"
Write-Host "   - AI Enhancement Tools"
Write-Host ""
Write-Info "📝 Logs: dashboard.log"
Write-Host ""
Write-Warning "Press Ctrl+C to stop the server"
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""

# Monitor the process
try {
    # If the dashboard process exits unexpectedly
    $dashboardProcess.WaitForExit()
    Write-Error "Dashboard process exited unexpectedly!"
    
    if (Test-Path "dashboard-error.log") {
        Write-Warning "Error log:"
        Get-Content "dashboard-error.log" | Select-Object -Last 20
    }
} catch {
    # This is expected when user presses Ctrl+C
    Write-Host ""
    Write-Info "Shutting down dashboard..."
}

Read-Host "Press Enter to close"