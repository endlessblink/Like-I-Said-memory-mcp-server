# WSL2 Dashboard Access Setup Guide

This guide will help you access the Like-I-Said dashboard from Windows Firefox when running in WSL2.

## Quick Fix (Most Reliable)

### Step 1: Disable Windows Fast Startup
This is the #1 cause of WSL2 networking issues!

1. Open **Control Panel** → **Power Options**
2. Click **"Choose what the power buttons do"**
3. Click **"Change settings that are currently unavailable"**
4. **UNCHECK** "Turn on fast startup (recommended)"
5. Click **Save changes**
6. **RESTART** your computer (don't just shutdown)

### Step 2: Set Up Port Forwarding

1. Open **PowerShell as Administrator**
2. Navigate to the project directory:
   ```powershell
   cd D:\APPSNospaces\like-i-said-mcp-server-v2
   ```
3. Run the setup script:
   ```powershell
   .\setup-wsl-port-forwarding.ps1
   ```

### Step 3: Start the Dashboard

In WSL2:
```bash
./start-dashboard-wsl.sh
```

Then access in Firefox: **http://localhost:3010**

## Alternative Solutions

### Option A: Use Mirrored Networking (Windows 11 Only)

1. Create `.wslconfig` file:
   ```powershell
   notepad $env:USERPROFILE\.wslconfig
   ```

2. Add this content:
   ```ini
   [wsl2]
   networkingMode=mirrored
   localhostForwarding=true
   ```

3. Restart WSL:
   ```powershell
   wsl --shutdown
   ```

### Option B: Direct IP Access

1. In WSL2, find your IP:
   ```bash
   hostname -I
   ```

2. Access dashboard using that IP:
   ```
   http://172.29.98.150:3010
   ```

## Troubleshooting

### If Firefox still can't connect:

1. **Check Windows Defender Firewall**:
   - Open Windows Defender Firewall
   - Click "Allow an app or feature"
   - Make sure "Node.js" is allowed for both Private and Public networks

2. **Run port forwarding again** (WSL2 IP changes on restart):
   ```powershell
   .\setup-wsl-port-forwarding.ps1
   ```

3. **Try a different browser** (Edge or Chrome) to rule out Firefox-specific issues

### Common Issues:

- **"Unable to connect"**: Fast Startup is likely enabled - disable it and restart
- **Port forwarding stops working**: Run the PowerShell script again after Windows restart
- **Can't find .wslconfig**: Create it in `C:\Users\YOUR_USERNAME\.wslconfig`

## Manual Port Forwarding

If the script doesn't work, manually forward a port:

```powershell
# In PowerShell as Administrator
$wslIp = (wsl hostname -I).Trim()
netsh interface portproxy add v4tov4 listenport=3010 listenaddress=0.0.0.0 connectport=3010 connectaddress=$wslIp
```

## Important Notes

- WSL2 IP address changes every time Windows restarts
- Port forwarding needs to be re-run after Windows restart
- Mirrored networking mode is the best long-term solution for Windows 11
- Fast Startup MUST be disabled for reliable WSL2 networking