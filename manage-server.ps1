# Like I Said MCP Server Manager
param([ValidateSet("start", "stop", "restart", "status", "install-startup", "remove-startup")][string]$Action = "start")

$ServerPath = "D:\MY PROJECTS\AI\LLM\AI Code Gen\my-builds\My MCP\Like-I-said-mcp-server-Share"
$ServerScript = "$ServerPath\server.js"
$StartupKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
$StartupName = "LikeISaidMCP"

function Start-MCPServer {
    $existing = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*server.js*" }
    if ($existing) { Write-Host "Already running (PID: $($existing.Id))" -ForegroundColor Yellow; return }
    
    Write-Host "Starting MCP Server..." -ForegroundColor Green
    $process = Start-Process -FilePath "node" -ArgumentList $ServerScript -WorkingDirectory $ServerPath -WindowStyle Hidden -PassThru
    Write-Host "Started (PID: $($process.Id))" -ForegroundColor Green
}

function Stop-MCPServer {
    $processes = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*server.js*" }
    if (-not $processes) { Write-Host "Not running" -ForegroundColor Yellow; return }
    
    Write-Host "Stopping..." -ForegroundColor Red
    $processes | ForEach-Object { Stop-Process -Id $_.Id -Force; Write-Host "Stopped $($_.Id)" -ForegroundColor Red }
}

function Get-MCPServerStatus {
    $processes = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*server.js*" }
    if ($processes) {
        Write-Host "Running:" -ForegroundColor Green
        $processes | ForEach-Object { Write-Host "PID: $($_.Id), Memory: $([math]::Round($_.WorkingSet64/1MB, 2))MB" -ForegroundColor Green }
    } else { Write-Host "Not running" -ForegroundColor Red }
}

function Install-Startup {
    $vbsPath = "$ServerPath\start-invisible.vbs"
    if (-not (Test-Path $vbsPath)) { Write-Host "VBS script not found" -ForegroundColor Red; return }
    
    try {
        Set-ItemProperty -Path $StartupKey -Name $StartupName -Value $vbsPath -Force
        Write-Host "Added to Windows startup" -ForegroundColor Green
    } catch { Write-Host "Failed: $($_.Exception.Message)" -ForegroundColor Red }
}

function Remove-Startup {
    try {
        Remove-ItemProperty -Path $StartupKey -Name $StartupName -ErrorAction Stop
        Write-Host "Removed from startup" -ForegroundColor Green
    } catch { Write-Host "Not in startup" -ForegroundColor Yellow }
}

# Main execution
switch ($Action.ToLower()) {
    "start" { Start-MCPServer }
    "stop" { Stop-MCPServer }
    "restart" { Stop-MCPServer; Start-Sleep -Seconds 2; Start-MCPServer }
    "status" { Get-MCPServerStatus }
    "install-startup" { Install-Startup }
    "remove-startup" { Remove-Startup }
}
