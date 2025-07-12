# MCP Error Guide - What's Normal vs What's a Problem

## NORMAL Errors (These are OK)

### 1. "Method not found" for prompts/list and resources/list
```json
{"jsonrpc":"2.0","id":4,"error":{"code":-32601,"message":"Method not found"}}
```
**This is NORMAL** - Your server doesn't implement prompts or resources, only tools. Claude Desktop asks for all three, but only tools are required.

### 2. Multiple tools/list requests
Claude Desktop often sends multiple identical requests. This is normal behavior.

## PROBLEM Errors (These need fixing)

### 1. Startup messages in logs BETWEEN requests
If you see this pattern:
```
Message from client: {"method":"initialize"...}
Like-I-Said Memory Server v2 - Markdown File Mode  <-- PROBLEM!
Like I Said Memory MCP Server v2 started successfully  <-- PROBLEM!
Message from server: {"jsonrpc":"2.0","id":0,"result"...}
```
This means stdout is polluted. Use the mcp-server-clean.js wrapper.

### 2. No "Message from server" after "Message from client"
If you see client messages but no server responses, the server is crashing or not starting.

### 3. "Command not found" or "Cannot find module"
This means Node.js isn't installed or the path is wrong.

## How to Read the Logs

### Good Log Pattern:
```
Message from client: {"method":"initialize"...}
Message from server: {"jsonrpc":"2.0","id":0,"result":{"protocolVersion":"2024-11-05"...}}
Message from client: {"method":"tools/list"...}
Message from server: {"jsonrpc":"2.0","id":1,"result":{"tools":[...]}}
```

### Key Indicators of Success:
1. ✅ Server responds to initialize with protocolVersion
2. ✅ Server responds to tools/list with array of tools
3. ✅ "Method not found" ONLY for prompts/list and resources/list
4. ✅ No text between client request and server response

## Quick Checklist
- [ ] Using mcp-server-clean.js wrapper (not server-markdown.js directly)
- [ ] Path in config is absolute and correct
- [ ] Node.js is installed (`node --version` works)
- [ ] Claude Desktop fully restarted after config change
- [ ] Developer Mode enabled to see logs
- [ ] Server shows as "running" in Settings → Developer

If all checks pass but tools don't appear, check the log file for the specific error pattern.