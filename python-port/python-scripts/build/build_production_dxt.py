#!/usr/bin/env python3
"""
Build a production-ready, sanitized DXT for Claude Desktop.
This creates a clean package without any local user data.
"""

import os
import json
import shutil
import zipfile
import tempfile
from pathlib import Path
from datetime import datetime

class ProductionDXTBuilder:
    def __init__(self):
        self.build_dir = Path("dxt-production-build")
        self.version = "2.0.0"
        
    def clean_build_dir(self):
        """Start with clean build directory"""
        if self.build_dir.exists():
            shutil.rmtree(self.build_dir)
        self.build_dir.mkdir()
        print("✓ Created clean build directory")
        
    def create_minimal_mcp_server(self):
        """Create a minimal but functional MCP server"""
        server_py = self.build_dir / "mcp_server.py"
        server_py.write_text('''#!/usr/bin/env python3
"""
Like-I-Said v2 - Minimal MCP Server for Claude Desktop
This is a sanitized version without local data.
"""

import os
import sys
import json
import uuid
import yaml
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Any

# Simple MCP protocol implementation
class SimpleMCP:
    def __init__(self):
        self.memories_dir = Path("memories")
        self.tasks_dir = Path("tasks")
        self.ensure_directories()
        
    def ensure_directories(self):
        """Create storage directories"""
        self.memories_dir.mkdir(exist_ok=True)
        (self.memories_dir / "default").mkdir(exist_ok=True)
        self.tasks_dir.mkdir(exist_ok=True)
        (self.tasks_dir / "default").mkdir(exist_ok=True)
        
    def handle_request(self, request):
        """Handle MCP requests"""
        method = request.get("method")
        params = request.get("params", {})
        
        # Route to appropriate handler
        handlers = {
            "tools/list": self.list_tools,
            "tools/call": self.call_tool,
        }
        
        handler = handlers.get(method)
        if handler:
            return handler(params)
        else:
            return {"error": f"Unknown method: {method}"}
            
    def list_tools(self, params):
        """List available tools"""
        tools = [
            {
                "name": "add_memory",
                "description": "Store information with auto-categorization",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "content": {"type": "string", "description": "Memory content"},
                        "project": {"type": "string", "description": "Project name"},
                        "tags": {"type": "array", "items": {"type": "string"}},
                        "category": {"type": "string", "enum": ["personal", "work", "code", "research"]}
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
                "description": "Search memories by content",
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
                "name": "test_tool",
                "description": "Test MCP connection",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "message": {"type": "string"}
                    },
                    "required": ["message"]
                }
            }
        ]
        
        return {"tools": tools}
        
    def call_tool(self, params):
        """Execute a tool"""
        name = params.get("name")
        arguments = params.get("arguments", {})
        
        # Tool implementations
        if name == "test_tool":
            return {
                "content": [{
                    "type": "text",
                    "text": f"MCP Server received: {arguments.get('message', 'no message')}"
                }]
            }
            
        elif name == "add_memory":
            memory_id = self.save_memory(arguments)
            return {
                "content": [{
                    "type": "text", 
                    "text": f"✅ Memory stored with ID: {memory_id}"
                }]
            }
            
        elif name == "list_memories":
            memories = self.get_memories(arguments.get("project"), arguments.get("limit", 20))
            text = "📚 Memories:\\n\\n"
            for mem in memories:
                text += f"• {mem['id']}: {mem['preview']}\\n"
            return {"content": [{"type": "text", "text": text}]}
            
        elif name == "search_memories":
            results = self.search_memories(arguments.get("query", ""), arguments.get("project"))
            text = f"🔍 Found {len(results)} results:\\n\\n"
            for mem in results:
                text += f"• {mem['id']}: {mem['preview']}\\n"
            return {"content": [{"type": "text", "text": text}]}
            
        else:
            return {"error": f"Unknown tool: {name}"}
            
    def save_memory(self, data):
        """Save a memory to disk"""
        memory_id = f"mem-{uuid.uuid4().hex[:8]}"
        timestamp = datetime.now().isoformat()
        
        project = data.get("project", "default")
        project_dir = self.memories_dir / project
        project_dir.mkdir(exist_ok=True)
        
        # Create memory file
        filename = f"{timestamp.split('T')[0]}-{memory_id}.md"
        filepath = project_dir / filename
        
        metadata = {
            "id": memory_id,
            "timestamp": timestamp,
            "category": data.get("category", "general"),
            "tags": data.get("tags", []),
            "project": project
        }
        
        content = f"""---
{yaml.dump(metadata, default_flow_style=False)}---
{data.get("content", "")}
"""
        
        filepath.write_text(content, encoding="utf-8")
        return memory_id
        
    def get_memories(self, project=None, limit=20):
        """Get list of memories"""
        memories = []
        
        if project:
            dirs = [self.memories_dir / project]
        else:
            dirs = [d for d in self.memories_dir.iterdir() if d.is_dir()]
            
        for dir in dirs:
            if not dir.exists():
                continue
                
            for file in sorted(dir.glob("*.md"), reverse=True)[:limit]:
                content = file.read_text(encoding="utf-8")
                # Simple parsing
                if "---" in content:
                    parts = content.split("---", 2)
                    if len(parts) >= 3:
                        try:
                            metadata = yaml.safe_load(parts[1])
                            body = parts[2].strip()
                            memories.append({
                                "id": metadata.get("id", "unknown"),
                                "preview": body[:100] + "..." if len(body) > 100 else body
                            })
                        except:
                            pass
                            
        return memories[:limit]
        
    def search_memories(self, query, project=None):
        """Search memories"""
        results = []
        query_lower = query.lower()
        
        memories = self.get_memories(project, 100)
        
        # Simple search - in production, use better search
        for mem in memories:
            if query_lower in mem.get("preview", "").lower():
                results.append(mem)
                
        return results[:20]

def main():
    """Main MCP server loop"""
    server = SimpleMCP()
    
    # MCP uses JSON-RPC over stdio
    while True:
        try:
            line = sys.stdin.readline()
            if not line:
                break
                
            request = json.loads(line)
            response = server.handle_request(request)
            
            # Add JSON-RPC fields
            response["jsonrpc"] = "2.0"
            response["id"] = request.get("id")
            
            print(json.dumps(response))
            sys.stdout.flush()
            
        except Exception as e:
            error_response = {
                "jsonrpc": "2.0",
                "id": request.get("id") if 'request' in locals() else None,
                "error": {
                    "code": -32603,
                    "message": str(e)
                }
            }
            print(json.dumps(error_response))
            sys.stdout.flush()

if __name__ == "__main__":
    main()
''')
        print("✓ Created minimal MCP server")
        
    def create_launcher_scripts(self):
        """Create platform-specific launchers"""
        
        # Windows batch file
        batch_file = self.build_dir / "run.bat"
        batch_file.write_text("""@echo off
cd /d "%~dp0"
python mcp_server.py
""")
        
        # Unix shell script
        shell_file = self.build_dir / "run.sh"
        shell_file.write_text("""#!/bin/bash
cd "$(dirname "$0")"
python3 mcp_server.py
""")
        shell_file.chmod(0o755)
        
        print("✓ Created launcher scripts")
        
    def create_dxt_manifest(self):
        """Create DXT manifest for Claude Desktop"""
        manifest = {
            "dxt_version": "0.0.1",
            "name": "like-i-said-v2",
            "version": self.version,
            "description": "Like-I-Said v2 - MCP Memory Management System",
            "author": "endlessblink",
            "license": "MIT",
            "homepage": "https://github.com/endlessblink/Like-I-Said-memory-mcp-server",
            "mcp": {
                "command": "python",
                "args": ["mcp_server.py"],
                "env": {}
            },
            "requirements": {
                "python": ">=3.8"
            },
            "install_notes": "Requires Python 3.8+ installed on your system"
        }
        
        manifest_file = self.build_dir / "dxt.json"
        manifest_file.write_text(json.dumps(manifest, indent=2))
        print("✓ Created DXT manifest")
        
    def create_requirements(self):
        """Create requirements file"""
        req_file = self.build_dir / "requirements.txt"
        req_file.write_text("""pyyaml>=6.0
""")
        print("✓ Created requirements.txt")
        
    def create_readme(self):
        """Create README for the package"""
        readme = self.build_dir / "README.md"
        readme.write_text("""# Like-I-Said v2 - MCP Memory System

A memory management system for Claude Desktop using MCP (Model Context Protocol).

## Installation

1. Install Python 3.8 or higher
2. Install this DXT in Claude Desktop
3. The system will create `memories/` and `tasks/` directories on first use

## Features

- Store and retrieve memories
- Search functionality  
- Project-based organization
- Simple and reliable

## Available Tools

- `test_tool` - Test the connection
- `add_memory` - Store new memories
- `list_memories` - List stored memories
- `search_memories` - Search memories

## Usage

Once installed, you can use commands like:
- "Use test_tool to verify the connection"
- "Store this as a memory: [your content]"
- "Show me my recent memories"
- "Search for memories about Python"

## Support

Report issues at: https://github.com/endlessblink/Like-I-Said-memory-mcp-server
""")
        print("✓ Created README")
        
    def create_example_memories(self):
        """Create example memories directory structure"""
        examples_dir = self.build_dir / "memories" / "examples"
        examples_dir.mkdir(parents=True)
        
        # Create one example memory
        example = examples_dir / "welcome.md"
        example.write_text("""---
id: example-001
timestamp: 2024-01-14T12:00:00
category: general
tags: [welcome, example]
project: examples
---
Welcome to Like-I-Said v2! This is an example memory to show the format.

You can create your own memories using the add_memory tool.
""")
        print("✓ Created example memory")
        
    def build_dxt_package(self):
        """Build the final DXT package"""
        dxt_filename = f"like-i-said-v2-{self.version}.dxt"
        
        print(f"\nBuilding {dxt_filename}...")
        
        with zipfile.ZipFile(dxt_filename, 'w', zipfile.ZIP_DEFLATED) as dxt:
            # Add all files from build directory
            for file in self.build_dir.rglob('*'):
                if file.is_file():
                    arcname = file.relative_to(self.build_dir)
                    dxt.write(file, arcname)
                    
        # Get file size
        size_mb = Path(dxt_filename).stat().st_size / (1024 * 1024)
        
        print(f"\n✅ Successfully built {dxt_filename}")
        print(f"📦 Size: {size_mb:.2f} MB")
        print(f"📁 Location: {Path(dxt_filename).absolute()}")
        
        return dxt_filename
        
    def build(self):
        """Build complete production DXT"""
        print("Building production DXT for Claude Desktop...")
        print("=" * 50)
        
        self.clean_build_dir()
        self.create_minimal_mcp_server()
        self.create_launcher_scripts()
        self.create_dxt_manifest()
        self.create_requirements()
        self.create_readme()
        self.create_example_memories()
        
        dxt_file = self.build_dxt_package()
        
        print("\n" + "=" * 50)
        print("Build complete! 🎉")
        print("\nTo install in Claude Desktop:")
        print(f"1. Locate the file: {dxt_file}")
        print("2. Double-click to install in Claude Desktop")
        print("3. Make sure Python 3.8+ is installed on your system")
        print("\nThe DXT is sanitized and contains no local data.")
        
        # Clean up build directory
        shutil.rmtree(self.build_dir)
        print("\n✓ Build directory cleaned up")

if __name__ == "__main__":
    builder = ProductionDXTBuilder()
    builder.build()