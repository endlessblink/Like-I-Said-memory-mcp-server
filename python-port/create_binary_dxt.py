#!/usr/bin/env python3
"""
Create DXT for binary/executable MCP server (PyInstaller output)
"""

import json
import zipfile
import os
import stat
from datetime import datetime

def create_binary_manifest():
    """Create manifest for binary/executable server type"""
    manifest = {
        "dxt_version": "0.1",
        "name": "like-i-said-python-v2",
        "display_name": "Like-I-Said Python MCP Server",
        "version": "3.0.0",
        "description": "Python port with all 23 tools - Memory and task management for AI assistants",
        "author": {
            "name": "EndlessBlink",
            "email": "support@like-i-said.dev"
        },
        "homepage": "https://github.com/endlessblink/Like-I-Said-memory-mcp-server",
        "license": "MIT",
        "server": {
            "type": "binary",
            "binary": {
                "platform": {
                    "darwin": "${__dirname}/like-i-said-v2",
                    "linux": "${__dirname}/like-i-said-v2",
                    "win32": "${__dirname}/like-i-said-v2.exe"
                }
            }
        },
        "tools": [
            {"name": "add_memory", "description": "Store information with auto-categorization"},
            {"name": "get_memory", "description": "Retrieve specific memory by ID"},
            {"name": "list_memories", "description": "List memories with filtering"},
            {"name": "search_memories", "description": "Search memories by content"},
            {"name": "delete_memory", "description": "Remove specific memory"},
            {"name": "test_tool", "description": "Test MCP connectivity"},
            {"name": "create_task", "description": "Create tasks with memory linking"},
            {"name": "update_task", "description": "Update task status"},
            {"name": "list_tasks", "description": "List tasks with filtering"},
            {"name": "get_task_context", "description": "Get task context"},
            {"name": "delete_task", "description": "Delete tasks and subtasks"},
            {"name": "generate_dropoff", "description": "Generate session handoff"},
            {"name": "enhance_memory_metadata", "description": "Generate titles and summaries"},
            {"name": "batch_enhance_memories", "description": "Batch memory enhancement"},
            {"name": "smart_status_update", "description": "Natural language updates"},
            {"name": "get_task_status_analytics", "description": "Task analytics"},
            {"name": "validate_task_workflow", "description": "Workflow validation"},
            {"name": "get_automation_suggestions", "description": "AI suggestions"},
            {"name": "batch_enhance_memories_ollama", "description": "Local AI batch"},
            {"name": "batch_enhance_tasks_ollama", "description": "Local AI tasks"},
            {"name": "check_ollama_status", "description": "Check local AI"},
            {"name": "enhance_memory_ollama", "description": "Single memory AI"},
            {"name": "deduplicate_memories", "description": "Clean duplicates"}
        ],
        "user_config": {
            "memory_directory": {
                "type": "directory",
                "title": "Memory Directory",
                "default": "~/Documents/claude-memories",
                "description": "Directory for storing memory files",
                "required": False
            },
            "task_directory": {
                "type": "directory", 
                "title": "Task Directory",
                "default": "~/Documents/claude-tasks",
                "description": "Directory for storing task files",
                "required": False
            },
            "default_project": {
                "type": "string",
                "title": "Default Project",
                "default": "my-project",
                "description": "Default project name",
                "required": False
            }
        },
        "requirements": {
            "platforms": ["darwin", "linux", "win32"]
        }
    }
    return manifest

def main():
    print("🚀 Creating Like-I-Said Binary MCP Server DXT...")
    
    # Check if executable exists
    if not os.path.exists("dist/like-i-said-v2"):
        print("❌ ERROR: Executable not found at dist/like-i-said-v2")
        return
    
    # Create DXT filename
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    dxt_filename = f"like-i-said-python-v3.0.0-binary-{timestamp}.dxt"
    
    print(f"📦 Creating DXT: {dxt_filename}")
    
    try:
        with zipfile.ZipFile(dxt_filename, 'w', zipfile.ZIP_DEFLATED) as dxt:
            # Add manifest
            manifest = create_binary_manifest()
            dxt.writestr("manifest.json", json.dumps(manifest, indent=2))
            print("✅ Added binary-type manifest.json")
            
            # Add executable with proper name
            dxt.write("dist/like-i-said-v2", "like-i-said-v2")
            
            # Set executable permissions in ZIP
            for info in dxt.filelist:
                if info.filename == "like-i-said-v2":
                    info.external_attr = (0o755 | stat.S_IFREG) << 16
            
            print("✅ Added executable with permissions")
            
            # Add README
            readme = """# Like-I-Said Python MCP Server v3.0.0

Binary executable version with all 23 tools.

## Installation
1. Double-click this .dxt file
2. Claude Desktop will install automatically
3. All 23 tools ready to use!

## Tools
- Memory: 6 tools
- Tasks: 6 tools  
- AI Enhancement: 11 tools

Repository: https://github.com/endlessblink/Like-I-Said-memory-mcp-server
"""
            dxt.writestr("README.md", readme)
            print("✅ Added README.md")
    
        print(f"\n🎉 Created {dxt_filename}")
        
        # Validate
        print("\n🔍 Validating binary manifest...")
        with zipfile.ZipFile(dxt_filename, 'r') as test_dxt:
            manifest_data = json.loads(test_dxt.read("manifest.json"))
            
            checks = [
                ("server.type = binary", manifest_data.get("server", {}).get("type") == "binary"),
                ("server.binary exists", "binary" in manifest_data.get("server", {})),
                ("platform paths", "platform" in manifest_data.get("server", {}).get("binary", {})),
                ("tools count", len(manifest_data.get("tools", [])) == 23)
            ]
            
            for check, passed in checks:
                print(f"{'✅' if passed else '❌'} {check}")
        
        size_mb = os.path.getsize(dxt_filename) / (1024 * 1024)
        print(f"\n📊 Size: {size_mb:.1f} MB")
        print(f"📁 Path: {os.path.abspath(dxt_filename)}")
        
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()