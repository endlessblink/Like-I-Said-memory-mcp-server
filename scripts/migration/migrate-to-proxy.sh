#!/bin/bash

# Like-I-Said MCP Migration Script
# Safely migrate from monolithic to proxy architecture

set -e

echo "================================================"
echo "Like-I-Said MCP Migration to Proxy Architecture"
echo "================================================"
echo ""

# Check prerequisites
check_prerequisites() {
    echo "Checking prerequisites..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js is not installed"
        exit 1
    fi
    
    # Check if dashboard server exists
    if [ ! -f "dashboard-server-bridge.js" ]; then
        echo "❌ dashboard-server-bridge.js not found"
        exit 1
    fi
    
    # Check if proxy server exists
    if [ ! -f "server-markdown-proxy.js" ]; then
        echo "❌ server-markdown-proxy.js not found"
        exit 1
    fi
    
    echo "✅ Prerequisites check passed"
    echo ""
}

# Backup current configuration
backup_config() {
    echo "Creating backup of current configuration..."
    
    BACKUP_DIR="backups/migration-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # Backup Claude config if it exists
    if [ -f "$HOME/.claude/mcp_settings.json" ]; then
        cp "$HOME/.claude/mcp_settings.json" "$BACKUP_DIR/mcp_settings.json.bak"
        echo "  ✅ Backed up Claude config"
    fi
    
    # Backup Cursor config if it exists
    if [ -f "$HOME/.cursor/mcp.json" ]; then
        cp "$HOME/.cursor/mcp.json" "$BACKUP_DIR/cursor_mcp.json.bak"
        echo "  ✅ Backed up Cursor config"
    fi
    
    # Backup Windsurf config if it exists
    if [ -f "$HOME/.codeium/windsurf/mcp_config.json" ]; then
        cp "$HOME/.codeium/windsurf/mcp_config.json" "$BACKUP_DIR/windsurf_mcp_config.json.bak"
        echo "  ✅ Backed up Windsurf config"
    fi
    
    echo "  📁 Backups saved to: $BACKUP_DIR"
    echo ""
}

# Start dashboard server
start_dashboard() {
    echo "Starting dashboard server..."
    
    # Check if already running
    if lsof -i:8776 > /dev/null 2>&1; then
        echo "  ℹ️  Dashboard server already running on port 8776"
    else
        # Start in background
        nohup node dashboard-server-bridge.js > dashboard.log 2>&1 &
        DASHBOARD_PID=$!
        
        # Wait for startup
        sleep 3
        
        # Verify it started
        if lsof -i:8776 > /dev/null 2>&1; then
            echo "  ✅ Dashboard server started (PID: $DASHBOARD_PID)"
            echo $DASHBOARD_PID > .dashboard.pid
        else
            echo "  ❌ Failed to start dashboard server"
            echo "  Check dashboard.log for errors"
            exit 1
        fi
    fi
    
    echo ""
}

# Test proxy connection
test_proxy() {
    echo "Testing proxy connection..."
    
    # Test the health endpoint
    if curl -s http://localhost:8776/api/health > /dev/null 2>&1; then
        echo "  ✅ Dashboard API is accessible"
    else
        echo "  ❌ Cannot reach dashboard API"
        exit 1
    fi
    
    # Test MCP tools endpoint
    RESPONSE=$(curl -s http://localhost:8776/api/mcp-tools/list-tools)
    if echo "$RESPONSE" | grep -q "add_memory"; then
        echo "  ✅ MCP tools endpoint is working"
    else
        echo "  ❌ MCP tools endpoint not working"
        exit 1
    fi
    
    echo ""
}

# Update MCP client configuration
update_client_config() {
    echo "Updating MCP client configuration..."
    echo ""
    echo "Choose your MCP client:"
    echo "1) Claude Code"
    echo "2) Cursor"
    echo "3) Windsurf"
    echo "4) All of the above"
    echo "5) Skip configuration"
    
    read -p "Enter choice (1-5): " choice
    
    case $choice in
        1)
            update_claude_config
            ;;
        2)
            update_cursor_config
            ;;
        3)
            update_windsurf_config
            ;;
        4)
            update_claude_config
            update_cursor_config
            update_windsurf_config
            ;;
        5)
            echo "  ⚠️  Skipping client configuration"
            echo "  You'll need to manually update your MCP client config"
            ;;
        *)
            echo "  ❌ Invalid choice"
            exit 1
            ;;
    esac
    
    echo ""
}

# Update Claude Code configuration
update_claude_config() {
    CONFIG_FILE="$HOME/.claude/mcp_settings.json"
    
    if [ ! -f "$CONFIG_FILE" ]; then
        echo "  ⚠️  Claude config not found at $CONFIG_FILE"
        echo "  Creating new configuration..."
        mkdir -p "$HOME/.claude"
    fi
    
    # Create new config with proxy
    cat > "$CONFIG_FILE.new" << 'EOF'
{
  "mcpServers": {
    "like-i-said-mcp": {
      "command": "node",
      "args": ["INSTALL_PATH/server-markdown-proxy.js"],
      "env": {}
    }
  }
}
EOF
    
    # Replace INSTALL_PATH with actual path
    INSTALL_PATH=$(pwd)
    sed -i "s|INSTALL_PATH|$INSTALL_PATH|g" "$CONFIG_FILE.new"
    
    # Move new config into place
    mv "$CONFIG_FILE.new" "$CONFIG_FILE"
    echo "  ✅ Updated Claude Code configuration"
}

# Update Cursor configuration
update_cursor_config() {
    CONFIG_FILE="$HOME/.cursor/mcp.json"
    
    if [ ! -f "$CONFIG_FILE" ]; then
        echo "  ⚠️  Cursor config not found at $CONFIG_FILE"
        echo "  Creating new configuration..."
        mkdir -p "$HOME/.cursor"
    fi
    
    # Create new config with proxy
    cat > "$CONFIG_FILE.new" << 'EOF'
{
  "mcpServers": {
    "like-i-said-memory-v2": {
      "command": "node",
      "args": ["INSTALL_PATH/server-markdown-proxy.js"],
      "env": {}
    }
  }
}
EOF
    
    # Replace INSTALL_PATH with actual path
    INSTALL_PATH=$(pwd)
    sed -i "s|INSTALL_PATH|$INSTALL_PATH|g" "$CONFIG_FILE.new"
    
    # Move new config into place
    mv "$CONFIG_FILE.new" "$CONFIG_FILE"
    echo "  ✅ Updated Cursor configuration"
}

# Update Windsurf configuration
update_windsurf_config() {
    CONFIG_FILE="$HOME/.codeium/windsurf/mcp_config.json"
    
    if [ ! -f "$CONFIG_FILE" ]; then
        echo "  ⚠️  Windsurf config not found at $CONFIG_FILE"
        echo "  Creating new configuration..."
        mkdir -p "$HOME/.codeium/windsurf"
    fi
    
    # Create new config with proxy
    cat > "$CONFIG_FILE.new" << 'EOF'
{
  "mcpServers": {
    "like-i-said-memory-v2": {
      "command": "node",
      "args": ["INSTALL_PATH/server-markdown-proxy.js"],
      "env": {}
    }
  }
}
EOF
    
    # Replace INSTALL_PATH with actual path
    INSTALL_PATH=$(pwd)
    sed -i "s|INSTALL_PATH|$INSTALL_PATH|g" "$CONFIG_FILE.new"
    
    # Move new config into place
    mv "$CONFIG_FILE.new" "$CONFIG_FILE"
    echo "  ✅ Updated Windsurf configuration"
}

# Kill old MCP processes
cleanup_old_processes() {
    echo "Cleaning up old MCP processes..."
    
    # Kill any running server-markdown.js processes
    if pgrep -f "server-markdown.js" > /dev/null; then
        echo "  Found old MCP server processes, terminating..."
        pkill -f "server-markdown.js" || true
        sleep 2
        echo "  ✅ Cleaned up old processes"
    else
        echo "  ✅ No old processes found"
    fi
    
    echo ""
}

# Main migration flow
main() {
    echo "This script will migrate your Like-I-Said MCP installation"
    echo "from the monolithic architecture to the new proxy architecture."
    echo ""
    echo "Benefits of the new architecture:"
    echo "  ✨ No more duplicate process issues"
    echo "  ✨ No more API Error 500"
    echo "  ✨ Better performance and reliability"
    echo "  ✨ Shared state across all MCP clients"
    echo ""
    
    read -p "Continue with migration? (y/n): " confirm
    if [ "$confirm" != "y" ]; then
        echo "Migration cancelled"
        exit 0
    fi
    
    echo ""
    
    # Run migration steps
    check_prerequisites
    backup_config
    cleanup_old_processes
    start_dashboard
    test_proxy
    update_client_config
    
    echo "================================================"
    echo "Migration Complete!"
    echo "================================================"
    echo ""
    echo "✅ Dashboard server running on port 8776"
    echo "✅ MCP proxy configured for your client(s)"
    echo ""
    echo "Next steps:"
    echo "1. Restart your MCP client (Claude Code, Cursor, or Windsurf)"
    echo "2. Test the connection with the 'test_tool' command"
    echo "3. Your memories and tasks are preserved and ready to use"
    echo ""
    echo "To stop the dashboard server:"
    echo "  kill \$(cat .dashboard.pid)"
    echo ""
    echo "To restore old configuration:"
    echo "  Check the backups/ directory"
    echo ""
}

# Run main migration
main