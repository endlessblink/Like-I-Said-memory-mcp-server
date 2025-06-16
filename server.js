#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Memory storage
const MEMORY_FILE = path.join(process.cwd(), 'memories.json');

// Initialize memory storage
function initMemoryStorage() {
  if (!fs.existsSync(MEMORY_FILE)) {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify([], null, 2));
  }
}

// Load memories
function loadMemories() {
  try {
    return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
  } catch {
    return [];
  }
}

// Save memories
function saveMemories(memories) {
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(memories, null, 2));
}

// Initialize storage
initMemoryStorage();

console.error('Like-I-Said Memory Server v2 - Simple JSON Mode');

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

// Add tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
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
              description: 'The memory content to store'
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Optional tags for the memory'
            }
          },
          required: ['content']
        }
      },
      {
        name: 'get_memory',
        description: 'Retrieve a memory by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The memory ID to retrieve'
            }
          },
          required: ['id']
        }
      },
      {
        name: 'list_memories',
        description: 'List all stored memories',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of memories to return'
            }
          }
        }
      },
      {
        name: 'delete_memory',
        description: 'Delete a memory by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The memory ID to delete'
            }
          },
          required: ['id']
        }
      },
      {
        name: 'search_memories',
        description: 'Search memories by content',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query'
            }
          },
          required: ['query']
        }
      },
      {
        name: 'test_tool',
        description: 'Simple test tool to verify MCP is working',
        inputSchema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Test message'
            }
          },
          required: ['message']
        }
      }
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'test_tool':
        return {
          content: [{
            type: 'text',
            text: `✅ MCP Test successful! Message: ${args.message || 'No message provided'}`
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
            text: `✅ Memory stored with ID: ${newMemory.id}\nContent: ${newMemory.content}`
          }]
        };
      }

      case 'get_memory': {
        const memories = loadMemories();
        const memory = memories.find(m => m.id === args.id);
        if (!memory) {
          return {
            content: [{
              type: 'text',
              text: `❌ Memory with ID ${args.id} not found`
            }]
          };
        }
        return {
          content: [{
            type: 'text',
            text: `📝 Memory: ${memory.content}\n🏷️ Tags: ${memory.tags.join(', ') || 'none'}\n⏰ Created: ${memory.timestamp}`
          }]
        };
      }

      case 'list_memories': {
        const memories = loadMemories();
        const limit = args.limit || 10;
        const limitedMemories = memories.slice(-limit);
        if (memories.length === 0) {
          return {
            content: [{
              type: 'text',
              text: '📝 No memories stored yet. Use add_memory to create your first memory'
            }]
          };
        }
        const memoryList = limitedMemories.map(m => 
          `🆔 ${m.id} | 📝 ${m.content.substring(0, 50)}${m.content.length > 50 ? '...' : ''} | ⏰ ${new Date(m.timestamp).toLocaleDateString()}`
        ).join('\n');
        return {
          content: [{
            type: 'text',
            text: `📚 Total memories: ${memories.length}\n\n📋 Recent memories:\n${memoryList}`
          }]
        };
      }

      case 'delete_memory': {
        const memories = loadMemories();
        const initialLength = memories.length;
        const filteredMemories = memories.filter(m => m.id !== args.id);
        if (filteredMemories.length === initialLength) {
          return {
            content: [{
              type: 'text',
              text: `❌ Memory with ID ${args.id} not found`
            }]
          };
        }
        saveMemories(filteredMemories);
        return {
          content: [{
            type: 'text',
            text: `🗑️ Successfully deleted memory with ID: ${args.id}`
          }]
        };
      }

      case 'search_memories': {
        const memories = loadMemories();
        const query = args.query.toLowerCase();
        const results = memories.filter(m => 
          m.content.toLowerCase().includes(query) ||
          m.tags.some(tag => tag.toLowerCase().includes(query))
        );
        if (results.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `🔍 No memories found matching "${args.query}"`
            }]
          };
        }
        const resultList = results.map(m => 
          `🆔 ${m.id} | 📝 ${m.content} | 🏷️ ${m.tags.join(', ') || 'no tags'}`
        ).join('\n');
        return {
          content: [{
            type: 'text',
            text: `🔍 Found ${results.length} memories matching "${args.query}":\n\n${resultList}`
          }]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `❌ Error executing ${name}: ${error.message}`
      }],
      isError: true
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Like I Said Memory MCP Server v2 started successfully');
}

main().catch((error) => {
  console.error('Server failed to start:', error);
  process.exit(1);
});