# Root Scripts Analysis - What Needs to Stay vs Move

## MUST STAY IN ROOT (Critical Files)

### 1. **server.js** ✅
- **Why**: Main entry point in package.json ("start", "start:mcp", "start:legacy")
- **References**: NPM scripts rely on this location
- **Purpose**: Alias/wrapper for server-markdown.js

### 2. **server-markdown.js** ✅
- **Why**: Main MCP server, referenced in test:mcp script
- **References**: 87+ references throughout codebase
- **Purpose**: Core MCP server implementation

### 3. **cli.js** ✅
- **Why**: NPX entry point, referenced in package.json scripts
- **References**: "install-mcp" and "configure" scripts
- **Purpose**: Installation and configuration CLI

### 4. **dashboard-server-bridge.js** ✅
- **Why**: API server, referenced in "start:dashboard" script
- **References**: Multiple package.json scripts
- **Purpose**: Bridge between MCP and web dashboard

### 5. **mcp-server-wrapper.js** ✅
- **Why**: Main entry point in package.json ("main" field likely)
- **References**: MCP client configurations, documentation
- **Purpose**: Quiet wrapper for MCP clients

### 6. **start-unified-dashboard.js** ✅
- **Why**: Referenced in "dashboard" script
- **References**: package.json script
- **Purpose**: Unified dashboard launcher

## CAN MOVE TO scripts/ (Non-Critical)

### 1. **simple-server.js** 🚚
- **Purpose**: Appears to be a simplified test server
- **Action**: Move to scripts/testing/

### 2. **test-server.js** 🚚
- **Purpose**: Test server for development
- **Action**: Move to scripts/testing/

### 3. **check-system-changes.sh** 🚚
- **Purpose**: System checking utility
- **Action**: Move to scripts/

### 4. **start-dashboard-fixed.js** 🚚
- **Purpose**: Alternative dashboard starter (testing/debugging)
- **Action**: Move to scripts/alternatives/

### 5. **start-dashboard-wsl.sh** 🚚
- **Purpose**: WSL-specific launcher
- **Action**: Move to scripts/platform-specific/

## CAN DELETE (Obsolete/Redundant)

### 1. **start-dashboard.js** ❌
- **Why**: Not referenced in package.json
- **Status**: Appears to be replaced by start-unified-dashboard.js

### 2. **start-dashboard.cmd** ❌
- **Why**: Already have start-dashboard.bat
- **Status**: Redundant Windows launcher

### 3. **start-dashboard.sh** ❌
- **Why**: Very simple script, functionality covered elsewhere
- **Status**: Can use npm scripts instead

## KEEP BUT MONITOR (Config Files)

### 1. **eslint.config.js** ✅
- **Why**: ESLint configuration
- **Status**: Standard location

### 2. **postcss.config.js** ✅
- **Why**: PostCSS configuration
- **Status**: Standard location

### 3. **tailwind.config.js** ✅
- **Why**: Tailwind CSS configuration
- **Status**: Standard location

### 4. **vite.config.ts** ✅
- **Why**: Vite configuration
- **Status**: Standard location

## Summary

### Files that MUST stay in root (7):
- server.js
- server-markdown.js
- cli.js
- dashboard-server-bridge.js
- mcp-server-wrapper.js
- start-unified-dashboard.js
- start-dashboard.bat (Windows users need this)

### Files to MOVE to scripts/ (5):
- simple-server.js → scripts/testing/
- test-server.js → scripts/testing/
- check-system-changes.sh → scripts/
- start-dashboard-fixed.js → scripts/alternatives/
- start-dashboard-wsl.sh → scripts/platform-specific/

### Files to DELETE (3):
- start-dashboard.js
- start-dashboard.cmd
- start-dashboard.sh

### Config files that stay (4):
- eslint.config.js
- postcss.config.js
- tailwind.config.js
- vite.config.ts

## Next Steps

1. Create subdirectories in scripts/:
   ```bash
   mkdir -p scripts/testing
   mkdir -p scripts/alternatives
   mkdir -p scripts/platform-specific
   ```

2. Move non-critical files to appropriate locations

3. Delete obsolete files

4. Update any documentation that references moved files