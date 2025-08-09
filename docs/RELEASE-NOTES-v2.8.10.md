# Release Notes - v2.8.10

## 🚀 What's Fixed

### 1. ✅ Loader2 Component Error Fixed
- **Issue**: "Loader2 is not defined" error in React dashboard
- **Fix**: Added missing import in FilterPresets.tsx
- **Impact**: Dashboard now loads without errors

### 2. ✅ Task ID Format Flexibility
- **Issue**: Tasks with IDs like `PAL-G0023` or `PAL-0001` returned "not found" errors
- **Fix**: Implemented intelligent task ID validation with automatic format conversion
- **New Features**:
  - Supports multiple ID formats (C, G, legacy, UUID, TASK-XXXXX)
  - Auto-converts alternative formats (e.g., PAL-G0023 → PAL-C0023)
  - Provides helpful error messages with suggestions
  - Shows similar task IDs when typos occur

### 3. ✅ Dashboard Connection Stability
- **Issue**: EPIPE errors causing dashboard crashes when output is piped
- **Fix**: Implemented safe console wrapper to handle piped output gracefully
- **Impact**: More stable dashboard operations

### 4. ✅ Confirmed: dev:full Script Exists
- **Issue**: Reports of missing `dev:full` script
- **Status**: Script exists in v2.8.9+ (users were on older versions)
- **Command**: `npm run dev:full`

## 📦 How to Update

### ⚠️ IMPORTANT: Dashboard Rebuild Required!
The Loader2 fix requires rebuilding the React dashboard after updating.

### For npm users:
```bash
# 1. Update the package
npm install @endlessblink/like-i-said-v2@latest

# 2. Rebuild the dashboard (REQUIRED for Loader2 fix!)
cd node_modules/@endlessblink/like-i-said-v2
npm run build
```

### For Claude Code users:
```bash
# 1. Remove old version
claude mcp remove like-i-said-memory-v2

# 2. Install new version
claude mcp add like-i-said-memory-v2 -- npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2

# 3. The dashboard should auto-rebuild with npx
```

### For local development:
```bash
# 1. Pull latest changes
git pull origin main

# 2. Install dependencies
npm install

# 3. Rebuild dashboard (REQUIRED!)
npm run build

# 4. Start the dashboard
npm run dashboard
# or
npm run dev:full
```

### Quick Start After Update:
```bash
# This starts both API and rebuilt dashboard
npm run dev:full
```

## 🎯 Key Improvements

### Better Error Messages
**Before**: `❌ Task with ID PAL-G0023 not found`

**After**: `❌ Task with ID PAL-G0023 not found. Did you mean PAL-C0023?`

### Task ID Format Support
Now supports these formats:
- Standard: `PAL-C0001`
- Alternative: `PAL-G0023` (auto-converts to C format)
- Legacy: `PAL-0001` (auto-converts to C format)
- UUID: `123e4567-e89b-12d3-a456-426614174000`
- Simple: `TASK-12345`

## 💡 Usage Tips

1. **Task IDs**: You can now use G-format IDs and they'll automatically convert
2. **Finding Tasks**: Always use `list_tasks` to see available task IDs
3. **Dashboard**: If you had Loader2 errors, they're now fixed
4. **Development**: Use `npm run dev:full` to start both API and UI

## 🐛 Known Issues
- Dashboard startup detection in tests needs minor adjustment (doesn't affect functionality)

## 📚 Documentation
- Created comprehensive fix documentation in `/docs/`
- Added unit tests for all fixes
- Improved error handling throughout the system

## 🙏 Thank You
Thanks to all users who reported these issues! Your feedback helps make Like-I-Said better.

---
*If you encounter any issues after updating, please report them at https://github.com/endlessblink/Like-I-Said-memory-mcp-server/issues*