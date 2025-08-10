#!/bin/bash

echo "=== System Change Diagnostic Tool ==="
echo "Checking for recent updates and changes that might affect WSL2 networking..."
echo ""

# Check WSL2 version and kernel
echo "1. WSL2 Version Information:"
echo "----------------------------"
if command -v wsl.exe &> /dev/null; then
    echo "WSL Version:"
    wsl.exe --version 2>/dev/null || echo "WSL version command not available"
else
    echo "Running from inside WSL2, checking kernel:"
    uname -r
    cat /proc/version
fi
echo ""

# Check Windows version (from WSL)
echo "2. Windows Version:"
echo "-------------------"
if [ -f /proc/version ]; then
    grep -o 'Microsoft.*' /proc/version
fi
echo ""

# Check recent apt updates in WSL
echo "3. Recent WSL2 Ubuntu Updates (last 7 days):"
echo "--------------------------------------------"
if [ -f /var/log/apt/history.log ]; then
    echo "Recent package updates:"
    grep -A 2 "Start-Date:" /var/log/apt/history.log | tail -20
else
    echo "No apt history log found"
fi
echo ""

# Check Node.js version
echo "4. Node.js Version:"
echo "-------------------"
node --version
npm --version
echo ""

# Check network interfaces
echo "5. Network Interfaces:"
echo "----------------------"
ip addr show | grep -E "^[0-9]+:|inet "
echo ""

# Check if localhost is resolving correctly
echo "6. Localhost Resolution:"
echo "------------------------"
getent hosts localhost
getent hosts 127.0.0.1
echo ""

# Check if any firewall is active in WSL
echo "7. WSL Firewall Status:"
echo "-----------------------"
if command -v ufw &> /dev/null; then
    sudo ufw status 2>/dev/null || echo "UFW not configured or no sudo access"
else
    echo "No firewall detected in WSL"
fi
echo ""

# Check listening ports
echo "8. Currently Listening Ports:"
echo "-----------------------------"
ss -tlnp 2>/dev/null | grep LISTEN || netstat -tlnp 2>/dev/null | grep LISTEN
echo ""

# Check for .wslconfig
echo "9. WSL Configuration:"
echo "---------------------"
if [ -f "/mnt/c/Users/$USER/.wslconfig" ]; then
    echo "Found .wslconfig file"
    cat "/mnt/c/Users/$USER/.wslconfig"
else
    echo "No .wslconfig file found (using defaults)"
fi
echo ""

# Check recent Windows Event logs for WSL-related entries
echo "10. Recent System Changes (based on file timestamps):"
echo "-----------------------------------------------------"
echo "Recently modified system files (last 7 days):"
find /mnt/c/Windows/System32/lxss -type f -mtime -7 2>/dev/null | head -10 || echo "Cannot access Windows system files"
echo ""

# Test network connectivity
echo "11. Network Connectivity Test:"
echo "------------------------------"
echo "Testing localhost connectivity:"
timeout 2 curl -s http://localhost:3001 &>/dev/null && echo "✓ Can connect to localhost:3001 from WSL" || echo "✗ Cannot connect to localhost:3001 from WSL"
echo ""

# Check WSL2 IP
echo "12. WSL2 Network Information:"
echo "-----------------------------"
echo "WSL2 IP address: $(hostname -I | awk '{print $1}')"
echo "Windows host IP (from WSL perspective): $(ip route show | grep default | awk '{print $3}')"
echo ""

echo "=== Diagnostic Complete ==="
echo ""
echo "Common causes of WSL2 localhost issues:"
echo "1. Windows Fast Startup is enabled (most common)"
echo "2. Recent Windows Update changed WSL2 networking"
echo "3. Hyper-V or Docker Desktop changed network settings"
echo "4. Windows Defender Firewall blocking connections"
echo "5. WSL2 kernel update changed networking behavior"