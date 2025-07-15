#!/usr/bin/env python3
"""
Build a DXT with embedded Python and simple stdio handling
This should work with ANY MCP client
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
    """Download Python embeddable distribution"""
    python_version = "3.11.9"
    python_url = f"https://www.python.org/ftp/python/{python_version}/python-{python_version}-embed-amd64.zip"
    
    print(f"Downloading Python {python_version} embeddable...")
    
    with tempfile.NamedTemporaryFile(delete=False, suffix='.zip') as tmp_file:
        urllib.request.urlretrieve(python_url, tmp_file.name)
        return tmp_file.name

def create_embedded_stdio_dxt():
    """Create DXT with embedded Python and simple stdio handling"""
    
    build_dir = Path("dxt-embedded-stdio-build")
    if build_dir.exists():
        shutil.rmtree(build_dir)
    build_dir.mkdir()
    
    print("Creating embedded Python stdio-based DXT...")
    
    # Download and extract Python embeddable
    python_dir = build_dir / "python"
    python_zip = download_python_embeddable()
    with zipfile.ZipFile(python_zip, 'r') as zip_ref:
        zip_ref.extractall(python_dir)
    os.unlink(python_zip)
    
    # Fix the python._pth file
    pth_file = python_dir / "python311._pth"
    if pth_file.exists():
        pth_content = """python311.zip
.
..\\server
# Uncomment to run site.main() automatically
import site
"""
        pth_file.write_text(pth_content)
    
    # Create server directory
    server_dir = build_dir / "server"
    server_dir.mkdir()
    
    # Install minimal required packages
    print("Installing PyYAML...")
    # Download PyYAML wheel directly
    yaml_url = "https://files.pythonhosted.org/packages/54/ed/79a089b6be93607fa5cdaedf301d7dfb23af5f25c398d5ead2525b063e17/PyYAML-6.0.1-cp311-cp311-win_amd64.whl"
    yaml_wheel = Path("pyyaml.whl")
    urllib.request.urlretrieve(yaml_url, yaml_wheel)
    
    # Extract PyYAML to server directory
    with zipfile.ZipFile(yaml_wheel, 'r') as zip_ref:
        zip_ref.extractall(server_dir)
    yaml_wheel.unlink()
    
    # Create the simple MCP server
    server_code = '''#!/usr/bin/env python3
"""
Like-I-Said v2 - Simple MCP Server with embedded Python
Works with ANY MCP client by implementing the protocol correctly
"""

import json
import sys
import os
import uuid
from pathlib import Path
from datetime import datetime

# Try to import yaml, fallback to JSON if not available
try:
    import yaml
    HAS_YAML = True
except ImportError:
    HAS_YAML = False

class SimpleMCPServer:
    def __init__(self):
        self.memories_dir = Path("memories")
        self.memories_dir.mkdir(exist_ok=True)
        self.tasks_dir = Path("tasks")
        self.tasks_dir.mkdir(exist_ok=True)
        
    def log(self, message):
        """Log to stderr for debugging"""
        print(f"[DEBUG] {message}", file=sys.stderr, flush=True)
        
    def run(self):
        """Main server loop"""
        self.log("Like-I-Said MCP Server starting...")
        
        while True:
            try:
                # Read line from stdin
                line = sys.stdin.readline()
                if not line:
                    break
                    
                line = line.strip()
                if not line:
                    continue
                
                # Parse JSON-RPC request
                try:
                    message = json.loads(line)
                except json.JSONDecodeError as e:
                    self.send_error(None, -32700, f"Parse error: {e}")
                    continue
                
                # Handle the message
                self.handle_message(message)
                
            except KeyboardInterrupt:
                self.log("Server interrupted")
                break
            except Exception as e:
                self.log(f"Server error: {e}")
                
    def handle_message(self, message):
        """Handle JSON-RPC message"""
        request_id = message.get("id")
        method = message.get("method", "")
        params = message.get("params", {})
        
        self.log(f"Method: {method}")
        
        # Route to handlers
        if method == "initialize":
            self.handle_initialize(request_id, params)
        elif method == "initialized":
            # Notification, no response
            self.log("Initialized notification received")
        elif method == "tools/list":
            self.handle_tools_list(request_id)
        elif method == "tools/call":
            self.handle_tools_call(request_id, params)
        else:
            self.send_error(request_id, -32601, f"Method not found: {method}")
            
    def handle_initialize(self, request_id, params):
        """Handle initialize request"""
        response = {
            "protocolVersion": "2024-11-05",
            "capabilities": {
                "tools": {}
            },
            "serverInfo": {
                "name": "like-i-said-v2",
                "version": "2.0.0"
            }
        }
        self.send_result(request_id, response)
        
    def handle_tools_list(self, request_id):
        """List available tools"""
        tools = [
            {
                "name": "test_tool",
                "description": "Test MCP connection",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "message": {
                            "type": "string",
                            "description": "Test message",
                            "default": "Hello!"
                        }
                    }
                }
            },
            {
                "name": "add_memory",
                "description": "Store a memory",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "content": {
                            "type": "string",
                            "description": "Memory content"
                        },
                        "category": {
                            "type": "string",
                            "description": "Category",
                            "default": "general"
                        }
                    },
                    "required": ["content"]
                }
            },
            {
                "name": "list_memories",
                "description": "List stored memories",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "limit": {
                            "type": "integer",
                            "description": "Maximum memories to return",
                            "default": 10
                        }
                    }
                }
            }
        ]
        
        self.send_result(request_id, {"tools": tools})
        
    def handle_tools_call(self, request_id, params):
        """Handle tool execution"""
        tool_name = params.get("name")
        arguments = params.get("arguments", {})
        
        self.log(f"Tool call: {tool_name}")
        
        try:
            if tool_name == "test_tool":
                result = self.tool_test(arguments)
            elif tool_name == "add_memory":
                result = self.tool_add_memory(arguments)
            elif tool_name == "list_memories":
                result = self.tool_list_memories(arguments)
            else:
                self.send_error(request_id, -32602, f"Unknown tool: {tool_name}")
                return
                
            self.send_result(request_id, result)
        except Exception as e:
            self.send_error(request_id, -32603, f"Tool error: {e}")
            
    def tool_test(self, args):
        """Test tool"""
        message = args.get("message", "Hello!")
        return {
            "content": [
                {
                    "type": "text",
                    "text": f"✅ Connection working! Echo: {message}"
                }
            ]
        }
        
    def tool_add_memory(self, args):
        """Add memory tool"""
        content = args.get("content", "")
        if not content:
            return {
                "content": [
                    {
                        "type": "text",
                        "text": "❌ Content is required"
                    }
                ]
            }
            
        memory_id = str(uuid.uuid4())
        timestamp = datetime.now().isoformat()
        category = args.get("category", "general")
        
        # Create simple memory file
        memory_file = self.memories_dir / f"{memory_id}.md"
        memory_content = f"""---
id: {memory_id}
timestamp: {timestamp}
category: {category}
---

{content}
"""
        memory_file.write_text(memory_content, encoding="utf-8")
        
        return {
            "content": [
                {
                    "type": "text",
                    "text": f"✅ Memory saved: {memory_id}"
                }
            ]
        }
        
    def tool_list_memories(self, args):
        """List memories tool"""
        limit = min(args.get("limit", 10), 50)
        
        memories = []
        for memory_file in sorted(self.memories_dir.glob("*.md"), reverse=True)[:limit]:
            try:
                content = memory_file.read_text(encoding="utf-8")
                # Extract ID from content
                lines = content.split('\\n')
                memory_id = "unknown"
                for line in lines:
                    if line.startswith("id:"):
                        memory_id = line.split(":", 1)[1].strip()
                        break
                memories.append(f"🆔 {memory_id[:8]}...")
            except:
                pass
                
        text = f"📚 Found {len(memories)} memories:\\n" + "\\n".join(memories)
        
        return {
            "content": [
                {
                    "type": "text",
                    "text": text
                }
            ]
        }
        
    def send_result(self, request_id, result):
        """Send successful result"""
        response = {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": result
        }
        self.send_response(response)
        
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
        
    def send_response(self, response):
        """Send response to stdout"""
        response_str = json.dumps(response)
        print(response_str, flush=True)
        self.log(f"Sent: {response_str[:100]}...")

if __name__ == "__main__":
    server = SimpleMCPServer()
    server.run()
'''
    
    (server_dir / "standalone_mcp_server.py").write_text(server_code)
    
    # Create Windows launcher
    launcher_bat = f'''@echo off
cd /d "%~dp0"
"%~dp0python\\python.exe" "%~dp0server\\standalone_mcp_server.py" %*
'''
    (build_dir / "run_server.bat").write_text(launcher_bat)
    
    # Create manifest.json
    manifest = {
        "dxt_version": "0.1",
        "name": "like-i-said-v2",
        "version": "2.0.0",
        "description": "Like-I-Said Memory v2 - MCP Server with embedded Python",
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
                "description": "Test MCP connection"
            },
            {
                "name": "add_memory", 
                "description": "Store a memory"
            },
            {
                "name": "list_memories",
                "description": "List stored memories"
            }
        ]
    }
    
    with open(build_dir / "manifest.json", 'w') as f:
        json.dump(manifest, f, indent=2)
    
    # Create the DXT
    dxt_filename = "like-i-said-v2-embedded-stdio.dxt"
    
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
    print("   - Embedded Python 3.11.9")
    print("   - Simple stdio handling")
    print("   - Works with ANY MCP client")
    print("   - Minimal dependencies")
    print("   - Windows batch launcher")

if __name__ == "__main__":
    create_embedded_stdio_dxt()