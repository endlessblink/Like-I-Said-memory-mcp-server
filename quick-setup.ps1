# Like-I-Said MCP v2 PowerShell Auto Installer
# Run with: PowerShell -ExecutionPolicy Bypass -File quick-setup.ps1

param(
    [switch]$Cursor,
    [switch]$Claude,
    [switch]$All,
    [string]$InstallPath = "D:\APPSNospaces\Like-I-said-mcp-server-v2"
)

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host " Like-I-Said MCP v2 Auto Installer" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check for Administrator privileges
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "[!] This installer requires Administrator privileges" -ForegroundColor Red
    Write-Host "[!] Please run PowerShell as Administrator" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[✓] Running as Administrator" -ForegroundColor Green

# Determine what to install
if (-not $Cursor -and -not $Claude -and -not $All) {
    Write-Host "What would you like to configure?" -ForegroundColor Yellow
    Write-Host "1. Cursor only"
    Write-Host "2. Claude Desktop only" 
    Write-Host "3. Both clients"
    $choice = Read-Host "Enter choice (1-3)"
    
    switch ($choice) {
        "1" { $Cursor = $true }
        "2" { $Claude = $true }
        "3" { $All = $true }
        default { $All = $true }
    }
}

if ($All) {
    $Cursor = $true
    $Claude = $true
}

Write-Host ""
Write-Host "[1/6] Setting up installation directory..." -ForegroundColor Yellow

# Create directories
$parentDir = Split-Path $InstallPath -Parent
if (!(Test-Path $parentDir)) {
    New-Item -Path $parentDir -ItemType Directory -Force | Out-Null
}
if (!(Test-Path $InstallPath)) {
    New-Item -Path $InstallPath -ItemType Directory -Force | Out-Null
}

Write-Host "[2/6] Copying files..." -ForegroundColor Yellow
$sourceDir = $PSScriptRoot
try {
    Copy-Item -Path "$sourceDir\*" -Destination $InstallPath -Recurse -Force
    Write-Host "[✓] Files copied successfully" -ForegroundColor Green
} catch {
    Write-Host "[✗] Failed to copy files: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[3/6] Installing Node.js dependencies..." -ForegroundColor Yellow
Push-Location $InstallPath
try {
    $npmOutput = & npm install 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[✓] Dependencies installed successfully" -ForegroundColor Green
    } else {
        throw "npm install failed"
    }
} catch {
    Write-Host "[✗] Failed to install dependencies" -ForegroundColor Red
    Write-Host "[!] Make sure Node.js is installed and in PATH" -ForegroundColor Red
    Pop-Location
    Read-Host "Press Enter to exit"
    exit 1
}
Pop-Location

Write-Host "[4/6] Testing server..." -ForegroundColor Yellow
try {
    $testInput = '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}'
    $testOutput = $testInput | & node "$InstallPath\server.js" 2>&1 | Out-String
    
    if ($testOutput -match "add_memory") {
        Write-Host "[✓] Server test passed" -ForegroundColor Green
    } else {
        throw "Server test failed - tools not found"
    }
} catch {
    Write-Host "[✗] Server test failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Output: $testOutput" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[5/6] Configuring MCP clients..." -ForegroundColor Yellow

# Configure Cursor
if ($Cursor) {
    Write-Host ""
    Write-Host "Configuring Cursor MCP..." -ForegroundColor Cyan
    
    $cursorConfigDir = "$env:APPDATA\Cursor\User\globalStorage\cursor.mcp"
    if (!(Test-Path $cursorConfigDir)) {
        New-Item -Path $cursorConfigDir -ItemType Directory -Force | Out-Null
    }
    
    $cursorConfig = @{
        mcpServers = @{
            "like-i-said-v2" = @{
                command = "cmd"
                args = @("/c", "node", "$InstallPath\server.js")
                cwd = $InstallPath
                env = @{
                    "NODE_PATH" = "C:\Program Files\nodejs"
                }
            }
        }
    } | ConvertTo-Json -Depth 4
    
    $cursorConfig | Out-File -FilePath "$cursorConfigDir\mcp.json" -Encoding UTF8
    Write-Host "[✓] Cursor configuration created" -ForegroundColor Green
}

# Configure Claude Desktop  
if ($Claude) {
    Write-Host ""
    Write-Host "Configuring Claude Desktop..." -ForegroundColor Cyan
    
    $claudeConfigDir = "$env:APPDATA\Claude"
    if (!(Test-Path $claudeConfigDir)) {
        New-Item -Path $claudeConfigDir -ItemType Directory -Force | Out-Null
    }
    
    $claudeConfig = @{
        mcpServers = @{
            "like-i-said-memory-v2" = @{
                command = "node"
                args = @("server.js")
                cwd = $InstallPath
            }
        }
    } | ConvertTo-Json -Depth 4
    
    $claudeConfig | Out-File -FilePath "$claudeConfigDir\claude_desktop_config.json" -Encoding UTF8
    Write-Host "[✓] Claude Desktop configuration created" -ForegroundColor Green
}

Write-Host "[6/6] Final verification..." -ForegroundColor Yellow
Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host "       Installation Complete!" -ForegroundColor Green  
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "Server installed to: $InstallPath" -ForegroundColor White
Write-Host ""
Write-Host "Configured clients:" -ForegroundColor White
if ($Cursor) {
    Write-Host "[✓] Cursor MCP        : $env:APPDATA\Cursor\User\globalStorage\cursor.mcp\mcp.json" -ForegroundColor Green
}
if ($Claude) {
    Write-Host "[✓] Claude Desktop    : $env:APPDATA\Claude\claude_desktop_config.json" -ForegroundColor Green
}
Write-Host ""
Write-Host "Available tools: add_memory, get_memory, list_memories, delete_memory, search_memories, test_tool" -ForegroundColor White
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Yellow
if ($Cursor) {
    Write-Host "1. Restart Cursor" -ForegroundColor White
}
if ($Claude) {
    Write-Host "2. Restart Claude Desktop" -ForegroundColor White  
}
Write-Host "3. Check MCP settings in your client to verify connection" -ForegroundColor White
Write-Host ""

Read-Host "Press Enter to exit"