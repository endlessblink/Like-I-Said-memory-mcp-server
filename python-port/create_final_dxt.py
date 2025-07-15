#!/usr/bin/env python3
"""
Create final DXT package for Like-I-Said Python MCP Server v2
"""

import json
import zipfile
import os
import shutil
from datetime import datetime

def create_manifest():
    """Create DXT manifest for Claude Desktop"""
    manifest = {
        "user_config": {
            "version": "0.1",
            "mcpServers": {
                "like-i-said-python-v2": {
                    "command": "./like-i-said-v2",
                    "args": [],
                    "env": {}
                }
            }
        },
        "meta": {
            "name": "Like-I-Said Python MCP Server v2",
            "description": "Complete Python port with all 23 tools - Memory management and task tracking for AI assistants",
            "version": "3.0.0",
            "homepage": "https://github.com/endlessblink/Like-I-Said-memory-mcp-server",
            "author": "endlessblink",
            "license": "MIT",
            "capabilities": [
                "Memory Management (6 tools)",
                "Task Management (6 tools)", 
                "AI Enhancement (11 tools)",
                "Complete Node.js compatibility",
                "Project organization",
                "Search and analytics"
            ],
            "requirements": {
                "claude_desktop": ">=1.0.0"
            },
            "installation": {
                "type": "standalone",
                "executable": "like-i-said-v2",
                "platform": "cross-platform"
            }
        },
        "tools": [
            # Memory Tools
            {"name": "add_memory", "category": "memory", "description": "Store important information with auto-categorization"},
            {"name": "get_memory", "category": "memory", "description": "Retrieve stored memories by ID"},
            {"name": "list_memories", "category": "memory", "description": "List memories with filtering"},
            {"name": "delete_memory", "category": "memory", "description": "Delete stored memories"},
            {"name": "search_memories", "category": "memory", "description": "Search memories by content"},
            {"name": "test_tool", "category": "memory", "description": "Test MCP connectivity"},
            
            # Task Management Tools
            {"name": "generate_dropoff", "category": "tasks", "description": "Generate session handoff documents"},
            {"name": "create_task", "category": "tasks", "description": "Create tasks with memory linking"},
            {"name": "update_task", "category": "tasks", "description": "Update task status and properties"},
            {"name": "list_tasks", "category": "tasks", "description": "List tasks with filtering"},
            {"name": "get_task_context", "category": "tasks", "description": "Get task context and relationships"},
            {"name": "delete_task", "category": "tasks", "description": "Delete tasks and subtasks"},
            
            # AI Enhancement Tools
            {"name": "enhance_memory_metadata", "category": "ai", "description": "Generate memory titles and summaries"},
            {"name": "batch_enhance_memories", "category": "ai", "description": "Batch enhance multiple memories"},
            {"name": "smart_status_update", "category": "ai", "description": "Natural language status updates"},
            {"name": "get_task_status_analytics", "category": "ai", "description": "Task analytics and insights"},
            {"name": "validate_task_workflow", "category": "ai", "description": "Validate task workflows"},
            {"name": "get_automation_suggestions", "category": "ai", "description": "AI automation suggestions"},
            {"name": "batch_enhance_memories_ollama", "category": "ai", "description": "Local AI memory enhancement"},
            {"name": "batch_enhance_tasks_ollama", "category": "ai", "description": "Local AI task enhancement"},
            {"name": "check_ollama_status", "category": "ai", "description": "Check local AI server status"},
            {"name": "enhance_memory_ollama", "category": "ai", "description": "Single memory local AI enhancement"},
            {"name": "deduplicate_memories", "category": "ai", "description": "Remove duplicate memories"}
        ]
    }
    return manifest

def main():
    print("🚀 Creating Like-I-Said Python MCP Server v2 DXT...")
    
    # Check if executable exists
    if not os.path.exists("dist/like-i-said-v2"):
        print("❌ ERROR: Executable not found. Run PyInstaller first.")
        return
    
    # Create DXT filename
    timestamp = datetime.now().strftime("%Y%m%d")
    dxt_filename = f"like-i-said-python-v3.0.0-{timestamp}.dxt"
    
    print(f"📦 Creating DXT: {dxt_filename}")
    
    try:
        with zipfile.ZipFile(dxt_filename, 'w', zipfile.ZIP_DEFLATED) as dxt:
            # Add manifest
            manifest = create_manifest()
            dxt.writestr("manifest.json", json.dumps(manifest, indent=2))
            print("✅ Added manifest.json")
            
            # Add executable
            dxt.write("dist/like-i-said-v2", "like-i-said-v2")
            print("✅ Added executable (25MB)")
            
            # Add README
            readme = """# Like-I-Said Python MCP Server v2

## Complete Python Port with All 23 Tools

This DXT contains a fully functional Python MCP server with all 23 tools from the original Node.js version.

### Features:
- 6 Memory Management Tools
- 6 Task Management Tools  
- 11 AI Enhancement Tools
- Complete Node.js compatibility
- Standalone executable (no Python required)
- Cross-platform support

### Installation:
1. Double-click this .dxt file
2. Claude Desktop will install automatically
3. Start using all 23 tools immediately

### Tools Available:
Memory: add_memory, get_memory, list_memories, delete_memory, search_memories, test_tool
Tasks: create_task, update_task, list_tasks, get_task_context, delete_task, generate_dropoff
AI: enhance_memory_metadata, batch_enhance_memories, smart_status_update, get_task_status_analytics, validate_task_workflow, get_automation_suggestions, batch_enhance_memories_ollama, batch_enhance_tasks_ollama, check_ollama_status, enhance_memory_ollama, deduplicate_memories

Repository: https://github.com/endlessblink/Like-I-Said-memory-mcp-server
"""
            dxt.writestr("README.md", readme)
            print("✅ Added README.md")
    
        print(f"🎉 SUCCESS! Created {dxt_filename}")
        
        # Show file info
        size_mb = os.path.getsize(dxt_filename) / (1024 * 1024)
        print(f"📊 File size: {size_mb:.1f} MB")
        print(f"📁 Location: {os.path.abspath(dxt_filename)}")
        
        # Test DXT structure
        print("\n🔍 DXT Contents:")
        with zipfile.ZipFile(dxt_filename, 'r') as test_dxt:
            for info in test_dxt.infolist():
                print(f"  - {info.filename} ({info.file_size:,} bytes)")
        
        print("\n✅ READY FOR CLAUDE DESKTOP INSTALLATION!")
        print("Double-click the .dxt file to install in Claude Desktop.")
        
    except Exception as e:
        print(f"❌ ERROR: {e}")

if __name__ == "__main__":
    main()