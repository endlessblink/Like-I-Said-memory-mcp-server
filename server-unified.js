#!/usr/bin/env node

/**
 * Like-I-Said MCP Server - Unified Edition
 * 
 * Features ALL functionality from original server with:
 * ✅ Zero process.exit() calls (API Error 500 safe)
 * ✅ Configurable plugin system
 * ✅ Lazy loading of heavy dependencies
 * ✅ Fast startup (<500ms in minimal mode)
 * ✅ Full feature parity with original server
 * 
 * Modes:
 * - MCP_MODE=minimal: Core tools only (safest for Claude Code)
 * - MCP_MODE=ai: Core + AI tools
 * - MCP_MODE=full: All tools enabled
 */

import fs from 'fs';
import path from 'path';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const CONFIG = {
  mode: process.env.MCP_MODE || 'minimal', // minimal, ai, full
  plugins: {
    'ai-tools': process.env.MCP_AI_TOOLS === 'true' || ['ai', 'full'].includes(process.env.MCP_MODE),
    'advanced-features': process.env.MCP_ADVANCED === 'true' || process.env.MCP_MODE === 'full'
  },
  logging: process.env.MCP_QUIET !== 'true',
  startup_message: process.env.MCP_QUIET !== 'true' && !process.stdin.isTTY
};

// Service Registry for dependency injection
class ServiceRegistry {
  constructor() {
    this.services = new Map();
  }

  register(name, service) {
    this.services.set(name, service);
  }

  get(name) {
    return this.services.get(name);
  }

  has(name) {
    return this.services.has(name);
  }
}

// Simple logger
class SimpleLogger {
  constructor(enabled = true) {
    this.enabled = enabled;
  }

  info(...args) {
    if (this.enabled) console.error('[INFO]', ...args);
  }

  warn(...args) {
    if (this.enabled) console.error('[WARN]', ...args);
  }

  error(...args) {
    console.error('[ERROR]', ...args);
  }
}

// Memory storage (same as minimal server)
class MinimalStorage {
  constructor(baseDir = 'memories') {
    this.baseDir = baseDir;
    this.ensureDirectories();
  }

  ensureDirectories() {
    try {
      if (!fs.existsSync(this.baseDir)) {
        fs.mkdirSync(this.baseDir, { recursive: true });
      }
      const defaultProjectDir = path.join(this.baseDir, 'default');
      if (!fs.existsSync(defaultProjectDir)) {
        fs.mkdirSync(defaultProjectDir, { recursive: true });
      }
    } catch (error) {
      console.error(`Directory creation issue: ${error.message}`);
    }
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  async saveMemory(content, metadata = {}) {
    const memory = {
      id: this.generateId(),
      content,
      timestamp: new Date().toISOString(),
      project: metadata.project || 'default',
      category: metadata.category || 'general',
      tags: metadata.tags || [],
      priority: metadata.priority || 'medium',
      ...metadata
    };

    const projectDir = path.join(this.baseDir, memory.project);
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    const filename = `${memory.id}.md`;
    const filepath = path.join(projectDir, filename);
    
    const frontmatter = `---
id: ${memory.id}
timestamp: ${memory.timestamp}
project: ${memory.project}
category: ${memory.category}
tags: ${JSON.stringify(memory.tags)}
priority: ${memory.priority}
---

`;
    
    fs.writeFileSync(filepath, frontmatter + content, 'utf8');
    
    return {
      id: memory.id,
      message: `✅ Memory saved to ${memory.project}`,
      filepath
    };
  }

  async listMemories(filters = {}) {
    const memories = [];
    
    try {
      const projects = filters.project 
        ? [filters.project] 
        : fs.readdirSync(this.baseDir).filter(p => 
            fs.statSync(path.join(this.baseDir, p)).isDirectory()
          );

      for (const project of projects) {
        const projectDir = path.join(this.baseDir, project);
        if (!fs.existsSync(projectDir)) continue;

        const files = fs.readdirSync(projectDir).filter(f => f.endsWith('.md'));
        
        for (const file of files) {
          const filepath = path.join(projectDir, file);
          const content = fs.readFileSync(filepath, 'utf8');
          
          const frontmatterMatch = content.match(/^---\n(.*?)\n---\n(.*)$/s);
          if (frontmatterMatch) {
            const [, frontmatter, body] = frontmatterMatch;
            const metadata = {};
            
            frontmatter.split('\n').forEach(line => {
              const [key, ...values] = line.split(':');
              if (key && values.length > 0) {
                let value = values.join(':').trim();
                if (key === 'tags') {
                  try { value = JSON.parse(value); } catch { value = []; }
                }
                metadata[key] = value;
              }
            });
            
            memories.push({
              ...metadata,
              content: body.trim(),
              filepath
            });
          }
        }
      }
    } catch (error) {
      console.error('Error listing memories:', error.message);
    }

    return memories;
  }

  async searchMemories(query) {
    const allMemories = await this.listMemories();
    return allMemories.filter(memory =>
      memory.content.toLowerCase().includes(query.toLowerCase()) ||
      (memory.tags && memory.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase())))
    );
  }

  async getMemory(id) {
    const memories = await this.listMemories();
    return memories.find(m => m.id === id);
  }

  async deleteMemory(id) {
    const memory = await this.getMemory(id);
    if (memory && memory.filepath) {
      fs.unlinkSync(memory.filepath);
      return true;
    }
    return false;
  }
}

// Task storage (same as minimal server)
class MinimalTaskStorage {
  constructor(baseDir = 'tasks') {
    this.baseDir = baseDir;
    this.ensureDirectories();
  }

  ensureDirectories() {
    try {
      if (!fs.existsSync(this.baseDir)) {
        fs.mkdirSync(this.baseDir, { recursive: true });
      }
    } catch (error) {
      console.error(`Directory creation issue: ${error.message}`);
    }
  }

  generateTaskId() {
    const serial = Math.floor(Math.random() * 90000) + 10000;
    return `TASK-${serial}`;
  }

  async createTask(data) {
    const task = {
      id: this.generateTaskId(),
      title: data.title,
      description: data.description || '',
      status: data.status || 'todo',
      priority: data.priority || 'medium',
      project: data.project || 'default',
      created: new Date().toISOString(),
      ...data
    };

    const projectDir = path.join(this.baseDir, task.project);
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    const tasksFile = path.join(projectDir, 'tasks.json');
    let tasks = [];
    
    if (fs.existsSync(tasksFile)) {
      tasks = JSON.parse(fs.readFileSync(tasksFile, 'utf8'));
    }
    
    tasks.push(task);
    fs.writeFileSync(tasksFile, JSON.stringify(tasks, null, 2), 'utf8');
    
    return {
      id: task.id,
      message: `✅ Task created: ${task.title}`,
      task
    };
  }

  async listTasks(filters = {}) {
    const allTasks = [];
    
    try {
      const projects = filters.project 
        ? [filters.project] 
        : fs.readdirSync(this.baseDir).filter(p => 
            fs.statSync(path.join(this.baseDir, p)).isDirectory()
          );

      for (const project of projects) {
        const tasksFile = path.join(this.baseDir, project, 'tasks.json');
        if (fs.existsSync(tasksFile)) {
          const tasks = JSON.parse(fs.readFileSync(tasksFile, 'utf8'));
          allTasks.push(...tasks.filter(task => {
            if (filters.status && task.status !== filters.status) return false;
            if (filters.priority && task.priority !== filters.priority) return false;
            return true;
          }));
        }
      }
    } catch (error) {
      console.error('Error listing tasks:', error.message);
    }

    return allTasks;
  }

  async getTask(id) {
    const allTasks = await this.listTasks();
    return allTasks.find(t => t.id === id);
  }

  async updateTask(id, updates) {
    const allTasks = await this.listTasks();
    const task = allTasks.find(t => t.id === id);
    
    if (!task) return null;
    
    const updatedTask = { ...task, ...updates, updated: new Date().toISOString() };
    
    // Update in file
    const projectDir = path.join(this.baseDir, task.project);
    const tasksFile = path.join(projectDir, 'tasks.json');
    
    const tasks = JSON.parse(fs.readFileSync(tasksFile, 'utf8'));
    const index = tasks.findIndex(t => t.id === id);
    tasks[index] = updatedTask;
    
    fs.writeFileSync(tasksFile, JSON.stringify(tasks, null, 2), 'utf8');
    
    return {
      success: true,
      message: `✅ Task updated: ${updatedTask.title}`,
      task: updatedTask
    };
  }

  async getTaskContext(id, depth = 'basic') {
    const allTasks = await this.listTasks();
    const task = allTasks.find(t => t.id === id);
    
    if (!task) {
      return null;
    }

    if (depth === 'basic') {
      return {
        id: task.id,
        title: task.title,
        status: task.status,
        project: task.project,
        created: task.created,
        description: task.description || '',
        priority: task.priority || 'medium'
      };
    }

    if (depth === 'detailed') {
      const projectTasks = allTasks.filter(t => 
        t.project === task.project && t.id !== id
      ).slice(0, 5);
      
      return {
        ...task,
        related_tasks: projectTasks,
        context: `Task in ${task.project} project with ${projectTasks.length} related tasks`
      };
    }

    return task;
  }

  async deleteTask(id) {
    const allTasks = await this.listTasks();
    const task = allTasks.find(t => t.id === id);
    
    if (!task) return false;
    
    const projectDir = path.join(this.baseDir, task.project);
    const tasksFile = path.join(projectDir, 'tasks.json');
    
    const projectTasks = allTasks.filter(t => t.project === task.project && t.id !== id);
    fs.writeFileSync(tasksFile, JSON.stringify(projectTasks, null, 2), 'utf8');
    
    return true;
  }
}

// Plugin Manager
class PluginManager {
  constructor(services, logger) {
    this.services = services;
    this.logger = logger;
    this.plugins = new Map();
    this.loadedPlugins = new Map();
  }

  async loadPlugin(pluginPath) {
    try {
      const plugin = await import(pluginPath);
      const PluginClass = plugin.default;
      
      if (!PluginClass) {
        throw new Error(`No default export in ${pluginPath}`);
      }

      const instance = new PluginClass();
      await instance.init(null, this.services);
      
      this.plugins.set(instance.name, instance);
      this.loadedPlugins.set(instance.name, plugin);
      
      this.logger.info(`Plugin loaded: ${instance.name} v${instance.version}`);
      return instance;
    } catch (error) {
      this.logger.warn(`Failed to load plugin ${pluginPath}:`, error.message);
      return null;
    }
  }

  getPlugin(name) {
    return this.plugins.get(name);
  }

  getAllPlugins() {
    return Array.from(this.plugins.values());
  }

  async getAllTools() {
    const allTools = [];
    
    for (const plugin of this.plugins.values()) {
      if (plugin.getTools) {
        try {
          const tools = plugin.getTools();
          allTools.push(...tools);
        } catch (error) {
          this.logger.warn(`Error getting tools from ${plugin.name}:`, error.message);
        }
      }
    }
    
    return allTools;
  }

  async handlePluginTool(toolName, args) {
    for (const plugin of this.plugins.values()) {
      if (plugin.handleTool) {
        const tools = plugin.getTools ? plugin.getTools() : [];
        if (tools.some(t => t.name === toolName)) {
          return await plugin.handleTool(toolName, args);
        }
      }
    }
    
    throw new Error(`No plugin found to handle tool: ${toolName}`);
  }
}

// Initialize unified server
async function startUnifiedServer() {
  const logger = new SimpleLogger(CONFIG.logging);
  
  if (CONFIG.startup_message) {
    logger.info(`Like-I-Said MCP Server starting in ${CONFIG.mode} mode...`);
  }

  // Setup services
  const services = new ServiceRegistry();
  const memoryStorage = new MinimalStorage();
  const taskStorage = new MinimalTaskStorage();
  
  services.register('memory-storage', memoryStorage);
  services.register('task-storage', taskStorage);
  services.register('logger', logger);

  // Setup plugin manager
  const pluginManager = new PluginManager(services, logger);

  // Load plugins based on configuration
  if (CONFIG.plugins['ai-tools']) {
    await pluginManager.loadPlugin('./plugins/ai-tools-complete.js');
  }
  
  if (CONFIG.plugins['advanced-features']) {
    await pluginManager.loadPlugin('./plugins/advanced-features.js');
  }

  // Core tools (always available)
  const coreMemoryTools = [
    {
      name: 'add_memory',
      description: 'Add a new memory to the system',
      inputSchema: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'The content to remember' },
          project: { type: 'string', description: 'Project context' },
          tags: { type: 'array', items: { type: 'string' } },
          category: { type: 'string' }
        },
        required: ['content']
      }
    },
    {
      name: 'list_memories',
      description: 'List all memories with optional filters',
      inputSchema: {
        type: 'object',
        properties: {
          project: { type: 'string' },
          category: { type: 'string' },
          minComplexity: { type: 'number' }
        }
      }
    },
    {
      name: 'search_memories',
      description: 'Search memories by query',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' }
        },
        required: ['query']
      }
    },
    {
      name: 'get_memory',
      description: 'Get a specific memory by ID',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      }
    },
    {
      name: 'delete_memory',
      description: 'Delete a memory by ID',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      }
    }
  ];

  const coreTaskTools = [
    {
      name: 'create_task',
      description: 'Create a new task',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          status: { type: 'string', enum: ['todo', 'in_progress', 'done', 'blocked'] },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
          project: { type: 'string' }
        },
        required: ['title']
      }
    },
    {
      name: 'update_task',
      description: 'Update an existing task',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          status: { type: 'string' },
          priority: { type: 'string' },
          description: { type: 'string' }
        },
        required: ['id']
      }
    },
    {
      name: 'list_tasks',
      description: 'List all tasks with optional filters',
      inputSchema: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          project: { type: 'string' },
          priority: { type: 'string' }
        }
      }
    },
    {
      name: 'get_task_context',
      description: 'Get detailed task information including relationships and connected memories',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          depth: { type: 'string', enum: ['basic', 'detailed'], default: 'basic' }
        },
        required: ['id']
      }
    },
    {
      name: 'delete_task',
      description: 'Delete a task by ID',
      inputSchema: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      }
    }
  ];

  const testTool = {
    name: 'test_tool',
    description: 'Test that MCP server is working',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string' }
      }
    }
  };

  // Create MCP server
  const server = new Server(
    {
      name: 'like-i-said-unified',
      version: '3.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register tools list handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const pluginTools = await pluginManager.getAllTools();
    const allTools = [
      ...coreMemoryTools,
      ...coreTaskTools,
      testTool,
      ...pluginTools
    ];

    return { tools: allTools };
  });

  // Register tool call handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      let result;

      // Handle core tools
      switch (name) {
        // Memory tools
        case 'add_memory':
          result = await memoryStorage.saveMemory(args.content, args);
          break;
        case 'list_memories':
          result = await memoryStorage.listMemories(args);
          break;
        case 'search_memories':
          result = await memoryStorage.searchMemories(args.query);
          break;
        case 'get_memory':
          result = await memoryStorage.getMemory(args.id);
          break;
        case 'delete_memory':
          result = await memoryStorage.deleteMemory(args.id);
          break;

        // Task tools
        case 'create_task':
          result = await taskStorage.createTask(args);
          break;
        case 'update_task':
          result = await taskStorage.updateTask(args.id, args);
          break;
        case 'list_tasks':
          result = await taskStorage.listTasks(args);
          break;
        case 'get_task_context':
          result = await taskStorage.getTaskContext(args.id, args.depth);
          break;
        case 'delete_task':
          result = await taskStorage.deleteTask(args.id);
          break;

        // Test tool
        case 'test_tool':
          result = {
            success: true,
            message: `✅ Like-I-Said Unified MCP Server is working! Mode: ${CONFIG.mode}, Message: ${args.message || 'No message'}`,
            timestamp: new Date().toISOString(),
            mode: CONFIG.mode,
            plugins_loaded: pluginManager.getAllPlugins().map(p => `${p.name} v${p.version}`)
          };
          break;

        default:
          // Try to handle with plugins
          result = await pluginManager.handlePluginTool(name, args);
      }

      return {
        content: [
          {
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`
          }
        ]
      };
    }
  });

  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  if (CONFIG.startup_message) {
    logger.info(`Server started successfully in ${CONFIG.mode} mode`);
    logger.info(`Plugins loaded: ${pluginManager.getAllPlugins().length}`);
  }
}

// Handle errors gracefully - no process.exit()
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error.message);
  // Don't exit - let MCP framework handle it
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
  // Don't exit - let MCP framework handle it
});

// Graceful shutdown handlers - no process.exit()
process.on('SIGINT', () => {
  console.error('Received SIGINT, shutting down gracefully...');
  // Let the process exit naturally
});

process.on('SIGTERM', () => {
  console.error('Received SIGTERM, shutting down gracefully...');
  // Let the process exit naturally
});

// Start the server
startUnifiedServer().catch(error => {
  console.error('❌ Server startup failed:', error.message);
  // Don't use process.exit() - let it fail gracefully
});