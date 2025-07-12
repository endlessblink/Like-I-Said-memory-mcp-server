#!/usr/bin/env node

/**
 * Minimal Standalone MCP Server
 * Self-contained with no external library dependencies
 * Optimized for pkg bundling
 */

// Basic MCP Server implementation without external dependencies
class MinimalMCPServer {
  constructor() {
    this.tools = [
      {
        name: 'add_memory',
        description: 'Store a memory (basic implementation)',
        inputSchema: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'Memory content' },
            project: { type: 'string', description: 'Project name' }
          },
          required: ['content']
        }
      },
      {
        name: 'list_memories',
        description: 'List stored memories',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Max memories to return' }
          }
        }
      },
      {
        name: 'test_tool',
        description: 'Test MCP connection',
        inputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string', description: 'Test message' }
          },
          required: ['message']
        }
      }
    ];
    
    this.memories = new Map();
    this.nextId = Date.now();
  }

  handleRequest(request) {
    const { method, params, id } = request;
    
    try {
      switch (method) {
        case 'tools/list':
          return this.createResponse(id, { tools: this.tools });
          
        case 'tools/call':
          return this.handleToolCall(id, params);
          
        default:
          return this.createError(id, -32601, 'Method not found');
      }
    } catch (error) {
      return this.createError(id, -32603, `Internal error: ${error.message}`);
    }
  }

  handleToolCall(id, params) {
    const { name, arguments: args } = params;
    
    switch (name) {
      case 'add_memory':
        return this.addMemory(id, args);
      case 'list_memories':
        return this.listMemories(id, args);
      case 'test_tool':
        return this.testTool(id, args);
      default:
        return this.createError(id, -32602, `Unknown tool: ${name}`);
    }
  }

  addMemory(id, args) {
    const memoryId = (this.nextId++).toString();
    const memory = {
      id: memoryId,
      content: args.content,
      project: args.project || 'default',
      timestamp: new Date().toISOString()
    };
    
    this.memories.set(memoryId, memory);
    
    return this.createResponse(id, {
      content: [{
        type: 'text',
        text: `✅ Memory stored successfully!\n🆔 ID: ${memoryId}\n📁 Project: ${memory.project}`
      }]
    });
  }

  listMemories(id, args) {
    const limit = args.limit || 10;
    const allMemories = Array.from(this.memories.values())
      .slice(-limit)
      .reverse();
    
    if (allMemories.length === 0) {
      return this.createResponse(id, {
        content: [{
          type: 'text',
          text: '📚 No memories stored yet.'
        }]
      });
    }
    
    const memoryList = allMemories
      .map(m => `📋 ${m.id} (${m.project}) - ${new Date(m.timestamp).toLocaleDateString()}`)
      .join('\n');
    
    return this.createResponse(id, {
      content: [{
        type: 'text',
        text: `📚 Found ${allMemories.length} memories:\n\n${memoryList}`
      }]
    });
  }

  testTool(id, args) {
    return this.createResponse(id, {
      content: [{
        type: 'text',
        text: `✅ MCP Server is working! Message: ${args.message}`
      }]
    });
  }

  createResponse(id, result) {
    return {
      jsonrpc: '2.0',
      id,
      result
    };
  }

  createError(id, code, message) {
    return {
      jsonrpc: '2.0',
      id,
      error: { code, message }
    };
  }
}

// Stdio transport implementation
class StdioTransport {
  constructor() {
    this.server = new MinimalMCPServer();
    this.setupIO();
  }

  setupIO() {
    let buffer = '';
    
    process.stdin.on('data', (chunk) => {
      buffer += chunk.toString();
      
      // Process complete JSON messages
      let lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer
      
      for (const line of lines) {
        if (line.trim()) {
          try {
            const request = JSON.parse(line.trim());
            const response = this.server.handleRequest(request);
            this.sendResponse(response);
          } catch (error) {
            // Send error response for invalid JSON
            this.sendResponse({
              jsonrpc: '2.0',
              id: null,
              error: { code: -32700, message: 'Parse error' }
            });
          }
        }
      }
    });

    process.stdin.on('end', () => {
      process.exit(0);
    });
  }

  sendResponse(response) {
    process.stdout.write(JSON.stringify(response) + '\n');
  }
}

// Suppress all console output to stderr
console.log = console.error = console.warn = console.info = console.debug = () => {};

// Start the server
new StdioTransport();