# Comprehensive Test Plan: Custom Installation Path Feature

## Overview
This document outlines the complete testing strategy for the custom installation path feature (`--path` argument) to ensure it works correctly across all platforms and MCP clients without breaking existing functionality.

## Test Matrix

### Platforms
- [ ] Windows 10/11 (Native)
- [ ] Windows WSL2 (Ubuntu)
- [ ] macOS (Intel)
- [ ] macOS (Apple Silicon)
- [ ] Linux (Ubuntu 22.04)
- [ ] Linux (Other distros)

### MCP Clients
- [ ] Claude Desktop
- [ ] Claude Code (Web + CLI)
- [ ] Cursor IDE
- [ ] Windsurf Editor
- [ ] VS Code with Continue

### Node.js Versions
- [ ] Node.js 18.x (minimum supported)
- [ ] Node.js 20.x (LTS)
- [ ] Node.js 22.x (latest)

## Test Scenarios

### 1. Default Installation Tests (No --path)

#### Test 1.1: Basic Installation
```bash
# Clear NPX cache first
npm cache clean --force

# Test in a clean directory
mkdir test-default && cd test-default
npx -p @endlessblink/like-i-said-v2 like-i-said-v2 install
```

**Expected Results:**
- ✅ Files created in current directory
- ✅ memories/ and tasks/ directories created
- ✅ MCP clients auto-configured
- ✅ No errors during installation

#### Test 1.2: Existing Installation
```bash
# Run install again in same directory
npx -p @endlessblink/like-i-said-v2 like-i-said-v2 install
```

**Expected Results:**
- ✅ Existing files not overwritten
- ✅ Configuration updated if needed
- ✅ No data loss

### 2. Custom Path Installation Tests

#### Test 2.1: Absolute Path
```bash
# Windows
npx -p @endlessblink/like-i-said-v2 like-i-said-v2 install --path C:\tools\mcp-servers\like-i-said

# macOS/Linux
npx -p @endlessblink/like-i-said-v2 like-i-said-v2 install --path /opt/mcp-servers/like-i-said
```

**Expected Results:**
- ✅ Installation in specified directory
- ✅ Parent directory must exist
- ✅ Target directory created if needed
- ✅ Correct paths in MCP configurations

#### Test 2.2: Relative Path
```bash
npx -p @endlessblink/like-i-said-v2 like-i-said-v2 install --path ../shared/mcp-servers
```

**Expected Results:**
- ✅ Path resolved correctly
- ✅ Installation works as expected

#### Test 2.3: Path with Spaces
```bash
# Windows
npx -p @endlessblink/like-i-said-v2 like-i-said-v2 install --path "C:\My Tools\MCP Servers"

# macOS/Linux
npx -p @endlessblink/like-i-said-v2 like-i-said-v2 install --path "/home/user/My Projects/MCP"
```

**Expected Results:**
- ✅ Spaces handled correctly
- ✅ Configuration files have proper quoting

### 3. MCP Client Configuration Tests

#### Test 3.1: Claude Desktop
**File:** `claude_desktop_config.json`
```json
{
  "mcpServers": {
    "like-i-said-memory-v2": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server-wrapper.js"],
      "env": {
        "MEMORY_DIR": "/absolute/path/to/memories",
        "TASK_DIR": "/absolute/path/to/tasks",
        "MCP_QUIET": "true"
      }
    }
  }
}
```

**Verify:**
- ✅ Paths use forward slashes (even on Windows)
- ✅ Environment variables point to correct directories
- ✅ Server starts without errors

#### Test 3.2: Cursor Configuration
**File:** `~/.cursor/mcp.json`

**Verify:**
- ✅ Configuration created/updated
- ✅ Paths are absolute
- ✅ All 27 tools available

#### Test 3.3: Claude Code NPX Mode
```bash
claude mcp add like-i-said-memory-v2 -- npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2
```

**Verify:**
- ✅ No local files created
- ✅ All 27 tools available
- ✅ Memory/task operations work

### 4. Error Handling Tests

#### Test 4.1: Non-existent Parent Directory
```bash
npx -p @endlessblink/like-i-said-v2 like-i-said-v2 install --path /does/not/exist/mcp-server
```

**Expected:**
- ✅ Clear error message
- ✅ Installation aborts cleanly
- ✅ No partial installation

#### Test 4.2: Permission Denied
```bash
# Try to install in system directory without permissions
npx -p @endlessblink/like-i-said-v2 like-i-said-v2 install --path /usr/local/mcp-servers
```

**Expected:**
- ✅ Permission error handled gracefully
- ✅ Suggests alternative location

### 5. Cross-Platform Path Tests

#### Test 5.1: Windows Path Formats
```powershell
# Test various Windows path formats
npx ... install --path D:\tools\mcp
npx ... install --path D:/tools/mcp
npx ... install --path \\server\share\mcp
```

#### Test 5.2: Unix Path Formats
```bash
# Test various Unix path formats
npx ... install --path ~/mcp-servers/like-i-said
npx ... install --path /opt/mcp/../mcp-servers/like-i-said
```

### 6. Integration Tests

#### Test 6.1: Memory Operations
After installation with custom path:
```
1. Ask Claude: "Remember: Testing custom path installation"
2. Ask Claude: "What memories do you have?"
3. Verify memory file created in custom path
```

#### Test 6.2: Task Management
```
1. Ask Claude: "Create task: Test custom installation paths"
2. Ask Claude: "List my tasks"
3. Verify task file created in custom path
```

#### Test 6.3: Dashboard Access
```bash
# From custom installation directory
npm run dev:full
```

**Verify:**
- ✅ Dashboard starts on port 3001
- ✅ Shows memories/tasks from custom path
- ✅ Real-time updates work

### 7. Regression Tests

#### Test 7.1: Existing Installations
- ✅ Existing installations continue to work
- ✅ No changes to existing configurations
- ✅ Update mechanism still works

#### Test 7.2: NPX Cache Issues
```bash
# Clear NPX cache and test
npx clear-npx-cache
npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2 install
```

### 8. Automated Test Scripts

#### Create Automated Tests
```bash
# Run all tests automatically
npm run test:custom-path-full
```

**Test Coverage:**
- Path parsing logic
- Installation scenarios
- Configuration generation
- Error handling

## Platform-Specific Considerations

### Windows
- [ ] Test with Command Prompt
- [ ] Test with PowerShell
- [ ] Test with Git Bash
- [ ] Verify backslash handling
- [ ] Test UNC paths

### macOS
- [ ] Test with Terminal
- [ ] Test with iTerm2
- [ ] Verify permissions (especially /usr/local)
- [ ] Test with Homebrew Node.js

### Linux
- [ ] Test with different shells (bash, zsh)
- [ ] Test with snap/flatpak constraints
- [ ] Verify systemd service compatibility

### WSL
- [ ] Test Windows path access (/mnt/c)
- [ ] Test Linux path access
- [ ] Verify cross-filesystem performance

## Success Criteria

✅ **All tests pass on all platforms**
✅ **No regression in existing functionality**
✅ **Clear error messages for all failure cases**
✅ **Documentation matches actual behavior**
✅ **Performance remains acceptable**

## Test Execution Checklist

### Before Testing
- [ ] Clean test environment
- [ ] Clear NPX cache
- [ ] Remove existing installations
- [ ] Note Node.js version

### During Testing
- [ ] Document any deviations
- [ ] Capture error messages
- [ ] Note performance issues
- [ ] Check memory/CPU usage

### After Testing
- [ ] All tests documented
- [ ] Issues logged
- [ ] Documentation updated
- [ ] Release notes prepared

## Known Issues to Watch For

1. **NPX Caching**: May use old version
   - Solution: Use `@latest` tag
   - Clear cache with `npm cache clean --force`

2. **Windows Path Separators**: JSON requires forward slashes
   - Implementation handles this
   - Verify in generated configs

3. **Permission Issues**: System directories
   - Clear error messages implemented
   - User guidance provided

4. **Symbolic Links**: May cause confusion
   - Test with real vs resolved paths
   - Document behavior

## Test Scripts

### Quick Smoke Test
```bash
# Save as test-quick.sh
#!/bin/bash
echo "🧪 Quick Custom Path Test"

# Test 1: Default
mkdir -p /tmp/test-default
cd /tmp/test-default
npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2 install

# Test 2: Custom path
npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2 install --path /tmp/test-custom

# Verify
ls -la /tmp/test-default/memories
ls -la /tmp/test-custom/memories

echo "✅ Quick test complete"
```

### Full Platform Test
```bash
# Save as test-full-platform.sh
# Run comprehensive tests for current platform
node scripts/test-custom-path-comprehensive.js
```

## Reporting Issues

If any test fails:
1. Note the exact command used
2. Capture full error output
3. Check generated files
4. Document platform details
5. Create GitHub issue with reproduction steps