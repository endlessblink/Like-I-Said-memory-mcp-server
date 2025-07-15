#!/bin/bash
# Build Like-I-Said Dashboard Installer with Auto Port Detection

echo "========================================"
echo "Building Like-I-Said Dashboard"
echo "    with Auto Port Detection"
echo "========================================"
echo

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Build the dashboard UI if needed
if [ ! -d "dist" ]; then
    echo "Building dashboard UI..."
    npm run build
fi

# Create output directory
mkdir -p dist-installer-auto

# Check if pkg is installed
if ! command -v pkg &> /dev/null; then
    echo "Installing pkg..."
    npm install -g pkg
fi

# Build executables with auto-port detection
echo "Creating standalone executables with auto-port detection..."

# Build for Windows
echo "Building Windows executable..."
pkg dashboard-launcher-auto-port.js \
  --target node18-win-x64 \
  --output dist-installer-auto/like-i-said-dashboard-auto.exe \
  --config package-dashboard-auto.json

# Build for macOS
echo "Building macOS executable..."
pkg dashboard-launcher-auto-port.js \
  --target node18-macos-x64 \
  --output dist-installer-auto/like-i-said-dashboard-auto-macos \
  --config package-dashboard-auto.json

# Build for Linux
echo "Building Linux executable..."
pkg dashboard-launcher-auto-port.js \
  --target node18-linux-x64 \
  --output dist-installer-auto/like-i-said-dashboard-auto-linux \
  --config package-dashboard-auto.json

# Create README
cat > dist-installer-auto/README.md << 'EOF'
# Like-I-Said Dashboard - Auto Port Detection

These executables automatically find an available port and start the dashboard.

## Features

- **Automatic Port Detection**: Finds the first available port starting from 3001
- **Conflict Resolution**: If port 3001 is busy (e.g., Flowise), automatically uses 3002, 3003, etc.
- **Smart Detection**: If dashboard is already running, opens existing instance
- **No Configuration**: Just run and it works!

## Files

- `like-i-said-dashboard-auto.exe` - Windows (auto-port)
- `like-i-said-dashboard-auto-macos` - macOS (auto-port)
- `like-i-said-dashboard-auto-linux` - Linux (auto-port)

## Usage

Just double-click the executable! The dashboard will:

1. Check if it's already running
2. Find an available port if needed
3. Start the server
4. Open your browser automatically
5. Show the port being used in the console

No configuration needed - it just works!
EOF

echo
echo "========================================"
echo "Build complete!"
echo
echo "Executables with auto-port detection are in:"
echo "  dist-installer-auto/"
echo
echo "Features:"
echo "- Automatically finds available port"
echo "- Works even if port 3001 is busy"
echo "- No configuration needed"
echo "========================================"