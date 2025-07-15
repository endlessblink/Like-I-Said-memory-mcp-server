#!/usr/bin/env python3
"""
Build a DXT specifically for Claude Desktop with exact spec compliance
"""

import os
import json
import shutil
import zipfile
from pathlib import Path

class ClaudeDesktopDXTBuilder:
    def __init__(self):
        self.build_dir = Path("dxt-claude-build")
        self.version = "2.2.0"
        
    def clean_build_dir(self):
        """Clean build directory"""
        if self.build_dir.exists():
            shutil.rmtree(self.build_dir)
        self.build_dir.mkdir()
        print("✓ Created clean build directory")
        
    def create_server_script(self):
        """Create the MCP server script"""
        server_py = self.build_dir / "server.py"
        server_py.write_text('''#!/usr/bin/env python3
"""
Like-I-Said v2 - MCP Server for Claude Desktop
"""

import json
import sys
import uuid
import yaml
from pathlib import Path
from datetime import datetime

class LikeISaidMCP:
    def __init__(self):
        self.memories_dir = Path("memories")
        self.memories_dir.mkdir(exist_ok=True)
        (self.memories_dir / "default").mkdir(exist_ok=True)
        
    def handle_message(self, message):
        """Handle incoming MCP messages"""
        try:
            method = message.get("method")
            params = message.get("params", {})
            msg_id = message.get("id")
            
            if method == "initialize":
                return {
                    "jsonrpc": "2.0",
                    "id": msg_id,
                    "result": {
                        "protocolVersion": "2024-11-05",
                        "capabilities": {
                            "tools": {}
                        },
                        "serverInfo": {
                            "name": "like-i-said-v2",
                            "version": "2.2.0"
                        }
                    }
                }
                
            elif method == "tools/list":
                return {
                    "jsonrpc": "2.0",
                    "id": msg_id,
                    "result": {
                        "tools": [
                            {
                                "name": "add_memory",
                                "description": "Store a new memory",
                                "inputSchema": {
                                    "type": "object",
                                    "properties": {
                                        "content": {"type": "string", "description": "Memory content"},
                                        "project": {"type": "string", "description": "Project name", "default": "default"},
                                        "tags": {"type": "array", "items": {"type": "string"}},
                                        "category": {"type": "string", "enum": ["personal", "work", "code", "research", "general"], "default": "general"}
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
                                        "limit": {"type": "integer", "default": 20}
                                    }
                                }
                            },
                            {
                                "name": "search_memories",
                                "description": "Search memories",
                                "inputSchema": {
                                    "type": "object",
                                    "properties": {
                                        "query": {"type": "string", "description": "Search query"},
                                        "project": {"type": "string"}
                                    },
                                    "required": ["query"]
                                }
                            },
                            {
                                "name": "test_connection",
                                "description": "Test MCP connection",
                                "inputSchema": {
                                    "type": "object",
                                    "properties": {
                                        "message": {"type": "string", "default": "test"}
                                    }
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
                        "id": msg_id,
                        "result": {
                            "content": [
                                {
                                    "type": "text",
                                    "text": f"✅ Like-I-Said v2 MCP Server is working!\\nReceived: {arguments.get('message', 'test')}"
                                }
                            ]
                        }
                    }
                    
                elif tool_name == "add_memory":
                    memory_id = self.save_memory(arguments)
                    return {
                        "jsonrpc": "2.0",
                        "id": msg_id,
                        "result": {
                            "content": [
                                {
                                    "type": "text",
                                    "text": f"✅ Memory saved successfully!\\nID: {memory_id}\\nProject: {arguments.get('project', 'default')}"
                                }
                            ]
                        }
                    }
                    
                elif tool_name == "list_memories":
                    memories = self.list_memories(arguments.get("project"), arguments.get("limit", 20))
                    text = f"📚 Found {len(memories)} memories:\\n\\n"
                    for i, mem in enumerate(memories[:10], 1):
                        text += f"{i}. **{mem['id']}** ({mem['category']})\\n   {mem['preview']}\\n\\n"
                    if len(memories) > 10:
                        text += f"... and {len(memories) - 10} more"
                        
                    return {
                        "jsonrpc": "2.0",
                        "id": msg_id,
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
                    results = self.search_memories(arguments.get("query", ""), arguments.get("project"))
                    text = f"🔍 Search results for '{arguments.get('query', '')}':\\n\\n"
                    for i, mem in enumerate(results, 1):
                        text += f"{i}. **{mem['id']}** ({mem['category']})\\n   {mem['preview']}\\n\\n"
                    if not results:
                        text += "No matches found."
                        
                    return {
                        "jsonrpc": "2.0",
                        "id": msg_id,
                        "result": {
                            "content": [
                                {
                                    "type": "text",
                                    "text": text
                                }
                            ]
                        }
                    }
                    
            return {
                "jsonrpc": "2.0",
                "id": msg_id,
                "error": {
                    "code": -32601,
                    "message": f"Method not found: {method}"
                }
            }
            
        except Exception as e:
            return {
                "jsonrpc": "2.0",
                "id": message.get("id"),
                "error": {
                    "code": -32603,
                    "message": f"Internal error: {str(e)}"
                }
            }
            
    def save_memory(self, data):
        """Save memory to file"""
        memory_id = f"mem-{uuid.uuid4().hex[:8]}"
        timestamp = datetime.now().isoformat()
        
        project = data.get("project", "default")
        project_dir = self.memories_dir / project
        project_dir.mkdir(exist_ok=True)
        
        metadata = {
            "id": memory_id,
            "timestamp": timestamp,
            "category": data.get("category", "general"),
            "tags": data.get("tags", []),
            "project": project
        }
        
        filename = f"{timestamp.split('T')[0]}-{memory_id}.md"
        filepath = project_dir / filename
        
        content = f"""---
{yaml.dump(metadata, default_flow_style=False)}---
{data.get("content", "")}
"""
        
        filepath.write_text(content, encoding="utf-8")
        return memory_id
        
    def list_memories(self, project=None, limit=20):
        """List memories"""
        memories = []
        
        if project:
            dirs = [self.memories_dir / project]
        else:
            dirs = [d for d in self.memories_dir.iterdir() if d.is_dir()]
            
        for dir_path in dirs:
            if not dir_path.exists():
                continue
                
            for mem_file in sorted(dir_path.glob("*.md"), reverse=True):
                if len(memories) >= limit:
                    break
                    
                try:
                    content = mem_file.read_text(encoding="utf-8")
                    if content.startswith("---"):
                        parts = content.split("---", 2)
                        if len(parts) >= 3:
                            metadata = yaml.safe_load(parts[1])
                            body = parts[2].strip()
                            
                            memories.append({
                                "id": metadata.get("id", "unknown"),
                                "category": metadata.get("category", "general"),
                                "project": dir_path.name,
                                "preview": body[:100] + "..." if len(body) > 100 else body
                            })
                except Exception:
                    continue
                    
        return memories[:limit]
        
    def search_memories(self, query, project=None):
        """Search memories"""
        query_lower = query.lower()
        memories = self.list_memories(project, 100)
        
        results = []
        for mem in memories:
            if query_lower in mem.get("preview", "").lower():
                results.append(mem)
                
        return results[:20]

def main():
    """Main MCP server loop"""
    server = LikeISaidMCP()
    
    # Send server capabilities
    sys.stderr.write("Like-I-Said v2 MCP Server starting...\\n")
    sys.stderr.flush()
    
    # Process messages
    for line in sys.stdin:
        try:
            request = json.loads(line.strip())
            response = server.handle_message(request)
            print(json.dumps(response))
            sys.stdout.flush()
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
        
        print("✓ Created MCP server script")
        
    def create_manifest(self):
        """Create Claude Desktop manifest.json"""
        manifest = {
            "name": "like-i-said-v2",
            "version": self.version,
            "description": "Like-I-Said v2 - Memory Management for Claude Desktop",
            "author": "endlessblink",
            "mcpServers": {
                "like-i-said-v2": {
                    "command": "python",
                    "args": ["server.py"],
                    "env": {}
                }
            }
        }
        
        manifest_file = self.build_dir / "manifest.json"
        manifest_file.write_text(json.dumps(manifest, indent=2))
        print("✓ Created manifest.json")
        
    def create_requirements(self):
        """Create requirements file"""
        req_file = self.build_dir / "requirements.txt"
        req_file.write_text("pyyaml>=6.0\\n")
        
        # Install script
        install_bat = self.build_dir / "install.bat"
        install_bat.write_text("""@echo off
echo Installing PyYAML...
pip install pyyaml
echo Done!
""")
        
        print("✓ Created requirements")
        
    def create_readme(self):
        """Create README"""
        readme = self.build_dir / "README.md"
        readme.write_text("""# Like-I-Said v2 for Claude Desktop

Memory management system for Claude Desktop.

## Installation

1. Install this DXT in Claude Desktop
2. Run `install.bat` (Windows) to install PyYAML
3. Use the memory tools in Claude Desktop

## Tools

- `test_connection` - Test the MCP connection
- `add_memory` - Store memories
- `list_memories` - List stored memories  
- `search_memories` - Search your memories

## Example Usage

"Test the connection"
"Store this memory: Important project meeting notes"
"List my recent memories"
"Search for memories about Python"
""")
        
        print("✓ Created README")
        
    def build_dxt(self):
        """Build the DXT package"""
        dxt_filename = f"like-i-said-v2-claude-desktop-{self.version}.dxt"
        
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
        """Build complete DXT"""
        print("Building Claude Desktop DXT...")
        print("=" * 40)
        
        self.clean_build_dir()
        self.create_server_script()
        self.create_manifest()
        self.create_requirements()
        self.create_readme()
        
        dxt_file = self.build_dxt()
        
        print("\\n" + "=" * 40)
        print("✅ Claude Desktop DXT ready!")
        print("\\nInstall in Claude Desktop and run install.bat")
        
        # Cleanup
        shutil.rmtree(self.build_dir)
        print("✓ Build directory cleaned")

if __name__ == "__main__":
    builder = ClaudeDesktopDXTBuilder()
    builder.build()