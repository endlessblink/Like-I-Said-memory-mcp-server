# Manual Test Checklist for Custom Path Installation

## Quick Verification Steps

### 1. Test Default Installation (5 minutes)

```bash
# Create a test directory
mkdir test-default
cd test-default

# Run installation
npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2 install

# Verify files created
ls -la
# Should see: memories/, tasks/, mcp-server-wrapper.js, etc.
```

✅ Files created in current directory  
✅ No errors during installation  
✅ Configuration updated (if MCP client installed)

### 2. Test Custom Path Installation (5 minutes)

#### Windows
```cmd
npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2 install --path C:\tools\mcp-test
dir C:\tools\mcp-test
```

#### macOS/Linux
```bash
npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2 install --path /tmp/mcp-test
ls -la /tmp/mcp-test
```

✅ Installation in specified directory  
✅ memories/ and tasks/ directories created  
✅ All files in custom location

### 3. Test with MCP Client (10 minutes)

#### Step 1: Install with custom path
```bash
npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2 install --path /opt/mcp/like-i-said
```

#### Step 2: Check configuration
- **Claude Desktop**: Check `claude_desktop_config.json`
- **Cursor**: Check `~/.cursor/mcp.json`
- **Windsurf**: Check `~/.codeium/windsurf/mcp_config.json`

#### Step 3: Restart MCP client

#### Step 4: Test functionality
Ask Claude:
1. "What MCP tools do you have available?" (should see 27 tools)
2. "Create a memory: Testing custom path installation"
3. "What memories do you have?"

✅ All 27 tools appear  
✅ Memory creation works  
✅ Files created in custom path

### 4. Error Handling Tests (5 minutes)

#### Test 1: Non-existent parent directory
```bash
npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2 install --path /does/not/exist/mcp
```
✅ Should show clear error message  
✅ Should not create partial installation

#### Test 2: Path with spaces
```bash
npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2 install --path "/tmp/my mcp server"
```
✅ Should handle spaces correctly  
✅ Configuration should have proper quoting

### 5. Platform-Specific Tests

#### Windows-Specific
```cmd
REM Test different path formats
npx ... install --path D:\test\mcp
npx ... install --path D:/test/mcp
npx ... install --path "C:\Program Files\MCP Test"
```

#### macOS-Specific
```bash
# Test home directory
npx ... install --path ~/mcp-servers/like-i-said
```

#### Linux-Specific
```bash
# Test hidden directory
npx ... install --path ~/.config/mcp-servers/like-i-said
```

## Verification Script

Run the verification script after installation:
```bash
node scripts/verify-installation.js /path/to/installation
```

## Common Issues Checklist

### Issue: "Server disconnected" in Claude Desktop
- [ ] Check Node.js path is correct
- [ ] Verify mcp-server-wrapper.js path is absolute
- [ ] Check environment variables are set
- [ ] Ensure MCP_QUIET=true (not "tru")

### Issue: Tools not appearing
- [ ] Restart MCP client completely
- [ ] Check configuration file syntax
- [ ] Verify Node.js version 18+
- [ ] Run verification script

### Issue: Custom path not working
- [ ] Parent directory must exist
- [ ] Check permissions on directory
- [ ] Use quotes for paths with spaces
- [ ] Try absolute path instead of relative

## Final Verification

After testing, verify:

1. **Installation Works**
   - [ ] Default installation (no --path)
   - [ ] Custom path installation
   - [ ] Relative path installation
   - [ ] Path with spaces

2. **MCP Clients Work**
   - [ ] Claude Desktop configured correctly
   - [ ] Cursor configured correctly
   - [ ] Other clients configured correctly
   - [ ] All 27 tools available

3. **Error Handling Works**
   - [ ] Clear error for non-existent parent
   - [ ] Clear error for permission denied
   - [ ] No partial installations on error

4. **Cross-Platform Works**
   - [ ] Windows paths normalized correctly
   - [ ] Unix paths work as expected
   - [ ] Configuration uses forward slashes

## Sign-off

- [ ] All tests completed successfully
- [ ] No regression in existing functionality
- [ ] Documentation matches implementation
- [ ] Ready for release

**Tested by:** ________________  
**Date:** ________________  
**Platform:** ________________  
**Node.js Version:** ________________