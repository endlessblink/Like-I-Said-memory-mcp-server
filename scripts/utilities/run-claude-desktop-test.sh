#!/bin/bash

echo "🖥️ Claude Desktop DXT Installation Test"
echo "===================================="
echo ""
echo "This will start a web-based Claude Desktop simulator"
echo "where you can visually test the DXT installation process."
echo ""

# Build the container
echo "📦 Building Claude Desktop test container..."
docker build -f Dockerfile.claude-simple -t claude-desktop-test .

if [ $? -ne 0 ]; then
    echo "❌ Failed to build container"
    exit 1
fi

echo ""
echo "🚀 Starting Claude Desktop test environment..."
echo ""
echo "🌐 The web interface will be available at:"
echo "   http://localhost:8080"
echo ""
echo "📋 What you can do:"
echo "   ✅ Install DXT extension (simulates drag-and-drop)"
echo "   ✅ Test MCP server connection"  
echo "   ✅ View installation logs"
echo "   ✅ See all 11 tools working"
echo ""
echo "🔄 Starting container..."
echo "   Press Ctrl+C to stop"
echo ""

# Start the container
docker run --rm -p 8080:8080 --name claude-desktop-test claude-desktop-test