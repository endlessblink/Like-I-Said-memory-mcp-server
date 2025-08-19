#!/bin/bash

# Temporarily switch to simplified server for testing
echo "🔄 Switching to simplified server for testing..."

cd /home/endlessblink

# Backup current config
cp .claude.json .claude.json.backup-simplified-test

# Update configuration to use simplified server
python3 << 'EOF'
import json

with open('.claude.json', 'r') as f:
    config = json.load(f)

def update_servers_in_dict(obj):
    if isinstance(obj, dict):
        for key, value in obj.items():
            if key == "mcpServers" and isinstance(value, dict):
                if "like-i-said-memory-v2" in value:
                    # Update to use simplified server
                    value["like-i-said-memory-v2"]["args"] = [
                        "/mnt/d/APPSNospaces/like-i-said-mcp-server-v2/server-simple.js"
                    ]
                    print(f"✅ Updated server configuration to use server-simple.js")
            elif isinstance(value, (dict, list)):
                update_servers_in_dict(value)
    elif isinstance(obj, list):
        for item in obj:
            if isinstance(item, (dict, list)):
                update_servers_in_dict(item)

update_servers_in_dict(config)

with open('.claude.json', 'w') as f:
    json.dump(config, f, indent=2)

print("🎯 Configuration updated for testing")
EOF

echo ""
echo "✅ Ready to test simplified server"
echo "🧪 Test with: claude"
echo ""
echo "🔄 To revert back:"
echo "cp .claude.json.backup-simplified-test .claude.json"
