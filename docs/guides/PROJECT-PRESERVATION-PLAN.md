# Project Preservation Plan - Like-I-Said MCP Server v2
*Generated: 2025-07-19*

## Executive Summary

This comprehensive preservation plan ensures the stability and continuity of the Like-I-Said MCP Server v2 project. Based on deep analysis of the codebase, recent changes, and current state, this plan provides actionable strategies to maintain functionality while enabling safe future development.

## Current State Assessment

### Project Overview
- **Name**: Like-I-Said MCP Server v2
- **Version**: 2.6.21
- **Type**: MCP (Model Context Protocol) memory server with React dashboard
- **Primary Purpose**: Persistent memory management for AI assistants
- **Architecture**: Three-tier (MCP Server → API Bridge → React Dashboard)

### Working Components
1. **MCP Server** (`server-markdown.js`) - Core memory/task management
2. **API Bridge** (`dashboard-server-bridge.js`) - REST API + WebSocket
3. **React Dashboard** - Modern UI for memory visualization
4. **Authentication System** - Disabled by default (opt-in)
5. **Data Protection** - Automated backups, connection protection
6. **Task Management** - Full CRUD with memory linking

### Recent Changes (Last 10 commits)
- UI fixes for memory edit modal and card layouts
- Safe reintroduction of @xenova/transformers as optional
- Reversion to v2.6.8 NPX configuration (stable)
- MCP entry point fixes for JSON-RPC compliance

## Risk Analysis

### Critical Risk Areas

#### 1. MCP Server Stability
- **Risk**: JSON-RPC protocol violations can break Claude integration
- **Evidence**: Recent commits fixing STDIO wrapper issues
- **Impact**: High - Core functionality failure

#### 2. Dependency Management
- **Risk**: Optional dependencies (@xenova/transformers) causing installation issues
- **Evidence**: Recent reintroduction as "optional" dependency
- **Impact**: Medium - Installation failures on some systems

#### 3. Port Configuration
- **Risk**: Hardcoded ports causing conflicts
- **Evidence**: Port detection system in place but fragile
- **Impact**: Medium - Dashboard accessibility issues

#### 4. File System Operations
- **Risk**: Data corruption during concurrent operations
- **Evidence**: Protection systems exist but complex
- **Impact**: High - User data loss

#### 5. Cross-Platform Compatibility
- **Risk**: Windows/WSL/Linux path handling differences
- **Evidence**: Multiple platform-specific fixes in history
- **Impact**: Medium - Feature availability varies by platform

## Preservation Strategies

### 1. Version Locking Strategy
```json
{
  "freeze": {
    "core": ["server-markdown.js", "lib/memory-format.js", "lib/task-storage.js"],
    "critical_libs": ["lib/system-safeguards.js", "lib/connection-protection.cjs"],
    "api": ["dashboard-server-bridge.js"]
  },
  "versioning": {
    "strategy": "Create preservation branches before major changes",
    "naming": "preserve/v2.6.21-stable-YYYY-MM-DD"
  }
}
```

### 2. Automated Testing Regime
```bash
# Daily stability check
npm run test:mcp && npm run test:api

# Before any changes
npm run test:pre-push

# Full system validation
npm run test:complete-system
```

### 3. Data Protection Protocol
1. **Automated Backups**
   - On startup (already implemented)
   - Before destructive operations (already implemented)
   - Scheduled hourly backups (configurable)

2. **Backup Verification**
   ```bash
   # Add to daily routine
   ls -la data-backups/ | tail -10
   find data-backups -name "*.json" -mtime -1 | wc -l
   ```

3. **Recovery Testing**
   - Monthly restore drill from backups
   - Document recovery procedures

### 4. Dependency Management
```javascript
// package.json preservation rules
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0", // LOCK VERSION
    // ... other critical deps
  },
  "optionalDependencies": {
    "@xenova/transformers": "^2.21.1" // Keep optional
  },
  "overrides": {
    // Add specific overrides for known working versions
  }
}
```

### 5. Configuration Management
```javascript
// Create immutable defaults
const STABLE_CONFIG = {
  api: { port: 3001, fallbacks: [3002, 3003, 3004] },
  ui: { port: 5173, fallbacks: [5174, 5175] },
  paths: {
    memories: process.env.MEMORY_DIR || 'memories',
    tasks: process.env.TASK_DIR || 'tasks'
  }
};
```

## Implementation Checklist

### Immediate Actions (Do Today)
- [ ] Create git tag `v2.6.21-stable`
- [ ] Create preservation branch `preserve/2025-01-19-stable`
- [ ] Run full test suite and document results
- [ ] Backup current data directories
- [ ] Document current working configuration

### Short-term Actions (This Week)
- [ ] Implement version locking in package.json
- [ ] Create automated daily health check script
- [ ] Document recovery procedures
- [ ] Set up monitoring for critical paths
- [ ] Create rollback procedures

### Long-term Actions (This Month)
- [ ] Implement comprehensive integration tests
- [ ] Create performance baselines
- [ ] Document all API contracts
- [ ] Implement feature flags for new development
- [ ] Create disaster recovery plan

## Safe Development Guidelines

### 1. Change Management
- **Never modify critical files directly**
- **Always create feature branches**
- **Test in isolation before merging**
- **Maintain backward compatibility**

### 2. Testing Requirements
- **Unit tests for new features**
- **Integration tests for API changes**
- **System tests for UI changes**
- **Cross-platform tests for file operations**

### 3. Documentation Requirements
- **Update CLAUDE.md for AI context**
- **Document breaking changes**
- **Maintain API documentation**
- **Update troubleshooting guides**

## Monitoring and Alerts

### Health Checks
```javascript
// Add to monitoring routine
const healthChecks = {
  mcp: () => checkMCPServer(),
  api: () => checkAPIServer(), 
  ui: () => checkUIServer(),
  data: () => checkDataIntegrity(),
  backups: () => checkBackupRecency()
};
```

### Alert Conditions
1. MCP server not responding
2. API server port conflicts
3. No recent backups (>24h)
4. Memory/task file corruption
5. Dependency installation failures

## Recovery Procedures

### 1. MCP Server Failure
```bash
# Stop all processes
pkill -f "node.*server-markdown"
pkill -f "node.*dashboard-server"

# Clear port locks
rm -f .dashboard-port

# Restart with logging
npm run start:mcp 2>&1 | tee mcp-recovery.log
```

### 2. Data Corruption
```bash
# Identify latest clean backup
ls -la data-backups/ | grep -E "startup|manual"

# Restore from backup
cp -r data-backups/backup-TIMESTAMP/* ./
```

### 3. Dashboard Issues
```bash
# Rebuild frontend
rm -rf dist/
npm run build

# Clear caches
rm -rf node_modules/.vite
```

## Success Metrics

### Stability Indicators
- Zero data loss incidents
- <1% API failure rate
- <5s dashboard load time
- 100% backup success rate
- Zero critical security issues

### Performance Baselines
- Memory creation: <100ms
- Task creation: <150ms
- Search operations: <500ms
- Dashboard initial load: <3s
- WebSocket reconnection: <2s

## Conclusion

This preservation plan provides a comprehensive framework for maintaining the Like-I-Said MCP Server v2 project's stability while enabling controlled evolution. By following these guidelines, the project can continue serving users reliably while new features are developed safely.

Regular reviews of this plan (monthly) will ensure it remains relevant and effective as the project evolves.

---
*This plan is version-controlled and should be updated with lessons learned from any incidents or major changes.*