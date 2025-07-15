# Like-I-Said MCP Server - Hybrid Multi-Approach Edition

This hybrid package includes multiple execution strategies with automatic fallback for maximum compatibility.

## Features

- **Intelligent Launcher**: Automatically selects the best available approach
- **Multiple Fallback Strategies**: Python → Node.js → Minimal implementations
- **Diagnostic Mode**: Helps identify and resolve issues
- **Complete Feature Set**: All 12 tools for memory and task management
- **Enhanced Error Handling**: Comprehensive logging and debugging

## Execution Strategies

1. **Protocol-Compliant Python Server** (Primary)
   - Full-featured Python implementation
   - Best performance and compatibility
   
2. **Enhanced Node.js Bridge** (Fallback 1)
   - Node.js wrapper with Python execution
   - Good compatibility with existing setups
   
3. **Minimal Python Server** (Fallback 2)
   - Lightweight Python implementation
   - Works in resource-constrained environments
   
4. **Original Node.js Server** (Fallback 3)
   - Original JavaScript implementation
   - Maximum compatibility with Node.js environments

## Usage

### Automatic Mode (Recommended)
The launcher will automatically select the best approach:
```
python3 launcher.py
```

### Diagnostic Mode
To troubleshoot issues:
```
python3 launcher.py --diagnostic
```

### Direct Execution
You can also run specific implementations directly:
```
# Python server
python3 python/protocol_compliant_server.py

# Node.js bridge
node enhanced-bridge.js

# Original server
node server-markdown.js
```

## Troubleshooting

1. **Check diagnostic output**: Run with --diagnostic flag
2. **Review logs**: Check like-i-said-launcher.log
3. **Verify requirements**: Ensure Python 3 or Node.js is installed
4. **Check permissions**: Ensure scripts have execute permissions

## Requirements

- **Preferred**: Python 3 AND Node.js (for all features)
- **Minimum**: Python 3 OR Node.js (limited features)

## Support

For issues or questions:
- GitHub: https://github.com/endlessblink/Like-I-Said-memory-mcp-server
- Check the diagnostic mode output first
- Review logs for detailed error information
