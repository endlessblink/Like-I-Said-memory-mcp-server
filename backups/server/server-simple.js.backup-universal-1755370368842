#!/usr/bin/env node

// Simplified server-markdown.js for testing
// This version includes only essential functionality to identify startup issues

console.error('Like-I-Said Memory Server v2 - Simplified Mode');

import fs from 'fs';
import path from 'path';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Simple memory storage
const MEMORY_FILE = path.join(process.cwd(), 'memories.json');

function initMemoryStorage() {
  if (!fs.existsSync(MEMORY_FILE)) {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify([], null, 2));
  }
}

function loadMemories() {
  try {
    return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveMemories(memories) {
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(memories, null, 2));
}

initMemoryStorage();

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

console.error('✅ Server created');

// Add tool handlers with proper JSON Schema
server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.error('📋 ListTools called');
  return {
    tools: [
      {
        name: 'add_memory',
        description: 'Store a new memory',
        inputSchema: {
          "$schema": "https://json-schema.org/draft/2020-12/schema",
          "type": "object",
          "properties": {
            "content": {
              "type": "string",
              "description": "The memory content to store",
              "minLength": 1
            },
            "tags": {
              "type": "array",
              "items": { "type": "string" },
              "description": "Optional tags for the memory"
            }
          },
          "required": ["content"],
          "additionalProperties": false
        }
      },
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

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  console.error(`🔧 CallTool: ${name}`);

  try {
    switch (name) {
      case 'test_tool':
        return {
          content: [{
            type: 'text',
            text: `✅ Test successful: ${args.message || 'No message'}`
          }]
        };

      case 'add_memory': {
        const memories = loadMemories();
        const newMemory = {
          id: Date.now().toString(),
          content: args.content,
          tags: args.tags || [],
          timestamp: new Date().toISOString()
        };
        memories.push(newMemory);
        saveMemories(memories);
        return {
          content: [{
            type: 'text',
            text: `✅ Memory stored with ID: ${newMemory.id}`
          }]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    console.error(`❌ Error in ${name}:`, error.message);
    return {
      content: [{
        type: 'text',
        text: `❌ Error: ${error.message}`
      }],
      isError: true
    };
  }
});

console.error('✅ Tool handlers set');

// Start the server
async function main() {
  try {
    const transport = new StdioServerTransport();
    console.error('✅ Transport created');
    
    await server.connect(transport);
    console.error('✅ Like I Said Memory MCP Server v2 started successfully');
    
  } catch (error) {
    console.error('❌ Server failed to start:', error.message);
    process.exit(1);
  }
}

main();
