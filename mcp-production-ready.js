#!/usr/bin/env node

/**
 * Production-Ready MCP Server - Optimized for pkg bundling
 * Self-contained with zero external dependencies
 * Full memory and task management with real file persistence
 * Proper JSON-RPC over stdin/stdout for Claude Desktop integration
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Suppress console output to prevent MCP protocol corruption
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug
};

// Override console methods to use stderr only for debugging
console.log = console.info = console.warn = console.debug = () => {};
console.error = (...args) => {
  if (process.env.DEBUG_MCP) {
    originalConsole.error('[MCP-DEBUG]', ...args);
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
      // Handle strings
      else if (value.startsWith('"') && value.endsWith('"')) {
        result[key] = value.slice(1, -1);
      }
      else if (value.startsWith("'") && value.endsWith("'")) {
        result[key] = value.slice(1, -1);
      }
      // Handle numbers
      else if (!isNaN(value) && !isNaN(parseFloat(value))) {
        result[key] = parseFloat(value);
      }
      // Handle booleans
      else if (value === 'true' || value === 'false') {
        result[key] = value === 'true';
      }
      // Handle regular strings
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
 * File-based memory storage
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

  async addMemory(data) {
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
  }

  async getMemory(id) {
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
  }

  async listMemories(project = null, limit = 50) {
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
  }

  async searchMemories(query, project = null) {
    const memories = await this.listMemories(project, 1000); // Get more for searching
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

  async deleteMemory(id) {
    const memory = await this.getMemory(id);
    fs.unlinkSync(memory.filepath);
    return true;
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
 * File-based task storage
 */
class TaskStorage {
  constructor(baseDir = 'tasks') {
    this.baseDir = baseDir;
    this.ensureDirectories();
  }

  ensureDirectories() {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  generateId() {
    return `task-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  generateSerial() {
    const timestamp = Date.now().toString().slice(-5);
    return `TSK-${timestamp}`;
  }

  getTaskFile(project) {
    const sanitized = (project || 'default')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(0, 50) || 'default';
    
    const projectDir = path.join(this.baseDir, sanitized);
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }
    
    return path.join(projectDir, 'tasks.md');
  }

  async createTask(data) {
    const task = {
      id: this.generateId(),
      serial: this.generateSerial(),
      title: data.title,
      description: data.description || '',
      project: data.project || 'default',
      category: data.category || 'personal',
      priority: data.priority || 'medium',
      status: 'todo',
      tags: Array.isArray(data.tags) ? data.tags : [],
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      memory_connections: [],
      subtasks: []
    };

    await this.saveTask(task);
    return task;
  }

  async saveTask(task) {
    const taskFile = this.getTaskFile(task.project);
    const tasks = await this.loadTasks(task.project);
    
    // Update existing or add new
    const existingIndex = tasks.findIndex(t => t.id === task.id);
    if (existingIndex >= 0) {
      tasks[existingIndex] = { ...task, updated: new Date().toISOString() };
    } else {
      tasks.push(task);
    }

    // Save to file
    const content = this.tasksToMarkdown(tasks);
    fs.writeFileSync(taskFile, content, 'utf8');
  }

  async loadTasks(project) {
    const taskFile = this.getTaskFile(project);
    if (!fs.existsSync(taskFile)) {
      return [];
    }

    try {
      const content = fs.readFileSync(taskFile, 'utf8');
      return this.markdownToTasks(content);
    } catch (error) {
      return [];
    }
  }

  async updateTask(taskId, updates) {
    // Find task across all projects
    const projects = this.getProjects();
    
    for (const project of projects) {
      const tasks = await this.loadTasks(project);
      const taskIndex = tasks.findIndex(t => t.id === taskId);
      
      if (taskIndex >= 0) {
        const task = { ...tasks[taskIndex], ...updates, updated: new Date().toISOString() };
        tasks[taskIndex] = task;
        
        const content = this.tasksToMarkdown(tasks);
        const taskFile = this.getTaskFile(project);
        fs.writeFileSync(taskFile, content, 'utf8');
        
        return task;
      }
    }
    
    throw new Error(`Task not found: ${taskId}`);
  }

  async listTasks(filters = {}) {
    const allTasks = [];
    const projects = filters.project ? [filters.project] : this.getProjects();
    
    for (const project of projects) {
      const tasks = await this.loadTasks(project);
      allTasks.push(...tasks);
    }

    let filtered = allTasks;
    
    if (filters.status) {
      filtered = filtered.filter(t => t.status === filters.status);
    }
    
    if (filters.category) {
      filtered = filtered.filter(t => t.category === filters.category);
    }

    return filtered
      .sort((a, b) => new Date(b.updated) - new Date(a.updated))
      .slice(0, filters.limit || 50);
  }

  async deleteTask(taskId) {
    const projects = this.getProjects();
    
    for (const project of projects) {
      const tasks = await this.loadTasks(project);
      const filteredTasks = tasks.filter(t => t.id !== taskId);
      
      if (filteredTasks.length !== tasks.length) {
        const content = this.tasksToMarkdown(filteredTasks);
        const taskFile = this.getTaskFile(project);
        fs.writeFileSync(taskFile, content, 'utf8');
        return true;
      }
    }
    
    throw new Error(`Task not found: ${taskId}`);
  }

  tasksToMarkdown(tasks) {
    if (tasks.length === 0) {
      return '# Tasks\n\nNo tasks yet.\n';
    }

    let content = '# Tasks\n\n';
    
    for (const task of tasks) {
      content += `## ${task.title}\n\n`;
      content += `- **ID**: ${task.id}\n`;
      content += `- **Serial**: ${task.serial}\n`;
      content += `- **Status**: ${task.status}\n`;
      content += `- **Priority**: ${task.priority}\n`;
      content += `- **Category**: ${task.category}\n`;
      content += `- **Project**: ${task.project}\n`;
      content += `- **Created**: ${task.created}\n`;
      content += `- **Updated**: ${task.updated}\n`;
      
      if (task.tags && task.tags.length > 0) {
        content += `- **Tags**: ${task.tags.join(', ')}\n`;
      }
      
      if (task.description) {
        content += `\n**Description**: ${task.description}\n`;
      }
      
      content += '\n---\n\n';
    }
    
    return content;
  }

  markdownToTasks(content) {
    const tasks = [];
    const sections = content.split('---').filter(s => s.trim());
    
    for (const section of sections) {
      const task = this.parseTaskSection(section);
      if (task && task.id) {
        tasks.push(task);
      }
    }
    
    return tasks;
  }

  parseTaskSection(section) {
    const lines = section.split('\n');
    const task = {
      memory_connections: [],
      subtasks: [],
      tags: []
    };
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // Extract title from header
      if (trimmed.startsWith('## ')) {
        task.title = trimmed.substring(3).trim();
        continue;
      }
      
      // Extract metadata
      const metaMatch = trimmed.match(/^- \*\*([^*]+)\*\*: (.+)$/);
      if (metaMatch) {
        const [, key, value] = metaMatch;
        switch (key.toLowerCase()) {
          case 'id':
            task.id = value;
            break;
          case 'serial':
            task.serial = value;
            break;
          case 'status':
            task.status = value;
            break;
          case 'priority':
            task.priority = value;
            break;
          case 'category':
            task.category = value;
            break;
          case 'project':
            task.project = value;
            break;
          case 'created':
            task.created = value;
            break;
          case 'updated':
            task.updated = value;
            break;
          case 'tags':
            task.tags = value.split(',').map(t => t.trim());
            break;
        }
        continue;
      }
      
      // Extract description
      if (trimmed.startsWith('**Description**: ')) {
        task.description = trimmed.substring(16);
        continue;
      }
    }
    
    return task;
  }

  getProjects() {
    if (!fs.existsSync(this.baseDir)) return ['default'];
    
    return fs.readdirSync(this.baseDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
  }
}

/**
 * Session dropoff generator
 */
class DropoffGenerator {
  constructor(memoryStorage, taskStorage) {
    this.memoryStorage = memoryStorage;
    this.taskStorage = taskStorage;
  }

  async generateDropoff(options = {}) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDir = options.output_path || 'session-dropoffs';
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filename = `SESSION-DROPOFF-${timestamp}.md`;
    const filepath = path.join(outputDir, filename);

    const content = await this.generateContent(options);
    fs.writeFileSync(filepath, content, 'utf8');

    return {
      filePath: filepath,
      size: content.length
    };
  }

  async generateContent(options) {
    const summary = options.session_summary || 'Session work completed';
    const recentMemoryCount = options.recent_memory_count || 5;
    
    let content = `# Session Dropoff - ${new Date().toISOString()}\n\n`;
    content += `## Session Summary\n${summary}\n\n`;
    
    // Recent memories
    try {
      const recentMemories = await this.memoryStorage.listMemories(null, recentMemoryCount);
      content += `## Recent Memories (${recentMemories.length})\n\n`;
      
      for (const memory of recentMemories) {
        content += `### ${memory.id} - ${memory.project}\n`;
        content += `**Date**: ${new Date(memory.timestamp).toLocaleString()}\n`;
        content += `**Tags**: ${memory.tags?.join(', ') || 'None'}\n\n`;
        content += `${memory.content.slice(0, 300)}${memory.content.length > 300 ? '...' : ''}\n\n`;
        content += '---\n\n';
      }
    } catch (error) {
      content += `## Recent Memories\nError loading memories: ${error.message}\n\n`;
    }

    // Recent tasks
    try {
      const recentTasks = await this.taskStorage.listTasks({ limit: 10 });
      content += `## Recent Tasks (${recentTasks.length})\n\n`;
      
      for (const task of recentTasks) {
        content += `### ${task.serial} - ${task.title}\n`;
        content += `**Status**: ${task.status} | **Priority**: ${task.priority} | **Project**: ${task.project}\n`;
        if (task.description) {
          content += `**Description**: ${task.description}\n`;
        }
        content += '\n---\n\n';
      }
    } catch (error) {
      content += `## Recent Tasks\nError loading tasks: ${error.message}\n\n`;
    }

    content += `## System Info\n`;
    content += `- **Generated**: ${new Date().toISOString()}\n`;
    content += `- **Platform**: ${process.platform}\n`;
    content += `- **Node Version**: ${process.version}\n`;
    content += `- **Working Directory**: ${process.cwd()}\n`;

    return content;
  }
}

/**
 * Production-Ready MCP Server Implementation
 */
class ProductionMCPServer {
  constructor() {
    // Initialize storage systems
    this.memoryStorage = new MemoryStorage();
    this.taskStorage = new TaskStorage();
    this.dropoffGenerator = new DropoffGenerator(this.memoryStorage, this.taskStorage);
    
    // Initialize directories
    this.initializeDirectories();
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
      // Memory Management Tools
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
            },
            status: { 
              type: 'string', 
              enum: ['active', 'archived', 'reference'],
              description: 'Memory status'
            },
            related_memories: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'IDs of related memories'
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
      
      // Task Management Tools
      {
        name: 'create_task',
        description: 'Create a new task with project organization',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Task title' },
            project: { type: 'string', description: 'Project identifier' },
            description: { type: 'string', description: 'Detailed task description' },
            priority: { 
              type: 'string', 
              enum: ['low', 'medium', 'high', 'urgent'],
              description: 'Task priority'
            },
            category: { 
              type: 'string', 
              enum: ['personal', 'work', 'code', 'research'],
              description: 'Task category'
            },
            tags: { type: 'array', items: { type: 'string' }, description: 'Task tags' }
          },
          required: ['title', 'project']
        }
      },
      {
        name: 'update_task',
        description: 'Update task status and details',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: { type: 'string', description: 'Task ID to update' },
            status: { 
              type: 'string', 
              enum: ['todo', 'in_progress', 'done', 'blocked'],
              description: 'New task status'
            },
            title: { type: 'string', description: 'New task title' },
            description: { type: 'string', description: 'New task description' },
            priority: { 
              type: 'string', 
              enum: ['low', 'medium', 'high', 'urgent'],
              description: 'New task priority'
            }
          },
          required: ['task_id']
        }
      },
      {
        name: 'list_tasks',
        description: 'List tasks with filtering options',
        inputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string', description: 'Filter by project' },
            status: { 
              type: 'string', 
              enum: ['todo', 'in_progress', 'done', 'blocked'],
              description: 'Filter by status'
            },
            category: { 
              type: 'string', 
              enum: ['personal', 'work', 'code', 'research'],
              description: 'Filter by category'
            },
            limit: { type: 'number', description: 'Maximum tasks to return (default: 50)' }
          }
        }
      },
      {
        name: 'delete_task',
        description: 'Delete a task by ID',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: { type: 'string', description: 'Task ID to delete' }
          },
          required: ['task_id']
        }
      },
      
      // Utility Tools
      {
        name: 'generate_dropoff',
        description: 'Generate session handoff document with context',
        inputSchema: {
          type: 'object',
          properties: {
            session_summary: { 
              type: 'string', 
              description: 'Brief summary of work done in this session'
            },
            output_path: { 
              type: 'string', 
              description: 'Custom output directory path'
            },
            recent_memory_count: { 
              type: 'number', 
              description: 'Number of recent memories to include (default: 5)'
            }
          }
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

  async handleRequest(request) {
    const { method, params, id } = request;
    
    try {
      switch (method) {
        case 'tools/list':
          return this.createResponse(id, { tools: this.getTools() });
          
        case 'tools/call':
          return await this.handleToolCall(id, params);
          
        default:
          return this.createError(id, -32601, 'Method not found');
      }
    } catch (error) {
      return this.createError(id, -32603, `Internal error: ${error.message}`);
    }
  }

  async handleToolCall(id, params) {
    const { name, arguments: args } = params;
    
    try {
      switch (name) {
        case 'add_memory':
          return await this.handleAddMemory(id, args);
        case 'get_memory':
          return await this.handleGetMemory(id, args);
        case 'list_memories':
          return await this.handleListMemories(id, args);
        case 'search_memories':
          return await this.handleSearchMemories(id, args);
        case 'delete_memory':
          return await this.handleDeleteMemory(id, args);
        case 'create_task':
          return await this.handleCreateTask(id, args);
        case 'update_task':
          return await this.handleUpdateTask(id, args);
        case 'list_tasks':
          return await this.handleListTasks(id, args);
        case 'delete_task':
          return await this.handleDeleteTask(id, args);
        case 'generate_dropoff':
          return await this.handleGenerateDropoff(id, args);
        case 'test_tool':
          return await this.handleTestTool(id, args);
        default:
          return this.createError(id, -32602, `Unknown tool: ${name}`);
      }
    } catch (error) {
      return this.createError(id, -32603, `Tool error: ${error.message}`);
    }
  }

  // Memory tool handlers
  async handleAddMemory(id, args) {
    const memory = await this.memoryStorage.addMemory(args);
    return this.createResponse(id, {
      content: [{
        type: 'text',
        text: `✅ Memory stored successfully!\n🆔 ID: ${memory.id}\n📁 Project: ${memory.project}\n🏷️ Category: ${memory.category}\n📊 Status: ${memory.status}`
      }]
    });
  }

  async handleGetMemory(id, args) {
    const memory = await this.memoryStorage.getMemory(args.id);
    return this.createResponse(id, {
      content: [{
        type: 'text',
        text: `📋 **Memory ID:** ${memory.id}\n📅 **Date:** ${new Date(memory.timestamp).toLocaleString()}\n📁 **Project:** ${memory.project}\n🏷️ **Category:** ${memory.category}\n🏷️ **Tags:** ${memory.tags?.join(', ') || 'None'}\n📊 **Status:** ${memory.status}\n\n**Content:**\n${memory.content}`
      }]
    });
  }

  async handleListMemories(id, args) {
    const memories = await this.memoryStorage.listMemories(args.project, args.limit);
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

  async handleSearchMemories(id, args) {
    const results = await this.memoryStorage.searchMemories(args.query, args.project);
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

  async handleDeleteMemory(id, args) {
    await this.memoryStorage.deleteMemory(args.id);
    return this.createResponse(id, {
      content: [{
        type: 'text',
        text: `🗑️ Memory ${args.id} deleted successfully`
      }]
    });
  }

  // Task tool handlers
  async handleCreateTask(id, args) {
    const task = await this.taskStorage.createTask(args);
    return this.createResponse(id, {
      content: [{
        type: 'text',
        text: `✅ Task created successfully!\n🆔 ID: ${task.id}\n📌 Serial: ${task.serial}\n📋 Title: ${task.title}\n📁 Project: ${task.project}\n🎯 Priority: ${task.priority}\n📊 Status: ${task.status}`
      }]
    });
  }

  async handleUpdateTask(id, args) {
    const task = await this.taskStorage.updateTask(args.task_id, args);
    return this.createResponse(id, {
      content: [{
        type: 'text',
        text: `✅ Task updated successfully!\n🆔 ID: ${task.id}\n📋 Title: ${task.title}\n📊 Status: ${task.status}\n🎯 Priority: ${task.priority}`
      }]
    });
  }

  async handleListTasks(id, args) {
    const tasks = await this.taskStorage.listTasks(args);
    const taskList = tasks.length > 0
      ? tasks.map(t => 
          `📋 **${t.serial}** ${t.title} (${t.status})\n   Project: ${t.project} | Priority: ${t.priority}${t.description ? `\n   ${t.description.slice(0, 100)}${t.description.length > 100 ? '...' : ''}` : ''}`
        ).join('\n\n')
      : 'No tasks found.';

    return this.createResponse(id, {
      content: [{
        type: 'text',
        text: `📋 **Found ${tasks.length} tasks:**\n\n${taskList}`
      }]
    });
  }

  async handleDeleteTask(id, args) {
    await this.taskStorage.deleteTask(args.task_id);
    return this.createResponse(id, {
      content: [{
        type: 'text',
        text: `🗑️ Task ${args.task_id} deleted successfully`
      }]
    });
  }

  // Utility tool handlers
  async handleGenerateDropoff(id, args) {
    const result = await this.dropoffGenerator.generateDropoff(args);
    return this.createResponse(id, {
      content: [{
        type: 'text',
        text: `📄 Session dropoff generated successfully!\n📁 File: ${result.filePath}\n📊 Size: ${result.size} bytes\n\nThe dropoff contains recent memories, tasks, and session context for handoff to future sessions.`
      }]
    });
  }

  async handleTestTool(id, args) {
    const testResults = await this.runSystemTest();
    return this.createResponse(id, {
      content: [{
        type: 'text',
        text: `✅ MCP Server is working!\n📨 Echo: ${args.message}\n\n🔧 **System Test Results:**\n${testResults}`
      }]
    });
  }

  async runSystemTest() {
    const results = [];
    
    // Test memory storage
    try {
      const testMemory = await this.memoryStorage.addMemory({
        content: 'Test memory for system check',
        project: 'system-test'
      });
      await this.memoryStorage.getMemory(testMemory.id);
      await this.memoryStorage.deleteMemory(testMemory.id);
      results.push('✅ Memory storage: OK');
    } catch (error) {
      results.push(`❌ Memory storage: ${error.message}`);
    }

    // Test task storage
    try {
      const testTask = await this.taskStorage.createTask({
        title: 'Test task for system check',
        project: 'system-test'
      });
      await this.taskStorage.updateTask(testTask.id, { status: 'done' });
      await this.taskStorage.deleteTask(testTask.id);
      results.push('✅ Task storage: OK');
    } catch (error) {
      results.push(`❌ Task storage: ${error.message}`);
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
    this.server = new ProductionMCPServer();
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
      process.exit(0);
    });
  }

  async processMessage(message) {
    try {
      const request = JSON.parse(message);
      const response = await this.server.handleRequest(request);
      this.sendResponse(response);
    } catch (error) {
      // Send error response for invalid JSON
      this.sendResponse({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: `Parse error: ${error.message}` }
      });
    }
  }

  sendResponse(response) {
    process.stdout.write(JSON.stringify(response) + '\n');
  }
}

// Start the server
new StdioTransport();