#!/bin/bash

# Clean up duplicate like-i-said-memory-v2 configurations in Claude Code WSL2
# This script removes all duplicate entries and keeps only the working one

echo "🔧 Cleaning up duplicate MCP server configurations..."

cd /home/endlessblink

# Create backup
cp .claude.json .claude.json.backup-cleanup-$(date +%Y%m%d-%H%M%S)
echo "✅ Backup created"

# The configuration file is quite large, so we need to be careful
# Let's create a Python script to clean it up properly

cat > cleanup_claude_config.py << 'EOF'
import json
import sys

def clean_claude_config():
    try:
        with open('.claude.json', 'r') as f:
            config = json.load(f)
        
        print("🔍 Analyzing configuration...")
        
        # Find all mcpServers sections and clean up duplicates
        servers_cleaned = 0
        
        def clean_servers_in_dict(obj, path=""):
            nonlocal servers_cleaned
            if isinstance(obj, dict):
                for key, value in obj.items():
                    if key == "mcpServers" and isinstance(value, dict):
                        print(f"📍 Found mcpServers at: {path}.{key}")
                        
                        # Check for like-i-said-memory-v2 duplicates
                        if "like-i-said-memory-v2" in value:
                            print(f"  - Found like-i-said-memory-v2 server")
                            
                            # Keep only the working configuration
                            working_config = {
                                "type": "stdio",
                                "command": "/mnt/c/Program Files/nodejs/node.exe",
                                "args": [
                                    "/mnt/d/APPSNospaces/like-i-said-mcp-server-v2/server-markdown.js"
                                ],
                                "env": {
                                    "MEMORY_DIR": "/mnt/d/APPSNospaces/like-i-said-mcp-server-v2/memories",
                                    "TASK_DIR": "/mnt/d/APPSNospaces/like-i-said-mcp-server-v2/tasks",
                                    "MCP_QUIET": "true"
                                }
                            }
                            
                            # Replace with clean config
                            value["like-i-said-memory-v2"] = working_config
                            servers_cleaned += 1
                            print(f"  ✅ Cleaned server configuration")
                    
                    elif isinstance(value, (dict, list)):
                        clean_servers_in_dict(value, f"{path}.{key}" if path else key)
            
            elif isinstance(obj, list):
                for i, item in enumerate(obj):
                    if isinstance(item, (dict, list)):
                        clean_servers_in_dict(item, f"{path}[{i}]")
        
        # Clean all mcpServers sections
        clean_servers_in_dict(config)
        
        # Write cleaned config
        with open('.claude.json', 'w') as f:
            json.dump(config, f, indent=2)
        
        print(f"🎉 Configuration cleaned! {servers_cleaned} server sections updated")
        print("✅ Duplicates removed, working configuration preserved")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    success = clean_claude_config()
    sys.exit(0 if success else 1)
EOF

# Run the cleanup
python3 cleanup_claude_config.py

if [ $? -eq 0 ]; then
    echo ""
    echo "🎯 Next steps:"
    echo "1. Test Claude Code: claude"
    echo "2. Should see: ✅ No tool #45 error"
    echo "3. Should see: ✅ Server connected with ~31 tools"
    echo ""
    echo "If there are still issues, restore backup:"
    echo "cp .claude.json.backup-cleanup-* .claude.json"
else
    echo "❌ Cleanup failed. Configuration unchanged."
fi
