#!/usr/bin/env python3
"""
Debug script to understand exactly what data structures Claude Desktop expects
"""

import json
import sys

# Let's create a minimal MCP server that logs every message exchange
class MCPMessageDebugger:
    def __init__(self):
        self.message_count = 0
        
    def log_message(self, direction, message):
        """Log messages to stderr with detailed structure analysis"""
        self.message_count += 1
        print(f"\n=== MESSAGE {self.message_count} ({direction}) ===", file=sys.stderr)
        print(f"Raw: {json.dumps(message, indent=2)}", file=sys.stderr)
        
        # Analyze structure
        if isinstance(message, dict):
            print(f"Type: dict", file=sys.stderr)
            print(f"Keys: {list(message.keys())}", file=sys.stderr)
            
            # Check for required JSON-RPC fields
            for field in ["jsonrpc", "id", "method", "params", "result", "error"]:
                if field in message:
                    value = message[field]
                    print(f"  {field}: {type(value).__name__} = {repr(value)}", file=sys.stderr)
                    
        print("=" * 50, file=sys.stderr)
        sys.stderr.flush()
        
    def create_minimal_response(self, request):
        """Create the most minimal possible response"""
        req_id = request.get("id")
        method = request.get("method", "")
        
        if method == "initialize":
            response = {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {},
                    "serverInfo": {
                        "name": "debug-server",
                        "version": "1.0.0"
                    }
                }
            }
        elif method == "tools/list":
            response = {
                "jsonrpc": "2.0", 
                "id": req_id,
                "result": {
                    "tools": [
                        {
                            "name": "debug_tool",
                            "description": "Debug tool",
                            "inputSchema": {
                                "type": "object",
                                "properties": {}
                            }
                        }
                    ]
                }
            }
        elif method == "tools/call":
            response = {
                "jsonrpc": "2.0",
                "id": req_id, 
                "result": {
                    "content": [
                        {
                            "type": "text",
                            "text": "Debug response"
                        }
                    ]
                }
            }
        else:
            response = {
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {
                    "code": -32601,
                    "message": f"Method not found: {method}"
                }
            }
            
        return response

def main():
    """Main debug loop"""
    debugger = MCPMessageDebugger()
    
    print("=== MCP MESSAGE DEBUGGER STARTED ===", file=sys.stderr)
    print("This will log every message exchange to understand Zod validation issues", file=sys.stderr)
    sys.stderr.flush()
    
    try:
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
                
            try:
                # Parse incoming request
                request = json.loads(line)
                debugger.log_message("INCOMING", request)
                
                # Create response
                response = debugger.create_minimal_response(request)
                debugger.log_message("OUTGOING", response)
                
                # Send response
                print(json.dumps(response))
                sys.stdout.flush()
                
            except json.JSONDecodeError as e:
                print(f"JSON DECODE ERROR: {e}", file=sys.stderr)
                print(f"Raw line: {repr(line)}", file=sys.stderr)
                sys.stderr.flush()
                
    except KeyboardInterrupt:
        print("\\nDebugger stopped", file=sys.stderr)
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)

if __name__ == "__main__":
    main()