---
id: 1750181156361
timestamp: 2025-06-17T17:25:56.361Z
complexity: 4
tags: ["claude-code", "wsl", "configuration", "installation", "mcp-servers", "complete-guide"]
priority: medium
status: active
access_count: 0
last_accessed: 2025-06-17T17:25:56.361Z
metadata:
  content_type: text
  size: 653
  mermaid_diagram: false
---CLAUDE CODE WSL MCP CONFIGURATION COMPLETE GUIDE: Problem - Claude Code requires WSL but Windows MCP configs use cmd commands and Windows paths that don't work in Linux. Solution - Convert Windows to WSL format: 1) Replace cmd with direct npx/bash commands, 2) Convert Windows paths to WSL mount paths (/mnt/d/), 3) Handle environment variables properly in Linux. Key conversions: cmd -> npx, D:\path -> /mnt/d/path, use env object for API keys. Complete WSL config template provided with like-i-said-memory, perplexity-ask, context7, firecrawl-mcp, magic-mcp, neon, puppeteer, playwright-mcp, claude-task-master servers. Config location: ~/.claude.json