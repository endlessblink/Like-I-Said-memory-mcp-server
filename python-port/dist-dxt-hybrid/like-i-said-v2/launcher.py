#!/usr/bin/env python3
"""
Intelligent launcher for Like-I-Said MCP Server
Tries multiple approaches with automatic fallback
"""

import os
import sys
import json
import subprocess
import logging
from pathlib import Path

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stderr),
        logging.FileHandler('like-i-said-launcher.log')
    ]
)
logger = logging.getLogger(__name__)

class MultiApproachLauncher:
    def __init__(self):
        self.script_dir = Path(__file__).parent
        self.approaches = [
            {
                "name": "Protocol-Compliant Python Server",
                "command": [sys.executable, str(self.script_dir / "python" / "protocol_compliant_server.py")],
                "test_import": "protocol_compliant_server",
                "requirements": ["python3"]
            },
            {
                "name": "Enhanced Node.js Bridge",
                "command": ["node", str(self.script_dir / "enhanced-bridge.js")],
                "test_command": ["node", "--version"],
                "requirements": ["node"]
            },
            {
                "name": "Minimal Python Server",
                "command": [sys.executable, str(self.script_dir / "python" / "minimal_server.py")],
                "test_import": "minimal_server",
                "requirements": ["python3"]
            },
            {
                "name": "Original Node.js Server",
                "command": ["node", str(self.script_dir / "server-markdown.js")],
                "test_command": ["node", "--version"],
                "requirements": ["node"]
            }
        ]
        
    def check_approach_availability(self, approach):
        """Check if an approach is available"""
        try:
            # Check Python import
            if "test_import" in approach:
                module_path = self.script_dir / "python" / f"{approach['test_import']}.py"
                if not module_path.exists():
                    logger.warning(f"Module not found: {module_path}")
                    return False
                    
            # Check command availability
            if "test_command" in approach:
                result = subprocess.run(
                    approach["test_command"],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                if result.returncode != 0:
                    logger.warning(f"Command failed: {' '.join(approach['test_command'])}")
                    return False
                    
            return True
        except Exception as e:
            logger.warning(f"Availability check failed for {approach['name']}: {e}")
            return False
            
    def run_diagnostic_mode(self):
        """Run diagnostic mode to help users identify issues"""
        logger.info("=== DIAGNOSTIC MODE ===")
        logger.info("Checking available approaches...")
        
        for i, approach in enumerate(self.approaches, 1):
            logger.info(f"\n{i}. {approach['name']}:")
            logger.info(f"   Command: {' '.join(approach['command'])}")
            
            available = self.check_approach_availability(approach)
            logger.info(f"   Available: {'YES' if available else 'NO'}")
            
            if not available:
                logger.info(f"   Requirements: {', '.join(approach['requirements'])}")
                
        # Check environment
        logger.info("\n=== ENVIRONMENT ===")
        logger.info(f"Python: {sys.version}")
        logger.info(f"Platform: {sys.platform}")
        logger.info(f"Script directory: {self.script_dir}")
        logger.info(f"Working directory: {os.getcwd()}")
        
        # Check for Node.js
        try:
            node_result = subprocess.run(
                ["node", "--version"],
                capture_output=True,
                text=True,
                timeout=5
            )
            logger.info(f"Node.js: {node_result.stdout.strip() if node_result.returncode == 0 else 'Not found'}")
        except:
            logger.info("Node.js: Not found")
            
    def select_best_approach(self):
        """Select the best available approach"""
        logger.info("Selecting best approach...")
        
        for approach in self.approaches:
            if self.check_approach_availability(approach):
                logger.info(f"Selected: {approach['name']}")
                return approach
                
        logger.error("No suitable approach found!")
        return None
        
    def run_server(self, approach):
        """Run the selected server approach"""
        logger.info(f"Starting {approach['name']}...")
        logger.info(f"Command: {' '.join(approach['command'])}")
        
        try:
            # Set up environment
            env = os.environ.copy()
            env['PYTHONUNBUFFERED'] = '1'
            
            # Run the server
            process = subprocess.Popen(
                approach['command'],
                env=env,
                stdout=sys.stdout,
                stderr=sys.stderr
            )
            
            # Wait for the process
            process.wait()
            
        except KeyboardInterrupt:
            logger.info("Server stopped by user")
            if process:
                process.terminate()
                process.wait()
        except Exception as e:
            logger.error(f"Server failed: {e}")
            raise
            
    def run(self):
        """Main entry point"""
        # Check for diagnostic mode
        if "--diagnostic" in sys.argv or "-d" in sys.argv:
            self.run_diagnostic_mode()
            return
            
        # Try to select and run best approach
        approach = self.select_best_approach()
        
        if not approach:
            logger.error("\nNo working approach found!")
            logger.error("Run with --diagnostic flag for more information")
            logger.error("Example: python launcher.py --diagnostic")
            sys.exit(1)
            
        # Run the selected approach
        self.run_server(approach)

if __name__ == "__main__":
    launcher = MultiApproachLauncher()
    launcher.run()
