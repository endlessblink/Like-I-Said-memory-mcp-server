#!/usr/bin/env python3
"""
Build a FastMCP-based DXT for Claude Desktop.
This version uses the FastMCP framework for better MCP compliance.
"""

import os
import json
import shutil
import zipfile
from pathlib import Path
from datetime import datetime

class FastMCPDXTBuilder:
    def __init__(self):
        self.build_dir = Path("dxt-fastmcp-build")
        self.version = "2.1.0"
        
    def clean_build_dir(self):
        """Start with clean build directory"""
        if self.build_dir.exists():
            shutil.rmtree(self.build_dir)
        self.build_dir.mkdir()
        print("✓ Created clean build directory")
        
    def create_fastmcp_server(self):
        """Create FastMCP-based server"""
        server_dir = self.build_dir / "like_i_said"
        server_dir.mkdir()
        
        # __init__.py
        (server_dir / "__init__.py").write_text('"""Like-I-Said v2 - FastMCP Edition"""')
        
        # Main server file
        server_py = server_dir / "server.py"
        server_py.write_text('''#!/usr/bin/env python3
"""
Like-I-Said v2 - FastMCP Server
Production version without local data.
"""

import os
import sys
import json
import uuid
import yaml
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Any

try:
    from fastmcp import FastMCP
except ImportError:
    print("ERROR: FastMCP not installed. Please run: pip install fastmcp", file=sys.stderr)
    sys.exit(1)

# Initialize FastMCP
mcp = FastMCP("like-i-said-v2")
mcp.description = "Memory management system for AI assistants"

# Storage directories
MEMORIES_DIR = Path("memories")
TASKS_DIR = Path("tasks")

def ensure_directories():
    """Create storage directories"""
    MEMORIES_DIR.mkdir(exist_ok=True)
    (MEMORIES_DIR / "default").mkdir(exist_ok=True)
    TASKS_DIR.mkdir(exist_ok=True)
    (TASKS_DIR / "default").mkdir(exist_ok=True)

# Ensure directories on import
ensure_directories()

@mcp.tool()
async def test_tool(message: str) -> Dict[str, str]:
    """Test MCP connection"""
    return {
        "response": f"MCP Server received: {message}",
        "status": "connected",
        "version": "2.1.0"
    }

@mcp.tool()
async def add_memory(
    content: str,
    project: str = "default",
    tags: List[str] = None,
    category: str = "general"
) -> Dict[str, Any]:
    """Store a new memory"""
    memory_id = f"mem-{uuid.uuid4().hex[:8]}"
    timestamp = datetime.now().isoformat()
    
    # Create project directory
    project_dir = MEMORIES_DIR / project
    project_dir.mkdir(exist_ok=True)
    
    # Prepare metadata
    metadata = {
        "id": memory_id,
        "timestamp": timestamp,
        "category": category,
        "tags": tags or [],
        "project": project
    }
    
    # Create filename
    date_str = timestamp.split("T")[0]
    filename = f"{date_str}-{memory_id}.md"
    filepath = project_dir / filename
    
    # Write memory file
    yaml_content = yaml.dump(metadata, default_flow_style=False)
    file_content = f"""---
{yaml_content}---
{content}
"""
    
    filepath.write_text(file_content, encoding="utf-8")
    
    return {
        "id": memory_id,
        "message": f"Memory stored successfully",
        "project": project,
        "timestamp": timestamp
    }

@mcp.tool()
async def list_memories(
    project: Optional[str] = None,
    limit: int = 20
) -> Dict[str, Any]:
    """List stored memories"""
    memories = []
    
    # Determine directories to search
    if project:
        search_dirs = [MEMORIES_DIR / project]
    else:
        search_dirs = [d for d in MEMORIES_DIR.iterdir() if d.is_dir()]
    
    # Collect memories
    for dir_path in search_dirs:
        if not dir_path.exists():
            continue
            
        for mem_file in sorted(dir_path.glob("*.md"), reverse=True):
            if len(memories) >= limit:
                break
                
            try:
                content = mem_file.read_text(encoding="utf-8")
                
                # Parse YAML frontmatter
                if content.startswith("---"):
                    parts = content.split("---", 2)
                    if len(parts) >= 3:
                        metadata = yaml.safe_load(parts[1])
                        body = parts[2].strip()
                        
                        memories.append({
                            "id": metadata.get("id"),
                            "timestamp": metadata.get("timestamp"),
                            "category": metadata.get("category"),
                            "tags": metadata.get("tags", []),
                            "project": dir_path.name,
                            "preview": body[:100] + "..." if len(body) > 100 else body
                        })
            except Exception:
                continue
    
    return {
        "memories": memories[:limit],
        "count": len(memories),
        "limit": limit
    }

@mcp.tool()
async def search_memories(
    query: str,
    project: Optional[str] = None
) -> Dict[str, Any]:
    """Search memories by content"""
    all_memories = await list_memories(project=project, limit=1000)
    memories = all_memories.get("memories", [])
    
    # Simple keyword search
    query_lower = query.lower()
    results = []
    
    for memory in memories:
        preview_lower = memory.get("preview", "").lower()
        tags = [t.lower() for t in memory.get("tags", [])]
        category = memory.get("category", "").lower()
        
        # Check if query matches content, tags, or category
        if (query_lower in preview_lower or 
            any(query_lower in tag for tag in tags) or
            query_lower in category):
            results.append(memory)
    
    return {
        "results": results[:20],
        "count": len(results),
        "query": query
    }

@mcp.tool()
async def get_memory(id: str) -> Optional[Dict[str, Any]]:
    """Get a specific memory by ID"""
    # Search all projects for the memory
    for project_dir in MEMORIES_DIR.iterdir():
        if not project_dir.is_dir():
            continue
            
        for mem_file in project_dir.glob("*.md"):
            try:
                content = mem_file.read_text(encoding="utf-8")
                
                if content.startswith("---"):
                    parts = content.split("---", 2)
                    if len(parts) >= 3:
                        metadata = yaml.safe_load(parts[1])
                        
                        if metadata.get("id") == id:
                            body = parts[2].strip()
                            return {
                                "id": id,
                                "content": body,
                                "metadata": metadata,
                                "project": project_dir.name
                            }
            except Exception:
                continue
                
    return None

@mcp.tool()
async def delete_memory(id: str) -> Dict[str, str]:
    """Delete a memory by ID"""
    # Find and delete the memory
    for project_dir in MEMORIES_DIR.iterdir():
        if not project_dir.is_dir():
            continue
            
        for mem_file in project_dir.glob("*.md"):
            try:
                content = mem_file.read_text(encoding="utf-8")
                
                if f"id: {id}" in content:
                    mem_file.unlink()
                    return {"message": f"Memory {id} deleted successfully"}
            except Exception:
                continue
                
    return {"error": f"Memory {id} not found"}

def main():
    """Run the FastMCP server"""
    print("Starting Like-I-Said v2 FastMCP Server...", file=sys.stderr)
    mcp.run()

if __name__ == "__main__":
    main()
''')
        
        # Create run script
        run_py = self.build_dir / "run.py"
        run_py.write_text('''#!/usr/bin/env python3
import sys
from like_i_said.server import main

if __name__ == "__main__":
    main()
''')
        
        print("✓ Created FastMCP server")
        
    def create_setup_files(self):
        """Create setup.py and requirements"""
        
        # setup.py
        setup_py = self.build_dir / "setup.py"
        setup_py.write_text('''from setuptools import setup, find_packages

setup(
    name="like-i-said-v2",
    version="2.1.0",
    packages=find_packages(),
    install_requires=[
        "fastmcp>=0.1.0",
        "pyyaml>=6.0",
    ],
    python_requires=">=3.8",
)
''')
        
        # requirements.txt
        req_file = self.build_dir / "requirements.txt"
        req_file.write_text("""fastmcp>=0.1.0
pyyaml>=6.0
""")
        
        print("✓ Created setup files")
        
    def create_install_script(self):
        """Create installation helper"""
        install_bat = self.build_dir / "install.bat"
        install_bat.write_text("""@echo off
echo Installing Like-I-Said v2 dependencies...
pip install -r requirements.txt
echo Installation complete!
pause
""")
        
        install_sh = self.build_dir / "install.sh"
        install_sh.write_text("""#!/bin/bash
echo "Installing Like-I-Said v2 dependencies..."
pip install -r requirements.txt
echo "Installation complete!"
""")
        install_sh.chmod(0o755)
        
        print("✓ Created install scripts")
        
    def create_dxt_manifest(self):
        """Create DXT manifest"""
        manifest = {
            "dxt_version": "0.0.1",
            "name": "like-i-said-v2-fastmcp",
            "version": self.version,
            "description": "Like-I-Said v2 - FastMCP Memory Management for Claude Desktop",
            "author": "endlessblink",
            "license": "MIT",
            "homepage": "https://github.com/endlessblink/Like-I-Said-memory-mcp-server",
            "mcp": {
                "command": "python",
                "args": ["-m", "like_i_said.server"],
                "env": {
                    "PYTHONUNBUFFERED": "1"
                }
            },
            "requirements": {
                "python": ">=3.8"
            },
            "dependencies": {
                "pip": ["fastmcp>=0.1.0", "pyyaml>=6.0"]
            }
        }
        
        manifest_file = self.build_dir / "dxt.json"
        manifest_file.write_text(json.dumps(manifest, indent=2))
        print("✓ Created DXT manifest")
        
    def create_documentation(self):
        """Create user documentation"""
        readme = self.build_dir / "README.md"
        readme.write_text("""# Like-I-Said v2 - FastMCP Edition

Advanced memory management system for Claude Desktop using FastMCP.

## Quick Start

1. **Install Dependencies** (one time only):
   - Windows: Double-click `install.bat`
   - Mac/Linux: Run `./install.sh`

2. **Use in Claude Desktop**:
   The DXT will be automatically available after installation.

## Available Tools

### Memory Management
- `test_tool` - Test the MCP connection
- `add_memory` - Store new memories with categorization
- `list_memories` - List your stored memories
- `search_memories` - Search through memories
- `get_memory` - Retrieve a specific memory
- `delete_memory` - Delete a memory

## Example Usage

```
"Test the MCP connection with message 'Hello'"
"Store this as a memory: Important meeting notes from today"
"List my recent memories"
"Search memories for 'Python'"
"Get memory with ID mem-12345678"
```

## Features

- 🧠 Intelligent categorization
- 🏷️ Tag support
- 📁 Project-based organization
- 🔍 Full-text search
- 💾 Markdown-based storage
- 🔒 Privacy-focused (all data stored locally)

## Storage

Memories are stored in the `memories/` directory as markdown files with YAML frontmatter.

## Support

- GitHub: https://github.com/endlessblink/Like-I-Said-memory-mcp-server
- Version: 2.1.0 (FastMCP Edition)
""")
        
        print("✓ Created documentation")
        
    def build_dxt_package(self):
        """Build the final DXT"""
        dxt_filename = f"like-i-said-v2-fastmcp-{self.version}.dxt"
        
        print(f"\nBuilding {dxt_filename}...")
        
        with zipfile.ZipFile(dxt_filename, 'w', zipfile.ZIP_DEFLATED) as dxt:
            for file in self.build_dir.rglob('*'):
                if file.is_file():
                    arcname = file.relative_to(self.build_dir)
                    dxt.write(file, arcname)
                    
        size_mb = Path(dxt_filename).stat().st_size / (1024 * 1024)
        
        print(f"\n✅ Successfully built {dxt_filename}")
        print(f"📦 Size: {size_mb:.2f} MB")
        print(f"📁 Location: {Path(dxt_filename).absolute()}")
        
        return dxt_filename
        
    def build(self):
        """Build complete FastMCP DXT"""
        print("Building FastMCP-based DXT for Claude Desktop...")
        print("=" * 50)
        
        self.clean_build_dir()
        self.create_fastmcp_server()
        self.create_setup_files()
        self.create_install_script()
        self.create_dxt_manifest()
        self.create_documentation()
        
        dxt_file = self.build_dxt_package()
        
        print("\n" + "=" * 50)
        print("FastMCP DXT build complete! 🎉")
        print("\nInstallation steps:")
        print("1. Install in Claude Desktop")
        print("2. Run the install script to get FastMCP")
        print("3. Start using Like-I-Said v2!")
        print("\nThis DXT is clean and contains no local data.")
        
        # Clean up
        shutil.rmtree(self.build_dir)
        print("\n✓ Build directory cleaned up")

if __name__ == "__main__":
    builder = FastMCPDXTBuilder()
    builder.build()