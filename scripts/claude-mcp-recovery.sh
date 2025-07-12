#!/bin/bash

# Claude Code MCP Error Recovery Script
# Specifically handles MCP tool integration errors

echo "🔧 Claude Code MCP Error Recovery"
echo "================================="
echo ""

# Function to test MCP server health
test_mcp_server() {
    echo "🏥 Testing MCP server health..."
    
    if timeout 10 bash -c 'echo "{\"jsonrpc\": \"2.0\", \"id\": 1, \"method\": \"tools/list\"}" | node server-markdown.js > /dev/null 2>&1'; then
        echo "✅ MCP server is responding"
        return 0
    else
        echo "❌ MCP server not responding"
        return 1
    fi
}

# Function to get tool count from MCP server
get_tool_count() {
    echo "🔍 Checking MCP tool count..."
    
    TOOL_COUNT=$(echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | timeout 5 node server-markdown.js 2>/dev/null | grep -o '"name"' | wc -l)
    
    if [ "$TOOL_COUNT" -eq 6 ]; then
        echo "✅ MCP server has 6 tools (correct)"
    else
        echo "⚠️  MCP server has $TOOL_COUNT tools (expected 6)"
    fi
}

# Function to generate recovery message
generate_recovery_message() {
    echo ""
    echo "📋 MCP Error Recovery Steps:"
    echo ""
    
    # Try to extract tool_use_id from recent error if available
    echo "1. Find the tool_use_id from the error message"
    echo "   Look for: toolu_[random_string]"
    echo ""
    
    read -p "   Enter the tool_use_id (or press Enter to use template): " TOOL_ID
    
    if [ -z "$TOOL_ID" ]; then
        TOOL_ID="REPLACE_WITH_ACTUAL_ID"
    fi
    
    echo ""
    echo "2. Copy and paste this recovery message into Claude Code:"
    echo "   ============================================"
    cat << EOF
{
  "type": "tool_result",
  "tool_use_id": "$TOOL_ID",
  "is_error": true,
  "content": "MCP Error Recovery: Tool execution failed due to MCP integration issue. Server status checked and operational."
}
EOF
    echo "   ============================================"
    echo ""
    
    echo "3. Then send this command in Claude Code:"
    echo "   /reset-tools"
    echo ""
    
    echo "4. If that doesn't work, send:"
    echo "   /clear-context"
    echo ""
}

# Function to restart MCP server if needed
restart_mcp_server() {
    echo "🔄 Restarting MCP server..."
    
    # Kill any existing server processes
    pkill -f "server-markdown.js" 2>/dev/null
    sleep 2
    
    # Start server in background for testing
    nohup node server-markdown.js > /dev/null 2>&1 &
    SERVER_PID=$!
    
    sleep 3
    
    # Test if it started correctly
    if test_mcp_server; then
        echo "✅ MCP server restarted successfully"
        kill $SERVER_PID 2>/dev/null
    else
        echo "❌ MCP server restart failed"
        kill $SERVER_PID 2>/dev/null
    fi
}

# Main recovery workflow
main() {
    echo "🚨 MCP-Specific Error Recovery Mode"
    echo ""
    
    # Step 1: Test MCP server
    if test_mcp_server; then
        get_tool_count
        echo ""
        echo "🟢 MCP server is healthy - error is likely in Claude Code integration"
        generate_recovery_message
    else
        echo ""
        echo "🔴 MCP server has issues - attempting restart"
        restart_mcp_server
        echo ""
        
        if test_mcp_server; then
            echo "🟢 MCP server fixed - try Claude Code session again"
            generate_recovery_message
        else
            echo "🔴 MCP server restart failed"
            echo ""
            echo "Manual steps:"
            echo "1. Check if Node.js is running: ps aux | grep node"
            echo "2. Kill all node processes: pkill node"
            echo "3. Restart manually: node server-markdown.js"
            echo "4. Test: echo '{\"jsonrpc\": \"2.0\", \"id\": 1, \"method\": \"tools/list\"}' | node server-markdown.js"
        fi
    fi
    
    echo ""
    echo "📚 Prevention Tips:"
    echo "- Always start MCP sessions with: test_tool"
    echo "- Use limits on list operations: list_memories(limit=5)"
    echo "- Keep responses under 15k tokens"
    echo "- Read claude-code-mcp-protocol.md before starting"
    echo ""
    
    # Save recovery template
    cat > .mcp-recovery-template.json << EOF
{
  "type": "tool_result",
  "tool_use_id": "REPLACE_WITH_ACTUAL_ID",
  "is_error": true,
  "content": "MCP Error Recovery: Tool execution failed due to MCP integration issue."
}
EOF
    
    echo "💾 Recovery template saved to .mcp-recovery-template.json"
}

# Run main function
main