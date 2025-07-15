#!/usr/bin/env python3
"""
Create a working Python DXT that Claude Desktop can actually run
This packages the Python script directly, not as an executable
"""

import json
import zipfile
import os
import shutil
from datetime import datetime

def create_python_script_manifest():
    """Create manifest for Python script-based server"""
    manifest = {
        "dxt_version": "0.1",
        "name": "like-i-said-python-v2",
        "display_name": "Like-I-Said Python MCP Server",
        "version": "3.0.0",
        "description": "Python MCP server with all 23 tools for memory and task management",
        "author": {
            "name": "EndlessBlink",
            "email": "support@like-i-said.dev"
        },
        "homepage": "https://github.com/endlessblink/Like-I-Said-memory-mcp-server",
        "license": "MIT",
        "server": {
            "type": "python",
            "entry_point": "server/server.py",
            "mcp_config": {
                "command": "python",
                "args": [
                    "-u",
                    "${__dirname}/server/server.py"
                ],
                "env": {
                    "PYTHONUNBUFFERED": "1"
                }
            }
        },
        "requirements": {
            "python": ">=3.8.0",
            "platforms": ["win32", "darwin", "linux"]
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
            },
            "enable_ollama": {
                "type": "boolean",
                "title": "Enable Local AI",
                "default": False,
                "description": "Enable Ollama for local AI processing",
                "required": False
            }
        }
    }
    return manifest

def prepare_python_files():
    """Prepare Python files for packaging"""
    # Create server directory
    os.makedirs("temp_dxt/server", exist_ok=True)
    
    # Copy main server file
    shutil.copy("server.py", "temp_dxt/server/server.py")
    
    # Copy supporting modules
    for module in ["memory_tools.py", "task_tools.py"]:
        if os.path.exists(module):
            shutil.copy(module, f"temp_dxt/server/{module}")
    
    # Create a simple requirements file
    with open("temp_dxt/requirements.txt", "w") as f:
        f.write("# No external dependencies - uses Python stdlib only\n")
    
    print("✅ Prepared Python files for packaging")

def main():
    print("🚀 Creating working Python DXT (script-based, not executable)...")
    
    # Check if server.py exists
    if not os.path.exists("server.py"):
        print("❌ ERROR: server.py not found")
        return
    
    # Prepare files
    prepare_python_files()
    
    # Create DXT
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    dxt_filename = f"like-i-said-python-v3.0.0-working-{timestamp}.dxt"
    
    print(f"📦 Creating DXT: {dxt_filename}")
    
    try:
        with zipfile.ZipFile(dxt_filename, 'w', zipfile.ZIP_DEFLATED) as dxt:
            # Add manifest
            manifest = create_python_script_manifest()
            dxt.writestr("manifest.json", json.dumps(manifest, indent=2))
            print("✅ Added Python script manifest")
            
            # Add all files from temp_dxt
            for root, dirs, files in os.walk("temp_dxt"):
                for file in files:
                    file_path = os.path.join(root, file)
                    arc_path = os.path.relpath(file_path, "temp_dxt")
                    dxt.write(file_path, arc_path)
                    print(f"✅ Added {arc_path}")
            
            # Add README
            readme = """# Like-I-Said Python MCP Server v3.0.0

Python script version with all 23 tools.

## Requirements
- Python 3.8+ installed on your system
- Claude Desktop will use your system Python

## Installation
1. Ensure Python 3.8+ is installed
2. Double-click this .dxt file
3. Claude Desktop will configure automatically

## All 23 Tools Included
- Memory Management: 6 tools
- Task Management: 6 tools  
- AI Enhancement: 11 tools

Repository: https://github.com/endlessblink/Like-I-Said-memory-mcp-server
"""
            dxt.writestr("README.md", readme)
            print("✅ Added README")
    
        print(f"\n🎉 Created {dxt_filename}")
        
        # Validate
        print("\n🔍 Validating Python script DXT...")
        with zipfile.ZipFile(dxt_filename, 'r') as test_dxt:
            files = test_dxt.namelist()
            print(f"📦 Package contains: {len(files)} files")
            for f in files:
                print(f"  - {f}")
        
        # Cleanup
        shutil.rmtree("temp_dxt", ignore_errors=True)
        
        size_mb = os.path.getsize(dxt_filename) / (1024 * 1024)
        print(f"\n📊 Size: {size_mb:.1f} MB")
        print(f"📁 Path: {os.path.abspath(dxt_filename)}")
        print("\n⚠️  NOTE: This DXT requires Python 3.8+ installed on the user's system")
        
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Cleanup on error
        if os.path.exists("temp_dxt"):
            shutil.rmtree("temp_dxt", ignore_errors=True)

if __name__ == "__main__":
    main()