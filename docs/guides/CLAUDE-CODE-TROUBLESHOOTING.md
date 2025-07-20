# Claude Code Troubleshooting Guide

## Verifying All 27 Tools Are Available

The Like-I-Said MCP Server v2 provides **27 tools** to Claude Code. If you're not seeing all tools, follow this troubleshooting guide.

## Quick Verification

1. **Check Available Tools in Claude Code**
   ```
   Ask Claude: "What MCP tools do you have available?"
   ```
   
   You should see 27 tools listed in these categories:
   - Memory Tools (6)
   - Task Management Tools (6)
   - Enhancement Tools (4)
   - Task Enhancement Tools (2)
   - Intelligence Tools (5)
   - System Tools (4)

2. **Run Verification Script**
   ```bash
   npm run verify:tools
   ```
   This will connect to the MCP server and list all available tools.

## Installation Methods

**IMPORTANT: Two Different Installation Types**

### Published Package Installation (Most Users)
```bash
# For users installing the published npm package
claude mcp add like-i-said-memory-v2 -- npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2
```
This is the **correct method for most users** and downloads the latest version from npm.

### Local Development Installation (Contributors Only)
```bash
# For developers working on the project locally
claude mcp add like-i-said-memory-v2 node /absolute/path/to/server-markdown.js
```
This points directly to local development files and is **only for contributors**.

### Manual Configuration (Fallback)
If the Claude CLI method fails, you can manually configure:

1. Find your Claude Code MCP configuration:
   - Windows: `%APPDATA%\Code\User\settings.json`
   - macOS: `~/Library/Application Support/Code/User/settings.json`
   - Linux: `~/.config/Code/User/settings.json`

2. Add this configuration:
   ```json
   {
     "claude.mcpServers": {
       "like-i-said-memory-v2": {
         "command": "npx",
         "args": ["-y", "-p", "@endlessblink/like-i-said-v2@latest", "like-i-said-v2"],
         "env": {
           "MCP_QUIET": "true"
         }
       }
     }
   }
   ```

## Common Issues and Solutions

### Issue 1: Missing Tools
**Symptom**: Claude Code shows fewer than 27 tools

**Solutions**:
1. Clear NPX cache:
   ```bash
   npx clear-npx-cache
   ```

2. Force latest version:
   ```bash
   claude mcp remove like-i-said-memory-v2
   claude mcp add like-i-said-memory-v2 -- npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2
   ```

3. Restart VS Code completely (not just reload window)

### Issue 2: Old Version Cached
**Symptom**: Changes not reflected, old tool count

**Solution**:
```bash
# Remove old configuration
claude mcp remove like-i-said-memory-v2

# Clear NPX cache
rm -rf ~/.npm/_npx
rm -rf ~/.npm/_cacache

# Reinstall with latest
claude mcp add like-i-said-memory-v2 -- npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2
```

### Issue 3: Connection Errors
**Symptom**: "Failed to connect to MCP server"

**Solutions**:
1. Check if another instance is running:
   ```bash
   ps aux | grep like-i-said
   ```

2. Kill any stuck processes:
   ```bash
   pkill -f like-i-said
   ```

3. Verify Node.js is installed:
   ```bash
   node --version  # Should be v18 or higher
   ```

### Issue 4: Permission Errors
**Symptom**: "EACCES" or permission denied errors

**Solution**:
```bash
# Fix NPM permissions
sudo chown -R $(whoami) ~/.npm

# Or use a different NPM prefix
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
```

## Complete Tool List (27 Tools)

### Memory Tools (6)
1. `add_memory` - Store information with auto-categorization
2. `get_memory` - Retrieve specific memory by ID
3. `list_memories` - List memories with filters
4. `delete_memory` - Remove specific memory
5. `search_memories` - Full-text and semantic search
6. `test_tool` - Verify MCP connection

### Task Management Tools (6)
7. `create_task` - Create tasks with auto-memory linking
8. `update_task` - Update task status and properties
9. `list_tasks` - List tasks with filtering
10. `get_task_context` - Get full task context
11. `delete_task` - Delete tasks and subtasks
12. `generate_dropoff` - Generate session handoff documents

### Enhancement Tools (4)
13. `enhance_memory_metadata` - Generate optimized titles/summaries
14. `batch_enhance_memories` - Batch process memory enhancements
15. `enhance_memory_ollama` - Local AI enhancement (Ollama)
16. `batch_enhance_memories_ollama` - Batch local AI enhancement

### Task Enhancement Tools (2)
17. `batch_enhance_tasks_ollama` - Batch enhance tasks with Ollama
18. `check_ollama_status` - Check Ollama server status

### Intelligence Tools (5)
19. `smart_status_update` - Natural language task updates
20. `get_task_status_analytics` - Task analytics and insights
21. `validate_task_workflow` - Validate status changes
22. `get_automation_suggestions` - Get automation recommendations
23. `deduplicate_memories` - Remove duplicate memories

### System Tools (4)
24. `work_detector_control` - Control automatic work detection
25. `set_memory_path` - Change memory storage location
26. `set_task_path` - Change task storage location
27. `get_current_paths` - Get current storage paths

## Debug Mode

To see detailed debug information:

1. **Enable Debug Environment**:
   ```bash
   export DEBUG=1
   export MCP_DEBUG=1
   ```

2. **Check MCP Logs**:
   Look in VS Code's Output panel → Claude

3. **Test Direct Connection**:
   ```bash
   echo '{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {"tools": {}}, "clientInfo": {"name": "test", "version": "1.0.0"}}}' | npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2
   ```

## Getting Help

1. **Check Version**:
   ```bash
   npm view @endlessblink/like-i-said-v2 version
   ```

2. **Report Issues**:
   - GitHub: https://github.com/endlessblink/Like-I-Said-memory-mcp-server/issues
   - Include output of `npm run verify:tools`

3. **Community Support**:
   - Discord: [Join our server](https://discord.gg/your-invite)
   - Documentation: https://github.com/endlessblink/Like-I-Said-memory-mcp-server

## Quick Fix Script

If all else fails, run this complete reset:

```bash
#!/bin/bash
# Complete reset script

# Remove old configuration
claude mcp remove like-i-said-memory-v2 2>/dev/null

# Clear all caches
rm -rf ~/.npm/_npx
rm -rf ~/.npm/_cacache
npm cache clean --force

# Reinstall with latest
claude mcp add like-i-said-memory-v2 -- npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2

# Verify
echo "Waiting for configuration..."
sleep 2
echo "Please restart VS Code and ask Claude: 'What MCP tools do you have available?'"
```