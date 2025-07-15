#!/usr/bin/env python3
"""
Build a DXT that exactly follows Claude Desktop's specification
Based on the error messages, we need to fix the manifest structure
"""

import os
import json
import shutil
import zipfile
from pathlib import Path

class ProperDXTBuilder:
    def __init__(self):
        self.build_dir = Path("dxt-proper-build")
        
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
import os
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
                                "description": "Test MCP connection",
                                "inputSchema": {
                                    "type": "object",
                                    "properties": {
                                        "message": {"type": "string", "description": "Test message"}
                                    }
                                }
                            },
                            {
                                "name": "add_memory",
                                "description": "Store a new memory",
                                "inputSchema": {
                                    "type": "object",
                                    "properties": {
                                        "content": {"type": "string", "description": "Memory content"},
                                        "category": {"type": "string", "description": "Memory category"}
                                    },
                                    "required": ["content"]
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
                                    "text": f"✅ Like-I-Said v2 is working! Message: {arguments.get('message', 'test')}"
                                }
                            ]
                        }
                    }
                    
                elif tool_name == "add_memory":
                    memory_id = self.save_simple_memory(arguments)
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
            
    def save_simple_memory(self, data):
        """Save memory to simple text file"""
        memory_id = f"mem-{uuid.uuid4().hex[:8]}"
        timestamp = datetime.now().isoformat()
        
        filename = f"{memory_id}.txt"
        filepath = self.memories_dir / "default" / filename
        
        content = f"ID: {memory_id}\\nTime: {timestamp}\\nCategory: {data.get('category', 'general')}\\n\\n{data.get('content', '')}"
        
        filepath.write_text(content, encoding="utf-8")
        return memory_id

def main():
    """Main MCP server loop"""
    server = LikeISaidMCP()
    
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
        
        print("✓ Created simple MCP server script")
        
    def create_manifest(self):
        """Create Claude Desktop manifest.json with exact required fields"""
        manifest = {
            "dxt_version": "0.0.1",
            "version": "1.0.0",
            "author": "endlessblink",
            "user_config": []
        }
        
        manifest_file = self.build_dir / "manifest.json"
        manifest_file.write_text(json.dumps(manifest, indent=2))
        print("✓ Created minimal manifest.json")
        
    def create_mcp_config(self):
        """Create separate MCP configuration file"""
        mcp_config = {
            "mcpServers": {
                "like-i-said-v2": {
                    "command": "python",
                    "args": ["server.py"]
                }
            }
        }
        
        config_file = self.build_dir / "mcp_config.json"
        config_file.write_text(json.dumps(mcp_config, indent=2))
        print("✓ Created MCP configuration")
        
    def create_readme(self):
        """Create simple README"""
        readme = self.build_dir / "README.md"
        readme.write_text("""# Like-I-Said v2

Simple memory management for Claude Desktop.

## Installation
1. Install this DXT in Claude Desktop
2. Test with: "Use test_connection to check if it works"
3. Save memories with: "Use add_memory to store this: your content here"

Requires Python 3.8+
""")
        
        print("✓ Created README")
        
    def build_dxt(self):
        """Build the DXT package"""
        dxt_filename = "like-i-said-v2-working.dxt"
        
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
        print("Building working DXT for Claude Desktop...")
        print("=" * 40)
        
        self.clean_build_dir()
        self.create_server_script()
        self.create_manifest()
        self.create_mcp_config()
        self.create_readme()
        
        dxt_file = self.build_dxt()
        
        print("\\n" + "=" * 40)
        print("✅ Working DXT created!")
        print("This should install without manifest errors.")
        
        # Cleanup
        shutil.rmtree(self.build_dir)
        print("✓ Build directory cleaned")

if __name__ == "__main__":
    builder = ProperDXTBuilder()
    builder.build()