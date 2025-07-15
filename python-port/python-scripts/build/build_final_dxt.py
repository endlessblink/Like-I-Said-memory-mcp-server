#!/usr/bin/env python3
"""
Build a DXT with the exact structure of working comfy-guru DXT
"""

import os
import json
import shutil
import zipfile
from pathlib import Path

class FinalDXTBuilder:
    def __init__(self):
        self.build_dir = Path("dxt-final-build")
        
    def clean_build_dir(self):
        """Clean build directory"""
        if self.build_dir.exists():
            shutil.rmtree(self.build_dir)
        self.build_dir.mkdir()
        print("✓ Created clean build directory")
        
    def create_server_directory(self):
        """Create server directory with MCP server"""
        server_dir = self.build_dir / "server"
        server_dir.mkdir()
        
        # Main MCP server
        server_py = server_dir / "standalone_mcp_server.py"
        server_py.write_text('''#!/usr/bin/env python3
"""
Like-I-Said v2 - Standalone MCP Server
"""

import json
import sys
import uuid
import os
from pathlib import Path
from datetime import datetime

class LikeISaidServer:
    def __init__(self):
        self.memories_dir = Path("memories")
        self.memories_dir.mkdir(exist_ok=True)
        (self.memories_dir / "default").mkdir(exist_ok=True)
        
    def handle_request(self, request):
        """Handle MCP request"""
        try:
            method = request.get("method")
            params = request.get("params", {})
            req_id = request.get("id")
            
            if method == "initialize":
                return {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {
                        "protocolVersion": "2024-11-05",
                        "capabilities": {
                            "tools": {}
                        },
                        "serverInfo": {
                            "name": "like-i-said-v2",
                            "version": "1.0.0"
                        }
                    }
                }
                
            elif method == "tools/list":
                return {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "result": {
                        "tools": [
                            {
                                "name": "test_connection",
                                "description": "Test the MCP connection",
                                "inputSchema": {
                                    "type": "object",
                                    "properties": {
                                        "message": {
                                            "type": "string",
                                            "description": "Test message"
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
                                            "description": "Memory category (optional)"
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
                                            "default": 10
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
                    }
                }
                
            elif method == "tools/call":
                tool_name = params.get("name")
                arguments = params.get("arguments", {})
                
                if tool_name == "test_connection":
                    return {
                        "jsonrpc": "2.0",
                        "id": req_id,
                        "result": {
                            "content": [
                                {
                                    "type": "text",
                                    "text": f"✅ Like-I-Said v2 MCP Server is working!\\n\\nTest message: {arguments.get('message', 'Hello from Like-I-Said!')}"
                                }
                            ]
                        }
                    }
                    
                elif tool_name == "add_memory":
                    memory_id = self.save_memory(arguments)
                    return {
                        "jsonrpc": "2.0",
                        "id": req_id,
                        "result": {
                            "content": [
                                {
                                    "type": "text",
                                    "text": f"✅ Memory saved successfully!\\n\\nMemory ID: {memory_id}\\nCategory: {arguments.get('category', 'general')}\\nContent preview: {arguments.get('content', '')[:100]}..."
                                }
                            ]
                        }
                    }
                    
                elif tool_name == "list_memories":
                    memories = self.list_memories(arguments.get("limit", 10))
                    if memories:
                        text = f"📚 Found {len(memories)} memories:\\n\\n"
                        for i, mem in enumerate(memories, 1):
                            text += f"{i}. **{mem['id']}** ({mem['category']})\\n   {mem['preview']}\\n\\n"
                    else:
                        text = "No memories found. Use add_memory to store your first memory!"
                        
                    return {
                        "jsonrpc": "2.0",
                        "id": req_id,
                        "result": {
                            "content": [
                                {
                                    "type": "text",
                                    "text": text
                                }
                            ]
                        }
                    }
                    
                elif tool_name == "search_memories":
                    results = self.search_memories(arguments.get("query", ""))
                    if results:
                        text = f"🔍 Search results for '{arguments.get('query', '')}':\\n\\n"
                        for i, mem in enumerate(results, 1):
                            text += f"{i}. **{mem['id']}** ({mem['category']})\\n   {mem['preview']}\\n\\n"
                    else:
                        text = f"No memories found matching '{arguments.get('query', '')}'."
                        
                    return {
                        "jsonrpc": "2.0",
                        "id": req_id,
                        "result": {
                            "content": [
                                {
                                    "type": "text",
                                    "text": text
                                }
                            ]
                        }
                    }
                
                else:
                    return {
                        "jsonrpc": "2.0",
                        "id": req_id,
                        "error": {
                            "code": -32601,
                            "message": f"Unknown tool: {tool_name}"
                        }
                    }
                    
            else:
                return {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "error": {
                        "code": -32601,
                        "message": f"Unknown method: {method}"
                    }
                }
                
        except Exception as e:
            return {
                "jsonrpc": "2.0",
                "id": request.get("id"),
                "error": {
                    "code": -32603,
                    "message": f"Internal error: {str(e)}"
                }
            }
            
    def save_memory(self, data):
        """Save memory to file"""
        memory_id = f"mem-{uuid.uuid4().hex[:8]}"
        timestamp = datetime.now().isoformat()
        
        filename = f"{memory_id}.txt"
        filepath = self.memories_dir / "default" / filename
        
        content = f"""Memory ID: {memory_id}
Timestamp: {timestamp}
Category: {data.get('category', 'general')}

{data.get('content', '')}
"""
        
        filepath.write_text(content, encoding="utf-8")
        return memory_id
        
    def list_memories(self, limit=10):
        """List stored memories"""
        memories = []
        
        for mem_file in sorted((self.memories_dir / "default").glob("*.txt"), reverse=True):
            if len(memories) >= limit:
                break
                
            try:
                content = mem_file.read_text(encoding="utf-8")
                lines = content.split('\\n')
                
                memory_id = lines[0].replace('Memory ID: ', '') if len(lines) > 0 else "unknown"
                category = lines[2].replace('Category: ', '') if len(lines) > 2 else "general"
                body = '\\n'.join(lines[4:]) if len(lines) > 4 else ""
                
                memories.append({
                    "id": memory_id,
                    "category": category,
                    "preview": body[:100] + "..." if len(body) > 100 else body
                })
            except Exception:
                continue
                
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
    server = LikeISaidServer()
    
    try:
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
                
            request = json.loads(line)
            response = server.handle_request(request)
            
            print(json.dumps(response))
            sys.stdout.flush()
            
    except KeyboardInterrupt:
        pass
    except Exception as e:
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

if __name__ == "__main__":
    main()
''')
        
        print("✓ Created MCP server")
        
    def create_manifest(self):
        """Create manifest.json with exact comfy-guru structure"""
        manifest = {
            "dxt_version": "0.1",
            "name": "like-i-said-v2",
            "version": "1.0.0",
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

A powerful memory management system that allows Claude to store, search, and organize important information across conversations.

## Features

- 🧠 **Store Memories**: Save important information with categorization
- 🔍 **Search Functionality**: Find memories using keywords
- 📚 **List & Browse**: View all your stored memories
- 🏷️ **Categorization**: Organize memories by type (work, personal, code, etc.)
- 💾 **Local Storage**: All data stays on your machine

## Available Tools

### test_connection
Test the MCP connection to verify Like-I-Said is working properly.

**Example usage:** "Use test_connection to check if Like-I-Said is working"

### add_memory
Store a new memory with optional categorization.

**Example usage:** 
- "Use add_memory to store: Important meeting notes from today's standup"
- "Add this to memory with category 'code': The bug was caused by missing error handling"

### list_memories
List your stored memories with previews.

**Example usage:** "Use list_memories to show my recent memories"

### search_memories
Search through your memories using keywords.

**Example usage:** 
- "Use search_memories to find memories about 'Python'"
- "Search my memories for anything related to 'project deadlines'"

## Installation

1. Install this DXT in Claude Desktop
2. No additional setup required - works with standard Python 3.8+
3. Start using the memory tools right away!

## Data Storage

Memories are stored locally in a `memories/` directory as simple text files. Your data never leaves your machine.

## Support

- Repository: https://github.com/endlessblink/Like-I-Said-memory-mcp-server
- Issues: https://github.com/endlessblink/Like-I-Said-memory-mcp-server/issues

---

**Version:** 1.0.0  
**Author:** endlessblink
""")
        
        print("✓ Created README.md")
        
    def build_dxt(self):
        """Build the final DXT"""
        dxt_filename = "like-i-said-v2-final.dxt"
        
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
        """Build the final DXT"""
        print("Building Like-I-Said v2 Final DXT...")
        print("=" * 40)
        
        self.clean_build_dir()
        self.create_server_directory()
        self.create_manifest()
        self.create_readme()
        
        dxt_file = self.build_dxt()
        
        print("\\n" + "=" * 40)
        print("✅ FINAL DXT READY FOR CLAUDE DESKTOP!")
        print("\\nThis DXT follows the exact structure of working DXTs.")
        print("It should install and work without any manifest errors.")
        
        # Cleanup
        shutil.rmtree(self.build_dir)
        print("✓ Build directory cleaned")

if __name__ == "__main__":
    builder = FinalDXTBuilder()
    builder.build()