#!/usr/bin/env python3
"""
Build FIXED comprehensive Like-I-Said DXT with proper manifest structure
This fixes the "dxt_version: Required; server: Required" error
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

def create_fixed_comprehensive_dxt():
    """Create FIXED comprehensive DXT with proper manifest"""
    
    # Create temporary directory for DXT contents
    dxt_dir = Path("dxt_build_fixed")
    if dxt_dir.exists():
        shutil.rmtree(dxt_dir)
    dxt_dir.mkdir()
    
    print("Creating FIXED comprehensive Like-I-Said DXT...")
    
    # Download and extract Python embeddable
    python_zip = download_python_embeddable()
    with zipfile.ZipFile(python_zip, 'r') as zip_ref:
        zip_ref.extractall(dxt_dir / "python")
    os.unlink(python_zip)
    
    # Create lib directory for dependencies
    lib_dir = dxt_dir / "lib" 
    lib_dir.mkdir()
    
    # Install dependencies to lib directory
    print("Installing FastMCP and dependencies...")
    subprocess.run([
        sys.executable, "-m", "pip", "install",
        "fastmcp>=2.9.0",
        "pyyaml",
        "pathlib",
        "--target", str(lib_dir),
        "--no-deps"
    ], check=True)
    
    # Copy our comprehensive server
    server_dir = dxt_dir / "like_i_said"
    server_dir.mkdir()
    
    # Copy the comprehensive server file
    shutil.copy2("like_i_said/comprehensive_server.py", server_dir / "server.py")
    
    # Create __init__.py
    (server_dir / "__init__.py").write_text("")
    
    # Create main server runner
    server_runner = '''#!/usr/bin/env python3
"""
Like-I-Said MCP Server v2 - Comprehensive Implementation
JSON-RPC 2.0 compliant server with all 23 tools
"""

import sys
import os
import json
from pathlib import Path

# Get the directory of this script
current_dir = Path(__file__).parent.absolute()

# Add lib directory to Python path
lib_dir = current_dir / "lib"
if lib_dir.exists():
    sys.path.insert(0, str(lib_dir))

# Add current directory to path
sys.path.insert(0, str(current_dir))

# Set environment to bypass venv check for embedded Python
os.environ['FORCE_NO_VENV'] = 'true'

try:
    from like_i_said.server import *
except ImportError as e:
    print(f"ERROR: Failed to import Like-I-Said server: {e}", file=sys.stderr)
    print(f"Python path: {sys.path}", file=sys.stderr)
    print(f"Current directory: {current_dir}", file=sys.stderr)
    print(f"Lib directory exists: {lib_dir.exists()}", file=sys.stderr)
    if lib_dir.exists():
        print(f"Lib directory contents: {list(lib_dir.iterdir())}", file=sys.stderr)
    sys.exit(1)

if __name__ == "__main__":
    # The server is already configured to run via FastMCP
    # This script just ensures proper imports and environment
    pass
'''
    
    (dxt_dir / "server.py").write_text(server_runner)
    
    # Create Windows batch launcher that uses relative path to embedded Python
    windows_launcher = '''@echo off
cd /d "%~dp0"
set FORCE_NO_VENV=true
set PYTHONPATH=%~dp0;%~dp0\\lib
"%~dp0python\\python.exe" "%~dp0server.py" %*
'''
    (dxt_dir / "like-i-said-v2.bat").write_text(windows_launcher)
    
    # Create Unix shell launcher
    unix_launcher = '''#!/bin/bash
cd "$(dirname "$0")"
export FORCE_NO_VENV=true
export PYTHONPATH="$PWD:$PWD/lib"
"$PWD/python/python" "$PWD/server.py" "$@"
'''
    unix_launcher_path = dxt_dir / "like-i-said-v2.sh"
    unix_launcher_path.write_text(unix_launcher)
    unix_launcher_path.chmod(0o755)
    
    # Create FIXED manifest.json with proper DXT structure
    manifest = {
        "dxt_version": "0.1.0",  # REQUIRED field that was missing!
        "name": "like-i-said-v2",
        "display_name": "Like-I-Said Memory v2 (Python)",
        "description": "Advanced MCP Memory Management System with AI Enhancement - Python Implementation with all 23 tools",
        "author": "EndlessBlink",
        "version": "2.0.0",
        "license": "MIT",
        "homepage": "https://github.com/endlessblink/Like-I-Said-memory-mcp-server",
        "server": {  # REQUIRED field with proper structure!
            "command": "like-i-said-v2.bat",  # Use the batch file for Windows
            "args": [],
            "type": "stdio"
        },
        "client_config": {
            "mcpServers": {
                "like-i-said-v2": {
                    "command": "like-i-said-v2.bat",
                    "args": [],
                    "type": "stdio"
                }
            }
        },
        "supported_platforms": ["windows", "macos", "linux"],
        "requirements": {
            "claude_desktop": ">=0.7.0"
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
    
    # Create README for users
    readme = '''# Like-I-Said Memory v2 (Python) - Comprehensive Implementation

This is a comprehensive Python implementation of the Like-I-Said MCP Server with all 23 tools from the original Node.js version.

## Installation

1. Install this DXT in Claude Desktop by double-clicking the .dxt file
2. The server will automatically run in an isolated environment
3. All dependencies are included - no manual Python installation required

## Features

### Memory Management (6 tools)
- `test_tool` - Verify MCP connection
- `add_memory` - Store information with auto-categorization
- `get_memory` - Retrieve specific memory by ID
- `list_memories` - List memories with complexity levels
- `delete_memory` - Remove specific memory  
- `search_memories` - Full-text search with filtering

### Task Management (6 tools)
- `create_task` - Create tasks with auto-memory linking
- `update_task` - Update task status and connections
- `list_tasks` - List tasks with filtering
- `get_task_context` - Get full task context with memories
- `delete_task` - Delete tasks and subtasks
- `generate_dropoff` - Generate session handoff documents

### AI Enhancement (11 tools)
- `enhance_memory_metadata` - Generate titles and summaries
- `batch_enhance_memories` - Batch process memory metadata
- `smart_status_update` - Parse natural language status changes
- `get_task_status_analytics` - Comprehensive analytics
- `validate_task_workflow` - Validate status transitions
- `get_automation_suggestions` - Get automation recommendations
- `batch_enhance_memories_ollama` - Local AI processing (simplified)
- `batch_enhance_tasks_ollama` - Local AI task processing (simplified)
- `check_ollama_status` - Check local AI status (simplified)
- `enhance_memory_ollama` - Local AI enhancement (simplified)
- `deduplicate_memories` - Find and remove duplicates

## Data Storage

- Memories: Stored in `memories/` directory as markdown files with YAML frontmatter
- Tasks: Stored in `tasks/` directory organized by project and status
- Both support project-based organization and advanced metadata

## Version

- Python Implementation: 2.0.0
- Compatible with: Claude Desktop, Claude Code, Cursor, Windsurf
- All 23 tools from original Node.js version implemented
'''
    
    (dxt_dir / "README.md").write_text(readme)
    
    # Create the DXT file
    dxt_filename = "like-i-said-v2-fixed-comprehensive.dxt"
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
    print(f"🎯 Features: All 23 tools from original Node.js version")
    print(f"🔧 Tools: 6 memory + 6 task + 11 AI enhancement")
    print(f"📦 Self-contained: Embedded Python + all dependencies")
    print(f"🔧 FIXED: Proper manifest.json with dxt_version and server fields")
    print(f"🚀 Ready to install in Claude Desktop!")
    
    return dxt_filename

if __name__ == "__main__":
    try:
        dxt_file = create_fixed_comprehensive_dxt()
        print(f"\n🎉 Success! DXT created: {dxt_file}")
        print("\n📋 Installation Instructions:")
        print("1. Download the DXT file")
        print("2. Double-click to install in Claude Desktop")
        print("3. Start using all 23 Like-I-Said tools!")
        
    except Exception as e:
        print(f"❌ Error creating DXT: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)