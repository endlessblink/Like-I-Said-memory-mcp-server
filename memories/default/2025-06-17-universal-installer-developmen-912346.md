---
id: 1750181146589
timestamp: 2025-06-17T17:25:46.589Z
complexity: 2
tags: ["universal-installer", "wsl", "cross-platform", "cli", "june-2025"]
priority: medium
status: active
access_count: 0
last_accessed: 2025-06-17T17:25:46.589Z
metadata:
  content_type: text
  size: 630
  mermaid_diagram: false
---UNIVERSAL INSTALLER DEVELOPMENT (June 17, 2025): Enhanced CLI with WSL support, added Cursor and Windsurf WSL paths to cli.js. Created cross-platform installer for Windows+WSL, Linux, macOS with config-client.js helper script. WSL Environment paths: Claude Desktop via wslpath, Claude Code ~/.vscode-server/data/User/settings.json, Cursor ~/.cursor/mcp.json, Windsurf ~/.codeium/windsurf/mcp_config.json. Configuration formats differ by client: Cursor uses mcpServers, Claude Code uses claude.mcpServers, Windsurf uses mcp.servers. Current issues: ES Module compatibility, line ending issues, shell escaping for JSON manipulation.