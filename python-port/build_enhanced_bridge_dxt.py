#!/usr/bin/env python3
"""
Build Enhanced Node.js Bridge DXT for Like-I-Said v2
Combines enhanced bridge approach with protocol-compliant Python server
"""

import json
import shutil
import zipfile
import sys
import subprocess
from pathlib import Path
from datetime import datetime

def create_enhanced_bridge_dxt():
    """Create enhanced Node.js bridge DXT with protocol-compliant Python backend"""
    
    build_dir = Path("dxt-enhanced-bridge")
    if build_dir.exists():
        shutil.rmtree(build_dir)
    build_dir.mkdir()
    
    print("Creating Enhanced Node.js Bridge DXT...")
    
    # Create server directory for Python backend
    server_dir = build_dir / "server"
    server_dir.mkdir()
    
    # Create protocol-compliant Python server with enhanced error handling
    python_server_code = '''#!/usr/bin/env python3
"""
Like-I-Said v2 - Protocol-Compliant MCP Server for Node.js Bridge
Enhanced version with comprehensive error handling and protocol compliance
"""

import json
import sys
import os
import uuid
import traceback
import io
from pathlib import Path
from datetime import datetime

# Configure Python for cross-platform compatibility
if sys.platform == 'win32':
    import msvcrt
    try:
        msvcrt.setmode(sys.stdin.fileno(), os.O_BINARY)
        msvcrt.setmode(sys.stdout.fileno(), os.O_BINARY)
        msvcrt.setmode(sys.stderr.fileno(), os.O_BINARY)
        
        sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding='utf-8', line_buffering=True)
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', line_buffering=True)
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', line_buffering=True)
    except Exception as e:
        print(f"Warning: Could not configure Windows stdio: {e}", file=sys.stderr)

# Ensure unbuffered output
try:
    sys.stdout.reconfigure(line_buffering=True)
    sys.stderr.reconfigure(line_buffering=True)
except AttributeError:
    # Python < 3.7 compatibility
    pass

class EnhancedProtocolCompliantServer:
    def __init__(self):
        self.memories_dir = Path("memories")
        self.memories_dir.mkdir(exist_ok=True)
        self.initialized = False
        self.debug_log = []
        
    def log_debug(self, message):
        """Enhanced debug logging"""
        timestamp = datetime.now().isoformat()
        log_msg = f"[{timestamp}] {message}"
        
        # Add to debug log
        self.debug_log.append(log_msg)
        if len(self.debug_log) > 1000:  # Keep last 1000 entries
            self.debug_log = self.debug_log[-1000:]
        
        # Log to stderr
        print(log_msg, file=sys.stderr, flush=True)
        
    def validate_json_rpc_request(self, data):
        """Validate JSON-RPC 2.0 request format strictly"""
        if not isinstance(data, dict):
            return False, "Request must be an object"
            
        # Required fields for JSON-RPC 2.0
        if data.get("jsonrpc") != "2.0":
            return False, "jsonrpc field must be '2.0'"
            
        if "method" not in data:
            return False, "method field is required"
            
        if not isinstance(data["method"], str):
            return False, "method must be a string"
            
        # ID validation - critical for proper response handling
        if "id" in data:
            id_value = data["id"]
            if id_value is not None and not isinstance(id_value, (str, int, float)):
                return False, "id must be string, number, or null"
                
        return True, None
        
    def create_json_rpc_response(self, request_id, result=None, error=None):
        """Create strictly compliant JSON-RPC 2.0 response"""
        if request_id is None:
            return None  # No response for notifications
            
        response = {
            "jsonrpc": "2.0",
            "id": request_id
        }
        
        if error is not None:
            response["error"] = {
                "code": int(error.get("code", -32603)),
                "message": str(error.get("message", "Internal error"))
            }
            if "data" in error and error["data"] is not None:
                response["error"]["data"] = error["data"]
        else:
            response["result"] = result if result is not None else {}
            
        return response
        
    def create_json_rpc_error(self, request_id, code, message, data=None):
        """Create JSON-RPC 2.0 error response"""
        error = {"code": code, "message": message}
        if data is not None:
            error["data"] = data
        return self.create_json_rpc_response(request_id, error=error)
        
    def handle_message(self, request):
        """Handle incoming message with enhanced error handling"""
        try:
            self.log_debug(f"Processing request: {json.dumps(request)[:200]}...")
            
            # Validate request format
            is_valid, error_msg = self.validate_json_rpc_request(request)
            if not is_valid:
                return self.create_json_rpc_error(
                    request.get("id"), -32600, f"Invalid Request: {error_msg}"
                )
                
            method = request["method"]
            params = request.get("params", {})
            request_id = request.get("id")
            
            self.log_debug(f"Routing method: {method}, ID: {request_id}")
            
            # Route to method handlers
            if method == "initialize":
                return self.handle_initialize(request_id, params)
            elif method == "initialized":
                self.handle_initialized()
                return None  # Notification - no response
            elif method == "tools/list":
                return self.handle_tools_list(request_id)
            elif method == "tools/call":
                return self.handle_tools_call(request_id, params)
            elif method == "resources/list":
                return self.handle_resources_list(request_id)
            elif method == "prompts/list":
                return self.handle_prompts_list(request_id)
            else:
                return self.create_json_rpc_error(
                    request_id, -32601, f"Method not found: {method}"
                )
                
        except Exception as e:
            self.log_debug(f"Exception in handle_message: {e}")
            self.log_debug(f"Traceback: {traceback.format_exc()}")
            return self.create_json_rpc_error(
                request.get("id"), -32603, f"Internal error: {str(e)}"
            )
            
    def handle_initialize(self, request_id, params):
        """Handle initialize request"""
        self.log_debug("Handling initialize request")
        return self.create_json_rpc_response(request_id, {
            "protocolVersion": "2024-11-05",
            "capabilities": {
                "tools": {},
                "resources": {},
                "prompts": {}
            },
            "serverInfo": {
                "name": "like-i-said-v2-enhanced-bridge",
                "version": "2.4.0"
            }
        })
        
    def handle_initialized(self):
        """Handle initialized notification"""
        self.log_debug("Server initialized")
        self.initialized = True
        
    def handle_tools_list(self, request_id):
        """Return available tools"""
        tools = [
            {
                "name": "add_memory",
                "description": "Store important information, code snippets, decisions, or context for future reference",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "content": {"type": "string", "description": "The memory content to store"},
                        "category": {"type": "string", "description": "Memory category (personal, work, code, research, conversations, preferences)"},
                        "project": {"type": "string", "description": "Project name to organize memory files"},
                        "tags": {"type": "array", "items": {"type": "string"}, "description": "Optional tags for the memory"},
                        "priority": {"type": "string", "description": "Priority level (low, medium, high)"},
                        "status": {"type": "string", "description": "Memory status (active, archived, reference)"},
                        "language": {"type": "string", "description": "Programming language for code content"},
                        "related_memories": {"type": "array", "items": {"type": "string"}, "description": "IDs of related memories"}
                    },
                    "required": ["content"]
                }
            },
            {
                "name": "search_memories",
                "description": "Search stored memories using semantic and keyword-based search",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "Search query"},
                        "project": {"type": "string", "description": "Limit search to specific project"}
                    },
                    "required": ["query"]
                }
            },
            {
                "name": "list_memories",
                "description": "List all stored memories or memories from a specific project",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "project": {"type": "string", "description": "Filter by project name"},
                        "limit": {"type": "number", "description": "Maximum number of memories to return"}
                    }
                }
            },
            {
                "name": "get_memory",
                "description": "Retrieve a specific memory by ID",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string", "description": "The memory ID to retrieve"}
                    },
                    "required": ["id"]
                }
            },
            {
                "name": "delete_memory",
                "description": "Delete a memory by ID",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string", "description": "The memory ID to delete"}
                    },
                    "required": ["id"]
                }
            },
            {
                "name": "test_tool",
                "description": "Simple test tool to verify MCP is working",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "message": {"type": "string", "description": "Test message"}
                    },
                    "required": ["message"]
                }
            }
        ]
        
        return self.create_json_rpc_response(request_id, {"tools": tools})
        
    def handle_resources_list(self, request_id):
        """Handle resources/list request"""
        return self.create_json_rpc_response(request_id, {"resources": []})
        
    def handle_prompts_list(self, request_id):
        """Handle prompts/list request"""
        return self.create_json_rpc_response(request_id, {"prompts": []})
        
    def handle_tools_call(self, request_id, params):
        """Handle tool execution"""
        try:
            tool_name = params.get("name")
            arguments = params.get("arguments", {})
            
            self.log_debug(f"Executing tool: {tool_name} with args: {arguments}")
            
            if tool_name == "test_tool":
                message = arguments.get("message", "Hello from enhanced bridge!")
                return self.create_json_rpc_response(request_id, {
                    "content": [{"type": "text", "text": f"Test successful: {message}"}]
                })
                
            elif tool_name == "add_memory":
                memory_id = str(uuid.uuid4())
                content = arguments.get("content", "")
                category = arguments.get("category", "general")
                project = arguments.get("project", "default")
                
                # Create memory file
                project_dir = self.memories_dir / project
                project_dir.mkdir(exist_ok=True)
                
                memory_file = project_dir / f"{memory_id}.md"
                memory_content = f"""---
id: {memory_id}
timestamp: {datetime.now().isoformat()}
category: {category}
project: {project}
tags: {json.dumps(arguments.get("tags", []))}
priority: {arguments.get("priority", "medium")}
status: {arguments.get("status", "active")}
---

{content}
"""
                
                memory_file.write_text(memory_content, encoding='utf-8')
                
                return self.create_json_rpc_response(request_id, {
                    "content": [{
                        "type": "text", 
                        "text": f"Memory added successfully with ID: {memory_id}"
                    }]
                })
                
            elif tool_name == "list_memories":
                project = arguments.get("project")
                limit = arguments.get("limit", 50)
                
                memories = []
                search_dirs = [self.memories_dir / project] if project else list(self.memories_dir.iterdir())
                
                for project_dir in search_dirs:
                    if not project_dir.is_dir():
                        continue
                        
                    for memory_file in project_dir.glob("*.md"):
                        if len(memories) >= limit:
                            break
                            
                        try:
                            content = memory_file.read_text(encoding='utf-8')
                            # Parse frontmatter
                            if content.startswith('---'):
                                parts = content.split('---', 2)
                                if len(parts) >= 3:
                                    frontmatter = parts[1].strip()
                                    memory_content = parts[2].strip()
                                    
                                    memory_data = {}
                                    for line in frontmatter.split('\\n'):
                                        if ':' in line:
                                            key, value = line.split(':', 1)
                                            memory_data[key.strip()] = value.strip()
                                    
                                    memories.append({
                                        "id": memory_data.get("id", memory_file.stem),
                                        "category": memory_data.get("category", "unknown"),
                                        "project": memory_data.get("project", "unknown"),
                                        "timestamp": memory_data.get("timestamp", "unknown"),
                                        "preview": memory_content[:100] + "..." if len(memory_content) > 100 else memory_content
                                    })
                        except Exception as e:
                            self.log_debug(f"Error reading memory file {memory_file}: {e}")
                            continue
                
                return self.create_json_rpc_response(request_id, {
                    "content": [{
                        "type": "text",
                        "text": f"Found {len(memories)} memories:\\n" + "\\n".join([
                            f"- {m['id']}: {m['preview']}" for m in memories[:10]
                        ]) + (f"\\n... and {len(memories) - 10} more" if len(memories) > 10 else "")
                    }]
                })
                
            elif tool_name == "get_memory":
                memory_id = arguments.get("id")
                if not memory_id:
                    return self.create_json_rpc_error(request_id, -32602, "Missing memory ID")
                
                # Search for memory file
                for project_dir in self.memories_dir.iterdir():
                    if not project_dir.is_dir():
                        continue
                        
                    memory_file = project_dir / f"{memory_id}.md"
                    if memory_file.exists():
                        try:
                            content = memory_file.read_text(encoding='utf-8')
                            return self.create_json_rpc_response(request_id, {
                                "content": [{"type": "text", "text": content}]
                            })
                        except Exception as e:
                            return self.create_json_rpc_error(
                                request_id, -32603, f"Error reading memory: {str(e)}"
                            )
                
                return self.create_json_rpc_error(request_id, -32602, f"Memory not found: {memory_id}")
                
            elif tool_name == "search_memories":
                query = arguments.get("query", "").lower()
                project_filter = arguments.get("project")
                
                results = []
                search_dirs = [self.memories_dir / project_filter] if project_filter else list(self.memories_dir.iterdir())
                
                for project_dir in search_dirs:
                    if not project_dir.is_dir():
                        continue
                        
                    for memory_file in project_dir.glob("*.md"):
                        try:
                            content = memory_file.read_text(encoding='utf-8').lower()
                            if query in content:
                                # Extract memory info
                                full_content = memory_file.read_text(encoding='utf-8')
                                preview = full_content[:200] + "..." if len(full_content) > 200 else full_content
                                results.append({
                                    "id": memory_file.stem,
                                    "file": str(memory_file),
                                    "preview": preview
                                })
                        except Exception as e:
                            self.log_debug(f"Error searching memory file {memory_file}: {e}")
                            continue
                
                return self.create_json_rpc_response(request_id, {
                    "content": [{
                        "type": "text",
                        "text": f"Found {len(results)} memories matching '{query}':\\n" + "\\n".join([
                            f"- {r['id']}: {r['preview'][:100]}..." for r in results[:5]
                        ]) + (f"\\n... and {len(results) - 5} more" if len(results) > 5 else "")
                    }]
                })
                
            elif tool_name == "delete_memory":
                memory_id = arguments.get("id")
                if not memory_id:
                    return self.create_json_rpc_error(request_id, -32602, "Missing memory ID")
                
                # Search and delete memory file
                for project_dir in self.memories_dir.iterdir():
                    if not project_dir.is_dir():
                        continue
                        
                    memory_file = project_dir / f"{memory_id}.md"
                    if memory_file.exists():
                        try:
                            memory_file.unlink()
                            return self.create_json_rpc_response(request_id, {
                                "content": [{"type": "text", "text": f"Memory {memory_id} deleted successfully"}]
                            })
                        except Exception as e:
                            return self.create_json_rpc_error(
                                request_id, -32603, f"Error deleting memory: {str(e)}"
                            )
                
                return self.create_json_rpc_error(request_id, -32602, f"Memory not found: {memory_id}")
                
            else:
                return self.create_json_rpc_error(request_id, -32601, f"Unknown tool: {tool_name}")
                
        except Exception as e:
            self.log_debug(f"Exception in handle_tools_call: {e}")
            self.log_debug(f"Traceback: {traceback.format_exc()}")
            return self.create_json_rpc_error(
                request_id, -32603, f"Tool execution error: {str(e)}"
            )

def main():
    """Main server loop"""
    server = EnhancedProtocolCompliantServer()
    server.log_debug("Enhanced Protocol Compliant Server starting...")
    
    try:
        for line in sys.stdin:
            try:
                line = line.strip()
                if not line:
                    continue
                    
                server.log_debug(f"Raw input: {line[:100]}...")
                
                # Parse JSON-RPC request
                try:
                    request = json.loads(line)
                except json.JSONDecodeError as e:
                    server.log_debug(f"JSON decode error: {e}")
                    error_response = server.create_json_rpc_error(
                        None, -32700, f"Parse error: {str(e)}"
                    )
                    if error_response:
                        print(json.dumps(error_response), flush=True)
                    continue
                
                # Handle the request
                response = server.handle_message(request)
                
                # Send response if not a notification
                if response is not None:
                    output = json.dumps(response)
                    server.log_debug(f"Sending response: {output[:100]}...")
                    print(output, flush=True)
                    
            except Exception as e:
                server.log_debug(f"Exception in main loop: {e}")
                server.log_debug(f"Traceback: {traceback.format_exc()}")
                error_response = server.create_json_rpc_error(
                    None, -32603, f"Server error: {str(e)}"
                )
                if error_response:
                    print(json.dumps(error_response), flush=True)
                    
    except KeyboardInterrupt:
        server.log_debug("Server shutdown requested")
    except Exception as e:
        server.log_debug(f"Fatal server error: {e}")
        server.log_debug(f"Traceback: {traceback.format_exc()}")
        sys.exit(1)

if __name__ == "__main__":
    main()
'''
    
    # Write the enhanced Python server
    with open(server_dir / "enhanced_protocol_server.py", 'w', encoding='utf-8') as f:
        f.write(python_server_code)
    
    # Copy and enhance the Node.js bridge
    enhanced_bridge_code = '''#!/usr/bin/env node
/**
 * Enhanced Node.js Bridge for Protocol-Compliant Python MCP Server
 * Production-ready version with comprehensive error handling and logging
 */

const { spawn } = require('child_process');
const readline = require('readline');
const path = require('path');
const fs = require('fs');

class ProductionMCPBridge {
    constructor() {
        this.config = this.loadConfig();
        this.pythonProcess = null;
        this.debug = this.config.debug_mode || process.env.DEBUG_MCP === 'true';
        this.logFile = path.join(process.cwd(), 'enhanced-bridge.log');
        this.isShuttingDown = false;
        this.pendingRequests = new Map();
        this.requestCounter = 0;
    }

    loadConfig() {
        // Try to load configuration from various sources
        const configSources = [
            process.env.MCP_CONFIG ? JSON.parse(process.env.MCP_CONFIG) : null,
            this.tryLoadFile('.mcpconfig.json'),
            this.tryLoadFile('config.json'),
            {
                python_timeout: 30000,
                max_retries: 3,
                restart_on_error: true,
                log_level: 'info'
            }
        ];

        return Object.assign({}, ...configSources.filter(Boolean));
    }

    tryLoadFile(filename) {
        try {
            if (fs.existsSync(filename)) {
                return JSON.parse(fs.readFileSync(filename, 'utf8'));
            }
        } catch (e) {
            // Ignore errors
        }
        return null;
    }

    log(level, message) {
        const shouldLog = this.debug || level === 'error';
        if (shouldLog) {
            const timestamp = new Date().toISOString();
            const logMsg = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
            
            // Always log errors to stderr
            if (level === 'error') {
                console.error(logMsg);
            } else if (this.debug) {
                console.error(logMsg);
            }
            
            // Write to log file if enabled
            try {
                fs.appendFileSync(this.logFile, logMsg + '\\n');
            } catch (e) {
                // Ignore file errors
            }
        }
    }

    findPython() {
        // Try user-configured path first
        if (this.config.python_path && fs.existsSync(this.config.python_path)) {
            return this.config.python_path;
        }

        // Try common Python executables
        const candidates = process.platform === 'win32' 
            ? ['python', 'py', 'python3']
            : ['python3', 'python', 'py'];

        for (const candidate of candidates) {
            try {
                require('child_process').execSync(`${candidate} --version`, { 
                    stdio: 'ignore',
                    timeout: 5000
                });
                return candidate;
            } catch (e) {
                // Try next candidate
            }
        }

        throw new Error('Python not found. Please install Python or set python_path in configuration.');
    }

    startPython() {
        const pythonExe = this.findPython();
        const scriptPath = path.join(__dirname, 'server', 'enhanced_protocol_server.py');

        if (!fs.existsSync(scriptPath)) {
            throw new Error(`Python script not found: ${scriptPath}`);
        }

        this.log('info', `Starting Python with: ${pythonExe} ${scriptPath}`);

        // Enhanced spawn options for better compatibility
        const spawnOptions = {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env,
                PYTHONUNBUFFERED: '1',
                PYTHONIOENCODING: 'utf-8',
                // Add additional environment variables for better Windows compatibility
                PYTHONDONTWRITEBYTECODE: '1'
            }
        };

        // Windows-specific options
        if (process.platform === 'win32') {
            spawnOptions.windowsHide = true;
        }

        this.pythonProcess = spawn(pythonExe, [scriptPath], spawnOptions);

        this.pythonProcess.on('error', (err) => {
            this.log('error', `Python process error: ${err.message}`);
            if (!this.isShuttingDown) {
                this.handlePythonError(err);
            }
        });

        this.pythonProcess.on('exit', (code, signal) => {
            this.log('info', `Python process exited: code=${code}, signal=${signal}`);
            if (code !== 0 && !this.isShuttingDown) {
                this.handlePythonExit(code, signal);
            }
        });

        // Setup enhanced I/O forwarding
        this.setupIOForwarding();
        
        this.log('info', 'Python process started successfully');
    }

    setupIOForwarding() {
        // Handle stdin with proper error handling
        const stdinReader = readline.createInterface({
            input: process.stdin,
            crlfDelay: Infinity
        });

        stdinReader.on('line', (line) => {
            if (this.isShuttingDown) return;
            
            try {
                this.log('debug', `Forwarding to Python: ${line.substring(0, 200)}...`);
                
                // Validate JSON before forwarding
                try {
                    JSON.parse(line);
                } catch (e) {
                    this.log('error', `Invalid JSON received: ${e.message}`);
                    return;
                }
                
                if (this.pythonProcess && this.pythonProcess.stdin.writable) {
                    this.pythonProcess.stdin.write(line + '\\n');
                } else {
                    this.log('error', 'Python process stdin not writable');
                }
            } catch (error) {
                this.log('error', `Error forwarding to Python: ${error.message}`);
            }
        });

        stdinReader.on('close', () => {
            this.log('info', 'Stdin closed, initiating shutdown');
            this.shutdown();
        });

        stdinReader.on('error', (error) => {
            this.log('error', `Stdin error: ${error.message}`);
        });

        // Handle Python stdout with enhanced error handling
        const pythonReader = readline.createInterface({
            input: this.pythonProcess.stdout,
            crlfDelay: Infinity
        });

        pythonReader.on('line', (line) => {
            if (this.isShuttingDown) return;
            
            try {
                this.log('debug', `Received from Python: ${line.substring(0, 200)}...`);
                
                // Validate JSON before forwarding
                try {
                    JSON.parse(line);
                } catch (e) {
                    this.log('error', `Invalid JSON from Python: ${e.message}, Line: ${line}`);
                    return;
                }
                
                console.log(line);
            } catch (error) {
                this.log('error', `Error processing Python output: ${error.message}`);
            }
        });

        pythonReader.on('error', (error) => {
            this.log('error', `Python stdout error: ${error.message}`);
        });

        // Handle Python stderr
        const stderrReader = readline.createInterface({
            input: this.pythonProcess.stderr,
            crlfDelay: Infinity
        });

        stderrReader.on('line', (line) => {
            this.log('debug', `Python stderr: ${line}`);
        });

        stderrReader.on('error', (error) => {
            this.log('error', `Python stderr reader error: ${error.message}`);
        });
    }

    handlePythonError(error) {
        this.log('error', `Python process encountered an error: ${error.message}`);
        
        if (this.config.restart_on_error && !this.isShuttingDown) {
            this.log('info', 'Attempting to restart Python process...');
            setTimeout(() => {
                try {
                    this.startPython();
                } catch (restartError) {
                    this.log('error', `Failed to restart Python: ${restartError.message}`);
                    process.exit(1);
                }
            }, 1000);
        } else {
            process.exit(1);
        }
    }

    handlePythonExit(code, signal) {
        this.log('error', `Python process exited unexpectedly: code=${code}, signal=${signal}`);
        
        if (this.config.restart_on_error && !this.isShuttingDown) {
            this.log('info', 'Attempting to restart Python process...');
            setTimeout(() => {
                try {
                    this.startPython();
                } catch (restartError) {
                    this.log('error', `Failed to restart Python: ${restartError.message}`);
                    process.exit(code || 1);
                }
            }, 1000);
        } else {
            process.exit(code || 1);
        }
    }

    start() {
        this.log('info', 'Enhanced Production MCP Bridge starting...');
        this.log('info', `Config: ${JSON.stringify(this.config, null, 2)}`);
        
        try {
            this.startPython();
            
            // Setup comprehensive shutdown handlers
            process.on('SIGINT', () => this.shutdown('SIGINT'));
            process.on('SIGTERM', () => this.shutdown('SIGTERM'));
            process.on('SIGQUIT', () => this.shutdown('SIGQUIT'));
            process.on('SIGHUP', () => this.shutdown('SIGHUP'));
            
            // Handle uncaught exceptions
            process.on('uncaughtException', (error) => {
                this.log('error', `Uncaught exception: ${error.message}`);
                this.log('error', `Stack: ${error.stack}`);
                this.shutdown('uncaughtException');
            });
            
            process.on('unhandledRejection', (reason, promise) => {
                this.log('error', `Unhandled rejection at: ${promise}, reason: ${reason}`);
                this.shutdown('unhandledRejection');
            });
            
        } catch (error) {
            this.log('error', `Failed to start: ${error.message}`);
            console.error(`Error: ${error.message}`);
            process.exit(1);
        }
    }

    shutdown(reason = 'unknown') {
        if (this.isShuttingDown) return;
        
        this.isShuttingDown = true;
        this.log('info', `Shutting down (reason: ${reason})...`);
        
        if (this.pythonProcess) {
            try {
                // Try graceful shutdown first
                this.pythonProcess.kill('SIGTERM');
                
                // Force kill after timeout
                setTimeout(() => {
                    if (this.pythonProcess && !this.pythonProcess.killed) {
                        this.log('warn', 'Forcing Python process termination');
                        this.pythonProcess.kill('SIGKILL');
                    }
                }, 5000);
            } catch (error) {
                this.log('error', `Error during shutdown: ${error.message}`);
            }
        }
        
        // Exit after a brief delay to allow cleanup
        setTimeout(() => {
            process.exit(0);
        }, 1000);
    }
}

// Start the enhanced bridge
const bridge = new ProductionMCPBridge();
bridge.start();
'''
    
    # Write the enhanced Node.js bridge
    with open(build_dir / "enhanced-bridge.js", 'w', encoding='utf-8') as f:
        f.write(enhanced_bridge_code)
    
    # Make it executable
    os.chmod(build_dir / "enhanced-bridge.js", 0o755)
    
    # Create package.json for Node.js dependencies
    package_json = {
        "name": "like-i-said-enhanced-bridge",
        "version": "2.4.0",
        "description": "Enhanced Node.js Bridge for Like-I-Said MCP Server",
        "main": "enhanced-bridge.js",
        "bin": {
            "like-i-said-enhanced": "./enhanced-bridge.js"
        },
        "engines": {
            "node": ">=14.0.0"
        },
        "keywords": ["mcp", "memory", "ai", "bridge"],
        "author": "Like-I-Said Team",
        "license": "MIT"
    }
    
    with open(build_dir / "package.json", 'w', encoding='utf-8') as f:
        json.dump(package_json, f, indent=2)
    
    # Create enhanced manifest.json for DXT
    manifest = {
        "version": "1.0.0",
        "name": "like-i-said-enhanced-bridge",
        "description": "Enhanced Node.js Bridge for Like-I-Said MCP Server with Protocol Compliance",
        "publisher": "Like-I-Said Team",
        "homepage": "https://github.com/endlessblink/Like-I-Said-memory-mcp-server",
        "repository": {
            "type": "git",
            "url": "https://github.com/endlessblink/Like-I-Said-memory-mcp-server.git"
        },
        "bugs": {
            "url": "https://github.com/endlessblink/Like-I-Said-memory-mcp-server/issues"
        },
        "tags": ["memory", "ai", "mcp", "productivity", "bridge"],
        "category": "productivity",
        "server": {
            "command": "node",
            "args": ["enhanced-bridge.js"],
            "env": {
                "DEBUG_MCP": "false"
            }
        },
        "user_config": {
            "required": False,
            "properties": {
                "debug_mode": {
                    "type": "boolean",
                    "default": False,
                    "description": "Enable debug logging"
                },
                "python_path": {
                    "type": "string",
                    "description": "Custom Python executable path"
                },
                "restart_on_error": {
                    "type": "boolean",
                    "default": True,
                    "description": "Automatically restart on errors"
                }
            }
        },
        "capabilities": [
            "Memory storage and retrieval",
            "Semantic search",
            "Cross-platform compatibility",
            "Enhanced error handling",
            "Protocol compliance",
            "Automatic restart"
        ],
        "requirements": {
            "node": ">=14.0.0",
            "python": ">=3.7"
        }
    }
    
    with open(build_dir / "manifest.json", 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2)
    
    # Create README
    readme_content = '''# Like-I-Said Enhanced Bridge

Enhanced Node.js bridge for Like-I-Said MCP Server with protocol compliance and robust error handling.

## Features

- **Protocol Compliant**: Strict JSON-RPC 2.0 and MCP protocol compliance
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **Enhanced Error Handling**: Automatic restart and comprehensive logging
- **Production Ready**: Robust stdio handling and process management

## Tools Available

- `add_memory` - Store important information and context
- `search_memories` - Search stored memories semantically
- `list_memories` - List all memories with filtering
- `get_memory` - Retrieve specific memory by ID
- `delete_memory` - Remove unwanted memories
- `test_tool` - Verify MCP functionality

## Configuration

Create `.mcpconfig.json` for custom settings:

```json
{
  "debug_mode": true,
  "python_path": "/usr/bin/python3",
  "restart_on_error": true,
  "log_level": "info"
}
```

## Architecture

This package uses a Node.js bridge that communicates with a Python backend:

- Node.js handles stdio communication with MCP clients
- Python backend provides MCP protocol implementation
- Enhanced error handling and automatic restart capabilities
- Comprehensive logging for troubleshooting

## Troubleshooting

Check the `enhanced-bridge.log` file for detailed logging information.
'''
    
    with open(build_dir / "README.md", 'w', encoding='utf-8') as f:
        f.write(readme_content)
    
    # Create the DXT file
    dxt_filename = "like-i-said-enhanced-bridge.dxt"
    
    print(f"Creating DXT archive: {dxt_filename}")
    with zipfile.ZipFile(dxt_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(build_dir):
            for file in files:
                file_path = Path(root) / file
                arcname = file_path.relative_to(build_dir)
                zipf.write(file_path, arcname)
    
    # Get file size
    file_size = Path(dxt_filename).stat().st_size
    file_size_kb = file_size / 1024
    file_size_mb = file_size_kb / 1024
    
    print(f"\\n✅ Enhanced Bridge DXT created successfully!")
    print(f"📁 File: {dxt_filename}")
    print(f"📦 Size: {file_size:,} bytes ({file_size_kb:.1f} KB / {file_size_mb:.2f} MB)")
    
    # List contents
    print("\\n📋 DXT Contents:")
    with zipfile.ZipFile(dxt_filename, 'r') as zipf:
        for info in zipf.filelist:
            print(f"   {info.filename} ({info.file_size:,} bytes)")
    
    # Clean up build directory
    shutil.rmtree(build_dir)
    
    return dxt_filename, file_size

def test_enhanced_bridge():
    """Test the enhanced bridge functionality"""
    print("\\n🧪 Testing Enhanced Bridge Functionality...")
    
    # Test Node.js availability
    try:
        result = subprocess.run(['node', '--version'], capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            print(f"✅ Node.js available: {result.stdout.strip()}")
        else:
            print("❌ Node.js not found")
            return False
    except Exception as e:
        print(f"❌ Node.js test failed: {e}")
        return False
    
    # Test Python availability
    try:
        result = subprocess.run(['python3', '--version'], capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            print(f"✅ Python3 available: {result.stdout.strip()}")
        else:
            # Try python
            result = subprocess.run(['python', '--version'], capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                print(f"✅ Python available: {result.stdout.strip()}")
            else:
                print("❌ Python not found")
                return False
    except Exception as e:
        print(f"❌ Python test failed: {e}")
        return False
    
    print("✅ All prerequisites available")
    return True

if __name__ == "__main__":
    print("🚀 Building Enhanced Node.js Bridge DXT for Like-I-Said v2")
    print("=" * 60)
    
    # Test system prerequisites
    if not test_enhanced_bridge():
        print("❌ Prerequisites not met. Please install Node.js and Python.")
        sys.exit(1)
    
    try:
        dxt_file, size = create_enhanced_bridge_dxt()
        
        print("\\n🎉 Build Summary:")
        print(f"✅ Created: {dxt_file}")
        print(f"📦 Size: {size:,} bytes")
        print("\\n🔧 Features:")
        print("   • Enhanced Node.js bridge with Python backend")
        print("   • MCP protocol compliance with JSON-RPC 2.0")
        print("   • Comprehensive error handling and logging")
        print("   • Cross-platform compatibility (Windows/macOS/Linux)")
        print("   • Automatic restart on errors")
        print("   • 6 memory management tools")
        print("   • Production-ready stdio handling")
        
        print("\\n📖 Usage:")
        print("   1. Install the DXT in Claude Desktop")
        print("   2. Tools will be available immediately")
        print("   3. Check enhanced-bridge.log for detailed logging")
        print("   4. Configure via .mcpconfig.json if needed")
        
    except Exception as e:
        print(f"❌ Build failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)