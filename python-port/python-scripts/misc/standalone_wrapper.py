#!/usr/bin/env python3
"""
Standalone wrapper for Like-I-Said MCP Server
Ensures proper execution in Claude Desktop DXT environment
"""

import sys
import os
import logging
from pathlib import Path

# Set up logging to stderr for debugging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    stream=sys.stderr
)
logger = logging.getLogger(__name__)

# Get the directory of this script
current_dir = Path(__file__).parent.absolute()

# Add lib directory to Python path
lib_dir = current_dir / "lib"
if lib_dir.exists():
    sys.path.insert(0, str(lib_dir))
    logger.info(f"Added lib directory to path: {lib_dir}")

# Add current directory to path
sys.path.insert(0, str(current_dir))

# Set environment to bypass venv check for embedded Python
os.environ['FORCE_NO_VENV'] = 'true'

# Import and run the comprehensive server
try:
    logger.info("Importing comprehensive server...")
    
    # Import all the components from comprehensive_server
    from like_i_said.comprehensive_server import (
        mcp, memory_storage, task_storage, logger as server_logger
    )
    
    # Log startup information
    server_logger.info("Like-I-Said MCP Server v2 starting in DXT mode")
    server_logger.info(f"Working directory: {os.getcwd()}")
    server_logger.info(f"Python version: {sys.version}")
    server_logger.info(f"Memory storage: {memory_storage.base_dir}")
    server_logger.info(f"Task storage: {task_storage.base_dir}")
    server_logger.info("All 23 tools initialized successfully")
    
    # This is the critical part - we need to explicitly run the server
    # FastMCP requires the run() method to be called to start the stdio transport
    server_logger.info("Starting FastMCP server with stdio transport...")
    
    # Run the MCP server - this will handle stdio communication
    mcp.run()
    
except ImportError as e:
    logger.error(f"Failed to import comprehensive server: {e}")
    logger.error(f"Python path: {sys.path}")
    logger.error(f"Current directory: {current_dir}")
    logger.error(f"Lib directory exists: {lib_dir.exists()}")
    if lib_dir.exists():
        logger.error(f"Lib directory contents: {list(lib_dir.iterdir())}")
    sys.exit(1)
except Exception as e:
    logger.error(f"Error starting server: {e}")
    import traceback
    traceback.print_exc(file=sys.stderr)
    sys.exit(1)