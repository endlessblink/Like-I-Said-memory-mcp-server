# Memory Backup System

The Like-I-Said MCP server now includes a comprehensive automatic backup system that protects your memories against accidental deletion.

## Features

- **Automatic Scheduled Backups**: Creates backups every 6 hours
- **Change-Triggered Backups**: Creates backups when memory files are modified
- **Compressed Archives**: Uses ZIP format for efficient storage
- **Retention Policy**: Keeps 30 days of backups automatically
- **Duplicate Prevention**: Smart debouncing prevents redundant backups
- **Metadata Tracking**: Includes backup statistics and timestamps

## Backup Location

All backups are saved to: `D:\APPSNospaces\Like-I-said-mcp-server-v2\backup\`

Backup files are named: `memories-backup-YYYY-MM-DDTHH-MM-SSZ.zip`

## Usage

### Manual Commands

```bash
# Create a backup right now
npm run backup

# Check backup status
npm run backup:status

# Start the automatic backup system
npm run backup:start
```

### Alternative Commands

```bash
# Direct node commands
node backup-scheduler.js backup    # Manual backup
node backup-scheduler.js status    # Check status
node backup-scheduler.js start     # Start auto-backup system
```

## Automatic Backup Triggers

1. **Scheduled**: Every 6 hours automatically
2. **File Changes**: When memory files are added/modified/deleted (with 5-minute debounce)
3. **Manual**: When you run the backup command

## Backup Contents

Each backup includes:
- All memory markdown files from all projects
- Backup metadata (file count, size, timestamp)
- Maintains directory structure: `memories/project-name/file.md`

## Restoration

To restore from a backup:

1. Extract the ZIP file: 
   ```bash
   # Using built-in tools
   unzip backup/memories-backup-2025-06-23T16-44-22Z.zip
   
   # Or use 7-zip, WinRAR, etc.
   ```

2. Copy the extracted `memories/` folder to replace your current memories directory

## Configuration

You can modify these settings in `backup-scheduler.js`:

- `maxBackups`: Number of backups to keep (default: 30)
- `backupInterval`: Time between scheduled backups (default: 6 hours)
- `debounceTime`: Wait time after file changes (default: 5 minutes)

## Integration with MCP Server

The backup system **automatically starts** when the MCP server starts and runs in silent mode to avoid interfering with MCP communication. It monitors the memories directory and creates backups as needed.

### Automatic Startup

The backup system is automatically enabled when you start the MCP server:
- It starts in "silent mode" to avoid JSON-RPC interference
- Creates an initial backup 10 seconds after server startup
- Monitors memory files for changes continuously
- Creates scheduled backups every 6 hours

### Manual Control

You can disable automatic backups by setting an environment variable:
```bash
# Disable automatic backups
DISABLE_AUTO_BACKUP=true node server-markdown.js
```

## Backup System Status

To check the current status of your backups:

```bash
npm run backup:status
```

This will show:
- Total number of backups
- Latest backup information
- File sizes and creation times

## Example Output

```
📊 Backup Status:
Total backups: 5
Latest backup: memories-backup-2025-06-23T16-44-22Z.zip
Created: 6/23/2025, 7:44:22 PM
Size: 225KB
Age: 2 hours
```

## About the Old Backup Folders

- `D:\APPSNospaces\Like-I-said-mcp-server-v2\memory_backups\`: Old backup system (can be deleted)
- `D:\APPSNospaces\Like-I-said-mcp-server-v2\development-backups\`: Development file backups (can be deleted)
- `D:\APPSNospaces\Like-I-said-mcp-server-v2\backup\backup\`: Nested backup folder from old system

The new system uses only the main `backup/` folder with timestamped ZIP files.

## Starting Automatic Backups

To start the continuous backup monitoring:

```bash
npm run backup:start
```

This will:
- Create an initial backup
- Monitor memory files for changes
- Create scheduled backups every 6 hours
- Maintain the 30-backup retention policy

The backup system will run in the background and create backups automatically to protect your memories.