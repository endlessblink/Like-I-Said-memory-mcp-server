#!/usr/bin/env python3
"""
Build a Windows-robust DXT based on the debug findings
The server starts but disconnects - likely stdio issues on Windows
"""

import json
import shutil
import zipfile
import sys
import subprocess
from pathlib import Path

def create_windows_robust_dxt():
    """Create Windows-robust DXT with better stdio handling"""
    
    build_dir = Path("dxt-windows-robust")
    if build_dir.exists():
        shutil.rmtree(build_dir)
    build_dir.mkdir()
    
    print("Creating Windows-robust DXT with enhanced stdio handling...")
    
    # Create server directory
    server_dir = build_dir / "server"
    server_dir.mkdir()
    
    # Create a server with Windows-specific stdio handling
    server_code = '''#!/usr/bin/env python3
"""
Like-I-Said v2 - Windows-robust MCP Server
Enhanced stdio handling for Windows environment
"""

import json
import sys
import os
import uuid
import io
from pathlib import Path
from datetime import datetime

# Windows-specific: Force binary mode and handle encoding properly
if sys.platform == "win32":
    import msvcrt
    # Set binary mode for stdin/stdout
    msvcrt.setmode(sys.stdin.fileno(), os.O_BINARY)
    msvcrt.setmode(sys.stdout.fileno(), os.O_BINARY)
    
    # Wrap with UTF-8 text wrapper
    sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding='utf-8', line_buffering=True)
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', line_buffering=True)
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', line_buffering=True)

# Enhanced logging
log_file = os.path.join(os.path.expanduser("~"), "like-i-said-server-detailed.log")

def log(msg):
    """Enhanced logging with more detail"""
    timestamp = datetime.now().isoformat()
    full_msg = f"[{timestamp}] {msg}"
    
    # Always log to stderr
    print(full_msg, file=sys.stderr, flush=True)
    
    # Also log to file
    try:
        with open(log_file, 'a', encoding='utf-8') as f:
            f.write(full_msg + "\\n")
            f.flush()
    except Exception as e:
        print(f"[{timestamp}] Failed to write to log file: {e}", file=sys.stderr, flush=True)

class WindowsRobustServer:
    def __init__(self):
        log("Initializing Windows-robust server")
        log(f"Platform: {sys.platform}")
        log(f"Python version: {sys.version}")
        log(f"stdin encoding: {sys.stdin.encoding}")
        log(f"stdout encoding: {sys.stdout.encoding}")
        log(f"Working directory: {os.getcwd()}")
        
        self.memories_dir = Path("memories")
        self.memories_dir.mkdir(exist_ok=True)
        
    def run(self):
        """Main loop with Windows-specific handling"""
        log("Starting main server loop")
        log("Waiting for input on stdin...")
        
        message_count = 0
        
        try:
            while True:
                try:
                    # Windows-specific: Handle line reading carefully
                    log("About to read from stdin...")
                    
                    # Try to read with timeout to avoid blocking forever
                    line = ""
                    if sys.platform == "win32":
                        # On Windows, check if data is available
                        import select
                        if hasattr(select, 'select'):
                            # Unix-style select
                            readable, _, _ = select.select([sys.stdin], [], [], 0.1)
                            if readable:
                                line = sys.stdin.readline()
                        else:
                            # Windows doesn't support select on stdin, just read
                            line = sys.stdin.readline()
                    else:
                        line = sys.stdin.readline()
                    
                    if not line:
                        log("EOF or empty read from stdin")
                        # Don't exit immediately, wait a bit
                        import time
                        time.sleep(0.1)
                        continue
                    
                    line = line.strip()
                    if not line:
                        continue
                    
                    message_count += 1
                    log(f"Received message #{message_count}: {line[:100]}...")
                    
                    # Parse JSON
                    try:
                        request = json.loads(line)
                    except json.JSONDecodeError as e:
                        log(f"JSON parse error: {e}")
                        self.send_error(None, -32700, f"Parse error: {e}")
                        continue
                    
                    # Handle message
                    self.handle_message(request)
                    
                except KeyboardInterrupt:
                    log("Keyboard interrupt received")
                    break
                except Exception as e:
                    log(f"Error in main loop: {type(e).__name__}: {e}")
                    import traceback
                    log(f"Traceback: {traceback.format_exc()}")
                    
        except Exception as e:
            log(f"Fatal error in server: {type(e).__name__}: {e}")
            import traceback
            log(f"Traceback: {traceback.format_exc()}")
            
        log(f"Server exiting. Processed {message_count} messages.")
        
    def handle_message(self, request):
        """Handle incoming message"""
        request_id = request.get("id")
        method = request.get("method", "")
        params = request.get("params", {})
        
        log(f"Handling method: {method}, id: {request_id}")
        
        try:
            if method == "initialize":
                self.handle_initialize(request_id, params)
            elif method == "initialized":
                log("Received initialized notification")
                # No response for notifications
            elif method == "tools/list":
                self.handle_tools_list(request_id)
            elif method == "tools/call":
                self.handle_tools_call(request_id, params)
            else:
                self.send_error(request_id, -32601, f"Method not found: {method}")
                
        except Exception as e:
            log(f"Error handling {method}: {e}")
            self.send_error(request_id, -32603, str(e))
            
    def handle_initialize(self, request_id, params):
        """Handle initialize request"""
        response = {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "tools": {}
                },
                "serverInfo": {
                    "name": "like-i-said-v2-windows",
                    "version": "2.0.0-robust"
                }
            }
        }
        self.send_response(response)
        
    def handle_tools_list(self, request_id):
        """List available tools"""
        tools = [
            {
                "name": "test_tool",
                "description": "Test tool for Windows",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "message": {
                            "type": "string",
                            "default": "Hello from Windows!"
                        }
                    }
                }
            }
        ]
        
        response = {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {"tools": tools}
        }
        self.send_response(response)
        
    def handle_tools_call(self, request_id, params):
        """Handle tool execution"""
        tool_name = params.get("name")
        arguments = params.get("arguments", {})
        
        log(f"Executing tool: {tool_name}")
        
        if tool_name == "test_tool":
            message = arguments.get("message", "Hello from Windows!")
            result = {
                "content": [
                    {
                        "type": "text",
                        "text": f"✅ Windows server working! {message}"
                    }
                ]
            }
            response = {
                "jsonrpc": "2.0",
                "id": request_id,
                "result": result
            }
            self.send_response(response)
        else:
            self.send_error(request_id, -32602, f"Unknown tool: {tool_name}")
            
    def send_response(self, response):
        """Send response with proper flushing"""
        response_str = json.dumps(response, ensure_ascii=False)
        log(f"Sending response: {response_str[:200]}...")
        
        # Write and flush immediately
        print(response_str, flush=True)
        
        # Extra flush on Windows
        if sys.platform == "win32":
            sys.stdout.flush()
            
    def send_error(self, request_id, code, message):
        """Send error response"""
        response = {
            "jsonrpc": "2.0",
            "id": request_id,
            "error": {
                "code": code,
                "message": message
            }
        }
        self.send_response(response)

def main():
    """Main entry point with exception handling"""
    log("=" * 80)
    log("Like-I-Said Windows-robust Server Starting")
    log("=" * 80)
    
    try:
        server = WindowsRobustServer()
        server.run()
    except Exception as e:
        log(f"Failed to start server: {type(e).__name__}: {e}")
        import traceback
        log(f"Traceback: {traceback.format_exc()}")
        sys.exit(1)

if __name__ == "__main__":
    main()
'''
    
    (server_dir / "windows_robust_server.py").write_text(server_code)
    
    # Create a simple test script
    test_script = '''#!/usr/bin/env python3
"""Test script to verify stdio handling"""

import sys
import json

print("TEST: Can write to stdout", flush=True)
print("TEST: Can write to stderr", file=sys.stderr, flush=True)

# Try to read one line
print("TEST: Waiting for input...", file=sys.stderr, flush=True)
line = sys.stdin.readline()
if line:
    print(f"TEST: Received: {line.strip()}", file=sys.stderr, flush=True)
    
    # Try to parse as JSON
    try:
        data = json.loads(line)
        print(f"TEST: Parsed JSON successfully", file=sys.stderr, flush=True)
        
        # Send a response
        response = {"status": "ok", "received": data}
        print(json.dumps(response), flush=True)
    except Exception as e:
        print(f"TEST: Error: {e}", file=sys.stderr, flush=True)
else:
    print("TEST: No input received", file=sys.stderr, flush=True)
'''
    
    (server_dir / "test_simple_server.py").write_text(test_script)
    
    # Create a debug script
    debug_script = '''#!/usr/bin/env python3
"""Debug Windows stdio issues"""

import sys
import os
import json

# Log everything
print(f"Python: {sys.version}", file=sys.stderr)
print(f"Platform: {sys.platform}", file=sys.stderr)
print(f"stdin: {sys.stdin}", file=sys.stderr)
print(f"stdout: {sys.stdout}", file=sys.stderr)
print(f"stderr: {sys.stderr}", file=sys.stderr)
print(f"stdin isatty: {sys.stdin.isatty()}", file=sys.stderr)
print(f"stdout isatty: {sys.stdout.isatty()}", file=sys.stderr)

# Test JSON communication
test_request = {"jsonrpc": "2.0", "id": 1, "method": "test"}
print(f"Sending: {json.dumps(test_request)}", file=sys.stderr)
print(json.dumps(test_request), flush=True)

print("Now waiting for input...", file=sys.stderr)
try:
    line = sys.stdin.readline()
    if line:
        print(f"Received: {line.strip()}", file=sys.stderr)
    else:
        print("No input received", file=sys.stderr)
except Exception as e:
    print(f"Error reading: {e}", file=sys.stderr)
'''
    
    (server_dir / "debug_windows_stdio.py").write_text(debug_script)
    
    # Install PyYAML
    lib_dir = build_dir / "lib"
    print("Installing PyYAML...")
    subprocess.run([
        sys.executable, "-m", "pip", "install",
        "pyyaml",
        "--target", str(lib_dir),
        "--quiet"
    ], check=True)
    
    # Create manifest.json
    manifest = {
        "dxt_version": "0.1",
        "name": "like-i-said-v2-windows-robust",
        "version": "2.0.0-robust",
        "description": "Like-I-Said Memory v2 - Windows-robust stdio handling",
        "author": {
            "name": "endlessblink"
        },
        "server": {
            "type": "python",
            "entry_point": "server/windows_robust_server.py",
            "mcp_config": {
                "command": "python",
                "args": ["${__dirname}/server/windows_robust_server.py"],
                "env": {
                    "PYTHONUNBUFFERED": "1",
                    "PYTHONIOENCODING": "utf-8",
                    "PYTHONDONTWRITEBYTECODE": "1"
                }
            }
        },
        "tools": [
            {
                "name": "test_tool",
                "description": "Test tool for Windows"
            }
        ]
    }
    
    with open(build_dir / "manifest.json", 'w') as f:
        json.dump(manifest, f, indent=2)
    
    # Create the DXT
    dxt_filename = "like-i-said-v2-windows-robust.dxt"
    
    with zipfile.ZipFile(dxt_filename, 'w', zipfile.ZIP_DEFLATED) as dxt:
        for file in build_dir.rglob('*'):
            if file.is_file():
                arcname = file.relative_to(build_dir)
                dxt.write(file, arcname)
                
    size_mb = Path(dxt_filename).stat().st_size / (1024 * 1024)
    
    shutil.rmtree(build_dir)
    
    print(f"✅ Created {dxt_filename}")
    print(f"📁 Size: {size_mb:.2f} MB")
    print(f"\n🔍 Enhanced features:")
    print("   - Windows-specific stdio handling")
    print("   - Binary mode configuration")
    print("   - Line buffering for immediate output")
    print("   - Enhanced logging to ~/like-i-said-server-detailed.log")
    print("   - Test scripts included for debugging")

if __name__ == "__main__":
    create_windows_robust_dxt()