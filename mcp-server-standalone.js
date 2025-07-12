#!/usr/bin/env node

/**
 * Standalone MCP Server - No imports that might print to stdout
 * This is a minimal implementation to test if the basic protocol works
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import fs from 'fs';
import path from 'path';

// Override console to prevent ANY output to stdout
const originalConsoleError = console.error;
console.log = () => {};
console.info = () => {};
console.warn = () => {};
console.debug = () => {};
console.error = (...args) => {
  if (process.env.DEBUG_MCP) {
    originalConsoleError('[DEBUG]', ...args);
  }
};

// Simple in-memory storage for testing
const memories = new Map();
let nextId = Date.now();

// Create MCP server
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

// List tools
server.setRequestHandler('tools/list', async () => {
  return {
    tools: [
      {
        name: 'add_memory',
        description: 'Store a new memory',
        inputSchema: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'The memory content to store',
            },
          },
          required: ['content'],
        },
      },
      {
        name: 'list_memories',
        description: 'List all stored memories',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of memories to return',
            },
          },
        },
      },
      {
        name: 'test_tool',
        description: 'Simple test tool to verify MCP is working',
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
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'add_memory': {
      const id = (nextId++).toString();
      memories.set(id, {
        id,
        content: args.content,
        timestamp: new Date().toISOString(),
      });
      
      return {
        content: [
          {
            type: 'text',
            text: `✅ Memory stored successfully with ID: ${id}`,
          },
        ],
      };
    }
    
    case 'list_memories': {
      const limit = args.limit || 10;
      const allMemories = Array.from(memories.values()).slice(-limit).reverse();
      
      if (allMemories.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: '📚 No memories stored yet.',
            },
          ],
        };
      }
      
      const text = allMemories
        .map(m => `[${m.id}] ${m.timestamp}: ${m.content.substring(0, 50)}...`)
        .join('\n');
      
      return {
        content: [
          {
            type: 'text',
            text: `📚 Memories (${allMemories.length}):\n${text}`,
          },
        ],
      };
    }
    
    case 'test_tool': {
      return {
        content: [
          {
            type: 'text',
            text: `✅ MCP Test successful! Message: ${args.message || 'none'}`,
          },
        ],
      };
    }
    
    default:
      return {
        content: [
          {
            type: 'text',
            text: `❌ Unknown tool: ${name}`,
          },
        ],
        isError: true,
      };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // NO OUTPUT AT ALL
}

// Run with absolutely no error output to stdout
main().catch(() => {
  // Even errors must not go to stdout
  process.exit(1);
});