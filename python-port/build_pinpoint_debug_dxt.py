#!/usr/bin/env python3
"""
Build a DXT specifically designed to pinpoint the exact disconnection cause
This version logs every single step and catches all possible failure points
"""

import json
import shutil
import zipfile
import sys
import subprocess
from pathlib import Path

def create_pinpoint_debug_dxt():
    """Create a DXT that pinpoints the exact disconnection cause"""
    
    build_dir = Path("dxt-pinpoint-debug")
    if build_dir.exists():
        shutil.rmtree(build_dir)
    build_dir.mkdir()
    
    print("Creating pinpoint debug DXT to find exact disconnection cause...")
    
    # Create server directory
    server_dir = build_dir / "server"
    server_dir.mkdir()
    
    # Create the most detailed debug server possible
    server_code = '''#!/usr/bin/env python3
"""
Pinpoint Debug Server - Find exact disconnection cause
Logs every possible failure point
"""

import json
import sys
import os
import time
import traceback
from datetime import datetime

# Multiple log files for different aspects
base_log_dir = os.path.expanduser("~")
main_log = os.path.join(base_log_dir, "pinpoint-main.log")
stdio_log = os.path.join(base_log_dir, "pinpoint-stdio.log")
error_log = os.path.join(base_log_dir, "pinpoint-errors.log")

def log_to_file(filename, msg):
    """Log to specific file"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
    try:
        with open(filename, 'a', encoding='utf-8') as f:
            f.write(f"[{timestamp}] {msg}\\n")
            f.flush()
    except:
        pass

def log_main(msg):
    """Log main execution flow"""
    log_to_file(main_log, msg)
    print(f"[MAIN] {msg}", file=sys.stderr, flush=True)

def log_stdio(msg):
    """Log stdio operations"""
    log_to_file(stdio_log, msg)
    print(f"[STDIO] {msg}", file=sys.stderr, flush=True)

def log_error(msg):
    """Log errors"""
    log_to_file(error_log, msg)
    print(f"[ERROR] {msg}", file=sys.stderr, flush=True)

# Start logging immediately
log_main("=" * 80)
log_main("PINPOINT DEBUG SERVER STARTING")
log_main(f"Process ID: {os.getpid()}")
log_main(f"Parent PID: {os.getppid()}")
log_main(f"Python: {sys.version}")
log_main(f"Executable: {sys.executable}")
log_main(f"Platform: {sys.platform}")
log_main(f"Working dir: {os.getcwd()}")

# Check environment
log_main("Environment checks:")
log_main(f"  PATH: {os.environ.get('PATH', 'NOT SET')[:200]}...")
log_main(f"  PYTHONUNBUFFERED: {os.environ.get('PYTHONUNBUFFERED', 'NOT SET')}")
log_main(f"  PYTHONIOENCODING: {os.environ.get('PYTHONIOENCODING', 'NOT SET')}")

# Check stdio
log_stdio("Checking stdio streams...")
try:
    log_stdio(f"stdin: {sys.stdin}")
    log_stdio(f"  - encoding: {getattr(sys.stdin, 'encoding', 'NO ENCODING')}")
    log_stdio(f"  - isatty: {sys.stdin.isatty() if hasattr(sys.stdin, 'isatty') else 'NO ISATTY'}")
    log_stdio(f"  - mode: {getattr(sys.stdin, 'mode', 'NO MODE')}")
    log_stdio(f"  - fileno: {sys.stdin.fileno() if hasattr(sys.stdin, 'fileno') else 'NO FILENO'}")
except Exception as e:
    log_error(f"Error checking stdin: {e}")

try:
    log_stdio(f"stdout: {sys.stdout}")
    log_stdio(f"  - encoding: {getattr(sys.stdout, 'encoding', 'NO ENCODING')}")
    log_stdio(f"  - isatty: {sys.stdout.isatty() if hasattr(sys.stdout, 'isatty') else 'NO ISATTY'}")
    log_stdio(f"  - mode: {getattr(sys.stdout, 'mode', 'NO MODE')}")
    log_stdio(f"  - fileno: {sys.stdout.fileno() if hasattr(sys.stdout, 'fileno') else 'NO FILENO'}")
except Exception as e:
    log_error(f"Error checking stdout: {e}")

# Test basic I/O
log_stdio("Testing basic I/O operations...")

# Test writing
try:
    log_stdio("Testing stdout write...")
    sys.stdout.write("TEST")
    sys.stdout.flush()
    log_stdio("stdout write successful")
except Exception as e:
    log_error(f"stdout write failed: {e}")
    log_error(traceback.format_exc())

# Test JSON writing
try:
    log_stdio("Testing JSON write...")
    test_obj = {"test": "message"}
    json_str = json.dumps(test_obj)
    print(json_str, flush=True)
    log_stdio(f"JSON write successful: {json_str}")
except Exception as e:
    log_error(f"JSON write failed: {e}")
    log_error(traceback.format_exc())

# Main server class
class PinpointDebugServer:
    def __init__(self):
        log_main("Initializing PinpointDebugServer")
        self.message_count = 0
        self.start_time = time.time()
        
    def run(self):
        """Main server loop with detailed debugging"""
        log_main("Entering main server loop")
        
        # Try different ways to read stdin
        log_stdio("Starting stdin read loop...")
        
        try:
            # Method 1: readline()
            log_stdio("Using readline() method")
            
            while True:
                try:
                    # Log before read
                    log_stdio(f"About to call readline() - message #{self.message_count + 1}")
                    log_stdio(f"Time since start: {time.time() - self.start_time:.2f}s")
                    
                    # Set a marker before readline
                    log_stdio("MARKER: Before readline()")
                    
                    # The actual read
                    line = sys.stdin.readline()
                    
                    # Log immediately after read
                    log_stdio("MARKER: After readline()")
                    log_stdio(f"readline() returned: {repr(line)}")
                    
                    if not line:
                        log_stdio("readline() returned empty - EOF or closed stdin")
                        log_main("Breaking loop due to empty readline")
                        break
                    
                    if line == '\\n':
                        log_stdio("Received just newline, continuing")
                        continue
                        
                    line = line.strip()
                    if not line:
                        log_stdio("Line was just whitespace, continuing")
                        continue
                    
                    self.message_count += 1
                    log_main(f"Message #{self.message_count} received: {line[:100]}...")
                    
                    # Try to parse JSON
                    try:
                        request = json.loads(line)
                        log_main(f"Successfully parsed JSON: {list(request.keys())}")
                        
                        # Handle the request
                        self.handle_request(request)
                        
                    except json.JSONDecodeError as e:
                        log_error(f"JSON parse error: {e}")
                        log_error(f"Failed to parse: {repr(line)}")
                        self.send_error(None, -32700, f"Parse error: {e}")
                        
                except IOError as e:
                    log_error(f"IOError in read loop: {e}")
                    log_error(f"Error code: {e.errno if hasattr(e, 'errno') else 'NO ERRNO'}")
                    log_error(traceback.format_exc())
                    break
                    
                except Exception as e:
                    log_error(f"Unexpected error in read loop: {type(e).__name__}: {e}")
                    log_error(traceback.format_exc())
                    # Don't break, try to continue
                    
        except KeyboardInterrupt:
            log_main("Keyboard interrupt received")
        except Exception as e:
            log_error(f"Fatal error in main loop: {type(e).__name__}: {e}")
            log_error(traceback.format_exc())
            
        log_main(f"Server loop ended. Messages processed: {self.message_count}")
        log_main(f"Total runtime: {time.time() - self.start_time:.2f}s")
        
    def handle_request(self, request):
        """Handle JSON-RPC request"""
        method = request.get("method", "")
        request_id = request.get("id")
        
        log_main(f"Handling method: {method}, id: {request_id}")
        
        try:
            if method == "initialize":
                response = {
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "result": {
                        "protocolVersion": "2024-11-05",
                        "capabilities": {"tools": {}},
                        "serverInfo": {
                            "name": "pinpoint-debug",
                            "version": "1.0.0"
                        }
                    }
                }
                self.send_response(response)
                
            elif method == "initialized":
                log_main("Received initialized notification (no response needed)")
                
            elif method == "tools/list":
                response = {
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "result": {
                        "tools": [{
                            "name": "debug_test",
                            "description": "Debug test tool",
                            "inputSchema": {"type": "object"}
                        }]
                    }
                }
                self.send_response(response)
                
            else:
                log_main(f"Unknown method: {method}")
                self.send_error(request_id, -32601, f"Method not found: {method}")
                
        except Exception as e:
            log_error(f"Error handling request: {e}")
            log_error(traceback.format_exc())
            self.send_error(request_id, -32603, str(e))
            
    def send_response(self, response):
        """Send response with detailed logging"""
        try:
            response_str = json.dumps(response)
            log_stdio(f"Sending response: {response_str[:200]}...")
            
            # Try multiple write methods
            log_stdio("Method 1: print with flush")
            print(response_str, flush=True)
            
            log_stdio("Method 2: stdout.write with flush")
            sys.stdout.write(response_str + "\\n")
            sys.stdout.flush()
            
            log_stdio("Response sent successfully")
            
        except Exception as e:
            log_error(f"Failed to send response: {e}")
            log_error(traceback.format_exc())
            
    def send_error(self, request_id, code, message):
        """Send error response"""
        response = {
            "jsonrpc": "2.0",
            "id": request_id,
            "error": {"code": code, "message": message}
        }
        self.send_response(response)

# Alternative test if main server fails
def simple_echo_test():
    """Simple echo test to verify basic I/O"""
    log_main("Running simple echo test")
    
    try:
        log_stdio("Echo test: waiting for input...")
        line = sys.stdin.readline()
        
        if line:
            log_stdio(f"Echo test received: {repr(line)}")
            response = {"echo": line.strip()}
            print(json.dumps(response), flush=True)
            log_stdio("Echo test response sent")
        else:
            log_stdio("Echo test: no input received")
            
    except Exception as e:
        log_error(f"Echo test failed: {e}")
        log_error(traceback.format_exc())

# Main entry point
if __name__ == "__main__":
    log_main("Script started as __main__")
    
    try:
        # First, run a simple test
        log_main("Running initial I/O test...")
        
        # Test if we can read anything at all
        import select
        if hasattr(select, 'select'):
            log_stdio("Using select to check stdin readability")
            try:
                readable, _, _ = select.select([sys.stdin], [], [], 0.1)
                if readable:
                    log_stdio("stdin is readable according to select")
                else:
                    log_stdio("stdin is NOT readable according to select (timeout)")
            except Exception as e:
                log_stdio(f"select() failed: {e}")
        
        # Start the server
        server = PinpointDebugServer()
        server.run()
        
    except Exception as e:
        log_error(f"Failed to start server: {type(e).__name__}: {e}")
        log_error(traceback.format_exc())
        
        # Try simple echo test as fallback
        log_main("Trying simple echo test as fallback...")
        simple_echo_test()
        
    log_main("Script ending")
    log_main("=" * 80)
'''
    
    (server_dir / "pinpoint_debug_server.py").write_text(server_code)
    
    # Create a startup wrapper that logs even earlier
    wrapper_code = '''#!/usr/bin/env python3
"""Wrapper to catch very early failures"""

import sys
import os
import datetime
import subprocess

# Log file for wrapper
wrapper_log = os.path.join(os.path.expanduser("~"), "pinpoint-wrapper.log")

def log(msg):
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
    with open(wrapper_log, 'a') as f:
        f.write(f"[{timestamp}] {msg}\\n")

log("=" * 80)
log("WRAPPER STARTING")
log(f"Python: {sys.version}")
log(f"Args: {sys.argv}")
log(f"CWD: {os.getcwd()}")

try:
    # Import and run the actual server
    log("Importing pinpoint_debug_server...")
    import pinpoint_debug_server
    log("Import successful")
except Exception as e:
    log(f"Import failed: {e}")
    import traceback
    log(traceback.format_exc())
    sys.exit(1)

log("Wrapper ending, server should be running")
'''
    
    (server_dir / "wrapper.py").write_text(wrapper_code)
    
    # Install PyYAML
    lib_dir = build_dir / "lib"
    print("Installing PyYAML...")
    subprocess.run([
        sys.executable, "-m", "pip", "install",
        "pyyaml",
        "--target", str(lib_dir),
        "--quiet"
    ], check=True)
    
    # Create manifest
    manifest = {
        "dxt_version": "0.1",
        "name": "like-i-said-v2-pinpoint-debug",
        "version": "1.0.0-debug",
        "description": "Pinpoint Debug - Find exact disconnection cause",
        "author": {
            "name": "endlessblink"
        },
        "server": {
            "type": "python",
            "entry_point": "server/pinpoint_debug_server.py",
            "mcp_config": {
                "command": "python",
                "args": ["${__dirname}/server/pinpoint_debug_server.py"],
                "env": {
                    "PYTHONUNBUFFERED": "1",
                    "PYTHONIOENCODING": "utf-8",
                    "PYTHONDONTWRITEBYTECODE": "1"
                }
            }
        },
        "tools": [
            {
                "name": "debug_test",
                "description": "Debug test tool"
            }
        ]
    }
    
    with open(build_dir / "manifest.json", 'w') as f:
        json.dump(manifest, f, indent=2)
    
    # Create README with instructions
    readme = '''# Pinpoint Debug DXT

This DXT is designed to find the EXACT cause of disconnection.

## Log Files Created

After running, check these files in your home directory:

1. **pinpoint-wrapper.log** - Very early startup
2. **pinpoint-main.log** - Main execution flow  
3. **pinpoint-stdio.log** - All stdio operations
4. **pinpoint-errors.log** - All errors

## What to Look For

1. Check if wrapper.log is created at all
2. Look for "MARKER: Before readline()" and "MARKER: After readline()"
3. Check the last line in each log file
4. Look for any IOError or broken pipe errors

## How to Test

1. Install this DXT
2. Try to use it in Claude Desktop
3. Immediately check the log files
4. The exact disconnection point will be clear from the logs

The logs will show:
- If Python starts at all
- If imports work
- If stdio is properly connected
- Exactly where readline() blocks or fails
- Any errors that occur
'''
    
    (build_dir / "README.md").write_text(readme)
    
    # Create the DXT
    dxt_filename = "like-i-said-v2-pinpoint-debug.dxt"
    
    with zipfile.ZipFile(dxt_filename, 'w', zipfile.ZIP_DEFLATED) as dxt:
        for file in build_dir.rglob('*'):
            if file.is_file():
                arcname = file.relative_to(build_dir)
                dxt.write(file, arcname)
                
    size_mb = Path(dxt_filename).stat().st_size / (1024 * 1024)
    
    shutil.rmtree(build_dir)
    
    print(f"✅ Created {dxt_filename}")
    print(f"📁 Size: {size_mb:.2f} MB")
    print(f"\n🔍 This debug DXT will create 4 log files:")
    print("   - ~/pinpoint-wrapper.log (very early startup)")
    print("   - ~/pinpoint-main.log (main execution)")
    print("   - ~/pinpoint-stdio.log (stdio operations)")
    print("   - ~/pinpoint-errors.log (all errors)")
    print("\n📋 The logs will show EXACTLY where the disconnection happens!")

if __name__ == "__main__":
    create_pinpoint_debug_dxt()