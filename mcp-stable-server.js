#!/usr/bin/env node

/**
 * Stable MCP Server - No modules that cause disconnection
 * This server will NOT exit unless explicitly killed
 */

import fs from 'fs';
import path from 'path';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Prevent ANY process exit
process.on('SIGINT', () => {
  // Ignore SIGINT
});

process.on('SIGTERM', () => {
  // Ignore SIGTERM
});

process.on('uncaughtException', (error) => {
  // Log to stderr but don't exit
  process.stderr.write(`[ERROR] ${error.message}\n`);
});

process.on('unhandledRejection', (reason) => {
  // Log to stderr but don't exit
  process.stderr.write(`[REJECTION] ${reason}\n`);
});

// Simple file-based storage
class SimpleStorage {
  constructor(baseDir = 'memories') {
    this.baseDir = baseDir;
    this.ensureDir();
  }

  ensureDir() {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async addMemory(memory) {
    const id = Date.now().toString();
    const filename = `${id}.json`;
    const filepath = path.join(this.baseDir, filename);
    
    const data = {
      id,
      content: memory.content,
      timestamp: new Date().toISOString(),
      tags: memory.tags || [],
      category: memory.category || 'general',
      project: memory.project || 'default'
    };
    
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    return data;
  }

  async listMemories(limit = 10) {
    const files = fs.readdirSync(this.baseDir)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse()
      .slice(0, limit);
    
    return files.map(file => {
      const content = fs.readFileSync(path.join(this.baseDir, file), 'utf8');
      return JSON.parse(content);
    });
  }

  async getMemory(id) {
    const filepath = path.join(this.baseDir, `${id}.json`);
    if (!fs.existsSync(filepath)) {
      return null;
    }
    const content = fs.readFileSync(filepath, 'utf8');
    return JSON.parse(content);
  }

  async deleteMemory(id) {
    const filepath = path.join(this.baseDir, `${id}.json`);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      return true;
    }
    return false;
  }

  async searchMemories(query) {
    const files = fs.readdirSync(this.baseDir)
      .filter(f => f.endsWith('.json'));
    
    const results = [];
    for (const file of files) {
      const content = fs.readFileSync(path.join(this.baseDir, file), 'utf8');
      const memory = JSON.parse(content);
      if (memory.content.toLowerCase().includes(query.toLowerCase())) {
        results.push(memory);
      }
    }
    
    return results;
  }
}

// Initialize storage
const storage = new SimpleStorage();

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

// Tool handlers
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
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Optional tags for the memory',
            },
            category: {
              type: 'string',
              description: 'Memory category',
            },
            project: {
              type: 'string',
              description: 'Project name',
            },
          },
          required: ['content'],
        },
      },
      {
        name: 'list_memories',
        description: 'List stored memories',
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
        name: 'get_memory',
        description: 'Retrieve a memory by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The memory ID to retrieve',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_memory',
        description: 'Delete a memory by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The memory ID to delete',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'search_memories',
        description: 'Search memories by content',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'test_tool',
        description: 'Simple test tool',
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

// Tool call handler
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'add_memory': {
        const memory = await storage.addMemory(args);
        return {
          content: [{
            type: 'text',
            text: `✅ Memory stored with ID: ${memory.id}`,
          }],
        };
      }

      case 'list_memories': {
        const memories = await storage.listMemories(args.limit || 10);
        if (memories.length === 0) {
          return {
            content: [{
              type: 'text',
              text: '📚 No memories stored yet.',
            }],
          };
        }
        
        const list = memories.map(m => 
          `[${m.id}] ${m.timestamp}: ${m.content.substring(0, 50)}...`
        ).join('\n');
        
        return {
          content: [{
            type: 'text',
            text: `📚 Memories (${memories.length}):\n${list}`,
          }],
        };
      }

      case 'get_memory': {
        const memory = await storage.getMemory(args.id);
        if (!memory) {
          return {
            content: [{
              type: 'text',
              text: `❌ Memory not found: ${args.id}`,
            }],
          };
        }
        
        return {
          content: [{
            type: 'text',
            text: `📝 Memory ${memory.id}:\n${memory.content}`,
          }],
        };
      }

      case 'delete_memory': {
        const deleted = await storage.deleteMemory(args.id);
        return {
          content: [{
            type: 'text',
            text: deleted ? `✅ Memory ${args.id} deleted` : `❌ Memory not found: ${args.id}`,
          }],
        };
      }

      case 'search_memories': {
        const results = await storage.searchMemories(args.query);
        if (results.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `🔍 No memories found for: ${args.query}`,
            }],
          };
        }
        
        const list = results.map(m => 
          `[${m.id}] ${m.content.substring(0, 50)}...`
        ).join('\n');
        
        return {
          content: [{
            type: 'text',
            text: `🔍 Found ${results.length} memories:\n${list}`,
          }],
        };
      }

      case 'test_tool': {
        return {
          content: [{
            type: 'text',
            text: `✅ Test successful! Message: ${args.message}`,
          }],
        };
      }

      default:
        return {
          content: [{
            type: 'text',
            text: `❌ Unknown tool: ${name}`,
          }],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `❌ Error: ${error.message}`,
      }],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  // Keep the process alive
  setInterval(() => {
    // Heartbeat to keep process alive
  }, 10000);
}

// Start without any error handling that might exit
main();