# WSL2 Troubleshooting Guide for Like-I-Said MCP

## Overview

This guide addresses crashes and stability issues when running Like-I-Said MCP on Claude Code in WSL2 environments.

## 🔴 Common Issues in WSL2

### 1. **Frequent Crashes**
- **Cause**: better-sqlite3 native module compiled for different Node.js version
- **Symptoms**: MCP server crashes silently, Claude Code loses connection
- **Solution**: Automatically uses sql.js in WSL2 (pure JavaScript implementation)

### 2. **Large WAL Files**
- **Cause**: SQLite Write-Ahead Logging issues with WSL2 file system
- **Symptoms**: tasks-v3.db-wal file grows to several MB
- **Solution**: WAL mode disabled in WSL2, temporary files cleaned up

### 3. **Memory Issues**
- **Cause**: Too many modules loaded simultaneously
- **Symptoms**: High memory usage, slow performance
- **Solution**: Lazy loading implemented, memory limit set to 2GB

## ✅ Automatic Fixes Applied

When you run Like-I-Said MCP in WSL2, the following optimizations are automatically applied:

1. **sql.js Database** - JavaScript implementation instead of native SQLite
2. **Lazy Module Loading** - Heavy modules loaded only when needed
3. **WAL Mode Disabled** - Prevents file system issues
4. **Memory Limits** - Node.js limited to 2GB to prevent crashes
5. **Clean Process Management** - Duplicate instances prevented

## 🚀 Quick Start for WSL2

### Method 1: Use the WSL2 Startup Script (Recommended)
```bash
./start-wsl2.sh
```

### Method 2: Manual Environment Setup
```bash
export LIKE_I_SAID_DB=sqljs
export LIKE_I_SAID_WSL2_MODE=true
export LIKE_I_SAID_DISABLE_WAL=true
export NODE_OPTIONS="--max-old-space-size=2048"
node server-markdown.js
```

### Method 3: Run the Fix Script
```bash
node scripts/fix-wsl2-crashes.js
```

This script will:
- Detect WSL2 environment
- Back up your databases
- Clean corrupted files
- Set up proper configuration
- Test the database connection

## 📊 Diagnostic Commands

### Check if Running in WSL2
```bash
# Check for WSL environment
echo $WSL_DISTRO_NAME
cat /proc/version | grep -i microsoft
```

### Check Memory Usage
```bash
free -h
```

### Check Node.js Version
```bash
node --version
```

### Check Database Files
```bash
ls -lah data/*.db*
```

### Monitor MCP Processes
```bash
ps aux | grep -E "(node|like-i-said)" | grep -v grep
```

## 🔧 Environment Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `LIKE_I_SAID_DB` | `sqljs` | Force sql.js database |
| `LIKE_I_SAID_WSL2_MODE` | `true` | Enable WSL2 compatibility |
| `LIKE_I_SAID_DISABLE_WAL` | `true` | Disable SQLite WAL mode |
| `NODE_OPTIONS` | `--max-old-space-size=2048` | Limit Node.js memory |
| `MCP_QUIET` | `true` | Reduce console output |
| `MCP_MODE` | `true` | Enable MCP mode |

## 🛠️ Manual Troubleshooting

### Issue: Server Still Crashes

1. **Clean database files:**
   ```bash
   rm -f data/tasks-v3.db-wal data/tasks-v3.db-shm
   ```

2. **Force sql.js usage:**
   ```bash
   export LIKE_I_SAID_DB=sqljs
   ```

3. **Check for duplicate processes:**
   ```bash
   pkill -f "node.*server-markdown"
   ```

### Issue: Database Corruption

1. **Backup existing data:**
   ```bash
   cp -r data data.backup
   ```

2. **Reset database:**
   ```bash
   rm -f data/tasks-v3.*
   ```

3. **Restart with clean database:**
   ```bash
   ./start-wsl2.sh
   ```

### Issue: High Memory Usage

1. **Check current usage:**
   ```bash
   free -h
   top -b -n 1 | head -20
   ```

2. **Increase WSL2 memory limit** (in Windows):
   Create/edit `%USERPROFILE%\.wslconfig`:
   ```ini
   [wsl2]
   memory=8GB
   swap=2GB
   ```

3. **Restart WSL2:**
   ```powershell
   wsl --shutdown
   ```

## 📈 Performance Tips

1. **Use sql.js consistently** - Don't switch between databases
2. **Regular cleanup** - Remove WAL/SHM files periodically
3. **Monitor memory** - Keep an eye on `free -h` output
4. **Limit concurrent operations** - Avoid running multiple MCP servers
5. **Use the startup script** - `./start-wsl2.sh` handles everything

## 🔍 Verification

After applying fixes, verify the system is working:

```bash
# Check database type being used
export LIKE_I_SAID_DB=sqljs
node -e "console.log('Database:', process.env.LIKE_I_SAID_DB)"

# Test database connection
node scripts/fix-wsl2-crashes.js

# Start server and check for errors
timeout 10 ./start-wsl2.sh
```

## 📚 Technical Details

### Why sql.js?
- **Pure JavaScript** - No native compilation issues
- **In-memory with persistence** - Fast performance
- **Cross-platform** - Works everywhere Node.js runs
- **No version conflicts** - Independent of Node.js version

### What's Different?
- Database stored as `.sqljs` file instead of `.db`
- No WAL or SHM files created
- Slightly higher memory usage (database in memory)
- Automatic save on changes

### Migration
- Existing better-sqlite3 databases automatically migrated
- Data preserved during migration
- Backups created before any changes

## 🆘 Getting Help

If issues persist after trying these solutions:

1. Run the diagnostic script and save output:
   ```bash
   node scripts/fix-wsl2-crashes.js > wsl2-diagnostic.log 2>&1
   ```

2. Check the backup directory:
   ```bash
   ls -la data/backups/
   ```

3. Review the logs for specific errors
4. Report issues with the diagnostic log attached

## ✨ Summary

The Like-I-Said MCP server now automatically detects WSL2 and applies necessary optimizations. You should experience:

- **No more crashes** from Node.js version mismatches
- **Stable operation** with sql.js database
- **Better memory management** with lazy loading
- **Automatic cleanup** of corrupted files
- **Seamless migration** from existing databases

Simply use `./start-wsl2.sh` or let the system auto-detect WSL2 for optimal performance!