#!/usr/bin/env python3
"""
Like-I-Said v2 - MCP Protocol Compliant Server
Fixes the exact issues discovered in debug logs:
1. Handle "initialized" correctly (not "notifications/initialized")  
2. Implement resources/list and prompts/list properly
3. Follow MCP 2024-11-05 protocol exactly
"""

import json
import sys
import os
import uuid
from pathlib import Path
from datetime import datetime

class ProtocolCompliantServer:
    def __init__(self):
        self.memories_dir = Path("memories")
        self.memories_dir.mkdir(exist_ok=True)
        self.initialized = False
        
    def handle_message(self, request):
        """Handle JSON-RPC message with proper MCP protocol compliance"""
        request_id = request.get("id")
        method = request.get("method", "")
        params = request.get("params", {})
        
        # Route to proper handlers based on MCP 2024-11-05 protocol
        if method == "initialize":
            return self.handle_initialize(request_id, params)
        elif method == "initialized":  # FIX: Not "notifications/initialized"
            self.handle_initialized()
            return None  # No response for notifications
        elif method == "tools/list":
            return self.handle_tools_list(request_id)
        elif method == "tools/call":
            return self.handle_tools_call(request_id, params)
        elif method == "resources/list":  # FIX: Implement instead of rejecting
            return self.handle_resources_list(request_id)
        elif method == "prompts/list":   # FIX: Implement instead of rejecting
            return self.handle_prompts_list(request_id)
        else:
            return self.error_response(request_id, -32601, f"Method not found: {method}")
            
    def handle_initialize(self, request_id, params):
        """Handle initialize request - must respond correctly"""
        return {
            "jsonrpc": "2.0", 
            "id": request_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "tools": {},
                    "resources": {},  # Indicate we support resources
                    "prompts": {}     # Indicate we support prompts
                },
                "serverInfo": {
                    "name": "like-i-said-v2",
                    "version": "2.0.0"
                }
            }
        }
        
    def handle_initialized(self):
        """Handle initialized notification - fixed method name"""
        self.initialized = True
        # This is a notification - no response needed
        
    def handle_tools_list(self, request_id):
        """Return available tools - this was working correctly"""
        tools = [
            {
                "name": "test_tool",
                "description": "Test MCP connection",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "message": {
                            "type": "string",
                            "default": "Hello from Like-I-Said!"
                        }
                    }
                }
            },
            {
                "name": "add_memory",
                "description": "Store information in memory",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "content": {"type": "string"},
                        "category": {"type": "string", "default": "general"},
                        "tags": {"type": "array", "items": {"type": "string"}, "default": []}
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
                        "limit": {"type": "integer", "default": 10, "minimum": 1, "maximum": 100}
                    }
                }
            },
            {
                "name": "search_memories", 
                "description": "Search memories by content",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string"}
                    },
                    "required": ["query"]
                }
            }
        ]
        
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {"tools": tools}
        }
        
    def handle_resources_list(self, request_id):
        """Handle resources/list - implement instead of rejecting"""
        # Return empty resources list (we don't have any resources)
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {"resources": []}
        }
        
    def handle_prompts_list(self, request_id):
        """Handle prompts/list - implement instead of rejecting"""
        # Return empty prompts list (we don't have any prompts)
        return {
            "jsonrpc": "2.0", 
            "id": request_id,
            "result": {"prompts": []}
        }
        
    def handle_tools_call(self, request_id, params):
        """Handle tool execution"""
        tool_name = params.get("name")
        arguments = params.get("arguments", {})
        
        if tool_name == "test_tool":
            message = arguments.get("message", "Hello from Like-I-Said!")
            result = {
                "content": [
                    {
                        "type": "text", 
                        "text": f"✅ MCP Connection Working! {message}"
                    }
                ]
            }
        elif tool_name == "add_memory":
            result = self.tool_add_memory(arguments)
        elif tool_name == "list_memories":
            result = self.tool_list_memories(arguments)
        elif tool_name == "search_memories":
            result = self.tool_search_memories(arguments)
        else:
            return self.error_response(request_id, -32602, f"Unknown tool: {tool_name}")
            
        return {
            "jsonrpc": "2.0",
            "id": request_id, 
            "result": result
        }
        
    def tool_add_memory(self, args):
        """Add memory tool implementation"""
        content = args.get("content", "")
        if not content:
            return {"content": [{"type": "text", "text": "❌ Content is required"}]}
            
        memory_id = str(uuid.uuid4())
        timestamp = datetime.now().isoformat()
        category = args.get("category", "general")
        tags = args.get("tags", [])
        
        # Create memory file with YAML frontmatter
        memory_content = f"""---
id: {memory_id}
timestamp: {timestamp}
category: {category}
tags: {tags}
---

{content}"""
        
        filename = f"{timestamp[:10]}-{memory_id[:8]}.md"
        filepath = self.memories_dir / filename
        filepath.write_text(memory_content, encoding="utf-8")
        
        return {
            "content": [
                {
                    "type": "text",
                    "text": f"✅ Memory stored with ID: {memory_id}"
                }
            ]
        }
        
    def tool_list_memories(self, args):
        """List memories tool implementation"""
        limit = min(args.get("limit", 10), 100)
        
        memories = []
        for memory_file in sorted(self.memories_dir.glob("*.md"), reverse=True)[:limit]:
            try:
                content = memory_file.read_text(encoding="utf-8")
                # Extract basic info
                lines = content.split('\n')
                memory_info = f"📄 {memory_file.name}"
                if len(lines) > 10:  # Skip frontmatter and get content preview
                    content_preview = '\n'.join(lines[8:10])  # First 2 lines of content
                    memory_info += f"\n   {content_preview[:100]}..."
                memories.append(memory_info)
            except:
                pass
                
        text = f"📚 Found {len(memories)} memories:\n\n" + "\n\n".join(memories)
        
        return {
            "content": [
                {
                    "type": "text",
                    "text": text
                }
            ]
        }
        
    def tool_search_memories(self, args):
        """Search memories tool implementation"""
        query = args.get("query", "").lower()
        if not query:
            return {"content": [{"type": "text", "text": "❌ Query is required"}]}
            
        results = []
        for memory_file in self.memories_dir.glob("*.md"):
            try:
                content = memory_file.read_text(encoding="utf-8").lower()
                if query in content:
                    # Find context around match
                    lines = content.split('\n')
                    for i, line in enumerate(lines):
                        if query in line:
                            start = max(0, i-1)
                            end = min(len(lines), i+2)
                            context = '\n'.join(lines[start:end])
                            results.append(f"📄 {memory_file.name}:\n{context[:150]}...")
                            break
            except:
                pass
                
        if not results:
            text = f"🔍 No memories found matching '{query}'"
        else:
            text = f"🔍 Found {len(results)} memories matching '{query}':\n\n" + "\n\n".join(results)
            
        return {
            "content": [
                {
                    "type": "text",
                    "text": text
                }
            ]
        }
        
    def error_response(self, request_id, code, message):
        """Create JSON-RPC error response"""
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "error": {
                "code": code,
                "message": message
            }
        }

def main():
    """Main server loop - use the proven pattern from debug logs"""
    server = ProtocolCompliantServer()
    
    try:
        # Use the exact same simple pattern that worked in debug logs
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
                
            try:
                request = json.loads(line)
                response = server.handle_message(request)
                
                # Send response if not None (notifications don't get responses)
                if response is not None:
                    print(json.dumps(response), flush=True)
                    
            except json.JSONDecodeError:
                # Send parse error
                error = {
                    "jsonrpc": "2.0",
                    "id": None,
                    "error": {"code": -32700, "message": "Parse error"}
                }
                print(json.dumps(error), flush=True)
                
    except KeyboardInterrupt:
        pass

if __name__ == "__main__":
    main()
