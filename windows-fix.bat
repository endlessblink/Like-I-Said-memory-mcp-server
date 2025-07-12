@echo off
echo Testing MCP server...
echo.
echo First, let's check if the server responds correctly:
node mcp-server-standalone.js < test-input.txt

echo.
echo If you see JSON responses above with no other text, the server is working.
echo.
echo Now update your Claude Desktop config at:
echo %%APPDATA%%\Claude\claude_desktop_config.json
echo.
echo With this content:
echo {
echo   "mcpServers": {
echo     "like-i-said-memory": {
echo       "command": "node",
echo       "args": [
echo         "%CD%\\mcp-server-standalone.js"
echo       ]
echo     }
echo   }
echo }
echo.
pause