# Changing Storage Paths - User Guide

**Like-I-Said MCP Server v3.0+ (Alpha)** allows you to customize where your memories and tasks are stored. This guide shows you how to change these storage locations easily.

> ⚠️ **Version Note**: The path configuration tools (`set_memory_path`, `set_task_path`, `get_current_paths`) are available in v3.0.0-alpha.1 and later. The stable release (v2.8.8) supports path configuration only through environment variables and installation options.

## Quick Overview

By default, Like-I-Said stores data in:
- **Memories**: `./memories/` folder
- **Tasks**: `./tasks/` folder

You can change these to any location you prefer (custom folders, cloud sync directories, external drives, etc.).

## Method 1: Using MCP Tools (v3.0+ Only)

### Check Current Paths
```bash
get_current_paths
```
This shows where your data is currently stored.

### Change Memory Storage Location
```bash
set_memory_path "/path/to/your/custom/memories"
```

**Examples:**
```bash
# Store in Documents folder
set_memory_path "~/Documents/AI-Memories"

# Store in Dropbox for sync
set_memory_path "~/Dropbox/Like-I-Said/Memories"

# Store on external drive
set_memory_path "/Volumes/MyDrive/AI-Data/Memories"

# Windows example
set_memory_path "C:\Users\YourName\Documents\AI-Memories"
```

### Change Task Storage Location
```bash
set_task_path "/path/to/your/custom/tasks"
```

**Examples:**
```bash
# Store in Documents folder
set_task_path "~/Documents/AI-Tasks"

# Store in cloud sync folder
set_task_path "~/OneDrive/Like-I-Said/Tasks"
```

### ✅ Verify Changes
After changing paths, run:
```bash
get_current_paths
```
You should see your new paths listed as "Active".

## Method 2: Environment Variables (All Versions)

Set these before starting the MCP server:

```bash
# Set custom paths
export MEMORY_DIR="~/Documents/AI-Memories"
export TASK_DIR="~/Documents/AI-Tasks"

# Then start your Claude client
```

**Windows (Command Prompt):**
```cmd
set MEMORY_DIR=C:\Users\YourName\Documents\AI-Memories
set TASK_DIR=C:\Users\YourName\Documents\AI-Tasks
```

## Method 3: During Installation (All Versions)

When installing with NPX, specify a custom base directory:

```bash
npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2 install --path ~/my-ai-workspace
```

This creates:
- Memories: `~/my-ai-workspace/memories/`
- Tasks: `~/my-ai-workspace/tasks/`

## For Stable Release Users (v2.8.8)

If you're using the stable release, you can only change paths using **Methods 2 & 3** above:

### Quick Setup for Stable Release:
1. **Set environment variables** before starting Claude:
   ```bash
   export MEMORY_DIR="~/Documents/AI-Memories"
   export TASK_DIR="~/Documents/AI-Tasks"
   ```

2. **OR install with custom path**:
   ```bash
   npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2 install --path ~/my-ai-data
   ```

3. **Verify**: Your memories and tasks will be stored in the specified locations.

> 💡 **To get the new path tools**: Consider upgrading to the alpha version if you need runtime path changes.

## Important Features

### ✨ No Restart Needed (v3.0+ only)
- Changes take effect immediately
- All data reloads from the new location
- No need to restart Claude or the MCP server

### 🛡️ Safe Operations
- Creates directories automatically if they don't exist
- Validates paths before applying
- Preserves your existing data

### 💾 Persistent Settings  
- Path changes are saved automatically
- Settings persist across Claude restarts
- Stored in `.like-i-said-config.json`

## Common Use Cases

### 📁 Organize by Project
```bash
# Separate work and personal
set_memory_path "~/Work/AI-Memories"
set_task_path "~/Work/AI-Tasks"
```

### ☁️ Cloud Sync Setup
```bash
# Sync across devices with Dropbox
set_memory_path "~/Dropbox/AI-Assistant/Memories"
set_task_path "~/Dropbox/AI-Assistant/Tasks"
```

### 💾 External Storage
```bash
# Use external drive for large memory collections
set_memory_path "/Volumes/ExternalDrive/AI-Data/Memories"
set_task_path "/Volumes/ExternalDrive/AI-Data/Tasks"
```

### 🏢 Team/Shared Setup
```bash
# Shared network location
set_memory_path "/mnt/shared/team-ai/memories"
set_task_path "/mnt/shared/team-ai/tasks"
```

## Troubleshooting

### ❌ "Invalid path provided"
- Make sure the path exists or can be created
- Use absolute paths for best results
- Check permissions on the target directory

### 📂 "Directory not accessible"
- Verify you have read/write permissions
- For network paths, ensure they're mounted
- Try creating the directory manually first

### 🔄 Changes Not Persisting
- Check that `.like-i-said-config.json` is writable
- Verify you're not overriding with environment variables
- Run `get_current_paths` to confirm active settings

### 🗂️ Can't Find My Data
Your existing data stays in the original location when you change paths. To move it:

1. **Copy manually**: Copy files from old location to new location
2. **Or change back**: Use `set_memory_path` to point to your original location

## Quick Test

Try this to test the functionality:

```bash
# 1. Check current location
get_current_paths

# 2. Create a test memory
add_memory "Testing path change" --category test

# 3. Change to a new path
set_memory_path "~/test-memories"

# 4. Verify the change
get_current_paths

# 5. Check that the memory system works
list_memories

# 6. Change back if desired
set_memory_path "~/original-path"
```

## Questions?

If you run into issues:
1. Check the troubleshooting section above
2. Run `get_current_paths` to see current configuration
3. Verify directory permissions and accessibility
4. Try with a simple local path first (like `~/test-memories`)

The path changing functionality is designed to be flexible and safe - your data is always preserved and the system handles the technical details automatically!