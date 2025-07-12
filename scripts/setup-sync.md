# Setting Up Hybrid Sync for Like-I-Said MCP Server

## Overview

This setup gives you:
- **Real-time sync** for memories, tasks, and data
- **Git-based sync** for code changes
- **Best of both worlds**: Fast WSL development + Windows client support

## Option 1: Syncthing (Recommended for Real-time)

### Install Syncthing
```bash
# WSL
sudo apt-get update
sudo apt-get install syncthing

# Windows
# Download from https://syncthing.net/downloads/
```

### Configure Folders
Only sync these directories:
- `/memories`
- `/tasks`
- `/data`
- `/vectors` (if using)

### Ignore Patterns
Add to Syncthing ignore:
```
node_modules
dist
.git
*.log
.env.local
lib
src
__tests__
```

## Option 2: Simple Cron-based Sync

### Setup Cron Job
```bash
# Add to crontab (runs every 5 minutes)
*/5 * * * * /path/to/hybrid-sync-manager.sh sync_data
```

## Option 3: inotify-based Real-time Sync

### Install inotify-tools
```bash
sudo apt-get install inotify-tools
```

### Run Watcher
```bash
# In WSL terminal
cd /mnt/d/APPSNospaces/like-i-said-mcp-server-v2/scripts
bash hybrid-sync-manager.sh
# Select option 3 to setup watchers
# Then run the generated watcher script
```

## Git Workflow for Code

### Development in WSL
```bash
# Make code changes
git add .
git commit -m "Feature: Added new functionality"
git push
```

### Update Windows for Testing
```bash
# In Windows terminal
cd D:\APPSNospaces\like-i-said-mcp-server-v2
git pull
npm install  # if dependencies changed
```

## Recommended Workflow

1. **Start your day**:
   ```bash
   # Run sync manager
   bash scripts/hybrid-sync-manager.sh
   # Select option 4 (Full sync)
   ```

2. **During development**:
   - Code changes: Commit to git when ready
   - Memory/task changes: Automatically synced

3. **Testing Windows clients**:
   - Pull latest code in Windows
   - Data is already synced!

4. **End of day**:
   - Commit any pending code changes
   - Verify sync status

## Quick Commands

```bash
# Check what's different
diff -r ~/projects/like-i-said-mcp-server-v2/memories /mnt/d/APPSNospaces/like-i-said-mcp-server-v2/memories

# Force sync data only
rsync -av --delete ~/projects/like-i-said-mcp-server-v2/{memories,tasks,data}/ /mnt/d/APPSNospaces/like-i-said-mcp-server-v2/

# Check git status both sides
cd ~/projects/like-i-said-mcp-server-v2 && git status
cd /mnt/d/APPSNospaces/like-i-said-mcp-server-v2 && git status
```

## Troubleshooting

### If sync seems stuck
1. Check for file locks: `lsof | grep like-i-said`
2. Kill any stuck rsync: `pkill rsync`
3. Check permissions: `ls -la memories/`

### If memories/tasks missing
1. Check both locations have the directories
2. Run initial sync: `bash scripts/hybrid-sync-manager.sh`
3. Select option 1 (Sync data now)

## Best Practices

1. **Don't sync code files** - Use git for all code changes
2. **Commit often** - Small, frequent commits are easier to sync
3. **Check sync status** - Run the manager periodically
4. **Backup data** - Your memories/tasks are important!

## Summary

- **Data** (memories/tasks): Real-time bidirectional sync
- **Code** (lib/src): Git-based version control
- **Development**: Fast in WSL
- **Testing**: Windows clients work immediately
- **No conflicts**: Code and data sync separately