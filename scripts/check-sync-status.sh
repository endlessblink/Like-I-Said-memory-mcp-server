#!/bin/bash
echo "=== Syncthing Connection Verification ==="
echo ""

# Check WSL Syncthing connections
echo "1. WSL Syncthing Status (port 8384):"
echo "----------------------------------------"
# Get connections
CONNECTIONS_8384=$(curl -s http://localhost:8384/rest/system/connections | grep -o '"connected":true' | wc -l)
echo "   Connected devices: $CONNECTIONS_8384"

# Get folder status
FOLDER_STATUS=$(curl -s http://localhost:8384/rest/db/status?folder=like-i-said-mcp 2>/dev/null)
if [ ! -z "$FOLDER_STATUS" ]; then
    echo "   Folder 'like-i-said-mcp': Found"
    STATE=$(echo "$FOLDER_STATUS" | grep -oP '"state":"\K[^"]+' || echo "unknown")
    echo "   Sync state: $STATE"
    FILES=$(echo "$FOLDER_STATUS" | grep -oP '"localFiles":\K[0-9]+' || echo "0")
    echo "   Local files: $FILES"
fi

echo ""
echo "2. Windows Syncthing Status (port 8385):"
echo "----------------------------------------"
# Check if Windows Syncthing is accessible
if curl -s http://localhost:8385 > /dev/null 2>&1; then
    CONNECTIONS_8385=$(curl -s http://localhost:8385/rest/system/connections 2>/dev/null | grep -o '"connected":true' | wc -l)
    echo "   Connected devices: $CONNECTIONS_8385"
    
    # Check folder on Windows side
    FOLDER_WIN=$(curl -s http://localhost:8385/rest/db/status?folder=like-i-said-mcp 2>/dev/null)
    if [ ! -z "$FOLDER_WIN" ]; then
        echo "   Folder 'like-i-said-mcp': Found"
        STATE_WIN=$(echo "$FOLDER_WIN" | grep -oP '"state":"\K[^"]+' || echo "unknown")
        echo "   Sync state: $STATE_WIN"
        FILES_WIN=$(echo "$FOLDER_WIN" | grep -oP '"localFiles":\K[0-9]+' || echo "0")
        echo "   Local files: $FILES_WIN"
    else
        echo "   Folder 'like-i-said-mcp': Not found"
    fi
else
    echo "   ✗ Not accessible from WSL"
fi

echo ""
echo "3. Connection Test:"
echo "----------------------------------------"
if [ "$CONNECTIONS_8384" -gt 0 ] && [ "$CONNECTIONS_8385" -gt 0 ]; then
    echo "   ✓ CONNECTED: Both instances see each other!"
else
    echo "   ✗ NOT CONNECTED: Instances can't see each other"
fi

# Test file sync
echo ""
echo "4. Sync Test:"
echo "----------------------------------------"
TEST_FILE="sync-test-$(date +%s).txt"
echo "Testing sync from WSL to Windows..." > "$TEST_FILE"
echo "   Created test file: $TEST_FILE"
echo "   Waiting for sync..."
sleep 5

# Check if file exists on Windows side
if [ -f "/mnt/d/APPSNospaces/Like-I-said-mcp-server-v2/$TEST_FILE" ]; then
    echo "   ✓ SUCCESS: File synced to Windows!"
    # Cleanup
    rm "$TEST_FILE"
    rm "/mnt/d/APPSNospaces/Like-I-said-mcp-server-v2/$TEST_FILE" 2>/dev/null
else
    echo "   ✗ FAILED: File not found on Windows side"
    echo "   Check if folder is properly shared and accepted"
    rm "$TEST_FILE" 2>/dev/null
fi

echo ""
echo "=== Summary ==="
if [ "$CONNECTIONS_8384" -gt 0 ] && [ "$CONNECTIONS_8385" -gt 0 ] && [ "$STATE" = "idle" ]; then
    echo "✓ Everything is working correctly!"
    echo "  - Both Syncthing instances are connected"
    echo "  - Folder is shared and syncing"
    echo "  - Files will sync automatically between:"
    echo "    WSL: /home/endlessblink/projects/Like-I-said-mcp-server-v2"
    echo "    Win: D:\\APPSNospaces\\Like-I-said-mcp-server-v2"
else
    echo "⚠ Setup may need completion:"
    echo "  - Make sure devices are added to each other"
    echo "  - Make sure folder is shared from WSL and accepted on Windows"
    echo "  - Check that both paths are correct"
fi