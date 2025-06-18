---
id: 1750181134523
timestamp: 2025-06-17T17:25:34.523Z
complexity: 2
tags: ["wsl", "claude-code", "configuration", "setup", "june-2025"]
priority: medium
status: active
access_count: 0
last_accessed: 2025-06-17T17:25:34.523Z
metadata:
  content_type: text
  size: 580
  mermaid_diagram: false
---CLAUDE CODE WSL CONFIGURATION (June 17, 2025): WSL compatibility status - Server works in WSL environment with Node.js + JSON file storage, uses WSL-native paths (/mnt/d/APPSNospaces/...), npm run dev:full working in WSL. Manual configuration steps: 1) Open VS Code in WSL, 2) Add MCP server config to ~/.vscode-server/data/User/settings.json with claude.mcpServers key, 3) Test server responds, 4) Restart VS Code. WSL-specific considerations: Windows paths (D:\) vs WSL paths (/mnt/d/), environment variables WSL_DISTRO_NAME and WSL_INTEROP, file I/O performance considerations.