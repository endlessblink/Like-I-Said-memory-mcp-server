# Migration Guide: v2.x to v3.0.0-alpha

This guide helps you migrate from Like-I-Said v2.x to v3.0.0-alpha with new AI-powered features.

## 🚀 What's New in v3.0

### Major Features Added
- **Fuzzy Search** - Typo-tolerant search using Fuse.js
- **Universal Work Detector** - Automatic work pattern recognition
- **Enhanced Search Intelligence** - Multi-mode search combining exact, expanded, semantic, and fuzzy
- **Windows Integration** - Improved cross-platform support

## 📦 Migration Steps

### 1. Update Installation

```bash
# Uninstall old version (optional)
npm uninstall -g @endlessblink/like-i-said-v2

# Install new alpha version
npm install -g @endlessblink/like-i-said-v2@3.0.0-alpha.2
```

### 2. Update Claude Configuration

Your existing MCP configuration should work, but update the version reference:

**Claude Desktop (`claude_desktop_config.json`)**:
```json
{
  "mcpServers": {
    "like-i-said-memory-v2": {
      "command": "npx",
      "args": [
        "-p", "@endlessblink/like-i-said-v2@3.0.0-alpha.2",
        "like-i-said-v2"
      ]
    }
  }
}
```

### 3. Data Compatibility

✅ **Good News**: All your existing data is **fully compatible**!
- Memory files remain unchanged
- Task files work as before
- Project organization preserved
- All relationships maintained

## 🆕 New Features Available

### Fuzzy Search
- Automatically handles typos in search queries
- No configuration needed - works immediately
- Example: "fuzzy serch" finds "fuzzy search"

### Universal Work Detector
- **Safe Mode**: Enabled by default - won't interfere with existing workflow
- Automatically detects work patterns and suggests memory creation
- Can be controlled via `work_detector_control` tool

### Enhanced Search
- Combines multiple search strategies
- Better relevance scoring
- More comprehensive results

## ⚠️ Breaking Changes

### None for Regular Users
- All existing tools work the same way
- Data format unchanged
- API compatibility maintained

### For Advanced Users
- Search results may include more matches due to fuzzy search
- Work detector may suggest automatic memory creation
- Enhanced search provides more detailed result metadata

## 🔧 Configuration Options

### Control Work Detector
```bash
# Check work detector status
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "work_detector_control", "arguments": {"action": "status"}}}' | node server-markdown.js

# Disable if needed
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "work_detector_control", "arguments": {"action": "disable"}}}' | node server-markdown.js
```

### Fuzzy Search Behavior
- Automatically activates when regular search returns < 5 results
- No manual configuration needed
- Handles typos, case sensitivity, and partial matches

## 📈 Performance Impact

- **Search**: Slightly slower due to multiple search modes, but more comprehensive
- **Memory Usage**: Minimal increase for fuzzy search indexes
- **Startup**: Same as v2.x
- **Response Time**: Enhanced search may take 100-200ms longer for better results

## 🐛 Troubleshooting

### Search Returns Too Many Results
The enhanced fuzzy search may return more results. This is intentional - better to find something than miss it due to a typo.

### Work Detector Creating Unwanted Memories
```bash
# Disable the work detector
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "work_detector_control", "arguments": {"action": "disable"}}}' | node server-markdown.js
```

### Windows Integration Issues
New Windows-specific scripts available:
- `start-mcp-windows.bat`
- `start-mcp-windows.ps1`
- Diagnostic tools in `scripts/windows/`

## 📞 Support

- **GitHub Issues**: [Like-I-Said Issues](https://github.com/endlessblink/Like-I-Said-memory-mcp-server/issues)
- **Documentation**: Updated for v3.0 features
- **Rollback**: Simply install the previous version if needed

## 🎯 Recommended Next Steps

1. **Test fuzzy search**: Try searches with intentional typos
2. **Monitor work detector**: See what patterns it identifies
3. **Explore enhanced search**: Notice the improved result quality
4. **Provide feedback**: Help improve the alpha release

The v3.0 alpha represents a major step forward in AI-powered memory management while maintaining full backward compatibility with your existing data and workflows.