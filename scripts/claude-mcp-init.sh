#!/bin/bash

# Claude Code MCP-Aware Session Initializer
# Run this before starting any Claude Code session that uses MCP tools

echo "🚀 Initializing Claude Code with MCP-Aware Error Handling"
echo "========================================================="
echo ""

# Test MCP server first
echo "🏥 Pre-flight MCP Health Check..."

if timeout 10 bash -c 'echo "{\"jsonrpc\": \"2.0\", \"id\": 1, \"method\": \"tools/list\"}" | node server-markdown.js > /dev/null 2>&1'; then
    TOOL_COUNT=$(echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node server-markdown.js 2>/dev/null | grep -o '"name"' | wc -l)
    echo "✅ MCP server healthy - $TOOL_COUNT tools available"
else
    echo "❌ MCP server not responding - starting server..."
    nohup node server-markdown.js > /dev/null 2>&1 &
    sleep 3
    echo "🔄 MCP server started in background"
fi

echo ""

# Set environment variables for MCP-aware mode
export CLAUDE_MODE="agentic"
export CLAUDE_MAX_TOKENS="4096"
export CLAUDE_MCP_SAFE_MODE="true"
export CLAUDE_MCP_TIMEOUT="30000"
export CLAUDE_MCP_MAX_RESPONSE="15000"

echo "🔧 Environment configured for MCP safety:"
echo "   - Mode: agentic (better error handling)"
echo "   - Max tokens: 4096 (prevents overflow)" 
echo "   - MCP timeout: 30 seconds"
echo "   - Response limit: 15k tokens"
echo ""

# Create session protocol reminder
cat > .claude-mcp-session-rules.md << 'EOF'
# 🚨 ACTIVE: MCP-Aware Error Handling

## Before Using ANY MCP Tool:
1. ✅ Start with: test_tool(message="Session health check")
2. ✅ Use limits: list_memories(limit=5)
3. ✅ Monitor size: Keep responses under 15k tokens

## If MCP Tool Errors Occur:
1. 🛑 Don't panic - tool_use/tool_result errors are recoverable
2. 📋 Copy tool_use_id from error message
3. 📤 Send tool_result with is_error: true
4. 🔄 Use /reset-tools command

## Emergency Recovery:
- Run: ./claude-mcp-recovery.sh
- Manual: cat .mcp-recovery-template.json

## Safe MCP Patterns:
- test_tool ✅ (always safe)
- add_memory(short content) ✅
- list_memories(limit=5) ✅  
- get_memory(specific_id) ✅
- search_memories(specific query) ✅
- delete_memory(specific_id) ✅

## Unsafe Patterns:
- list_memories() ❌ (no limit)
- search_memories("*") ❌ (too broad)
- add_memory(huge content) ❌ (token overflow)
EOF

echo "📚 Session rules created: .claude-mcp-session-rules.md"
echo ""

# Create quick recovery template  
cat > .mcp-quick-recovery.json << 'EOF'
{
  "type": "tool_result",
  "tool_use_id": "REPLACE_WITH_ACTUAL_ID",
  "is_error": true,
  "content": "MCP tool execution failed - session recovery initiated"
}
EOF

echo "🚑 Quick recovery template: .mcp-quick-recovery.json"
echo ""

echo "✅ MCP-Aware Session Ready!"
echo ""
echo "📋 Quick Commands:"
echo "   ./claude-mcp-recovery.sh    # If session gets stuck"
echo "   cat .claude-mcp-session-rules.md    # View safety rules"
echo "   cat .mcp-quick-recovery.json    # Recovery template"
echo ""
echo "🎯 Start Claude Code now and begin with: test_tool"
echo ""

# Test one more time to ensure everything is working
echo "🔍 Final MCP verification..."
if echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "test_tool", "arguments": {"message": "Pre-session test"}}}' | timeout 5 node server-markdown.js > /dev/null 2>&1; then
    echo "✅ MCP test_tool working correctly"
else
    echo "⚠️  MCP test_tool not responding - check server status"
fi

echo ""
echo "🚀 Ready for Claude Code with MCP-aware error handling!"