#!/usr/bin/env node

// Minimal server that gradually adds components to identify hanging component

const isMCPMode = process.env.MCP_MODE === 'true' || !process.stdin.isTTY || process.env.MCP_QUIET === 'true';

import fs from 'fs';
import path from 'path';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

console.error('✅ Basic imports completed');

// Environment setup
const MEMORY_DIR = process.env.MEMORY_DIR || path.join(process.cwd(), 'memories');
const TASK_DIR = process.env.TASK_DIR || path.join(process.cwd(), 'tasks');

console.error('✅ Environment setup completed');

// Simple MarkdownStorage (copied from server-markdown.js)
class MarkdownStorage {
  constructor(baseDir = 'memories', defaultProject = 'default') {
    this.baseDir = baseDir;
    this.defaultProject = defaultProject;
    this.ensureDirectories();
  }

  ensureDirectories() {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
    
    const defaultProjectDir = path.join(this.baseDir, this.defaultProject);
    if (!fs.existsSync(defaultProjectDir)) {
      fs.mkdirSync(defaultProjectDir, { recursive: true });
    }
  }

  // Minimal implementation for testing
  getAllMemories() { return []; }
  addMemory() { return Promise.resolve({}); }
}

console.error('✅ MarkdownStorage class defined');

// Initialize storage
let storage = new MarkdownStorage(MEMORY_DIR);
console.error('✅ Storage initialized');

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

console.error('✅ MCP Server created');

// Add tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'test_tool',
        description: 'Simple test tool',
        inputSchema: {
          "$schema": "https://json-schema.org/draft/2020-12/schema",
          "type": "object",
          "properties": {
            "message": { "type": "string" }
          },
          "required": ["message"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  if (name === 'test_tool') {
    return {
      content: [{
        type: 'text',
        text: `✅ Test successful: ${args.message || 'No message'}`
      }]
    };
  }
  
  throw new Error(`Unknown tool: ${name}`);
});

console.error('✅ Tool handlers set');

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('✅ Server started successfully');
}

main().catch(error => {
  console.error('❌ Server failed:', error);
});

console.error('✅ Main function called');