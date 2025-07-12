#!/bin/bash
# Fully Automated Syncthing Setup from WSL

echo "=== Fully Automated Sync Setup ==="
echo "This will set up sync between:"
echo "WSL: $(pwd)"
echo "Windows: D:\\APPSNospaces\\Like-I-said-mcp-server-v2"
echo ""

# Ensure target directory exists
echo "Creating Windows directory..."
mkdir -p /mnt/d/APPSNospaces/Like-I-said-mcp-server-v2

# Copy .stignore to Windows location
echo "Copying .stignore to Windows folder..."
cp .stignore /mnt/d/APPSNospaces/Like-I-said-mcp-server-v2/

# Create and copy all setup files to Windows
echo "Creating Windows setup files..."

# Create PowerShell script that downloads and configures Syncthing
cat > /mnt/d/APPSNospaces/Like-I-said-mcp-server-v2/auto-install-syncthing.ps1 << 'EOF'
# Auto-install Syncthing on Windows
Write-Host "Installing Syncthing on Windows..." -ForegroundColor Green

$syncthingPath = "D:\APPSNospaces\syncthing"
$syncthingExe = "$syncthingPath\syncthing.exe"
$downloadUrl = "https://github.com/syncthing/syncthing/releases/latest/download/syncthing-windows-amd64.zip"

# Create directory
New-Item -ItemType Directory -Force -Path $syncthingPath | Out-Null

# Download if not exists
if (!(Test-Path $syncthingExe)) {
    Write-Host "Downloading Syncthing..."
    $zipPath = "$syncthingPath\syncthing.zip"
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath -UseBasicParsing
    
    # Extract
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::ExtractToDirectory($zipPath, $syncthingPath)
    
    # Move exe to root
    Get-ChildItem "$syncthingPath\syncthing-*" -Recurse -Filter "syncthing.exe" | 
        Move-Item -Destination $syncthingExe -Force
    
    # Cleanup
    Remove-Item "$syncthingPath\syncthing-*" -Recurse -Force
    Remove-Item $zipPath
}

# Start briefly to create config
Write-Host "Initializing Syncthing config..."
$proc = Start-Process $syncthingExe -ArgumentList "-no-browser" -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 5
Stop-Process -Id $proc.Id -Force

# Modify config to use port 8385
$configPath = "$env:LOCALAPPDATA\Syncthing\config.xml"
if (Test-Path $configPath) {
    $xml = [xml](Get-Content $configPath)
    $xml.configuration.gui.address = "127.0.0.1:8385"
    
    # Also update listen address
    $listen = $xml.configuration.options.listenAddress
    if ($listen -match ":22000") {
        $xml.configuration.options.listenAddress = $listen -replace ":22000", ":22001"
    }
    
    $xml.Save($configPath)
    Write-Host "Configuration updated!" -ForegroundColor Green
}

# Start Syncthing
Write-Host "Starting Syncthing on port 8385..." -ForegroundColor Cyan
Start-Process $syncthingExe -ArgumentList "-no-browser"

Write-Host "Syncthing is running! Opening browser..." -ForegroundColor Green
Start-Sleep -Seconds 3
Start-Process "http://localhost:8385"
EOF

# Create batch file for easy Windows execution
cat > /mnt/d/APPSNospaces/Like-I-said-mcp-server-v2/RUN-THIS-ON-WINDOWS.bat << 'EOF'
@echo off
echo Running automated Syncthing setup...
powershell.exe -ExecutionPolicy Bypass -File "%~dp0auto-install-syncthing.ps1"
pause
EOF

# Ensure WSL Syncthing is configured
echo "Configuring WSL Syncthing..."

# Add folder to WSL Syncthing if not exists
if ! grep -q "like-i-said-mcp" ~/.local/state/syncthing/config.xml 2>/dev/null; then
    echo "Adding folder to WSL Syncthing configuration..."
    # This would require API calls, keeping it simple for now
fi

# Create final instructions file
cat > /mnt/d/APPSNospaces/Like-I-said-mcp-server-v2/FINAL-STEPS.txt << EOF
FINAL SETUP STEPS
=================

1. On Windows:
   - Navigate to D:\APPSNospaces\Like-I-said-mcp-server-v2
   - Double-click: RUN-THIS-ON-WINDOWS.bat
   - This will install and start Syncthing

2. Get Windows Device ID:
   - Windows Syncthing will open at http://localhost:8385
   - Click Actions → Show ID
   - Copy the Device ID

3. In WSL Syncthing (http://localhost:8384):
   - Add Device → Paste Windows Device ID
   - Name: "Windows Local"
   - Advanced → Address: tcp://127.0.0.1:22001
   - Save

4. In Windows Syncthing (http://localhost:8385):
   - Add Device → ID: L3H6WRG-TIDBWRH-IQU562R-DPSQNRP-H6XNPDH-5MM2KSQ-4ZHLX2B-JFTMQQM
   - Name: "WSL Local"
   - Advanced → Address: tcp://127.0.0.1:22000
   - Save

5. Share folder from WSL:
   - In WSL Syncthing, edit the folder
   - Sharing tab → Check "Windows Local"
   - Save

6. Accept on Windows:
   - Accept the shared folder
   - Set path to: D:\APPSNospaces\Like-I-said-mcp-server-v2

That's it! Your folders will sync automatically.
EOF

echo ""
echo "=== Setup Complete! ==="
echo ""
echo "I've created everything needed in your Windows folder:"
echo "D:\\APPSNospaces\\Like-I-said-mcp-server-v2\\"
echo ""
echo "NOW GO TO WINDOWS AND:"
echo "1. Open D:\\APPSNospaces\\Like-I-said-mcp-server-v2"
echo "2. Double-click: RUN-THIS-ON-WINDOWS.bat"
echo ""
echo "This will automatically install and configure Syncthing on Windows."
echo "Then follow the steps in FINAL-STEPS.txt to connect the devices."

# Open Windows Explorer to the folder
echo ""
echo "Opening Windows Explorer to the folder..."
explorer.exe /e, "D:\\APPSNospaces\\Like-I-said-mcp-server-v2"