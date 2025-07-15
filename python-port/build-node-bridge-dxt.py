#!/usr/bin/env python3
"""
Build Node.js Bridge DXT
Creates a DXT package that uses Node.js to bridge to Python
"""

import zipfile
import json
import os
from pathlib import Path

def build_node_bridge_dxt():
    """Build the Node.js bridge DXT package"""
    
    # Output file
    dxt_path = "like-i-said-node-bridge.dxt"
    
    print(f"Building Node.js bridge DXT: {dxt_path}")
    
    # Files to include
    files_to_include = [
        "simple-node-bridge.js",
        "node-python-bridge.js", 
        "server/windows_robust_server.py",
        "package.json",
        "bridge-manifest.json"
    ]
    
    # Create DXT
    with zipfile.ZipFile(dxt_path, 'w', zipfile.ZIP_DEFLATED) as dxt:
        
        # Add manifest (rename from bridge-manifest.json)
        dxt.write("bridge-manifest.json", "manifest.json")
        print("✓ Added manifest.json")
        
        # Add all other files
        for file_path in files_to_include:
            if file_path == "bridge-manifest.json":
                continue  # Already added as manifest.json
                
            if os.path.exists(file_path):
                dxt.write(file_path, file_path)
                print(f"✓ Added {file_path}")
            else:
                print(f"⚠ Warning: {file_path} not found")
        
        # Add README for the bridge
        readme_content = """# Like-I-Said Node.js Bridge

This DXT package uses Node.js to bridge communication between Claude Desktop and the Python MCP server.

## Features
- Reliable stdio handling through Node.js
- Spawns Python server as child process  
- Forwards JSON-RPC messages bidirectionally
- Works around Python stdio issues on Windows

## Requirements
- Node.js 14+ installed on your system
- Python 3.7+ installed on your system

## Architecture
```
Claude Desktop <-> Node.js Bridge <-> Python MCP Server
```

The Node.js bridge handles all stdio communication while delegating MCP logic to Python.

## Tools Available
- test_connection: Test the MCP connection
- add_memory: Store a new memory
- list_memories: List stored memories

## Debug Mode
Set debug_mode to true in the DXT configuration to enable detailed logging.
"""
        
        dxt.writestr("README.md", readme_content)
        print("✓ Added README.md")
    
    print(f"\n✅ Node.js bridge DXT created: {dxt_path}")
    print(f"   Size: {os.path.getsize(dxt_path)} bytes")
    
    return dxt_path

if __name__ == "__main__":
    build_node_bridge_dxt()