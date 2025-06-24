#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import express from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Load .env file if it exists
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
  console.error('.env file loaded successfully');
}

// GitHub API Integration
class GitHubAPI {
  constructor() {
    this.baseURL = 'https://api.github.com';
    this.token = process.env.GITHUB_TOKEN;
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Like-I-Said-MCP-v2',
      ...options.headers
    };

    if (this.token) {
      headers.Authorization = `token ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`GitHub API request failed: ${error.message}`);
      throw error;
    }
  }
}

// Memory Management System
class MemoryManager {
  constructor() {
    this.memoryFile = process.env.MCP_MEMORY_PATH || './memories.json';
    this.memoryDir = path.dirname(this.memoryFile);
    this.githubAPI = new GitHubAPI();
    
    // Ensure memory directory exists
    if (!fs.existsSync(this.memoryDir)) {
      fs.mkdirSync(this.memoryDir, { recursive: true });
    }
    
    this.memories = this.loadMemories();
  }

  loadMemories() {
    try {
      if (fs.existsSync(this.memoryFile)) {
        const stats = fs.statSync(this.memoryFile);
        if (stats.isDirectory()) {
          console.log('Memory path is directory, creating memories.json file');
          this.memoryFile = path.join(this.memoryFile, 'memories.json');
        }
        if (fs.existsSync(this.memoryFile) && !fs.statSync(this.memoryFile).isDirectory()) {
          const data = fs.readFileSync(this.memoryFile, 'utf8');
          return JSON.parse(data);
        }
      }
    } catch (error) {
      console.error('Error loading memories:', error);
    }
    return {};
  }

  saveMemories() {
    try {
      fs.writeFileSync(this.memoryFile, JSON.stringify(this.memories, null, 2));
    } catch (error) {
      console.error('Error saving memories:', error);
      throw error;
    }
  }

  addMemory(content, tags = [], project = 'default') {
    const id = Date.now().toString();
    const memory = {
      id,
      content,
      tags: Array.isArray(tags) ? tags : [],
      timestamp: new Date().toISOString(),
      project,
      metadata: {
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
        accessCount: 0,
        clients: [],
        contentType: this.detectContentType(content),
        size: content.length
      }
    };
    
    this.memories[id] = memory;
    this.saveMemories();
    return memory;
  }

  detectContentType(content) {
    if (content.match(/^```[\w]*\n[\s\S]*\n```$/m)) return 'code';
    if (content.match(/^\{[\s\S]*\}$/) || content.match(/^\[[\s\S]*\]$/)) return 'structured';
    return 'text';
  }

  getMemory(id) {
    const memory = this.memories[id];
    if (memory) {
      memory.metadata.lastAccessed = new Date().toISOString();
      memory.metadata.accessCount = (memory.metadata.accessCount || 0) + 1;
      this.saveMemories();
    }
    return memory;
  }

  listMemories(project = null) {
    const memories = Object.values(this.memories);
    if (project) {
      return memories.filter(m => m.project === project);
    }
    return memories;
  }

  searchMemories(query, project = null) {
    const memories = this.listMemories(project);
    const lowerQuery = query.toLowerCase();
    
    return memories.filter(memory => 
      memory.content.toLowerCase().includes(lowerQuery) ||
      memory.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
      (memory.project && memory.project.toLowerCase().includes(lowerQuery))
    );
  }

  deleteMemory(id) {
    if (this.memories[id]) {
      delete this.memories[id];
      this.saveMemories();
      return true;
    }
    return false;
  }
}

// Initialize memory manager
const memoryManager = new MemoryManager();

// Create MCP server
const server = new Server(
  {
    name: 'like-i-said-memory',
    version: '2.0.3',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'add_memory',
        description: 'Store a memory with content, optional tags, and project context',
        inputSchema: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'The content to remember',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Optional tags for categorization',
            },
            project: {
              type: 'string',
              description: 'Project context for the memory',
              default: 'default',
            },
          },
          required: ['content'],
        },
      },
      {
        name: 'get_memory',
        description: 'Retrieve a specific memory by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The ID of the memory to retrieve',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_memories',
        description: 'List all memories, optionally filtered by project',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'Optional project filter',
            },
          },
        },
      },
      {
        name: 'search_memories',
        description: 'Search memories by content, tags, or project',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query',
            },
            project: {
              type: 'string',
              description: 'Optional project filter',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'delete_memory',
        description: 'Delete a specific memory by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The ID of the memory to delete',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'test_tool',
        description: 'Test MCP connection and return server status',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'add_memory': {
        const memory = memoryManager.addMemory(
          args.content,
          args.tags || [],
          args.project || 'default'
        );
        return {
          content: [
            {
              type: 'text',
              text: `Memory added successfully!\nID: ${memory.id}\nContent: ${memory.content.substring(0, 100)}${memory.content.length > 100 ? '...' : ''}\nTags: ${memory.tags.join(', ')}\nProject: ${memory.project}`,
            },
          ],
        };
      }

      case 'get_memory': {
        const memory = memoryManager.getMemory(args.id);
        if (!memory) {
          return {
            content: [
              {
                type: 'text',
                text: `Memory with ID ${args.id} not found.`,
              },
            ],
          };
        }
        return {
          content: [
            {
              type: 'text',
              text: `Memory ID: ${memory.id}\nContent: ${memory.content}\nTags: ${memory.tags.join(', ')}\nProject: ${memory.project}\nCreated: ${memory.timestamp}\nAccessed: ${memory.metadata?.accessCount || 0} times`,
            },
          ],
        };
      }

      case 'list_memories': {
        const memories = memoryManager.listMemories(args.project);
        if (memories.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: args.project ? `No memories found for project: ${args.project}` : 'No memories found.',
              },
            ],
          };
        }
        const memoryList = memories.map(m => 
          `ID: ${m.id} | ${m.content.substring(0, 80)}${m.content.length > 80 ? '...' : ''} | Tags: ${m.tags.join(', ')} | Project: ${m.project}`
        ).join('\n');
        return {
          content: [
            {
              type: 'text',
              text: `Found ${memories.length} memories:\n\n${memoryList}`,
            },
          ],
        };
      }

      case 'search_memories': {
        const results = memoryManager.searchMemories(args.query, args.project);
        if (results.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No memories found matching: "${args.query}"`,
              },
            ],
          };
        }
        const resultList = results.map(m => 
          `ID: ${m.id} | ${m.content.substring(0, 80)}${m.content.length > 80 ? '...' : ''} | Tags: ${m.tags.join(', ')} | Project: ${m.project}`
        ).join('\n');
        return {
          content: [
            {
              type: 'text',
              text: `Found ${results.length} memories matching "${args.query}":\n\n${resultList}`,
            },
          ],
        };
      }

      case 'delete_memory': {
        const success = memoryManager.deleteMemory(args.id);
        return {
          content: [
            {
              type: 'text',
              text: success ? `Memory ${args.id} deleted successfully.` : `Memory ${args.id} not found.`,
            },
          ],
        };
      }

      case 'test_tool': {
        const memoryCount = Object.keys(memoryManager.memories).length;
        return {
          content: [
            {
              type: 'text',
              text: `✅ Like-I-Said MCP Server v2.0.3 is working!\n\nServer Status:\n- Memory count: ${memoryCount}\n- Memory file: ${memoryManager.memoryFile}\n- GitHub API: ${memoryManager.githubAPI.token ? 'Configured' : 'Not configured'}\n- Transport: HTTP Native\n- Tools available: 6`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Create Express app
const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    server: 'like-i-said-memory',
    version: '2.0.3',
    transport: 'http-native',
    memoryCount: Object.keys(memoryManager.memories).length
  });
});

// MCP endpoint with SSE transport
app.get('/mcp/sse', async (req, res) => {
  const transport = new SSEServerTransport('/mcp/sse', server);
  await transport.handleConnection(req, res);
});

// Handle MCP POST requests
app.post('/mcp', async (req, res) => {
  try {
    // Handle configuration parameter
    if (req.query.config) {
      try {
        const config = JSON.parse(Buffer.from(req.query.config, 'base64').toString());
        console.log('Received config:', config);
      } catch (error) {
        console.error('Failed to parse config:', error);
      }
    }

    // Simple HTTP JSON-RPC handling
    const request = req.body;
    let response;

    if (request.method === 'tools/list') {
      const tools = await server._requestHandlers.get('tools/list')();
      response = {
        jsonrpc: '2.0',
        id: request.id,
        result: tools
      };
    } else if (request.method === 'tools/call') {
      const result = await server._requestHandlers.get('tools/call')(request);
      response = {
        jsonrpc: '2.0',
        id: request.id,
        result
      };
    } else {
      response = {
        jsonrpc: '2.0',
        id: request.id,
        error: { code: -32601, message: 'Method not found' }
      };
    }

    res.json(response);
  } catch (error) {
    res.status(500).json({
      jsonrpc: '2.0',
      id: req.body?.id || null,
      error: { code: -32603, message: error.message }
    });
  }
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Like-I-Said MCP Server v2.0.3 running on port ${PORT}`);
  console.log(`📡 Transport: HTTP Native (SSE)`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log(`💾 Memory file: ${memoryManager.memoryFile}`);
  console.log(`📊 Loaded ${Object.keys(memoryManager.memories).length} memories`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});