#!/usr/bin/env python3
"""
Build a DXT with embedded Python for Windows
This should work without requiring Python to be installed
"""

import os
import sys
import json
import zipfile
import urllib.request
import tempfile
import shutil
from pathlib import Path

def download_python_embeddable():
    """Download Python embeddable distribution for Windows"""
    python_version = "3.11.9"
    python_url = f"https://www.python.org/ftp/python/{python_version}/python-{python_version}-embed-amd64.zip"
    
    print(f"Downloading Python {python_version} embeddable for Windows...")
    
    with tempfile.NamedTemporaryFile(delete=False, suffix='.zip') as tmp_file:
        urllib.request.urlretrieve(python_url, tmp_file.name)
        return tmp_file.name

def create_windows_embedded_dxt():
    """Create DXT with embedded Python for Windows"""
    
    build_dir = Path("dxt-windows-embedded")
    if build_dir.exists():
        shutil.rmtree(build_dir)
    build_dir.mkdir()
    
    print("Creating Windows-compatible DXT with embedded Python...")
    
    # Download and extract Python embeddable
    python_dir = build_dir / "python"
    python_zip = download_python_embeddable()
    with zipfile.ZipFile(python_zip, 'r') as zip_ref:
        zip_ref.extractall(python_dir)
    os.unlink(python_zip)
    
    # Create python._pth file to enable imports
    pth_content = """python311.zip
.
..\\server
..\\lib

# Enable site packages
import site
"""
    (python_dir / "python311._pth").write_text(pth_content)
    
    # Create server directory
    server_dir = build_dir / "server"
    server_dir.mkdir()
    
    # Install PyYAML wheel directly into lib
    lib_dir = build_dir / "lib"
    lib_dir.mkdir()
    
    print("Installing PyYAML...")
    yaml_url = "https://files.pythonhosted.org/packages/54/ed/79a089b6be93607fa5cdaedf301d7dfb23af5f25c398d5ead2525b063e17/PyYAML-6.0.1-cp311-cp311-win_amd64.whl"
    yaml_wheel = Path("pyyaml.whl")
    urllib.request.urlretrieve(yaml_url, yaml_wheel)
    
    with zipfile.ZipFile(yaml_wheel, 'r') as zip_ref:
        zip_ref.extractall(lib_dir)
    yaml_wheel.unlink()
    
    # Create the simplest possible server
    server_code = '''#!/usr/bin/env python3
"""
Like-I-Said v2 - Minimal Windows MCP Server
Simplest possible implementation for debugging
"""

import json
import sys
import os
from datetime import datetime

# Force UTF-8 encoding
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

def log(msg):
    """Log to stderr"""
    timestamp = datetime.now().isoformat()
    print(f"[{timestamp}] {msg}", file=sys.stderr, flush=True)

log("Like-I-Said Windows MCP Server starting...")
log(f"Python: {sys.version}")
log(f"Executable: {sys.executable}")
log(f"Working dir: {os.getcwd()}")

try:
    while True:
        log("Waiting for input...")
        line = sys.stdin.readline()
        
        if not line:
            log("EOF received, exiting")
            break
            
        line = line.strip()
        if not line:
            continue
            
        log(f"Received: {line[:100]}...")
        
        try:
            request = json.loads(line)
        except json.JSONDecodeError as e:
            error = {
                "jsonrpc": "2.0",
                "id": None,
                "error": {"code": -32700, "message": f"Parse error: {e}"}
            }
            print(json.dumps(error), flush=True)
            continue
        
        method = request.get("method", "")
        request_id = request.get("id")
        
        log(f"Method: {method}, ID: {request_id}")
        
        # Handle initialize
        if method == "initialize":
            response = {
                "jsonrpc": "2.0",
                "id": request_id,
                "result": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {"tools": {}},
                    "serverInfo": {
                        "name": "like-i-said-v2-windows",
                        "version": "2.0.0"
                    }
                }
            }
            print(json.dumps(response), flush=True)
            log("Sent initialize response")
            
        elif method == "initialized":
            log("Received initialized notification")
            
        elif method == "tools/list":
            response = {
                "jsonrpc": "2.0",
                "id": request_id,
                "result": {
                    "tools": [{
                        "name": "test_tool",
                        "description": "Test tool",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "message": {"type": "string", "default": "Hello!"}
                            }
                        }
                    }]
                }
            }
            print(json.dumps(response), flush=True)
            log("Sent tools list")
            
        elif method == "tools/call":
            tool_name = request.get("params", {}).get("name")
            if tool_name == "test_tool":
                response = {
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "result": {
                        "content": [{
                            "type": "text",
                            "text": "✅ Windows embedded server working!"
                        }]
                    }
                }
                print(json.dumps(response), flush=True)
                log("Executed test_tool")
                
except Exception as e:
    log(f"Fatal error: {e}")
    import traceback
    log(traceback.format_exc())

log("Server shutting down")
'''
    
    (server_dir / "mcp_server.py").write_text(server_code)
    
    # Create Windows batch file launcher
    batch_launcher = '''@echo off
setlocal
cd /d "%~dp0"

echo Starting Like-I-Said MCP Server... >> "%USERPROFILE%\\like-i-said-launcher.log"
echo Current directory: %CD% >> "%USERPROFILE%\\like-i-said-launcher.log"
echo Time: %DATE% %TIME% >> "%USERPROFILE%\\like-i-said-launcher.log"

"%~dp0python\\python.exe" "%~dp0server\\mcp_server.py" 2>> "%USERPROFILE%\\like-i-said-launcher.log"

echo Server exited with code: %ERRORLEVEL% >> "%USERPROFILE%\\like-i-said-launcher.log"
exit /b %ERRORLEVEL%
'''
    
    (build_dir / "run_server.bat").write_text(batch_launcher)
    
    # Create a Python wrapper as alternative
    python_launcher = '''import subprocess
import sys
import os

# Get the directory of this script
script_dir = os.path.dirname(os.path.abspath(__file__))
python_exe = os.path.join(script_dir, "python", "python.exe")
server_script = os.path.join(script_dir, "server", "mcp_server.py")

# Run the server
sys.exit(subprocess.call([python_exe, server_script]))
'''
    
    (build_dir / "run_server.py").write_text(python_launcher)
    
    # Create manifest.json
    manifest = {
        "dxt_version": "0.1",
        "name": "like-i-said-v2-windows",
        "version": "2.0.0",
        "description": "Like-I-Said Memory v2 - Windows Embedded Python",
        "author": {
            "name": "endlessblink"
        },
        "server": {
            "type": "stdio",
            "run": {
                "command": "run_server.bat"
            }
        },
        "tools": [
            {
                "name": "test_tool",
                "description": "Test tool"
            }
        ]
    }
    
    # Also try alternative manifest formats
    alt_manifest = {
        "dxt_version": "0.1",
        "name": "like-i-said-v2-windows",
        "version": "2.0.0",
        "description": "Like-I-Said Memory v2 - Windows Embedded Python",
        "author": "endlessblink",
        "mcp_server": {
            "command": "python\\python.exe",
            "args": ["server\\mcp_server.py"]
        }
    }
    
    with open(build_dir / "manifest.json", 'w') as f:
        json.dump(manifest, f, indent=2)
    
    # Create README
    readme = '''# Like-I-Said Memory v2 - Windows Embedded Version

This version includes embedded Python for Windows and should work without any Python installation.

## Debug Information

Check these files for debugging:
- %USERPROFILE%\\like-i-said-launcher.log (batch file log)
- stderr output in Claude Desktop

## Features
- Embedded Python 3.11.9 for Windows
- No installation required
- Simple test_tool for verification
'''
    
    (build_dir / "README.md").write_text(readme)
    
    # Create the DXT
    dxt_filename = "like-i-said-v2-windows-embedded.dxt"
    
    with zipfile.ZipFile(dxt_filename, 'w', zipfile.ZIP_DEFLATED) as dxt:
        for file in build_dir.rglob('*'):
            if file.is_file():
                arcname = file.relative_to(build_dir)
                dxt.write(file, arcname)
    
    size_mb = Path(dxt_filename).stat().st_size / (1024 * 1024)
    
    shutil.rmtree(build_dir)
    
    print(f"✅ Created {dxt_filename}")
    print(f"📁 Size: {size_mb:.1f} MB")
    print(f"\n🎯 Key features:")
    print("   - Embedded Python 3.11.9 for Windows (no installation needed)")
    print("   - Batch file launcher")
    print("   - Logs to %USERPROFILE%\\like-i-said-launcher.log")
    print("   - Minimal implementation for debugging")
    print("   - UTF-8 encoding forced")

if __name__ == "__main__":
    create_windows_embedded_dxt()