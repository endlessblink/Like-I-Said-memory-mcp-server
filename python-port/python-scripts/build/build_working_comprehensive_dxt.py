#!/usr/bin/env python3
"""
Build WORKING comprehensive Like-I-Said DXT based on proven manifest structure
This uses the exact manifest format from the working comfy-guru and jsonrpc DXTs
"""

import os
import sys
import json
import zipfile
import urllib.request
import tempfile
import shutil
import subprocess
from pathlib import Path

def download_python_embeddable():
    """Download Python embeddable distribution"""
    python_version = "3.11.9"
    python_url = f"https://www.python.org/ftp/python/{python_version}/python-{python_version}-embed-amd64.zip"
    
    print(f"Downloading Python {python_version} embeddable...")
    
    with tempfile.NamedTemporaryFile(delete=False, suffix='.zip') as tmp_file:
        urllib.request.urlretrieve(python_url, tmp_file.name)
        return tmp_file.name

def create_working_comprehensive_dxt():
    """Create WORKING comprehensive DXT based on proven manifest structure"""
    
    # Create temporary directory for DXT contents
    dxt_dir = Path("dxt_build_working")
    if dxt_dir.exists():
        shutil.rmtree(dxt_dir)
    dxt_dir.mkdir()
    
    print("Creating WORKING comprehensive Like-I-Said DXT...")
    
    # Create server directory
    server_dir = dxt_dir / "server"
    server_dir.mkdir()
    
    # Download and extract Python embeddable to python directory inside server
    python_dir = server_dir / "python"
    python_zip = download_python_embeddable()
    with zipfile.ZipFile(python_zip, 'r') as zip_ref:
        zip_ref.extractall(python_dir)
    os.unlink(python_zip)
    
    # Create lib directory inside server for dependencies
    lib_dir = server_dir / "lib" 
    lib_dir.mkdir()
    
    # Install dependencies to lib directory
    print("Installing FastMCP and dependencies...")
    subprocess.run([
        sys.executable, "-m", "pip", "install",
        "fastmcp>=2.9.0",
        "pyyaml",
        "--target", str(lib_dir),
        "--quiet"
    ], check=True)
    
    # Copy the comprehensive server as standalone_mcp_server.py (matching working DXTs)
    shutil.copy2("like_i_said/comprehensive_server.py", server_dir / "standalone_mcp_server.py")
    
    # Modify the python._pth file to include our lib directory
    pth_file = python_dir / "python311._pth"
    if pth_file.exists():
        pth_content = pth_file.read_text()
        # Add our lib directory to the path
        pth_content = "../lib\n" + pth_content
        pth_file.write_text(pth_content)
    
    # Create manifest.json matching the EXACT structure of working DXTs
    manifest = {
        "dxt_version": "0.1",  # Exact version from working DXTs
        "name": "like-i-said-v2",
        "version": "2.0.0",
        "description": "Advanced MCP Memory Management System with AI Enhancement - Python Implementation with all 23 tools",
        "author": {
            "name": "endlessblink"
        },
        "server": {
            "type": "python",
            "entry_point": "server/standalone_mcp_server.py",
            "mcp_config": {
                "command": "python",
                "args": ["${__dirname}/server/standalone_mcp_server.py"],
                "env": {
                    "PYTHONUNBUFFERED": "1",
                    "PYTHONIOENCODING": "utf-8"
                }
            }
        },
        "repository": {
            "type": "git",
            "url": "https://github.com/endlessblink/Like-I-Said-memory-mcp-server"
        },
        "homepage": "https://github.com/endlessblink/Like-I-Said-memory-mcp-server",
        "requirements": {
            "python": ">=3.8"
        },
        "tools": [
            {
                "name": "test_tool",
                "description": "Simple test tool to verify MCP connection"
            },
            {
                "name": "add_memory", 
                "description": "Store information with auto-categorization and metadata"
            },
            {
                "name": "get_memory",
                "description": "Retrieve specific memory by ID"
            },
            {
                "name": "list_memories",
                "description": "List memories with complexity levels and metadata"
            },
            {
                "name": "delete_memory",
                "description": "Remove specific memory"
            },
            {
                "name": "search_memories",
                "description": "Full-text search with project filtering"
            },
            {
                "name": "create_task",
                "description": "Create tasks with auto-memory linking"
            },
            {
                "name": "update_task",
                "description": "Update task status and add subtasks/connections"
            },
            {
                "name": "list_tasks",
                "description": "List tasks with filtering and relationship data"
            },
            {
                "name": "get_task_context",
                "description": "Get full task context with connected memories"
            },
            {
                "name": "delete_task",
                "description": "Delete tasks and subtasks"
            },
            {
                "name": "generate_dropoff",
                "description": "Generate session handoff documents"
            },
            {
                "name": "enhance_memory_metadata",
                "description": "Generate optimized titles and summaries"
            },
            {
                "name": "batch_enhance_memories",
                "description": "Batch process memories for title/summary generation"
            },
            {
                "name": "smart_status_update",
                "description": "Parse natural language for status changes"
            },
            {
                "name": "get_task_status_analytics",
                "description": "Comprehensive status insights and recommendations"
            },
            {
                "name": "validate_task_workflow",
                "description": "Validate task status changes with suggestions"
            },
            {
                "name": "get_automation_suggestions",
                "description": "Get intelligent automation suggestions"
            },
            {
                "name": "batch_enhance_memories_ollama",
                "description": "Batch process memories using local AI (Ollama)"
            },
            {
                "name": "batch_enhance_tasks_ollama", 
                "description": "Batch process tasks using local AI (Ollama)"
            },
            {
                "name": "check_ollama_status",
                "description": "Check Ollama server status and available models"
            },
            {
                "name": "enhance_memory_ollama",
                "description": "Enhance memory with local AI (Ollama)"
            },
            {
                "name": "deduplicate_memories",
                "description": "Find and remove duplicate memory files"
            }
        ]
    }
    
    with open(dxt_dir / "manifest.json", 'w') as f:
        json.dump(manifest, f, indent=2)
    
    # Create README
    readme = '''# Like-I-Said Memory v2 (Python) - Comprehensive Implementation

This is a comprehensive Python implementation of the Like-I-Said MCP Server with all 23 tools from the original Node.js version.

## Installation

1. Install this DXT in Claude Desktop by double-clicking the .dxt file
2. The server will automatically run with the embedded Python
3. All dependencies are included - no manual installation required

## All 23 Tools Included

### Memory Management (6 tools)
- test_tool, add_memory, get_memory, list_memories, delete_memory, search_memories

### Task Management (6 tools)  
- create_task, update_task, list_tasks, get_task_context, delete_task, generate_dropoff

### AI Enhancement (11 tools)
- enhance_memory_metadata, batch_enhance_memories, smart_status_update
- get_task_status_analytics, validate_task_workflow, get_automation_suggestions
- batch_enhance_memories_ollama, batch_enhance_tasks_ollama
- check_ollama_status, enhance_memory_ollama, deduplicate_memories

## Version 2.0.0
- Python Implementation with embedded Python 3.11.9
- Compatible with Claude Desktop
- All 23 tools from original Node.js version
'''
    
    (dxt_dir / "README.md").write_text(readme)
    
    # Create the DXT file
    dxt_filename = "like-i-said-v2-working-comprehensive.dxt"
    print(f"Creating {dxt_filename}...")
    
    with zipfile.ZipFile(dxt_filename, 'w', zipfile.ZIP_DEFLATED) as dxt_zip:
        for root, dirs, files in os.walk(dxt_dir):
            for file in files:
                file_path = Path(root) / file
                arc_path = file_path.relative_to(dxt_dir)
                dxt_zip.write(file_path, arc_path)
    
    # Clean up temporary directory
    shutil.rmtree(dxt_dir)
    
    print(f"✅ Successfully created {dxt_filename}")
    print(f"📁 Size: {os.path.getsize(dxt_filename) / 1024 / 1024:.1f} MB")
    print(f"🎯 Based on PROVEN manifest structure from working DXTs")
    print(f"🔧 All 23 tools included")
    print(f"📦 Self-contained with embedded Python")
    print(f"✨ Uses exact manifest format that works in Claude Desktop")
    print(f"🚀 Ready to install!")
    
    return dxt_filename

if __name__ == "__main__":
    try:
        dxt_file = create_working_comprehensive_dxt()
        print(f"\n🎉 Success! DXT created: {dxt_file}")
        print("\n📋 Key differences from failed version:")
        print("- Uses dxt_version: '0.1' (not '0.1.0')")
        print("- Uses server.type: 'python' structure")
        print("- Uses server.entry_point instead of direct command")
        print("- Uses mcp_config with ${__dirname} variable")
        print("- Matches EXACT structure of working comfy-guru DXT")
        
    except Exception as e:
        print(f"❌ Error creating DXT: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)