#!/bin/bash
# Build Like-I-Said Dashboard Installer

echo "========================================"
echo "Building Like-I-Said Dashboard Installer"
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

# Build the dashboard UI
echo "Building dashboard UI..."
npm run build

# Run the build script
echo "Creating standalone executables..."
node scripts/build-dashboard-installer.js

echo
echo "========================================"
echo "Build complete!"
echo
echo "Next steps:"
echo "1. Test the executable in dist-installer/"
echo "2. Run Inno Setup with installer/windows-installer.iss (Windows only)"
echo "3. Distribute the installer!"
echo "========================================"
echo