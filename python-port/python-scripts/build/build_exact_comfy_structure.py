#!/usr/bin/env python3
"""
Build DXT that EXACTLY mimics the working comfy-guru structure
This should definitively work since comfy-guru works
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

def create_exact_comfy_structure_dxt():
    """Create DXT exactly matching comfy-guru structure"""
    
    # Create temporary directory for DXT contents
    dxt_dir = Path("dxt_build_exact")
    if dxt_dir.exists():
        shutil.rmtree(dxt_dir)
    dxt_dir.mkdir()
    
    print("Creating Like-I-Said DXT with EXACT comfy-guru structure...")
    
    # Create server directory (comfy-guru has server/ at root)
    server_dir = dxt_dir / "server"
    server_dir.mkdir()
    
    # Create lib directory inside server
    lib_dir = server_dir / "lib"
    lib_dir.mkdir()
    
    # Create standalone_mcp_server.py that mimics comfy-guru's approach
    standalone_server = '''#!/usr/bin/env python3
"""
Standalone MCP server for Like-I-Said Memory v2
Based on working comfy-guru structure
"""

import sys
import os
import subprocess
import traceback

# Enable debug logging to stderr
def debug_log(msg):
    print(f"[Like-I-Said MCP Debug] {msg}", file=sys.stderr)
    sys.stderr.flush()

debug_log("Starting MCP server...")
debug_log(f"Python version: {sys.version}")
debug_log(f"Executable: {sys.executable}")

# Get the directory of this script
current_dir = os.path.dirname(os.path.abspath(__file__))
debug_log(f"Current directory: {current_dir}")

# Setup Python path
sys.path.insert(0, current_dir)

# Check for lib directory and install dependencies if needed
lib_dir = os.path.join(current_dir, 'lib')
fastmcp_path = os.path.join(lib_dir, 'fastmcp')

if not os.path.exists(fastmcp_path):
    debug_log("Dependencies not found, installing...")
    os.makedirs(lib_dir, exist_ok=True)
    
    try:
        # Install minimal dependencies
        cmd = [
            sys.executable, '-m', 'pip', 'install', 
            'fastmcp>=2.9.0', 'pyyaml',
            '--target', lib_dir,
            '--quiet', '--disable-pip-version-check'
        ]
        debug_log(f"Running: {' '.join(cmd)}")
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            debug_log(f"pip install failed: {result.stderr}")
    except Exception as e:
        debug_log(f"Error installing dependencies: {e}")

# Add lib to path
if os.path.exists(lib_dir):
    sys.path.insert(0, lib_dir)
    debug_log(f"Added lib directory to path: {lib_dir}")

# Import the comprehensive server
try:
    debug_log("Importing comprehensive_server...")
    from comprehensive_server import *
except Exception as e:
    debug_log(f"Error importing comprehensive_server: {e}")
    debug_log(traceback.format_exc())
    sys.exit(1)

def main():
    try:
        debug_log("Creating MCP server...")
        # The comprehensive_server already created 'mcp' instance
        # Just need to run it
        
        debug_log("Starting server with stdio transport...")
        # Run the server
        mcp.run()
    except Exception as e:
        debug_log(f"Error in main: {e}")
        debug_log(traceback.format_exc())
        sys.exit(1)

if __name__ == "__main__":
    main()
'''
    (server_dir / "standalone_mcp_server.py").write_text(standalone_server)
    
    # Copy the comprehensive server
    shutil.copy2("like_i_said/comprehensive_server.py", server_dir / "comprehensive_server.py")
    
    # Create manifest.json EXACTLY like comfy-guru
    manifest = {
        "dxt_version": "0.1",
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
            "python": ">=3.6"
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
    
    # Install FastMCP and dependencies to lib directory
    print("Pre-installing dependencies to lib directory...")
    subprocess.run([
        sys.executable, "-m", "pip", "install",
        "fastmcp>=2.9.0",
        "pyyaml",
        "--target", str(lib_dir),
        "--quiet"
    ], check=True)
    
    # Create the DXT file
    dxt_filename = "like-i-said-v2-exact-comfy.dxt"
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
    print(f"\n🎯 Exact comfy-guru structure:")
    print("   - standalone_mcp_server.py as entry point")
    print("   - Auto-install dependencies if missing")
    print("   - Debug logging to stderr")
    print("   - Same manifest structure")
    print("   - Dependencies pre-installed in lib/")
    print("\n🚀 This should work if comfy-guru works!")
    
    return dxt_filename

if __name__ == "__main__":
    try:
        dxt_file = create_exact_comfy_structure_dxt()
        print(f"\n✅ DXT created: {dxt_file}")
        
    except Exception as e:
        print(f"❌ Error creating DXT: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)