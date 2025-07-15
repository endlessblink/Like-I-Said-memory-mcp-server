#!/bin/bash
# Build Like-I-Said Dashboard with Logging

echo "========================================"
echo "Building Dashboard with Logging Support"
echo "========================================"
echo

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed"
    exit 1
fi

# Build UI if needed
if [ ! -d "dist" ]; then
    echo "Building dashboard UI..."
    npm run build
fi

# Create output directory
mkdir -p dist-installer-logged

# Check pkg
if ! command -v pkg &> /dev/null; then
    echo "Installing pkg..."
    npm install -g pkg
fi

echo "Building CommonJS version with logging..."

# Build Windows executable from CommonJS version
pkg dashboard-launcher-auto-port-cjs.cjs \
  --target node18-win-x64 \
  --output dist-installer-logged/like-i-said-dashboard-logged.exe \
  --config package-dashboard-auto.json

# Build other platforms too
pkg dashboard-launcher-auto-port-cjs.cjs \
  --target node18-macos-x64 \
  --output dist-installer-logged/like-i-said-dashboard-logged-macos \
  --config package-dashboard-auto.json

pkg dashboard-launcher-auto-port-cjs.cjs \
  --target node18-linux-x64 \
  --output dist-installer-logged/like-i-said-dashboard-logged-linux \
  --config package-dashboard-auto.json

# Create troubleshooting guide
cat > dist-installer-logged/TROUBLESHOOTING.md << 'EOF'
# Troubleshooting Guide

## Log Files
When you run the dashboard, it creates a log file in the `logs` directory:
- Location: `logs/dashboard-[timestamp].log`
- Contains detailed startup information and error messages

## Common Issues

### Dashboard crashes immediately
1. Check the log file in the `logs` folder
2. Look for error messages about missing files or permissions
3. Try running as Administrator (Windows)

### Port conflicts
- The dashboard automatically finds an available port
- Check the console output to see which port was selected
- If all ports 3001-3101 are busy, free up a port

### Browser doesn't open
- Check the log file for browser launch errors
- Manually open: http://localhost:[PORT]
- The port number is shown in the console

### "Cannot find module" errors
- Ensure all files were extracted properly
- Check that no antivirus software is blocking files
- Try re-downloading and extracting

## Getting Help
1. Check the log file first
2. Include the log file contents when reporting issues
3. Report at: https://github.com/endlessblink/Like-I-Said-memory-mcp-server/issues
EOF

echo
echo "========================================"
echo "Build complete!"
echo
echo "Files in dist-installer-logged/:"
echo "- like-i-said-dashboard-logged.exe (Windows)"
echo "- like-i-said-dashboard-logged-macos (macOS)"
echo "- like-i-said-dashboard-logged-linux (Linux)"
echo
echo "These versions create detailed log files"
echo "in a 'logs' folder to help diagnose issues."
echo "========================================"