# WSL2 Port Forwarding Setup Script
# Run this script in PowerShell as Administrator

Write-Host "Setting up WSL2 port forwarding..." -ForegroundColor Green

# Get WSL2 IP address
$wslIp = (wsl hostname -I).Trim().Split()[0]
Write-Host "WSL2 IP Address: $wslIp" -ForegroundColor Yellow

# Define ports to forward
$ports = @(3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010, 5173, 8080)

# Remove any existing port proxy rules
Write-Host "Removing existing port forwarding rules..." -ForegroundColor Yellow
netsh interface portproxy reset

# Add port forwarding rules
Write-Host "Adding port forwarding rules..." -ForegroundColor Yellow
foreach ($port in $ports) {
    netsh interface portproxy add v4tov4 listenport=$port listenaddress=0.0.0.0 connectport=$port connectaddress=$wslIp
    Write-Host "  - Forwarded port $port" -ForegroundColor Gray
}

# Add firewall rules
Write-Host "Configuring Windows Firewall..." -ForegroundColor Yellow

# Remove existing firewall rules
Get-NetFirewallRule -DisplayName "WSL2 Development Ports" -ErrorAction SilentlyContinue | Remove-NetFirewallRule

# Add new firewall rule
New-NetFirewallRule -DisplayName "WSL2 Development Ports" `
    -Direction Inbound `
    -Action Allow `
    -Protocol TCP `
    -LocalPort ($ports -join ",") `
    -Profile Any

# Add WSL interface rule
New-NetFirewallRule -DisplayName "WSL2 Interface" `
    -Direction Inbound `
    -InterfaceAlias "vEthernet (WSL)" `
    -Action Allow `
    -Profile Any `
    -ErrorAction SilentlyContinue

Write-Host "`nPort forwarding setup complete!" -ForegroundColor Green
Write-Host "You can now access WSL2 services via localhost on Windows" -ForegroundColor Green

# Show current port forwarding rules
Write-Host "`nCurrent port forwarding rules:" -ForegroundColor Cyan
netsh interface portproxy show v4tov4

Write-Host "`nIMPORTANT: Run this script again after restarting Windows or WSL2" -ForegroundColor Yellow
Write-Host "because WSL2 IP address changes on restart." -ForegroundColor Yellow