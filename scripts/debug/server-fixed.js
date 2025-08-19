#!/usr/bin/env node

// Fixed MCP Server with proper error handling and startup timeout
// Based on MCP TypeScript SDK best practices

const isMCPMode = process.env.MCP_MODE === 'true' || !process.stdin.isTTY || process.env.MCP_QUIET === 'true';

import fs from 'fs';
import path from 'path';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Essential imports only - avoiding potentially problematic components
import { DropoffGenerator } from './lib/dropoff-generator.js';
import { TaskStorage } from './lib/task-storage.js';
import { TaskMemoryLinker } from './lib/task-memory-linker.js';
import { TitleSummaryGenerator } from './lib/title-summary-generator.js';
import { OllamaClient } from './lib/ollama-client.js';

console.error('✅ Essential imports loaded');

// Environment setup with proper defaults
const MEMORY_DIR = process.env.MEMORY_DIR || path.join(process.cwd(), 'memories');
const TASK_DIR = process.env.TASK_DIR || path.join(process.cwd(), 'tasks');

console.error(`✅ Environment: Memory=${MEMORY_DIR}, Tasks=${TASK_DIR}`);

// Simple MarkdownStorage implementation
class MarkdownStorage {
  constructor(baseDir = 'memories', defaultProject = 'default') {
    this.baseDir = baseDir;
    this.defaultProject = defaultProject;
    this.ensureDirectories();
  }

  ensureDirectories() {
    try {
      if (!fs.existsSync(this.baseDir)) {
        fs.mkdirSync(this.baseDir, { recursive: true });
      }
      
      const defaultProjectDir = path.join(this.baseDir, this.defaultProject);
      if (!fs.existsSync(defaultProjectDir)) {
        fs.mkdirSync(defaultProjectDir, { recursive: true });
      }
    } catch (error) {
      console.error('Warning: Could not create directories:', error.message);
    }
  }

  async getAllMemories(project = null) {
    try {
      const projectDir = path.join(this.baseDir, project || this.defaultProject);
      if (!fs.existsSync(projectDir)) return [];
      
      const files = fs.readdirSync(projectDir).filter(f => f.endsWith('.md'));
      return files.map(file => ({
        id: path.basename(file, '.md'),
        project: project || this.defaultProject,
        path: path.join(projectDir, file)
      }));
    } catch (error) {
      console.error('Error getting memories:', error.message);
      return [];
    }
  }

  async addMemory(content, options = {}) {
    try {
      const project = options.project || this.defaultProject;
      const id = Date.now().toString();
      const filename = `${new Date().toISOString().split('T')[0]}-${id}.md`;
      const projectDir = path.join(this.baseDir, project);
      
      if (!fs.existsSync(projectDir)) {
        fs.mkdirSync(projectDir, { recursive: true });
      }
      
      const filePath = path.join(projectDir, filename);
      const frontmatter = `---
id: ${id}
timestamp: ${new Date().toISOString()}
project: ${project}
tags: ${JSON.stringify(options.tags || [])}
---

${content}`;
      
      fs.writeFileSync(filePath, frontmatter);
      return { id, project, path: filePath };
    } catch (error) {
      console.error('Error adding memory:', error.message);
      throw error;
    }
  }
}

console.error('✅ MarkdownStorage defined');

// Initialize storage with timeout protection
let storage;
try {
  storage = new MarkdownStorage(MEMORY_DIR);
  console.error('✅ Storage initialized');
} catch (error) {
  console.error('❌ Storage initialization failed:', error.message);
  process.exit(1);
}

// Initialize minimal required components with error handling
let taskStorage, taskMemoryLinker, dropoffGenerator;

try {
  taskStorage = new TaskStorage(TASK_DIR, storage);
  console.error('✅ TaskStorage initialized');
  
  taskMemoryLinker = new TaskMemoryLinker(storage, taskStorage);
  console.error('✅ TaskMemoryLinker initialized');
  
  dropoffGenerator = new DropoffGenerator();
  console.error('✅ DropoffGenerator initialized');
} catch (error) {
  console.error('❌ Component initialization failed:', error.message);
  // Continue with limited functionality
  taskStorage = null;
  taskMemoryLinker = null;
  dropoffGenerator = null;
}

// Create MCP server with proper error handling
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

// Add essential tools only
server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.error('📋 ListTools called');
  return {
    tools: [
      {
        name: 'add_memory',
        description: 'Store a new memory with automatic categorization',
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
            },
            "project": {
              "type": "string",
              "description": "Optional project name"
            }
          },
          "required": ["content"],
          "additionalProperties": false
        }
      },
      {
        name: 'list_memories',
        description: 'List all stored memories',
        inputSchema: {
          "$schema": "https://json-schema.org/draft/2020-12/schema",
          "type": "object",
          "properties": {
            "project": {
              "type": "string",
              "description": "Optional project filter"
            }
          },
          "additionalProperties": false
        }
      },
      {
        name: 'test_tool',
        description: 'Test MCP server connectivity',
        inputSchema: {
          "$schema": "https://json-schema.org/draft/2020-12/schema",
          "type": "object",
          "properties": {
            "message": {
              "type": "string",
              "description": "Test message"
            }
          },
          "additionalProperties": false
        }
      }
    ]
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
            text: `✅ MCP Server v2 is working! Message: ${args.message || 'No message'}`
          }]
        };

      case 'add_memory':
        if (!storage) {
          throw new Error('Storage not available');
        }
        
        const memory = await storage.addMemory(args.content, {
          tags: args.tags || [],
          project: args.project
        });
        
        return {
          content: [{
            type: 'text',
            text: `✅ Memory stored successfully with ID: ${memory.id}`
          }]
        };

      case 'list_memories':
        if (!storage) {
          throw new Error('Storage not available');
        }
        
        const memories = await storage.getAllMemories(args.project);
        return {
          content: [{
            type: 'text',
            text: `Found ${memories.length} memories:\n${memories.map(m => `- ${m.id} (${m.project})`).join('\n')}`
          }]
        };

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

console.error('✅ Tool handlers configured');

// Start the server with timeout protection
async function main() {
  try {
    // Add startup timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Server startup timeout')), 10000);
    });

    const startupPromise = (async () => {
      const transport = new StdioServerTransport();
      console.error('✅ Transport created');
      
      await server.connect(transport);
      console.error('✅ Like I Said Memory MCP Server v2 (Fixed) started successfully');
    })();

    await Promise.race([startupPromise, timeoutPromise]);
  } catch (error) {
    console.error('❌ Server startup failed:', error.message);
    process.exit(1);
  }
}

// Error handlers
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error.message);
  if (!isMCPMode) console.error(error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.error('🛑 Received SIGINT, shutting down...');
  process.exit(0);
});

main().catch(error => {
  console.error('❌ Main function error:', error.message);
  process.exit(1);
});

console.error('✅ Server initialization complete');