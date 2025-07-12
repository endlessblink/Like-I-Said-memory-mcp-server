#!/bin/bash
# Syncthing Health Check Script
# Run this anytime to verify sync is working

echo "🔍 Syncthing Health Check"
echo "========================="
echo ""

# Check WSL Syncthing
echo "1. WSL Syncthing (port 8384):"
if curl -s http://localhost:8384 > /dev/null; then
    echo "   ✅ Running and accessible"
    # Get connection count
    CONN_COUNT=$(curl -s http://localhost:8384/rest/system/connections 2>/dev/null | grep -o '"connected":true' | wc -l)
    echo "   📡 Connected devices: $CONN_COUNT"
else
    echo "   ❌ Not running or not accessible"
fi

echo ""

# Check Windows Syncthing
echo "2. Windows Syncthing (port 8385):"
if curl -s http://localhost:8385 > /dev/null; then
    echo "   ✅ Running and accessible"
else
    echo "   ❌ Not running or not accessible"
    echo "   💡 Start with: D:\\APPSNospaces\\syncthing\\syncthing.exe"
fi

echo ""

# Test actual sync functionality
echo "3. Sync Test:"
TEST_FILE="health-check-$(date +%s).txt"
TEST_CONTENT="Sync test at $(date)"

echo "   🧪 Creating test file: $TEST_FILE"
echo "$TEST_CONTENT" > "$TEST_FILE"

echo "   ⏳ Waiting 5 seconds for sync..."
sleep 5

# Check if file appeared on Windows side
if [ -f "/mnt/d/APPSNospaces/Like-I-said-mcp-server-v2/$TEST_FILE" ]; then
    WIN_CONTENT=$(cat "/mnt/d/APPSNospaces/Like-I-said-mcp-server-v2/$TEST_FILE")
    if [ "$TEST_CONTENT" = "$WIN_CONTENT" ]; then
        echo "   ✅ Sync working perfectly!"
        # Cleanup
        rm "$TEST_FILE"
        rm "/mnt/d/APPSNospaces/Like-I-said-mcp-server-v2/$TEST_FILE"
    else
        echo "   ⚠️  File synced but content differs"
        rm "$TEST_FILE"
        rm "/mnt/d/APPSNospaces/Like-I-said-mcp-server-v2/$TEST_FILE" 2>/dev/null
    fi
else
    echo "   ❌ Sync not working - file didn't appear on Windows"
    echo "   🔧 Check both Syncthing interfaces for errors"
    rm "$TEST_FILE"
fi

echo ""

# Check folder status
echo "4. Folder Status:"
WSL_FILES=$(ls -1 | wc -l)
WIN_FILES=$(ls -1 /mnt/d/APPSNospaces/Like-I-said-mcp-server-v2/ | wc -l)
echo "   📁 WSL files: $WSL_FILES"
echo "   📁 Windows files: $WIN_FILES"

if [ "$WSL_FILES" -eq "$WIN_FILES" ]; then
    echo "   ✅ File counts match"
else
    echo "   ⚠️  File counts differ - sync may be in progress"
fi

echo ""

# Quick recommendations
echo "5. Quick Access:"
echo "   🌐 WSL Syncthing: http://localhost:8384"
echo "   🌐 Windows Syncthing: http://localhost:8385"
echo ""
echo "6. If Problems:"
echo "   🔄 Restart WSL: systemctl --user restart syncthing"
echo "   🔄 Restart Windows: D:\\APPSNospaces\\syncthing\\syncthing.exe"
echo "   📖 Full guide: cat SYNCTHING-USER-GUIDE.md"

echo ""
echo "Health check complete! 🏁"