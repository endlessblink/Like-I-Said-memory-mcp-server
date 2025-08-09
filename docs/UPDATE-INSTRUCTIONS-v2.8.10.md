# Update Instructions for v2.8.10 - Dashboard Fixes

## 🚨 IMPORTANT: Dashboard Updates Required!

Many fixes in v2.8.10 are for the React dashboard. You MUST rebuild the dashboard after updating.

## Complete Update Process

### Step 1: Update the Package

#### For npm users:
```bash
npm install @endlessblink/like-i-said-v2@latest
```

#### For Claude Code users:
```bash
# Remove old version
claude mcp remove like-i-said-memory-v2

# Install new version
claude mcp add like-i-said-memory-v2 -- npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2
```

#### For local development/GitHub clone:
```bash
git pull origin main
npm install
```

### Step 2: Rebuild the Dashboard (CRITICAL!)

After updating, you MUST rebuild the dashboard to get the fixes:

```bash
# Navigate to your Like-I-Said directory
cd /path/to/like-i-said-mcp-server-v2

# Install dependencies (in case any changed)
npm install

# Build the dashboard
npm run build

# Start the dashboard with the fixes
npm run dashboard
# or
npm run dev:full
```

### Step 3: Clear Browser Cache (if needed)

If you still see the Loader2 error after rebuilding:

1. Open the dashboard (http://localhost:5173)
2. Press `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac) for hard refresh
3. Or clear browser cache for localhost

## What Gets Fixed

### Dashboard Fixes (require rebuild):
- ✅ **Loader2 Error**: Fixed missing import in FilterPresets.tsx
- ✅ **UI Stability**: Better error handling throughout dashboard
- ✅ **Task Management**: Improved task ID handling in UI

### Backend Fixes (work immediately):
- ✅ **Task ID Flexibility**: Supports PAL-G0023 format
- ✅ **Better Error Messages**: Helpful suggestions
- ✅ **EPIPE Errors**: Console output stability

## Quick Verification

After updating and rebuilding:

1. **Check Loader2 Fix**:
   - Open dashboard
   - Should load without "Loader2 is not defined" error

2. **Check Task IDs**:
   - Try updating a task with alternative ID format
   - Should work or give helpful error message

3. **Check Dashboard Stability**:
   - Run `npm run dev:full`
   - Should start without crashes

## Troubleshooting

### Still seeing Loader2 error?
```bash
# Force rebuild
rm -rf dist/
npm run build
npm run dashboard
```

### Dashboard not starting?
```bash
# Check if port is in use
lsof -i :5173  # (Mac/Linux)
netstat -ano | findstr :5173  # (Windows)

# Start on different port
PORT=5174 npm run dev
```

### Task IDs still not working?
- Make sure you're using the MCP server, not just the dashboard
- Restart your Claude client after updating

## Alternative: Fresh Install

If updates aren't working, try a fresh install:

```bash
# Backup your data first!
cp -r memories/ ~/memories-backup/
cp -r tasks/ ~/tasks-backup/

# Fresh install
npm uninstall -g @endlessblink/like-i-said-v2
npm install -g @endlessblink/like-i-said-v2@latest

# Restore your data
cp -r ~/memories-backup/* memories/
cp -r ~/tasks-backup/* tasks/
```

## Need Help?

If you're still experiencing issues after following these steps:
1. Check the [GitHub Issues](https://github.com/endlessblink/Like-I-Said-memory-mcp-server/issues)
2. Create a new issue with:
   - Your error message
   - Steps you've tried
   - Your environment (OS, Node version)