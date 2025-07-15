#!/usr/bin/env python3
"""
Build a debug DXT that will help us understand the exact Zod validation issues
"""

import json
import shutil
import zipfile
from pathlib import Path

class DebugDXTBuilder:
    def __init__(self):
        self.build_dir = Path("dxt-debug-build")
        
    def clean_build_dir(self):
        if self.build_dir.exists():
            shutil.rmtree(self.build_dir)
        self.build_dir.mkdir()
        print("✓ Created debug build directory")
        
    def create_server_directory(self):
        server_dir = self.build_dir / "server"
        server_dir.mkdir()
        
        # Copy our debug script
        debug_script = Path("debug_mcp_messages.py")
        if debug_script.exists():
            shutil.copy2(debug_script, server_dir / "standalone_mcp_server.py")
        else:
            # Create inline debug server
            (server_dir / "standalone_mcp_server.py").write_text('''#!/usr/bin/env python3
"""Debug MCP Server - logs all message exchanges"""

import json
import sys

class DebugServer:
    def __init__(self):
        self.msg_count = 0
        
    def log(self, direction, msg):
        self.msg_count += 1
        print(f"MSG {self.msg_count} ({direction}): {json.dumps(msg)}", file=sys.stderr)
        sys.stderr.flush()
        
    def handle(self, req):
        self.log("IN", req)
        
        method = req.get("method", "")
        req_id = req.get("id")
        
        if method == "initialize":
            resp = {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {},
                    "serverInfo": {"name": "debug", "version": "1.0"}
                }
            }
        elif method == "tools/list":
            resp = {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {"tools": []}
            }
        else:
            resp = {
                "jsonrpc": "2.0", 
                "id": req_id,
                "error": {"code": -32601, "message": f"Unknown: {method}"}
            }
            
        self.log("OUT", resp)
        return resp

def main():
    server = DebugServer()
    print("DEBUG MCP SERVER STARTED", file=sys.stderr)
    
    for line in sys.stdin:
        try:
            req = json.loads(line.strip())
            resp = server.handle(req)
            print(json.dumps(resp))
            sys.stdout.flush()
        except Exception as e:
            print(f"ERROR: {e}", file=sys.stderr)

if __name__ == "__main__":
    main()
''')
        
        print("✓ Created debug MCP server")
        
    def create_manifest(self):
        manifest = {
            "dxt_version": "0.1",
            "name": "like-i-said-debug",
            "version": "0.1.0",
            "description": "Debug MCP server to analyze Zod validation issues",
            "author": {"name": "endlessblink"},
            "server": {
                "type": "python",
                "entry_point": "server/standalone_mcp_server.py",
                "mcp_config": {
                    "command": "python",
                    "args": ["${__dirname}/server/standalone_mcp_server.py"],
                    "env": {"PYTHONUNBUFFERED": "1"}
                }
            },
            "requirements": {"python": ">=3.8"},
            "tools": []
        }
        
        (self.build_dir / "manifest.json").write_text(json.dumps(manifest, indent=2))
        print("✓ Created debug manifest")
        
    def build_dxt(self):
        dxt_filename = "like-i-said-debug.dxt"
        
        with zipfile.ZipFile(dxt_filename, 'w', zipfile.ZIP_DEFLATED) as dxt:
            for file in self.build_dir.rglob('*'):
                if file.is_file():
                    arcname = file.relative_to(self.build_dir)
                    dxt.write(file, arcname)
                    
        print(f"✅ Built debug DXT: {Path(dxt_filename).absolute()}")
        return dxt_filename
        
    def build(self):
        print("Building Debug DXT...")
        print("=" * 30)
        
        self.clean_build_dir()
        self.create_server_directory()
        self.create_manifest()
        dxt_file = self.build_dxt()
        
        print("\\n" + "=" * 30)
        print("🐛 DEBUG DXT READY!")
        print("\\nThis will log every message exchange to help identify")
        print("exactly what data structure is causing Zod validation errors.")
        print("\\nInstall it and check the browser console + Claude Desktop logs.")
        
        shutil.rmtree(self.build_dir)
        print("✓ Cleaned up")

if __name__ == "__main__":
    builder = DebugDXTBuilder()
    builder.build()