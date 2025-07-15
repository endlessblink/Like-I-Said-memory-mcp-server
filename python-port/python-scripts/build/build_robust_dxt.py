#!/usr/bin/env python3
"""
Build robust DXT with all dependencies properly bundled
Includes additional fixes for common DXT issues
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

def create_robust_dxt():
    """Create robust DXT with all fixes applied"""
    
    # Create temporary directory for DXT contents
    dxt_dir = Path("dxt_build_robust")
    if dxt_dir.exists():
        shutil.rmtree(dxt_dir)
    dxt_dir.mkdir()
    
    print("Creating robust Like-I-Said DXT...")
    
    # Create server directory
    server_dir = dxt_dir / "server"
    server_dir.mkdir()
    
    # Download and extract Python embeddable
    python_zip = download_python_embeddable()
    with zipfile.ZipFile(python_zip, 'r') as zip_ref:
        zip_ref.extractall(dxt_dir / "python")
    os.unlink(python_zip)
    
    # Create lib directory inside server
    lib_dir = server_dir / "lib"
    lib_dir.mkdir()
    
    # Install ALL required dependencies with their sub-dependencies
    print("Installing all dependencies...")
    subprocess.run([
        sys.executable, "-m", "pip", "install",
        "fastmcp>=2.9.0",
        "pyyaml",
        "--target", str(lib_dir),
        "--quiet"
    ], check=True)
    
    # Copy the comprehensive server
    shutil.copy2("like_i_said/comprehensive_server.py", server_dir / "comprehensive_server.py")
    
    # Create a debug-enabled main.py
    main_py = '''#!/usr/bin/env python3
"""
Main entry point for Like-I-Said MCP Server
Includes debug logging for troubleshooting
"""
import sys
import os
import logging

# Set up debug logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stderr)
    ]
)
logger = logging.getLogger("like-i-said-main")

logger.info("Starting Like-I-Said MCP Server...")
logger.info(f"Python version: {sys.version}")
logger.info(f"Working directory: {os.getcwd()}")
logger.info(f"__file__: {__file__}")

try:
    # Import and run the server
    logger.info("Importing comprehensive_server...")
    from comprehensive_server import mcp
    
    logger.info("Starting FastMCP server...")
    # Direct call to mcp.run()
    mcp.run()
    
except Exception as e:
    logger.error(f"Failed to start server: {e}", exc_info=True)
    sys.exit(1)
'''
    (server_dir / "main.py").write_text(main_py)
    
    # Fix the python._pth file with all necessary paths
    pth_file = dxt_dir / "python" / "python311._pth"
    if pth_file.exists():
        pth_content = """python311.zip
.
..\\server
..\\server\\lib
..\\server\\lib\\site-packages
# Uncomment to run site.main() automatically
import site
"""
        pth_file.write_text(pth_content)
    
    # Also create a sitecustomize.py to ensure paths are set
    site_customize = '''import sys
import os

# Add server and lib to path
server_dir = os.path.join(os.path.dirname(sys.executable), '..', 'server')
lib_dir = os.path.join(server_dir, 'lib')

if os.path.exists(server_dir) and server_dir not in sys.path:
    sys.path.insert(0, server_dir)
    
if os.path.exists(lib_dir) and lib_dir not in sys.path:
    sys.path.insert(0, lib_dir)
'''
    (dxt_dir / "python" / "sitecustomize.py").write_text(site_customize)
    
    # Create manifest.json
    manifest = {
        "dxt_version": "0.1",
        "name": "like-i-said-v2",
        "version": "2.1.0",
        "description": "Advanced MCP Memory Management System with AI Enhancement - Robust Build",
        "author": {
            "name": "endlessblink"
        },
        "server": {
            "type": "python",
            "entry_point": "server/main.py",
            "mcp_config": {
                "command": "python",
                "args": ["${__dirname}/server/main.py"],
                "env": {
                    "PYTHONUNBUFFERED": "1",
                    "PYTHONIOENCODING": "utf-8",
                    "PYTHONDONTWRITEBYTECODE": "1",
                    "FORCE_NO_VENV": "true",
                    "PYTHONPATH": "${__dirname}/server:${__dirname}/server/lib"
                }
            }
        },
        "repository": {
            "type": "git",
            "url": "https://github.com/endlessblink/Like-I-Said-memory-mcp-server"
        },
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
    
    # Create the DXT file
    dxt_filename = "like-i-said-v2-robust.dxt"
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
    print(f"\n🔧 Robust features:")
    print("   - Complete dependency installation (with sub-deps)")
    print("   - Debug logging to stderr")
    print("   - Multiple path fixes (._pth and sitecustomize.py)")
    print("   - PYTHONPATH in environment")
    print("   - All 23 tools included")
    print("\n🚀 Ready to test in Claude Desktop!")
    
    return dxt_filename

if __name__ == "__main__":
    try:
        dxt_file = create_robust_dxt()
        print(f"\n✅ DXT created: {dxt_file}")
        
    except Exception as e:
        print(f"❌ Error creating DXT: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)