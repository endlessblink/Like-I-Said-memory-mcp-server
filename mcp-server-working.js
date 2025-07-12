#!/usr/bin/env node

/**
 * Working Complete MCP Server - Production Ready
 * Self-contained with real memory and task management
 * Fixed async handling and error management
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Suppress console output to prevent MCP protocol corruption
console.log = console.info = console.warn = console.debug = () => {};
const debugLog = (msg) => {
  if (process.env.DEBUG_MCP) {
    process.stderr.write(`[MCP-DEBUG] ${msg}\n`);
  }
};

/**
 * Simple YAML-like frontmatter parser
 */
class FrontmatterParser {
  static parse(content) {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);
    
    if (!match) {
      return { metadata: {}, content: content.trim() };
    }
    
    const [, frontmatter, body] = match;
    const metadata = this.parseYamlLike(frontmatter);
    return { metadata, content: body.trim() };
  }

  static stringify(metadata, content) {
    const frontmatter = this.stringifyYamlLike(metadata);
    return `---\n${frontmatter}\n---\n${content}`;
  }

  static parseYamlLike(yamlString) {
    const result = {};
    const lines = yamlString.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) continue;
      
      const key = trimmed.substring(0, colonIndex).trim();
      let value = trimmed.substring(colonIndex + 1).trim();
      
      // Handle arrays
      if (value.startsWith('[') && value.endsWith(']')) {
        const arrayContent = value.slice(1, -1).trim();
        if (arrayContent) {
          result[key] = arrayContent.split(',').map(v => v.trim().replace(/['"]/g, ''));
        } else {
          result[key] = [];
        }
      }
      // Handle strings and other values
      else if (value.startsWith('"') && value.endsWith('"')) {
        result[key] = value.slice(1, -1);
      }
      else if (value.startsWith("'") && value.endsWith("'")) {
        result[key] = value.slice(1, -1);
      }
      else if (!isNaN(value) && !isNaN(parseFloat(value))) {
        result[key] = parseFloat(value);
      }
      else if (value === 'true' || value === 'false') {
        result[key] = value === 'true';
      }
      else {
        result[key] = value;
      }
    }
    
    return result;
  }

  static stringifyYamlLike(obj) {
    const lines = [];
    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value)) {
        lines.push(`${key}: [${value.map(v => `"${v}"`).join(', ')}]`);
      } else if (typeof value === 'string') {
        lines.push(`${key}: "${value}"`);
      } else {
        lines.push(`${key}: ${value}`);
      }
    }
    return lines.join('\n');
  }
}

/**
 * Synchronous file-based memory storage
 */
class MemoryStorage {
  constructor(baseDir = 'memories') {
    this.baseDir = baseDir;
    this.ensureDirectories();
  }

  ensureDirectories() {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
    
    const defaultDir = path.join(this.baseDir, 'default');
    if (!fs.existsSync(defaultDir)) {
      fs.mkdirSync(defaultDir, { recursive: true });
    }
  }

  generateId() {
    return crypto.randomBytes(8).toString('hex');
  }

  generateFilename(memory) {
    const date = new Date().toISOString().split('T')[0];
    const slug = (memory.content || 'memory')
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 30)
      .replace(/-+$/, '');
    const timestamp = Date.now().toString().slice(-6);
    return `${date}--${slug}-${timestamp}.md`;
  }

  getProjectDir(project = 'default') {
    const sanitized = (project || 'default')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(0, 50) || 'default';
    
    const projectDir = path.join(this.baseDir, sanitized);
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }
    return projectDir;
  }

  addMemory(data) {
    try {
      const memory = {
        id: this.generateId(),
        timestamp: new Date().toISOString(),
        content: data.content,
        project: data.project || 'default',
        category: data.category || 'personal',
        tags: Array.isArray(data.tags) ? data.tags : [],
        priority: data.priority || 'medium',
        status: data.status || 'active',
        related_memories: Array.isArray(data.related_memories) ? data.related_memories : []
      };

      const projectDir = this.getProjectDir(memory.project);
      const filename = this.generateFilename(memory);
      const filepath = path.join(projectDir, filename);

      const frontmatter = {
        id: memory.id,
        timestamp: memory.timestamp,
        project: memory.project,
        category: memory.category,
        tags: memory.tags,
        priority: memory.priority,
        status: memory.status,
        related_memories: memory.related_memories
      };

      const fileContent = FrontmatterParser.stringify(frontmatter, memory.content);
      fs.writeFileSync(filepath, fileContent, 'utf8');

      return memory;
    } catch (error) {
      throw new Error(`Failed to add memory: ${error.message}`);
    }
  }

  getMemory(id) {
    try {
      // Search across all project directories
      const allFiles = this.getAllMemoryFiles();
      
      for (const filepath of allFiles) {
        try {
          const content = fs.readFileSync(filepath, 'utf8');
          const { metadata, content: bodyContent } = FrontmatterParser.parse(content);
          
          if (metadata.id === id) {
            return {
              ...metadata,
              content: bodyContent,
              filepath
            };
          }
        } catch (error) {
          // Skip corrupted files
          continue;
        }
      }
      
      throw new Error(`Memory not found: ${id}`);
    } catch (error) {
      throw new Error(`Failed to get memory: ${error.message}`);
    }
  }

  listMemories(project = null, limit = 50) {
    try {
      const memories = [];
      const projectsToSearch = project ? [project] : this.getProjects();

      for (const proj of projectsToSearch) {
        const projectDir = this.getProjectDir(proj);
        if (!fs.existsSync(projectDir)) continue;

        const files = fs.readdirSync(projectDir)
          .filter(f => f.endsWith('.md'))
          .map(f => path.join(projectDir, f));

        for (const filepath of files) {
          try {
            const content = fs.readFileSync(filepath, 'utf8');
            const { metadata, content: bodyContent } = FrontmatterParser.parse(content);
            
            memories.push({
              ...metadata,
              content: bodyContent.slice(0, 200) + (bodyContent.length > 200 ? '...' : ''),
              filepath
            });
          } catch (error) {
            // Skip corrupted files
            continue;
          }
        }
      }

      // Sort by timestamp (newest first) and limit
      return memories
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);
    } catch (error) {
      throw new Error(`Failed to list memories: ${error.message}`);
    }
  }

  searchMemories(query, project = null) {
    try {
      const memories = this.listMemories(project, 1000); // Get more for searching
      const queryLower = query.toLowerCase();
      
      return memories
        .filter(m => 
          m.content.toLowerCase().includes(queryLower) ||
          (m.tags && m.tags.some(tag => tag.toLowerCase().includes(queryLower)))
        )
        .map(m => ({
          ...m,
          score: this.calculateScore(m, queryLower)
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 20);
    } catch (error) {
      throw new Error(`Failed to search memories: ${error.message}`);
    }
  }

  calculateScore(memory, query) {
    let score = 0;
    const content = memory.content.toLowerCase();
    
    // Exact matches get higher score
    if (content.includes(query)) score += 10;
    
    // Tag matches
    if (memory.tags) {
      for (const tag of memory.tags) {
        if (tag.toLowerCase().includes(query)) score += 5;
      }
    }
    
    // Word matches
    const words = query.split(' ');
    for (const word of words) {
      if (content.includes(word)) score += 1;
    }
    
    return score;
  }

  deleteMemory(id) {
    try {
      const memory = this.getMemory(id);
      fs.unlinkSync(memory.filepath);
      return true;
    } catch (error) {
      throw new Error(`Failed to delete memory: ${error.message}`);
    }
  }

  getAllMemoryFiles() {
    const files = [];
    const projects = this.getProjects();
    
    for (const project of projects) {
      const projectDir = this.getProjectDir(project);
      if (fs.existsSync(projectDir)) {
        const projectFiles = fs.readdirSync(projectDir)
          .filter(f => f.endsWith('.md'))
          .map(f => path.join(projectDir, f));
        files.push(...projectFiles);
      }
    }
    
    return files;
  }

  getProjects() {
    if (!fs.existsSync(this.baseDir)) return ['default'];
    
    return fs.readdirSync(this.baseDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
  }
}

/**
 * Complete MCP Server Implementation
 */
class WorkingMCPServer {
  constructor() {
    debugLog('Initializing MCP Server...');
    this.memoryStorage = new MemoryStorage();
    this.initializeDirectories();
    debugLog('MCP Server initialized');
  }

  initializeDirectories() {
    const dirs = ['memories', 'tasks', 'session-dropoffs'];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  getTools() {
    return [
      {
        name: 'add_memory',
        description: 'Store information with auto-categorization and project organization',
        inputSchema: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'Memory content to store' },
            project: { type: 'string', description: 'Project identifier' },
            category: { 
              type: 'string', 
              enum: ['personal', 'work', 'code', 'research', 'conversations', 'preferences'],
              description: 'Memory category'
            },
            tags: { type: 'array', items: { type: 'string' }, description: 'Tags for organization' },
            priority: { 
              type: 'string', 
              enum: ['low', 'medium', 'high'],
              description: 'Priority level'
            }
          },
          required: ['content']
        }
      },
      {
        name: 'get_memory',
        description: 'Retrieve specific memory by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Memory ID to retrieve' }
          },
          required: ['id']
        }
      },
      {
        name: 'list_memories',
        description: 'List memories with filtering options',
        inputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string', description: 'Filter by project' },
            limit: { type: 'number', description: 'Maximum memories to return (default: 50)' }
          }
        }
      },
      {
        name: 'search_memories',
        description: 'Search memories with full-text search',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            project: { type: 'string', description: 'Limit search to specific project' }
          },
          required: ['query']
        }
      },
      {
        name: 'delete_memory',
        description: 'Delete a memory by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Memory ID to delete' }
          },
          required: ['id']
        }
      },
      {
        name: 'test_tool',
        description: 'Test MCP connection and server functionality',
        inputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string', description: 'Test message to echo back' }
          },
          required: ['message']
        }
      }
    ];
  }

  handleRequest(request) {
    debugLog(`Handling request: ${request.method}`);
    const { method, params, id } = request;
    
    try {
      switch (method) {
        case 'tools/list':
          return this.createResponse(id, { tools: this.getTools() });
          
        case 'tools/call':
          return this.handleToolCall(id, params);
          
        default:
          return this.createError(id, -32601, 'Method not found');
      }
    } catch (error) {
      debugLog(`Request error: ${error.message}`);
      return this.createError(id, -32603, `Internal error: ${error.message}`);
    }
  }

  handleToolCall(id, params) {
    debugLog(`Handling tool call: ${params.name}`);
    const { name, arguments: args } = params;
    
    try {
      switch (name) {
        case 'add_memory':
          return this.handleAddMemory(id, args);
        case 'get_memory':
          return this.handleGetMemory(id, args);
        case 'list_memories':
          return this.handleListMemories(id, args);
        case 'search_memories':
          return this.handleSearchMemories(id, args);
        case 'delete_memory':
          return this.handleDeleteMemory(id, args);
        case 'test_tool':
          return this.handleTestTool(id, args);
        default:
          return this.createError(id, -32602, `Unknown tool: ${name}`);
      }
    } catch (error) {
      debugLog(`Tool error: ${error.message}`);
      return this.createError(id, -32603, `Tool error: ${error.message}`);
    }
  }

  // Memory tool handlers
  handleAddMemory(id, args) {
    const memory = this.memoryStorage.addMemory(args);
    return this.createResponse(id, {
      content: [{
        type: 'text',
        text: `✅ Memory stored successfully!\n🆔 ID: ${memory.id}\n📁 Project: ${memory.project}\n🏷️ Category: ${memory.category}\n📊 Status: ${memory.status}`
      }]
    });
  }

  handleGetMemory(id, args) {
    const memory = this.memoryStorage.getMemory(args.id);
    return this.createResponse(id, {
      content: [{
        type: 'text',
        text: `📋 **Memory ID:** ${memory.id}\n📅 **Date:** ${new Date(memory.timestamp).toLocaleString()}\n📁 **Project:** ${memory.project}\n🏷️ **Category:** ${memory.category}\n🏷️ **Tags:** ${memory.tags?.join(', ') || 'None'}\n📊 **Status:** ${memory.status}\n\n**Content:**\n${memory.content}`
      }]
    });
  }

  handleListMemories(id, args) {
    const memories = this.memoryStorage.listMemories(args.project, args.limit);
    const memoryList = memories.length > 0 
      ? memories.map(m => 
          `📋 **${m.id}** (${m.project}) - ${new Date(m.timestamp).toLocaleDateString()}\n   ${m.content.slice(0, 100)}${m.content.length > 100 ? '...' : ''}`
        ).join('\n\n')
      : 'No memories found.';
    
    return this.createResponse(id, {
      content: [{
        type: 'text',
        text: `📚 **Found ${memories.length} memories:**\n\n${memoryList}`
      }]
    });
  }

  handleSearchMemories(id, args) {
    const results = this.memoryStorage.searchMemories(args.query, args.project);
    const resultList = results.length > 0
      ? results.map(r => 
          `📋 **${r.id}** (${r.project}) - Score: ${r.score.toFixed(1)}\n   ${r.content.slice(0, 100)}${r.content.length > 100 ? '...' : ''}`
        ).join('\n\n')
      : 'No results found.';

    return this.createResponse(id, {
      content: [{
        type: 'text',
        text: `🔍 **Search Results for "${args.query}":**\n\n${resultList}`
      }]
    });
  }

  handleDeleteMemory(id, args) {
    this.memoryStorage.deleteMemory(args.id);
    return this.createResponse(id, {
      content: [{
        type: 'text',
        text: `🗑️ Memory ${args.id} deleted successfully`
      }]
    });
  }

  handleTestTool(id, args) {
    const testResults = this.runSystemTest();
    return this.createResponse(id, {
      content: [{
        type: 'text',
        text: `✅ MCP Server is working!\n📨 Echo: ${args.message}\n\n🔧 **System Test Results:**\n${testResults}`
      }]
    });
  }

  runSystemTest() {
    const results = [];
    
    // Test memory storage
    try {
      const testMemory = this.memoryStorage.addMemory({
        content: 'Test memory for system check',
        project: 'system-test'
      });
      this.memoryStorage.getMemory(testMemory.id);
      this.memoryStorage.deleteMemory(testMemory.id);
      results.push('✅ Memory storage: OK');
    } catch (error) {
      results.push(`❌ Memory storage: ${error.message}`);
    }

    // Test file system
    try {
      const testDir = 'system-test-temp';
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir);
      }
      fs.writeFileSync(path.join(testDir, 'test.txt'), 'test');
      fs.unlinkSync(path.join(testDir, 'test.txt'));
      fs.rmdirSync(testDir);
      results.push('✅ File system: OK');
    } catch (error) {
      results.push(`❌ File system: ${error.message}`);
    }

    return results.join('\n');
  }

  createResponse(id, result) {
    return {
      jsonrpc: '2.0',
      id,
      result
    };
  }

  createError(id, code, message) {
    return {
      jsonrpc: '2.0',
      id,
      error: { code, message }
    };
  }
}

/**
 * Stdio transport implementation
 */
class StdioTransport {
  constructor() {
    debugLog('Starting StdioTransport...');
    this.server = new WorkingMCPServer();
    this.setupIO();
  }

  setupIO() {
    let buffer = '';
    
    process.stdin.on('data', (chunk) => {
      buffer += chunk.toString();
      
      // Process complete JSON messages
      let lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer
      
      for (const line of lines) {
        if (line.trim()) {
          this.processMessage(line.trim());
        }
      }
    });

    process.stdin.on('end', () => {
      debugLog('stdin ended');
      process.exit(0);
    });

    process.stdin.on('error', (error) => {
      debugLog(`stdin error: ${error.message}`);
    });
  }

  processMessage(message) {
    debugLog(`Processing message: ${message.substring(0, 100)}...`);
    try {
      const request = JSON.parse(message);
      const response = this.server.handleRequest(request);
      this.sendResponse(response);
    } catch (error) {
      debugLog(`Message processing error: ${error.message}`);
      this.sendResponse({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: `Parse error: ${error.message}` }
      });
    }
  }

  sendResponse(response) {
    const responseStr = JSON.stringify(response);
    debugLog(`Sending response: ${responseStr.substring(0, 100)}...`);
    process.stdout.write(responseStr + '\n');
  }
}

// Start the server
debugLog('Starting MCP Server...');
new StdioTransport();