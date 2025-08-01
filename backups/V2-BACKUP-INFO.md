# Like-I-Said v2 Complete Backup

## Backup Information
- **Date**: January 31, 2025
- **Version**: v2.3.7
- **Backup File**: `like-i-said-v2-complete-backup-20250731-235844.tar.gz`
- **Size**: 5.9MB
- **Location**: `/backups/`

## What's Included
✅ Full source code (src/, lib/, scripts/)
✅ All configuration files (package.json, vite.config.ts, etc.)
✅ Documentation (docs/, README.md, CLAUDE.md)
✅ Entry point scripts (server-markdown.js, cli.js, etc.)
✅ Sample memories and tasks
✅ HTML visualization files

## What's Excluded
❌ node_modules/ (can be restored with npm install)
❌ dist/ (build artifacts)
❌ .git/ (version control)
❌ Large data files
❌ Log files

## How to Restore

1. **Extract the backup**:
   ```bash
   tar -xzf like-i-said-v2-complete-backup-20250731-235844.tar.gz
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Copy your data** (if needed):
   ```bash
   cp -r /original/memories ./memories
   cp -r /original/tasks ./tasks
   ```

4. **Start the development environment**:
   ```bash
   npm run dev:full
   ```

## Key Features Preserved
- Complete MCP server implementation with 27 tools
- React dashboard with real-time updates
- Task-memory auto-linking system
- Project-based organization
- Advanced search and analytics
- Session handoff generation
- Storybook component library

## Important Notes
- This is a complete working backup of v2.3.7
- All core functionality is preserved
- You can use this to rollback or reference while developing v3
- The backup excludes user data to keep size manageable