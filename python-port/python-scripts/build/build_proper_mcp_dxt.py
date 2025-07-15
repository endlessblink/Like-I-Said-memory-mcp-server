#!/usr/bin/env python3
"""
Build a proper MCP DXT following the debugging guide
Key insights:
1. Logs should go to stderr, not stdout
2. Handle undefined working directories
3. Use proper manifest structure
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

def create_proper_mcp_dxt():
    """Create a proper MCP DXT following best practices"""
    
    build_dir = Path("dxt-proper-mcp-build")
    if build_dir.exists():
        shutil.rmtree(build_dir)
    build_dir.mkdir()
    
    print("Creating proper MCP DXT...")
    
    # Download and extract Python embeddable
    python_dir = build_dir / "python"
    python_zip = download_python_embeddable()
    with zipfile.ZipFile(python_zip, 'r') as zip_ref:
        zip_ref.extractall(python_dir)
    os.unlink(python_zip)
    
    # Fix the python._pth file to include our server directory
    pth_file = python_dir / "python311._pth"
    if pth_file.exists():
        pth_content = """python311.zip
.
..\\server
..\\lib
# Uncomment to run site.main() automatically
import site
"""
        pth_file.write_text(pth_content)
    
    # Create server directory
    server_dir = build_dir / "server"
    server_dir.mkdir()
    
    # Create lib directory and install minimal dependencies
    lib_dir = build_dir / "lib"
    lib_dir.mkdir()
    
    # Install PyYAML
    print("Installing PyYAML...")
    import subprocess
    subprocess.run([
        sys.executable, "-m", "pip", "install",
        "pyyaml",
        "--target", str(lib_dir),
        "--no-deps",
        "--quiet"
    ], check=True)
    
    # Create the MCP server following best practices
    server_code = '''#!/usr/bin/env python3
"""
Like-I-Said v2 - Proper MCP Server Implementation
Following MCP debugging guide best practices
"""

import json
import sys
import os
import uuid
from pathlib import Path
from datetime import datetime

# Ensure we can import from lib directory
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'lib'))

try:
    import yaml
    HAS_YAML = True
except ImportError:
    HAS_YAML = False
    sys.stderr.write("[WARN] PyYAML not available, using JSON storage\\n")
    sys.stderr.flush()

class ProperMCPServer:
    def __init__(self):
        # Handle undefined working directory
        try:
            self.base_dir = Path.cwd()
        except:
            # Fallback to home directory if cwd is undefined
            self.base_dir = Path.home() / ".like-i-said"
            
        self.memories_dir = self.base_dir / "memories"
        self.memories_dir.mkdir(parents=True, exist_ok=True)
        
        # Log to stderr as per MCP best practices
        self.log("Like-I-Said MCP Server v2 starting...")
        self.log(f"Base directory: {self.base_dir}")
        
    def log(self, message):
        """Log to stderr - this is captured by the host application"""
        sys.stderr.write(f"[Like-I-Said] {message}\\n")
        sys.stderr.flush()
        
    def run(self):
        """Main server loop - read from stdin, write to stdout"""
        self.log("Server ready, waiting for messages...")
        
        while True:
            try:
                # Read line from stdin
                line = sys.stdin.readline()
                if not line:
                    self.log("EOF received, shutting down")
                    break
                    
                line = line.strip()
                if not line:
                    continue
                
                # Parse JSON-RPC request
                try:
                    message = json.loads(line)
                    self.log(f"Received method: {message.get('method', 'unknown')}")
                except json.JSONDecodeError as e:
                    self.send_error(None, -32700, f"Parse error: {e}")
                    continue
                
                # Handle the message
                self.handle_message(message)
                
            except KeyboardInterrupt:
                self.log("Server interrupted by user")
                break
            except Exception as e:
                self.log(f"Server error: {e}")
                import traceback
                traceback.print_exc(file=sys.stderr)
                
    def handle_message(self, message):
        """Handle JSON-RPC 2.0 message"""
        request_id = message.get("id")
        method = message.get("method", "")
        params = message.get("params", {})
        
        # Route to appropriate handler
        handlers = {
            "initialize": self.handle_initialize,
            "initialized": self.handle_initialized,
            "tools/list": self.handle_tools_list,
            "tools/call": self.handle_tools_call,
        }
        
        handler = handlers.get(method)
        if handler:
            if method == "initialized":
                # This is a notification, no response needed
                handler()
            else:
                handler(request_id, params)
        else:
            self.send_error(request_id, -32601, f"Method not found: {method}")
            
    def handle_initialize(self, request_id, params):
        """Handle initialize request"""
        self.log("Handling initialize request")
        
        response = {
            "protocolVersion": "2024-11-05",
            "capabilities": {
                "tools": {},
                "logging": {}
            },
            "serverInfo": {
                "name": "like-i-said-v2",
                "version": "2.0.0"
            }
        }
        
        self.send_result(request_id, response)
        
    def handle_initialized(self):
        """Handle initialized notification"""
        self.log("Server initialized successfully")
        
    def handle_tools_list(self, request_id, params):
        """Return list of available tools"""
        self.log("Listing available tools")
        
        tools = [
            {
                "name": "test_tool",
                "description": "Test MCP connection",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "message": {
                            "type": "string",
                            "description": "Test message to echo",
                            "default": "Hello from Like-I-Said!"
                        }
                    }
                }
            },
            {
                "name": "add_memory",
                "description": "Store information in memory",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "content": {
                            "type": "string",
                            "description": "Content to remember"
                        },
                        "category": {
                            "type": "string",
                            "description": "Memory category",
                            "default": "general",
                            "enum": ["general", "work", "personal", "code", "research"]
                        },
                        "tags": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Tags for organization",
                            "default": []
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
                            "description": "Maximum number of memories to return",
                            "default": 10,
                            "minimum": 1,
                            "maximum": 100
                        },
                        "category": {
                            "type": "string",
                            "description": "Filter by category"
                        }
                    }
                }
            },
            {
                "name": "search_memories",
                "description": "Search memories by content",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "Search query"
                        }
                    },
                    "required": ["query"]
                }
            }
        ]
        
        self.send_result(request_id, {"tools": tools})
        
    def handle_tools_call(self, request_id, params):
        """Handle tool execution"""
        tool_name = params.get("name")
        arguments = params.get("arguments", {})
        
        self.log(f"Executing tool: {tool_name}")
        
        try:
            # Route to tool implementation
            tools = {
                "test_tool": self.tool_test,
                "add_memory": self.tool_add_memory,
                "list_memories": self.tool_list_memories,
                "search_memories": self.tool_search_memories,
            }
            
            tool_func = tools.get(tool_name)
            if not tool_func:
                self.send_error(request_id, -32602, f"Unknown tool: {tool_name}")
                return
                
            result = tool_func(arguments)
            self.send_result(request_id, result)
            
        except Exception as e:
            self.log(f"Tool execution error: {e}")
            self.send_error(request_id, -32603, f"Tool execution failed: {str(e)}")
            
    def tool_test(self, args):
        """Test tool implementation"""
        message = args.get("message", "Hello from Like-I-Said!")
        self.log(f"Test tool called with: {message}")
        
        return {
            "content": [
                {
                    "type": "text",
                    "text": f"✅ MCP Connection Successful!\\n\\nEcho: {message}\\n\\nServer: Like-I-Said v2\\nStatus: Operational"
                }
            ]
        }
        
    def tool_add_memory(self, args):
        """Add memory implementation"""
        content = args.get("content", "")
        if not content:
            return {
                "content": [
                    {
                        "type": "text",
                        "text": "❌ Error: Content is required"
                    }
                ]
            }
            
        memory_id = str(uuid.uuid4())
        timestamp = datetime.now().isoformat()
        category = args.get("category", "general")
        tags = args.get("tags", [])
        
        # Create memory data
        memory_data = {
            "id": memory_id,
            "timestamp": timestamp,
            "category": category,
            "tags": tags,
            "content": content
        }
        
        # Save to file
        filename = f"{timestamp[:10]}-{memory_id[:8]}.md"
        filepath = self.memories_dir / filename
        
        if HAS_YAML:
            # Save with YAML frontmatter
            frontmatter = {k: v for k, v in memory_data.items() if k != "content"}
            yaml_str = yaml.dump(frontmatter, default_flow_style=False)
            file_content = f"---\\n{yaml_str}---\\n\\n{content}"
        else:
            # Save as JSON + content
            json_str = json.dumps({k: v for k, v in memory_data.items() if k != "content"}, indent=2)
            file_content = f"<!-- {json_str} -->\\n\\n{content}"
            
        filepath.write_text(file_content, encoding="utf-8")
        self.log(f"Saved memory: {memory_id}")
        
        return {
            "content": [
                {
                    "type": "text",
                    "text": f"✅ Memory saved successfully\\n\\nID: {memory_id}\\nCategory: {category}\\nTags: {', '.join(tags) if tags else 'none'}"
                }
            ]
        }
        
    def tool_list_memories(self, args):
        """List memories implementation"""
        limit = min(args.get("limit", 10), 100)
        category_filter = args.get("category")
        
        memories = []
        for memory_file in sorted(self.memories_dir.glob("*.md"), reverse=True):
            if len(memories) >= limit:
                break
                
            try:
                content = memory_file.read_text(encoding="utf-8")
                
                # Parse memory data
                if content.startswith("---"):
                    # YAML frontmatter
                    parts = content.split("---", 2)
                    if len(parts) >= 3 and HAS_YAML:
                        metadata = yaml.safe_load(parts[1])
                        body = parts[2].strip()
                    else:
                        continue
                elif content.startswith("<!--"):
                    # JSON metadata
                    end_idx = content.find("-->")
                    if end_idx > 0:
                        json_str = content[4:end_idx].strip()
                        metadata = json.loads(json_str)
                        body = content[end_idx+3:].strip()
                    else:
                        continue
                else:
                    continue
                    
                # Apply category filter
                if category_filter and metadata.get("category") != category_filter:
                    continue
                    
                memories.append({
                    "id": metadata.get("id", "unknown"),
                    "timestamp": metadata.get("timestamp", ""),
                    "category": metadata.get("category", "general"),
                    "preview": body[:100] + "..." if len(body) > 100 else body
                })
                
            except Exception as e:
                self.log(f"Error reading memory file {memory_file}: {e}")
                
        # Format response
        if not memories:
            text = "📚 No memories found"
        else:
            text = f"📚 Found {len(memories)} memories:\\n\\n"
            for mem in memories:
                text += f"🆔 {mem['id'][:8]}...\\n"
                text += f"📅 {mem['timestamp'][:10]}\\n"
                text += f"📁 {mem['category']}\\n"
                text += f"📝 {mem['preview']}\\n\\n"
                
        return {
            "content": [
                {
                    "type": "text",
                    "text": text
                }
            ]
        }
        
    def tool_search_memories(self, args):
        """Search memories implementation"""
        query = args.get("query", "").lower()
        if not query:
            return {
                "content": [
                    {
                        "type": "text",
                        "text": "❌ Error: Search query is required"
                    }
                ]
            }
            
        results = []
        for memory_file in self.memories_dir.glob("*.md"):
            try:
                content = memory_file.read_text(encoding="utf-8").lower()
                if query in content:
                    # Extract just the content part for preview
                    if "---" in content:
                        parts = content.split("---", 2)
                        if len(parts) >= 3:
                            body = parts[2].strip()
                        else:
                            body = content
                    elif "-->" in content:
                        idx = content.find("-->")
                        body = content[idx+3:].strip()
                    else:
                        body = content
                        
                    # Find context around match
                    idx = body.find(query)
                    if idx >= 0:
                        start = max(0, idx - 50)
                        end = min(len(body), idx + len(query) + 50)
                        preview = "..." + body[start:end] + "..."
                    else:
                        preview = body[:100] + "..."
                        
                    results.append({
                        "file": memory_file.name,
                        "preview": preview
                    })
                    
            except Exception as e:
                self.log(f"Error searching {memory_file}: {e}")
                
        # Format response
        if not results:
            text = f"🔍 No memories found matching '{query}'"
        else:
            text = f"🔍 Found {len(results)} memories matching '{query}':\\n\\n"
            for res in results:
                text += f"📄 {res['file']}\\n"
                text += f"📝 {res['preview']}\\n\\n"
                
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
        """Send response to stdout - this is the protocol communication channel"""
        response_str = json.dumps(response)
        print(response_str, flush=True)  # stdout for protocol
        self.log(f"Sent response for id: {response.get('id', 'notification')}")

if __name__ == "__main__":
    server = ProperMCPServer()
    try:
        server.run()
    except Exception as e:
        sys.stderr.write(f"[ERROR] Server crashed: {e}\\n")
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)
'''
    
    (server_dir / "mcp_server.py").write_text(server_code)
    
    # Create Windows launcher that uses embedded Python
    launcher_bat = f'''@echo off
cd /d "%~dp0"
"%~dp0\\python\\python.exe" "%~dp0\\server\\mcp_server.py" %*
'''
    (build_dir / "run_mcp_server.bat").write_text(launcher_bat)
    
    # Create Unix launcher
    launcher_sh = f'''#!/bin/bash
cd "$(dirname "$0")"
exec ./python/python ./server/mcp_server.py "$@"
'''
    (build_dir / "run_mcp_server.sh").write_text(launcher_sh)
    os.chmod(build_dir / "run_mcp_server.sh", 0o755)
    
    # Create manifest.json - try the exact structure from working DXTs
    manifest = {
        "dxt_version": "0.1",
        "name": "like-i-said-v2",
        "version": "2.0.0",
        "description": "Like-I-Said Memory v2 - MCP Server with proper stdio handling",
        "author": {
            "name": "endlessblink"
        },
        "server": {
            "type": "python",
            "entry_point": "server/mcp_server.py",
            "mcp_config": {
                "command": "python",
                "args": ["${__dirname}/server/mcp_server.py"],
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
        "requirements": {
            "python": ">=3.6"
        },
        "tools": [
            {
                "name": "test_tool",
                "description": "Test MCP connection"
            },
            {
                "name": "add_memory", 
                "description": "Store information in memory"
            },
            {
                "name": "list_memories",
                "description": "List stored memories"
            },
            {
                "name": "search_memories",
                "description": "Search memories by content"
            }
        ]
    }
    
    with open(build_dir / "manifest.json", 'w') as f:
        json.dump(manifest, f, indent=2)
    
    # Create README
    readme = '''# Like-I-Said Memory v2 - MCP Server

A proper MCP server implementation following best practices from the MCP debugging guide.

## Features
- Proper stdio handling (logs to stderr, protocol to stdout)
- Handles undefined working directories
- Embedded Python for portability
- Memory management with search capabilities

## Tools
- `test_tool` - Test MCP connection
- `add_memory` - Store information with categories and tags
- `list_memories` - List memories with filtering
- `search_memories` - Full-text search

## Implementation Details
- Follows JSON-RPC 2.0 protocol
- Logs to stderr for debugging
- Handles all MCP lifecycle events
- Robust error handling
'''
    
    (build_dir / "README.md").write_text(readme)
    
    # Create the DXT
    dxt_filename = "like-i-said-v2-proper-mcp.dxt"
    
    with zipfile.ZipFile(dxt_filename, 'w', zipfile.ZIP_DEFLATED) as dxt:
        for file in build_dir.rglob('*'):
            if file.is_file():
                arcname = file.relative_to(build_dir)
                dxt.write(file, arcname)
                
    size_mb = Path(dxt_filename).stat().st_size / (1024 * 1024)
    
    shutil.rmtree(build_dir)
    
    print(f"✅ Created {dxt_filename}")
    print(f"📁 Size: {size_mb:.1f} MB")
    print(f"\n🎯 Following MCP best practices:")
    print("   - Logs to stderr (captured by host)")
    print("   - Protocol messages to stdout")
    print("   - Handles undefined working directory")
    print("   - Proper error handling")
    print("   - Embedded Python for portability")

if __name__ == "__main__":
    create_proper_mcp_dxt()