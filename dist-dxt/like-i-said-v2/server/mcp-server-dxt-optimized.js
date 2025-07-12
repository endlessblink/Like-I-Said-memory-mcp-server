/**
 * DXT-Optimized MCP Server
 * Optimized for DXT Extension deployment with environment variable support
 * and proper path handling for bundled environments
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Essential library imports
import { MemoryStorageWrapper } from './lib/memory-storage-wrapper.js';
import { TaskStorage } from './lib/task-storage.js';
import { TaskMemoryLinker } from './lib/task-memory-linker.js';
import { DropoffGenerator } from './lib/dropoff-generator.js';

// Get the directory of this script for relative imports
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// DXT Environment Configuration
const CONFIG = {
  MEMORY_BASE_DIR: process.env.MEMORY_BASE_DIR || path.join(process.cwd(), 'memories'),
  TASK_BASE_DIR: process.env.TASK_BASE_DIR || path.join(process.cwd(), 'tasks'),
  DEFAULT_PROJECT: process.env.DEFAULT_PROJECT || 'default',
  ENABLE_AUTO_LINKING: process.env.ENABLE_AUTO_LINKING !== 'false', // Default true
  BACKUP_DIR: process.env.BACKUP_DIR || path.join(process.cwd(), 'data-backups'),
  DEBUG_MODE: process.env.DEBUG_MCP === 'true'
};

// Override console to prevent ANY output to stdout (critical for MCP)
const originalConsoleError = console.error;
const debugLog = (...args) => {
  if (CONFIG.DEBUG_MODE) {
    originalConsoleError('[DXT-MCP-DEBUG]', ...args);
  }
};

console.log = () => {};
console.info = () => {};
console.warn = () => {};
console.debug = () => {};
console.error = debugLog;

/**
 * Initialize essential directories with proper error handling
 */
function initializeDirectories() {
  const dirs = [
    CONFIG.MEMORY_BASE_DIR,
    CONFIG.TASK_BASE_DIR,
    CONFIG.BACKUP_DIR,
    path.join(CONFIG.MEMORY_BASE_DIR, CONFIG.DEFAULT_PROJECT),
    path.join(CONFIG.TASK_BASE_DIR, CONFIG.DEFAULT_PROJECT)
  ];
  
  dirs.forEach(dir => {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        debugLog(`Created directory: ${dir}`);
      }
    } catch (error) {
      debugLog(`Failed to create directory ${dir}:`, error.message);
      // Continue operation - directories might be created on first write
    }
  });
}

/**
 * DXT-Optimized Memory Storage Wrapper
 */
class DXTMemoryStorage extends MemoryStorageWrapper {
  constructor() {
    super(CONFIG.MEMORY_BASE_DIR);
    this.defaultProject = CONFIG.DEFAULT_PROJECT;
  }

  async addMemory(args) {
    // Ensure project is set
    const project = args.project || this.defaultProject;
    return super.addMemory({ ...args, project });
  }

  async listMemories(project, limit) {
    // Use default project if not specified
    return super.listMemories(project || this.defaultProject, limit);
  }
}

/**
 * DXT-Optimized Task Storage
 */
class DXTTaskStorage extends TaskStorage {
  constructor(memoryStorage) {
    super(CONFIG.TASK_BASE_DIR, memoryStorage);
    this.defaultProject = CONFIG.DEFAULT_PROJECT;
  }

  async createTask(args) {
    // Ensure project is set
    const project = args.project || this.defaultProject;
    return super.createTask({ ...args, project });
  }

  async listTasks(args) {
    // Use default project if not specified and no other filters
    if (!args.project && !args.status) {
      args.project = this.defaultProject;
    }
    return super.listTasks(args);
  }
}

/**
 * DXT-Optimized MCP Server
 */
class DXTMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'like-i-said-memory-v2-dxt',
        version: '2.3.7-dxt',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize storage systems with DXT optimizations
    this.memoryStorage = new DXTMemoryStorage();
    this.taskStorage = new DXTTaskStorage(this.memoryStorage);
    
    // Only initialize linkers if auto-linking is enabled
    if (CONFIG.ENABLE_AUTO_LINKING) {
      this.taskMemoryLinker = new TaskMemoryLinker(this.memoryStorage, this.taskStorage);
    }
    
    this.dropoffGenerator = new DropoffGenerator(this.memoryStorage, this.taskStorage);

    this.setupToolHandlers();
  }

  setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // Core Memory Tools
          {
            name: 'add_memory',
            description: 'Store information with auto-categorization and linking',
            inputSchema: {
              type: 'object',
              properties: {
                content: { type: 'string', description: 'Memory content to store' },
                project: { type: 'string', description: `Project identifier (default: ${CONFIG.DEFAULT_PROJECT})` },
                category: { type: 'string', enum: ['personal', 'work', 'code', 'research', 'conversations', 'preferences'] },
                tags: { type: 'array', items: { type: 'string' } },
                priority: { type: 'string', enum: ['low', 'medium', 'high'] },
                status: { type: 'string', enum: ['active', 'archived', 'reference'] },
                related_memories: { type: 'array', items: { type: 'string' } }
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
                project: { type: 'string', description: `Filter by project (default: ${CONFIG.DEFAULT_PROJECT})` },
                limit: { type: 'number', description: 'Maximum memories to return' }
              }
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
            name: 'search_memories',
            description: 'Search memories with project filtering',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'Search query' },
                project: { type: 'string', description: 'Limit search to specific project' }
              },
              required: ['query']
            }
          },
          // Core Task Tools
          {
            name: 'create_task',
            description: 'Create task with auto-memory linking',
            inputSchema: {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'Task title' },
                project: { type: 'string', description: `Project identifier (default: ${CONFIG.DEFAULT_PROJECT})` },
                description: { type: 'string', description: 'Task description' },
                priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
                category: { type: 'string', enum: ['personal', 'work', 'code', 'research'] },
                tags: { type: 'array', items: { type: 'string' } }
              },
              required: ['title']
            }
          },
          {
            name: 'update_task',
            description: 'Update task status and details',
            inputSchema: {
              type: 'object',
              properties: {
                task_id: { type: 'string', description: 'Task ID to update' },
                status: { type: 'string', enum: ['todo', 'in_progress', 'done', 'blocked'] },
                title: { type: 'string', description: 'New task title' },
                description: { type: 'string', description: 'New task description' }
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
                status: { type: 'string', enum: ['todo', 'in_progress', 'done', 'blocked'] },
                limit: { type: 'number', description: 'Maximum tasks to return' }
              }
            }
          },
          {
            name: 'delete_task',
            description: 'Delete a task and its subtasks',
            inputSchema: {
              type: 'object',
              properties: {
                task_id: { type: 'string', description: 'Task ID to delete' }
              },
              required: ['task_id']
            }
          },
          {
            name: 'generate_dropoff',
            description: 'Generate session handoff document',
            inputSchema: {
              type: 'object',
              properties: {
                session_summary: { type: 'string', description: 'Brief summary of work done' },
                output_path: { type: 'string', description: 'Custom output directory path' },
                output_format: { type: 'string', enum: ['markdown', 'json'] }
              }
            }
          },
          {
            name: 'test_tool',
            description: 'Test MCP connection',
            inputSchema: {
              type: 'object',
              properties: {
                message: { type: 'string', description: 'Test message' }
              },
              required: ['message']
            }
          }
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        debugLog(`Tool call: ${name}`, args);
        
        switch (name) {
          case 'add_memory':
            return await this.handleAddMemory(args);
          case 'get_memory':
            return await this.handleGetMemory(args);
          case 'list_memories':
            return await this.handleListMemories(args);
          case 'delete_memory':
            return await this.handleDeleteMemory(args);
          case 'search_memories':
            return await this.handleSearchMemories(args);
          case 'create_task':
            return await this.handleCreateTask(args);
          case 'update_task':
            return await this.handleUpdateTask(args);
          case 'list_tasks':
            return await this.handleListTasks(args);
          case 'delete_task':
            return await this.handleDeleteTask(args);
          case 'generate_dropoff':
            return await this.handleGenerateDropoff(args);
          case 'test_tool':
            return await this.handleTestTool(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        debugLog(`Tool error (${name}):`, error);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`
            }
          ]
        };
      }
    });
  }

  // Tool handlers with DXT optimizations
  async handleAddMemory(args) {
    try {
      const result = await this.memoryStorage.addMemory(args);
      
      // Auto-link with tasks if enabled
      if (CONFIG.ENABLE_AUTO_LINKING && this.taskMemoryLinker) {
        try {
          await this.taskMemoryLinker.linkMemoryToTasks(result.id);
        } catch (linkError) {
          debugLog('Auto-linking failed:', linkError);
          // Continue even if linking fails
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: `✅ Memory stored successfully!\n🆔 ID: ${result.id}\n📁 Project: ${result.project}\n📊 Status: ${result.status}`
          }
        ]
      };
    } catch (error) {
      debugLog('Add memory error:', error);
      throw error;
    }
  }

  async handleGetMemory(args) {
    try {
      const memory = await this.memoryStorage.getMemory(args.id);
      return {
        content: [
          {
            type: 'text',
            text: `📋 **Memory ID:** ${memory.id}\n📅 **Date:** ${memory.timestamp}\n📁 **Project:** ${memory.project}\n🏷️ **Tags:** ${memory.tags?.join(', ') || 'None'}\n\n**Content:**\n${memory.content}`
          }
        ]
      };
    } catch (error) {
      debugLog('Get memory error:', error);
      throw error;
    }
  }

  async handleListMemories(args) {
    try {
      const memories = await this.memoryStorage.listMemories(args.project, args.limit);
      const memoryList = memories.map(m => 
        `📋 **${m.id}** (${m.project}) - ${new Date(m.timestamp).toLocaleDateString()}`
      ).join('\n');
      
      return {
        content: [
          {
            type: 'text',
            text: `📚 **Found ${memories.length} memories:**\n\n${memoryList}`
          }
        ]
      };
    } catch (error) {
      debugLog('List memories error:', error);
      throw error;
    }
  }

  async handleDeleteMemory(args) {
    try {
      await this.memoryStorage.deleteMemory(args.id);
      return {
        content: [
          {
            type: 'text',
            text: `🗑️ Memory ${args.id} deleted successfully`
          }
        ]
      };
    } catch (error) {
      debugLog('Delete memory error:', error);
      throw error;
    }
  }

  async handleSearchMemories(args) {
    try {
      const results = await this.memoryStorage.searchMemories(args.query, args.project);
      const resultList = results.map(r => 
        `📋 **${r.id}** (${r.project}) - Score: ${r.score?.toFixed(2) || 'N/A'}`
      ).join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `🔍 **Search Results for "${args.query}":**\n\n${resultList}`
          }
        ]
      };
    } catch (error) {
      debugLog('Search memories error:', error);
      throw error;
    }
  }

  async handleCreateTask(args) {
    try {
      // Ensure project is set
      if (!args.project) {
        args.project = CONFIG.DEFAULT_PROJECT;
      }
      
      const task = await this.taskStorage.createTask(args);
      
      // Auto-link with memories if enabled
      if (CONFIG.ENABLE_AUTO_LINKING && this.taskMemoryLinker) {
        try {
          await this.taskMemoryLinker.linkTaskToMemories(task.id);
        } catch (linkError) {
          debugLog('Task auto-linking failed:', linkError);
          // Continue even if linking fails
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: `✅ Task created successfully!\n🆔 ID: ${task.id}\n📌 Serial: ${task.serial}\n📋 Title: ${task.title}\n📁 Project: ${task.project}\n📊 Status: ${task.status}`
          }
        ]
      };
    } catch (error) {
      debugLog('Create task error:', error);
      throw error;
    }
  }

  async handleUpdateTask(args) {
    try {
      const updatedTask = await this.taskStorage.updateTask(args.task_id, args);
      return {
        content: [
          {
            type: 'text',
            text: `✅ Task updated successfully!\n🆔 ID: ${updatedTask.id}\n📊 Status: ${updatedTask.status}`
          }
        ]
      };
    } catch (error) {
      debugLog('Update task error:', error);
      throw error;
    }
  }

  async handleListTasks(args) {
    try {
      const tasks = await this.taskStorage.listTasks(args);
      const taskList = tasks.map(t => 
        `📋 **${t.serial}** ${t.title} (${t.status}) - ${t.project}`
      ).join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `📋 **Found ${tasks.length} tasks:**\n\n${taskList}`
          }
        ]
      };
    } catch (error) {
      debugLog('List tasks error:', error);
      throw error;
    }
  }

  async handleDeleteTask(args) {
    try {
      await this.taskStorage.deleteTask(args.task_id);
      return {
        content: [
          {
            type: 'text',
            text: `🗑️ Task ${args.task_id} deleted successfully`
          }
        ]
      };
    } catch (error) {
      debugLog('Delete task error:', error);
      throw error;
    }
  }

  async handleGenerateDropoff(args) {
    try {
      const result = await this.dropoffGenerator.generateDropoff(args);
      return {
        content: [
          {
            type: 'text',
            text: `📄 Session dropoff generated successfully!\n📁 File: ${result.filePath}\n📊 Size: ${result.size} bytes`
          }
        ]
      };
    } catch (error) {
      debugLog('Generate dropoff error:', error);
      throw error;
    }
  }

  async handleTestTool(args) {
    const configInfo = `
Configuration:
- Memory Dir: ${CONFIG.MEMORY_BASE_DIR}
- Task Dir: ${CONFIG.TASK_BASE_DIR}
- Default Project: ${CONFIG.DEFAULT_PROJECT}
- Auto-linking: ${CONFIG.ENABLE_AUTO_LINKING}
- Debug Mode: ${CONFIG.DEBUG_MODE}`;

    return {
      content: [
        {
          type: 'text',
          text: `✅ MCP Server is working! Message: ${args.message}\n\n${configInfo}`
        }
      ]
    };
  }

  async start() {
    try {
      // Initialize directories
      initializeDirectories();
      
      // Set up transport
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      debugLog('DXT MCP Server started successfully');
      debugLog('Configuration:', CONFIG);
    } catch (error) {
      debugLog('Failed to start server:', error);
      process.exit(1);
    }
  }
}

// Start the server
const server = new DXTMCPServer();
server.start().catch(error => {
  debugLog('Fatal error:', error);
  process.exit(1);
});