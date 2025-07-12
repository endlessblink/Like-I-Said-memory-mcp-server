# Accessing WSL Files from Windows (No Syncthing Needed!)

## Direct Access Methods

### Method 1: Windows Explorer (Easiest)
1. Open Windows Explorer
2. In the address bar, type:
   ```
   \\wsl$\Ubuntu\home\endlessblink\projects\Like-I-said-mcp-server-v2
   ```
3. Bookmark this location for easy access

### Method 2: Map as Network Drive
1. Open Windows Explorer
2. Right-click "This PC"
3. Select "Map network drive"
4. Choose a drive letter (e.g., Z:)
5. Folder path: `\\wsl$\Ubuntu\home\endlessblink\projects\Like-I-said-mcp-server-v2`
6. Check "Reconnect at sign-in"
7. Click Finish

### Method 3: Create Windows Shortcut
1. Right-click on Desktop
2. New → Shortcut
3. Location: `\\wsl$\Ubuntu\home\endlessblink\projects\Like-I-said-mcp-server-v2`
4. Name: "Like-I-Said MCP Server"

## Access from Command Line

### From Windows Terminal/CMD:
```cmd
cd \\wsl$\Ubuntu\home\endlessblink\projects\Like-I-said-mcp-server-v2
```

### From PowerShell:
```powershell
cd \\wsl$\Ubuntu\home\endlessblink\projects\Like-I-said-mcp-server-v2
```

## Working with VS Code

### Open in VS Code from Windows:
```cmd
code \\wsl$\Ubuntu\home\endlessblink\projects\Like-I-said-mcp-server-v2
```

### Better: Use WSL Remote Extension
1. Install "WSL" extension in VS Code
2. Open VS Code
3. Press F1, type "WSL: Open Folder in WSL"
4. Navigate to your project

## Important Notes

### File System Performance
- Accessing WSL files from Windows is slower than native
- For best performance, work in WSL when possible
- Use Windows tools only for viewing/light editing

### Line Endings
- WSL uses Unix line endings (LF)
- Windows uses CRLF
- Configure your editor to use LF for this project

### File Permissions
- Windows doesn't fully understand Linux permissions
- Avoid changing permissions from Windows side
- Always use WSL terminal for chmod operations

## Quick Access Script

Create `open-in-windows.sh` in WSL:
```bash
#!/bin/bash
explorer.exe .
```

Make it executable:
```bash
chmod +x open-in-windows.sh
```

Now just run `./open-in-windows.sh` to open current WSL folder in Windows Explorer!

## Common Issues

### Can't Access \\wsl$
- Make sure WSL is running: `wsl --list --running`
- Restart WSL: `wsl --shutdown` then `wsl`

### Files Not Updating
- Windows Explorer might cache
- Press F5 to refresh
- Or close and reopen the folder

### Permission Errors
- Always modify files from WSL side
- Use `chmod` and `chown` in WSL terminal

## Best Practices

1. **Primary Development**: Use WSL terminal
2. **Quick Edits**: VS Code with WSL extension
3. **File Browsing**: Windows Explorer via \\wsl$
4. **Git Operations**: Always from WSL
5. **Node/NPM**: Always from WSL

## No Syncing Needed!
Since both WSL and Windows access the same physical files, changes are instant. No syncing required!