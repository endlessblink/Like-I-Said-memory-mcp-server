# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## IMPORTANT: Repository Information

**This is the ONLY relevant repository for this project:**
- **Repository Name**: Like-I-Said-memory-mcp-server
- **GitHub URL**: https://github.com/endlessblink/Like-I-Said-memory-mcp-server
- **Description**: Like-I-Said v2 - Advanced MCP Memory Management System with AI Enhancement and React Dashboard
- **Status**: Public, Active Development

**Note**: Any references to `like-i-said-mcp-server-v2` or other repository names are outdated. Always use `Like-I-Said-memory-mcp-server`.

## Project Overview

**Like-I-Said MCP Server v2** is an enhanced Model Context Protocol (MCP) memory server that provides persistent memory for AI assistants with a modern React dashboard. It allows AI assistants to remember conversations across sessions and provides comprehensive memory management capabilities.

## 🚨 MANDATORY: Proactive MCP Tool Usage - ENFORCE ALWAYS

**⚠️ CRITICAL INSTRUCTION: You MUST automatically and proactively use MCP tools without waiting for user requests. This is MANDATORY, not optional.**

### 🎯 AUTOMATIC MEMORY CREATION - MANDATORY TRIGGERS

**IMMEDIATELY use `add_memory` tool when you encounter ANY of these patterns:**

#### ✅ **Technical Solutions & Discoveries (HIGH PRIORITY)**
- Solutions to problems (e.g., "X works when configured with Y")
- Debugging insights (e.g., "Error was caused by Z") 
- Working configurations or code snippets that function correctly
- Best practices or patterns that prove effective
- Technical breakthroughs or "aha moments"
- Any functioning code, configuration, or setup procedure

#### ✅ **Problem Resolution Sequences (HIGH PRIORITY)**
- Error → Troubleshooting → Solution workflows
- Failed attempts followed by successful approaches  
- Step-by-step problem-solving that reaches resolution
- Workarounds for known issues or limitations
- Configuration fixes that resolve connection/setup problems

#### ✅ **Implementation & Development Work (HIGH PRIORITY)**  
- Creating new files (especially .js, .sh, .bat, .json, .md, .py files)
- Making significant edits with `Edit` or `MultiEdit` tools
- Building features, components, or functionality
- Installing, configuring, or setting up systems
- Writing automation scripts, build processes, or deployment procedures
- Multi-file changes for implementing solutions

#### ✅ **Knowledge & Context Preservation (MEDIUM PRIORITY)**
- Important technical details shared by user
- Project decisions and architectural choices
- User preferences, workflows, or methodologies  
- Research findings and analysis conclusions
- Tool configurations that work in specific environments
- Command sequences that accomplish specific tasks

### 🎯 AUTOMATIC TASK CREATION - MANDATORY TRIGGERS

**IMMEDIATELY use `create_task` tool when you detect:**

#### ✅ **Multi-Step Work Patterns (HIGH PRIORITY)**
- User mentions project with multiple components/phases
- Workflow that will require several sessions to complete
- Implementation requiring multiple files or system changes  
- Problem-solving that involves multiple attempts or approaches
- Build/deployment processes with multiple stages

#### ✅ **Complex Problem-Solving (HIGH PRIORITY)**
- Issues requiring research, testing, and iteration
- System configuration requiring multiple components
- Development work spanning multiple files or systems
- Debugging that requires systematic investigation
- Feature implementation requiring planning and testing

#### ✅ **Project Organization (MEDIUM PRIORITY)** 
- User working on identifiable projects or initiatives
- Work that benefits from task tracking and progress monitoring
- Collaborative efforts requiring status updates
- Long-term goals that need breakdown into manageable parts

### 🎯 AUTOMATIC MEMORY UPDATES - MANDATORY TRIGGERS

**IMMEDIATELY use `update_task` or create new memories when:**

#### ✅ **Information Evolution (HIGH PRIORITY)**
- New information contradicts or refines existing memories
- Additional steps discovered for existing procedures  
- Corrections or improvements to previously documented solutions
- Status updates on ongoing work or projects
- Enhanced understanding of previously documented topics

### 🚨 **MANDATORY TRIGGER PHRASES - AUTOMATIC ACTION REQUIRED**

**When you encounter ANY of these phrases, you MUST immediately use the appropriate MCP tool:**

#### Memory Creation Triggers:
- "works", "working", "fixed", "solved", "discovered", "breakthrough"
- "the solution is", "the problem was", "turns out", "figured out"  
- "important:", "note:", "remember:", "fyi:", "key insight:"
- "finally got X to work", "this approach works", "successful"
- "for future reference", "to remember", "this is how", "the way to"

#### Task Creation Triggers:
- "need to", "working on", "implementing", "building", "setting up"
- "multi-step", "several phases", "complex process", "long-term"
- "project", "initiative", "feature development", "system setup"
- "will take time", "multiple sessions", "ongoing work"

#### Memory Update Triggers:  
- "actually", "correction", "update", "also", "additionally"
- "better approach", "improved solution", "new information"
- "status update", "progress report", "latest findings"

### 🎯 **DECISION TREE FOR AUTOMATIC MCP USAGE**

```
Conversation Content Analysis:
├── Technical solution mentioned? → YES: Create memory immediately
├── Multi-step work discussed? → YES: Create task immediately  
├── File operations performed? → YES: Create memory immediately
├── Problem solved/resolved? → YES: Create memory immediately
├── New information about existing topic? → YES: Update memory/task
├── Project work mentioned? → YES: Check for existing tasks, create if needed
├── Important configuration shared? → YES: Create memory immediately
└── User expresses preference/workflow? → YES: Create memory for future reference
```

### 🚨 **ENFORCEMENT REMINDERS**

**Throughout every interaction, continuously ask yourself:**
1. **"Should this be remembered?"** → If YES: Use `add_memory` immediately
2. **"Is this part of a larger workflow?"** → If YES: Use `create_task` immediately  
3. **"Does this update existing information?"** → If YES: Update existing memory/task
4. **"Would this help in future sessions?"** → If YES: Create memory immediately

**❌ NEVER wait for the user to ask for memory/task creation**
**❌ NEVER assume the user will remember important details**  
**❌ NEVER let solutions, configurations, or insights go undocumented**
**✅ ALWAYS err on the side of creating too many memories rather than too few**

### 📚 **ENHANCED BEST PRACTICES**

#### Memory Creation Standards:
- **Rich Context**: Include full problem description, solution approach, and outcome
- **Future Searchability**: Use descriptive titles and comprehensive tags
- **Code Preservation**: Include complete code snippets, file paths, and configurations  
- **Troubleshooting Context**: Document what didn't work and why the solution succeeded
- **Environment Details**: Capture system, version, and setup specifics when relevant

#### Task Creation Standards:
- **Clear Scope**: Define what constitutes task completion  
- **Progress Tracking**: Include current status and next steps
- **Context Linking**: Connect related memories and subtasks
- **Priority Setting**: Assign appropriate priority based on user needs and project importance
- **Time Estimation**: Include realistic effort estimates when possible

**🎯 ULTIMATE GOAL: Zero cognitive overhead for the user - the system should intelligently preserve all important context, organize work automatically, and eliminate the need for manual memory/task management.**

## CRITICAL: File Operation Memory Creation

**ALWAYS create a memory when you:**
- Write a new file with `Write` tool (especially .js, .sh, .bat, .json files)
- Make significant edits with `Edit` or `MultiEdit` tools
- Create build scripts, installers, or automation
- Implement a solution that involves multiple files

**Memory should include:**
- What problem was being solved
- Files created/modified
- Key implementation details
- Any configuration or setup required

**Use the `add_memory` tool IMMEDIATELY after completing significant work. Do not wait for the user to ask.**

## Development Commands

### Essential Commands
```bash
# Install dependencies
npm install

# Development (Full Stack)
npm run dev:full    # Start both API server (3001) and React dashboard (5173)
npm run dev         # Start React dashboard only (5173)
npm run start:dashboard  # Start API server only (3001)

# Production
npm run build       # Build React frontend
npm run preview     # Preview production build
npm start          # Start MCP server (production)

# MCP Server Operations
npm run start:mcp   # Start MCP server directly
npm run test:mcp    # Test MCP server functionality

# Testing
npm test           # Run Jest tests
npm run test:watch # Watch mode
npm run test:coverage # Coverage report

# Storybook
npm run storybook  # Start Storybook development server
npm run build-storybook # Build Storybook static files
```

### MCP Server Installation
```bash
# For Claude Code - Install MCP server (Recommended)
claude mcp add like-i-said-memory-v2 -- npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2

# Alternative - Install with dashboard and auto-configuration
npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2 install

# Install to custom directory
npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2 install --path /custom/path

# For contributors - Install dependencies for local development
npm install
```

## Architecture Overview

### Core Components

**1. MCP Server (`server-markdown.js`)**
- Main MCP server implementing Model Context Protocol
- Manages 12 tools: 6 memory operations + 6 task management
- Uses file-based storage (markdown files organized by project)
- Supports both memory and task operations with auto-linking
- Implements comprehensive data protection and integrity safeguards

**2. Dashboard API Server (`dashboard-server-bridge.js`)**
- Express REST API server on port 3001
- Provides web API for dashboard frontend
- Real-time WebSocket updates for file changes
- Bridges MCP server functionality for web interface
- Handles task-memory linking and project management

**3. React Dashboard (`src/App.tsx`)**
- Modern React + TypeScript frontend
- Comprehensive memory management interface
- Real-time updates via WebSocket
- Advanced search, filtering, and organization features
- Task management with memory connections

### Data Flow Architecture

```
MCP Client → MCP Server → File System
                ↓
API Bridge ← File Watcher ← File System
    ↓
WebSocket Updates → React Dashboard
```

**Key Integration Points:**
- **Task-Memory Linking**: Automatic bidirectional connections based on content similarity via `lib/task-memory-linker.js`
- **Project Organization**: Both memories and tasks organized by project context
- **Real-time Updates**: WebSocket-based dashboard updates using `lib/file-system-monitor.js`
- **Data Protection**: Comprehensive safeguards via `lib/system-safeguards.js` and `lib/connection-protection.cjs`

### Memory Storage System

**Storage Format**: Markdown files with enhanced frontmatter
- **Location**: `memories/` directory organized by project
- **Structure**: Enhanced frontmatter with complexity levels, categories, relationships
- **Features**: Auto-categorization, content type detection, metadata tracking

**Memory Schema**:
```yaml
---
id: unique-identifier
timestamp: ISO-string
complexity: 1-4 (L1-L4)
category: personal|work|code|research|conversations|preferences
project: project-name
tags: [tag1, tag2]
priority: low|medium|high
status: active|archived|reference
related_memories: [id1, id2]
access_count: number
last_accessed: ISO-string
metadata:
  content_type: text|code|structured
  language: programming-language
  size: number
  mermaid_diagram: boolean
---
Content goes here...
```

### Task Management System

**Task Storage**: Project-based markdown files in `tasks/` directory
- **Organization**: Tasks organized by project with active/completed/blocked states
- **Linking**: Automatic memory-task linking based on content similarity
- **Metadata**: Serial numbers, priority levels, subtask relationships

**Task Schema**:
```yaml
---
id: task-id
serial: TASK-XXXXX
title: task-title
description: detailed-description
project: project-name
category: personal|work|code|research
priority: low|medium|high|urgent
status: todo|in_progress|done|blocked
parent_task: parent-id
tags: [tag1, tag2]
memory_connections: [connection-objects]
subtasks: [subtask-ids]
created: ISO-string
updated: ISO-string
---
Task description and details...
```

## Key Libraries and Their Purpose

### Core Storage Libraries (lib/)
- **`memory-format.js`** - Shared memory format parser supporting YAML frontmatter and HTML comment metadata
- **`memory-storage-wrapper.js`** - Memory storage abstraction layer with project-based organization
- **`task-storage.js`** - Task storage with project-based markdown files and in-memory indexing
- **`task-format.js`** - Task parsing and serialization with schema validation

### Intelligence and Linking
- **`task-memory-linker.js`** - Auto-linking system connecting tasks and memories based on content similarity
- **`vector-storage.js`** - Vector embeddings for semantic search and similarity matching
- **`title-summary-generator.js`** - LLM-powered title and summary generation
- **`dropoff-generator.js`** - Session handoff document generation for context transfer

### System Protection
- **`system-safeguards.js`** - Comprehensive data protection and integrity safeguards
- **`connection-protection.cjs`** - Concurrent operation protection preventing data corruption
- **`data-integrity.cjs`** - File integrity checks and validation
- **`file-system-monitor.js`** - Real-time file system monitoring with chokidar

## Key Tools and Capabilities

### Memory Tools (6 tools)
1. **`add_memory`** - Store information with auto-categorization and linking
2. **`get_memory`** - Retrieve specific memory by ID
3. **`list_memories`** - List with complexity levels and metadata
4. **`delete_memory`** - Remove specific memory
5. **`search_memories`** - Full-text search with project filtering
6. **`test_tool`** - Verify MCP connection

### Task Management Tools (6 tools)
1. **`create_task`** - Create tasks with auto-memory linking
2. **`update_task`** - Update task status and add subtasks/connections
3. **`list_tasks`** - List tasks with filtering and relationship data
4. **`get_task_context`** - Get full task context with connected memories
5. **`delete_task`** - Delete tasks and subtasks
6. **`generate_dropoff`** - Generate session handoff documents

### Advanced Features
- **Auto-linking**: Automatic memory-task connections based on content similarity
- **Complexity Detection**: 4-level complexity system (L1-L4)
- **Content Type Detection**: Automatic categorization (text/code/structured)
- **Project Organization**: Memory and task organization by project context
- **Data Protection**: Comprehensive safeguards against data loss
- **Session Handoffs**: Generate context-rich session transfer documents

## React Dashboard Components

### Main Application
- **`App.tsx`** - Main application with tab-based navigation and WebSocket real-time updates
- **`types.ts`** - TypeScript definitions for Memory, Task, and all system interfaces

### Core UI Components
- **`TaskManagement.tsx`** - Complete task management interface with CRUD operations
- **`MemoryCard.tsx`** - Memory display component with enhanced title extraction
- **`MemoryRelationships.tsx`** - Memory connection visualization

### Advanced Features
- **`AdvancedSearch.tsx`** - Complex search with filters and logical operators
- **`StatisticsDashboard.tsx`** - Analytics and metrics dashboard
- **`AIEnhancement.tsx`** - AI-powered content enhancement

## File Structure

```
Like-I-Said-memory-mcp-server/
├── server-markdown.js          # Main MCP server
├── dashboard-server-bridge.js  # API server for dashboard
├── cli.js                     # NPX installer
├── memories/                  # Memory storage (markdown files)
│   ├── default/              # Default project
│   ├── project-name/         # Project-specific memories
│   └── ...
├── tasks/                    # Task storage (markdown files)
│   ├── project-name/         # Project-specific tasks
│   └── ...
├── lib/                      # Core libraries
│   ├── task-storage.js       # Task management system
│   ├── task-memory-linker.js # Memory-task linking
│   ├── memory-format.js      # Memory parsing/formatting
│   ├── system-safeguards.js  # Data protection
│   └── ...
├── src/                      # React dashboard source
│   ├── App.tsx              # Main dashboard component
│   ├── components/          # UI components
│   ├── types.ts            # TypeScript type definitions
│   └── ...
├── dist/                    # Built dashboard files
└── data-backups/           # Automated backup system
```

## Authentication System

### Overview
Like-I-Said MCP Server v2 includes an **opt-in authentication system** that is **disabled by default**. This ensures the server is accessible for development and personal use without requiring authentication setup.

### Default Behavior
- **Authentication is DISABLED by default** - all API endpoints are publicly accessible
- No default users are created unless authentication is explicitly enabled
- Settings are stored in `data/settings.json`

### Enabling Authentication

#### Method 1: Using the Dashboard (Recommended)
1. Access the dashboard at `http://localhost:3001`
2. Navigate to Settings
3. Toggle "Enable Authentication"
4. Follow the setup wizard to create your first admin user
5. Restart the server for changes to take effect

#### Method 2: Using the API
```bash
# Check current auth status
curl http://localhost:3001/api/settings/auth-status

# Enable authentication (requires restart)
curl -X POST http://localhost:3001/api/settings/setup-auth \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "your-secure-password"
  }'
```

#### Method 3: Direct Settings File
Edit `data/settings.json`:
```json
{
  "authentication": {
    "enabled": true,
    "requireAuth": true,
    "allowRegistration": false,
    "sessionTimeout": "24h",
    "refreshTokenTimeout": "7d"
  }
}
```

### Authentication Features
- **JWT-based authentication** with access and refresh tokens
- **Role-based access control** (admin, user, readonly)
- **Session management** with configurable timeouts
- **Account lockout** after 5 failed login attempts
- **Password change** functionality
- **User management** (admin only)

### Settings Structure
The complete settings file (`data/settings.json`) includes:
```json
{
  "authentication": {
    "enabled": false,          // Set to true to enable auth
    "requireAuth": false,      // Enforce auth on all endpoints
    "allowRegistration": false, // Allow new user registration
    "sessionTimeout": "24h",
    "refreshTokenTimeout": "7d"
  },
  "server": {
    "port": 3001,
    "host": "localhost",
    "corsOrigins": ["http://localhost:5173"]
  },
  "features": {
    "autoBackup": true,
    "backupInterval": 3600000,
    "maxBackups": 10,
    "enableWebSocket": true,
    "enableOllama": true
  },
  "logging": {
    "level": "info",
    "enableFileLogging": false,
    "logDirectory": "./logs"
  }
}
```

### Security Best Practices
1. **Always enable authentication in production environments**
2. Change default passwords immediately after setup
3. Use strong, unique passwords for all accounts
4. Regularly review user access and permissions
5. Enable HTTPS when deploying publicly
6. Keep the JWT secret key secure (`data/jwt-secret.key`)

### Migration from Environment Variables
The previous `DISABLE_AUTH=true` environment variable is still supported for backward compatibility but is **deprecated**. Please migrate to the settings-based configuration.

## Configuration and Installation

### IMPORTANT: Client Type Distinction

**This project supports two different types of Claude clients:**

#### 1. Claude Desktop (Desktop Application)
- **Installation Method**: Manual MCP server configuration
- **File Format**: JSON configuration files
- **Configuration**: Manual setup required in Claude Desktop config
- **Use Case**: Users of the Claude Desktop application

#### 2. Claude Code (CLI/Development Environment) + IDEs
- **Installation Method**: Manual MCP server configuration
- **File Format**: JSON configuration files
- **Configuration**: Manual setup required in your IDE
- **Use Case**: Users of Claude Code CLI with IDEs like Cursor, Windsurf, VS Code

### Installation Methods by Client Type

#### For Claude Desktop Users
**Installation**:
1. Install the MCP server using NPX or manual installation (see below)
2. Add the server configuration to Claude Desktop's settings
3. Restart Claude Desktop
4. Start using Like-I-Said immediately

#### For Claude Code Users

**IMPORTANT: Two Different Installation Methods**

**1. Published Package Installation (Most Users)**
```bash
# For published package from npm registry
claude mcp add like-i-said-memory-v2 -- npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2

# This command:
# - Downloads the latest version from npm
# - Uses NPX to run the MCP server
# - Provides all 27 tools
# - Updates automatically with @latest
```

**2. Local Development Installation (Contributors/Developers)**
```bash
# For local development/testing (points to local files)
claude mcp add like-i-said-memory-v2 node /path/to/like-i-said-mcp-server-v2/server-markdown.js

# This command:
# - Points directly to local server file
# - Used for development and testing
# - Requires local git clone of the repository
```

**Alternative: NPX Installation**
```bash
# Direct NPX installation (configures multiple clients)
npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2 install
```

**Manual Installation** (if automatic fails):
```bash
git clone https://github.com/endlessblink/Like-I-Said-memory-mcp-server.git
cd Like-I-Said-memory-mcp-server
npm install
node cli.js install
```

**If Automatic Configuration Fails**:

The installer automatically configures detected IDEs. If you need to manually configure your IDE:

**Cursor** (`~/.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "like-i-said-memory-v2": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server-wrapper.js"],
      "env": {
        "MCP_QUIET": "true"
      }
    }
  }
}
```

**Windsurf** (`~/.codeium/windsurf/mcp_config.json`):
```json
{
  "mcp": {
    "servers": {
      "like-i-said-memory-v2": {
        "command": "node",
        "args": ["/absolute/path/to/mcp-server-wrapper.js"],
        "env": {
          "MCP_QUIET": "true"
        }
      }
    }
  }
}
```

**VS Code with Continue**:
Follow Continue extension's MCP configuration guide.

### Key Differences Summary

| Feature | Claude Desktop | Claude Code |
|---------|---------------------|---------------------|
| Installation | Manual setup required | Manual setup required |
| Configuration | Manual JSON editing | Manual JSON editing |
| Node.js Required | Yes | Yes |
| Updates | Manual update process | Manual update process |
| Target Users | Claude Desktop app users | Web Claude + IDE users |

## Development Workflow

### Starting Development Environment
```bash
# Start full development environment
npm run dev:full

# Or start individually
npm run start:dashboard    # API server on port 3001
npm run dev               # React dashboard on port 5173
```

### Testing
```bash
# Test MCP server functionality
npm run test:mcp

# Test API endpoints
npm run test:api

# Run unit tests
npm test
```

### Building for Production
```bash
npm run build            # Build React dashboard
npm run preview         # Preview production build
```

## Important Development Notes

### Data Safety and Integrity
- **Backup System**: Automatic backups created on startup, periodic intervals, and before major operations
- **Connection Protection**: Prevents data loss during concurrent operations via `lib/connection-protection.cjs`
- **File Integrity**: Checksums and validation through `lib/data-integrity.cjs`
- **Graceful Degradation**: Handles missing or corrupted files gracefully

### Memory and Task Linking
- **Auto-linking**: Tasks automatically link to relevant memories based on content similarity
- **Bidirectional**: Memory-task connections work both ways
- **Relevance Scoring**: Connections include relevance scores for prioritization
- **Manual Override**: Support for manual memory-task connections

### Project Organization
- **Memory Projects**: Memories organized by project context
- **Task Projects**: Tasks grouped by project with inheritance
- **Cross-Project**: Support for cross-project memory and task relationships
- **Default Handling**: Graceful handling of items without project assignment

### Performance Considerations
- **File Watching**: Real-time file system monitoring with chokidar
- **WebSocket Updates**: Real-time dashboard updates for file changes
- **Lazy Loading**: Efficient loading of large memory collections
- **Search Optimization**: Full-text search with indexing for performance

## Common Development Tasks

### Adding New Memory Types
1. Update memory schema in `lib/memory-format.js`
2. Add content type detection in `MarkdownStorage.detectContentType()`
3. Update frontend types in `src/types.ts`
4. Add UI support in dashboard components

### Extending Task Management
1. Modify task schema in `lib/task-storage.js`
2. Update task-memory linking in `lib/task-memory-linker.js`
3. Add new task tools in `server-markdown.js`
4. Update frontend task management components

### Adding New Dashboard Features
1. Create new components in `src/components/`
2. Update main App.tsx for integration
3. Add necessary API endpoints in `dashboard-server-bridge.js`
4. Update types in `src/types.ts`

## File Safety and Moving Files

### IMPORTANT: Before Moving Any Files

**Check `.claude/file-safety-rules.json` for file risk levels and required checks.**

#### Quick Safety Check Commands
```bash
# Check if a file can be safely moved
npm run check:refs <filename>         # Check for references
npm run check:move <filename>         # Run full safety checklist
```

#### File Risk Categories
- **Critical Files** (NEVER move without extensive checking): `server.js`, `package.json`, core lib files
- **High Risk Files** (Many references): `cli.js`, `CLAUDE.md`, memory/task libraries  
- **Medium Risk** (Some references): docs, tests, config files
- **Safe to Move** (Minimal risk): guides, debug files, examples

#### Safe Move Workflow
1. Check risk level in `.claude/file-safety-rules.json`
2. Run `npm run check:refs <filename>`
3. Update all found references
4. Move the file
5. Run `npm test` to verify
6. Test with `npm run dev:full`

See `docs/guides/SAFE-FILE-MOVING.md` for detailed instructions.

## Troubleshooting

### Common Issues
- **MCP Tools Not Appearing**: Check MCP client configuration and restart client
- **Dashboard Not Loading**: Verify both servers are running (ports 3001 and 5173)
- **Memory/Task Linking**: Check file permissions and project organization
- **WebSocket Connection**: Verify firewall settings and port availability


## Testing Requirements
- All new features must have corresponding tests
- Run tests before marking any task complete
- Use Jest for JavaScript/TypeScript projects
- Tests should be in /tests or /__tests__ directory
- Aim for good test coverage of main functionality
- Test both happy path and error conditions
- Run `npm test` to execute tests



### Debug Commands
```bash
# Check MCP server status
npm run test:mcp

# Check API server status
npm run test:api

# Check memory files
ls -la memories/

# Check task files
ls -la tasks/
```

### Log Locations
- **MCP Server**: Console output (stderr)
- **API Server**: Console output and dashboard logs
- **React Dashboard**: Browser console and network tab
- **System Logs**: `data-backups/` directory for backup logs

## File Organization Rules

### CRITICAL: Where Files MUST Go

**ROOT DIRECTORY - Only These Files:**
- `server.js`, `server-markdown.js`, `cli.js`, `dashboard-server-bridge.js` - Entry points
- `package.json`, `package-lock.json` - Package management
- `vite.config.ts`, `tsconfig.json`, `tailwind.config.js`, `postcss.config.js` - Build configs
- `.gitignore`, `.npmignore` - Ignore files
- `README.md`, `LICENSE` - Project info
- `CLAUDE.md` - This file

**🚨 CRITICAL RULE: NEVER CREATE FILES IN ROOT DIRECTORY**

**ONLY these files are allowed in root:**
- Entry point scripts referenced in package.json (`cli.js`, `server.js`, `server-markdown.js`, `dashboard-server-bridge.js`, `mcp-server-wrapper.js`)
- Package management (`package.json`, `package-lock.json`)
- Build/config files required by tools (`vite.config.ts`, `tsconfig.json`, `tailwind.config.js`, `postcss.config.js`, `jest.config.cjs`, `eslint.config.js`)
- Standard project files (`README.md`, `CLAUDE.md`, `.gitignore`, `index.html`)

**🚫 ABSOLUTELY PROHIBITED IN ROOT:**
- Documentation files (`.md` files except README.md and CLAUDE.md)
- Utility scripts (`.js`, `.sh`, `.bat`, `.ps1` files not in package.json)
- Configuration examples or templates
- Log files
- Test files (`.html`, `.test.js`, etc.)
- Temporary files (`.tmp`, `.bak`, etc.)
- Platform-specific scripts or configs

### Directory Structure and Usage

```
Like-I-Said-memory-mcp-server/
├── docs/                    # ALL documentation
│   ├── guides/             # How-to guides, planning docs
│   ├── API-REFERENCE.md    # API documentation
│   └── *.md                # Any other docs
├── scripts/                 # Utility scripts
│   ├── mcp-wrappers/       # MCP-related scripts
│   ├── vite-plugins/       # Vite plugins
│   └── *.js                # Migration, backup, test scripts
├── lib/                     # Core libraries
│   └── *.js                # All library files
├── src/                     # React source code
│   ├── components/         # React components
│   ├── hooks/              # React hooks
│   ├── utils/              # Frontend utilities
│   └── types.ts            # TypeScript definitions
├── tests/                   # Test files
│   └── *.js                # All test files
├── dist/                    # Built frontend (auto-generated)
├── memories/                # Memory storage
│   └── [project-name]/     # Project-specific memories
├── tasks/                   # Task storage
│   └── [project-name]/     # Project-specific tasks
└── data/                    # Application data
    ├── settings.json       # App settings
    └── backups/            # Backup files
```

### File Creation Rules

1. **Documentation**: ALWAYS put in `docs/` or `docs/guides/`
   - Planning documents → `docs/guides/`
   - API docs → `docs/API-REFERENCE.md`
   - Guides → `docs/guides/`

2. **Scripts**: ALWAYS put in `scripts/` or subdirectories
   - Wrapper scripts → `scripts/mcp-wrappers/`
   - Build plugins → `scripts/vite-plugins/`
   - Utilities → `scripts/`

3. **Libraries**: ALWAYS put in `lib/`
   - No subdirectories in lib (flat structure)

4. **React Code**: ALWAYS put in `src/`
   - Components → `src/components/`
   - Hooks → `src/hooks/`
   - Utilities → `src/utils/`

5. **Tests**: ALWAYS put in `tests/`
   - Unit tests → `tests/`
   - Integration tests → `tests/`
   - Test HTML files → `tests/`

6. **Logs**: ALWAYS put in `logs/`
   - Application logs → `logs/`
   - Debug logs → `logs/`
   - Server logs → `logs/`

### ⚠️ ENFORCEMENT RULES

**Before creating ANY file, ask yourself:**
1. Is this an entry point script referenced in package.json? → Root allowed
2. Is this a build/config file required by a tool? → Root allowed  
3. Is this README.md, CLAUDE.md, or .gitignore? → Root allowed
4. **OTHERWISE** → MUST go in appropriate subdirectory

**Common Violations to Avoid:**
- Startup scripts (start-*.js, start-*.bat, start-*.sh) → `scripts/`
- Test scripts (test-*.js) → `scripts/` or `tests/`
- Setup/utility scripts → `scripts/`
- Release notes, guides → `docs/` or `docs/guides/`
- Config examples → `docs/guides/` or `data/`
- Platform-specific files → `scripts/`
- Log files → `logs/`
- Temporary files → DELETE immediately

### Examples

❌ **ABSOLUTELY WRONG:**
- Creating `SETUP-GUIDE.md` in root
- Creating `start-dashboard.js` in root  
- Creating `test-platform.js` in root
- Creating `config.example.json` in root
- Creating `RELEASE-NOTES.md` in root
- Creating `*.log` files in root
- Creating `*.tmp` files in root

✅ **ALWAYS CORRECT:**
- Creating `docs/guides/SETUP-GUIDE.md`
- Creating `scripts/start-dashboard.js`
- Creating `scripts/test-platform.js` or `tests/test-platform.js`
- Creating `docs/guides/config.example.json`
- Creating `docs/RELEASE-NOTES.md`
- Configuring logs to `logs/` directory
- Immediately deleting temp files or using proper temp directories

## Recent Updates and Status

### Current Version: 2.3.7
- ✅ Enhanced MCP server with 12 tools
- ✅ Modern React dashboard with real-time updates
- ✅ Comprehensive task management system
- ✅ Memory-task auto-linking capabilities
- ✅ Project-based organization
- ✅ Advanced search and filtering
- ✅ Data protection and integrity safeguards
- ✅ Session handoff generation
- ✅ Storybook integration for component development

### Development Status
- **Stable**: MCP server and core memory management
- **Stable**: React dashboard with modern UI
- **Stable**: Task management with memory linking
- **Stable**: Storybook component development
- **Active**: Performance optimizations and UI enhancements
- **Active**: Advanced analytics and reporting features

This documentation provides the essential information needed to work effectively with the Like-I-Said MCP Server v2 codebase. The project combines robust MCP server functionality with modern web dashboard capabilities, providing a comprehensive memory management solution for AI assistants.