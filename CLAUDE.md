# CLAUDE.md

Guidance for Claude Code when working with the Like-I-Said MCP Server v2 repository.

## Repository Information

- **Name**: Like-I-Said-memory-mcp-server
- **GitHub**: https://github.com/endlessblink/Like-I-Said-memory-mcp-server
- **Description**: MCP memory management system with React dashboard
- **Status**: Active Development

## 🚨 CRITICAL SYSTEM SAFETY - Like-I-Said MCP

### **⚠️ MANDATORY SAFETY PROTOCOL FOR SERVER EDITS**
**NEVER edit server-unified.js or dashboard-server-bridge.js without following this checklist.**
**Reason**: Broken syntax creates infinite restart loops consuming 100% CPU for hours.

**SAFETY CHECKLIST (REQUIRED before ANY server changes):**
1. ✅ **Kill existing processes**: `pkill -f "server-unified|dashboard-server" && sleep 2`
2. ✅ **Syntax validation**: `node --check dashboard-server-bridge.js && node --check server-unified.js`  
3. ✅ **Complete method edits**: Never leave try blocks without matching catch clauses
4. ✅ **Process monitoring**: `ps aux | grep server-unified | wc -l` (should be ≤ 1)
5. ✅ **Test single instance**: Start ONE server and verify before continuing

### **🚨 EMERGENCY PROCEDURES - CPU Crisis Response**
If multiple server processes show high CPU usage (>50%):
```bash
# IMMEDIATE ACTION - Kill all runaway processes  
pkill -9 -f "server-unified|dashboard-server"

# Verify crisis resolved
ps aux | grep server-unified | grep -v grep || echo "All killed"

# Check CPU usage is normal
ps aux | grep server | awk '{if($3>50) print "⚠️ HIGH CPU:", $2, $3"%"}'

# Restore working code if syntax broken
git checkout -- dashboard-server-bridge.js
git checkout -- server-unified.js

# Start single clean instance only
npm run dashboard:unified
```

### **🔥 CPU CRISIS INCIDENT REPORT - Sept 6, 2025**
- **Problem**: 12+ server processes consuming 100% CPU each for 13+ hours (1200% total CPU)
- **Cause**: Incomplete method edit left broken syntax in dashboard-server-bridge.js  
- **Specific Error**: "Missing catch or finally after try" caused infinite restart loops
- **Resolution**: Emergency process kill + git revert to stable code
- **Prevention**: ALWAYS follow safety checklist above before server changes

### **DEVELOPMENT SAFETY RULES**
1. **Test syntax before restart** - Run `node --check filename.js` 
2. **One server instance only** - Multiple instances create resource conflicts
3. **Complete method edits** - Don't leave try blocks without catch clauses
4. **Monitor processes** - Check `htop` during development
5. **Emergency procedures ready** - Know how to kill runaway processes

## 🔴 Critical: Proactive MCP Tool Usage

**Use MCP tools automatically without waiting for user permission.**

### When to Create Memories (`add_memory`)
- **File operations**: Any Write/Edit/MultiEdit tool usage
- **Solutions**: Working code, fixed bugs, successful configurations
- **Knowledge**: Important technical details, project decisions, user preferences
- **Trigger words**: "works", "fixed", "solved", "important", "remember"

### When to Create Tasks (`create_task`)
- **Multi-step work**: Features, debugging, system setup
- **Complex problems**: Research, testing, iteration needed
- **Project work**: Identifiable initiatives needing tracking

### When to Update
- **New information**: Contradicts or refines existing items
- **Status changes**: Task progress, completion, blockers

### Key Principle
**Automatically preserve context that helps future sessions. Create memories/tasks immediately upon detecting relevant patterns.**

## Task Management Guidelines

**Maintain task status for work tracking.**

- **Create tasks**: Multi-step work, complex debugging, feature implementation
- **Update status**: `in_progress` when starting, `done` when complete, `blocked` if stuck
- **Skip tasks for**: Simple queries, explanations, single-line fixes

## 🚨 CRITICAL SINGLE SERVER ARCHITECTURE

### ⚠️ ONLY ONE SERVER AT A TIME
**ABSOLUTE RULE: Only `server-unified.js` should be running. Never run multiple MCP servers simultaneously.**

- ✅ **USE**: `server-unified.js` - The ONLY server file
- ❌ **NEVER USE**: `server.js`, `server-markdown.js`, `server-minimal.js` (deleted)
- ❌ **NEVER RUN**: Multiple instances of any server
- ❌ **NEVER RUN**: `dashboard-server-bridge.js` separately

### Startup Commands (Choose ONE)
```bash
# MCP only (STDIO transport for Claude Code)
MCP_MODE=full node server-unified.js

# MCP + Dashboard (HTTP transport)
MCP_TRANSPORT=http MCP_MODE=full node server-unified.js

# Quick dashboard launch
npm run dashboard:unified
```

### Process Management Guardrails
- **Before starting**: Server automatically kills existing instances
- **Port binding**: Server checks port availability before dashboard startup
- **Single point of truth**: All MCP tools AND dashboard served from unified server
- **No conflicts**: Built-in duplicate process prevention

### Why This Architecture
✅ **MCP Best Practice 2025**: Single server per service eliminates conflicts  
✅ **Resource efficiency**: No duplicate processes or port conflicts  
✅ **Data consistency**: Single source of truth for all operations  
✅ **Simplified debugging**: One process to monitor instead of multiple  

## 🚨 CRITICAL DEVELOPMENT RULES

### NEVER Add Demo/Placeholder Data
**ABSOLUTELY NEVER add static, demo, placeholder, or test data to the database during development!**
- ❌ NO demo users
- ❌ NO placeholder content
- ❌ NO static test data
- ❌ NO hardcoded example data
- ❌ NO pre-populated fields with fake data

**Why:** Demo data ruins the entire debug and testing cycle, making it impossible to test real functionality.

**Instead:**
- ✅ Use real user interactions for testing
- ✅ Create data through actual application flow
- ✅ Test with empty/clean database states
- ✅ Use environment-specific test databases if needed

## 🔧 Claude Code WSL2 Configuration (CRITICAL)

**For Claude Code users on WSL2, update this EXACT file location:**

### **File**: `/home/endlessblink/.claude.json`
### **Section**: `mcpServers` → `like-i-said`

**BEFORE (Old Configuration):**
```json
"like-i-said": {
  "type": "stdio",
  "command": "node",
  "args": ["/mnt/d/APPSNospaces/like-i-said-mcp/server-minimal.js"],
  "env": {"MCP_MODE": "true"}
}
```

**AFTER (Unified Server - All 31 Tools):**
```json
"like-i-said": {
  "type": "stdio", 
  "command": "node",
  "args": ["/mnt/d/APPSNospaces/like-i-said-mcp/server-unified.js"],
  "env": {"MCP_MODE": "full"}
}
```

### **Quick Update Command:**
```bash
jq '.mcpServers."like-i-said".args[0] = "/mnt/d/APPSNospaces/like-i-said-mcp/server-unified.js" | .mcpServers."like-i-said".env.MCP_MODE = "full"' ~/.claude.json > /tmp/claude_updated.json && mv /tmp/claude_updated.json ~/.claude.json
```

**⚠️ IMPORTANT**: Restart Claude Code after making this change!

---

## Development Commands

```bash
# Development
npm run dev:full         # API (3001) + Dashboard (5173)
npm run dev              # Dashboard only
npm run start:dashboard  # API only

# Production
npm run build            # Build frontend
npm start                # Start unified MCP server

# Server Modes (Environment Variables)
MCP_MODE=minimal node server-unified.js    # 11 core tools only
MCP_MODE=ai node server-unified.js         # 17 tools (core + AI)
MCP_MODE=full node server-unified.js       # All 31 tools (default)

# Testing
npm test                 # Run tests
npm run test:mcp         # Test MCP server
node test-unified-server.js  # Test all modes and functionality

# Installation
claude mcp add like-i-said-memory-v2 -- npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2
npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2 install  # Alternative
```

## Architecture

### 🚀 Unified MCP Server (v2.5)

**Problem Solved**: Consolidates functionality from multiple servers into one configurable system while maintaining API Error 500 safety.

**Solution**: Single server with plugin architecture and configurable modes for different use cases.

### Core Components

1. **Unified Server** (`server-unified.js`) - Single configurable MCP server with 31 tools
2. **Plugin System** - Modular architecture with lazy loading for optional features
3. **Dashboard API** (`dashboard-server-bridge.js`) - REST API, WebSocket, port 3001
4. **React Dashboard** (`src/App.tsx`) - TypeScript UI, real-time updates

### Server Modes

**Minimal Mode** (`MCP_MODE=minimal`): 11 core tools
- Memory: add_memory, get_memory, list_memories, search_memories, delete_memory
- Tasks: create_task, update_task, list_tasks, get_task_context, delete_task 
- Utility: test_tool

**AI Mode** (`MCP_MODE=ai`): 17 tools (core + AI)
- All minimal tools plus Ollama integration, performance analysis, dropoff generation

**Full Mode** (`MCP_MODE=full`): All 31 tools
- Complete functionality including deduplication, analytics, automation, path management

### Data Flow
```
MCP Client → Unified Server → Plugin System → File System ← API Bridge → React Dashboard
```

### Why This Architecture Works

✅ **Complete Functionality Parity** - All 31 tools from original server available
✅ **Configurable** - Choose minimal/ai/full based on needs  
✅ **Plugin Architecture** - Lazy loading prevents startup issues
✅ **API Error 500 Safe** - No process.exit() calls, graceful error handling
✅ **Single Source of Truth** - No more confusion about which server to use

### Storage Schemas

**Memory** (`memories/[project]/`):
```yaml
---
id, timestamp, complexity: 1-4
category: personal|work|code|research|conversations|preferences
project, tags, priority, status
related_memories, metadata
---
```

**Task** (`tasks/[project]/`):
```yaml
---
id, serial: TASK-XXXXX, title, description
project, category, priority: low|medium|high|urgent
status: todo|in_progress|done|blocked
parent_task, subtasks, memory_connections
---
```

## Key Libraries

- **Storage**: `memory-format.js`, `task-storage.js` - Markdown file management
- **Intelligence**: `task-memory-linker.js`, `vector-storage.js` - Auto-linking, search
- **Protection**: `system-safeguards.js`, `connection-protection.cjs` - Data integrity

## MCP Tools (12 total)

**Memory**: `add_memory`, `get_memory`, `list_memories`, `delete_memory`, `search_memories`, `test_tool`

**Tasks**: `create_task`, `update_task`, `list_tasks`, `get_task_context`, `delete_task`, `generate_dropoff`

**Features**: Auto-linking, complexity detection (L1-L4), content categorization, project organization

## File Structure

```
├── server-unified.js       # Main unified MCP server (configurable modes)
├── dashboard-server-bridge.js # API server
├── plugins/                # Plugin system
│   ├── ai-tools-complete.js    # AI tools (6 tools)
│   └── advanced-features.js    # Advanced tools (14 tools)
├── cli.js                  # NPX installer
├── lib/                    # Core libraries
├── src/                    # React dashboard
├── memories/               # Memory storage
├── tasks/                  # Task storage
└── data/                   # App data/settings
```

## Authentication

**Disabled by default**. Enable via:
1. Dashboard settings toggle
2. API: `POST /api/settings/setup-auth`
3. Edit `data/settings.json`: `"enabled": true`

Features: JWT auth, role-based access, session management, account lockout

## Installation

### 🚀 Proxy Installation (Recommended for WSL2/Claude Code)

**Step 1: Start Dashboard Server (once)**
```bash
cd /path/to/like-i-said-mcp
node dashboard-server-bridge.js &
# Dashboard runs on port 8776-8777
```

**Step 2: Configure Claude Code** (`~/.claude/mcp_settings.json`):
```json
{
  "mcpServers": {
    "like-i-said-mcp": {
      "command": "node",
      "args": ["/path/to/like-i-said-mcp/server-markdown-proxy.js"]
    }
  }
}
```

**Step 3: Restart Claude Code**

That's it! The proxy will connect to the dashboard automatically.

### Alternative: Direct Server Mode (if not using WSL2)

**Cursor** (`~/.cursor/mcp.json`) / **Windsurf** (`~/.codeium/windsurf/mcp_config.json`):
```json
{
  "mcpServers": {
    "like-i-said-memory-v2": {
      "command": "node",
      "args": ["/absolute/path/to/server-markdown.js"],
      "env": { "MCP_QUIET": "true" }
    }
  }
}
```

### Migration Script (for existing users)

```bash
# Automated migration to proxy architecture
./migrate-to-proxy.sh
```

## Key Features

- **API Error 500 Fixed**: Proxy architecture eliminates duplicate process issues permanently
- **WSL2 Safe**: No aggressive process killing that crashes other MCP servers
- **Auto-linking**: Tasks and memories connect based on content similarity
- **Data Protection**: Automatic backups, integrity checks, concurrent operation safety
- **Real-time Updates**: WebSocket for dashboard, file watching with chokidar
- **Project Organization**: Memories and tasks organized by project context
- **Lightweight**: 271-line proxy vs 5000+ line monolithic server
- **Multiple Clients**: Safe concurrent connections from multiple Claude Code windows

## 🔧 MCP Hierarchy Error Prevention (CRITICAL)

### Common MCP Errors and Prevention

**Error**: `Parent with ID [UUID] not found`
- **Cause**: Creating hierarchical tasks under non-existent parents
- **Prevention**: Use `view_project` to get actual UUIDs, validate with `validate_hierarchy`

**Error**: `No project found with ID or name [name]`
- **Cause**: Referencing projects that don't exist in the system
- **Prevention**: Use `find_or_create_project` before creating tasks

### 🚨 MANDATORY Pre-Creation Checklist

Before creating ANY hierarchical task:
1. **Project exists**: `find_or_create_project --title "ProjectName"`
2. **Structure known**: `view_project --project_id "ProjectName"`
3. **Operation valid**: `validate_hierarchy --operation "create_task" --parent_id "uuid"`
4. **UUIDs correct**: Use actual UUIDs from `view_project`, never guess

### Safe Workflow Scripts

Use provided error-prevention scripts:

```bash
# Safe task creation with validation
node scripts/safe-mcp-workflow.js create-task "Project" "Task Title" "Description"

# Project setup with stages
node scripts/setup-project-hierarchy.js --setup-full --project "My Project"

# Validate before creating
node scripts/safe-mcp-workflow.js validate "Project Name"
```

### Hierarchy Creation Order (NEVER violate)

1. **Project** → `find_or_create_project`
2. **Stage** → `create_stage --project_id "project-uuid"`  
3. **Task** → `create_hierarchical_task --parent_id "stage-uuid"`
4. **Subtask** → `create_subtask --parent_task_id "task-uuid"`

### 📚 Resources

- **Best Practices**: `docs/guides/MCP-HIERARCHY-BEST-PRACTICES.md`
- **Safe Scripts**: `scripts/safe-mcp-workflow.js`, `scripts/setup-project-hierarchy.js`
- **Error Prevention**: Always validate → view structure → use actual UUIDs

## Testing & Troubleshooting

- **Testing**: Run `npm test` before marking tasks complete
- **MCP Issues**: Check client config and restart
- **Dashboard Issues**: Verify servers on ports 3001 (API) and 5173 (UI)
- **Debug**: Use `npm run test:mcp` and check `memories/` and `tasks/` directories
- **Hierarchy Errors**: Use safe workflow scripts and validation tools above

## File Organization

### Root Directory - ONLY These Files
- **Entry points**: `server-unified.js`, `cli.js`, `dashboard-server-bridge.js`
- **Config**: `package.json`, `vite.config.ts`, `tsconfig.json`, build configs
- **Project**: `README.md`, `CLAUDE.md`, `.gitignore`

### Directory Structure
```
├── docs/          # Documentation
├── scripts/       # Utility scripts
├── lib/           # Core libraries
├── src/           # React source
├── tests/         # Test files
├── memories/      # Memory storage
├── tasks/         # Task storage
└── data/          # App data
```

**Never create new files in root unless they're entry points or required configs.**

## Current Status

**Version 2.5** - Unified MCP server with complete functionality restoration while maintaining API Error 500 safety.

**Production Ready**: All 31 tools from original server consolidated into single configurable server with plugin architecture.

**Key Achievement**: Complete functionality parity with original server while eliminating confusion of multiple server files. Plugin system with lazy loading ensures reliable startup across all modes.