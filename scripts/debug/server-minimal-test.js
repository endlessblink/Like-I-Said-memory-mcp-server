#!/usr/bin/env node

// Minimal MCP server to test schema compliance
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Create server
const server = new Server(
  {
    name: 'like-i-said-minimal-test',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tools with PROVEN COMPLIANT schemas
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'test_tool',
        description: 'Simple test tool to verify schema compliance',
        inputSchema: {
          "$schema": "https://json-schema.org/draft/2020-12/schema",
          "type": "object",
          "properties": {
            "message": {
              "type": "string",
              "description": "Test message"
            }
          },
          "required": ["message"],
          "additionalProperties": false
        }
      },
      {
        name: 'add_memory',
        description: 'Add a memory with compliant schema',
        inputSchema: {
          "$schema": "https://json-schema.org/draft/2020-12/schema",
          "type": "object",
          "properties": {
            "content": {
              "type": "string",
              "description": "The memory content"
            },
            "tags": {
              "type": "array",
              "items": { "type": "string" },
              "description": "Tags for the memory"
            }
          },
          "required": ["content"],
          "additionalProperties": false
        }
      }
    ]
  };
});

// Simple tool handlers
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  switch (name) {
    case 'test_tool':
      return {
        content: [{ type: 'text', text: `✅ Test successful! Message: ${args.message}` }]
      };
    case 'add_memory':
      return {
        content: [{ type: 'text', text: `✅ Memory added: ${args.content}` }]
      };
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Like-I-Said Minimal Test Server running...');
}

main().catch(console.error);