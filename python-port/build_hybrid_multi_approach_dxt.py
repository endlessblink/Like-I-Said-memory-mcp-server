#!/usr/bin/env python3
"""
Build a hybrid multi-approach DXT package that includes multiple execution strategies
with automatic fallback mechanisms for maximum compatibility.
"""

import os
import sys
import json
import shutil
import zipfile
import logging
import tempfile
from pathlib import Path
from datetime import datetime

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class HybridDXTBuilder:
    def __init__(self):
        self.root_dir = Path(__file__).parent.parent
        self.python_port_dir = Path(__file__).parent
        self.build_dir = self.python_port_dir / "dist-dxt-hybrid"
        self.dxt_content_dir = self.build_dir / "like-i-said-v2"
        self.output_file = self.python_port_dir / "like-i-said-hybrid-multi.dxt"
        
    def clean_build_directory(self):
        """Clean and create build directory"""
        if self.build_dir.exists():
            shutil.rmtree(self.build_dir)
        self.build_dir.mkdir(parents=True)
        self.dxt_content_dir.mkdir(parents=True)
        logger.info(f"Created build directory: {self.build_dir}")
        
    def create_launcher_script(self):
        """Create intelligent launcher that tries multiple approaches"""
        launcher_content = '''#!/usr/bin/env python3
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
            logger.info(f"\\n{i}. {approach['name']}:")
            logger.info(f"   Command: {' '.join(approach['command'])}")
            
            available = self.check_approach_availability(approach)
            logger.info(f"   Available: {'YES' if available else 'NO'}")
            
            if not available:
                logger.info(f"   Requirements: {', '.join(approach['requirements'])}")
                
        # Check environment
        logger.info("\\n=== ENVIRONMENT ===")
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
            logger.error("\\nNo working approach found!")
            logger.error("Run with --diagnostic flag for more information")
            logger.error("Example: python launcher.py --diagnostic")
            sys.exit(1)
            
        # Run the selected approach
        self.run_server(approach)

if __name__ == "__main__":
    launcher = MultiApproachLauncher()
    launcher.run()
'''
        
        launcher_path = self.dxt_content_dir / "launcher.py"
        launcher_path.write_text(launcher_content)
        launcher_path.chmod(0o755)
        logger.info("Created intelligent launcher script")
        
    def create_enhanced_bridge(self):
        """Create enhanced Node.js bridge with better error handling"""
        bridge_content = '''#!/usr/bin/env node
/**
 * Enhanced Node.js bridge for Like-I-Said MCP Server
 * Provides fallback execution with comprehensive error handling
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class EnhancedBridge {
    constructor() {
        this.scriptDir = __dirname;
        this.logFile = path.join(this.scriptDir, 'enhanced-bridge.log');
        this.setupLogging();
    }
    
    setupLogging() {
        // Create log stream
        this.logStream = fs.createWriteStream(this.logFile, { flags: 'a' });
        
        // Override console methods to also write to file
        const originalLog = console.log;
        const originalError = console.error;
        
        console.log = (...args) => {
            const message = args.join(' ');
            this.logStream.write(`[${new Date().toISOString()}] INFO: ${message}\\n`);
            originalLog.apply(console, args);
        };
        
        console.error = (...args) => {
            const message = args.join(' ');
            this.logStream.write(`[${new Date().toISOString()}] ERROR: ${message}\\n`);
            originalError.apply(console, args);
        };
    }
    
    findPython() {
        // Try to find Python executable
        const pythonCommands = ['python3', 'python', 'py'];
        
        for (const cmd of pythonCommands) {
            try {
                const result = require('child_process').execSync(`${cmd} --version`, {
                    encoding: 'utf8',
                    stdio: 'pipe'
                });
                console.log(`Found Python: ${cmd} - ${result.trim()}`);
                return cmd;
            } catch (e) {
                // Continue trying
            }
        }
        
        throw new Error('Python not found');
    }
    
    async runPythonServer() {
        const python = this.findPython();
        const serverPath = path.join(this.scriptDir, 'python', 'protocol_compliant_server.py');
        
        console.log(`Starting Python server: ${python} ${serverPath}`);
        
        const pythonProcess = spawn(python, [serverPath], {
            env: { ...process.env, PYTHONUNBUFFERED: '1' },
            stdio: 'inherit'
        });
        
        pythonProcess.on('error', (error) => {
            console.error(`Python server error: ${error.message}`);
            this.fallbackToNodeServer();
        });
        
        pythonProcess.on('exit', (code) => {
            if (code !== 0) {
                console.error(`Python server exited with code ${code}`);
                this.fallbackToNodeServer();
            }
        });
        
        // Handle process termination
        process.on('SIGINT', () => {
            pythonProcess.kill('SIGINT');
            process.exit(0);
        });
        
        process.on('SIGTERM', () => {
            pythonProcess.kill('SIGTERM');
            process.exit(0);
        });
    }
    
    fallbackToNodeServer() {
        console.log('Falling back to Node.js server...');
        
        const serverPath = path.join(this.scriptDir, 'server-markdown.js');
        
        if (!fs.existsSync(serverPath)) {
            console.error('Node.js server not found!');
            process.exit(1);
        }
        
        // Run the original Node.js server
        require(serverPath);
    }
    
    run() {
        console.log('Enhanced Bridge starting...');
        console.log(`Script directory: ${this.scriptDir}`);
        console.log(`Log file: ${this.logFile}`);
        
        try {
            this.runPythonServer();
        } catch (error) {
            console.error(`Failed to start Python server: ${error.message}`);
            this.fallbackToNodeServer();
        }
    }
}

// Run the bridge
const bridge = new EnhancedBridge();
bridge.run();
'''
        
        bridge_path = self.dxt_content_dir / "enhanced-bridge.js"
        bridge_path.write_text(bridge_content)
        bridge_path.chmod(0o755)
        logger.info("Created enhanced Node.js bridge")
        
    def copy_python_servers(self):
        """Copy Python server implementations"""
        python_dir = self.dxt_content_dir / "python"
        python_dir.mkdir(exist_ok=True)
        
        # Copy protocol-compliant server
        protocol_server = self.python_port_dir / "server" / "windows_robust_server.py"
        if protocol_server.exists():
            shutil.copy2(protocol_server, python_dir / "protocol_compliant_server.py")
            logger.info("Copied protocol-compliant Python server")
        else:
            logger.warning(f"Protocol server not found at {protocol_server}")
            
        # Copy minimal server (use the simple test server from jsonrpc_analysis)
        minimal_server = self.python_port_dir / "jsonrpc_analysis" / "server" / "standalone_mcp_server.py"
        if minimal_server.exists():
            shutil.copy2(minimal_server, python_dir / "minimal_server.py")
            logger.info("Copied minimal Python server")
        else:
            logger.warning(f"Minimal server not found at {minimal_server}")
            
        # Create a simple test server as ultimate fallback
        test_server_content = '''#!/usr/bin/env python3
"""Minimal test server for Like-I-Said"""
import sys
import json

def main():
    # Simple echo server for testing
    for line in sys.stdin:
        try:
            request = json.loads(line)
            response = {
                "jsonrpc": "2.0",
                "id": request.get("id"),
                "result": {"message": "Test server active"}
            }
            print(json.dumps(response))
            sys.stdout.flush()
        except:
            pass

if __name__ == "__main__":
    main()
'''
        
        test_server_path = python_dir / "test_server.py"
        test_server_path.write_text(test_server_content)
        test_server_path.chmod(0o755)
        
    def copy_nodejs_components(self):
        """Copy Node.js components"""
        # Copy original server
        server_path = self.root_dir / "server-markdown.js"
        if server_path.exists():
            shutil.copy2(server_path, self.dxt_content_dir)
            logger.info("Copied original Node.js server")
            
        # Copy lib directory
        lib_source = self.root_dir / "lib"
        lib_dest = self.dxt_content_dir / "lib"
        if lib_source.exists():
            shutil.copytree(lib_source, lib_dest, dirs_exist_ok=True)
            logger.info("Copied lib directory")
            
        # Copy package.json
        package_json_path = self.root_dir / "package.json"
        if package_json_path.exists():
            shutil.copy2(package_json_path, self.dxt_content_dir)
            logger.info("Copied package.json")
            
    def create_adaptive_manifest(self):
        """Create manifest that adapts to different environments"""
        manifest = {
            "manifest_version": "1.0.0",
            "name": "Like-I-Said MCP Server (Hybrid Multi-Approach)",
            "description": "Advanced memory & task management with automatic fallback strategies",
            "version": "2.4.3-hybrid",
            "author": "EndlessBlink",
            "license": "MIT",
            "homepage": "https://github.com/endlessblink/Like-I-Said-memory-mcp-server",
            
            "mcp": {
                "version": "0.1.0",
                "transport": ["stdio"],
                "commands": {
                    "default": {
                        "command": "python3",
                        "args": ["launcher.py"],
                        "description": "Intelligent launcher with automatic fallback"
                    },
                    "diagnostic": {
                        "command": "python3",
                        "args": ["launcher.py", "--diagnostic"],
                        "description": "Run diagnostic mode"
                    },
                    "python": {
                        "command": "python3",
                        "args": ["python/protocol_compliant_server.py"],
                        "description": "Direct Python server"
                    },
                    "node": {
                        "command": "node",
                        "args": ["enhanced-bridge.js"],
                        "description": "Enhanced Node.js bridge"
                    },
                    "original": {
                        "command": "node",
                        "args": ["server-markdown.js"],
                        "description": "Original Node.js server"
                    }
                }
            },
            
            "tools": [
                {
                    "name": "add_memory",
                    "description": "Store information with auto-categorization",
                    "input_schema": {
                        "type": "object",
                        "properties": {
                            "content": {"type": "string"},
                            "project": {"type": "string"},
                            "category": {"type": "string"},
                            "tags": {"type": "array", "items": {"type": "string"}},
                            "priority": {"type": "string", "enum": ["low", "medium", "high"]},
                            "status": {"type": "string", "enum": ["active", "archived", "reference"]},
                            "related_memories": {"type": "array", "items": {"type": "string"}},
                            "language": {"type": "string"}
                        },
                        "required": ["content"]
                    }
                },
                {
                    "name": "search_memories",
                    "description": "Search memories with advanced filtering",
                    "input_schema": {
                        "type": "object",
                        "properties": {
                            "query": {"type": "string"},
                            "project": {"type": "string"}
                        },
                        "required": ["query"]
                    }
                },
                {
                    "name": "list_memories",
                    "description": "List all memories with filtering",
                    "input_schema": {
                        "type": "object",
                        "properties": {
                            "project": {"type": "string"},
                            "limit": {"type": "number"}
                        }
                    }
                },
                {
                    "name": "get_memory",
                    "description": "Retrieve a specific memory by ID",
                    "input_schema": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "string"}
                        },
                        "required": ["id"]
                    }
                },
                {
                    "name": "delete_memory",
                    "description": "Delete a memory by ID",
                    "input_schema": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "string"}
                        },
                        "required": ["id"]
                    }
                },
                {
                    "name": "create_task",
                    "description": "Create a new task with memory linking",
                    "input_schema": {
                        "type": "object",
                        "properties": {
                            "title": {"type": "string"},
                            "description": {"type": "string"},
                            "project": {"type": "string"},
                            "category": {"type": "string"},
                            "priority": {"type": "string"},
                            "parent_task": {"type": "string"},
                            "tags": {"type": "array", "items": {"type": "string"}},
                            "auto_link": {"type": "boolean"},
                            "manual_memories": {"type": "array", "items": {"type": "string"}}
                        },
                        "required": ["title", "project"]
                    }
                },
                {
                    "name": "update_task",
                    "description": "Update task status and details",
                    "input_schema": {
                        "type": "object",
                        "properties": {
                            "task_id": {"type": "string"},
                            "status": {"type": "string", "enum": ["todo", "in_progress", "done", "blocked"]},
                            "title": {"type": "string"},
                            "description": {"type": "string"},
                            "add_memories": {"type": "array", "items": {"type": "string"}},
                            "remove_memories": {"type": "array", "items": {"type": "string"}},
                            "add_subtasks": {"type": "array", "items": {"type": "string"}}
                        },
                        "required": ["task_id"]
                    }
                },
                {
                    "name": "list_tasks",
                    "description": "List tasks with filtering",
                    "input_schema": {
                        "type": "object",
                        "properties": {
                            "project": {"type": "string"},
                            "status": {"type": "string"},
                            "category": {"type": "string"},
                            "has_memory": {"type": "string"},
                            "include_subtasks": {"type": "boolean"},
                            "limit": {"type": "number"}
                        }
                    }
                },
                {
                    "name": "get_task_context",
                    "description": "Get detailed task information",
                    "input_schema": {
                        "type": "object",
                        "properties": {
                            "task_id": {"type": "string"},
                            "depth": {"type": "string", "enum": ["direct", "deep"]}
                        },
                        "required": ["task_id"]
                    }
                },
                {
                    "name": "delete_task",
                    "description": "Delete a task and subtasks",
                    "input_schema": {
                        "type": "object",
                        "properties": {
                            "task_id": {"type": "string"}
                        },
                        "required": ["task_id"]
                    }
                },
                {
                    "name": "generate_dropoff",
                    "description": "Generate session handoff document",
                    "input_schema": {
                        "type": "object",
                        "properties": {
                            "session_summary": {"type": "string"},
                            "include_recent_memories": {"type": "boolean"},
                            "include_git_status": {"type": "boolean"},
                            "recent_memory_count": {"type": "number"},
                            "output_format": {"type": "string", "enum": ["markdown", "json"]},
                            "output_path": {"type": "string"}
                        }
                    }
                },
                {
                    "name": "test_tool",
                    "description": "Verify MCP connection",
                    "input_schema": {
                        "type": "object",
                        "properties": {
                            "message": {"type": "string"}
                        },
                        "required": ["message"]
                    }
                }
            ],
            
            "configuration": {
                "memory_dir": {
                    "type": "string",
                    "default": "~/Documents/like-i-said-memories",
                    "description": "Directory for storing memories"
                },
                "task_dir": {
                    "type": "string",
                    "default": "~/Documents/like-i-said-tasks",
                    "description": "Directory for storing tasks"
                },
                "auto_backup": {
                    "type": "boolean",
                    "default": True,
                    "description": "Enable automatic backups"
                },
                "debug_mode": {
                    "type": "boolean",
                    "default": False,
                    "description": "Enable debug logging"
                }
            },
            
            "installation": {
                "instructions": [
                    "1. The launcher will automatically select the best approach",
                    "2. Run with --diagnostic flag to troubleshoot issues",
                    "3. Multiple fallback strategies ensure compatibility",
                    "4. Check logs in like-i-said-launcher.log for details"
                ],
                "requirements": {
                    "preferred": ["python3", "node"],
                    "minimum": ["python3 OR node"]
                }
            }
        }
        
        manifest_path = self.dxt_content_dir / "manifest.json"
        manifest_path.write_text(json.dumps(manifest, indent=2))
        logger.info("Created adaptive manifest")
        
    def create_readme(self):
        """Create comprehensive README"""
        readme_content = '''# Like-I-Said MCP Server - Hybrid Multi-Approach Edition

This hybrid package includes multiple execution strategies with automatic fallback for maximum compatibility.

## Features

- **Intelligent Launcher**: Automatically selects the best available approach
- **Multiple Fallback Strategies**: Python → Node.js → Minimal implementations
- **Diagnostic Mode**: Helps identify and resolve issues
- **Complete Feature Set**: All 12 tools for memory and task management
- **Enhanced Error Handling**: Comprehensive logging and debugging

## Execution Strategies

1. **Protocol-Compliant Python Server** (Primary)
   - Full-featured Python implementation
   - Best performance and compatibility
   
2. **Enhanced Node.js Bridge** (Fallback 1)
   - Node.js wrapper with Python execution
   - Good compatibility with existing setups
   
3. **Minimal Python Server** (Fallback 2)
   - Lightweight Python implementation
   - Works in resource-constrained environments
   
4. **Original Node.js Server** (Fallback 3)
   - Original JavaScript implementation
   - Maximum compatibility with Node.js environments

## Usage

### Automatic Mode (Recommended)
The launcher will automatically select the best approach:
```
python3 launcher.py
```

### Diagnostic Mode
To troubleshoot issues:
```
python3 launcher.py --diagnostic
```

### Direct Execution
You can also run specific implementations directly:
```
# Python server
python3 python/protocol_compliant_server.py

# Node.js bridge
node enhanced-bridge.js

# Original server
node server-markdown.js
```

## Troubleshooting

1. **Check diagnostic output**: Run with --diagnostic flag
2. **Review logs**: Check like-i-said-launcher.log
3. **Verify requirements**: Ensure Python 3 or Node.js is installed
4. **Check permissions**: Ensure scripts have execute permissions

## Requirements

- **Preferred**: Python 3 AND Node.js (for all features)
- **Minimum**: Python 3 OR Node.js (limited features)

## Support

For issues or questions:
- GitHub: https://github.com/endlessblink/Like-I-Said-memory-mcp-server
- Check the diagnostic mode output first
- Review logs for detailed error information
'''
        
        readme_path = self.dxt_content_dir / "README.md"
        readme_path.write_text(readme_content)
        logger.info("Created README")
        
    def create_dxt_package(self):
        """Create the final DXT package"""
        logger.info("Creating DXT package...")
        
        with zipfile.ZipFile(self.output_file, 'w', zipfile.ZIP_DEFLATED) as dxt:
            # Add all files from the content directory
            for root, dirs, files in os.walk(self.dxt_content_dir):
                for file in files:
                    file_path = Path(root) / file
                    arcname = file_path.relative_to(self.build_dir)
                    dxt.write(file_path, arcname)
                    logger.info(f"Added: {arcname}")
                    
        logger.info(f"Created DXT package: {self.output_file}")
        
    def build(self):
        """Build the hybrid multi-approach DXT"""
        try:
            logger.info("Starting hybrid multi-approach DXT build...")
            
            # Clean and prepare
            self.clean_build_directory()
            
            # Create components
            self.create_launcher_script()
            self.create_enhanced_bridge()
            self.copy_python_servers()
            self.copy_nodejs_components()
            self.create_adaptive_manifest()
            self.create_readme()
            
            # Create package
            self.create_dxt_package()
            
            # Report success
            logger.info("\n✅ Build completed successfully!")
            logger.info(f"Output: {self.output_file}")
            logger.info(f"Size: {self.output_file.stat().st_size / 1024 / 1024:.2f} MB")
            
            return True
            
        except Exception as e:
            logger.error(f"Build failed: {e}")
            import traceback
            traceback.print_exc()
            return False

def main():
    """Main entry point"""
    builder = HybridDXTBuilder()
    
    if builder.build():
        print("\n🎉 Hybrid multi-approach DXT built successfully!")
        print(f"📦 Package: {builder.output_file}")
        print("\n📋 Fallback Strategy:")
        print("1. Protocol-compliant Python server (best performance)")
        print("2. Enhanced Node.js bridge (good compatibility)")
        print("3. Minimal Python server (lightweight)")
        print("4. Original Node.js server (maximum compatibility)")
        print("\n🔍 Users can run with --diagnostic to troubleshoot")
        sys.exit(0)
    else:
        print("\n❌ Build failed. Check the logs for details.")
        sys.exit(1)

if __name__ == "__main__":
    main()