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
import { MemoryStorageWrapper } from '../lib/memory-storage-wrapper.js';
import { TaskStorage } from '../lib/task-storage.js';
import { TaskMemoryLinker } from '../lib/task-memory-linker.js';
import { DropoffGenerator } from '../lib/dropoff-generator.js';

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
 * Minimal MarkdownStorage implementation for standalone server
 */
class MarkdownStorage {
  constructor(baseDir = 'memories') {
    this.baseDir = process.env.MEMORY_BASE_DIR || baseDir;
    this.defaultProject = process.env.DEFAULT_PROJECT || 'default';
    this.ensureDirectories();
  }

  ensureDirectories() {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
    
    const defaultProjectDir = path.join(this.baseDir, this.defaultProject);
    if (!fs.existsSync(defaultProjectDir)) {
      fs.mkdirSync(defaultProjectDir, { recursive: true });
    }
  }

  generateId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${timestamp}-${random}`;
  }

  async saveMemory(memory) {
    const project = memory.project || this.defaultProject;
    const projectDir = path.join(this.baseDir, project);
    
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }
    
    const filename = `${memory.id}.md`;
    const filepath = path.join(projectDir, filename);
    
    // Create YAML frontmatter
    const frontmatter = {
      id: memory.id,
      timestamp: memory.timestamp,
      project: memory.project,
      category: memory.category,
      tags: memory.tags || [],
      priority: memory.priority,
      status: memory.status,
      related_memories: memory.related_memories || []
    };
    
    const content = `---\n${JSON.stringify(frontmatter, null, 2)}\n---\n\n${memory.content}`;
    fs.writeFileSync(filepath, content, 'utf8');
    
    return filepath;
  }

  async getMemory(id) {
    // Search across all projects
    const projects = fs.readdirSync(this.baseDir).filter(dir => {
      const dirPath = path.join(this.baseDir, dir);
      return fs.statSync(dirPath).isDirectory();
    });
    
    for (const project of projects) {
      const filepath = path.join(this.baseDir, project, `${id}.md`);
      if (fs.existsSync(filepath)) {
        const content = fs.readFileSync(filepath, 'utf8');
        const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
        
        if (match) {
          const frontmatter = JSON.parse(match[1]);
          return {
            ...frontmatter,
            content: match[2].trim()
          };
        }
      }
    }
    
    throw new Error(`Memory with id ${id} not found`);
  }

  async listMemories(project, limit = 50) {
    const memories = [];
    const targetProjects = project ? [project] : fs.readdirSync(this.baseDir).filter(dir => {
      const dirPath = path.join(this.baseDir, dir);
      return fs.statSync(dirPath).isDirectory();
    });
    
    for (const proj of targetProjects) {
      const projectDir = path.join(this.baseDir, proj);
      if (!fs.existsSync(projectDir)) continue;
      
      const files = fs.readdirSync(projectDir).filter(f => f.endsWith('.md'));
      
      for (const file of files) {
        if (memories.length >= limit) break;
        
        const filepath = path.join(projectDir, file);
        const content = fs.readFileSync(filepath, 'utf8');
        const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
        
        if (match) {
          const frontmatter = JSON.parse(match[1]);
          memories.push({
            ...frontmatter,
            content: match[2].trim()
          });
        }
      }
    }
    
    return memories.slice(0, limit);
  }

  async deleteMemory(id) {
    const projects = fs.readdirSync(this.baseDir).filter(dir => {
      const dirPath = path.join(this.baseDir, dir);
      return fs.statSync(dirPath).isDirectory();
    });
    
    for (const project of projects) {
      const filepath = path.join(this.baseDir, project, `${id}.md`);
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        return;
      }
    }
    
    throw new Error(`Memory with id ${id} not found`);
  }

  async searchMemories(query, project) {
    const memories = await this.listMemories(project);
    const queryLower = query.toLowerCase();
    
    return memories
      .filter(memory => {
        const contentLower = memory.content.toLowerCase();
        const tagsMatch = memory.tags?.some(tag => tag.toLowerCase().includes(queryLower));
        return contentLower.includes(queryLower) || tagsMatch;
      })
      .map(memory => ({
        ...memory,
        score: 1.0 // Simple scoring
      }));
  }
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
    this.storage = new MarkdownStorage();
    this.taskStorage = new TaskStorage();
    this.taskMemoryLinker = new TaskMemoryLinker(this.storage, this.taskStorage);
    this.dropoffGenerator = new DropoffGenerator(this.storage, this.taskStorage);

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
    // Create memory object
    const memory = {
      id: this.storage.generateId(),
      timestamp: new Date().toISOString(),
      content: args.content,
      project: args.project || this.storage.defaultProject,
      category: args.category || 'general',
      tags: args.tags || [],
      priority: args.priority || 'medium',
      status: args.status || 'active',
      related_memories: args.related_memories || []
    };
    
    // Save memory
    await this.storage.saveMemory(memory);
    
    // Auto-link with tasks if enabled
    if (process.env.ENABLE_AUTO_LINKING !== 'false') {
      try {
        await this.taskMemoryLinker.linkMemoryToTasks(memory.id);
      } catch (linkError) {
        // Continue even if linking fails
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: `✅ Memory stored successfully!\n🆔 ID: ${memory.id}\n📁 Project: ${memory.project}\n📊 Status: ${memory.status}`
        }
      ]
    };
  }

  async handleGetMemory(args) {
    const memory = await this.storage.getMemory(args.id);
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
    const memories = await this.storage.listMemories(args.project, args.limit);
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
    await this.storage.deleteMemory(args.id);
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
    const results = await this.storage.searchMemories(args.query, args.project);
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