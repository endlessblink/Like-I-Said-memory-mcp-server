# Like-I-Said Dashboard Windows Executable

## Version 2.4.6 - Secure Edition

This executable includes:
- ✅ All hardcoded path fixes
- ✅ All security vulnerability fixes
- ✅ Authentication disabled by default
- ✅ Comprehensive logging
- ✅ Memory loading should work correctly

## How to Use

1. **Run directly**: Double-click `dashboard-windows.exe`
2. **Run with script**: Double-click `run-dashboard.bat`
3. **Run from command line**: `dashboard-windows.exe`

## Features

- Auto-detects available ports (skips busy ports like Flowise)
- Allows custom memory and task directory configuration
- Saves configuration between sessions
- Creates detailed logs in `logs/` directory

## First Run

On first run, you'll be prompted to:
1. Set your memory directory path
2. Set your task directory path
3. Choose whether to auto-open browser

## Troubleshooting

If memories don't load:
1. Check the `logs/` directory for detailed diagnostics
2. Ensure authentication is disabled (it is by default)
3. Verify your memory path is correct in the configuration

## Security

This version includes protection against:
- Path injection attacks
- Command injection vulnerabilities
- Configuration tampering
- Race conditions in port detection

## File Structure

```
dist-dashboard-executable/
├── dashboard-windows.exe    # Main executable
├── run-dashboard.bat       # Batch file to run dashboard
├── README.md              # This file
└── package.json          # Build configuration
```
