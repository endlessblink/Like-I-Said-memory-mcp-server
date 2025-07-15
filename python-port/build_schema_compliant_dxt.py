#!/usr/bin/env python3
"""
Build Schema-Compliant DXT - Fix JSON Schema Validation Errors
Based on Claude Desktop debug logs showing ZodError schema validation failures.
"""

import os
import zipfile
import json
import sys
from pathlib import Path

def create_schema_compliant_dxt():
    """Create DXT with proper JSON schemas that pass Claude Desktop validation"""
    
    # MCP Server Code with Strict Schema Compliance
    server_code = '''#!/usr/bin/env python3
import json
import sys
import os
from pathlib import Path

class MCPSchemaCompliantServer:
    def __init__(self):
        self.memories = {}
        self.next_id = 1
        self.capabilities = {
            "tools": {}
        }

    def log_debug(self, message):
        """Debug logging to stderr"""
        print(f"[MCP-SERVER] {message}", file=sys.stderr, flush=True)

    def send_response(self, response):
        """Send JSON-RPC response to stdout"""
        json_str = json.dumps(response, separators=(',', ':'))
        print(json_str, flush=True)
        self.log_debug(f"SENT: {json_str}")

    def handle_initialize(self, request_id, params):
        """Handle initialization with strict schema compliance"""
        self.log_debug(f"Initialize called with params: {params}")
        
        response = {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "tools": {}
                },
                "serverInfo": {
                    "name": "like-i-said-v2-schema-compliant",
                    "version": "2.0.0"
                }
            }
        }
        return response

    def handle_initialized(self):
        """Handle initialized notification (no response needed)"""
        self.log_debug("Server initialized successfully")

    def handle_tools_list(self, request_id):
        """List available tools with strict schema compliance"""
        tools = [
            {
                "name": "test_tool",
                "description": "Test tool to verify MCP connection is working",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "message": {
                            "type": "string",
                            "description": "Test message to echo back"
                        }
                    },
                    "required": ["message"],
                    "additionalProperties": False
                }
            },
            {
                "name": "add_memory",
                "description": "Store information in memory with automatic categorization",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "content": {
                            "type": "string",
                            "description": "The information to store"
                        },
                        "title": {
                            "type": "string",
                            "description": "Optional title for the memory"
                        },
                        "project": {
                            "type": "string",
                            "description": "Optional project name for organization"
                        },
                        "tags": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Optional tags for categorization"
                        },
                        "priority": {
                            "type": "string",
                            "enum": ["low", "medium", "high"],
                            "description": "Priority level",
                            "default": "medium"
                        }
                    },
                    "required": ["content"],
                    "additionalProperties": False
                }
            },
            {
                "name": "list_memories",
                "description": "List stored memories with optional filtering",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "project": {
                            "type": "string",
                            "description": "Filter by project name"
                        },
                        "limit": {
                            "type": "integer",
                            "minimum": 1,
                            "maximum": 100,
                            "description": "Maximum number of memories to return",
                            "default": 20
                        }
                    },
                    "additionalProperties": False
                }
            },
            {
                "name": "search_memories",
                "description": "Search memories by content or metadata",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "Search query string"
                        },
                        "project": {
                            "type": "string",
                            "description": "Optional project filter"
                        }
                    },
                    "required": ["query"],
                    "additionalProperties": False
                }
            }
        ]
        
        response = {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {
                "tools": tools
            }
        }
        return response

    def handle_tools_call(self, request_id, params):
        """Handle tool calls with strict parameter validation"""
        tool_name = params.get("name")
        arguments = params.get("arguments", {})
        
        self.log_debug(f"Tool call: {tool_name} with args: {arguments}")
        
        try:
            if tool_name == "test_tool":
                message = arguments.get("message", "")
                if not message:
                    raise ValueError("message parameter is required")
                
                result = {
                    "content": [
                        {
                            "type": "text",
                            "text": f"✅ MCP Connection Working! Echo: {message}"
                        }
                    ]
                }
                
            elif tool_name == "add_memory":
                content = arguments.get("content", "")
                if not content:
                    raise ValueError("content parameter is required")
                
                memory_id = f"mem_{self.next_id}"
                self.next_id += 1
                
                memory = {
                    "id": memory_id,
                    "content": content,
                    "title": arguments.get("title", f"Memory {memory_id}"),
                    "project": arguments.get("project", "default"),
                    "tags": arguments.get("tags", []),
                    "priority": arguments.get("priority", "medium"),
                    "timestamp": "2024-01-01T00:00:00Z"
                }
                
                self.memories[memory_id] = memory
                
                result = {
                    "content": [
                        {
                            "type": "text",
                            "text": f"✅ Memory stored successfully with ID: {memory_id}\\n\\nTitle: {memory['title']}\\nProject: {memory['project']}\\nTags: {', '.join(memory['tags']) if memory['tags'] else 'None'}"
                        }
                    ]
                }
                
            elif tool_name == "list_memories":
                project_filter = arguments.get("project")
                limit = arguments.get("limit", 20)
                
                filtered_memories = []
                for memory in self.memories.values():
                    if project_filter and memory.get("project") != project_filter:
                        continue
                    filtered_memories.append(memory)
                
                # Limit results
                filtered_memories = filtered_memories[:limit]
                
                if not filtered_memories:
                    result_text = "No memories found."
                else:
                    result_text = f"Found {len(filtered_memories)} memories:\\n\\n"
                    for memory in filtered_memories:
                        result_text += f"ID: {memory['id']}\\n"
                        result_text += f"Title: {memory['title']}\\n"
                        result_text += f"Project: {memory['project']}\\n"
                        result_text += f"Content: {memory['content'][:100]}...\\n"
                        result_text += "---\\n"
                
                result = {
                    "content": [
                        {
                            "type": "text",
                            "text": result_text
                        }
                    ]
                }
                
            elif tool_name == "search_memories":
                query = arguments.get("query", "")
                if not query:
                    raise ValueError("query parameter is required")
                
                project_filter = arguments.get("project")
                
                matching_memories = []
                for memory in self.memories.values():
                    if project_filter and memory.get("project") != project_filter:
                        continue
                    
                    # Simple text search
                    search_text = f"{memory['content']} {memory['title']} {' '.join(memory.get('tags', []))}"
                    if query.lower() in search_text.lower():
                        matching_memories.append(memory)
                
                if not matching_memories:
                    result_text = f"No memories found matching '{query}'."
                else:
                    result_text = f"Found {len(matching_memories)} memories matching '{query}':\\n\\n"
                    for memory in matching_memories:
                        result_text += f"ID: {memory['id']}\\n"
                        result_text += f"Title: {memory['title']}\\n"
                        result_text += f"Content: {memory['content'][:100]}...\\n"
                        result_text += "---\\n"
                
                result = {
                    "content": [
                        {
                            "type": "text",
                            "text": result_text
                        }
                    ]
                }
                
            else:
                raise ValueError(f"Unknown tool: {tool_name}")
                
            response = {
                "jsonrpc": "2.0",
                "id": request_id,
                "result": result
            }
            return response
            
        except Exception as e:
            self.log_debug(f"Tool call error: {str(e)}")
            response = {
                "jsonrpc": "2.0",
                "id": request_id,
                "error": {
                    "code": -32603,
                    "message": f"Tool execution failed: {str(e)}"
                }
            }
            return response

    def handle_resources_list(self, request_id):
        """Handle resources/list request"""
        response = {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {
                "resources": []
            }
        }
        return response

    def handle_prompts_list(self, request_id):
        """Handle prompts/list request"""
        response = {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {
                "prompts": []
            }
        }
        return response

    def process_request(self, line):
        """Process incoming JSON-RPC request"""
        try:
            request = json.loads(line.strip())
            self.log_debug(f"RECEIVED: {json.dumps(request)}")
            
            method = request.get("method")
            request_id = request.get("id")
            params = request.get("params", {})
            
            response = None
            
            if method == "initialize":
                response = self.handle_initialize(request_id, params)
            elif method == "initialized":
                self.handle_initialized()
                return None  # No response for notifications
            elif method == "tools/list":
                response = self.handle_tools_list(request_id)
            elif method == "tools/call":
                response = self.handle_tools_call(request_id, params)
            elif method == "resources/list":
                response = self.handle_resources_list(request_id)
            elif method == "prompts/list":
                response = self.handle_prompts_list(request_id)
            else:
                response = {
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "error": {
                        "code": -32601,
                        "message": f"Method not found: {method}"
                    }
                }
            
            return response
            
        except json.JSONDecodeError as e:
            self.log_debug(f"JSON decode error: {e}")
            return {
                "jsonrpc": "2.0",
                "id": None,
                "error": {
                    "code": -32700,
                    "message": "Parse error"
                }
            }
        except Exception as e:
            self.log_debug(f"Request processing error: {e}")
            return {
                "jsonrpc": "2.0",
                "id": request_id if 'request_id' in locals() else None,
                "error": {
                    "code": -32603,
                    "message": f"Internal error: {str(e)}"
                }
            }

    def run(self):
        """Main server loop"""
        self.log_debug("Starting Like-I-Said MCP Server v2 - Schema Compliant")
        
        try:
            for line in sys.stdin:
                if not line.strip():
                    continue
                    
                response = self.process_request(line)
                if response:
                    self.send_response(response)
                    
        except KeyboardInterrupt:
            self.log_debug("Server shutdown requested")
        except Exception as e:
            self.log_debug(f"Server error: {e}")
            sys.exit(1)

if __name__ == "__main__":
    server = MCPSchemaCompliantServer()
    server.run()
'''

    # Manifest with strict schema compliance
    manifest = {
        "name": "like-i-said-v2-schema-compliant",
        "version": "2.0.0",
        "author": "endlessblink",
        "description": "Like-I-Said Memory v2 - Schema Compliant MCP Server",
        "license": "MIT",
        "mcp": {
            "type": "stdio",
            "command": "python",
            "args": ["-u", "server.py"],
            "initializationOptions": {}
        },
        "user_config": {
            "fields": [
                {
                    "name": "enable_debug",
                    "type": "boolean",
                    "title": "Enable Debug Logging",
                    "description": "Enable detailed debug logging for troubleshooting",
                    "default": True
                }
            ]
        }
    }

    # Create DXT file
    dxt_filename = "like-i-said-v2-schema-compliant.dxt"
    
    print("Creating Schema-Compliant DXT to fix JSON validation errors...")
    
    with zipfile.ZipFile(dxt_filename, 'w', zipfile.ZIP_DEFLATED) as dxt:
        # Add manifest
        dxt.writestr("manifest.json", json.dumps(manifest, indent=2))
        
        # Add server code
        dxt.writestr("server.py", server_code)
    
    # Get file size
    file_size = os.path.getsize(dxt_filename) / (1024 * 1024)
    
    print(f"✅ Created {dxt_filename}")
    print(f"📁 Size: {file_size:.2f} MB")
    print()
    print("🔧 Schema Fixes Applied:")
    print("   ✅ Strict JSON schema compliance for all tool parameters")
    print("   ✅ Required vs optional parameters clearly defined")
    print("   ✅ Proper type definitions (string, integer, array, object)")
    print("   ✅ No additional properties allowed in schemas")
    print("   ✅ Default values properly specified")
    print("   ✅ Enum constraints for priority levels")
    print("   ✅ Minimum/maximum constraints for integers")
    print()
    print("🎯 This should fix the ZodError validation failures!")

if __name__ == "__main__":
    create_schema_compliant_dxt()