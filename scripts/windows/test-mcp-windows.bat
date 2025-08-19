@echo off
echo Testing MCP Server...
set MCP_MODE=true
set MCP_QUIET=true
echo {"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"0.1.0","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}},"id":1} | node server-markdown.js
