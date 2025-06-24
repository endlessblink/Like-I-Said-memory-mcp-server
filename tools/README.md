# Claude Code MCP Management Tools

This directory contains two powerful tools for managing MCP (Model Context Protocol) servers in Claude Code:

## 🛠️ Tools Overview

### 1. MCP Installer (`mcp-install`)
Automated installation script for MCP servers with support for both global and project-specific installations.

### 2. MCP Guardian (`mcp-guardian.js`)
Health monitoring system that automatically protects Claude Code from failing MCP servers.

---

## 📦 MCP Installer

### Installation
```bash
# Copy to your local bin directory
cp tools/mcp-install ~/.local/bin/
chmod +x ~/.local/bin/mcp-install

# Make sure ~/.local/bin is in your PATH
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### Usage
```bash
mcp-install <server-name> [global|project] [project-path]
```

### Supported Servers
- `github` - GitHub integration with API access
- `puppeteer` - Web automation and scraping
- `playwright` - Browser automation and testing
- `sqlite` - Database operations
- `filesystem` - File system access
- `memory` - Memory management (uses this project's server)

### Examples
```bash
# Install GitHub MCP globally
mcp-install github global

# Install Puppeteer for current project
mcp-install puppeteer project

# Install SQLite for specific project
mcp-install sqlite project /path/to/project
```

---

## 🛡️ MCP Guardian

### Installation
```bash
# Copy to your Claude config directory
cp tools/mcp-guardian.js ~/.claude/
chmod +x ~/.claude/mcp-guardian.js
```

### Features
- **Auto-disable**: Automatically disables servers after 3 failures in 5 minutes
- **Health monitoring**: Continuous monitoring every 30 seconds
- **Auto-recovery**: Re-enables servers when they start working again
- **Backup protection**: Creates config backups before modifications
- **Detailed logging**: Logs all activities to `~/.claude/guardian.log`

### Commands
```bash
# Health monitoring
node ~/.claude/mcp-guardian.js check    # One-time health check
node ~/.claude/mcp-guardian.js status   # View all server status
node ~/.claude/mcp-guardian.js start    # Start continuous monitoring

# Manual control
node ~/.claude/mcp-guardian.js disable <server-name>  # Disable server
node ~/.claude/mcp-guardian.js enable <server-name>   # Re-enable server
```

### Guardian Status Output
```
=== MCP Guardian Status ===
Enabled: true
Max Failures: 3
Failure Window: 300s

=== Active MCP Servers ===
github: 0 failures, last check: 6/24/2025, 8:48:40 AM
playwright: 0 failures, last check: 6/24/2025, 8:48:42 AM
puppeteer: 0 failures, last check: 6/24/2025, 8:48:42 AM
like-i-said-memory: 0 failures, last check: 6/24/2025, 8:48:43 AM

=== Disabled MCP Servers ===
(none)
```

---

## 🚀 Quick Setup

### 1. Install Both Tools
```bash
# Make tools executable and copy to appropriate locations
chmod +x tools/mcp-install tools/mcp-guardian.js
cp tools/mcp-install ~/.local/bin/
cp tools/mcp-guardian.js ~/.claude/

# Ensure PATH includes ~/.local/bin
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### 2. Install Common MCP Servers
```bash
# Install essential MCP servers globally
mcp-install github global
mcp-install puppeteer global
mcp-install playwright global
```

### 3. Start Guardian Protection
```bash
# Run health check
node ~/.claude/mcp-guardian.js check

# Check status
node ~/.claude/mcp-guardian.js status
```

---

## 🔧 Configuration

### Guardian Configuration
The Guardian automatically creates a configuration file at `~/.claude/guardian-config.json`:

```json
{
  "enabled": true,
  "maxFailures": 3,
  "failureWindowMs": 300000,
  "checkIntervalMs": 30000
}
```

### Claude Configuration
Both tools work with Claude Code's global MCP configuration in `~/.claude.json`:

```json
{
  "mcpServers": {
    "github": {
      "command": "/home/user/.claude/mcp-servers/github-mcp-server",
      "args": ["stdio"],
      "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "your-token" }
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@executeautomation/playwright-mcp-server"]
    }
  }
}
```

---

## 🐛 Troubleshooting

### MCP Server Issues
1. **Check Guardian logs**: `tail -f ~/.claude/guardian.log`
2. **Run health check**: `node ~/.claude/mcp-guardian.js check`
3. **Manually disable problematic server**: `node ~/.claude/mcp-guardian.js disable <server-name>`

### Installation Issues
1. **Verify PATH**: `echo $PATH | grep .local/bin`
2. **Check permissions**: `ls -la ~/.local/bin/mcp-install`
3. **Test installation**: `mcp-install --help`

### Config Restore
If something goes wrong, Guardian creates automatic backups:
```bash
# List available backups
ls ~/.claude.json.backup.*

# Restore from backup
cp ~/.claude.json.backup.TIMESTAMP ~/.claude.json
```

---

## 📝 Logs

### Guardian Logs
- **Location**: `~/.claude/guardian.log`
- **Content**: Health checks, failures, auto-disable/enable events
- **Rotation**: Automatic cleanup of old entries

### Installation Logs
- **Output**: Displayed during installation
- **Errors**: Shown immediately with helpful context

---

## 🔄 Updates

### Updating Tools
```bash
# Pull latest changes
git pull origin main

# Copy updated tools
cp tools/mcp-install ~/.local/bin/
cp tools/mcp-guardian.js ~/.claude/
```

### Updating MCP Servers
```bash
# Re-run installation to get latest versions
mcp-install github global
mcp-install playwright global
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Test your changes thoroughly
4. Submit a pull request

### Testing
```bash
# Test installer
./tools/mcp-install --help

# Test guardian
node tools/mcp-guardian.js --help
```

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review the Guardian logs
3. Create an issue on GitHub with:
   - Your operating system
   - Claude Code version
   - Error messages
   - Steps to reproduce