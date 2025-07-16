# Fix DXT Installation Issues

If you're getting an error like:
```
ENOENT: no such file or directory, open '/Users/[username]/Library/Application Support/Claude/Claude Extensions/local.dxt.endlessblink.like-i-said-memory-v2/server/'
```

## Quick Fix Steps

### Option 1: Manual Installation (Recommended)

1. **Download and extract the DXT manually:**
   ```bash
   # Navigate to Claude Extensions folder
   cd ~/Library/Application\ Support/Claude/Claude\ Extensions/
   
   # Create the extension folder
   mkdir -p local.dxt.endlessblink.like-i-said-memory-v2
   
   # Extract the DXT file
   unzip -o /path/to/like-i-said-memory-v2-main.dxt -d local.dxt.endlessblink.like-i-said-memory-v2/
   
   # Verify the structure
   ls -la local.dxt.endlessblink.like-i-said-memory-v2/server/
   ```

2. **Restart Claude Desktop**

### Option 2: NPX Installation (Alternative)

Instead of using the DXT, install via NPX:

```bash
# Install globally
npx -p @endlessblink/like-i-said-v2 like-i-said-v2 install

# Follow the prompts to configure your MCP client
```

### Option 3: Fix Permissions (If extraction worked but can't access)

```bash
# Fix permissions on the extension folder
chmod -R 755 ~/Library/Application\ Support/Claude/Claude\ Extensions/local.dxt.endlessblink.like-i-said-memory-v2/

# Specifically ensure server directory is accessible
chmod 755 ~/Library/Application\ Support/Claude/Claude\ Extensions/local.dxt.endlessblink.like-i-said-memory-v2/server/
```

## Verify Installation

After fixing, verify the installation:

```bash
# Check if main file exists
ls -la ~/Library/Application\ Support/Claude/Claude\ Extensions/local.dxt.endlessblink.like-i-said-memory-v2/server/mcp-server-dxt-optimized.js

# Should show the file with size ~130KB
```

## If Still Having Issues

1. **Check Claude Desktop logs:**
   - Open Claude Desktop
   - Go to Help → Show Logs
   - Look for extension loading errors

2. **Try removing and reinstalling:**
   ```bash
   # Remove the extension
   rm -rf ~/Library/Application\ Support/Claude/Claude\ Extensions/local.dxt.endlessblink.like-i-said-memory-v2/
   
   # Then try installing again
   ```

3. **Report the issue:**
   - GitHub: https://github.com/endlessblink/Like-I-Said-memory-mcp-server/issues
   - Include your macOS version and Claude Desktop version

## Alternative: Use Manual MCP Configuration

If DXT continues to fail, configure manually in your MCP client:

### For Cursor (~/.cursor/mcp.json):
```json
{
  "mcpServers": {
    "like-i-said-memory-v2": {
      "command": "npx",
      "args": ["-y", "@endlessblink/like-i-said-v2"]
    }
  }
}
```

### For Windsurf (~/.codeium/windsurf/mcp_config.json):
```json
{
  "mcp": {
    "servers": {
      "like-i-said-memory-v2": {
        "command": "npx",
        "args": ["-y", "@endlessblink/like-i-said-v2"]
      }
    }
  }
}
```