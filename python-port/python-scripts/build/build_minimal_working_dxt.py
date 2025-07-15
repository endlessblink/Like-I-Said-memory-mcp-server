#!/usr/bin/env python3
"""
Build a minimal but perfectly working MCP server
Based on the actual MCP specification to avoid all validation errors
"""

import json
import shutil
import zipfile
from pathlib import Path

class MinimalWorkingDXTBuilder:
    def __init__(self):
        self.build_dir = Path("dxt-minimal-build")
        
    def clean_build_dir(self):
        if self.build_dir.exists():
            shutil.rmtree(self.build_dir)
        self.build_dir.mkdir()
        print("✓ Created clean build directory")
        
    def create_server_directory(self):
        server_dir = self.build_dir / "server"
        server_dir.mkdir()
        
        # Ultra-minimal MCP server that follows the spec exactly
        server_py = server_dir / "standalone_mcp_server.py"
        server_py.write_text('''#!/usr/bin/env python3
"""
Like-I-Said v2 - Minimal MCP Server
Designed to pass all Zod validations
"""

import json
import sys
import uuid
from pathlib import Path
from datetime import datetime

class MinimalMCPServer:
    def __init__(self):
        self.memories_dir = Path("memories")
        self.memories_dir.mkdir(exist_ok=True)
        
    def handle_message(self, message):
        method = message.get("method", "")
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
                        "version": "1.0.0"
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
                            "name": "test_connection",
                            "description": "Test the MCP connection",
                            "inputSchema": {
                                "type": "object",
                                "properties": {
                                    "message": {"type": "string"}
                                }
                            }
                        },
                        {
                            "name": "add_memory",
                            "description": "Store a memory",
                            "inputSchema": {
                                "type": "object", 
                                "properties": {
                                    "content": {"type": "string"}
                                },
                                "required": ["content"]
                            }
                        }
                    ]
                }
            }
            
        elif method == "tools/call":
            tool_name = params.get("name", "")
            arguments = params.get("arguments", {})
            
            if tool_name == "test_connection":
                message_text = arguments.get("message", "test")
                return {
                    "jsonrpc": "2.0",
                    "id": msg_id,
                    "result": {
                        "content": [
                            {
                                "type": "text",
                                "text": f"✅ Like-I-Said v2 is working! Message: {message_text}"
                            }
                        ]
                    }
                }
                
            elif tool_name == "add_memory":
                content = arguments.get("content", "")
                if content:
                    memory_id = f"mem-{uuid.uuid4().hex[:8]}"
                    
                    # Save to simple text file
                    memory_file = self.memories_dir / f"{memory_id}.txt"
                    memory_file.write_text(f"ID: {memory_id}\\nContent: {content}", encoding="utf-8")
                    
                    return {
                        "jsonrpc": "2.0",
                        "id": msg_id,
                        "result": {
                            "content": [
                                {
                                    "type": "text",
                                    "text": f"✅ Memory saved with ID: {memory_id}"
                                }
                            ]
                        }
                    }
                else:
                    return {
                        "jsonrpc": "2.0",
                        "id": msg_id,
                        "error": {
                            "code": -32602,
                            "message": "Content is required"
                        }
                    }
            
            return {
                "jsonrpc": "2.0",
                "id": msg_id,
                "error": {
                    "code": -32601,
                    "message": f"Unknown tool: {tool_name}"
                }
            }
            
        return {
            "jsonrpc": "2.0",
            "id": msg_id,
            "error": {
                "code": -32601,
                "message": f"Unknown method: {method}"
            }
        }

def main():
    server = MinimalMCPServer()
    
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
        
        print("✓ Created minimal MCP server")
        
    def create_manifest(self):
        manifest = {
            "dxt_version": "0.1",
            "name": "like-i-said-v2",
            "version": "1.0.2",
            "description": "Memory management for Claude Desktop",
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
                        "PYTHONUNBUFFERED": "1"
                    }
                }
            },
            "requirements": {
                "python": ">=3.8"
            },
            "tools": [
                {
                    "name": "test_connection",
                    "description": "Test MCP connection"
                },
                {
                    "name": "add_memory", 
                    "description": "Store a memory"
                }
            ]
        }
        
        manifest_file = self.build_dir / "manifest.json"
        manifest_file.write_text(json.dumps(manifest, indent=2))
        print("✓ Created minimal manifest.json")
        
    def create_readme(self):
        readme = self.build_dir / "README.md"
        readme.write_text("""# Like-I-Said v2 - Minimal

Minimal memory management for Claude Desktop.

## Tools

- `test_connection` - Test if MCP is working
- `add_memory` - Store a memory

## Usage

1. Install DXT in Claude Desktop
2. Use tools: "Use test_connection to verify it works"
3. Store memories: "Use add_memory with content 'your memory here'"

Requires Python 3.8+
""")
        print("✓ Created README")
        
    def build_dxt(self):
        dxt_filename = "like-i-said-v2-minimal.dxt"
        
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
        print("Building Minimal Like-I-Said v2 DXT...")
        print("=" * 40)
        
        self.clean_build_dir()
        self.create_server_directory()
        self.create_manifest()
        self.create_readme()
        
        dxt_file = self.build_dxt()
        
        print("\\n" + "=" * 40)
        print("✅ MINIMAL DXT READY!")
        print("\\nThis is the simplest possible working version.")
        print("Should eliminate all Zod validation errors.")
        
        shutil.rmtree(self.build_dir)
        print("✓ Build directory cleaned")

if __name__ == "__main__":
    builder = MinimalWorkingDXTBuilder()
    builder.build()