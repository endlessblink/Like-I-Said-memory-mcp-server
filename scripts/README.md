# Claude Code MCP Error Handling System

This directory contains a comprehensive error handling system specifically designed for Claude Code's integration with MCP (Model Context Protocol) servers.

## 🎯 Purpose

Addresses the critical MCP integration vulnerability that causes `tool_use`/`tool_result` sequencing errors in Claude Code, providing both prevention and recovery mechanisms specifically tailored to memory MCP servers.

## 📋 Components

### 1. Configuration System 🔧
- **`claude-code-mcp-config.json`** - Session settings optimized for MCP
- Response limits, timeouts, retry logic
- Agentic mode for better error resilience

### 2. Protocol Documentation 📚
- **`claude-code-mcp-protocol.md`** - Complete MCP error handling guide
- Safe usage patterns for all 6 MCP tools
- Specific recovery procedures for different error types
- Session initialization checklist

### 3. Session Initialization 🚀
- **`claude-mcp-init.sh`** - Pre-flight checks before Claude Code sessions
- Environment variables for MCP safety
- Health verification of MCP server
- Session rules and templates

### 4. Automated Recovery 🚑
- **`claude-mcp-recovery.sh`** - Intelligent error diagnosis and recovery
- Tests MCP server health automatically
- Generates proper tool_result recovery messages
- Handles server restart if needed

## 🚀 Quick Setup

### Installation
```bash
# Make scripts executable
chmod +x tools/claude-code-error-handling/claude-mcp-init.sh
chmod +x tools/claude-code-error-handling/claude-mcp-recovery.sh

# Copy to your Claude config directory
cp tools/claude-code-error-handling/* ~/.claude/
```

### Before Starting Claude Code
```bash
# Initialize MCP-aware session
~/.claude/claude-mcp-init.sh

# Start Claude Code with awareness
claude-code
```

## 📖 Usage Patterns

### In Claude Code Session

1. **Always start with health check:**
   ```
   test_tool(message="Health check")
   ```

2. **Use response limits:**
   ```
   list_memories(limit=5)
   ```

3. **Monitor responses:** Keep under 15k tokens

4. **Follow protocol:** Read `.claude-mcp-session-rules.md`

### If Error Occurs

```bash
# Automated recovery
~/.claude/claude-mcp-recovery.sh

# Manual recovery: Copy tool_use_id and send tool_result with is_error: true
# Then use: /reset-tools
```

## 🛡️ Key MCP-Specific Protections

1. **🎯 Targeted Solutions** - Specifically addresses MCP tool integration issues
2. **⏱️ Timeout Handling** - 30-second limits prevent hanging
3. **📏 Response Limiting** - 15k token cap prevents overflow
4. **🔄 Auto-Recovery** - Intelligent diagnosis and repair
5. **🛡️ Safe Patterns** - Templates for safe MCP tool usage

## 🔧 Configuration Details

### claude-code-mcp-config.json
- Response limits and timeouts
- Retry logic configuration
- Agentic mode settings
- Error handling preferences

### Session Rules Generated
- `.claude-mcp-session-rules.md` - Created during initialization
- Contains session-specific safety guidelines
- MCP tool usage patterns
- Recovery procedures

## 🚑 Error Recovery

### Automatic Recovery Features
- Health checks for MCP server
- Tool sequence validation
- Error pattern recognition
- Intelligent restart procedures

### Manual Recovery Options
- Step-by-step error diagnosis
- Tool_result generation templates
- Server restart procedures
- Session reset guidance

## 📝 Integration with Existing Tools

This error handling system complements the existing MCP tools:
- **MCP Guardian** - For server health monitoring
- **MCP Installer** - For server setup and management
- **Claude Code Error Handling** - For session-level error prevention and recovery

## ⚠️ Important Notes

- This system is specifically designed for the Like-I-Said memory MCP server
- Works with all 6 core memory tools: `test_tool`, `create_memory`, `read_memory`, `update_memory`, `list_memories`, `delete_memory`
- Provides both prevention and recovery for MCP integration issues
- Creates session-specific configuration files that should not be committed to version control

## 🔄 Updates and Maintenance

The error handling system automatically:
- Validates MCP server health before sessions
- Creates backup configurations
- Logs all recovery actions
- Provides detailed error diagnostics

## 🆘 Troubleshooting

1. **Server Won't Start**: Check `claude-mcp-recovery.sh` output
2. **Tool Errors**: Review generated session rules
3. **Timeout Issues**: Adjust config limits in `claude-code-mcp-config.json`
4. **Recovery Failures**: Run health checks manually

## 📄 Files Generated During Use

- `.claude-mcp-session-rules.md` - Session-specific guidelines
- `.claude-mcp-health-check.log` - Health check results
- `.claude-mcp-recovery.log` - Recovery action logs

These files are created in your working directory and provide session-specific guidance and logging.