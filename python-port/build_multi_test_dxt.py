#!/usr/bin/env python3
"""
Build a multi-test DXT that tries different approaches in one go
This will help us quickly identify which approach works
"""

import json
import shutil
import zipfile
import sys
import subprocess
from pathlib import Path

def create_multi_test_dxt():
    """Create a DXT that tests multiple approaches simultaneously"""
    
    build_dir = Path("dxt-multi-test")
    if build_dir.exists():
        shutil.rmtree(build_dir)
    build_dir.mkdir()
    
    print("Creating multi-test DXT for faster iteration...")
    
    # Create server directory
    server_dir = build_dir / "server"
    server_dir.mkdir()
    
    # Create a server that tests multiple approaches
    server_code = '''#!/usr/bin/env python3
"""
Multi-Test Server - Tests multiple approaches to find what works
Results are logged to ~/multi-test-results.json for easy analysis
"""

import json
import sys
import os
import time
import io
import threading
import queue
from datetime import datetime

# Results file
results_file = os.path.join(os.path.expanduser("~"), "multi-test-results.json")
results = {
    "start_time": datetime.now().isoformat(),
    "python_version": sys.version,
    "platform": sys.platform,
    "tests": {}
}

def save_result(test_name, success, details):
    """Save test result"""
    results["tests"][test_name] = {
        "success": success,
        "details": details,
        "timestamp": datetime.now().isoformat()
    }
    try:
        with open(results_file, 'w') as f:
            json.dump(results, f, indent=2)
    except:
        pass

# Test 1: Basic stdio
def test_basic_stdio():
    """Test basic stdio operations"""
    try:
        # Test write
        sys.stdout.write("test")
        sys.stdout.flush()
        
        # Test print
        print("test", flush=True)
        
        save_result("basic_stdio", True, "Can write to stdout")
        return True
    except Exception as e:
        save_result("basic_stdio", False, str(e))
        return False

# Test 2: JSON communication
def test_json_communication():
    """Test JSON reading and writing"""
    try:
        # Test writing JSON
        test_obj = {"test": "message"}
        json_str = json.dumps(test_obj)
        print(json_str, flush=True)
        
        save_result("json_write", True, "Can write JSON")
        return True
    except Exception as e:
        save_result("json_write", False, str(e))
        return False

# Test 3: Different readline approaches
def test_readline_approaches():
    """Test different ways to read from stdin"""
    approaches = []
    
    # Approach 1: Direct readline
    try:
        # Set timeout using threading
        result_queue = queue.Queue()
        
        def readline_with_timeout():
            try:
                line = sys.stdin.readline()
                result_queue.put(("success", line))
            except Exception as e:
                result_queue.put(("error", str(e)))
        
        thread = threading.Thread(target=readline_with_timeout)
        thread.daemon = True
        thread.start()
        
        try:
            result = result_queue.get(timeout=0.5)
            if result[0] == "success":
                approaches.append("direct_readline: Works")
            else:
                approaches.append(f"direct_readline: Failed - {result[1]}")
        except queue.Empty:
            approaches.append("direct_readline: Timeout (blocked)")
            
    except Exception as e:
        approaches.append(f"direct_readline: Error - {e}")
    
    # Approach 2: Buffer check
    try:
        if hasattr(sys.stdin, 'buffer'):
            approaches.append("stdin.buffer: Available")
        else:
            approaches.append("stdin.buffer: Not available")
    except Exception as e:
        approaches.append(f"buffer_check: Error - {e}")
    
    # Approach 3: File descriptor
    try:
        fd = sys.stdin.fileno()
        approaches.append(f"stdin.fileno: {fd}")
        
        # Try os.read with timeout
        import select
        if hasattr(select, 'select'):
            readable, _, _ = select.select([sys.stdin], [], [], 0.1)
            if readable:
                approaches.append("select: stdin is readable")
            else:
                approaches.append("select: stdin not readable (timeout)")
    except Exception as e:
        approaches.append(f"fileno/select: Error - {e}")
    
    save_result("readline_approaches", True, approaches)
    return approaches

# Test 4: Different server architectures
class TestServer1:
    """Simple synchronous server"""
    def run(self):
        try:
            # Send a simple response to test
            response = {
                "jsonrpc": "2.0",
                "id": 1,
                "result": {"status": "TestServer1 working"}
            }
            print(json.dumps(response), flush=True)
            save_result("server_arch_1", True, "Simple server works")
            return True
        except Exception as e:
            save_result("server_arch_1", False, str(e))
            return False

class TestServer2:
    """Server with error handling"""
    def run(self):
        try:
            # Try to read with timeout
            start_time = time.time()
            
            # Non-blocking read attempt
            import fcntl
            if hasattr(fcntl, 'fcntl'):
                # Unix-style non-blocking
                fd = sys.stdin.fileno()
                fl = fcntl.fcntl(fd, fcntl.F_GETFL)
                fcntl.fcntl(fd, fcntl.F_SETFL, fl | os.O_NONBLOCK)
                
                try:
                    line = sys.stdin.readline()
                    if line:
                        save_result("server_arch_2", True, f"Non-blocking read: {repr(line)}")
                    else:
                        save_result("server_arch_2", True, "Non-blocking read: No data")
                except IOError:
                    save_result("server_arch_2", True, "Non-blocking read: Would block")
                    
                # Restore blocking mode
                fcntl.fcntl(fd, fcntl.F_SETFL, fl)
            else:
                save_result("server_arch_2", False, "fcntl not available (Windows)")
                
        except Exception as e:
            save_result("server_arch_2", False, str(e))

# Test 5: Environment and configuration
def test_environment():
    """Test environment settings"""
    env_info = {
        "encoding": {
            "stdin": getattr(sys.stdin, 'encoding', 'unknown'),
            "stdout": getattr(sys.stdout, 'encoding', 'unknown'),
            "stderr": getattr(sys.stderr, 'encoding', 'unknown')
        },
        "buffering": {
            "PYTHONUNBUFFERED": os.environ.get('PYTHONUNBUFFERED', 'not set'),
            "stdout_line_buffering": getattr(sys.stdout, 'line_buffering', 'unknown')
        },
        "isatty": {
            "stdin": sys.stdin.isatty() if hasattr(sys.stdin, 'isatty') else 'unknown',
            "stdout": sys.stdout.isatty() if hasattr(sys.stdout, 'isatty') else 'unknown'
        }
    }
    save_result("environment", True, env_info)
    return env_info

# Main execution
def main():
    """Run all tests"""
    print(f"Starting multi-test server...", file=sys.stderr)
    
    # Save initial state
    results["start_state"] = {
        "cwd": os.getcwd(),
        "args": sys.argv,
        "stdin": str(sys.stdin),
        "stdout": str(sys.stdout)
    }
    
    # Run all tests
    print("Running test 1: Basic stdio", file=sys.stderr)
    test_basic_stdio()
    
    print("Running test 2: JSON communication", file=sys.stderr)
    test_json_communication()
    
    print("Running test 3: Readline approaches", file=sys.stderr)
    test_readline_approaches()
    
    print("Running test 4: Server architectures", file=sys.stderr)
    server1 = TestServer1()
    server1.run()
    
    server2 = TestServer2()
    server2.run()
    
    print("Running test 5: Environment", file=sys.stderr)
    test_environment()
    
    # Final summary
    results["end_time"] = datetime.now().isoformat()
    results["summary"] = {
        "total_tests": len(results["tests"]),
        "successful": sum(1 for t in results["tests"].values() if t["success"]),
        "failed": sum(1 for t in results["tests"].values() if not t["success"])
    }
    
    # Save final results
    with open(results_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\\nAll tests completed. Results saved to: {results_file}", file=sys.stderr)
    
    # Try to act as a basic server if possible
    print("\\nAttempting to run as basic MCP server...", file=sys.stderr)
    
    try:
        # Send initialize response to test
        init_response = {
            "jsonrpc": "2.0",
            "id": 1,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {"tools": {}},
                "serverInfo": {
                    "name": "multi-test",
                    "version": "1.0.0"
                }
            }
        }
        print(json.dumps(init_response), flush=True)
        
        # Try to read one message
        print("Waiting for input (2 second timeout)...", file=sys.stderr)
        
        # Use threading for timeout
        input_queue = queue.Queue()
        
        def read_input():
            try:
                line = sys.stdin.readline()
                input_queue.put(line)
            except Exception as e:
                input_queue.put(None)
        
        thread = threading.Thread(target=read_input)
        thread.daemon = True
        thread.start()
        
        try:
            line = input_queue.get(timeout=2.0)
            if line:
                print(f"Received: {repr(line)}", file=sys.stderr)
                save_result("mcp_server_mode", True, f"Received: {line[:50]}")
            else:
                print("No input received", file=sys.stderr)
                save_result("mcp_server_mode", False, "No input received")
        except queue.Empty:
            print("Read timeout - stdin might be blocking", file=sys.stderr)
            save_result("mcp_server_mode", False, "Read timeout")
            
    except Exception as e:
        print(f"MCP server mode failed: {e}", file=sys.stderr)
        save_result("mcp_server_mode", False, str(e))
    
    print("\\nMulti-test complete!", file=sys.stderr)

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        # Save crash info
        results["crash"] = {
            "error": str(e),
            "type": type(e).__name__
        }
        with open(results_file, 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"FATAL ERROR: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
'''
    
    (server_dir / "multi_test_server.py").write_text(server_code)
    
    # Create manifest
    manifest = {
        "dxt_version": "0.1",
        "name": "like-i-said-v2-multi-test",
        "version": "1.0.0-test",
        "description": "Multi-test DXT - Tests multiple approaches at once",
        "author": {
            "name": "endlessblink"
        },
        "server": {
            "type": "python",
            "entry_point": "server/multi_test_server.py",
            "mcp_config": {
                "command": "python",
                "args": ["${__dirname}/server/multi_test_server.py"],
                "env": {
                    "PYTHONUNBUFFERED": "1",
                    "PYTHONIOENCODING": "utf-8"
                }
            }
        },
        "tools": [
            {
                "name": "test_results",
                "description": "View test results"
            }
        ]
    }
    
    with open(build_dir / "manifest.json", 'w') as f:
        json.dump(manifest, f, indent=2)
    
    # Create the DXT
    dxt_filename = "like-i-said-v2-multi-test.dxt"
    
    with zipfile.ZipFile(dxt_filename, 'w', zipfile.ZIP_DEFLATED) as dxt:
        for file in build_dir.rglob('*'):
            if file.is_file():
                arcname = file.relative_to(build_dir)
                dxt.write(file, arcname)
                
    size_mb = Path(dxt_filename).stat().st_size / (1024 * 1024)
    
    shutil.rmtree(build_dir)
    
    print(f"✅ Created {dxt_filename}")
    print(f"📁 Size: {size_mb:.2f} MB")
    print(f"\n🚀 This DXT will:")
    print("   - Test multiple approaches in one run")
    print("   - Save results to ~/multi-test-results.json")
    print("   - Show which methods work and which fail")
    print("   - Complete all tests in seconds")
    print("\n📋 Just install and check the results file!")

if __name__ == "__main__":
    create_multi_test_dxt()