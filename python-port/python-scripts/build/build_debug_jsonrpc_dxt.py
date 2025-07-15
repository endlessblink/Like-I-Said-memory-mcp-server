#!/usr/bin/env python3
"""
Build a DEBUG version of the JSON-RPC DXT with extensive logging
This will help us understand why it's failing in Claude Desktop
"""

import json
import shutil
import zipfile
import sys
import subprocess
from pathlib import Path

def create_debug_jsonrpc_dxt():
    """Create debug DXT with extensive logging"""
    
    build_dir = Path("dxt-debug-build")
    if build_dir.exists():
        shutil.rmtree(build_dir)
    build_dir.mkdir()
    
    print("Creating DEBUG JSON-RPC DXT with extensive logging...")
    
    # Create server directory
    server_dir = build_dir / "server"
    server_dir.mkdir()
    
    # Create a debug wrapper that logs EVERYTHING
    debug_wrapper = '''#!/usr/bin/env python3
"""
Debug wrapper for Like-I-Said MCP Server
Logs everything to help diagnose issues
"""

import sys
import os
import json
import traceback
from datetime import datetime

# Create log file in user's home directory for easy access
log_file = os.path.expanduser("~/like-i-said-debug.log")

def log(msg):
    """Log to both stderr and file"""
    timestamp = datetime.now().isoformat()
    full_msg = f"[{timestamp}] {msg}"
    
    # Log to stderr (captured by Claude Desktop)
    print(full_msg, file=sys.stderr, flush=True)
    
    # Also log to file for persistent debugging
    try:
        with open(log_file, 'a') as f:
            f.write(full_msg + "\\n")
            f.flush()
    except:
        pass

def log_exception(e):
    """Log exception with full traceback"""
    log(f"EXCEPTION: {type(e).__name__}: {e}")
    log("TRACEBACK:")
    for line in traceback.format_exc().splitlines():
        log(f"  {line}")

# Start logging immediately
log("=" * 80)
log("DEBUG WRAPPER STARTING")
log(f"Python version: {sys.version}")
log(f"Executable: {sys.executable}")
log(f"Working directory: {os.getcwd()}")
log(f"Script directory: {os.path.dirname(os.path.abspath(__file__))}")
log(f"Environment PATH: {os.environ.get('PATH', 'NOT SET')}")
log(f"Log file: {log_file}")

try:
    # Import the actual server
    log("Importing server module...")
    import standalone_mcp_server
    log("Server module imported successfully")
    
    # Run the server
    log("Starting server main loop...")
    standalone_mcp_server.main()
    
except Exception as e:
    log_exception(e)
    log("FATAL: Failed to start server")
    sys.exit(1)
'''
    
    (server_dir / "debug_wrapper.py").write_text(debug_wrapper)
    
    # Create the actual server with debug logging
    server_code = '''#!/usr/bin/env python3
"""
Like-I-Said v2 - Debug JSON-RPC MCP Server
Extensive logging for troubleshooting
"""

import json
import sys
import os
import uuid
from pathlib import Path
from datetime import datetime

# Enable debug logging
DEBUG = True
log_file = os.path.expanduser("~/like-i-said-server.log")

def log(msg):
    """Debug logging"""
    if DEBUG:
        timestamp = datetime.now().isoformat()
        full_msg = f"[{timestamp}] [SERVER] {msg}"
        print(full_msg, file=sys.stderr, flush=True)
        
        try:
            with open(log_file, 'a') as f:
                f.write(full_msg + "\\n")
                f.flush()
        except:
            pass

class DebugJSONRPCServer:
    def __init__(self):
        log("Initializing DebugJSONRPCServer")
        self.memories_dir = Path("memories")
        self.memories_dir.mkdir(exist_ok=True)
        log(f"Memories directory: {self.memories_dir.absolute()}")
        
    def handle_message(self, request):
        """Handle incoming message with extensive logging"""
        log(f"Handling message: {json.dumps(request)[:200]}...")
        
        request_id = request.get("id")
        method = request.get("method", "")
        params = request.get("params", {})
        
        log(f"Method: {method}, ID: {request_id}")
        
        try:
            # Route to handlers
            if method == "initialize":
                return self.handle_initialize(request_id, params)
            elif method == "initialized":
                log("Received initialized notification")
                return None  # No response for notifications
            elif method == "tools/list":
                return self.handle_tools_list(request_id)
            elif method == "tools/call":
                return self.handle_tools_call(request_id, params)
            else:
                log(f"Unknown method: {method}")
                return self.error_response(request_id, -32601, f"Method not found: {method}")
                
        except Exception as e:
            log(f"ERROR in handle_message: {e}")
            import traceback
            log(traceback.format_exc())
            return self.error_response(request_id, -32603, str(e))
            
    def handle_initialize(self, request_id, params):
        """Handle initialize request"""
        log("Handling initialize request")
        
        response = {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "tools": {}
                },
                "serverInfo": {
                    "name": "like-i-said-v2-debug",
                    "version": "2.0.0-debug"
                }
            }
        }
        
        log(f"Initialize response: {json.dumps(response)}")
        return response
        
    def handle_tools_list(self, request_id):
        """Return minimal tool list for testing"""
        log("Handling tools/list request")
        
        tools = [
            {
                "name": "test_tool",
                "description": "Test tool for debugging",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "message": {
                            "type": "string",
                            "default": "Hello from debug server!"
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
        
        log(f"Tools list response with {len(tools)} tools")
        return response
        
    def handle_tools_call(self, request_id, params):
        """Handle tool execution"""
        tool_name = params.get("name")
        arguments = params.get("arguments", {})
        
        log(f"Tool call: {tool_name} with args: {arguments}")
        
        if tool_name == "test_tool":
            message = arguments.get("message", "Hello from debug server!")
            result = {
                "content": [
                    {
                        "type": "text",
                        "text": f"✅ Debug server working! Message: {message}"
                    }
                ]
            }
        else:
            return self.error_response(request_id, -32602, f"Unknown tool: {tool_name}")
            
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": result
        }
        
    def error_response(self, request_id, code, message):
        """Create error response"""
        response = {
            "jsonrpc": "2.0",
            "id": request_id,
            "error": {
                "code": code,
                "message": message
            }
        }
        log(f"Error response: {response}")
        return response

def main():
    """Main server loop with extensive debug logging"""
    server = DebugJSONRPCServer()
    
    log("=" * 80)
    log("DEBUG SERVER STARTING")
    log(f"Process ID: {os.getpid()}")
    log(f"Parent process ID: {os.getppid()}")
    log(f"stdin: {sys.stdin}")
    log(f"stdout: {sys.stdout}")
    log(f"stderr: {sys.stderr}")
    log("Waiting for messages on stdin...")
    log("=" * 80)
    
    message_count = 0
    
    try:
        while True:
            try:
                # Read line from stdin
                log("Reading from stdin...")
                line = sys.stdin.readline()
                
                if not line:
                    log("EOF received on stdin, exiting")
                    break
                    
                line = line.strip()
                if not line:
                    log("Empty line received, continuing")
                    continue
                
                message_count += 1
                log(f"Message #{message_count} received: {line[:100]}...")
                
                # Parse JSON
                try:
                    request = json.loads(line)
                except json.JSONDecodeError as e:
                    log(f"JSON parse error: {e}")
                    error = {
                        "jsonrpc": "2.0",
                        "id": None,
                        "error": {
                            "code": -32700,
                            "message": f"Parse error: {e}"
                        }
                    }
                    response_str = json.dumps(error)
                    print(response_str, flush=True)
                    log(f"Sent parse error response: {response_str}")
                    continue
                
                # Handle the message
                response = server.handle_message(request)
                
                # Send response if not None
                if response is not None:
                    response_str = json.dumps(response)
                    print(response_str, flush=True)
                    log(f"Sent response: {response_str[:200]}...")
                else:
                    log("No response needed (notification)")
                    
            except Exception as e:
                log(f"ERROR in main loop: {e}")
                import traceback
                log(traceback.format_exc())
                
    except KeyboardInterrupt:
        log("Server interrupted by user")
    except Exception as e:
        log(f"FATAL ERROR: {e}")
        import traceback
        log(traceback.format_exc())
        
    log("Server shutting down")
    log(f"Total messages processed: {message_count}")

if __name__ == "__main__":
    main()
'''
    
    (server_dir / "standalone_mcp_server.py").write_text(server_code)
    
    # Create a run script that ensures Python can import the server
    run_script = '''#!/usr/bin/env python3
import sys
import os

# Add server directory to Python path
server_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, server_dir)

# Import and run the debug wrapper
import debug_wrapper
'''
    
    (server_dir / "run_server.py").write_text(run_script)
    
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
        "name": "like-i-said-v2-debug",
        "version": "2.0.0-debug",
        "description": "Like-I-Said Memory v2 - DEBUG version with extensive logging",
        "author": {
            "name": "endlessblink"
        },
        "server": {
            "type": "python",
            "entry_point": "server/debug_wrapper.py",
            "mcp_config": {
                "command": "python",
                "args": ["${__dirname}/server/debug_wrapper.py"],
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
                "description": "Test tool for debugging"
            }
        ]
    }
    
    with open(build_dir / "manifest.json", 'w') as f:
        json.dump(manifest, f, indent=2)
    
    # Create README
    readme = '''# Like-I-Said Memory v2 - DEBUG Version

This is a debug version with extensive logging to help diagnose connection issues.

## Debug Information

The server logs to two locations:
1. stderr (captured by Claude Desktop)
2. ~/like-i-said-debug.log (wrapper log)
3. ~/like-i-said-server.log (server log)

Check these files after attempting to connect to see what's happening.

## Testing

This debug version only includes a single test_tool to minimize complexity.
'''
    
    (build_dir / "README.md").write_text(readme)
    
    # Create the DXT
    dxt_filename = "like-i-said-v2-debug.dxt"
    
    with zipfile.ZipFile(dxt_filename, 'w', zipfile.ZIP_DEFLATED) as dxt:
        for file in build_dir.rglob('*'):
            if file.is_file():
                arcname = file.relative_to(build_dir)
                dxt.write(file, arcname)
                
    size_mb = Path(dxt_filename).stat().st_size / (1024 * 1024)
    
    shutil.rmtree(build_dir)
    
    print(f"✅ Created {dxt_filename}")
    print(f"📁 Size: {size_mb:.2f} MB")
    print(f"\n🔍 Debug features:")
    print("   - Logs to stderr (visible in Claude Desktop)")
    print("   - Logs to ~/like-i-said-debug.log")
    print("   - Logs to ~/like-i-said-server.log")
    print("   - Extensive logging at every step")
    print("   - Only includes test_tool for simplicity")
    print("\n📋 After testing, check the log files to see what happened!")

if __name__ == "__main__":
    create_debug_jsonrpc_dxt()