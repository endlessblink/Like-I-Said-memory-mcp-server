# Path Configuration Guide

Like-I-Said v2.6+ supports multiple ways to configure where memories and tasks are stored.

## Method 1: Dynamic Path Changes (v2.6.0+)

Claude Desktop can now change paths dynamically using built-in tools:

```
"Hey Claude, change my memory storage to D:\MyDocuments\AI-Memories"
"Claude, set my task directory to C:\Projects\Tasks"
"Where are my memories currently stored?"
```

## Method 2: Environment Variables (v2.5.0+)

Set custom paths before starting Claude Desktop:

### Windows (Command Prompt)
```batch
set MEMORY_DIR=D:\MyDocuments\AI-Memories
set TASK_DIR=D:\MyDocuments\AI-Tasks
"C:\Users\%USERNAME%\AppData\Local\AnthropicClaude\Claude.exe"
```

### Windows (PowerShell)
```powershell
$env:MEMORY_DIR = "D:\MyDocuments\AI-Memories"
$env:TASK_DIR = "D:\MyDocuments\AI-Tasks"
& "$env:LOCALAPPDATA\AnthropicClaude\Claude.exe"
```

### macOS/Linux
```bash
export MEMORY_DIR="/home/user/ai-memories"
export TASK_DIR="/home/user/ai-tasks"
/Applications/Claude.app/Contents/MacOS/Claude
```

## Method 3: During Installation

The installer automatically detects existing memory folders in common locations:
- Current directory
- User home directory
- Common paths like D:\memories, D:\AI-Memories, etc.

## Troubleshooting

### "Invalid memory directory" Error
This means the path doesn't exist. Either:
1. Create the directory manually
2. Let Claude create it: "Create the directory D:\memories for me"

### Memories Not Appearing After Path Change
After changing paths, existing memories stay in the old location. To access them:
1. Copy files from old location to new location
2. Or change back to the original path

### Windows Path Issues
- Use backslashes: `D:\memories` not `D:/memories`
- Avoid trailing slashes: `D:\memories` not `D:\memories\`
- Paths are case-insensitive on Windows

## Default Locations

If no custom path is set:
- **Memories**: `./memories` (relative to installation)
- **Tasks**: `./tasks` (relative to installation)

## Verification

To check current paths, ask Claude:
```
"What are my current memory and task paths?"
```

Or use the test tool:
```
"Use the test_tool to verify the MCP connection"
```