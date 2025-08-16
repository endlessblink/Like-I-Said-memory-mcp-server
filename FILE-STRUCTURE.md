# Like-I-Said MCP v2 - Clean File Structure

## Core Files ✅

### MCP Server
- **server.js** - Main MCP server (working Windows version)
- **package.json** - Dependencies and scripts
- **package-lock.json** - Dependency lockfile

### Memory Storage
- **memories.json** - JSON array storage for memories
- **memory.json** - Legacy object format (kept for migration)
- **memory-manager.js** - Memory management utilities

### Configuration Templates
- **cursor-windows-config.json** - Working Cursor config
- **cursor-forward-slash-windows.json** - Alternative Cursor config
- **claude_desktop_config.json** - Claude Desktop config
- **mcp-config.template.json** - Generic template

### Installers ✅
- **auto-install-all-clients.bat** - Windows batch installer
- **quick-setup.ps1** - PowerShell installer with options

### Documentation ✅
- **CLAUDE.md** - Claude Code development guide
- **PROJECT-MEMORY.md** - Complete project context
- **INSTALLATION-README.md** - User installation guide
- **README.md** - Project overview
- **FILE-STRUCTURE.md** - This file

## Dashboard/UI Files ✅

### Backend
- **dashboard-server.js** - Express API server (port 3001)

### Frontend (React/Vite)
- **index.html** - Main HTML entry point
- **vite.config.ts** - Vite configuration
- **tailwind.config.js** - Tailwind CSS config
- **postcss.config.js** - PostCSS config
- **components.json** - shadcn/ui config
- **eslint.config.js** - ESLint configuration

### TypeScript Config
- **tsconfig.json** - Base TypeScript config
- **tsconfig.app.json** - App-specific config
- **tsconfig.node.json** - Node.js config

### Source Code
- **src/** - React frontend source
  - **App.tsx** - Main app component
  - **main.tsx** - Entry point
  - **components/** - UI components
  - **lib/** - Utilities

### Build Output
- **dist/** - Production build output
- **public/** - Static assets

## Utility Files ✅

### Development
- **cli.js** - Command line interface
- **migrate.js** - Data migration utilities
- **http-server.js** - Development HTTP server

### Process Management
- **ecosystem.config.js** - PM2 configuration
- **manage-server.ps1** - Server management script
- **install-service.js** - Service installation

### Docker Support
- **Dockerfile** - Container configuration
- **docker-compose.yml** - Multi-container setup

## Memory Storage Structure

### Directory Layout
```
memories/
├── global/           # Global memories
└── projects/         # Project-specific memories
    ├── Like-I-said-mcp-server-v2/
    └── Like-I-said-mcp-server/
```

## Removed Files (Cleaned Up)

### Redundant Installers
- All auto-fix, bulletproof, simple, smart, universal installers
- Multiple cursor config variations
- Debug and test scripts

### Outdated Documentation
- Multiple setup guides consolidated into INSTALLATION-README.md
- Legacy configuration examples

### Development Artifacts
- Log files and backup files
- Debug configurations
- Test scripts

## Next Steps

This clean structure focuses on:
1. **Working MCP server** (server.js)
2. **Proven installers** (batch + PowerShell)
3. **Essential documentation** (CLAUDE.md, PROJECT-MEMORY.md)
4. **Dashboard functionality** (React app + Express API)
5. **Configuration templates** (working configs only)

The project is now ready for:
- Easy distribution
- Clear development workflow
- Reliable installation process
- Maintainable codebase