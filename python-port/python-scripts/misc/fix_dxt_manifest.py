#!/usr/bin/env python3
"""
Fix DXT files to use manifest.json instead of dxt.json
"""

import zipfile
import json
from pathlib import Path
import tempfile
import shutil

def fix_dxt_manifest(dxt_path):
    """Fix a DXT file to use manifest.json"""
    dxt_file = Path(dxt_path)
    if not dxt_file.exists():
        print(f"File not found: {dxt_file}")
        return
        
    print(f"Fixing {dxt_file.name}...")
    
    # Create temporary directory
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        
        # Extract DXT
        with zipfile.ZipFile(dxt_file, 'r') as zf:
            zf.extractall(temp_path)
            
        # Find dxt.json and rename to manifest.json
        dxt_json = temp_path / "dxt.json"
        manifest_json = temp_path / "manifest.json"
        
        if dxt_json.exists():
            # Load and update manifest
            manifest_data = json.loads(dxt_json.read_text())
            
            # Ensure proper Claude Desktop format
            if "mcp" in manifest_data:
                # Fix the MCP configuration for Claude Desktop
                mcp_config = manifest_data["mcp"]
                
                # Claude Desktop expects this format
                manifest_data["mcpServers"] = {
                    manifest_data["name"]: {
                        "command": mcp_config.get("command", "python"),
                        "args": mcp_config.get("args", ["run.py"]),
                        "env": mcp_config.get("env", {})
                    }
                }
                
                # Keep original mcp for compatibility
                manifest_data["mcp"] = mcp_config
            
            # Write as manifest.json
            manifest_json.write_text(json.dumps(manifest_data, indent=2))
            print(f"  ✓ Created manifest.json")
            
            # Remove old dxt.json
            dxt_json.unlink()
            print(f"  ✓ Removed dxt.json")
        else:
            print(f"  ✗ No dxt.json found in {dxt_file}")
            return
            
        # Create new DXT file
        new_dxt = dxt_file.with_suffix('.fixed.dxt')
        with zipfile.ZipFile(new_dxt, 'w', zipfile.ZIP_DEFLATED) as zf:
            for file in temp_path.rglob('*'):
                if file.is_file():
                    arcname = file.relative_to(temp_path)
                    zf.write(file, arcname)
                    
        print(f"  ✓ Created fixed DXT: {new_dxt.name}")
        
        # Replace original
        dxt_file.unlink()
        new_dxt.rename(dxt_file)
        print(f"  ✓ Updated {dxt_file.name}")

def main():
    """Fix all DXT files in current directory"""
    current_dir = Path(".")
    dxt_files = list(current_dir.glob("*.dxt"))
    
    if not dxt_files:
        print("No DXT files found in current directory")
        return
        
    print(f"Found {len(dxt_files)} DXT files to fix...")
    print("=" * 50)
    
    for dxt_file in dxt_files:
        fix_dxt_manifest(dxt_file)
        print()
        
    print("=" * 50)
    print("All DXT files fixed! ✅")
    print("They should now work with Claude Desktop.")

if __name__ == "__main__":
    main()