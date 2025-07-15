#!/usr/bin/env python3
"""
Create DXT with correct manifest structure matching working example
"""

import json
import zipfile
import os
from datetime import datetime

def create_correct_manifest():
    """Create manifest matching the working DXT structure"""
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
            "type": "python",
            "entry_point": "like-i-said-v2",
            "mcp_config": {
                "command": "./like-i-said-v2",
                "args": [],
                "env": {
                    "PYTHONUNBUFFERED": "1"
                }
            }
        },
        "tools": [
            {"name": "add_memory", "description": "Store information with auto-categorization and linking"},
            {"name": "get_memory", "description": "Retrieve specific memory by ID"},
            {"name": "list_memories", "description": "List memories with filtering and metadata"},
            {"name": "search_memories", "description": "Full-text semantic and keyword search"},
            {"name": "delete_memory", "description": "Remove specific memory permanently"},
            {"name": "test_tool", "description": "Verify MCP connection is working"},
            {"name": "create_task", "description": "Create tasks with auto-memory linking"},
            {"name": "update_task", "description": "Update task status and relationships"},
            {"name": "list_tasks", "description": "List tasks with comprehensive filtering"},
            {"name": "get_task_context", "description": "Get full task context with connections"},
            {"name": "delete_task", "description": "Delete tasks and all subtasks"},
            {"name": "generate_dropoff", "description": "Generate session handoff documents"},
            {"name": "enhance_memory_metadata", "description": "Generate optimized titles and summaries"},
            {"name": "batch_enhance_memories", "description": "Batch process memory enhancements"},
            {"name": "smart_status_update", "description": "Natural language task status updates"},
            {"name": "get_task_status_analytics", "description": "Comprehensive productivity analytics"},
            {"name": "validate_task_workflow", "description": "Intelligent workflow validation"},
            {"name": "get_automation_suggestions", "description": "AI-powered automation suggestions"},
            {"name": "batch_enhance_memories_ollama", "description": "Batch enhance with local AI"},
            {"name": "batch_enhance_tasks_ollama", "description": "Batch enhance tasks with local AI"},
            {"name": "check_ollama_status", "description": "Check local AI server status"},
            {"name": "enhance_memory_ollama", "description": "Enhance with local AI (Ollama)"},
            {"name": "deduplicate_memories", "description": "Clean up duplicate memory files"}
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
                "description": "Default project name for memories and tasks",
                "required": False
            },
            "enable_auto_linking": {
                "type": "boolean",
                "title": "Auto-Link Items",
                "default": True,
                "description": "Automatically link related memories and tasks",
                "required": False
            },
            "max_search_results": {
                "type": "number",
                "title": "Max Search Results",
                "default": 25,
                "description": "Maximum number of search results to return",
                "required": False
            },
            "enable_ollama": {
                "type": "boolean",
                "title": "Enable Ollama",
                "default": False,
                "description": "Enable local AI enhancements with Ollama",
                "required": False
            },
            "ollama_model": {
                "type": "string",
                "title": "Ollama Model",
                "default": "llama3.1:8b",
                "description": "Ollama model to use for enhancements",
                "required": False
            }
        },
        "requirements": {
            "platforms": ["win32", "darwin", "linux"]
        }
    }
    return manifest

def main():
    print("🚀 Creating Like-I-Said Python MCP Server DXT with correct structure...")
    
    # Check if executable exists
    if not os.path.exists("dist/like-i-said-v2"):
        print("❌ ERROR: Executable not found. Run PyInstaller first.")
        return
    
    # Create DXT filename
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    dxt_filename = f"like-i-said-python-v3.0.0-FINAL-{timestamp}.dxt"
    
    print(f"📦 Creating DXT: {dxt_filename}")
    
    try:
        with zipfile.ZipFile(dxt_filename, 'w', zipfile.ZIP_DEFLATED) as dxt:
            # Add manifest with correct structure
            manifest = create_correct_manifest()
            dxt.writestr("manifest.json", json.dumps(manifest, indent=2))
            print("✅ Added correct manifest.json")
            
            # Add executable
            dxt.write("dist/like-i-said-v2", "like-i-said-v2")
            # Make executable permissions preserved
            info = dxt.getinfo("like-i-said-v2")
            info.external_attr = 0o755 << 16  # Unix executable permissions
            print("✅ Added executable with permissions")
            
            # Add README
            readme = """# Like-I-Said Python MCP Server v3.0.0

## Complete Python Port with All 23 Tools

This is a complete Python implementation of the Like-I-Said MCP server with all 23 tools from the original Node.js version.

### Features:
- ✅ All 23 tools implemented and working
- ✅ Standalone executable (no Python required)
- ✅ Full Node.js compatibility
- ✅ Cross-platform support (Windows, macOS, Linux)

### Tools Included:

**Memory Management (6):**
- add_memory - Store information with smart categorization
- get_memory - Retrieve memories by ID
- list_memories - List and filter memories
- search_memories - Semantic and keyword search
- delete_memory - Remove memories
- test_tool - Connection testing

**Task Management (6):**
- create_task - Create tasks with memory linking
- update_task - Update status and properties
- list_tasks - List and filter tasks
- get_task_context - Get full task context
- delete_task - Delete tasks and subtasks
- generate_dropoff - Session handoff documents

**AI Enhancement (11):**
- enhance_memory_metadata - Generate titles/summaries
- batch_enhance_memories - Batch memory enhancement
- smart_status_update - Natural language updates
- get_task_status_analytics - Productivity analytics
- validate_task_workflow - Workflow validation
- get_automation_suggestions - AI suggestions
- batch_enhance_memories_ollama - Local AI batch
- batch_enhance_tasks_ollama - Local AI tasks
- check_ollama_status - Check local AI
- enhance_memory_ollama - Single memory AI
- deduplicate_memories - Clean duplicates

### Installation:
1. Double-click this .dxt file in Claude Desktop
2. Configure your preferences in the setup dialog
3. Start using all 23 tools immediately!

Repository: https://github.com/endlessblink/Like-I-Said-memory-mcp-server
"""
            dxt.writestr("README.md", readme)
            print("✅ Added README.md")
    
        print(f"\n🎉 SUCCESS! Created {dxt_filename}")
        
        # Validate manifest structure
        print("\n🔍 Validating manifest structure...")
        with zipfile.ZipFile(dxt_filename, 'r') as test_dxt:
            manifest_data = json.loads(test_dxt.read("manifest.json"))
            
            # Check critical fields
            checks = [
                ("dxt_version", manifest_data.get("dxt_version") == "0.1"),
                ("author object", isinstance(manifest_data.get("author"), dict)),
                ("server object", isinstance(manifest_data.get("server"), dict)),
                ("server.mcp_config", "mcp_config" in manifest_data.get("server", {})),
                ("user_config fields", all(isinstance(v, dict) for v in manifest_data.get("user_config", {}).values())),
                ("tools list", len(manifest_data.get("tools", [])) == 23)
            ]
            
            all_good = True
            for check_name, passed in checks:
                status = "✅" if passed else "❌"
                print(f"{status} {check_name}")
                if not passed:
                    all_good = False
            
            if all_good:
                print("\n✅ ALL VALIDATION CHECKS PASSED!")
            else:
                print("\n❌ Some validation checks failed")
        
        # Show file info
        size_mb = os.path.getsize(dxt_filename) / (1024 * 1024)
        print(f"\n📊 File size: {size_mb:.1f} MB")
        print(f"📁 Location: {os.path.abspath(dxt_filename)}")
        
        print("\n✅ THIS DXT SHOULD WORK IN CLAUDE DESKTOP!")
        print("The manifest structure now matches the working example exactly.")
        
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()