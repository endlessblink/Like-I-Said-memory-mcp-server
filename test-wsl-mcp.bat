@echo off
echo Testing Like-I-Said MCP Server v2 via WSL...
echo.
wsl -e bash -c "cd /home/endlessblink/projects/like-i-said-mcp-server-v2 && echo '{\"jsonrpc\": \"2.0\", \"id\": 1, \"method\": \"tools/list\"}' | node server-markdown.js | grep test_tool"
echo.
if %ERRORLEVEL% EQU 0 (
    echo SUCCESS: MCP server is working via WSL!
) else (
    echo FAILED: MCP server not responding correctly
)
pause