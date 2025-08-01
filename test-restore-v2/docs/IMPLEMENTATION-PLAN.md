# Implementation Plan - Like-I-Said v2.6.8

## Overview
This document outlines the implementation plan for three critical objectives while ensuring no existing functionality breaks.

## Objectives

### 1. Dynamic Port Detection (No Hardcoded Ports)
**Goal**: Eliminate all hardcoded ports and implement automatic port discovery

**Implementation Steps**:
1. ✅ Create `lib/port-finder.js` utility
   - `findAvailablePort()` - Find next available port
   - `writePortFile()` - Write discovered port to `.dashboard-port`
   - `readPortFile()` - Read port from file
   - `cleanupPortFile()` - Cleanup on shutdown

2. Update `dashboard-server-bridge.js`:
   ```javascript
   // Remove hardcoded port
   const preferredPort = process.env.PORT || 3001;
   const port = await findAvailablePort(preferredPort);
   writePortFile(port);
   ```

3. Update frontend port discovery:
   - ✅ Already have `vite-port-plugin.js`
   - Update `src/App.tsx` to fetch port dynamically
   - Add fallback mechanism

4. Remove ALL hardcoded port references:
   - `dashboard-server-bridge.js`: constructor(port = 3001) → dynamic
   - `src/App.tsx`: :3001 → dynamic discovery
   - `vite.config.ts`: proxy target → dynamic

### 2. Path Configuration Verification
**Goal**: Ensure custom path configuration works with 100% reliability

**Current Status**:
- ✅ Backend endpoints exist (`getPaths`, `updatePaths`)
- ✅ Frontend component exists (`PathConfiguration.tsx`)
- ✅ Path validation implemented

**Enhancements Needed**:
1. Add persistent storage for path configuration
2. Create/ensure directories exist when updating paths
3. Add Windows-specific path handling
4. Improve error messages for permission issues

### 3. Automatic Folder Discovery
**Goal**: Auto-detect existing memories/tasks folders

**Implementation**:
1. Create `lib/folder-discovery.js`:
   ```javascript
   async function discoverFolders() {
     const locations = [
       // User paths
       path.join(home, 'memories'),
       path.join(home, 'like-i-said-mcp'),
       path.join(home, 'Documents', 'like-i-said'),
       // Windows specific
       'D:\\MY PROJECTS\\AI\\LLM\\AI Code Gen\\my-builds\\My MCP\\like-i-said-npm-test',
       // Current directory
       './memories',
       './tasks'
     ];
     
     return scanForValidFolders(locations);
   }
   ```

2. Update `getSuggestedPaths()` to include discovered folders
3. Add UI indicator for auto-discovered vs suggested paths

## Implementation Order

### Phase 1: Dynamic Port Detection (Priority: URGENT)
1. Update dashboard-server-bridge.js to use port-finder.js
2. Test port detection works when 3001/3002 are busy
3. Update frontend to discover port dynamically
4. Remove all hardcoded port references

### Phase 2: Path Configuration Hardening (Priority: HIGH)
1. Add path persistence to settings file
2. Implement directory creation on path update
3. Add comprehensive Windows path support
4. Test with various path formats

### Phase 3: Auto-Discovery (Priority: MEDIUM)
1. Implement folder scanner
2. Add discovered folders to suggestions
3. Update UI to show discovery status
4. Test on Windows with user's specific path

## Testing Plan

### Port Detection Tests:
- [ ] Start with port 3001 occupied (Flowise)
- [ ] Verify finds 3002 automatically
- [ ] Start with both 3001 and 3002 occupied
- [ ] Verify frontend connects to correct port
- [ ] Test WebSocket connections work

### Path Configuration Tests:
- [ ] Set custom Windows path (D:\...)
- [ ] Set relative path
- [ ] Set non-existent path (should create)
- [ ] Test permission errors handled gracefully
- [ ] Verify persistence across restarts

### Auto-Discovery Tests:
- [ ] Test finds existing installations
- [ ] Test Windows path discovery
- [ ] Test handles missing folders gracefully
- [ ] Verify UI shows discovered folders

## Risk Mitigation

### Backward Compatibility:
- Keep environment variable support (MEMORY_DIR, TASK_DIR)
- Maintain default paths if no config exists
- Support existing .dashboard-port file format

### Error Handling:
- Graceful fallbacks for all features
- Clear error messages for users
- Logging for debugging

### Performance:
- Async/await for all file operations
- Caching for discovered folders
- Efficient port scanning

## Success Criteria

1. **Dynamic Ports**: No port conflicts ever occur
2. **Path Config**: Works 100% reliably on all platforms
3. **Auto-Discovery**: Finds existing data automatically
4. **Stability**: All existing features continue working
5. **User Experience**: Seamless for existing users

## Rollback Plan

If any issues occur:
1. Git revert to previous commit
2. Document specific failure
3. Fix issue in isolation
4. Re-test comprehensively

---

Ready to begin implementation following this plan.