# Node.js Python Bridge Solution

This directory contains a Node.js wrapper solution that acts as a bridge between Claude Desktop and the Python MCP server. This approach bypasses Python stdio issues by using Node.js as an intermediary.

## Problem Solved

Python has notorious stdio handling issues, especially on Windows with Claude Desktop. This Node.js bridge:

1. **Handles stdio reliably** - Node.js has excellent stdio handling
2. **Spawns Python as child process** - Delegates MCP logic to Python
3. **Forwards JSON-RPC messages** - Acts as transparent bridge
4. **Works around Python issues** - No more stdio corruption or encoding problems

## Architecture

```
Claude Desktop <---> Node.js Bridge <---> Python MCP Server
                   (stdio handler)       (business logic)
```

## Files Overview

### Core Bridge Files
- **`simple-node-bridge.js`** - Minimal bridge implementation (recommended)
- **`enhanced-bridge.js`** - Advanced bridge with configuration support
- **`node-python-bridge.js`** - Full-featured bridge with debugging

### Server Files
- **`server/windows_robust_server.py`** - Python MCP server implementation
- **`package.json`** - Node.js dependencies and scripts

### Build & Test
- **`build-node-bridge-dxt.py`** - Script to build DXT package
- **`test-bridge.js`** - Test script for bridge functionality
- **`bridge-manifest.json`** - DXT manifest configuration

### Output
- **`like-i-said-node-bridge.dxt`** - Ready-to-install DXT package

## Quick Start

### Method 1: Use Pre-built DXT (Easiest)

1. Install the DXT in Claude Desktop:
   ```bash
   # The DXT is already built: like-i-said-node-bridge.dxt
   # Just double-click to install in Claude Desktop
   ```

2. Requirements:
   - Node.js 14+ installed
   - Python 3.7+ installed

### Method 2: Manual Setup

1. **Test the bridge locally:**
   ```bash
   cd python-port
   node test-bridge.js
   ```

2. **Run the bridge manually:**
   ```bash
   node simple-node-bridge.js
   ```

3. **Build your own DXT:**
   ```bash
   python3 build-node-bridge-dxt.py
   ```

## Bridge Implementations

### 1. Simple Bridge (`simple-node-bridge.js`)
**Recommended for most users**

- Minimal implementation
- Direct stdio forwarding
- Reliable and fast
- ~50 lines of code

```javascript
// Key features:
- Spawns Python with proper options
- Forwards stdin/stdout directly
- Handles process cleanup
- Error propagation
```

### 2. Enhanced Bridge (`enhanced-bridge.js`)
**For advanced users**

- Configuration file support
- Python path detection
- Enhanced logging
- Better error handling

```javascript
// Additional features:
- Config from .mcpconfig.json
- Multiple Python path detection
- Debug mode support
- Detailed logging
```

### 3. Full Bridge (`node-python-bridge.js`)
**For development/debugging**

- Comprehensive logging
- Request/response tracking
- Advanced error handling
- Debug output to files

## Configuration

### DXT Configuration
The DXT supports these configuration options:

```json
{
  "python_path": "path/to/python",  // Optional Python path
  "debug_mode": false               // Enable debug logging
}
```

### Manual Configuration
Create `.mcpconfig.json` for manual setups:

```json
{
  "python_path": "/usr/bin/python3",
  "debug_mode": true
}
```

## Testing

### Local Test
```bash
cd python-port
node test-bridge.js
```

Expected output:
```
Testing Node.js Python Bridge...

Sending Initialize...
Response: {"jsonrpc": "2.0", "id": 1, "result": {...}}
✅ Success!

Sending List Tools...
Response: {"jsonrpc": "2.0", "id": 2, "result": {"tools": [...]}}
✅ Success!

Sending Test Connection...
Response: {"jsonrpc": "2.0", "id": 3, "result": {...}}
✅ Success!
```

### Manual Test
```bash
# Start bridge
node simple-node-bridge.js

# In another terminal, send test message:
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05"}}' | nc localhost 8080
```

## Available Tools

The Python server provides these MCP tools:

1. **`test_connection`** - Test the MCP connection
   ```json
   {
     "name": "test_connection",
     "arguments": {
       "message": "Hello world!"
     }
   }
   ```

2. **`add_memory`** - Store a new memory
   ```json
   {
     "name": "add_memory", 
     "arguments": {
       "content": "Remember this important information",
       "category": "work"
     }
   }
   ```

3. **`list_memories`** - List stored memories
   ```json
   {
     "name": "list_memories",
     "arguments": {
       "limit": 5
     }
   }
   ```

## Benefits of This Approach

### ✅ Advantages
1. **Reliable stdio** - Node.js handles stdio much better than Python
2. **Cross-platform** - Works on Windows, macOS, and Linux
3. **Transparent** - Claude Desktop sees normal MCP server
4. **Debuggable** - Easy to add logging and debugging
5. **Maintainable** - Simple architecture, easy to modify
6. **Fast** - Minimal overhead, direct forwarding

### 🔄 Trade-offs
1. **Two processes** - Requires both Node.js and Python
2. **Dependencies** - Need both runtimes installed
3. **Slightly more complex** - More moving parts than pure Python

## Troubleshooting

### Common Issues

**Error: Python not found**
```bash
# Solution: Install Python or set python_path
python3 --version  # Check if Python is installed
```

**Error: Script not found**
```bash
# Solution: Make sure you're in the right directory
ls server/windows_robust_server.py  # Should exist
```

**Bridge not responding**
```bash
# Solution: Enable debug mode
DEBUG_MCP=true node simple-node-bridge.js
```

### Debug Mode

Enable debug logging:
```bash
# Environment variable
DEBUG_MCP=true node simple-node-bridge.js

# Or use enhanced bridge with config
node enhanced-bridge.js  # Reads .mcpconfig.json
```

### Log Files
- **`bridge.log`** - Enhanced bridge logs
- **`node-bridge.log`** - Full bridge logs
- **`C:/Users/[user]/like-i-said-server-detailed.log`** - Python server logs (Windows)

## Development

### Modifying the Bridge
```javascript
// simple-node-bridge.js is the easiest to modify
// Key areas:
1. Python spawn configuration (line 8-15)
2. I/O forwarding (line 20-35)  
3. Error handling (line 37-45)
```

### Adding Features
```javascript
// For new features, extend enhanced-bridge.js:
1. Add configuration options
2. Modify startup logic
3. Add custom message handling
```

### Building Custom DXT
```python
# Modify build-node-bridge-dxt.py:
1. Change file list
2. Update manifest
3. Add custom configuration
```

## Comparison with Pure Python

| Aspect | Node.js Bridge | Pure Python |
|--------|----------------|-------------|
| **Stdio Reliability** | ✅ Excellent | ❌ Problematic |
| **Windows Support** | ✅ Works well | ⚠️ Issues |
| **Setup Complexity** | ⚠️ Two runtimes | ✅ Single runtime |
| **Performance** | ✅ Fast | ✅ Fast |
| **Debugging** | ✅ Easy | ❌ Difficult |
| **Maintenance** | ✅ Simple | ⚠️ Complex |

## Why This Works

The Node.js bridge solves the fundamental problem:

1. **Python stdio issues** - Encoding, buffering, Windows compatibility
2. **Claude Desktop expectations** - Needs reliable JSON-RPC over stdio
3. **Architecture separation** - UI handling vs business logic

Node.js excels at stdio/JSON-RPC handling, while Python excels at the MCP business logic. This bridge leverages the strengths of both.

## Support

If you encounter issues:

1. **Check logs** - Enable debug mode first
2. **Verify requirements** - Node.js 14+ and Python 3.7+
3. **Test locally** - Use `node test-bridge.js`
4. **Try different bridges** - Simple vs Enhanced vs Full

This solution provides a robust, reliable way to run Python MCP servers with Claude Desktop by leveraging Node.js for stdio handling.