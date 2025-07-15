#!/usr/bin/env python3
"""
Like-I-Said v2 Python MCP Server Starter
Quick launcher with environment setup
"""

import sys
import os
from pathlib import Path

def main():
    # Add current directory to Python path for imports
    current_dir = Path(__file__).parent
    sys.path.insert(0, str(current_dir))
    
    # Set working directory
    os.chdir(current_dir)
    
    print("🚀 Starting Like-I-Said v2 Python MCP Server...", file=sys.stderr)
    print(f"📍 Working directory: {current_dir}", file=sys.stderr)
    print(f"🐍 Python: {sys.version}", file=sys.stderr)
    print("📡 Ready for MCP clients (JSON-RPC over stdio)", file=sys.stderr)
    print("=" * 50, file=sys.stderr)
    
    # Import and run the server
    try:
        from server import main as server_main
        server_main()
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user", file=sys.stderr)
    except Exception as e:
        print(f"\n❌ Server error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()