#!/usr/bin/env python3
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
                                    for line in frontmatter.split('\n'):
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
                        "text": f"Found {len(memories)} memories:\n" + "\n".join([
                            f"- {m['id']}: {m['preview']}" for m in memories[:10]
                        ]) + (f"\n... and {len(memories) - 10} more" if len(memories) > 10 else "")
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
                        "text": f"Found {len(results)} memories matching '{query}':\n" + "\n".join([
                            f"- {r['id']}: {r['preview'][:100]}..." for r in results[:5]
                        ]) + (f"\n... and {len(results) - 5} more" if len(results) > 5 else "")
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
