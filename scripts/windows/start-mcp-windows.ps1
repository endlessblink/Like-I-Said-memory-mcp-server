# Auto-generated MCP startup script for PowerShell
$env:MCP_MODE = "true"
$env:MCP_QUIET = "true"
Write-Host "Starting Like-I-Said MCP Server..."
node "$PSScriptRoot\mcp-server-wrapper.js"
