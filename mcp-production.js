#!/usr/bin/env node

/**
 * Production MCP Server - Zero Dependency
 * Complete implementation with real file storage
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Suppress all console output except errors in debug mode
console.log = console.info = console.warn = console.debug = () => {};

// Memory storage with real file persistence
class MemoryStorage {
  constructor() {
    this.baseDir = 'memories';
    this.ensureDirectories();
  }

  ensureDirectories() {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
    if (!fs.existsSync(path.join(this.baseDir, 'default'))) {
      fs.mkdirSync(path.join(this.baseDir, 'default'), { recursive: true });
    }
  }

  generateId() {
    return crypto.randomBytes(8).toString('hex');
  }

  addMemory(data) {
    const memory = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      content: data.content,
      project: data.project || 'default',
      category: data.category || 'personal',
      tags: Array.isArray(data.tags) ? data.tags : [],
      priority: data.priority || 'medium'
    };

    const projectDir = path.join(this.baseDir, memory.project);
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    const filename = `${new Date().toISOString().split('T')[0]}--${memory.id}.md`;
    const filepath = path.join(projectDir, filename);
    
    const content = `---
id: ${memory.id}
timestamp: ${memory.timestamp}
project: ${memory.project}
category: ${memory.category}
tags: [${memory.tags.map(t => `"${t}"`).join(', ')}]
priority: ${memory.priority}
---
${memory.content}`;

    fs.writeFileSync(filepath, content, 'utf8');
    return memory;
  }

  getMemory(id) {
    const files = this.getAllFiles();
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes(`id: ${id}`)) {
        const lines = content.split('\n');
        const contentStart = lines.findIndex(line => line === '---', 1) + 1;
        const bodyContent = lines.slice(contentStart).join('\n').trim();
        
        return {
          id,
          content: bodyContent,
          filepath: file
        };
      }
    }
    throw new Error(`Memory not found: ${id}`);
  }

  listMemories(project = null, limit = 50) {
    const memories = [];
    const files = this.getAllFiles();
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        
        // Extract metadata
        const idMatch = content.match(/id: (.+)/);
        const projectMatch = content.match(/project: (.+)/);
        const timestampMatch = content.match(/timestamp: (.+)/);
        
        if (idMatch && (!project || (projectMatch && projectMatch[1] === project))) {
          const contentStart = lines.findIndex(line => line === '---', 1) + 1;
          const bodyContent = lines.slice(contentStart).join('\n').trim();
          
          memories.push({
            id: idMatch[1],
            project: projectMatch ? projectMatch[1] : 'default',
            timestamp: timestampMatch ? timestampMatch[1] : new Date().toISOString(),
            content: bodyContent.slice(0, 200) + (bodyContent.length > 200 ? '...' : '')
          });
        }
      } catch (error) {
        continue;
      }
    }

    return memories
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  searchMemories(query, project = null) {
    const memories = this.listMemories(project, 1000);
    const queryLower = query.toLowerCase();
    
    return memories
      .filter(m => m.content.toLowerCase().includes(queryLower))
      .map(m => ({ ...m, score: 1.0 }))
      .slice(0, 20);
  }

  deleteMemory(id) {
    const memory = this.getMemory(id);
    fs.unlinkSync(memory.filepath);
    return true;
  }

  getAllFiles() {
    const files = [];
    const projects = fs.readdirSync(this.baseDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const project of projects) {
      const projectDir = path.join(this.baseDir, project);
      const projectFiles = fs.readdirSync(projectDir)
        .filter(f => f.endsWith('.md'))
        .map(f => path.join(projectDir, f));
      files.push(...projectFiles);
    }

    return files;
  }
}

// MCP Server
class MCPServer {
  constructor() {
    this.storage = new MemoryStorage();
  }

  getTools() {
    return [
      {
        name: 'add_memory',
        description: 'Store information with project organization',
        inputSchema: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'Memory content' },
            project: { type: 'string', description: 'Project name' },
            category: { type: 'string', description: 'Category' },
            tags: { type: 'array', items: { type: 'string' } },
            priority: { type: 'string', enum: ['low', 'medium', 'high'] }
          },
          required: ['content']
        }
      },
      {
        name: 'get_memory',
        description: 'Get memory by ID',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id']
        }
      },
      {
        name: 'list_memories',
        description: 'List memories',
        inputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string' },
            limit: { type: 'number' }
          }
        }
      },
      {
        name: 'search_memories',
        description: 'Search memories',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            project: { type: 'string' }
          },
          required: ['query']
        }
      },
      {
        name: 'delete_memory',
        description: 'Delete memory',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id']
        }
      },
      {
        name: 'test_tool',
        description: 'Test the server',
        inputSchema: {
          type: 'object',
          properties: { message: { type: 'string' } },
          required: ['message']
        }
      }
    ];
  }

  handleRequest(request) {
    const { method, params, id } = request;

    if (method === 'tools/list') {
      return { jsonrpc: '2.0', id, result: { tools: this.getTools() } };
    }

    if (method === 'tools/call') {
      return this.handleTool(id, params);
    }

    return { jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } };
  }

  handleTool(id, params) {
    const { name, arguments: args } = params;

    try {
      switch (name) {
        case 'add_memory': {
          const memory = this.storage.addMemory(args);
          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [{
                type: 'text',
                text: `✅ Memory stored!\n🆔 ID: ${memory.id}\n📁 Project: ${memory.project}`
              }]
            }
          };
        }

        case 'get_memory': {
          const memory = this.storage.getMemory(args.id);
          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [{
                type: 'text',
                text: `📋 Memory: ${memory.id}\n\n${memory.content}`
              }]
            }
          };
        }

        case 'list_memories': {
          const memories = this.storage.listMemories(args.project, args.limit);
          const list = memories.map(m => `📋 ${m.id} (${m.project})`).join('\n');
          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [{
                type: 'text',
                text: `📚 Found ${memories.length} memories:\n\n${list || 'None'}`
              }]
            }
          };
        }

        case 'search_memories': {
          const results = this.storage.searchMemories(args.query, args.project);
          const list = results.map(r => `📋 ${r.id} (${r.project})`).join('\n');
          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [{
                type: 'text',
                text: `🔍 Search "${args.query}":\n\n${list || 'No results'}`
              }]
            }
          };
        }

        case 'delete_memory': {
          this.storage.deleteMemory(args.id);
          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [{
                type: 'text',
                text: `🗑️ Memory ${args.id} deleted`
              }]
            }
          };
        }

        case 'test_tool': {
          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [{
                type: 'text',
                text: `✅ Server working! Echo: ${args.message}`
              }]
            }
          };
        }

        default:
          return {
            jsonrpc: '2.0',
            id,
            error: { code: -32602, message: `Unknown tool: ${name}` }
          };
      }
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32603, message: error.message }
      };
    }
  }
}

// Main
const server = new MCPServer();
let buffer = '';

process.stdin.on('data', (chunk) => {
  buffer += chunk.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';

  for (const line of lines) {
    if (line.trim()) {
      try {
        const request = JSON.parse(line.trim());
        const response = server.handleRequest(request);
        process.stdout.write(JSON.stringify(response) + '\n');
      } catch (error) {
        process.stdout.write(JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: { code: -32700, message: 'Parse error' }
        }) + '\n');
      }
    }
  }
});

process.stdin.on('end', () => process.exit(0));