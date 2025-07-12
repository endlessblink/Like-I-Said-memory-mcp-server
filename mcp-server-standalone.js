#!/usr/bin/env node

/**
 * Standalone MCP Server Entry Point
 * Optimized for pkg bundling - includes only essential dependencies
 * for core MCP server functionality without the dashboard
 */

import fs from 'fs';
import path from 'path';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Essential library imports for core MCP functionality
import { MemoryStorageWrapper } from './lib/memory-storage-wrapper.js';
import { TaskStorage } from './lib/task-storage.js';
import { TaskMemoryLinker } from './lib/task-memory-linker.js';
import { DropoffGenerator } from './lib/dropoff-generator.js';

// Override console to prevent ANY output to stdout
const originalConsoleError = console.error;
console.log = () => {};
console.info = () => {};
console.warn = () => {};
console.debug = () => {};
console.error = (...args) => {
  if (process.env.DEBUG_MCP) {
    originalConsoleError('[DEBUG]', ...args);
  }
};

/**
 * Initialize essential directories for memory and task storage
 */
function initializeDirectories() {
  const dirs = ['memories', 'tasks', 'data-backups'];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

/**
 * Lightweight MCP Server class with core functionality only
 */
class StandaloneMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'like-i-said-memory-v2',
        version: '2.3.7',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize storage systems
    this.memoryStorage = new MemoryStorageWrapper();
    this.taskStorage = new TaskStorage();
    this.taskMemoryLinker = new TaskMemoryLinker(this.memoryStorage, this.taskStorage);
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
                project: { type: 'string', description: 'Project identifier' },
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
                project: { type: 'string', description: 'Filter by project' },
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
                project: { type: 'string', description: 'Project identifier' },
                description: { type: 'string', description: 'Task description' },
                priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
                category: { type: 'string', enum: ['personal', 'work', 'code', 'research'] },
                tags: { type: 'array', items: { type: 'string' } }
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

  // Tool handlers - essential functionality only
  async handleAddMemory(args) {
    const result = await this.memoryStorage.addMemory(args);
    
    // Auto-link with tasks if enabled
    try {
      await this.taskMemoryLinker.linkMemoryToTasks(result.id);
    } catch (linkError) {
      // Continue even if linking fails
    }

    return {
      content: [
        {
          type: 'text',
          text: `✅ Memory stored successfully!\n🆔 ID: ${result.id}\n📁 Project: ${result.project}\n📊 Status: ${result.status}`
        }
      ]
    };
  }

  async handleGetMemory(args) {
    const memory = await this.memoryStorage.getMemory(args.id);
    return {
      content: [
        {
          type: 'text',
          text: `📋 **Memory ID:** ${memory.id}\n📅 **Date:** ${memory.timestamp}\n📁 **Project:** ${memory.project}\n🏷️ **Tags:** ${memory.tags?.join(', ') || 'None'}\n\n**Content:**\n${memory.content}`
        }
      ]
    };
  }

  async handleListMemories(args) {
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
  }

  async handleDeleteMemory(args) {
    await this.memoryStorage.deleteMemory(args.id);
    return {
      content: [
        {
          type: 'text',
          text: `🗑️ Memory ${args.id} deleted successfully`
        }
      ]
    };
  }

  async handleSearchMemories(args) {
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
  }

  async handleCreateTask(args) {
    const task = await this.taskStorage.createTask(args);
    
    // Auto-link with memories if enabled
    try {
      await this.taskMemoryLinker.linkTaskToMemories(task.id);
    } catch (linkError) {
      // Continue even if linking fails
    }

    return {
      content: [
        {
          type: 'text',
          text: `✅ Task created successfully!\n🆔 ID: ${task.id}\n📌 Serial: ${task.serial}\n📋 Title: ${task.title}\n📁 Project: ${task.project}\n📊 Status: ${task.status}`
        }
      ]
    };
  }

  async handleUpdateTask(args) {
    const updatedTask = await this.taskStorage.updateTask(args.task_id, args);
    return {
      content: [
        {
          type: 'text',
          text: `✅ Task updated successfully!\n🆔 ID: ${updatedTask.id}\n📊 Status: ${updatedTask.status}`
        }
      ]
    };
  }

  async handleListTasks(args) {
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
  }

  async handleDeleteTask(args) {
    await this.taskStorage.deleteTask(args.task_id);
    return {
      content: [
        {
          type: 'text',
          text: `🗑️ Task ${args.task_id} deleted successfully`
        }
      ]
    };
  }

  async handleGenerateDropoff(args) {
    const result = await this.dropoffGenerator.generateDropoff(args);
    return {
      content: [
        {
          type: 'text',
          text: `📄 Session dropoff generated successfully!\n📁 File: ${result.filePath}\n📊 Size: ${result.size} bytes`
        }
      ]
    };
  }

  async handleTestTool(args) {
    return {
      content: [
        {
          type: 'text',
          text: `✅ MCP Server is working! Message: ${args.message}`
        }
      ]
    };
  }

  async start() {
    // Initialize directories
    initializeDirectories();
    
    // Set up transport
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    // NO OUTPUT AT ALL - comment for debugging only
  }
}

// Start the server
const server = new StandaloneMCPServer();
server.start().catch(error => {
  // Even errors must not go to stdout
  process.exit(1);
});