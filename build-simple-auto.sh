#!/bin/bash
# Build simple auto-port version

echo "Building Simple Auto-Port Dashboard..."

# Create output directory
mkdir -p dist-installer-simple

# Build with pkg
pkg dashboard-launcher-simple-auto.cjs \
  --target node18-win-x64 \
  --output dist-installer-simple/dashboard-simple-auto.exe \
  --config package-dashboard-auto.json

pkg dashboard-launcher-simple-auto.cjs \
  --target node18-linux-x64 \
  --output dist-installer-simple/dashboard-simple-auto-linux \
  --config package-dashboard-auto.json

echo "Build complete!"
echo "Files in dist-installer-simple/"
echo
echo "This version will:"
echo "- Always skip port 3001 if busy"
echo "- Try ports 3001-3020"
echo "- Create dashboard-simple.log"
echo "- Show clear port selection"