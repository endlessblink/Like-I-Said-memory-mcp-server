#!/usr/bin/env node

// Minimal MCP server for testing
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Create server
const server = new Server(
  {
    name: 'test-like-i-said',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Add a single test tool
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'test_tool',
        description: 'Test tool for MCP connectivity',
        inputSchema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Test message',
            },
          },
          required: ['message'],
        },
      }
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  if (name === 'test_tool') {
    return {
      content: [
        {
          type: 'text',
          text: `✅ MCP Test successful! Message: ${args.message}`,
        },
      ],
    };
  }
  
  throw new Error(`Unknown tool: ${name}`);
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Minimal Test Server started successfully');
}

main().catch(console.error);