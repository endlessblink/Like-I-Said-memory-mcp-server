#!/bin/bash

# Safe MCP Testing Script for Claude Code
# This script provides the safest way to test the unified MCP server

echo "🧪 SAFE MCP TESTING PROCEDURE"
echo "================================="

# Function to backup existing config
backup_config() {
    CLAUDE_CONFIG="$HOME/.claude/claude_desktop_config.json"
    if [ -f "$CLAUDE_CONFIG" ]; then
        cp "$CLAUDE_CONFIG" "$CLAUDE_CONFIG.backup-$(date +%Y%m%d-%H%M%S)"
        echo "✅ Existing config backed up"
    else
        echo "ℹ️  No existing Claude config found"
    fi
}

# Function to install test config
install_test_config() {
    CLAUDE_CONFIG="$HOME/.claude/claude_desktop_config.json"
    mkdir -p "$(dirname "$CLAUDE_CONFIG")"
    
    # Use absolute path to current directory
    CURRENT_DIR="$(pwd)"
    
    cat > "$CLAUDE_CONFIG" << EOF
{
  "mcpServers": {
    "like-i-said-unified-test": {
      "command": "node",
      "args": ["$CURRENT_DIR/server-unified.js"],
      "env": { 
        "MCP_MODE": "minimal",
        "MCP_QUIET": "true"
      }
    }
  }
}
EOF
    echo "✅ Test config installed with minimal mode"
    echo "📁 Server path: $CURRENT_DIR/server-unified.js"
}

# Function to remove test config
remove_test_config() {
    CLAUDE_CONFIG="$HOME/.claude/claude_desktop_config.json"
    BACKUP=$(ls "$CLAUDE_CONFIG.backup-"* 2>/dev/null | tail -1)
    
    if [ -n "$BACKUP" ]; then
        mv "$BACKUP" "$CLAUDE_CONFIG"
        echo "✅ Original config restored from backup"
    else
        rm -f "$CLAUDE_CONFIG"
        echo "✅ Test config removed (no original config to restore)"
    fi
}

# Function to test server locally first
test_server_locally() {
    echo "🔍 Testing server locally first..."
    
    # Test minimal mode
    echo "Testing minimal mode startup..."
    timeout 10 bash -c 'MCP_MODE=minimal node server-unified.js &>/dev/null & PID=$!; sleep 3; kill $PID 2>/dev/null; echo "✅ Minimal mode starts successfully"'
    
    # Test MCP protocol
    echo "Testing MCP protocol..."
    RESPONSE=$(echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | timeout 5 MCP_MODE=minimal node server-unified.js 2>/dev/null | grep '"result"')
    if [ -n "$RESPONSE" ]; then
        echo "✅ MCP protocol working"
    else
        echo "❌ MCP protocol test failed"
        return 1
    fi
    
    return 0
}

# Main menu
case "${1:-menu}" in
    "install")
        echo "📦 INSTALLING TEST CONFIG"
        backup_config
        install_test_config
        echo ""
        echo "🚀 Next steps:"
        echo "1. Restart Claude Code"
        echo "2. Test MCP tools in a conversation"
        echo "3. Run '$0 remove' when done testing"
        ;;
    
    "remove")
        echo "🗑️  REMOVING TEST CONFIG"
        remove_test_config
        echo ""
        echo "✅ Test removed. Restart Claude Code to complete cleanup."
        ;;
    
    "test")
        echo "🧪 TESTING SERVER LOCALLY"
        if test_server_locally; then
            echo "✅ Local tests passed - server is ready"
        else
            echo "❌ Local tests failed - DO NOT install in Claude Code"
            exit 1
        fi
        ;;
    
    "emergency")
        echo "🚨 EMERGENCY REMOVAL"
        CLAUDE_CONFIG="$HOME/.claude/claude_desktop_config.json"
        rm -f "$CLAUDE_CONFIG"
        echo "✅ All Claude configs removed"
        echo "⚠️  Restart Claude Code immediately"
        ;;
    
    "status")
        CLAUDE_CONFIG="$HOME/.claude/claude_desktop_config.json"
        if [ -f "$CLAUDE_CONFIG" ]; then
            echo "📋 Current Claude Config:"
            cat "$CLAUDE_CONFIG" | jq . 2>/dev/null || cat "$CLAUDE_CONFIG"
        else
            echo "ℹ️  No Claude config found"
        fi
        ;;
    
    *)
        echo "🛡️  SAFE MCP TESTING OPTIONS"
        echo ""
        echo "Commands:"
        echo "  $0 test      - Test server locally first (RECOMMENDED)"
        echo "  $0 install   - Install test config in Claude Code"
        echo "  $0 remove    - Remove test config and restore original"
        echo "  $0 emergency - Emergency removal of all Claude configs"
        echo "  $0 status    - Show current Claude config"
        echo ""
        echo "💡 SAFE TESTING PROCEDURE:"
        echo "1. $0 test      (verify server works locally)"
        echo "2. $0 install   (add to Claude Code)"
        echo "3. Test in Claude Code conversation"
        echo "4. $0 remove    (clean removal when done)"
        echo ""
        echo "🚨 IF CLAUDE CODE BREAKS:"
        echo "   $0 emergency  (immediate fix)"
        ;;
esac