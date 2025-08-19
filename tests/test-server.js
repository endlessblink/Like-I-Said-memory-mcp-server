#!/usr/bin/env node

// Test the actual server startup process
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

console.error('Like-I-Said Memory Server v2 - Test Mode');
console.error('🔍 Testing server initialization...');

// Create MCP server exactly like the real one
const server = new Server(
  {
    name: 'like-i-said-memory-v2',
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

console.error('✅ Server created');

// Add a simple test tool
server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.error('📋 ListTools called');
  return {
    tools: [
      {
        name: 'test_tool',
        description: 'Simple test tool',
        inputSchema: {
          "$schema": "https://json-schema.org/draft/2020-12/schema",
          "type": "object",
          "properties": {
            "message": {
              "type": "string",
              "description": "Test message",
              "minLength": 1
            }
          },
          "required": ["message"],
          "additionalProperties": false
        }
      }
    ],
  };
});

console.error('✅ Tool handler set');

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  console.error('🔧 CallTool called:', request.params.name);
  return {
    content: [{
      type: 'text',
      text: `✅ Test successful: ${request.params.arguments?.message || 'No message'}`
    }]
  };
});

console.error('✅ Call handler set');

// Start the server with timeout
console.error('🚀 Starting server...');

async function main() {
  try {
    const transport = new StdioServerTransport();
    console.error('✅ Transport created');
    
    await server.connect(transport);
    console.error('✅ Server connected - waiting for requests');
    
    // Set a timeout to exit after 5 seconds if no input
    setTimeout(() => {
      console.error('⏰ Test timeout - server appears to be working');
      process.exit(0);
    }, 5000);
    
  } catch (error) {
    console.error('❌ Server failed to start:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

main();
