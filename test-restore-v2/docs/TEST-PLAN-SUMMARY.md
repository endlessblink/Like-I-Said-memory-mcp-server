# Custom Path Installation - Test Plan Summary

## Overview
The custom path installation feature (`--path` argument) has been implemented and tested. This summary provides the complete testing strategy to ensure reliability across all platforms and MCP clients.

## Implementation Status ✅

### What Was Implemented
1. **getInstallPath() helper function** - Handles --path argument parsing
2. **Path validation** - Ensures parent directory exists
3. **Cross-platform support** - Works on Windows, macOS, Linux
4. **Backward compatibility** - Default behavior unchanged
5. **Documentation updates** - README.md and INSTALLATION.md updated

### Current Test Results
- ✅ Path parsing logic verified (6/6 tests pass)
- ✅ Main installation verified (13/13 checks pass)
- ✅ Configuration files properly updated
- ✅ All core files and directories present

## Comprehensive Test Plan

### 1. Platform Testing Matrix

| Platform | Test Environment | Priority | Status |
|----------|------------------|----------|---------|
| Windows 10/11 | Native CMD/PowerShell | HIGH | Pending |
| Windows WSL2 | Ubuntu on WSL | HIGH | Tested ✅ |
| macOS Intel | Terminal.app | HIGH | Pending |
| macOS M1/M2 | Terminal.app | HIGH | Pending |
| Linux Ubuntu | 22.04 LTS | MEDIUM | Pending |
| Linux Other | Fedora/Arch | LOW | Pending |

### 2. MCP Client Testing

| Client | Config Location | Test Steps | Status |
|--------|----------------|------------|---------|
| Claude Desktop | `claude_desktop_config.json` | Install, restart, verify 27 tools | Configured ✅ |
| Cursor | `~/.cursor/mcp.json` | Install, restart, test tools | Configured ✅ |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` | Install, restart, test | Configured ✅ |
| Claude Code | Via npx command | Test both modes | Pending |
| VS Code + Continue | Extension config | Install and test | Pending |

### 3. Critical Test Scenarios

#### Default Installation (Backward Compatibility)
```bash
npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2 install
```
- Must work exactly as before
- Files in current directory
- Auto-configuration of clients

#### Custom Path Installation
```bash
# Absolute path
npx ... install --path /opt/mcp-servers/like-i-said

# Relative path  
npx ... install --path ../shared/mcp

# Path with spaces
npx ... install --path "/opt/my mcp servers/like-i-said"
```

#### Error Scenarios
```bash
# Non-existent parent
npx ... install --path /does/not/exist/mcp
# Expected: Clear error message

# No permissions
npx ... install --path /root/mcp  
# Expected: Permission denied message
```

### 4. Automated Test Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `verify-path-parsing.js` | Test path logic | `node scripts/verify-path-parsing.js` |
| `verify-installation.js` | Check installation | `node scripts/verify-installation.js [path]` |
| `test-custom-path-comprehensive.js` | Full test suite | `node scripts/test-custom-path-comprehensive.js` |

### 5. Manual Testing Checklist

Before release, manually verify:

- [ ] **Windows Native**
  - [ ] Default installation works
  - [ ] Custom path with spaces
  - [ ] Drive letter paths (C:, D:)
  - [ ] UNC paths if applicable

- [ ] **macOS**
  - [ ] Default installation
  - [ ] Home directory (~) expansion
  - [ ] /usr/local permissions

- [ ] **Linux**
  - [ ] Default installation
  - [ ] Hidden directories (.config)
  - [ ] System directories (/opt)

- [ ] **All Platforms**
  - [ ] NPX cache cleared first
  - [ ] Reinstallation handling
  - [ ] Memory/task operations
  - [ ] Dashboard functionality

### 6. Known Considerations

1. **NPX Caching**
   - Always use `@latest` tag
   - Clear cache with `npm cache clean --force`

2. **Path Normalization**
   - Windows paths converted to forward slashes in JSON
   - Relative paths resolved to absolute

3. **Parent Directory**
   - Must exist (by design)
   - Clear error if missing

## Testing Resources

### Quick Test Commands
```bash
# Test default
mkdir test1 && cd test1
npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2 install

# Test custom path
npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2 install --path /tmp/test-mcp

# Verify installation
node /path/to/scripts/verify-installation.js /tmp/test-mcp
```

### Documentation
- `docs/TEST-PLAN-CUSTOM-PATH.md` - Detailed test plan
- `docs/MANUAL-TEST-CHECKLIST.md` - Quick manual testing guide
- `docs/guides/CUSTOM-PATH-IMPLEMENTATION-PLAN.md` - Implementation details

## Risk Assessment

| Risk | Impact | Mitigation | Status |
|------|--------|------------|---------|
| Breaking existing installs | HIGH | Backward compatible design | Mitigated ✅ |
| Path parsing errors | MEDIUM | Comprehensive testing | Mitigated ✅ |
| Platform differences | MEDIUM | Cross-platform testing | Testing needed |
| NPX version conflicts | LOW | Use @latest tag | Documented ✅ |

## Go/No-Go Criteria

✅ **Ready for Testing** when:
- Path parsing tests pass (DONE)
- Basic installation works (DONE)
- Documentation complete (DONE)

⏳ **Ready for Release** when:
- Tested on all major platforms
- All MCP clients verified
- No regression in existing features
- Error handling confirmed

## Next Steps

1. **Platform Testing** - Test on Windows native and macOS
2. **Client Testing** - Verify all MCP clients work with custom paths
3. **Edge Cases** - Test permission errors, special characters
4. **Performance** - Ensure no degradation
5. **User Testing** - Get feedback from beta users

## Contact for Testing

Report issues to: https://github.com/endlessblink/Like-I-Said-memory-mcp-server/issues

---
*Test Plan Version: 1.0*  
*Feature: Custom Installation Path (--path)*  
*Created: 2025-07-19*