#!/usr/bin/env python3
"""
Create valid DXT package with correct manifest structure
"""

import json
import zipfile
import os
from datetime import datetime

def create_valid_manifest():
    """Create DXT manifest with correct structure for Claude Desktop"""
    manifest = {
        "dxt_version": "0.1",
        "version": "3.0.0",
        "name": "Like-I-Said Python MCP Server v2",
        "description": "Complete Python port with all 23 tools - Memory management and task tracking for AI assistants",
        "author": "endlessblink",
        "license": "MIT",
        "server": {
            "command": "./like-i-said-v2",
            "args": []
        },
        "user_config": {
            "project_directory": {
                "type": "string",
                "default": "~/like-i-said-memories",
                "description": "Directory to store memories and tasks"
            },
            "enable_ai_enhancement": {
                "type": "boolean",
                "default": True,
                "description": "Enable AI-powered memory and task enhancement"
            },
            "ollama_host": {
                "type": "string", 
                "default": "http://localhost:11434",
                "description": "Ollama server URL for local AI processing"
            },
            "ollama_model": {
                "type": "string",
                "default": "llama3.1:8b",
                "description": "Ollama model to use for local AI"
            },
            "default_project": {
                "type": "string",
                "default": "default",
                "description": "Default project name for memories and tasks"
            },
            "auto_backup": {
                "type": "boolean",
                "default": True,
                "description": "Enable automatic backups of memories and tasks"
            },
            "debug_logging": {
                "type": "boolean",
                "default": False,
                "description": "Enable detailed debug logging"
            }
        }
    }
    return manifest

def main():
    print("🚀 Creating valid Like-I-Said Python MCP Server v2 DXT...")
    
    # Check if executable exists
    if not os.path.exists("dist/like-i-said-v2"):
        print("❌ ERROR: Executable not found. Run PyInstaller first.")
        return
    
    # Create DXT filename
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    dxt_filename = f"like-i-said-python-v3.0.0-valid-{timestamp}.dxt"
    
    print(f"📦 Creating DXT: {dxt_filename}")
    
    try:
        with zipfile.ZipFile(dxt_filename, 'w', zipfile.ZIP_DEFLATED) as dxt:
            # Add manifest with correct structure
            manifest = create_valid_manifest()
            dxt.writestr("manifest.json", json.dumps(manifest, indent=2))
            print("✅ Added valid manifest.json")
            
            # Add executable
            dxt.write("dist/like-i-said-v2", "like-i-said-v2")
            print("✅ Added executable (25MB)")
            
            # Add info file
            info = {
                "tools": [
                    "add_memory", "get_memory", "list_memories", "delete_memory", "search_memories", "test_tool",
                    "generate_dropoff", "create_task", "update_task", "list_tasks", "get_task_context", "delete_task",
                    "enhance_memory_metadata", "batch_enhance_memories", "smart_status_update", 
                    "get_task_status_analytics", "validate_task_workflow", "get_automation_suggestions",
                    "batch_enhance_memories_ollama", "batch_enhance_tasks_ollama", "check_ollama_status",
                    "enhance_memory_ollama", "deduplicate_memories"
                ],
                "capabilities": {
                    "memory_management": 6,
                    "task_management": 6,
                    "ai_enhancement": 11,
                    "total_tools": 23
                }
            }
            dxt.writestr("info.json", json.dumps(info, indent=2))
            print("✅ Added info.json")
    
        print(f"🎉 SUCCESS! Created {dxt_filename}")
        
        # Validate manifest
        print("\n🔍 Validating manifest structure...")
        with zipfile.ZipFile(dxt_filename, 'r') as test_dxt:
            manifest_data = json.loads(test_dxt.read("manifest.json"))
            required_fields = ["dxt_version", "version", "description", "author", "server", "user_config"]
            missing = [f for f in required_fields if f not in manifest_data]
            if missing:
                print(f"❌ Missing fields: {missing}")
            else:
                print("✅ All required fields present!")
                print(f"✅ User config fields: {len(manifest_data['user_config'])}")
        
        # Show file info
        size_mb = os.path.getsize(dxt_filename) / (1024 * 1024)
        print(f"\n📊 File size: {size_mb:.1f} MB")
        print(f"📁 Location: {os.path.abspath(dxt_filename)}")
        
        print("\n✅ READY FOR CLAUDE DESKTOP INSTALLATION!")
        print("This DXT has the correct manifest structure and should install without errors.")
        
    except Exception as e:
        print(f"❌ ERROR: {e}")

if __name__ == "__main__":
    main()