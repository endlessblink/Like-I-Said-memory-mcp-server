#!/usr/bin/env python3
"""
Quick DXT extraction and testing script
"""

import zipfile
import tempfile
import shutil
import os
import json

def extract_and_examine_dxt(dxt_filename):
    """Extract a DXT file and examine its contents."""
    print(f"\n{'='*60}")
    print(f"EXTRACTING AND EXAMINING: {dxt_filename}")
    print('='*60)
    
    if not os.path.exists(dxt_filename):
        print(f"ERROR: {dxt_filename} not found")
        return
    
    # Extract to temp directory
    temp_dir = tempfile.mkdtemp(prefix=f"examine_{dxt_filename.replace('.dxt', '')}_")
    
    try:
        with zipfile.ZipFile(dxt_filename, 'r') as zip_ref:
            zip_ref.extractall(temp_dir)
        
        print(f"Extracted to: {temp_dir}")
        
        # List all files
        print("\nFILES IN DXT:")
        for root, dirs, files in os.walk(temp_dir):
            for file in files:
                filepath = os.path.join(root, file)
                rel_path = os.path.relpath(filepath, temp_dir)
                size = os.path.getsize(filepath)
                print(f"  {rel_path} ({size} bytes)")
        
        # Examine manifest.json
        manifest_path = os.path.join(temp_dir, 'manifest.json')
        if os.path.exists(manifest_path):
            print("\nMANIFEST.JSON:")
            with open(manifest_path, 'r') as f:
                manifest = json.load(f)
            print(json.dumps(manifest, indent=2))
        else:
            print("\nNo manifest.json found")
        
        # Find and examine Python server file
        server_files = []
        for root, dirs, files in os.walk(temp_dir):
            for file in files:
                if file.endswith('.py'):
                    server_files.append(os.path.join(root, file))
        
        if server_files:
            print(f"\nSERVER FILE ANALYSIS:")
            for server_file in server_files:
                print(f"\n--- {os.path.basename(server_file)} ---")
                with open(server_file, 'r') as f:
                    content = f.read()
                
                print(f"Size: {len(content)} characters")
                
                # Look for key MCP patterns
                patterns = {
                    'MCP Tools': 'list_tools',
                    'STDIO handling': 'sys.stdin',
                    'JSON-RPC': 'jsonrpc',
                    'Error handling': 'try:',
                    'Memory functions': 'add_memory',
                    'Task functions': 'create_task'
                }
                
                print("Key patterns found:")
                for pattern_name, pattern in patterns.items():
                    if pattern in content:
                        print(f"  ✓ {pattern_name}")
                    else:
                        print(f"  ✗ {pattern_name}")
                
                # Show first 20 lines
                lines = content.split('\n')
                print(f"\nFirst 20 lines:")
                for i, line in enumerate(lines[:20], 1):
                    print(f"  {i:2d}: {line}")
                
                if len(lines) > 20:
                    print(f"  ... ({len(lines) - 20} more lines)")
        
        print(f"\n\nExtracted files available at: {temp_dir}")
        print("(Directory will be cleaned up manually)")
        
    except Exception as e:
        print(f"ERROR extracting {dxt_filename}: {e}")
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)

def main():
    # Test the most promising DXT files
    promising_dxts = [
        "like-i-said-v2-protocol-compliant.dxt",  # Small and protocol compliant
        "like-i-said-v2-jsonrpc_working.dxt",    # Specifically mentions working jsonrpc
        "like-i-said-v2-multi-test.dxt"          # Test version, likely simple
    ]
    
    for dxt_file in promising_dxts:
        if os.path.exists(dxt_file):
            extract_and_examine_dxt(dxt_file)
        else:
            print(f"Skipping {dxt_file} - not found")

if __name__ == "__main__":
    main()