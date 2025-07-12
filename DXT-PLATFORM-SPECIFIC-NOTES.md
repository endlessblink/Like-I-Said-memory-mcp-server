# DXT Platform-Specific Installation Notes

## Quick Compatibility Check

Run the included verification script to check platform compatibility:
```bash
node scripts/verify-platform.js
```

## Platform-Specific Installation Instructions

### Windows 10/11

**Prerequisites:**
- Node.js 16+ (download from nodejs.org)
- Git for Windows (optional, for development)

**Installation:**
1. Extract the DXT package to a folder without spaces in the path
2. Open Command Prompt or PowerShell as Administrator
3. Navigate to the extracted folder
4. The MCP server will be configured automatically

**Known Issues:**
- None - fully compatible

**Tips:**
- Use forward slashes in configuration paths (they're automatically converted)
- If using WSL2, you can also install there for Linux compatibility

### macOS (Intel & Apple Silicon)

**Prerequisites:**
- Node.js 16+ (install via Homebrew: `brew install node`)
- Xcode Command Line Tools (auto-installed if needed)

**Installation:**
1. Extract the DXT package to Applications or user directory
2. Open Terminal
3. Navigate to the extracted folder
4. The MCP server will be configured automatically

**Known Issues:**
- None - fully compatible with both Intel and ARM

**Tips:**
- Apple Silicon (M1/M2) users: Node.js runs natively, no Rosetta needed
- File paths are case-sensitive on APFS

### Linux (Ubuntu/Debian/Fedora/Arch)

**Prerequisites:**
- Node.js 16+ (use NodeSource repository or nvm)
- Standard development tools (build-essential on Debian/Ubuntu)

**Installation:**
```bash
# Extract package
tar -xzf like-i-said-v2.dxt.tar.gz
cd like-i-said-v2

# Verify platform
node scripts/verify-platform.js

# Installation happens automatically via MCP client
```

**Known Issues:**
- None - fully compatible

**Tips:**
- Use your distribution's Node.js if 16+, otherwise use nvm
- Ensure write permissions in the installation directory

### WSL2 (Windows Subsystem for Linux)

**Prerequisites:**
- WSL2 enabled and configured
- Node.js 16+ installed in WSL2
- MCP client configured to use WSL paths

**Installation:**
1. Install in WSL2 filesystem for best performance
2. Use WSL2 paths in MCP client configuration
3. Can access Windows files via `/mnt/c/` if needed

**Example Configuration:**
```json
{
  "mcpServers": {
    "like-i-said-memory-v2": {
      "command": "wsl",
      "args": [
        "node",
        "/home/username/like-i-said-v2/server/mcp-server-standalone.js"
      ]
    }
  }
}
```

**Known Issues:**
- File watching may be slower on Windows filesystem
- Use WSL2 filesystem for best performance

**Tips:**
- Install in WSL2's filesystem, not Windows mounted drives
- Use `\\wsl$\Ubuntu\home\...` to access from Windows

## Environment Variable Configuration

The DXT package uses portable environment variables that work across all platforms:

```json
{
  "env": {
    "MEMORY_BASE_DIR": "${user_config.memory_directory}",
    "TASK_BASE_DIR": "${user_config.task_directory}",
    "DEFAULT_PROJECT": "${user_config.default_project}",
    "ENABLE_AUTO_LINKING": "${user_config.enable_auto_linking}"
  }
}
```

These variables are automatically resolved by the MCP client on each platform.

## Path Handling

### Do's ✅
- Use forward slashes in configuration files: `memories/project/file.md`
- Let the system handle path conversion
- Use relative paths when possible

### Don'ts ❌
- Don't use backslashes in configuration: `memories\project\file.md`
- Don't hardcode absolute paths
- Don't mix path separators

## Troubleshooting

### All Platforms

**Issue**: "Cannot find module" errors
**Solution**: Ensure Node.js 16+ is installed and in PATH

**Issue**: Permission denied errors
**Solution**: Check directory permissions, don't install in system directories

**Issue**: Path not found errors
**Solution**: Use forward slashes in all configuration paths

### Windows-Specific

**Issue**: PowerShell execution policy
**Solution**: Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

**Issue**: Long path issues
**Solution**: Enable long paths in Windows or use shorter directory names

### macOS-Specific

**Issue**: "Operation not permitted" on macOS
**Solution**: Grant Terminal full disk access in System Preferences

### Linux-Specific

**Issue**: EACCES errors
**Solution**: Don't use sudo for npm/node operations, fix npm permissions

### WSL2-Specific

**Issue**: Slow file operations
**Solution**: Use WSL2 filesystem, not Windows mounted drives

**Issue**: Clock skew warnings
**Solution**: Run `sudo hwclock -s` to sync time

## Performance Tips by Platform

### Windows
- Disable Windows Defender real-time scanning for the project directory
- Use SSD for better file operation performance

### macOS
- Ensure Spotlight isn't indexing the memories/tasks directories
- Use APFS formatted drives for best performance

### Linux
- Use ext4 or btrfs filesystems
- Ensure sufficient inotify watches for file monitoring

### WSL2
- Always use WSL2 filesystem for data storage
- Allocate sufficient memory to WSL2 in .wslconfig

## Security Considerations

All platforms:
- The MCP server runs with user privileges only
- No elevated permissions required
- All data stored locally in user-accessible directories
- No network services exposed by default

## Support Matrix

| Feature | Windows | macOS | Linux | WSL2 |
|---------|---------|-------|--------|------|
| Core MCP Server | ✅ | ✅ | ✅ | ✅ |
| File Watching | ✅ | ✅ | ✅ | ✅* |
| Dashboard UI | ✅ | ✅ | ✅ | ✅ |
| Auto-linking | ✅ | ✅ | ✅ | ✅ |
| Task Management | ✅ | ✅ | ✅ | ✅ |
| Session Handoffs | ✅ | ✅ | ✅ | ✅ |

*WSL2 file watching works best on WSL filesystem, slower on Windows mounts

## Conclusion

The Like-I-Said MCP Server v2 DXT package is designed to work seamlessly across all major platforms. The codebase uses only cross-platform Node.js APIs and follows best practices for portable path handling.

For any platform-specific issues not covered here, please refer to the main documentation or open an issue on the GitHub repository.