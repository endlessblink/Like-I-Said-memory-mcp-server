---
id: 1750181163960
timestamp: 2025-06-17T17:26:03.960Z
complexity: 4
tags: ["wsl", "setup-steps", "configuration", "troubleshooting", "claude-code", "template"]
priority: medium
status: active
access_count: 0
last_accessed: 2025-06-17T17:26:03.960Z
metadata:
  content_type: text
  size: 708
  mermaid_diagram: false
---WSL MCP CONFIGURATION TEMPLATE AND SETUP STEPS: Step 1 - Backup existing config: cp ~/.claude.json ~/.claude.json.backup. Step 2 - Create WSL config file ~/.claude.json with proper mcpServers structure. Step 3 - Replace placeholders: YOUR_PERPLEXITY_KEY_HERE, YOUR_FIRECRAWL_KEY, YOUR_TWENTY_FIRST_KEY, YOUR_SMITHERY_KEY with actual values. Step 4 - Verify with cat ~/.claude.json and validate JSON with jq. Step 5 - Test Claude Code, choose "Yes, proceed with MCP servers enabled". Troubleshooting: Check paths with ls -la, test server directly with echo/node, run claude --debug. Common issues: path errors (use /mnt/c/ or /mnt/d/), remove cmd wrappers, use env object or bash -c for environment variables.