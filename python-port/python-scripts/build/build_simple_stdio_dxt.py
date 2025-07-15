#!/usr/bin/env python3
"""
Build a simple stdio-based DXT without FastMCP
Based on the working JSON-RPC implementation
"""

import json
import shutil
import zipfile
from pathlib import Path

def create_simple_stdio_dxt():
    """Create DXT with simple stdio handling (no FastMCP)"""
    
    build_dir = Path("dxt-simple-build")
    if build_dir.exists():
        shutil.rmtree(build_dir)
    build_dir.mkdir()
    
    print("Creating simple stdio-based Like-I-Said DXT...")
    
    # Create server directory
    server_dir = build_dir / "server"
    server_dir.mkdir()
    
    # Create the simple server without FastMCP
    server_code = '''#!/usr/bin/env python3
"""
Like-I-Said v2 - Simple stdio-based MCP Server
No FastMCP - direct stdio handling like the working JSON-RPC version
"""

import json
import sys
import os
import uuid
import yaml
import re
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional

class SimpleMemoryServer:
    def __init__(self):
        self.memories_dir = Path("memories")
        self.memories_dir.mkdir(exist_ok=True)
        self.tasks_dir = Path("tasks")
        self.tasks_dir.mkdir(exist_ok=True)
        self.initialized = False
        
    def log_debug(self, message):
        """Debug logging to stderr"""
        print(f"[Like-I-Said] {message}", file=sys.stderr)
        sys.stderr.flush()
        
    def handle_message(self, message):
        """Handle incoming JSON-RPC message"""
        if not isinstance(message, dict):
            return self.error_response(None, -32700, "Parse error")
            
        request_id = message.get("id")
        method = message.get("method", "")
        params = message.get("params", {})
        
        self.log_debug(f"Handling method: {method}")
        
        # Route to appropriate handler
        if method == "initialize":
            return self.handle_initialize(request_id, params)
        elif method == "initialized":
            self.initialized = True
            return None  # No response for notifications
        elif method == "tools/list":
            return self.handle_tools_list(request_id)
        elif method == "tools/call":
            return self.handle_tool_call(request_id, params)
        else:
            return self.error_response(request_id, -32601, f"Method not found: {method}")
            
    def handle_initialize(self, request_id, params):
        """Handle initialize request"""
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "tools": {}
                },
                "serverInfo": {
                    "name": "like-i-said-v2",
                    "version": "2.0.0"
                }
            }
        }
        
    def handle_tools_list(self, request_id):
        """Return list of available tools"""
        tools = [
            {
                "name": "test_tool",
                "description": "Simple test tool to verify MCP connection",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "message": {"type": "string", "default": "Hello from Like-I-Said!"}
                    }
                }
            },
            {
                "name": "add_memory",
                "description": "Store information with auto-categorization",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "content": {"type": "string"},
                        "category": {"type": "string", "default": "general"},
                        "project": {"type": "string", "default": "default"},
                        "tags": {"type": "array", "items": {"type": "string"}, "default": []},
                        "priority": {"type": "string", "default": "medium"}
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
                        "project": {"type": "string"},
                        "limit": {"type": "integer", "default": 50}
                    }
                }
            },
            {
                "name": "get_memory",
                "description": "Get specific memory by ID",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "memory_id": {"type": "string"}
                    },
                    "required": ["memory_id"]
                }
            },
            {
                "name": "search_memories",
                "description": "Search memories by content",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string"},
                        "project": {"type": "string"}
                    },
                    "required": ["query"]
                }
            }
        ]
        
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {"tools": tools}
        }
        
    def handle_tool_call(self, request_id, params):
        """Handle tool execution"""
        tool_name = params.get("name")
        arguments = params.get("arguments", {})
        
        self.log_debug(f"Calling tool: {tool_name}")
        
        # Route to tool implementation
        if tool_name == "test_tool":
            result = self.tool_test(arguments)
        elif tool_name == "add_memory":
            result = self.tool_add_memory(arguments)
        elif tool_name == "list_memories":
            result = self.tool_list_memories(arguments)
        elif tool_name == "get_memory":
            result = self.tool_get_memory(arguments)
        elif tool_name == "search_memories":
            result = self.tool_search_memories(arguments)
        else:
            return self.error_response(request_id, -32602, f"Unknown tool: {tool_name}")
            
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": result
        }
        
    def tool_test(self, args):
        """Test tool implementation"""
        message = args.get("message", "Hello from Like-I-Said!")
        return {
            "content": [
                {
                    "type": "text",
                    "text": f"✅ MCP Connection successful! {message}"
                }
            ]
        }
        
    def tool_add_memory(self, args):
        """Add memory implementation"""
        content = args.get("content", "")
        if not content:
            return self.text_result("❌ Content is required")
            
        memory_id = str(uuid.uuid4())
        timestamp = datetime.now().isoformat()
        
        # Create memory with YAML frontmatter
        memory_data = {
            "id": memory_id,
            "timestamp": timestamp,
            "category": args.get("category", "general"),
            "project": args.get("project", "default"),
            "tags": args.get("tags", []),
            "priority": args.get("priority", "medium"),
            "status": "active"
        }
        
        # Save to markdown file
        project_dir = self.memories_dir / memory_data["project"]
        project_dir.mkdir(exist_ok=True)
        
        filename = f"{datetime.now().strftime('%Y-%m-%d')}-{memory_id[:8]}.md"
        filepath = project_dir / filename
        
        yaml_content = yaml.dump(memory_data, default_flow_style=False)
        markdown_content = f"---\\n{yaml_content}---\\n{content}"
        
        filepath.write_text(markdown_content, encoding="utf-8")
        
        return self.text_result(f"✅ Memory stored successfully with ID: {memory_id}")
        
    def tool_list_memories(self, args):
        """List memories implementation"""
        project = args.get("project")
        limit = min(args.get("limit", 50), 100)
        
        memories = []
        search_dirs = [self.memories_dir / project] if project else [d for d in self.memories_dir.iterdir() if d.is_dir()]
        
        for project_dir in search_dirs:
            if not project_dir.exists():
                continue
                
            for file_path in project_dir.glob("*.md"):
                if len(memories) >= limit:
                    break
                    
                try:
                    content = file_path.read_text(encoding="utf-8")
                    # Parse YAML frontmatter
                    if content.startswith("---"):
                        parts = content.split("---", 2)
                        if len(parts) >= 3:
                            metadata = yaml.safe_load(parts[1])
                            body = parts[2].strip()
                            
                            memories.append({
                                "id": metadata.get("id", "unknown"),
                                "category": metadata.get("category", "general"),
                                "timestamp": metadata.get("timestamp", ""),
                                "preview": body[:100] + "..." if len(body) > 100 else body
                            })
                except Exception as e:
                    self.log_debug(f"Error reading {file_path}: {e}")
                    
        text = f"📚 Found {len(memories)} memories\\n\\n"
        for mem in memories[:limit]:
            text += f"🆔 {mem['id'][:8]}... | {mem['category']} | {mem['timestamp'][:10]}\\n"
            text += f"   {mem['preview']}\\n\\n"
            
        return self.text_result(text)
        
    def tool_get_memory(self, args):
        """Get specific memory"""
        memory_id = args.get("memory_id", "")
        if not memory_id:
            return self.text_result("❌ memory_id is required")
            
        # Search all project directories
        for project_dir in self.memories_dir.iterdir():
            if not project_dir.is_dir():
                continue
                
            for file_path in project_dir.glob("*.md"):
                try:
                    content = file_path.read_text(encoding="utf-8")
                    if memory_id in content:
                        return self.text_result(f"📄 Memory found:\\n\\n{content}")
                except:
                    pass
                    
        return self.text_result(f"❌ Memory with ID {memory_id} not found")
        
    def tool_search_memories(self, args):
        """Search memories"""
        query = args.get("query", "").lower()
        if not query:
            return self.text_result("❌ Query is required")
            
        project = args.get("project")
        results = []
        
        search_dirs = [self.memories_dir / project] if project else [d for d in self.memories_dir.iterdir() if d.is_dir()]
        
        for project_dir in search_dirs:
            if not project_dir.exists():
                continue
                
            for file_path in project_dir.glob("*.md"):
                try:
                    content = file_path.read_text(encoding="utf-8")
                    if query in content.lower():
                        # Extract ID from content
                        match = re.search(r'id: ([\\w-]+)', content)
                        memory_id = match.group(1) if match else "unknown"
                        
                        # Find the line containing the query
                        lines = content.split('\\n')
                        matching_lines = [line for line in lines if query in line.lower()]
                        preview = matching_lines[0][:100] + "..." if matching_lines else "Match found"
                        
                        results.append({
                            "id": memory_id,
                            "file": file_path.name,
                            "preview": preview
                        })
                except:
                    pass
                    
        if not results:
            return self.text_result(f"🔍 No memories found matching '{query}'")
            
        text = f"🔍 Found {len(results)} memories matching '{query}':\\n\\n"
        for res in results:
            text += f"🆔 {res['id'][:8]}... | {res['file']}\\n"
            text += f"   {res['preview']}\\n\\n"
            
        return self.text_result(text)
        
    def text_result(self, text):
        """Create text result format"""
        return {
            "content": [
                {
                    "type": "text",
                    "text": text
                }
            ]
        }
        
    def error_response(self, request_id, code, message):
        """Create error response"""
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "error": {
                "code": code,
                "message": message
            }
        }

def main():
    """Main server loop - simple stdio handling"""
    server = SimpleMemoryServer()
    
    server.log_debug("Simple stdio-based MCP Server starting...")
    server.log_debug("No FastMCP - direct stdio handling")
    
    try:
        # Read from stdin line by line
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
                
            try:
                # Parse JSON-RPC request
                request = json.loads(line)
                server.log_debug(f"Received: {json.dumps(request)[:100]}...")
                
                # Handle the message
                response = server.handle_message(request)
                
                # Send response if not None
                if response is not None:
                    response_json = json.dumps(response)
                    print(response_json)
                    sys.stdout.flush()
                    
            except json.JSONDecodeError as e:
                # Send parse error
                error = server.error_response(None, -32700, f"Parse error: {str(e)}")
                print(json.dumps(error))
                sys.stdout.flush()
                
    except KeyboardInterrupt:
        server.log_debug("Server interrupted")
    except Exception as e:
        server.log_debug(f"Server error: {e}")

if __name__ == "__main__":
    main()
'''
    
    (server_dir / "standalone_mcp_server.py").write_text(server_code)
    
    # Create manifest.json
    manifest = {
        "dxt_version": "0.1",
        "name": "like-i-said-v2",
        "version": "2.0.0",
        "description": "Like-I-Said Memory v2 - Simple stdio implementation (no FastMCP)",
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
                "description": "Store information with auto-categorization"
            },
            {
                "name": "list_memories",
                "description": "List stored memories"
            },
            {
                "name": "get_memory",
                "description": "Get specific memory by ID"
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
    readme = '''# Like-I-Said Memory v2 - Simple stdio Implementation

This version uses direct stdio handling without FastMCP, based on the working JSON-RPC implementation.

## Features
- Simple and reliable stdio communication
- No complex frameworks or dependencies
- Direct JSON-RPC 2.0 message handling
- Basic memory management tools

## Tools
- test_tool - Verify connection
- add_memory - Store memories
- list_memories - List memories
- get_memory - Get specific memory
- search_memories - Search memories
'''
    
    (build_dir / "README.md").write_text(readme)
    
    # Create the DXT
    dxt_filename = "like-i-said-v2-simple-stdio.dxt"
    
    with zipfile.ZipFile(dxt_filename, 'w', zipfile.ZIP_DEFLATED) as dxt:
        for file in build_dir.rglob('*'):
            if file.is_file():
                arcname = file.relative_to(build_dir)
                dxt.write(file, arcname)
                
    size_mb = Path(dxt_filename).stat().st_size / (1024 * 1024)
    
    shutil.rmtree(build_dir)
    
    print(f"✅ Created {dxt_filename}")
    print(f"📁 Size: {size_mb:.2f} MB")
    print(f"\n🎯 Key features:")
    print("   - NO FastMCP - direct stdio handling")
    print("   - Simple line-by-line stdin reading")
    print("   - Direct stdout printing with flush")
    print("   - Based on working JSON-RPC pattern")
    print("   - Minimal dependencies (just Python stdlib + yaml)")
    print("\n🚀 This should work like the basic JSON-RPC version!")

if __name__ == "__main__":
    create_simple_stdio_dxt()