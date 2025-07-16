# Manual Fix for Maya - Empty Folder Issue

The installer created the folders but didn't copy the server files. Here's how to fix it:

## Option 1: Use NPX Directly (Easiest)

Instead of installing to a local folder, configure Claude Desktop to use NPX directly:

1. Open Claude Desktop settings
2. Go to Developer → Edit Config
3. Replace the like-i-said configuration with:

```json
{
  "mcpServers": {
    "like-i-said-memory-v2": {
      "command": "npx",
      "args": ["@endlessblink/like-i-said-v2@2.6.3", "like-i-said-v2", "start"],
      "env": {
        "MEMORY_DIR": "C:\\Users\\User\\like-i-said-mcp\\memories",
        "TASK_DIR": "C:\\Users\\User\\like-i-said-mcp\\tasks"
      }
    }
  }
}
```

4. Save and restart Claude Desktop

## Option 2: Install Globally and Copy Files

```bash
# 1. Install globally
npm install -g @endlessblink/like-i-said-v2@2.6.3

# 2. Find where npm installed it
npm list -g @endlessblink/like-i-said-v2

# 3. It will show something like:
# C:\Users\User\AppData\Roaming\npm
# └── @endlessblink/like-i-said-v2@2.6.3

# 4. Copy all files from the global install to your local folder:
xcopy "C:\Users\User\AppData\Roaming\npm\node_modules\@endlessblink\like-i-said-v2\*.*" "C:\Users\User\like-i-said-mcp\" /E /Y
```

## Option 3: Git Clone (Most Reliable)

```bash
# 1. Remove the empty folder
rmdir /S "C:\Users\User\like-i-said-mcp"

# 2. Clone the repository
git clone https://github.com/endlessblink/Like-I-Said-memory-mcp-server.git "C:\Users\User\like-i-said-mcp"

# 3. Install dependencies
cd "C:\Users\User\like-i-said-mcp"
npm install

# 4. Update Claude Desktop config to point to:
# "command": "node"
# "args": ["C:\\Users\\User\\like-i-said-mcp\\server-markdown.js"]
```

## The Problem

The NPX installer is broken - it creates folders but doesn't copy the actual server files. This is why the folder is empty and Claude can't connect.

## Recommended Fix

Use **Option 1** - it's the simplest and will work immediately. The NPX approach runs the server directly from the npm cache without needing local files.