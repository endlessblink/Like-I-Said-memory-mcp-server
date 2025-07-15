#!/usr/bin/env python3
"""
Like-I-Said v2 - Windows-Compatible MCP Server
Enhanced stdio handling for Windows environments
"""

import json
import sys
import os
import uuid
import traceback
import io
from pathlib import Path
from datetime import datetime

# Configure Python for Windows compatibility
if sys.platform == 'win32':
    # Set stdout/stderr to binary mode to avoid encoding issues
    import msvcrt
    msvcrt.setmode(sys.stdin.fileno(), os.O_BINARY)
    msvcrt.setmode(sys.stdout.fileno(), os.O_BINARY)
    msvcrt.setmode(sys.stderr.fileno(), os.O_BINARY)
    
    # Wrap streams in text mode with UTF-8 encoding
    sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding='utf-8', line_buffering=True)
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', line_buffering=True)
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', line_buffering=True)

# Ensure outputs are unbuffered
sys.stdout.reconfigure(line_buffering=True)
sys.stderr.reconfigure(line_buffering=True)

class WindowsRobustMCPServer:
    def __init__(self):
        self.memories_dir = Path("memories")
        self.memories_dir.mkdir(exist_ok=True)
        self.initialized = False
        self.log_file = Path("C:/Users/endle/like-i-said-server-detailed.log")
        
    def log_debug(self, message):
        """Enhanced debug logging for Windows"""
        timestamp = datetime.now().isoformat()
        log_msg = f"[{timestamp}] {message}"
        
        # Log to stderr
        print(log_msg, file=sys.stderr, flush=True)
        
        # Also log to file for debugging
        try:
            with open(self.log_file, 'a', encoding='utf-8') as f:
                f.write(log_msg + '\n')
                f.flush()
        except:
            pass
            
    def validate_json_rpc_request(self, data):
        """Validate JSON-RPC 2.0 request format"""
        if not isinstance(data, dict):
            return False, "Request must be an object"
            
        if data.get("jsonrpc") != "2.0":
            return False, "jsonrpc field must be '2.0'"
            
        if "method" not in data:
            return False, "method field is required"
            
        if not isinstance(data["method"], str):
            return False, "method must be a string"
            
        if "id" in data:
            id_value = data["id"]
            if id_value is not None and not isinstance(id_value, (str, int, float)):
                return False, "id must be string, number, or null"
                
        return True, None
        
    def create_json_rpc_response(self, request_id, result=None, error=None):
        """Create strictly compliant JSON-RPC 2.0 response"""
        if request_id is None:
            return None
            
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
        """Handle incoming message with strict validation"""
        try:
            self.log_debug(f"Processing request: {json.dumps(request)[:200]}...")
            
            is_valid, error_msg = self.validate_json_rpc_request(request)
            if not is_valid:
                return self.create_json_rpc_error(
                    request.get("id"), -32600, f"Invalid Request: {error_msg}"
                )
                
            method = request["method"]
            params = request.get("params", {})
            request_id = request.get("id")
            
            self.log_debug(f"Method: {method}, ID: {request_id}")
            
            # Route to method handlers
            if method == "initialize":
                return self.handle_initialize(request_id, params)
            elif method == "initialized":
                self.log_debug("Received initialized notification")
                return None
            elif method == "tools/list":
                if not self.initialized:
                    return self.create_json_rpc_error(
                        request_id, -32002, "Server not initialized"
                    )
                return self.handle_tools_list(request_id)
            elif method == "tools/call":
                if not self.initialized:
                    return self.create_json_rpc_error(
                        request_id, -32002, "Server not initialized"
                    )
                return self.handle_tools_call(request_id, params)
            else:
                return self.create_json_rpc_error(
                    request_id, -32601, f"Method not found: {method}"
                )
                
        except Exception as e:
            self.log_debug(f"Exception in handle_message: {str(e)}\n{traceback.format_exc()}")
            return self.create_json_rpc_error(
                request.get("id") if isinstance(request, dict) else None,
                -32603, f"Internal error: {str(e)}"
            )
            
    def handle_initialize(self, request_id, params):
        """Handle MCP initialize request"""
        try:
            self.log_debug(f"Initializing with params: {params}")
            
            if not isinstance(params, dict):
                return self.create_json_rpc_error(
                    request_id, -32602, "Invalid params: must be object"
                )
                
            protocol_version = params.get("protocolVersion")
            if protocol_version not in ["2024-11-05", "2025-03-26"]:
                return self.create_json_rpc_error(
                    request_id, -32602, 
                    f"Unsupported protocol version: {protocol_version}"
                )
                
            self.initialized = True
            self.log_debug("Server initialized successfully")
            
            result = {
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "tools": {}
                },
                "serverInfo": {
                    "name": "like-i-said-v2",
                    "version": "1.0.0"
                }
            }
            
            return self.create_json_rpc_response(request_id, result)
            
        except Exception as e:
            self.log_debug(f"Error in initialize: {str(e)}")
            return self.create_json_rpc_error(
                request_id, -32603, f"Initialize failed: {str(e)}"
            )
            
    def handle_tools_list(self, request_id):
        """Handle MCP tools/list request"""
        try:
            tools = [
                {
                    "name": "test_connection",
                    "description": "Test the MCP connection",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "message": {
                                "type": "string",
                                "description": "Test message to echo back",
                                "default": "Hello from Like-I-Said!"
                            }
                        }
                    }
                },
                {
                    "name": "add_memory",
                    "description": "Store a new memory",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "content": {
                                "type": "string",
                                "description": "Memory content to store"
                            },
                            "category": {
                                "type": "string",
                                "description": "Memory category",
                                "default": "general"
                            }
                        },
                        "required": ["content"]
                    }
                },
                {
                    "name": "list_memories",
                    "description": "List stored memories",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "limit": {
                                "type": "integer",
                                "description": "Maximum number of memories",
                                "default": 10,
                                "minimum": 1,
                                "maximum": 50
                            }
                        }
                    }
                }
            ]
            
            result = {"tools": tools}
            return self.create_json_rpc_response(request_id, result)
            
        except Exception as e:
            self.log_debug(f"Error in tools_list: {str(e)}")
            return self.create_json_rpc_error(
                request_id, -32603, f"Tools list failed: {str(e)}"
            )
            
    def handle_tools_call(self, request_id, params):
        """Handle MCP tools/call request"""
        try:
            self.log_debug(f"Tools call with params: {params}")
            
            if not isinstance(params, dict):
                return self.create_json_rpc_error(
                    request_id, -32602, "Invalid params: must be object"
                )
                
            tool_name = params.get("name")
            if not isinstance(tool_name, str) or not tool_name:
                return self.create_json_rpc_error(
                    request_id, -32602, "Tool name must be non-empty string"
                )
                
            arguments = params.get("arguments", {})
            if not isinstance(arguments, dict):
                return self.create_json_rpc_error(
                    request_id, -32602, "Arguments must be object"
                )
                
            self.log_debug(f"Calling tool: {tool_name}")
            
            # Execute tool
            if tool_name == "test_connection":
                tool_result = self.tool_test_connection(arguments)
            elif tool_name == "add_memory":
                tool_result = self.tool_add_memory(arguments)
            elif tool_name == "list_memories":
                tool_result = self.tool_list_memories(arguments)
            else:
                return self.create_json_rpc_error(
                    request_id, -32601, f"Unknown tool: {tool_name}"
                )
                
            return self.create_json_rpc_response(request_id, tool_result)
            
        except Exception as e:
            self.log_debug(f"Error in tools_call: {str(e)}")
            return self.create_json_rpc_error(
                request_id, -32603, f"Tool call failed: {str(e)}"
            )
            
    def tool_test_connection(self, arguments):
        """Test connection tool implementation"""
        message = arguments.get("message", "Hello from Like-I-Said!")
        
        return {
            "content": [
                {
                    "type": "text",
                    "text": f"✅ **Connection Successful!**\n\n**Echo:** {message}\n**Server:** Like-I-Said v2 (Windows)\n**Status:** Ready\n**Platform:** {sys.platform}"
                }
            ]
        }
        
    def tool_add_memory(self, arguments):
        """Add memory tool implementation"""
        content = arguments.get("content")
        if not content or not isinstance(content, str):
            return {
                "content": [
                    {
                        "type": "text",
                        "text": "❌ **Error:** Content is required and must be a non-empty string"
                    }
                ]
            }
            
        category = arguments.get("category", "general")
        if not isinstance(category, str):
            category = "general"
            
        memory_id = f"mem-{uuid.uuid4().hex[:8]}"
        timestamp = datetime.now().isoformat()
        
        memory_file = self.memories_dir / f"{memory_id}.txt"
        memory_content = f"""ID: {memory_id}
Timestamp: {timestamp}
Category: {category}

{content}
"""
        
        try:
            memory_file.write_text(memory_content, encoding="utf-8")
            
            return {
                "content": [
                    {
                        "type": "text",
                        "text": f"✅ **Memory Saved!**\n\n**ID:** {memory_id}\n**Category:** {category}\n**Preview:** {content[:100]}{'...' if len(content) > 100 else ''}"
                    }
                ]
            }
        except Exception as e:
            return {
                "content": [
                    {
                        "type": "text",
                        "text": f"❌ **Error saving memory:** {str(e)}"
                    }
                ]
            }
            
    def tool_list_memories(self, arguments):
        """List memories tool implementation"""
        limit = arguments.get("limit", 10)
        if not isinstance(limit, int) or limit < 1:
            limit = 10
        elif limit > 50:
            limit = 50
            
        memories = []
        
        try:
            if self.memories_dir.exists():
                for memory_file in sorted(self.memories_dir.glob("*.txt"), reverse=True):
                    if len(memories) >= limit:
                        break
                        
                    content = memory_file.read_text(encoding="utf-8")
                    lines = content.split('\n')
                    
                    memory_id = lines[0].replace('ID: ', '') if len(lines) > 0 else "unknown"
                    category = lines[2].replace('Category: ', '') if len(lines) > 2 else "general"
                    body = '\n'.join(lines[4:]) if len(lines) > 4 else ""
                    
                    memories.append({
                        "id": memory_id,
                        "category": category,
                        "preview": body[:100] + "..." if len(body) > 100 else body
                    })
                    
            if memories:
                text = f"📚 **Your Memories** ({len(memories)} found)\n\n"
                for i, mem in enumerate(memories, 1):
                    text += f"**{i}. {mem['id']}** ({mem['category']})\n{mem['preview']}\n\n"
            else:
                text = "📚 **No memories found**\n\nUse `add_memory` to store your first memory!"
                
            return {
                "content": [
                    {
                        "type": "text",
                        "text": text
                    }
                ]
            }
            
        except Exception as e:
            return {
                "content": [
                    {
                        "type": "text",
                        "text": f"❌ **Error listing memories:** {str(e)}"
                    }
                ]
            }

def main():
    """Main server loop with Windows-compatible stdio handling"""
    server = WindowsRobustMCPServer()
    
    try:
        server.log_debug("Windows-Compatible MCP Server starting...")
        server.log_debug(f"Python: {sys.version}")
        server.log_debug(f"Platform: {sys.platform}")
        server.log_debug(f"Encoding: stdin={sys.stdin.encoding}, stdout={sys.stdout.encoding}")
        
        while True:
            try:
                # Read line from stdin with proper handling
                line = sys.stdin.readline()
                
                # Check for EOF
                if not line:
                    server.log_debug("EOF detected, exiting...")
                    break
                    
                line = line.strip()
                if not line:
                    continue
                    
                server.log_debug(f"Received line: {line[:100]}...")
                
                # Parse JSON-RPC request
                try:
                    request = json.loads(line)
                except json.JSONDecodeError as e:
                    server.log_debug(f"JSON decode error: {str(e)}")
                    error_response = {
                        "jsonrpc": "2.0",
                        "id": None,
                        "error": {
                            "code": -32700,
                            "message": f"Parse error: {str(e)}"
                        }
                    }
                    print(json.dumps(error_response), flush=True)
                    continue
                
                # Handle the message
                response = server.handle_message(request)
                
                # Send response only if not None
                if response is not None:
                    response_json = json.dumps(response)
                    server.log_debug(f"Sending response: {response_json[:200]}...")
                    print(response_json, flush=True)
                    
            except KeyboardInterrupt:
                server.log_debug("Keyboard interrupt, exiting...")
                break
            except Exception as e:
                server.log_debug(f"Error in main loop: {str(e)}\n{traceback.format_exc()}")
                # Try to continue
                continue
                
    except Exception as e:
        server.log_debug(f"Fatal server error: {str(e)}\n{traceback.format_exc()}")
        sys.exit(1)

if __name__ == "__main__":
    main()