# Claude Code MCP-Aware Error Handling Protocol

## **CRITICAL: Apply This Protocol for All MCP Tool Sessions**

### **1. MCP Tool Execution Rules**

**Before calling ANY MCP tool:**
- ✅ **Test connectivity**: Always start with `test_tool` to verify MCP server
- ✅ **Limit scope**: Use specific parameters (e.g., `limit: 5` for list operations)
- ✅ **Set expectations**: Expect potential timeouts or large responses

**During MCP tool execution:**
- ✅ **Monitor response size**: If response seems large, use pagination
- ✅ **Handle timeouts gracefully**: 30-second timeout for all MCP operations
- ✅ **Validate JSON-RPC**: Ensure proper MCP protocol compliance

**After MCP tool response:**
- ✅ **Always send tool_result**: Even if MCP server errors occur
- ✅ **Truncate if needed**: Cap responses at 15k tokens
- ✅ **Check for corruption**: Validate response format before proceeding

### **2. MCP-Specific Error Patterns**

#### **Pattern A: MCP Server Timeout**
```
Symptoms: Tool call hangs, no response after 30s
Recovery:
{
  "type": "tool_result",
  "tool_use_id": "[actual_id]",
  "is_error": true,
  "content": "MCP server timeout - operation cancelled"
}
```

#### **Pattern B: Large MCP Response**
```
Symptoms: Response truncated, token limit exceeded
Recovery:
{
  "type": "tool_result", 
  "tool_use_id": "[actual_id]",
  "content": "[truncated_response]\n\n⚠️ Response truncated due to size limit. Use more specific queries."
}
```

#### **Pattern C: MCP JSON-RPC Error**
```
Symptoms: Invalid JSON response from MCP server
Recovery:
{
  "type": "tool_result",
  "tool_use_id": "[actual_id]",
  "is_error": true,
  "content": "MCP protocol error - invalid response format"
}
```

### **3. Safe MCP Tool Usage Patterns**

#### **Memory Operations:**
```javascript
// SAFE: Limited scope
add_memory(content="Short test", project="test")

// UNSAFE: Large content
add_memory(content="[huge content block]")
```

#### **List Operations:**
```javascript
// SAFE: With limits
list_memories(limit=5, project="specific")

// UNSAFE: No limits  
list_memories() // Could return 130+ memories
```

#### **Search Operations:**
```javascript
// SAFE: Specific queries
search_memories(query="specific term", project="test")

// UNSAFE: Broad searches
search_memories(query="*") // Returns everything
```

### **4. MCP Error Recovery Commands**

#### **Immediate Recovery:**
```bash
# In Claude Code session:
> /reset-tools
> /clear-context
> /restart-mcp
```

#### **Manual Recovery:**
```json
{
  "type": "tool_result",
  "tool_use_id": "toolu_[ACTUAL_ID]",
  "is_error": true,
  "content": "MCP Error Recovery: Tool sequence reset. MCP server may need restart."
}
```

#### **Session Restart:**
```bash
# Exit Claude Code
Ctrl+C

# Restart with MCP awareness
claude-code --mcp-safe-mode
```

### **5. MCP Server Health Checks**

#### **Before Starting Work:**
```bash
# Test our MCP server directly
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node server-markdown.js

# Expected: JSON response with 6 tools
# If hanging: MCP server needs restart
```

#### **During Session:**
```javascript
// Use test_tool regularly to verify connectivity
test_tool(message="Health check at " + new Date())

// Expected: Quick response confirming server status
```

### **6. Emergency MCP Recovery Script**

#### **Auto-Recovery for Stuck Sessions:**
```bash
#!/bin/bash
# claude-mcp-recovery.sh

echo "🚨 MCP Error Recovery Mode"

# 1. Find stuck tool_use_id from error message
echo "Copy the tool_use_id from the error message"
echo "Format: toolu_[random_string]"

# 2. Generate recovery message
read -p "Enter tool_use_id: " TOOL_ID
cat << EOF
Copy and paste this into Claude Code:

{
  "type": "tool_result",
  "tool_use_id": "$TOOL_ID",
  "is_error": true,
  "content": "MCP Recovery: Tool execution failed, session reset required"
}

Then send: /reset-tools
EOF

# 3. Test MCP server health
echo ""
echo "Testing MCP server health..."
if echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | timeout 10 node server-markdown.js > /dev/null 2>&1; then
    echo "✅ MCP server responding"
else
    echo "❌ MCP server not responding - restart required"
    echo "Run: pkill -f server-markdown && node server-markdown.js"
fi
```

### **7. Session Initialization Checklist**

#### **Start Every Claude Code Session With:**
```markdown
1. ✅ Source MCP protocol: `cat claude-code-mcp-protocol.md`
2. ✅ Test MCP connectivity: Use `test_tool` first
3. ✅ Set response limits: Use `limit` parameters
4. ✅ Monitor token usage: Keep responses under 15k tokens
5. ✅ Ready recovery: Have `claude-mcp-recovery.sh` available
```

### **8. MCP Tool Call Templates**

#### **Safe Template:**
```javascript
// Always use this pattern for MCP tools:
await mcp_tool({
  name: "tool_name",
  parameters: {
    // Keep parameters specific and limited
    limit: 5,
    project: "specific_project"
  },
  timeout: 30000,
  expect_large_response: false
})
```

#### **Recovery Template:**
```json
{
  "type": "tool_result",
  "tool_use_id": "REPLACE_WITH_ACTUAL_ID",
  "is_error": true,
  "content": "MCP tool execution failed - applying recovery protocol"
}
```

## **Usage Instructions**

1. **Session Start**: Read this protocol before using MCP tools
2. **Tool Calls**: Follow safe patterns, use limits, test connectivity first  
3. **Error Handling**: Apply specific recovery based on error pattern
4. **Emergency**: Use recovery script if session gets stuck

This protocol specifically addresses MCP integration vulnerabilities in Claude Code and provides systematic recovery mechanisms.