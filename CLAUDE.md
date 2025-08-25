# CLAUDE.md

Guidance for Claude Code when working with the Like-I-Said MCP Server v2 repository.

## Repository Information

- **Name**: Like-I-Said-memory-mcp-server
- **GitHub**: https://github.com/endlessblink/Like-I-Said-memory-mcp-server
- **Description**: MCP memory management system with React dashboard
- **Status**: Active Development

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

## Development Commands

```bash
# Development
npm run dev:full         # API (3001) + Dashboard (5173)
npm run dev              # Dashboard only
npm run start:dashboard  # API only

# Production
npm run build            # Build frontend
npm start                # Start MCP server

# Testing
npm test                 # Run tests
npm run test:mcp         # Test MCP server

# Installation
claude mcp add like-i-said-memory-v2 -- npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2
npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2 install  # Alternative
```

## Architecture

### Core Components

1. **MCP Server** (`server-markdown.js`) - 12 tools, markdown storage, auto-linking
2. **API Server** (`dashboard-server-bridge.js`) - REST API, WebSocket, port 3001
3. **React Dashboard** (`src/App.tsx`) - TypeScript UI, real-time updates

### Data Flow
```
MCP Client → MCP Server → File System ← API Bridge → React Dashboard
```

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
├── server-markdown.js       # Main MCP server
├── dashboard-server-bridge.js # API server
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

### Quick Install
```bash
# Claude Code users
claude mcp add like-i-said-memory-v2 -- npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2

# Alternative with auto-config
npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2 install
```

### Manual IDE Configuration

**Cursor** (`~/.cursor/mcp.json`) / **Windsurf** (`~/.codeium/windsurf/mcp_config.json`):
```json
{
  "mcpServers": {
    "like-i-said-memory-v2": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server-wrapper.js"],
      "env": { "MCP_QUIET": "true" }
    }
  }
}
```

## Key Features

- **Auto-linking**: Tasks and memories connect based on content similarity
- **Data Protection**: Automatic backups, integrity checks, concurrent operation safety
- **Real-time Updates**: WebSocket for dashboard, file watching with chokidar
- **Project Organization**: Memories and tasks organized by project context

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
- **Entry points**: `server.js`, `server-markdown.js`, `cli.js`, `dashboard-server-bridge.js`
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

**Version 2.3.7** - Stable MCP server with 12 tools, React dashboard, task-memory auto-linking, real-time updates.

**Active Development**: Performance optimizations, advanced analytics.