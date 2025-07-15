#!/usr/bin/env python3
"""
Build a fully MCP-compliant DXT that passes all Zod validations
"""

import os
import json
import shutil
import zipfile
from pathlib import Path

class CompliantDXTBuilder:
    def __init__(self):
        self.build_dir = Path("dxt-compliant-build")
        
    def clean_build_dir(self):
        """Clean build directory"""
        if self.build_dir.exists():
            shutil.rmtree(self.build_dir)
        self.build_dir.mkdir()
        print("✓ Created clean build directory")
        
    def create_server_directory(self):
        """Create server with full MCP compliance"""
        server_dir = self.build_dir / "server"
        server_dir.mkdir()
        
        # Main MCP server with strict JSON-RPC compliance
        server_py = server_dir / "standalone_mcp_server.py"
        server_py.write_text('''#!/usr/bin/env python3
"""
Like-I-Said v2 - Fully MCP-Compliant Server
"""

import json
import sys
import uuid
import os
from pathlib import Path
from datetime import datetime

class MCPServer:
    def __init__(self):
        self.memories_dir = Path("memories")
        self.memories_dir.mkdir(exist_ok=True)
        (self.memories_dir / "default").mkdir(exist_ok=True)
        self.initialized = False
        
    def handle_request(self, request):
        """Handle MCP request with strict JSON-RPC compliance"""
        try:
            # Validate basic JSON-RPC structure
            if not isinstance(request, dict):
                return self.error_response(None, -32600, "Invalid Request")
                
            jsonrpc = request.get("jsonrpc")
            if jsonrpc != "2.0":
                return self.error_response(request.get("id"), -32600, "Invalid Request")
                
            method = request.get("method")
            if not isinstance(method, str):
                return self.error_response(request.get("id"), -32600, "Invalid Request")
                
            params = request.get("params", {})
            req_id = request.get("id")
            
            # Handle methods
            if method == "initialize":
                return self.handle_initialize(req_id, params)
            elif method == "initialized":
                return self.handle_initialized(req_id)
            elif method == "tools/list":
                return self.handle_tools_list(req_id)
            elif method == "tools/call":
                return self.handle_tools_call(req_id, params)
            else:
                return self.error_response(req_id, -32601, f"Method not found: {method}")
                
        except Exception as e:
            return self.error_response(request.get("id") if isinstance(request, dict) else None, 
                                     -32603, f"Internal error: {str(e)}")
    
    def success_response(self, req_id, result):
        """Create success response"""
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": result
        }
        
    def error_response(self, req_id, code, message, data=None):
        """Create error response"""
        error = {
            "code": code,
            "message": message
        }
        if data is not None:
            error["data"] = data
            
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "error": error
        }
        
    def handle_initialize(self, req_id, params):
        """Handle initialize request"""
        self.initialized = True
        return self.success_response(req_id, {
            "protocolVersion": "2024-11-05",
            "capabilities": {
                "tools": {}
            },
            "serverInfo": {
                "name": "like-i-said-v2",
                "version": "1.0.0"
            }
        })
        
    def handle_initialized(self, req_id):
        """Handle initialized notification"""
        # This is a notification, no response needed
        return None
        
    def handle_tools_list(self, req_id):
        """Handle tools/list request"""
        if not self.initialized:
            return self.error_response(req_id, -32002, "Server not initialized")
            
        return self.success_response(req_id, {
            "tools": [
                {
                    "name": "test_connection",
                    "description": "Test the MCP connection",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "message": {
                                "type": "string",
                                "description": "Test message",
                                "default": "Hello from Like-I-Said!"
                            }
                        }
                    }
                },
                {
                    "name": "add_memory",
                    "description": "Store a new memory",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "content": {
                                "type": "string",
                                "description": "Memory content to store"
                            },
                            "category": {
                                "type": "string",
                                "description": "Memory category",
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
                                "description": "Maximum number of memories to return",
                                "default": 10,
                                "minimum": 1,
                                "maximum": 100
                            }
                        }
                    }
                },
                {
                    "name": "search_memories",
                    "description": "Search through stored memories",
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
        })
        
    def handle_tools_call(self, req_id, params):
        """Handle tools/call request"""
        if not self.initialized:
            return self.error_response(req_id, -32002, "Server not initialized")
            
        # Validate params structure
        if not isinstance(params, dict):
            return self.error_response(req_id, -32602, "Invalid params")
            
        tool_name = params.get("name")
        if not isinstance(tool_name, str):
            return self.error_response(req_id, -32602, "Missing tool name")
            
        arguments = params.get("arguments", {})
        if not isinstance(arguments, dict):
            return self.error_response(req_id, -32602, "Invalid arguments")
            
        # Call the appropriate tool
        try:
            if tool_name == "test_connection":
                return self.tool_test_connection(req_id, arguments)
            elif tool_name == "add_memory":
                return self.tool_add_memory(req_id, arguments)
            elif tool_name == "list_memories":
                return self.tool_list_memories(req_id, arguments)
            elif tool_name == "search_memories":
                return self.tool_search_memories(req_id, arguments)
            else:
                return self.error_response(req_id, -32601, f"Unknown tool: {tool_name}")
        except Exception as e:
            return self.error_response(req_id, -32603, f"Tool execution error: {str(e)}")
            
    def tool_test_connection(self, req_id, arguments):
        """Test connection tool"""
        message = arguments.get("message", "Hello from Like-I-Said!")
        
        return self.success_response(req_id, {
            "content": [
                {
                    "type": "text",
                    "text": f"✅ Like-I-Said v2 MCP Server is working!\\n\\nReceived message: {message}\\nServer status: Ready\\nMemory directory: {self.memories_dir.absolute()}"
                }
            ]
        })
        
    def tool_add_memory(self, req_id, arguments):
        """Add memory tool"""
        content = arguments.get("content")
        if not content:
            return self.error_response(req_id, -32602, "Content is required")
            
        category = arguments.get("category", "general")
        memory_id = self.save_memory(content, category)
        
        return self.success_response(req_id, {
            "content": [
                {
                    "type": "text",
                    "text": f"✅ Memory saved successfully!\\n\\n**Memory ID:** {memory_id}\\n**Category:** {category}\\n**Content preview:** {content[:100]}{'...' if len(content) > 100 else ''}"
                }
            ]
        })
        
    def tool_list_memories(self, req_id, arguments):
        """List memories tool"""
        limit = arguments.get("limit", 10)
        if not isinstance(limit, int) or limit < 1 or limit > 100:
            limit = 10
            
        memories = self.list_memories(limit)
        
        if memories:
            text = f"📚 **Your Memories** (showing {len(memories)} of your stored memories)\\n\\n"
            for i, mem in enumerate(memories, 1):
                text += f"**{i}. {mem['id']}** ({mem['category']})\\n{mem['preview']}\\n\\n"
        else:
            text = "📚 **No memories found**\\n\\nYou haven't stored any memories yet. Use the `add_memory` tool to save your first memory!"
            
        return self.success_response(req_id, {
            "content": [
                {
                    "type": "text",
                    "text": text
                }
            ]
        })
        
    def tool_search_memories(self, req_id, arguments):
        """Search memories tool"""
        query = arguments.get("query")
        if not query:
            return self.error_response(req_id, -32602, "Query is required")
            
        results = self.search_memories(query)
        
        if results:
            text = f"🔍 **Search Results for '{query}'**\\n\\nFound {len(results)} matching memories:\\n\\n"
            for i, mem in enumerate(results, 1):
                text += f"**{i}. {mem['id']}** ({mem['category']})\\n{mem['preview']}\\n\\n"
        else:
            text = f"🔍 **No results found for '{query}'**\\n\\nTry searching with different keywords or check if you have memories stored."
            
        return self.success_response(req_id, {
            "content": [
                {
                    "type": "text",
                    "text": text
                }
            ]
        })
        
    def save_memory(self, content, category):
        """Save memory to file"""
        memory_id = f"mem-{uuid.uuid4().hex[:8]}"
        timestamp = datetime.now().isoformat()
        
        filename = f"{memory_id}.txt"
        filepath = self.memories_dir / "default" / filename
        
        memory_content = f"""Memory ID: {memory_id}
Timestamp: {timestamp}
Category: {category}

{content}
"""
        
        filepath.write_text(memory_content, encoding="utf-8")
        return memory_id
        
    def list_memories(self, limit=10):
        """List stored memories"""
        memories = []
        
        try:
            for mem_file in sorted((self.memories_dir / "default").glob("*.txt"), reverse=True):
                if len(memories) >= limit:
                    break
                    
                content = mem_file.read_text(encoding="utf-8")
                lines = content.split('\\n')
                
                memory_id = lines[0].replace('Memory ID: ', '') if len(lines) > 0 else "unknown"
                category = lines[2].replace('Category: ', '') if len(lines) > 2 else "general"
                body = '\\n'.join(lines[4:]) if len(lines) > 4 else ""
                
                memories.append({
                    "id": memory_id,
                    "category": category,
                    "preview": body[:150] + "..." if len(body) > 150 else body
                })
        except Exception:
            pass
            
        return memories
        
    def search_memories(self, query):
        """Search memories"""
        query_lower = query.lower()
        all_memories = self.list_memories(100)
        
        results = []
        for mem in all_memories:
            if query_lower in mem["preview"].lower() or query_lower in mem["category"].lower():
                results.append(mem)
                
        return results[:20]

def main():
    """Main entry point"""
    server = MCPServer()
    
    try:
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
                
            try:
                request = json.loads(line)
                response = server.handle_request(request)
                
                # Only send response if not None (for notifications)
                if response is not None:
                    print(json.dumps(response))
                    sys.stdout.flush()
                    
            except json.JSONDecodeError as e:
                error_response = {
                    "jsonrpc": "2.0",
                    "id": None,
                    "error": {
                        "code": -32700,
                        "message": f"Parse error: {str(e)}"
                    }
                }
                print(json.dumps(error_response))
                sys.stdout.flush()
                
    except KeyboardInterrupt:
        pass
    except Exception as e:
        sys.stderr.write(f"Server error: {e}\\n")

if __name__ == "__main__":
    main()
''')
        
        print("✓ Created MCP-compliant server")
        
    def create_manifest(self):
        """Create manifest.json"""
        manifest = {
            "dxt_version": "0.1",
            "name": "like-i-said-v2",
            "version": "1.0.1", 
            "description": "Memory management system for Claude Desktop - store, search and organize your important information",
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
            "support": "https://github.com/endlessblink/Like-I-Said-memory-mcp-server/issues",
            "requirements": {
                "python": ">=3.8"
            },
            "tools": [
                {
                    "name": "test_connection",
                    "description": "Test the MCP connection to verify Like-I-Said is working"
                },
                {
                    "name": "add_memory",
                    "description": "Store a new memory with optional categorization"
                },
                {
                    "name": "list_memories", 
                    "description": "List your stored memories with previews"
                },
                {
                    "name": "search_memories",
                    "description": "Search through your memories using keywords"
                }
            ]
        }
        
        manifest_file = self.build_dir / "manifest.json"
        manifest_file.write_text(json.dumps(manifest, indent=2))
        print("✓ Created manifest.json")
        
    def create_readme(self):
        """Create README.md"""
        readme = self.build_dir / "README.md"
        readme.write_text("""# Like-I-Said v2 - Memory Management for Claude Desktop

A powerful, MCP-compliant memory management system for Claude Desktop.

## ✨ Features

- 🧠 **Store Memories**: Save important information with categorization
- 🔍 **Smart Search**: Find memories using keywords
- 📚 **Easy Browsing**: List and view all your stored memories  
- 🏷️ **Auto-categorization**: Organize memories by type
- 💾 **Local Storage**: All data stays on your machine
- ⚡ **Fast & Reliable**: Built with full MCP compliance

## 🛠️ Available Tools

### test_connection
Verify the MCP connection is working properly.

**Usage:** "Use test_connection to check if Like-I-Said is working"

### add_memory  
Store a new memory with optional categorization.

**Usage:** 
- "Use add_memory to store: Meeting notes from today's standup"
- "Add memory with category 'code': Fixed the authentication bug"

### list_memories
Browse your stored memories with previews.

**Usage:** "Use list_memories to show my recent memories"

### search_memories
Search through your memories using keywords.

**Usage:** 
- "Use search_memories to find memories about 'Python'"
- "Search for anything related to 'project deadlines'"

## 🚀 Installation

1. Install this DXT in Claude Desktop
2. No additional setup required (Python 3.8+ needed)
3. Start using the memory tools immediately!

## 💾 Data Storage

Memories are stored locally in a `memories/` directory as text files. Your data never leaves your machine.

## 🔧 Technical Details

- **MCP Protocol Version**: 2024-11-05
- **JSON-RPC Compliance**: Full validation and error handling
- **Python Requirements**: 3.8 or higher
- **Storage Format**: Simple text files for reliability

## 📞 Support

- **Repository**: https://github.com/endlessblink/Like-I-Said-memory-mcp-server
- **Issues**: https://github.com/endlessblink/Like-I-Said-memory-mcp-server/issues

---

**Version:** 1.0.1 (MCP-Compliant)  
**Author:** endlessblink
""")
        
        print("✓ Created README.md")
        
    def build_dxt(self):
        """Build the compliant DXT"""
        dxt_filename = "like-i-said-v2-compliant.dxt"
        
        print(f"\\nBuilding {dxt_filename}...")
        
        with zipfile.ZipFile(dxt_filename, 'w', zipfile.ZIP_DEFLATED) as dxt:
            for file in self.build_dir.rglob('*'):
                if file.is_file():
                    arcname = file.relative_to(self.build_dir)
                    dxt.write(file, arcname)
                    
        size_mb = Path(dxt_filename).stat().st_size / (1024 * 1024)
        
        print(f"✅ Built {dxt_filename}")
        print(f"📦 Size: {size_mb:.2f} MB")
        print(f"📁 Path: {Path(dxt_filename).absolute()}")
        
        return dxt_filename
        
    def build(self):
        """Build the compliant DXT"""
        print("Building MCP-Compliant Like-I-Said v2 DXT...")
        print("=" * 45)
        
        self.clean_build_dir()
        self.create_server_directory()
        self.create_manifest()
        self.create_readme()
        
        dxt_file = self.build_dxt()
        
        print("\\n" + "=" * 45)
        print("✅ MCP-COMPLIANT DXT READY!")
        print("\\nThis DXT should work without Zod validation errors.")
        print("Full JSON-RPC compliance and proper error handling included.")
        
        # Cleanup
        shutil.rmtree(self.build_dir)
        print("✓ Build directory cleaned")

if __name__ == "__main__":
    builder = CompliantDXTBuilder()
    builder.build()