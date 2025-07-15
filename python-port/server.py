#!/usr/bin/env python3
"""
Like-I-Said v2 - Complete Python MCP Server Foundation
Implements all 23 tools with MCP protocol compliance
"""

import json
import sys
import os
import uuid
import traceback
import io
import hashlib
import asyncio
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Any, Union

# Configure Python for cross-platform compatibility
if sys.platform == 'win32':
    import msvcrt
    msvcrt.setmode(sys.stdin.fileno(), os.O_BINARY)
    msvcrt.setmode(sys.stdout.fileno(), os.O_BINARY)
    msvcrt.setmode(sys.stderr.fileno(), os.O_BINARY)
    
    sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding='utf-8', line_buffering=True)
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', line_buffering=True)
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', line_buffering=True)

# Ensure unbuffered output
sys.stdout.reconfigure(line_buffering=True)
sys.stderr.reconfigure(line_buffering=True)

class LikeISaidMCPServer:
    """Complete MCP Server with all 23 tools"""
    
    def __init__(self):
        # Initialize storage directories
        self.base_dir = Path.cwd()
        self.memories_dir = self.base_dir / "memories"
        self.tasks_dir = self.base_dir / "tasks"
        self.data_dir = self.base_dir / "data"
        
        # Create directories
        self.memories_dir.mkdir(exist_ok=True)
        self.tasks_dir.mkdir(exist_ok=True)
        self.data_dir.mkdir(exist_ok=True)
        
        # Initialize server state
        self.initialized = False
        self.tool_schemas = {}
        self.log_file = self.data_dir / "server.log"
        
        # Load tool schemas
        self.load_tool_schemas()
        
    def log_debug(self, message: str):
        """Enhanced debug logging"""
        timestamp = datetime.now().isoformat()
        log_msg = f"[{timestamp}] {message}"
        
        # Log to stderr for debugging
        print(log_msg, file=sys.stderr, flush=True)
        
        # Also log to file
        try:
            with open(self.log_file, 'a', encoding='utf-8') as f:
                f.write(log_msg + '\n')
                f.flush()
        except Exception:
            pass
            
    def load_tool_schemas(self):
        """Load all tool schemas from schema files"""
        schemas_dir = self.base_dir / "schemas"
        if not schemas_dir.exists():
            schemas_dir = self.base_dir / "python-port" / "schemas"
            
        if schemas_dir.exists():
            for schema_file in schemas_dir.glob("*.json"):
                try:
                    with open(schema_file, 'r', encoding='utf-8') as f:
                        schema_data = json.load(f)
                        
                    # Handle different schema formats
                    if "name" in schema_data:
                        # Individual tool schema
                        tool_name = schema_data["name"]
                        self.tool_schemas[tool_name] = schema_data
                    elif "extracted_tools" in schema_data:
                        # Multi-tool schema file
                        for tool_data in schema_data["extracted_tools"].values():
                            if "name" in tool_data:
                                tool_name = tool_data["name"]
                                self.tool_schemas[tool_name] = tool_data
                                
                except Exception as e:
                    self.log_debug(f"Error loading schema {schema_file}: {e}")
                    
        self.log_debug(f"Loaded {len(self.tool_schemas)} tool schemas")
        
    def validate_json_rpc_request(self, data: Dict) -> tuple[bool, Optional[str]]:
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
        
    def create_json_rpc_response(self, request_id: Union[str, int, None], result: Any = None, error: Optional[Dict] = None) -> Optional[Dict]:
        """Create JSON-RPC 2.0 response"""
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
        
    def create_json_rpc_error(self, request_id: Union[str, int, None], code: int, message: str, data: Any = None) -> Optional[Dict]:
        """Create JSON-RPC 2.0 error response"""
        error = {"code": code, "message": message}
        if data is not None:
            error["data"] = data
        return self.create_json_rpc_response(request_id, error=error)
        
    def handle_message(self, request: Dict) -> Optional[Dict]:
        """Handle incoming JSON-RPC message"""
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
            
    def handle_initialize(self, request_id: Union[str, int], params: Dict) -> Dict:
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
                    "version": "2.4.2"
                }
            }
            
            return self.create_json_rpc_response(request_id, result)
            
        except Exception as e:
            self.log_debug(f"Error in initialize: {str(e)}")
            return self.create_json_rpc_error(
                request_id, -32603, f"Initialize failed: {str(e)}"
            )
            
    def handle_tools_list(self, request_id: Union[str, int]) -> Dict:
        """Handle MCP tools/list request - returns all 23 tools"""
        try:
            # Define all 23 tools with their schemas
            tools = [
                # Memory Management Tools (6 tools)
                {
                    "name": "add_memory",
                    "description": "AUTOMATICALLY use when user shares important information, code snippets, decisions, learnings, or context that should be remembered for future sessions. Includes smart categorization and auto-linking.",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "content": {
                                "type": "string",
                                "description": "The memory content to store"
                            },
                            "tags": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "Optional tags for the memory"
                            },
                            "category": {
                                "type": "string",
                                "description": "Memory category (personal, work, code, research, conversations, preferences)"
                            },
                            "project": {
                                "type": "string",
                                "description": "Project name to organize memory files"
                            },
                            "priority": {
                                "type": "string",
                                "description": "Priority level (low, medium, high)"
                            },
                            "status": {
                                "type": "string",
                                "description": "Memory status (active, archived, reference)"
                            },
                            "related_memories": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "IDs of related memories for cross-referencing"
                            },
                            "language": {
                                "type": "string",
                                "description": "Programming language for code content"
                            }
                        },
                        "required": ["content"]
                    }
                },
                {
                    "name": "get_memory",
                    "description": "Retrieve a memory by ID",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "id": {
                                "type": "string",
                                "description": "The memory ID to retrieve"
                            }
                        },
                        "required": ["id"]
                    }
                },
                {
                    "name": "list_memories",
                    "description": "List all stored memories or memories from a specific project",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "limit": {
                                "type": "number",
                                "description": "Maximum number of memories to return"
                            },
                            "project": {
                                "type": "string",
                                "description": "Filter by project name"
                            }
                        }
                    }
                },
                {
                    "name": "delete_memory",
                    "description": "Delete a memory by ID",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "id": {
                                "type": "string",
                                "description": "The memory ID to delete"
                            }
                        },
                        "required": ["id"]
                    }
                },
                {
                    "name": "search_memories",
                    "description": "AUTOMATICALLY use when user asks about past work, previous decisions, looking for examples, or needs context from earlier sessions. Provides semantic and keyword-based search.",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "Search query"
                            },
                            "project": {
                                "type": "string",
                                "description": "Limit search to specific project"
                            }
                        },
                        "required": ["query"]
                    }
                },
                {
                    "name": "test_tool",
                    "description": "Simple test tool to verify MCP is working",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "message": {
                                "type": "string",
                                "description": "Test message"
                            }
                        },
                        "required": ["message"]
                    }
                },
                
                # Task Management Tools (6 tools)
                {
                    "name": "create_task",
                    "description": "Create a new task with intelligent memory linking. Tasks start in \"todo\" status. IMPORTANT: After creating a task, remember to update its status to \"in_progress\" when you begin working on it.",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "title": {
                                "type": "string",
                                "description": "Task title"
                            },
                            "project": {
                                "type": "string",
                                "description": "Project identifier"
                            },
                            "description": {
                                "type": "string",
                                "description": "Detailed task description"
                            },
                            "category": {
                                "type": "string",
                                "description": "Task category",
                                "enum": ["personal", "work", "code", "research"]
                            },
                            "priority": {
                                "type": "string",
                                "description": "Task priority",
                                "enum": ["low", "medium", "high", "urgent"]
                            },
                            "tags": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "Task tags"
                            },
                            "parent_task": {
                                "type": "string",
                                "description": "Parent task ID for subtasks"
                            },
                            "manual_memories": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "Memory IDs to manually link"
                            },
                            "auto_link": {
                                "type": "boolean",
                                "description": "Automatically find and link relevant memories"
                            }
                        },
                        "required": ["title", "project"]
                    }
                },
                {
                    "name": "update_task",
                    "description": "Update task status and details. STATE MANAGEMENT GUIDELINES: Always mark tasks as \"in_progress\" when starting work on them, Update to \"done\" immediately after completing a task",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "task_id": {
                                "type": "string",
                                "description": "Task ID to update"
                            },
                            "status": {
                                "type": "string",
                                "description": "New task status",
                                "enum": ["todo", "in_progress", "done", "blocked"]
                            },
                            "title": {
                                "type": "string",
                                "description": "New task title"
                            },
                            "description": {
                                "type": "string",
                                "description": "New task description"
                            },
                            "add_memories": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "Memory IDs to link"
                            },
                            "remove_memories": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "Memory IDs to unlink"
                            },
                            "add_subtasks": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "Task titles to add as subtasks"
                            }
                        },
                        "required": ["task_id"]
                    }
                },
                {
                    "name": "list_tasks",
                    "description": "List tasks with filtering options. Shows task status distribution and workflow health.",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "project": {
                                "type": "string",
                                "description": "Filter by project"
                            },
                            "status": {
                                "type": "string",
                                "description": "Filter by status",
                                "enum": ["todo", "in_progress", "done", "blocked"]
                            },
                            "category": {
                                "type": "string",
                                "description": "Filter by category"
                            },
                            "limit": {
                                "type": "number",
                                "description": "Maximum tasks to return"
                            },
                            "include_subtasks": {
                                "type": "boolean",
                                "description": "Include subtasks in results"
                            },
                            "has_memory": {
                                "type": "string",
                                "description": "Filter by memory connection"
                            }
                        }
                    }
                },
                {
                    "name": "get_task_context",
                    "description": "Get detailed task information including status, relationships, and connected memories.",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "task_id": {
                                "type": "string",
                                "description": "Task ID"
                            },
                            "depth": {
                                "type": "string",
                                "description": "How many levels of connections to traverse",
                                "enum": ["direct", "deep"]
                            }
                        },
                        "required": ["task_id"]
                    }
                },
                {
                    "name": "delete_task",
                    "description": "Delete a task and its subtasks",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "task_id": {
                                "type": "string",
                                "description": "Task ID to delete"
                            }
                        },
                        "required": ["task_id"]
                    }
                },
                {
                    "name": "generate_dropoff",
                    "description": "Generate conversation dropoff document for session handoff with context from recent memories, git status, and project info",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "session_summary": {
                                "type": "string",
                                "description": "Brief summary of work done in this session"
                            },
                            "include_recent_memories": {
                                "type": "boolean",
                                "description": "Include recent memories in the dropoff"
                            },
                            "include_git_status": {
                                "type": "boolean",
                                "description": "Include git status and recent commits"
                            },
                            "recent_memory_count": {
                                "type": "number",
                                "description": "Number of recent memories to include"
                            },
                            "output_format": {
                                "type": "string",
                                "description": "Output format: markdown or json",
                                "enum": ["markdown", "json"]
                            },
                            "output_path": {
                                "type": "string",
                                "description": "Custom output directory path"
                            }
                        }
                    }
                },
                
                # AI Enhancement Tools (5 tools)
                {
                    "name": "enhance_memory_metadata",
                    "description": "Generate optimized title and summary for a memory to improve dashboard card display.",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "memory_id": {
                                "type": "string",
                                "description": "The ID of the memory to enhance with title and summary"
                            },
                            "regenerate": {
                                "type": "boolean",
                                "description": "Force regeneration even if title/summary already exist"
                            }
                        },
                        "required": ["memory_id"]
                    }
                },
                {
                    "name": "batch_enhance_memories",
                    "description": "Batch process multiple memories to add optimized titles and summaries.",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "limit": {
                                "type": "number",
                                "description": "Maximum number of memories to process"
                            },
                            "project": {
                                "type": "string",
                                "description": "Filter by project name"
                            },
                            "category": {
                                "type": "string",
                                "description": "Filter by category"
                            },
                            "skip_existing": {
                                "type": "boolean",
                                "description": "Skip memories that already have titles/summaries"
                            }
                        }
                    }
                },
                {
                    "name": "batch_enhance_memories_ollama",
                    "description": "Batch process memories using local AI (Ollama) for privacy-focused title/summary generation.",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "limit": {
                                "type": "number",
                                "description": "Maximum number of memories to process"
                            },
                            "project": {
                                "type": "string",
                                "description": "Filter by project name"
                            },
                            "category": {
                                "type": "string",
                                "description": "Filter by category"
                            },
                            "skip_existing": {
                                "type": "boolean",
                                "description": "Skip memories that already have titles/summaries"
                            },
                            "model": {
                                "type": "string",
                                "description": "Ollama model to use"
                            },
                            "batch_size": {
                                "type": "number",
                                "description": "Number of memories to process in parallel"
                            }
                        }
                    }
                },
                {
                    "name": "batch_enhance_tasks_ollama",
                    "description": "Batch process tasks using local AI (Ollama) for privacy-focused title/description enhancement.",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "limit": {
                                "type": "number",
                                "description": "Maximum number of tasks to process"
                            },
                            "project": {
                                "type": "string",
                                "description": "Filter by project name"
                            },
                            "category": {
                                "type": "string",
                                "description": "Filter by category"
                            },
                            "status": {
                                "type": "string",
                                "description": "Filter by task status"
                            },
                            "skip_existing": {
                                "type": "boolean",
                                "description": "Skip tasks that already have enhanced titles/descriptions"
                            },
                            "model": {
                                "type": "string",
                                "description": "Ollama model to use"
                            },
                            "batch_size": {
                                "type": "number",
                                "description": "Number of tasks to process in parallel"
                            }
                        }
                    }
                },
                {
                    "name": "check_ollama_status",
                    "description": "Check if Ollama server is running and list available models for local AI processing.",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "show_models": {
                                "type": "boolean",
                                "description": "Whether to list available models"
                            }
                        }
                    }
                },
                
                # Advanced Analytics & Automation Tools (6 tools)
                {
                    "name": "smart_status_update",
                    "description": "AUTOMATICALLY use when user mentions status changes in natural language. Intelligently parses natural language to determine intended status changes.",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "natural_language_input": {
                                "type": "string",
                                "description": "Natural language description of the status change"
                            },
                            "task_id": {
                                "type": "string",
                                "description": "Task ID to update (optional - can be inferred)"
                            },
                            "context": {
                                "type": "object",
                                "description": "Additional context for intelligent processing",
                                "properties": {
                                    "blocking_reason": {"type": "string"},
                                    "completion_evidence": {"type": "string"},
                                    "force_complete": {"type": "boolean"},
                                    "skip_validation": {"type": "boolean"}
                                }
                            },
                            "apply_automation": {
                                "type": "boolean",
                                "description": "Whether to apply automation suggestions"
                            }
                        },
                        "required": ["natural_language_input"]
                    }
                },
                {
                    "name": "get_task_status_analytics",
                    "description": "AUTOMATICALLY use when user asks about task progress, status overview, productivity metrics, or wants analytics.",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "project": {
                                "type": "string",
                                "description": "Filter analytics by project"
                            },
                            "time_range": {
                                "type": "string",
                                "description": "Time range for analytics",
                                "enum": ["day", "week", "month", "quarter"]
                            },
                            "include_trends": {
                                "type": "boolean",
                                "description": "Include trend analysis"
                            },
                            "include_recommendations": {
                                "type": "boolean",
                                "description": "Include actionable recommendations"
                            },
                            "include_project_breakdown": {
                                "type": "boolean",
                                "description": "Include project-by-project analysis"
                            }
                        }
                    }
                },
                {
                    "name": "validate_task_workflow",
                    "description": "Validate a proposed task status change with intelligent suggestions and workflow analysis.",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "task_id": {
                                "type": "string",
                                "description": "Task ID to validate"
                            },
                            "proposed_status": {
                                "type": "string",
                                "description": "Proposed new status",
                                "enum": ["todo", "in_progress", "done", "blocked"]
                            },
                            "context": {
                                "type": "object",
                                "description": "Additional context for validation",
                                "properties": {
                                    "blocking_reason": {"type": "string"},
                                    "force_complete": {"type": "boolean"},
                                    "skip_review": {"type": "boolean"},
                                    "skip_testing": {"type": "boolean"}
                                }
                            }
                        },
                        "required": ["task_id", "proposed_status"]
                    }
                },
                {
                    "name": "get_automation_suggestions",
                    "description": "Get intelligent automation suggestions for a task based on context analysis.",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "task_id": {
                                "type": "string",
                                "description": "Task ID to analyze for automation opportunities"
                            }
                        },
                        "required": ["task_id"]
                    }
                },
                {
                    "name": "enhance_memory_ollama",
                    "description": "Enhance a single memory with local AI (Ollama) for privacy-focused title/summary generation.",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "memory_id": {
                                "type": "string",
                                "description": "ID of the memory to enhance"
                            },
                            "model": {
                                "type": "string",
                                "description": "Ollama model to use"
                            },
                            "force_update": {
                                "type": "boolean",
                                "description": "Force update even if memory already has title/summary"
                            }
                        },
                        "required": ["memory_id"]
                    }
                },
                {
                    "name": "deduplicate_memories",
                    "description": "Find and remove duplicate memory files, keeping the newest version of each memory ID.",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "preview_only": {
                                "type": "boolean",
                                "description": "Preview what would be removed without actually deleting files"
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
            
    def handle_tools_call(self, request_id: Union[str, int], params: Dict) -> Dict:
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
            
            # Route to tool implementations
            tool_method = getattr(self, f"tool_{tool_name}", None)
            if tool_method and callable(tool_method):
                tool_result = tool_method(arguments)
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
            
    # Tool implementations (basic placeholders for now)
    def tool_test_tool(self, arguments: Dict) -> Dict:
        """Test tool implementation"""
        message = arguments.get("message", "Hello from Python MCP Server!")
        
        return {
            "content": [
                {
                    "type": "text",
                    "text": f"✅ **Python MCP Server Connected!**\n\n**Echo:** {message}\n**Server:** Like-I-Said v2 Python Port\n**Status:** All 23 tools registered\n**Platform:** {sys.platform}"
                }
            ]
        }
        
    def tool_add_memory(self, arguments: Dict) -> Dict:
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
            
        # Extract metadata
        category = arguments.get("category", "general")
        project = arguments.get("project", "default")
        priority = arguments.get("priority", "medium")
        status = arguments.get("status", "active")
        tags = arguments.get("tags", [])
        language = arguments.get("language")
        
        # Generate memory ID
        memory_id = f"mem-{uuid.uuid4().hex[:8]}"
        timestamp = datetime.now().isoformat()
        
        # Create project directory
        project_dir = self.memories_dir / project
        project_dir.mkdir(exist_ok=True)
        
        # Create memory file with frontmatter
        memory_file = project_dir / f"{memory_id}.md"
        frontmatter = f"""---
id: {memory_id}
timestamp: {timestamp}
category: {category}
project: {project}
priority: {priority}
status: {status}
tags: {json.dumps(tags)}
"""
        if language:
            frontmatter += f"language: {language}\n"
            
        frontmatter += "---\n\n"
        
        memory_content = frontmatter + content
        
        try:
            memory_file.write_text(memory_content, encoding="utf-8")
            
            return {
                "content": [
                    {
                        "type": "text",
                        "text": f"✅ **Memory Saved!**\n\n**ID:** {memory_id}\n**Project:** {project}\n**Category:** {category}\n**Preview:** {content[:100]}{'...' if len(content) > 100 else ''}"
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
            
    def tool_list_memories(self, arguments: Dict) -> Dict:
        """List memories tool implementation"""
        limit = arguments.get("limit", 10)
        project = arguments.get("project")
        
        if not isinstance(limit, int) or limit < 1:
            limit = 10
        elif limit > 50:
            limit = 50
            
        memories = []
        
        try:
            # Search in specific project or all projects
            if project:
                search_dirs = [self.memories_dir / project]
            else:
                search_dirs = [d for d in self.memories_dir.iterdir() if d.is_dir()]
                
            for project_dir in search_dirs:
                if not project_dir.exists():
                    continue
                    
                for memory_file in sorted(project_dir.glob("*.md"), reverse=True):
                    if len(memories) >= limit:
                        break
                        
                    try:
                        content = memory_file.read_text(encoding="utf-8")
                        
                        # Parse frontmatter
                        if content.startswith("---"):
                            parts = content.split("---", 2)
                            if len(parts) >= 3:
                                yaml_content = parts[1]
                                body = parts[2].strip()
                                
                                # Simple YAML parsing for ID
                                memory_id = "unknown"
                                category = "general"
                                for line in yaml_content.split('\n'):
                                    if line.startswith('id:'):
                                        memory_id = line.split(':', 1)[1].strip()
                                    elif line.startswith('category:'):
                                        category = line.split(':', 1)[1].strip()
                                        
                                memories.append({
                                    "id": memory_id,
                                    "category": category,
                                    "project": project_dir.name,
                                    "preview": body[:100] + "..." if len(body) > 100 else body
                                })
                    except Exception as e:
                        self.log_debug(f"Error reading memory file {memory_file}: {e}")
                        continue
                        
            if memories:
                text = f"📚 **Your Memories** ({len(memories)} found)\n\n"
                for i, mem in enumerate(memories, 1):
                    text += f"**{i}. {mem['id']}** ({mem['category']}) - {mem['project']}\n{mem['preview']}\n\n"
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
            
    # Placeholder implementations for remaining tools
    def tool_get_memory(self, arguments: Dict) -> Dict:
        return {"content": [{"type": "text", "text": "🔧 get_memory: Implementation in progress"}]}
        
    def tool_delete_memory(self, arguments: Dict) -> Dict:
        return {"content": [{"type": "text", "text": "🔧 delete_memory: Implementation in progress"}]}
        
    def tool_search_memories(self, arguments: Dict) -> Dict:
        return {"content": [{"type": "text", "text": "🔧 search_memories: Implementation in progress"}]}
        
    def tool_create_task(self, arguments: Dict) -> Dict:
        return {"content": [{"type": "text", "text": "🔧 create_task: Implementation in progress"}]}
        
    def tool_update_task(self, arguments: Dict) -> Dict:
        return {"content": [{"type": "text", "text": "🔧 update_task: Implementation in progress"}]}
        
    def tool_list_tasks(self, arguments: Dict) -> Dict:
        return {"content": [{"type": "text", "text": "🔧 list_tasks: Implementation in progress"}]}
        
    def tool_get_task_context(self, arguments: Dict) -> Dict:
        return {"content": [{"type": "text", "text": "🔧 get_task_context: Implementation in progress"}]}
        
    def tool_delete_task(self, arguments: Dict) -> Dict:
        return {"content": [{"type": "text", "text": "🔧 delete_task: Implementation in progress"}]}
        
    def tool_generate_dropoff(self, arguments: Dict) -> Dict:
        return {"content": [{"type": "text", "text": "🔧 generate_dropoff: Implementation in progress"}]}
        
    def tool_enhance_memory_metadata(self, arguments: Dict) -> Dict:
        return {"content": [{"type": "text", "text": "🔧 enhance_memory_metadata: Implementation in progress"}]}
        
    def tool_batch_enhance_memories(self, arguments: Dict) -> Dict:
        return {"content": [{"type": "text", "text": "🔧 batch_enhance_memories: Implementation in progress"}]}
        
    def tool_batch_enhance_memories_ollama(self, arguments: Dict) -> Dict:
        return {"content": [{"type": "text", "text": "🔧 batch_enhance_memories_ollama: Implementation in progress"}]}
        
    def tool_batch_enhance_tasks_ollama(self, arguments: Dict) -> Dict:
        return {"content": [{"type": "text", "text": "🔧 batch_enhance_tasks_ollama: Implementation in progress"}]}
        
    def tool_check_ollama_status(self, arguments: Dict) -> Dict:
        return {"content": [{"type": "text", "text": "🔧 check_ollama_status: Implementation in progress"}]}
        
    def tool_smart_status_update(self, arguments: Dict) -> Dict:
        return {"content": [{"type": "text", "text": "🔧 smart_status_update: Implementation in progress"}]}
        
    def tool_get_task_status_analytics(self, arguments: Dict) -> Dict:
        return {"content": [{"type": "text", "text": "🔧 get_task_status_analytics: Implementation in progress"}]}
        
    def tool_validate_task_workflow(self, arguments: Dict) -> Dict:
        return {"content": [{"type": "text", "text": "🔧 validate_task_workflow: Implementation in progress"}]}
        
    def tool_get_automation_suggestions(self, arguments: Dict) -> Dict:
        return {"content": [{"type": "text", "text": "🔧 get_automation_suggestions: Implementation in progress"}]}
        
    def tool_enhance_memory_ollama(self, arguments: Dict) -> Dict:
        return {"content": [{"type": "text", "text": "🔧 enhance_memory_ollama: Implementation in progress"}]}
        
    def tool_deduplicate_memories(self, arguments: Dict) -> Dict:
        return {"content": [{"type": "text", "text": "🔧 deduplicate_memories: Implementation in progress"}]}

def main():
    """Main server loop with cross-platform stdio handling"""
    server = LikeISaidMCPServer()
    
    try:
        server.log_debug("Like-I-Said Python MCP Server v2 starting...")
        server.log_debug(f"Python: {sys.version}")
        server.log_debug(f"Platform: {sys.platform}")
        server.log_debug(f"Working directory: {Path.cwd()}")
        
        while True:
            try:
                # Read line from stdin
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
                continue
                
    except Exception as e:
        server.log_debug(f"Fatal server error: {str(e)}\n{traceback.format_exc()}")
        sys.exit(1)

if __name__ == "__main__":
    main()