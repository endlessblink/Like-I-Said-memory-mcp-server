# Cross-Platform Setup Guide

The Like-I-Said MCP Server v2 works on **all platforms** (Windows, macOS, Linux, WSL). The WSL-specific paths you see are just configuration examples from development.

## 🚀 **Quick Universal Setup (Recommended)**

Use NPX for automatic cross-platform compatibility:

```bash
# Install globally
npm install -g @endlessblink/like-i-said-v2

# Or use NPX directly (no installation needed)
npx @endlessblink/like-i-said-v2 install
```

## 🖥️ **Platform-Specific Instructions**

### **Windows (Native)**
```bash
# Install
npm install -g @endlessblink/like-i-said-v2

# Configure MCP clients
npx @endlessblink/like-i-said-v2 install

# Manual config for Claude Desktop
# Edit: %APPDATA%\Claude\claude_desktop_config.json
{
  "mcpServers": {
    "like-i-said-memory-v2": {
      "command": "npx",
      "args": ["-y", "@endlessblink/like-i-said-v2"]
    }
  }
}
```

### **macOS**
```bash
# Install
npm install -g @endlessblink/like-i-said-v2

# Configure MCP clients
npx @endlessblink/like-i-said-v2 install

# Manual config for Claude Desktop
# Edit: ~/Library/Application Support/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "like-i-said-memory-v2": {
      "command": "npx",
      "args": ["-y", "@endlessblink/like-i-said-v2"]
    }
  }
}
```

### **Linux**
```bash
# Install
npm install -g @endlessblink/like-i-said-v2

# Configure MCP clients
npx @endlessblink/like-i-said-v2 install

# Manual config for Claude Desktop
# Edit: ~/.config/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "like-i-said-memory-v2": {
      "command": "npx",
      "args": ["-y", "@endlessblink/like-i-said-v2"]
    }
  }
}
```

### **WSL (Windows Subsystem for Linux)**
```bash
# Install
npm install -g @endlessblink/like-i-said-v2

# Configure for WSL
npx @endlessblink/like-i-said-v2 install

# Note: WSL can access Windows Claude Desktop config
# Both WSL paths (/mnt/c/...) and Windows paths (C:\...) work
```

## 🔧 **Development Setup (Any Platform)**

### **1. Clone Repository**
```bash
# HTTPS
git clone https://github.com/endlessblink/Like-I-Said-Memory-V2.git
cd Like-I-Said-Memory-V2

# Or SSH
git clone git@github.com:endlessblink/Like-I-Said-Memory-V2.git
cd Like-I-Said-Memory-V2
```

### **2. Install Dependencies**
```bash
npm install
```

### **3. Start Development**
```bash
# Start both API and dashboard
npm run dev:full

# Or separately
npm run start:dashboard  # API on :3001
npm run dev             # UI on :5173
```

### **4. Test MCP Server**
```bash
# Test tools
npm run test:mcp

# Test API
npm run test:api
```

## 🐛 **Why It Appeared "WSL-Only"**

The confusion comes from **hardcoded development paths** in config files:

```json
// OLD - WSL-specific paths (development artifacts)
{
  "command": "node",
  "args": ["/mnt/d/APPSNospaces/Like-I-said-mcp-server-v2/server-markdown.js"],
  "cwd": "/mnt/d/APPSNospaces/Like-I-said-mcp-server-v2"
}

// NEW - Universal NPX approach
{
  "command": "npx",
  "args": ["-y", "@endlessblink/like-i-said-v2"]
}
```

## ✅ **Verification Commands (Any Platform)**

```bash
# Check Node.js
node --version    # Should be 16+

# Check NPX
npx --version

# Test MCP server
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | npx @endlessblink/like-i-said-v2

# Test dashboard (after npm run dev:full)
curl http://localhost:3001/api/status
```

## 🎯 **Platform-Agnostic Features**

- ✅ **Memory Storage**: Markdown files work on all file systems
- ✅ **Dashboard**: React app runs in any browser
- ✅ **MCP Server**: Node.js runs everywhere
- ✅ **WebSocket**: Standard protocol, cross-platform
- ✅ **NPX Installation**: Works on Windows, Mac, Linux
- ✅ **Configuration**: Auto-detects platform-specific paths

## 🚨 **Common Issues & Solutions**

### **Issue**: "Command not found"
**Solution**: Use NPX instead of global install
```bash
npx @endlessblink/like-i-said-v2 install
```

### **Issue**: "Permission denied" (Linux/Mac)
**Solution**: Use sudo for global install
```bash
sudo npm install -g @endlessblink/like-i-said-v2
```

### **Issue**: "Path not found" in MCP config
**Solution**: Use NPX command instead of absolute paths
```json
{
  "command": "npx",
  "args": ["-y", "@endlessblink/like-i-said-v2"]
}
```

### **Issue**: Dashboard not connecting
**Solution**: Check ports and firewall
```bash
# Test API
curl http://localhost:3001/api/status

# Check if ports are free
netstat -an | grep 3001
netstat -an | grep 5173
```

## 📱 **MCP Client Compatibility**

| Client | Windows | macOS | Linux | WSL |
|--------|---------|--------|-------|-----|
| Claude Desktop | ✅ | ✅ | ✅ | ✅ |
| Cursor | ✅ | ✅ | ✅ | ✅ |
| Windsurf | ✅ | ✅ | ✅ | ✅ |
| Claude Code | ✅ | ✅ | ✅ | ✅ |

The system is **fully cross-platform** - the WSL appearance was just development environment artifacts! 🎉