# Perplexity Search Prompt: Python MCP Server DXT Disconnection Issue

## Context
I'm creating a Python-based MCP (Model Context Protocol) server for Claude Desktop using FastMCP. The server works perfectly when run directly, but when packaged as a DXT (Desktop Extension) file, it installs successfully but immediately disconnects with "Server disconnected" error.

## Technical Details

### Working Example
I have a working Python DXT (comfy-guru) that stays connected. Its structure:
- Uses FastMCP framework
- Has `standalone_mcp_server.py` as entry point
- manifest.json uses `dxt_version: "0.1"`
- Server section has: `type: "python"`, `entry_point: "server/standalone_mcp_server.py"`
- Uses `${__dirname}` in args

### My Implementation
- Python 3.11.9 embedded distribution
- FastMCP 2.10.5
- 23 MCP tools implemented
- Works perfectly when run directly with `python server.py`
- Fails only when packaged as DXT

### Error Symptoms
- DXT installs successfully in Claude Desktop
- Server starts but immediately disconnects
- Error: "Server disconnected"
- No detailed error logs available

### What I've Tried
1. Matching exact manifest.json structure from working DXT
2. Creating standalone wrapper that explicitly calls `mcp.run()`
3. Setting PYTHONUNBUFFERED=1 and PYTHONIOENCODING=utf-8
4. Adding debug logging to stderr
5. Ensuring all dependencies are bundled in lib directory

## Search Query
Please search for:

1. "FastMCP Claude Desktop DXT server disconnected" solutions
2. Python MCP server stdio transport issues in packaged environments
3. FastMCP run() method requirements for embedded Python distributions
4. Claude Desktop DXT Python server debugging techniques
5. Differences between running Python MCP server directly vs in DXT package
6. FastMCP stdio transport initialization problems
7. Python embedded distribution path issues in DXT packages
8. "Server transport closed unexpectedly" FastMCP fixes

## Specific Questions

1. What are the exact requirements for FastMCP's `mcp.run()` to maintain stdio connection?
2. Are there specific Python path or import issues when running from embedded Python in DXT?
3. Does FastMCP require specific initialization order or environment setup?
4. Are there known issues with Python embedded distribution and stdio communication?
5. What debugging techniques can capture why the server disconnects immediately?

## Additional Context
The server implements all functionality correctly - the only issue is maintaining the connection when packaged as a DXT. The same code works perfectly when run directly, suggesting a packaging or environment issue rather than a code issue.