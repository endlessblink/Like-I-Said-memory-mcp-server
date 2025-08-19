@echo off
REM Auto-generated MCP startup script for Windows
set MCP_MODE=true
set MCP_QUIET=true
echo Starting Like-I-Said MCP Server...
node "%~dp0mcp-server-wrapper.js"
