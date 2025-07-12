#!/usr/bin/env node

// Detect if we're running in MCP mode by checking for MCP_MODE env or non-TTY stdin
// Windows doesn't always properly detect TTY, so we also check for MCP_MODE env
const isMCPMode = process.env.MCP_MODE === 'true' || !process.stdin.isTTY || process.env.MCP_QUIET === 'true';

import fs from 'fs';
import path from 'path';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { DropoffGenerator } from './lib/dropoff-generator.js';
import { TaskStorage } from './lib/task-storage.js';
import { TaskMemoryLinker } from './lib/task-memory-linker.js';
import { VectorStorage } from './lib/vector-storage.js';
import { TitleSummaryGenerator } from './lib/title-summary-generator.js';
import { OllamaClient } from './lib/ollama-client.js';
import { MemoryDeduplicator } from './lib/memory-deduplicator.js';
import { TaskNLPProcessor } from './lib/task-nlp-processor.js';
import { TaskAutomation } from './lib/task-automation.js';
import { TaskStatusValidator } from './lib/task-status-validator.js';
import { TaskAnalytics } from './lib/task-analytics.js';
import { MemoryTaskAutomator } from './lib/memory-task-automator.cjs';
// Removed ConnectionProtection and DataIntegrity imports to prevent any exit calls
// import { createRequire } from 'module';
// const require = createRequire(import.meta.url);
// const { ConnectionProtection } = require('./lib/connection-protection.cjs');
// const { DataIntegrity } = require('./lib/data-integrity.cjs');

/**
 * Auto-detect optimal output path for session dropoffs
 * Option 2: Project-aware detection with Option 5: Parameter override
 */
function getDropoffOutputPath(customPath = null) {
  // Option 5: If custom path is provided, use it
  if (customPath) {
    const resolvedPath = path.resolve(process.cwd(), customPath);
    // Ensure the directory exists
    if (!fs.existsSync(resolvedPath)) {
      fs.mkdirSync(resolvedPath, { recursive: true });
    }
    return resolvedPath;
  }
  
  // Option 2: Auto-detect session-dropoffs folder
  const sessionDropoffsPath = path.join(process.cwd(), 'session-dropoffs');
  if (fs.existsSync(sessionDropoffsPath)) {
    return sessionDropoffsPath;
  }
  
  // Fallback: Use current directory
  return process.cwd();
}

// Markdown storage implementation
class MarkdownStorage {
  constructor(baseDir = 'memories', defaultProject = 'default') {
    this.baseDir = baseDir;
    this.defaultProject = defaultProject;
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

  generateFilename(memory) {
    const date = new Date(memory.timestamp || Date.now());
    const dateStr = date.toISOString().split('T')[0];
    
    const content = memory.content || 'memory';
    const slug = content
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 30)
      .replace(/-+$/, '');
    
    const timestamp = Date.now().toString().slice(-6);
    return `${dateStr}-${slug}-${timestamp}.md`;
  }

  getProjectDir(project) {
    const projectName = project || this.defaultProject;
    
    // Security: Sanitize project name to prevent path traversal
    const sanitizedProject = projectName
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(0, 50);
    
    if (!sanitizedProject) {
      throw new Error('Invalid project name');
    }
    
    const projectDir = path.join(this.baseDir, sanitizedProject);
    
    // Security: Ensure the path doesn't escape the base directory
    const resolvedProjectDir = path.resolve(projectDir);
    const resolvedBaseDir = path.resolve(this.baseDir);
    
    if (!resolvedProjectDir.startsWith(resolvedBaseDir)) {
      throw new Error('Invalid project path - path traversal attempt detected');
    }
    
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }
    
    return projectDir;
  }

  generateMarkdownContent(memory) {
    // Detect complexity level based on content and metadata
    const complexity = this.detectComplexityLevel(memory);
    
    const frontmatter = [
      '---',
      `id: ${memory.id}`,
      `timestamp: ${memory.timestamp}`,
      `complexity: ${complexity}`,
      memory.category ? `category: ${memory.category}` : null,
      memory.project ? `project: ${memory.project}` : null,
      memory.tags && memory.tags.length > 0 ? `tags: [${memory.tags.map(t => `"${t}"`).join(', ')}]` : null,
      memory.priority ? `priority: ${memory.priority}` : 'priority: medium',
      memory.status ? `status: ${memory.status}` : 'status: active',
      memory.related_memories && memory.related_memories.length > 0 ? `related_memories: [${memory.related_memories.map(id => `"${id}"`).join(', ')}]` : null,
      `access_count: ${memory.access_count || 0}`,
      `last_accessed: ${memory.last_accessed || memory.timestamp}`,
      'metadata:',
      `  content_type: ${this.detectContentType(memory.content)}`,
      memory.language ? `  language: ${memory.language}` : null,
      `  size: ${memory.content.length}`,
      `  mermaid_diagram: ${this.hasMermaidDiagram(memory.content)}`,
      '---',
      ''
    ].filter(Boolean).join('\n');

    return frontmatter + memory.content;
  }

  // Detect complexity level (1-4) based on cursor-memory-bank principles
  detectComplexityLevel(memory) {
    let complexity = 1; // Default: Simple memory operations
    
    // Level 2: Enhanced operations with categorization and tagging
    if (memory.category || (memory.tags && memory.tags.length > 2)) {
      complexity = 2;
    }
    
    // Level 3: Project-based organization with cross-references
    if (memory.project || (memory.related_memories && memory.related_memories.length > 0)) {
      complexity = 3;
    }
    
    // Level 4: Advanced analytics, relationships, and automation
    if (memory.content.length > 1000 || 
        (memory.tags && memory.tags.length > 5) ||
        this.hasMermaidDiagram(memory.content) ||
        (memory.related_memories && memory.related_memories.length > 2)) {
      complexity = 4;
    }
    
    return complexity;
  }

  // Detect content type for enhanced metadata
  detectContentType(content) {
    // Check for code patterns
    if (content.includes('```') || 
        content.includes('function') || 
        content.includes('class ') ||
        content.includes('import ') ||
        content.includes('const ') ||
        content.includes('def ') ||
        content.includes('<script') ||
        content.includes('SELECT ') ||
        content.includes('FROM ')) {
      return 'code';
    }
    
    // Check for structured data
    if (content.includes('```json') ||
        content.includes('```yaml') ||
        content.includes('```mermaid') ||
        content.startsWith('{') ||
        content.startsWith('[') ||
        content.includes('---\n')) {
      return 'structured';
    }
    
    return 'text';
  }

  // Check if content contains Mermaid diagrams
  hasMermaidDiagram(content) {
    return content.includes('```mermaid') || 
           content.includes('graph ') ||
           content.includes('flowchart ') ||
           content.includes('sequenceDiagram') ||
           content.includes('classDiagram') ||
           content.includes('erDiagram');
  }

  parseMarkdownContent(content) {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---([\s\S]*)$/;
    const match = content.match(frontmatterRegex);
    
    if (!match) {
      return {
        id: Date.now().toString(),
        content: content.trim(),
        timestamp: new Date().toISOString(),
        tags: [],
        complexity: 1,
        priority: 'medium',
        status: 'active',
        access_count: 0
      };
    }

    const [, frontmatter, bodyContent] = match;
    const memory = { content: bodyContent.trim(), metadata: {} };

    const lines = frontmatter.split('\n');
    let inMetadata = false;

    lines.forEach(line => {
      // Handle metadata section
      if (line.trim() === 'metadata:') {
        inMetadata = true;
        return;
      }
      
      if (inMetadata && line.startsWith('  ')) {
        // Parse metadata fields
        const metaLine = line.slice(2); // Remove 2-space indent
        const colonIndex = metaLine.indexOf(':');
        if (colonIndex === -1) return;
        
        const key = metaLine.slice(0, colonIndex).trim();
        const value = metaLine.slice(colonIndex + 1).trim();
        
        switch (key) {
          case 'content_type':
            memory.metadata.content_type = value;
            break;
          case 'language':
            memory.metadata.language = value;
            break;
          case 'size':
            memory.metadata.size = parseInt(value) || 0;
            break;
          case 'mermaid_diagram':
            memory.metadata.mermaid_diagram = value === 'true';
            break;
        }
        return;
      }
      
      inMetadata = false;
      
      // Parse main frontmatter fields
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) return;

      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();

      switch (key) {
        case 'id':
          memory.id = value;
          break;
        case 'timestamp':
        case 'created':
          memory.timestamp = value;
          break;
        case 'complexity':
          memory.complexity = parseInt(value) || 1;
          break;
        case 'category':
          memory.category = value;
          break;
        case 'priority':
          memory.priority = value;
          break;
        case 'status':
          memory.status = value;
          break;
        case 'access_count':
          memory.access_count = parseInt(value) || 0;
          break;
        case 'last_accessed':
          memory.last_accessed = value;
          break;
        case 'tags':
          if (value.startsWith('[') && value.endsWith(']')) {
            memory.tags = value.slice(1, -1).split(',').map(t => t.trim().replace(/['"]/g, ''));
          } else {
            memory.tags = value.split(',').map(t => t.trim()).filter(Boolean);
          }
          break;
        case 'related_memories':
          if (value.startsWith('[') && value.endsWith(']')) {
            memory.related_memories = value.slice(1, -1).split(',').map(t => t.trim().replace(/['"]/g, ''));
          } else {
            memory.related_memories = value.split(',').map(t => t.trim()).filter(Boolean);
          }
          break;
        case 'project':
          memory.project = value;
          break;
      }
    });

    return memory;
  }

  parseMarkdownFile(filepath) {
    try {
      const content = fs.readFileSync(filepath, 'utf8');
      const parsed = this.parseMarkdownContent(content);
      
      if (!parsed) return null;

      const filename = path.basename(filepath);
      const projectName = path.basename(path.dirname(filepath));
      
      return {
        ...parsed,
        filename,
        filepath,
        project: projectName === this.defaultProject ? undefined : projectName
      };
    } catch (error) {
      console.error(`Error reading markdown file ${filepath}:`, error);
      return null;
    }
  }

  async saveMemory(memory) {
    // Check if this memory already exists
    const existingMemory = await this.getMemory(memory.id);
    
    let filepath;
    if (existingMemory && existingMemory.filepath) {
      // Update existing memory file at its current location
      filepath = existingMemory.filepath;
    } else {
      // Create new memory file
      const projectDir = this.getProjectDir(memory.project);
      const filename = this.generateFilename(memory);
      filepath = path.join(projectDir, filename);
    }
    
    const markdownContent = this.generateMarkdownContent(memory);
    fs.writeFileSync(filepath, markdownContent, 'utf8');
    
    return filepath;
  }

  async getMemory(id) {
    const memories = await this.listMemories();
    return memories.find(m => m.id === id) || null;
  }

  async listMemories(project) {
    const memories = [];
    
    // Safeguard: Only load from the designated memories directory
    if (!fs.existsSync(this.baseDir)) {
      console.warn(`Memories directory '${this.baseDir}' does not exist. Creating it...`);
      fs.mkdirSync(this.baseDir, { recursive: true });
      return memories;
    }
    
    // Safeguard: Ensure we're only working within the memories directory
    const resolvedBaseDir = path.resolve(this.baseDir);
    const expectedMemoriesDir = path.resolve('memories');
    if (!resolvedBaseDir.startsWith(expectedMemoriesDir)) {
      throw new Error('Invalid memory directory. Memories can only be loaded from the designated memories folder.');
    }
    
    if (project) {
      const projectDir = this.getProjectDir(project);
      
      // Safeguard: Ensure project directory is within memories folder
      const resolvedProjectDir = path.resolve(projectDir);
      if (!resolvedProjectDir.startsWith(resolvedBaseDir)) {
        throw new Error('Invalid project directory. Must be within the memories folder.');
      }
      
      if (!fs.existsSync(projectDir)) {
        return memories;
      }
      
      const files = fs.readdirSync(projectDir).filter(f => f.endsWith('.md'));
      
      for (const file of files) {
        const filepath = path.join(projectDir, file);
        const memory = this.parseMarkdownFile(filepath);
        if (memory) memories.push(memory);
      }
    } else {
      const projectDirs = fs.readdirSync(this.baseDir).filter(dir => {
        const dirPath = path.join(this.baseDir, dir);
        return fs.statSync(dirPath).isDirectory();
      });

      for (const projectDir of projectDirs) {
        const projectPath = path.join(this.baseDir, projectDir);
        
        // Safeguard: Ensure project path is within memories directory
        const resolvedProjectPath = path.resolve(projectPath);
        if (!resolvedProjectPath.startsWith(resolvedBaseDir)) {
          console.warn(`Skipping invalid project directory: ${projectPath}`);
          continue;
        }
        
        const files = fs.readdirSync(projectPath).filter(f => f.endsWith('.md'));
        
        for (const file of files) {
          const filepath = path.join(projectPath, file);
          
          // Safeguard: Ensure file path is within memories directory
          const resolvedFilePath = path.resolve(filepath);
          if (!resolvedFilePath.startsWith(resolvedBaseDir)) {
            console.warn(`Skipping invalid memory file: ${filepath}`);
            continue;
          }
          
          const memory = this.parseMarkdownFile(filepath);
          if (memory) memories.push(memory);
        }
      }
    }

    return memories.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async updateMemory(id, updates) {
    const existingMemory = await this.getMemory(id);
    if (!existingMemory) return false;

    const updatedMemory = {
      ...existingMemory,
      ...updates,
      id: existingMemory.id,
      timestamp: existingMemory.timestamp
    };

    await this.saveMemory(updatedMemory);
    return true;
  }

  async deleteMemory(id) {
    const memory = await this.getMemory(id);
    if (!memory) return false;

    fs.unlinkSync(memory.filepath);
    return true;
  }

  async searchMemories(query, project) {
    const memories = await this.listMemories(project);
    const lowerQuery = query.toLowerCase();

    return memories.filter(memory => 
      memory.content.toLowerCase().includes(lowerQuery) ||
      memory.tags?.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
      memory.category?.toLowerCase().includes(lowerQuery)
    );
  }

  // Migration from JSON
  async migrateFromJSON(jsonFilePath) {
    if (!fs.existsSync(jsonFilePath)) {
      if (process.env.DEBUG_MCP) console.error('No JSON file to migrate from');
      return 0;
    }

    const jsonContent = fs.readFileSync(jsonFilePath, 'utf8');
    const memories = JSON.parse(jsonContent);

    let migrated = 0;
    for (const memory of memories) {
      try {
        await this.saveMemory(memory);
        migrated++;
      } catch (error) {
        console.error(`Failed to migrate memory ${memory.id}:`, error);
      }
    }

    const backupPath = jsonFilePath + '.backup';
    fs.copyFileSync(jsonFilePath, backupPath);
    if (!isMCPMode && !process.env.MCP_QUIET) console.error(`Migrated ${migrated} memories. JSON backup saved to ${backupPath}`);

    return migrated;
  }
}

// Initialize storage
const storage = new MarkdownStorage();

// Initialize vector storage
const vectorStorage = new VectorStorage();

// Initialize task storage and linker
const taskStorage = new TaskStorage('tasks', storage);
const taskMemoryLinker = new TaskMemoryLinker(storage, taskStorage);

// Initialize memory-task automator
const memoryTaskAutomator = new MemoryTaskAutomator(storage, taskStorage, {
  enabled: true,
  minConfidence: 0.5,
  autoExecuteThreshold: 0.8,
  logAutomatedActions: true
});

// Initialize dropoff generator
const dropoffGenerator = new DropoffGenerator();

// Initialize connection protection system (disabled in MCP mode to prevent disconnections)
// Disable modules that cause exits - ALWAYS disabled for MCP stability
let connectionProtection = null;
let dataIntegrity = null;
// These modules are disabled to prevent process.exit() calls that break MCP connection

// Auto-migrate from JSON if it exists (only once)
const jsonFile = path.join(process.cwd(), 'memories.json');
const migrationMarker = path.join(process.cwd(), '.migration-complete');
if (fs.existsSync(jsonFile) && !fs.existsSync(migrationMarker)) {
  // Suppress ALL migration messages in MCP mode
  if (!isMCPMode) console.error('Migrating from JSON to markdown files...');
  storage.migrateFromJSON(jsonFile).then(count => {
    if (!isMCPMode) console.error(`Migration complete: ${count} memories converted to markdown`);
    // Create marker to prevent re-migration
    fs.writeFileSync(migrationMarker, new Date().toISOString());
  });
}

// NEVER show startup messages in MCP mode
// Startup message disabled to prevent MCP protocol corruption

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

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'add_memory',
        description: 'AUTOMATICALLY use when user shares important information, code snippets, decisions, learnings, or context that should be remembered for future sessions. Includes smart categorization and auto-linking.',
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
              description: 'Memory category (personal, work, code, research, conversations, preferences)',
            },
            project: {
              type: 'string',
              description: 'Project name to organize memory files',
            },
            priority: {
              type: 'string',
              description: 'Priority level (low, medium, high)',
            },
            status: {
              type: 'string',
              description: 'Memory status (active, archived, reference)',
            },
            related_memories: {
              type: 'array',
              items: { type: 'string' },
              description: 'IDs of related memories for cross-referencing',
            },
            language: {
              type: 'string',
              description: 'Programming language for code content',
            },
          },
          required: ['content'],
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
        name: 'list_memories',
        description: 'List all stored memories or memories from a specific project',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of memories to return',
            },
            project: {
              type: 'string',
              description: 'Filter by project name',
            },
          },
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
        description: 'AUTOMATICALLY use when user asks about past work, previous decisions, looking for examples, or needs context from earlier sessions. Provides semantic and keyword-based search.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query',
            },
            project: {
              type: 'string',
              description: 'Limit search to specific project',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'test_tool',
        description: 'Simple test tool to verify MCP is working',
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
      {
        name: 'generate_dropoff',
        description: 'Generate conversation dropoff document for session handoff with context from recent memories, git status, and project info',
        inputSchema: {
          type: 'object',
          properties: {
            session_summary: {
              type: 'string',
              description: 'Brief summary of work done in this session',
              default: 'Session work completed',
            },
            include_recent_memories: {
              type: 'boolean',
              description: 'Include recent memories in the dropoff',
              default: true,
            },
            include_git_status: {
              type: 'boolean',
              description: 'Include git status and recent commits',
              default: true,
            },
            recent_memory_count: {
              type: 'number',
              description: 'Number of recent memories to include',
              default: 5,
            },
            output_format: {
              type: 'string',
              description: 'Output format: markdown or json',
              enum: ['markdown', 'json'],
              default: 'markdown',
            },
            output_path: {
              type: 'string',
              description: 'Custom output directory path. If not provided, auto-detects session-dropoffs/ folder or defaults to current directory',
              default: null,
            },
          },
        },
      },
      {
        name: 'create_task',
        description: 'Create a new task with intelligent memory linking. Tasks start in "todo" status. IMPORTANT: After creating a task, remember to update its status to "in_progress" when you begin working on it. Proper state management helps track workflow and productivity.',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Task title',
            },
            description: {
              type: 'string',
              description: 'Detailed task description',
            },
            project: {
              type: 'string',
              description: 'Project identifier',
            },
            category: {
              type: 'string',
              enum: ['personal', 'work', 'code', 'research'],
              description: 'Task category',
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'urgent'],
              default: 'medium',
              description: 'Task priority',
            },
            parent_task: {
              type: 'string',
              description: 'Parent task ID for subtasks',
            },
            manual_memories: {
              type: 'array',
              items: { type: 'string' },
              description: 'Memory IDs to manually link',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Task tags',
            },
            auto_link: {
              type: 'boolean',
              default: true,
              description: 'Automatically find and link relevant memories',
            },
          },
          required: ['title', 'project'],
        },
      },
      {
        name: 'update_task',
        description: `Update task status and details. 

STATE MANAGEMENT GUIDELINES:
- Always mark tasks as "in_progress" when starting work on them
- Update to "done" immediately after completing a task
- Set to "blocked" when encountering obstacles or dependencies
- Use "todo" for tasks not yet started

IMPORTANT: Proactively manage task states throughout the work lifecycle. Don't wait for user prompts - update states as work progresses to maintain accurate workflow visibility.`,
        inputSchema: {
          type: 'object',
          properties: {
            task_id: {
              type: 'string',
              description: 'Task ID to update',
            },
            status: {
              type: 'string',
              enum: ['todo', 'in_progress', 'done', 'blocked'],
              description: 'New task status',
            },
            title: {
              type: 'string',
              description: 'New task title',
            },
            description: {
              type: 'string',
              description: 'New task description',
            },
            add_subtasks: {
              type: 'array',
              items: { type: 'string' },
              description: 'Task titles to add as subtasks',
            },
            add_memories: {
              type: 'array',
              items: { type: 'string' },
              description: 'Memory IDs to link',
            },
            remove_memories: {
              type: 'array',
              items: { type: 'string' },
              description: 'Memory IDs to unlink',
            },
          },
          required: ['task_id'],
        },
      },
      {
        name: 'list_tasks',
        description: 'List tasks with filtering options. Shows task status distribution and workflow health. Use this to monitor work progress and identify tasks that need status updates.',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'Filter by project',
            },
            status: {
              type: 'string',
              enum: ['todo', 'in_progress', 'done', 'blocked'],
              description: 'Filter by status',
            },
            category: {
              type: 'string',
              description: 'Filter by category',
            },
            has_memory: {
              type: 'string',
              description: 'Filter by memory connection',
            },
            include_subtasks: {
              type: 'boolean',
              default: true,
              description: 'Include subtasks in results',
            },
            limit: {
              type: 'number',
              default: 20,
              description: 'Maximum tasks to return',
            },
          },
        },
      },
      {
        name: 'get_task_context',
        description: 'Get detailed task information including status, relationships, and connected memories. Use this to understand task context and determine if status updates are needed.',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: {
              type: 'string',
              description: 'Task ID',
            },
            depth: {
              type: 'string',
              enum: ['direct', 'deep'],
              default: 'direct',
              description: 'How many levels of connections to traverse',
            },
          },
          required: ['task_id'],
        },
      },
      {
        name: 'delete_task',
        description: 'Delete a task and its subtasks',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: {
              type: 'string',
              description: 'Task ID to delete',
            },
          },
          required: ['task_id'],
        },
      },
      {
        name: 'enhance_memory_metadata',
        description: 'Generate optimized title and summary for a memory to improve dashboard card display. Uses intelligent content analysis to create concise, meaningful titles (max 60 chars) and summaries (max 150 chars).',
        inputSchema: {
          type: 'object',
          properties: {
            memory_id: {
              type: 'string',
              description: 'The ID of the memory to enhance with title and summary',
            },
            regenerate: {
              type: 'boolean',
              description: 'Force regeneration even if title/summary already exist',
            },
          },
          required: ['memory_id'],
        },
      },
      {
        name: 'batch_enhance_memories',
        description: 'Batch process multiple memories to add optimized titles and summaries. Useful for enhancing existing memories that lack proper metadata for dashboard display.',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'Filter by project name (optional)',
            },
            category: {
              type: 'string',
              description: 'Filter by category (optional)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of memories to process (default: 50)',
            },
            skip_existing: {
              type: 'boolean',
              description: 'Skip memories that already have titles/summaries (default: true)',
            },
          },
        },
      },
      {
        name: 'smart_status_update',
        description: 'AUTOMATICALLY use when user mentions status changes in natural language. Intelligently parses natural language to determine intended status changes with validation and automation.',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: {
              type: 'string',
              description: 'Task ID to update (optional - can be inferred from natural language)',
            },
            natural_language_input: {
              type: 'string',
              description: 'Natural language description of the status change (e.g., "I finished the auth module", "the API work is blocked")',
            },
            context: {
              type: 'object',
              properties: {
                force_complete: { type: 'boolean' },
                skip_validation: { type: 'boolean' },
                blocking_reason: { type: 'string' },
                completion_evidence: { type: 'string' }
              },
              description: 'Additional context for intelligent processing',
            },
            apply_automation: {
              type: 'boolean',
              description: 'Whether to apply automation suggestions (default: true)',
            },
          },
          required: ['natural_language_input'],
        },
      },
      {
        name: 'get_task_status_analytics',
        description: 'AUTOMATICALLY use when user asks about task progress, status overview, productivity metrics, or wants analytics. Provides comprehensive status insights and recommendations.',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'Filter analytics by project (optional)',
            },
            time_range: {
              type: 'string',
              enum: ['day', 'week', 'month', 'quarter'],
              description: 'Time range for analytics (default: week)',
            },
            include_trends: {
              type: 'boolean',
              description: 'Include trend analysis (default: true)',
            },
            include_recommendations: {
              type: 'boolean',
              description: 'Include actionable recommendations (default: true)',
            },
            include_project_breakdown: {
              type: 'boolean',
              description: 'Include project-by-project analysis (default: true)',
            },
          },
        },
      },
      {
        name: 'validate_task_workflow',
        description: 'Validate a proposed task status change with intelligent suggestions and workflow analysis. Use when you need to check if a status change makes sense.',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: {
              type: 'string',
              description: 'Task ID to validate',
            },
            proposed_status: {
              type: 'string',
              enum: ['todo', 'in_progress', 'done', 'blocked'],
              description: 'Proposed new status',
            },
            context: {
              type: 'object',
              properties: {
                force_complete: { type: 'boolean' },
                skip_testing: { type: 'boolean' },
                skip_review: { type: 'boolean' },
                blocking_reason: { type: 'string' }
              },
              description: 'Additional context for validation',
            },
          },
          required: ['task_id', 'proposed_status'],
        },
      },
      {
        name: 'get_automation_suggestions',
        description: 'Get intelligent automation suggestions for a task based on context analysis. Use when you want to see what automated actions are possible.',
        inputSchema: {
          type: 'object',
          properties: {
            task_id: {
              type: 'string',
              description: 'Task ID to analyze for automation opportunities',
            },
          },
          required: ['task_id'],
        },
      },
      {
        name: 'batch_enhance_memories_ollama',
        description: 'Batch process memories using local AI (Ollama) for privacy-focused title/summary generation. Processes large numbers of memories efficiently without external API calls.',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'Filter by project name (optional)',
            },
            category: {
              type: 'string',
              description: 'Filter by category (optional)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of memories to process (default: 50)',
            },
            skip_existing: {
              type: 'boolean',
              description: 'Skip memories that already have titles/summaries (default: true)',
            },
            model: {
              type: 'string',
              description: 'Ollama model to use (default: llama3.1:8b)',
            },
            batch_size: {
              type: 'number',
              description: 'Number of memories to process in parallel (default: 5)',
            },
          },
        },
      },
      {
        name: 'batch_enhance_tasks_ollama',
        description: 'Batch process tasks using local AI (Ollama) for privacy-focused title/description enhancement. Processes large numbers of tasks efficiently without external API calls.',
        inputSchema: {
          type: 'object',
          properties: {
            project: {
              type: 'string',
              description: 'Filter by project name (optional)',
            },
            category: {
              type: 'string',
              description: 'Filter by category (optional)',
            },
            status: {
              type: 'string',
              description: 'Filter by task status (optional)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of tasks to process (default: 50)',
            },
            skip_existing: {
              type: 'boolean',
              description: 'Skip tasks that already have enhanced titles/descriptions (default: true)',
            },
            model: {
              type: 'string',
              description: 'Ollama model to use (default: llama3.1:8b)',
            },
            batch_size: {
              type: 'number',
              description: 'Number of tasks to process in parallel (default: 5)',
            },
          },
        },
      },
      {
        name: 'check_ollama_status',
        description: 'Check if Ollama server is running and list available models for local AI processing.',
        inputSchema: {
          type: 'object',
          properties: {
            show_models: {
              type: 'boolean',
              description: 'Whether to list available models (default: true)',
            },
          },
        },
      },
      {
        name: 'enhance_memory_ollama',
        description: 'Enhance a single memory with local AI (Ollama) for privacy-focused title/summary generation.',
        inputSchema: {
          type: 'object',
          properties: {
            memory_id: {
              type: 'string',
              description: 'ID of the memory to enhance',
            },
            model: {
              type: 'string',
              description: 'Ollama model to use (default: llama3.1:8b)',
            },
            force_update: {
              type: 'boolean',
              description: 'Force update even if memory already has title/summary (default: false)',
            },
          },
          required: ['memory_id'],
        },
      },
      {
        name: 'deduplicate_memories',
        description: 'Find and remove duplicate memory files, keeping the newest version of each memory ID. Use this to clean up duplicate memories caused by batch operations.',
        inputSchema: {
          type: 'object',
          properties: {
            preview_only: {
              type: 'boolean',
              description: 'Preview what would be removed without actually deleting files (default: false)',
            },
          },
        },
      },
    ],
  };
});

// Enhanced tool selection logic with auto-trigger detection
function shouldAutoTrigger(toolName, userContext = '') {
  const autoTriggerKeywords = {
    'create_task': ['create', 'add', 'start', 'implement', 'build', 'make', 'work on', 'new task', 'new feature', 'new bug', 'todo', 'need to'],
    'update_task': ['update', 'modify', 'change', 'complete', 'finish', 'done', 'block', 'progress', 'status', 'mark as'],
    'smart_status_update': ['finished', 'completed', 'done with', 'blocked on', 'stuck on', 'working on', 'started', 'began', 'wrapped up', 'closed'],
    'add_memory': ['remember', 'save', 'store', 'important', 'note', 'learned', 'decision', 'context', 'keep track'],
    'search_memories': ['what did', 'how did', 'previous', 'before', 'earlier', 'last time', 'remember when', 'find', 'look for'],
    'list_tasks': ['what am I', 'current tasks', 'working on', 'todo list', 'project status', 'progress', 'overview'],
    'get_task_context': ['details about', 'more info', 'task info', 'related to', 'context for', 'tell me about', 'tell me more', 'more about'],
    'get_task_status_analytics': ['analytics', 'metrics', 'progress report', 'how am I doing', 'productivity', 'status overview', 'completion rate', 'trends'],
    'validate_task_workflow': ['is it okay to', 'can I', 'should I', 'validate', 'check if', 'makes sense to'],
    'get_automation_suggestions': ['automation', 'suggestions', 'what can be automated', 'smart suggestions', 'recommendations']
  };

  const keywords = autoTriggerKeywords[toolName] || [];
  const lowerContext = userContext.toLowerCase();
  
  return keywords.some(keyword => lowerContext.includes(keyword));
}

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'add_memory': {
        const { 
          content, 
          tags = [], 
          category, 
          project, 
          priority = 'medium',
          status = 'active',
          related_memories = [],
          language
        } = args;
        
        // Safeguard: Validate against mock data patterns
        if (!content || typeof content !== 'string' || content.trim().length === 0) {
          throw new Error('Invalid memory: Content is required and must be a non-empty string');
        }
        
        // Safeguard: Reject mock data indicators
        const mockDataPatterns = [
          /mock-\d+/i,
          /test.*data/i,
          /sample.*content/i,
          /lorem ipsum/i,
          /fake.*data/i,
          /placeholder/i
        ];
        
        const containsMockPattern = mockDataPatterns.some(pattern => 
          pattern.test(content) || 
          (typeof project === 'string' && pattern.test(project)) ||
          (Array.isArray(tags) && tags.some(tag => pattern.test(tag)))
        );
        
        if (containsMockPattern) {
          throw new Error('Invalid memory: Mock data patterns detected. Only real memories are allowed.');
        }
        
        // Safeguard: Validate real content requirements
        if (content.trim().length < 10) {
          throw new Error('Invalid memory: Content must be at least 10 characters long for real memories');
        }
        
        const memory = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          content,
          tags,
          category,
          project,
          priority,
          status,
          related_memories,
          language,
          timestamp: new Date().toISOString(),
          access_count: 0,
          last_accessed: new Date().toISOString(),
        };

        // Automatically generate title and summary if not already present
        const existingTags = memory.tags || [];
        const hasTitle = existingTags.some(tag => tag.startsWith('title:'));
        const hasSummary = existingTags.some(tag => tag.startsWith('summary:'));

        if (!hasTitle || !hasSummary) {
          // Generate title and summary using smart content analysis
          const generatedTitle = hasTitle ? null : TitleSummaryGenerator.generateTitle(memory.content, memory);
          const generatedSummary = hasSummary ? null : TitleSummaryGenerator.generateSummary(memory.content, memory);

          // Add to tags if not already present
          if (!hasTitle && generatedTitle) {
            memory.tags.push(`title:${generatedTitle}`);
          }
          if (!hasSummary && generatedSummary) {
            memory.tags.push(`summary:${generatedSummary}`);
          }
        }

        // Protect against data loss during save operation
        if (connectionProtection) connectionProtection.preventDataLoss('save_memory', memory);

        const filepath = await storage.saveMemory(memory);
        
        // Protect file integrity
        if (dataIntegrity) dataIntegrity.protectFile(filepath);
        const complexity = storage.detectComplexityLevel(memory);
        const contentType = storage.detectContentType(content);
        
        // Add to vector storage for semantic search
        try {
          await vectorStorage.addMemory(memory);
        } catch (error) {
          console.error('Failed to add memory to vector storage:', error);
        }
        
        // Process memory for task automation
        let taskAutomationResult = null;
        try {
          taskAutomationResult = await memoryTaskAutomator.processMemory(memory);
          
          if (taskAutomationResult.performed) {
            console.error(`[MCP] Memory task automation performed: ${taskAutomationResult.action} - ${taskAutomationResult.message}`);
            
            // Update memory with automation metadata
            memory.automated_task_action = {
              type: taskAutomationResult.action,
              taskId: taskAutomationResult.taskId,
              taskSerial: taskAutomationResult.taskSerial,
              confidence: taskAutomationResult.confidence,
              message: taskAutomationResult.message,
              timestamp: new Date().toISOString()
            };
            
            // Re-save memory with automation metadata
            await storage.updateMemory(memory.id, memory);
          }
        } catch (error) {
          console.error('Failed to process memory for task automation:', error);
        }
        
        // Build response text with task automation info
        let responseText = `✅ Memory stored as markdown file: ${path.basename(filepath)}\n🆔 ID: ${memory.id}\n📁 Project: ${project || 'default'}\n🎯 Complexity Level: ${complexity}\n📝 Content Type: ${contentType}\n🏷️ Priority: ${priority}\n📊 Status: ${status}`;
        
        if (taskAutomationResult && taskAutomationResult.performed) {
          responseText += `\n\n🤖 Task Automation: ${taskAutomationResult.action}`;
          if (taskAutomationResult.taskSerial) {
            responseText += `\n📋 Task: ${taskAutomationResult.taskSerial}`;
          }
          responseText += `\n💡 Message: ${taskAutomationResult.message}`;
          responseText += `\n🎯 Confidence: ${(taskAutomationResult.confidence * 100).toFixed(1)}%`;
        }
        
        responseText += `\n\nContent Preview:\n${content.substring(0, 150)}${content.length > 150 ? '...' : ''}`;
        
        return {
          content: [
            {
              type: 'text',
              text: responseText,
            },
          ],
        };
      }

      case 'get_memory': {
        const { id } = args;
        const memory = await storage.getMemory(id);
        
        if (!memory) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ Memory with ID ${id} not found`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `📄 Memory: ${memory.filename}\n🆔 ID: ${memory.id}\n📁 Project: ${memory.project || 'default'}\n📂 Category: ${memory.category || 'none'}\n🎯 Complexity: ${memory.complexity || 1}\n🏷️ Priority: ${memory.priority || 'medium'}\n📊 Status: ${memory.status || 'active'}\n🏷️ Tags: ${memory.tags?.join(', ') || 'none'}\n🔗 Related: ${memory.related_memories?.join(', ') || 'none'}\n👁️ Access Count: ${memory.access_count || 0}\n⏰ Created: ${new Date(memory.timestamp).toLocaleString()}\n🕐 Last Accessed: ${memory.last_accessed ? new Date(memory.last_accessed).toLocaleString() : 'Never'}\n📝 Content Type: ${memory.metadata?.content_type || 'text'}\n📏 Size: ${memory.metadata?.size || memory.content.length} characters\n🎨 Mermaid: ${memory.metadata?.mermaid_diagram ? 'Yes' : 'No'}\n\nContent:\n${memory.content}`,
            },
          ],
        };
      }

      case 'list_memories': {
        const { limit = 10, project } = args;
        const memories = await storage.listMemories(project);
        const limitedMemories = memories.slice(0, limit);

        if (limitedMemories.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: project ? `📂 No memories found in project: ${project}` : '📂 No memories stored yet',
              },
            ],
          };
        }

        const total = memories.length;
        const memoryList = limitedMemories.map(memory => {
          const preview = memory.content.length > 50 ? memory.content.substring(0, 50) + '...' : memory.content;
          const complexityIcon = ['🟢', '🟡', '🟠', '🔴'][Math.min((memory.complexity || 1) - 1, 3)];
          const priorityIcon = memory.priority === 'high' ? '🔥' : memory.priority === 'low' ? '❄️' : '📝';
          return `🆔 ${memory.id} | ${complexityIcon} L${memory.complexity || 1} | ${priorityIcon} ${preview} | ⏰ ${new Date(memory.timestamp).toLocaleDateString()} | 📁 ${memory.project || 'default'}`;
        }).join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `📚 Total memories: ${total}${project ? ` in project: ${project}` : ''}\n🎯 Complexity Legend: 🟢 L1 (Simple) | 🟡 L2 (Enhanced) | 🟠 L3 (Project) | 🔴 L4 (Advanced)\n🏷️ Priority: 🔥 High | 📝 Medium | ❄️ Low\n\n📋 ${limitedMemories.length > 0 ? `Showing ${limitedMemories.length}:` : 'Recent memories:'}\n${memoryList}`,
            },
          ],
        };
      }

      case 'delete_memory': {
        const { id } = args;
        const success = await storage.deleteMemory(id);
        
        if (!success) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ Memory with ID ${id} not found`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `✅ Memory ${id} deleted successfully`,
            },
          ],
        };
      }

      case 'search_memories': {
        const { query, project } = args;
        const results = await storage.searchMemories(query, project);

        if (results.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `🔍 No memories found matching "${query}"${project ? ` in project: ${project}` : ''}`,
              },
            ],
          };
        }

        const resultList = results.map(memory => {
          const preview = memory.content.length > 80 ? memory.content.substring(0, 80) + '...' : memory.content;
          return `🆔 ${memory.id} | 📝 ${preview} | 🏷️ ${memory.tags?.join(', ') || 'no tags'} | 📁 ${memory.project || 'default'}`;
        }).join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `🔍 Found ${results.length} memories matching "${query}"${project ? ` in project: ${project}` : ''}:\n\n${resultList}`,
            },
          ],
        };
      }

      case 'test_tool': {
        const { message } = args;
        return {
          content: [
            {
              type: 'text',
              text: `✅ MCP Test successful! Message: ${message}`,
            },
          ],
        };
      }

      case 'generate_dropoff': {
        const {
          session_summary = 'Session work completed',
          include_recent_memories = true,
          include_git_status = true,
          recent_memory_count = 5,
          output_format = 'markdown',
          output_path = null
        } = args;

        try {
          const dropoffContent = await dropoffGenerator.generateDropoff({
            sessionSummary: session_summary,
            includeRecentMemories: include_recent_memories,
            includeGitStatus: include_git_status,
            recentMemoryCount: recent_memory_count,
            outputFormat: output_format
          });

          // Save the dropoff to a file with auto-detection + parameter override
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `SESSION-DROPOFF-${timestamp}.md`;
          const outputDir = getDropoffOutputPath(output_path);
          const filepath = path.join(outputDir, filename);
          
          if (output_format === 'markdown') {
            fs.writeFileSync(filepath, dropoffContent, 'utf8');
          }

          return {
            content: [
              {
                type: 'text',
                text: output_format === 'markdown' 
                  ? `🚀 Session dropoff generated successfully!\n\n📄 File: ${filename}\n📍 Location: ${filepath}\n\n📋 **Content Preview:**\n\n${dropoffContent.substring(0, 500)}${dropoffContent.length > 500 ? '...' : ''}\n\n✅ Copy the content above or use the file for your next session!`
                  : `🚀 Session dropoff generated (JSON format):\n\n${dropoffContent}`
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ Failed to generate dropoff: ${error.message}`,
              },
            ],
            isError: true,
          };
        }
      }

      case 'create_task': {
        const {
          title,
          description,
          project,
          category,
          priority = 'medium',
          parent_task,
          manual_memories = [],
          tags = [],
          auto_link = true
        } = args;

        // Create the task
        const task = {
          title,
          description,
          project,
          category,
          priority,
          parent_task,
          tags,
          manual_memories
        };

        // Protect against data loss during task save operation
        if (connectionProtection) connectionProtection.preventDataLoss('save_task', task);

        // Save the task
        const savedTask = await taskStorage.saveTask(task);
        
        // Protect task file integrity
        const taskFilePath = path.join('tasks', savedTask.project || 'default', 'active', `${savedTask.id}.md`);
        if (dataIntegrity) dataIntegrity.protectFile(taskFilePath);

        // Add to vector storage for semantic search
        try {
          await vectorStorage.addTask(savedTask);
        } catch (error) {
          console.error('Failed to add task to vector storage:', error);
        }

        // Auto-link memories if enabled
        if (auto_link) {
          const autoLinkedMemories = await taskMemoryLinker.autoLinkMemories(savedTask);
          savedTask.memory_connections = autoLinkedMemories;
          
          // Update memories with task connections (bidirectional)
          for (const memConn of autoLinkedMemories) {
            await taskMemoryLinker.updateMemoryWithTaskConnection(memConn.memory_id, {
              task_id: savedTask.id,
              task_serial: savedTask.serial,
              connection_type: memConn.connection_type,
              created: new Date().toISOString()
            });
          }
          
          // Save task again with memory connections
          await taskStorage.saveTask(savedTask);
        }

        // Add manual memory connections
        for (const memoryId of manual_memories) {
          await taskMemoryLinker.updateMemoryWithTaskConnection(memoryId, {
            task_id: savedTask.id,
            task_serial: savedTask.serial,
            connection_type: 'manual',
            created: new Date().toISOString()
          });
        }

        // Update parent task if this is a subtask
        if (parent_task) {
          const parent = await taskStorage.getTask(parent_task);
          if (parent) {
            parent.subtasks = parent.subtasks || [];
            parent.subtasks.push(savedTask.id);
            await taskStorage.saveTask(parent);
          }
        }

        const memoryCount = savedTask.memory_connections ? savedTask.memory_connections.length : 0;
        const manualCount = manual_memories.length;

        return {
          content: [
            {
              type: 'text',
              text: `✅ Task created successfully!\n\n🆔 ID: ${savedTask.id}\n📌 Serial: ${savedTask.serial}\n📋 Title: ${savedTask.title}\n📁 Project: ${savedTask.project}\n🎯 Priority: ${savedTask.priority}\n🏷️ Category: ${savedTask.category || 'general'}\n📊 Status: ${savedTask.status}\n🏷️ Tags: ${savedTask.tags.join(', ') || 'none'}\n\n🧠 Memory Connections:\n- Auto-linked: ${memoryCount} memories\n- Manual: ${manualCount} memories\n${savedTask.parent_task ? `\n👆 Parent Task: ${savedTask.parent_task}` : ''}\n\n💡 Remember: When you start working on this task, update its status to "in_progress" using the update_task tool. This helps track your workflow and productivity!`,
            },
          ],
        };
      }

      case 'update_task': {
        const {
          task_id,
          status,
          title,
          description,
          add_subtasks = [],
          add_memories = [],
          remove_memories = []
        } = args;

        const task = await taskStorage.getTask(task_id);
        if (!task) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ Task with ID ${task_id} not found`,
              },
            ],
          };
        }

        // Prepare updates
        const updates = {};
        if (status) updates.status = status;
        if (title) updates.title = title;
        if (description) updates.description = description;

        // Update the task
        const updatedTask = await taskStorage.updateTask(task_id, updates);

        // Handle subtask creation
        for (const subtaskTitle of add_subtasks) {
          const subtask = await taskStorage.saveTask({
            title: subtaskTitle,
            project: updatedTask.project,
            category: updatedTask.category,
            parent_task: updatedTask.id,
            tags: updatedTask.tags
          });

          updatedTask.subtasks = updatedTask.subtasks || [];
          updatedTask.subtasks.push(subtask.id);
        }

        // Add memory connections
        for (const memoryId of add_memories) {
          const memory = await storage.getMemory(memoryId);
          if (memory) {
            updatedTask.memory_connections = updatedTask.memory_connections || [];
            updatedTask.memory_connections.push({
              memory_id: memoryId,
              memory_serial: memory.serial || `MEM-${memoryId.substring(0, 6)}`,
              connection_type: 'manual',
              relevance: 1.0
            });

            await taskMemoryLinker.updateMemoryWithTaskConnection(memoryId, {
              task_id: updatedTask.id,
              task_serial: updatedTask.serial,
              connection_type: 'manual',
              created: new Date().toISOString()
            });
          }
        }

        // Remove memory connections
        if (remove_memories.length > 0) {
          updatedTask.memory_connections = (updatedTask.memory_connections || [])
            .filter(conn => !remove_memories.includes(conn.memory_id));
        }

        // Save final updates
        await taskStorage.saveTask(updatedTask);

        // Create completion memory if task is done
        if (status === 'done' && task.status !== 'done') {
          await taskMemoryLinker.createTaskCompletionMemory(updatedTask);
        }

        return {
          content: [
            {
              type: 'text',
              text: `✅ Task updated successfully!\n\n🆔 ID: ${updatedTask.id}\n📌 Serial: ${updatedTask.serial}\n📋 Title: ${updatedTask.title}\n📊 Status: ${updatedTask.status}${status === 'done' ? ' ✓' : ''}\n🧠 Memory Connections: ${(updatedTask.memory_connections || []).length}\n📝 Subtasks: ${(updatedTask.subtasks || []).length}\n\n${status === 'done' ? '📄 Completion memory created for future reference.\n\n🎉 Great job completing this task!' : ''}${status === 'in_progress' ? '\n💪 Task marked as in progress. Focus on completing it before starting new work!' : ''}${status === 'blocked' ? '\n🚧 Task marked as blocked. Remember to update the status when the blocker is resolved.' : ''}${status === 'todo' ? '\n📌 Task moved back to todo. Update to "in_progress" when you resume work on it.' : ''}`,
            },
          ],
        };
      }

      case 'list_tasks': {
        const filters = args;
        const tasks = await taskStorage.listTasks(filters);

        if (tasks.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `📋 No tasks found${filters.project ? ` in project: ${filters.project}` : ''}${filters.status ? ` with status: ${filters.status}` : ''}`,
              },
            ],
          };
        }

        // Calculate status distribution
        const statusCounts = {
          todo: 0,
          in_progress: 0,
          done: 0,
          blocked: 0
        };
        
        tasks.forEach(task => {
          if (statusCounts.hasOwnProperty(task.status)) {
            statusCounts[task.status]++;
          }
        });

        const taskList = tasks.map(task => {
          const memoryCount = (task.memory_connections || []).length;
          const subtaskCount = (task.subtasks || []).length;
          const statusIcon = {
            'todo': '⏳',
            'in_progress': '🔄',
            'done': '✅',
            'blocked': '🚫'
          }[task.status] || '❓';

          return `${statusIcon} ${task.serial} | ${task.title.substring(0, 50)}${task.title.length > 50 ? '...' : ''} | 📁 ${task.project} | 🧠 ${memoryCount} | 📝 ${subtaskCount}${task.parent_task ? ' (subtask)' : ''}`;
        }).join('\n');

        // Build workflow health section
        let workflowHealth = '\n\n📊 Workflow Health:\n';
        workflowHealth += `- Todo: ${statusCounts.todo} tasks\n`;
        workflowHealth += `- In Progress: ${statusCounts.in_progress} tasks${statusCounts.in_progress > 5 ? ' ⚠️ (Consider completing some before starting new ones)' : ''}\n`;
        workflowHealth += `- Done: ${statusCounts.done} tasks\n`;
        workflowHealth += `- Blocked: ${statusCounts.blocked} tasks${statusCounts.blocked > 3 ? ' ⚠️ (Review and resolve blockers)' : ''}\n`;

        // Add coaching messages
        let coaching = '\n💡 Workflow Tips:\n';
        if (statusCounts.todo > 0 && statusCounts.in_progress === 0) {
          coaching += '- You have tasks waiting to start. Consider marking one as "in_progress" when you begin working on it.\n';
        }
        if (statusCounts.in_progress > statusCounts.done && tasks.length > 5) {
          coaching += '- Focus on completing in-progress tasks before starting new ones.\n';
        }
        if (statusCounts.blocked > 0) {
          coaching += '- Review blocked tasks and update their status when obstacles are resolved.\n';
        }
        coaching += '- Remember to update task states as work progresses!';

        return {
          content: [
            {
              type: 'text',
              text: `📋 Tasks (${tasks.length} found):\n\n${taskList}\n\n📊 Legend: Status | Serial | Title | Project | Memory Links | Subtasks${workflowHealth}${coaching}`,
            },
          ],
        };
      }

      case 'get_task_context': {
        const { task_id, depth = 'direct' } = args;
        const context = await taskMemoryLinker.getTaskContext(task_id, depth);

        if (!context) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ Task with ID ${task_id} not found`,
              },
            ],
          };
        }

        let output = `📋 Task Context: ${context.task.title}\n\n`;
        output += `🆔 ID: ${context.task.id}\n`;
        output += `📌 Serial: ${context.task.serial}\n`;
        output += `📊 Status: ${context.task.status}\n`;
        output += `📁 Project: ${context.task.project}\n\n`;

        if (context.direct_memories.length > 0) {
          output += `🧠 Connected Memories (${context.direct_memories.length}):\n`;
          context.direct_memories.forEach(mem => {
            output += `- ${mem.id} (${mem.connection.connection_type}, relevance: ${(mem.connection.relevance * 100).toFixed(0)}%)\n`;
            output += `  ${mem.content.substring(0, 100)}${mem.content.length > 100 ? '...' : ''}\n`;
          });
        }

        if (depth === 'deep') {
          if (context.related_tasks.length > 0) {
            output += `\n🔗 Related Tasks (${context.related_tasks.length}):\n`;
            context.related_tasks.forEach(task => {
              output += `- ${task.serial}: ${task.title} (${task.status})\n`;
            });
          }

          if (context.related_memories.length > 0) {
            output += `\n📚 Related Memories (${context.related_memories.length}):\n`;
            context.related_memories.forEach(mem => {
              output += `- ${mem.id}: ${mem.content.substring(0, 80)}...\n`;
            });
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: output,
            },
          ],
        };
      }

      case 'delete_task': {
        const { task_id } = args;
        const task = await taskStorage.getTask(task_id);
        
        if (!task) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ Task with ID ${task_id} not found`,
              },
            ],
          };
        }

        const subtaskCount = (task.subtasks || []).length;
        const success = await taskStorage.deleteTask(task_id);

        if (success) {
          return {
            content: [
              {
                type: 'text',
                text: `✅ Task deleted successfully!\n\n🗑️ Deleted: ${task.title}\n📌 Serial: ${task.serial}\n${subtaskCount > 0 ? `📝 Also deleted ${subtaskCount} subtasks\n` : ''}`,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: 'text',
                text: `❌ Failed to delete task ${task_id}`,
              },
            ],
          };
        }
      }

      case 'enhance_memory_metadata': {
        const { memory_id, regenerate = false } = args;
        
        try {
          // Load the memory
          const memories = await storage.listMemories();
          const memory = memories.find(m => m.id === memory_id);
          
          if (!memory) {
            return {
              content: [
                {
                  type: 'text',
                  text: `❌ Memory with ID ${memory_id} not found`,
                },
              ],
            };
          }

          // Check if title/summary already exist
          const existingTags = memory.tags || [];
          const hasTitle = existingTags.some(tag => tag.startsWith('title:'));
          const hasSummary = existingTags.some(tag => tag.startsWith('summary:'));

          if (hasTitle && hasSummary && !regenerate) {
            const title = existingTags.find(tag => tag.startsWith('title:')).substring(6);
            const summary = existingTags.find(tag => tag.startsWith('summary:')).substring(8);
            
            return {
              content: [
                {
                  type: 'text',
                  text: `ℹ️ Memory already has title and summary:\n\n📌 Title: ${title}\n📝 Summary: ${summary}\n\nUse regenerate=true to force new generation.`,
                },
              ],
            };
          }

          // Generate title and summary using the smart generator
          const title = TitleSummaryGenerator.generateTitle(memory.content, memory);
          const summary = TitleSummaryGenerator.generateSummary(memory.content, memory);

          // Remove old title/summary tags if regenerating
          const cleanedTags = existingTags.filter(tag => 
            !tag.startsWith('title:') && !tag.startsWith('summary:')
          );

          // Add new title/summary tags
          const newTags = [
            ...cleanedTags,
            `title:${title}`,
            `summary:${summary}`
          ];

          // Update the memory
          memory.tags = newTags;
          memory.last_accessed = new Date().toISOString();
          memory.access_count = (memory.access_count || 0) + 1;

          // Save the updated memory
          await storage.saveMemory(memory);

          return {
            content: [
              {
                type: 'text',
                text: `✅ Memory enhanced successfully!\n\n📌 Title: ${title}\n📝 Summary: ${summary}\n\n🔧 Memory ID: ${memory_id}\n📂 Project: ${memory.project || 'default'}\n🏷️ Category: ${memory.category || 'uncategorized'}`,
              },
            ],
          };
        } catch (error) {
          console.error('Error enhancing memory metadata:', error);
          return {
            content: [
              {
                type: 'text',
                text: `❌ Failed to enhance memory: ${error.message}`,
              },
            ],
          };
        }
      }

      case 'batch_enhance_memories': {
        const { 
          project, 
          category, 
          limit = 50, 
          skip_existing = true 
        } = args;

        try {
          // Load all memories
          let memories = await storage.listMemories();
          
          // Apply filters
          if (project) {
            memories = memories.filter(m => m.project === project);
          }
          if (category) {
            memories = memories.filter(m => m.category === category);
          }

          // Find memories that need enhancement
          const memoriesToEnhance = [];
          for (const memory of memories) {
            const tags = memory.tags || [];
            const hasTitle = tags.some(tag => tag.startsWith('title:'));
            const hasSummary = tags.some(tag => tag.startsWith('summary:'));

            if (skip_existing && hasTitle && hasSummary) {
              continue; // Skip if already has both
            }

            if (!hasTitle || !hasSummary) {
              memoriesToEnhance.push(memory);
            }

            if (memoriesToEnhance.length >= limit) {
              break;
            }
          }

          if (memoriesToEnhance.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: `ℹ️ No memories found that need enhancement.\n\nAll memories already have titles and summaries.`,
                },
              ],
            };
          }

          // Process memories
          let enhanced = 0;
          let failed = 0;
          const results = [];

          for (const memory of memoriesToEnhance) {
            try {
              const existingTags = memory.tags || [];
              const hasTitle = existingTags.some(tag => tag.startsWith('title:'));
              const hasSummary = existingTags.some(tag => tag.startsWith('summary:'));

              // Generate missing metadata
              const title = hasTitle ? null : TitleSummaryGenerator.generateTitle(memory.content, memory);
              const summary = hasSummary ? null : TitleSummaryGenerator.generateSummary(memory.content, memory);

              // Remove old tags if regenerating
              const cleanedTags = existingTags.filter(tag => 
                !tag.startsWith('title:') && !tag.startsWith('summary:')
              );

              // Add new tags
              const newTags = [...cleanedTags];
              if (title) newTags.push(`title:${title}`);
              if (summary) newTags.push(`summary:${summary}`);

              // Update memory
              memory.tags = newTags;
              memory.last_accessed = new Date().toISOString();
              memory.access_count = (memory.access_count || 0) + 1;

              // Save
              await storage.saveMemory(memory);
              enhanced++;
              
              results.push({
                id: memory.id,
                title: title || existingTags.find(tag => tag.startsWith('title:'))?.substring(6),
                summary: summary || existingTags.find(tag => tag.startsWith('summary:'))?.substring(8),
              });
            } catch (error) {
              console.error(`Failed to enhance memory ${memory.id}:`, error);
              failed++;
            }
          }

          // Format results
          let resultText = `✅ Batch enhancement complete!\n\n`;
          resultText += `📊 Statistics:\n`;
          resultText += `• Total processed: ${memoriesToEnhance.length}\n`;
          resultText += `• Successfully enhanced: ${enhanced}\n`;
          if (failed > 0) {
            resultText += `• Failed: ${failed}\n`;
          }
          
          if (results.length > 0 && results.length <= 5) {
            resultText += `\n📝 Enhanced Memories:\n`;
            for (const result of results) {
              resultText += `\n🔧 ID: ${result.id}\n`;
              resultText += `📌 Title: ${result.title}\n`;
              resultText += `📝 Summary: ${result.summary}\n`;
            }
          } else if (results.length > 5) {
            resultText += `\n📝 Sample of Enhanced Memories (showing first 5):\n`;
            for (const result of results.slice(0, 5)) {
              resultText += `\n🔧 ID: ${result.id}\n`;
              resultText += `📌 Title: ${result.title}\n`;
            }
          }

          return {
            content: [
              {
                type: 'text',
                text: resultText,
              },
            ],
          };
        } catch (error) {
          console.error('Error in batch enhancement:', error);
          return {
            content: [
              {
                type: 'text',
                text: `❌ Failed to batch enhance memories: ${error.message}`,
              },
            ],
          };
        }
      }

      case 'batch_enhance_memories_ollama': {
        const { 
          project, 
          category, 
          limit = 50, 
          skip_existing = true,
          model = 'llama3.1:8b',
          batch_size = 5
        } = args;

        try {
          // Initialize Ollama client
          if (process.env.DEBUG_MCP) console.error('🤖 Initializing Ollama client...');
          const ollama = new OllamaClient('http://localhost:11434', { model, batchSize: batch_size });
          
          // Check if Ollama is available
          const available = await ollama.isAvailable();
          if (!available) {
            return {
              content: [
                {
                  type: 'text',
                  text: `❌ Ollama server not available!\n\nPlease ensure Ollama is running:\n1. Install Ollama: https://ollama.ai\n2. Start server: ollama serve\n3. Pull model: ollama pull ${model}\n\nFalling back to rule-based enhancement...`,
                },
              ],
            };
          }

          // Load all memories
          let memories = await storage.listMemories();
          
          // Apply filters
          if (project) {
            memories = memories.filter(m => m.project === project);
          }
          if (category) {
            memories = memories.filter(m => m.category === category);
          }

          // Find memories that need enhancement
          const memoriesToEnhance = [];
          for (const memory of memories) {
            const tags = memory.tags || [];
            const hasTitle = tags.some(tag => tag.startsWith('title:'));
            const hasSummary = tags.some(tag => tag.startsWith('summary:'));

            if (skip_existing && hasTitle && hasSummary) {
              continue; // Skip if already has both
            }

            if (!hasTitle || !hasSummary) {
              memoriesToEnhance.push(memory);
            }

            if (memoriesToEnhance.length >= limit) {
              break;
            }
          }

          if (memoriesToEnhance.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: `ℹ️ No memories found that need enhancement.\n\nAll memories already have titles and summaries.`,
                },
              ],
            };
          }

          // Estimate processing time
          const estimate = OllamaClient.estimateProcessingTime(memoriesToEnhance.length, model);
          if (process.env.DEBUG_MCP) console.error(`🤖 Processing ${memoriesToEnhance.length} memories with ${model}`);
          if (process.env.DEBUG_MCP) console.error(`⏱️ Estimated time: ${estimate.estimate}`);

          // Return initial progress message immediately
          // Note: This is a simplified response for now - full streaming would require protocol changes
          
          // Process memories with Ollama
          let enhanced = 0;
          let failed = 0;
          const results = [];

          const batchResults = await ollama.enhanceMemoriesBatch(
            memoriesToEnhance,
            (current, total) => {
              if (process.env.DEBUG_MCP) console.error(`🔄 Progress: ${current}/${total} memories processed`);
            }
          );

          for (const result of batchResults) {
            try {
              if (result.success) {
                const memory = result.memory;
                const enhancement = result.enhancement;
                
                // Update memory with AI-generated title/summary
                const existingTags = memory.tags || [];
                const cleanedTags = existingTags.filter(tag => 
                  !tag.startsWith('title:') && !tag.startsWith('summary:')
                );

                const newTags = [
                  ...cleanedTags,
                  `title:${enhancement.title}`,
                  `summary:${enhancement.summary}`
                ];

                memory.tags = newTags;
                memory.last_accessed = new Date().toISOString();
                memory.access_count = (memory.access_count || 0) + 1;

                await storage.saveMemory(memory);
                enhanced++;
                
                results.push({
                  id: memory.id,
                  title: enhancement.title,
                  summary: enhancement.summary,
                });
              } else {
                console.error(`Failed to enhance memory ${result.memory.id}:`, result.error);
                failed++;
              }
            } catch (error) {
              console.error(`Error processing memory ${result.memory.id}:`, error);
              failed++;
            }
          }

          // Format results
          let resultText = `✅ Ollama batch enhancement complete!\n\n`;
          resultText += `🤖 Model: ${model}\n`;
          resultText += `📊 Statistics:\n`;
          resultText += `• Total processed: ${memoriesToEnhance.length}\n`;
          resultText += `• Successfully enhanced: ${enhanced}\n`;
          if (failed > 0) {
            resultText += `• Failed: ${failed}\n`;
          }
          resultText += `⏱️ Processing time: ${estimate.estimate}\n`;
          
          if (results.length > 0 && results.length <= 5) {
            resultText += `\n📝 Enhanced Memories:\n`;
            for (const result of results) {
              resultText += `\n🔧 ID: ${result.id}\n`;
              resultText += `📌 Title: ${result.title}\n`;
              resultText += `📝 Summary: ${result.summary}\n`;
            }
          } else if (results.length > 5) {
            resultText += `\n📝 Sample of Enhanced Memories (showing first 5):\n`;
            for (const result of results.slice(0, 5)) {
              resultText += `\n🔧 ID: ${result.id}\n`;
              resultText += `📌 Title: ${result.title}\n`;
            }
          }

          return {
            content: [
              {
                type: 'text',
                text: resultText,
              },
            ],
          };
        } catch (error) {
          console.error('Error in Ollama batch enhancement:', error);
          return {
            content: [
              {
                type: 'text',
                text: `❌ Failed to batch enhance memories with Ollama: ${error.message}\n\nPlease ensure:\n1. Ollama is running (ollama serve)\n2. Model is installed (ollama pull ${model})\n3. Sufficient system resources available`,
              },
            ],
          };
        }
      }

      case 'batch_enhance_tasks_ollama': {
        const { 
          project, 
          category, 
          status,
          limit = 50, 
          skip_existing = true,
          model = 'llama3.1:8b',
          batch_size = 5
        } = args;

        try {
          // Initialize Ollama client
          if (process.env.DEBUG_MCP) console.error('🤖 Initializing Ollama client for tasks...');
          const ollama = new OllamaClient('http://localhost:11434', { model, batchSize: batch_size });
          
          // Check if Ollama is available
          const available = await ollama.isAvailable();
          if (!available) {
            return {
              content: [
                {
                  type: 'text',
                  text: `❌ Ollama server not available!\n\nPlease ensure Ollama is running:\n1. Install Ollama: https://ollama.ai\n2. Start server: ollama serve\n3. Pull model: ollama pull ${model}`,
                },
              ],
            };
          }

          // Load all tasks
          let tasks = await taskStorage.getAllTasks();
          
          // Apply filters
          if (project) {
            tasks = tasks.filter(t => t.project === project);
          }
          if (category) {
            tasks = tasks.filter(t => t.category === category);
          }
          if (status) {
            tasks = tasks.filter(t => t.status === status);
          }

          // Find tasks that need enhancement
          const tasksToEnhance = [];
          for (const task of tasks) {
            const needsEnhancement = skip_existing ? 
              (!task.title || task.title.trim() === '' || !task.description || task.description.trim() === '') :
              true;

            if (needsEnhancement) {
              tasksToEnhance.push(task);
            }

            if (tasksToEnhance.length >= limit) {
              break;
            }
          }

          if (tasksToEnhance.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: `ℹ️ No tasks found that need enhancement.\n\nAll tasks already have proper titles and descriptions.`,
                },
              ],
            };
          }

          // Prepare tasks for Ollama processing (convert to memory-like format)
          const taskMemories = tasksToEnhance.map(task => ({
            id: task.id,
            content: `Task: ${task.title || 'Untitled Task'}\n\nDescription: ${task.description || 'No description provided'}${task.subtasks && task.subtasks.length > 0 ? `\n\nSubtasks:\n${task.subtasks.map(st => `- ${st.title || st.description}`).join('\n')}` : ''}`,
            category: task.category || 'work',
            project: task.project
          }));

          // Estimate processing time
          const estimate = OllamaClient.estimateProcessingTime(tasksToEnhance.length, model);
          if (process.env.DEBUG_MCP) console.error(`🤖 Processing ${tasksToEnhance.length} tasks with ${model}`);
          if (process.env.DEBUG_MCP) console.error(`⏱️ Estimated time: ${estimate.estimate}`);

          // Process tasks with Ollama
          let enhanced = 0;
          let failed = 0;
          const results = [];

          const batchResults = await ollama.enhanceMemoriesBatch(
            taskMemories,
            (current, total) => {
              if (process.env.DEBUG_MCP) console.error(`🔄 Progress: ${current}/${total} tasks processed`);
            }
          );

          for (const result of batchResults) {
            try {
              if (result.success) {
                const originalTask = tasksToEnhance.find(t => t.id === result.memory.id);
                const enhancement = result.enhancement;
                
                if (originalTask) {
                  // Update task with AI-generated title/description
                  const updatedTask = {
                    ...originalTask,
                    title: enhancement.title,
                    description: enhancement.summary,
                    metadata: {
                      ...originalTask.metadata,
                      enhanced_by: 'ollama',
                      enhanced_model: model,
                      enhanced_at: new Date().toISOString()
                    }
                  };

                  await taskStorage.updateTask(originalTask.id, updatedTask);
                  enhanced++;
                  
                  results.push({
                    id: originalTask.id,
                    title: enhancement.title,
                    description: enhancement.summary
                  });
                }
              } else {
                failed++;
                if (process.env.DEBUG_MCP) console.error(`❌ Failed to enhance task ${result.memory.id}: ${result.error}`);
              }
            } catch (updateError) {
              failed++;
              console.error(`❌ Failed to save enhanced task:`, updateError);
            }
          }

          let resultText = `✅ Ollama task enhancement complete!\n\n🤖 Model: ${model}\n`;
          resultText += `📊 Statistics:\n`;
          resultText += `• Total processed: ${tasksToEnhance.length}\n`;
          resultText += `• Successfully enhanced: ${enhanced}\n`;
          if (failed > 0) {
            resultText += `• Failed: ${failed}\n`;
          }
          resultText += `⏱️ Processing time: ${estimate.estimate}\n`;
          
          if (results.length > 0 && results.length <= 5) {
            resultText += `\n📝 Enhanced Tasks:\n`;
            for (const result of results) {
              resultText += `\n📋 ID: ${result.id}\n`;
              resultText += `📌 Title: ${result.title}\n`;
              resultText += `📝 Description: ${result.description}\n`;
            }
          } else if (results.length > 5) {
            resultText += `\n📝 Sample of Enhanced Tasks (showing first 5):\n`;
            for (const result of results.slice(0, 5)) {
              resultText += `\n📋 ID: ${result.id}\n`;
              resultText += `📌 Title: ${result.title}\n`;
            }
          }

          return {
            content: [
              {
                type: 'text',
                text: resultText,
              },
            ],
          };
        } catch (error) {
          console.error('Error in Ollama task enhancement:', error);
          return {
            content: [
              {
                type: 'text',
                text: `❌ Failed to batch enhance tasks with Ollama: ${error.message}\n\nPlease ensure:\n1. Ollama is running (ollama serve)\n2. Model is installed (ollama pull ${model})\n3. Sufficient system resources available`,
              },
            ],
          };
        }
      }

      case 'check_ollama_status': {
        const { show_models = true } = args;

        try {
          const ollama = new OllamaClient();
          const available = await ollama.isAvailable();
          
          if (!available) {
            return {
              content: [
                {
                  type: 'text',
                  text: `❌ Ollama server not available!\n\n🚀 To get started:\n1. Install Ollama: https://ollama.ai\n2. Start server: ollama serve\n3. Pull a model: ollama pull llama3.1:8b\n\n📖 Available models:\n${Object.entries(OllamaClient.getModelRecommendations()).map(([category, models]) => 
                    `\n${category.toUpperCase()}:\n${models.map(m => `• ${m.name} - ${m.description}`).join('\n')}`
                  ).join('\n')}`,
                },
              ],
            };
          }

          let resultText = `✅ Ollama server is running!\n\n🌐 Server: http://localhost:11434\n`;
          
          if (show_models) {
            try {
              const models = await ollama.listModels();
              if (models.length > 0) {
                resultText += `\n📦 Installed Models:\n`;
                for (const model of models) {
                  resultText += `• ${model.name} (${(model.size / 1024 / 1024 / 1024).toFixed(1)}GB)\n`;
                }
              } else {
                resultText += `\n📦 No models installed. Pull a model first:\n`;
                resultText += `ollama pull llama3.1:8b\n`;
              }
            } catch (error) {
              resultText += `\n⚠️ Could not list models: ${error.message}\n`;
            }
          }

          resultText += `\n💡 Model Recommendations:\n`;
          const recommendations = OllamaClient.getModelRecommendations();
          for (const [category, models] of Object.entries(recommendations)) {
            resultText += `\n${category.toUpperCase()}:\n`;
            for (const model of models) {
              resultText += `• ${model.name} - ${model.description}\n`;
            }
          }

          return {
            content: [
              {
                type: 'text',
                text: resultText,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ Error checking Ollama status: ${error.message}`,
              },
            ],
          };
        }
      }

      case 'enhance_memory_ollama': {
        const { memory_id, model = 'llama3.1:8b', force_update = false } = args;

        try {
          // Get the memory
          const memory = await storage.getMemory(memory_id);
          if (!memory) {
            return {
              content: [
                {
                  type: 'text',
                  text: `❌ Memory not found: ${memory_id}`,
                },
              ],
            };
          }

          // Check if already enhanced
          const tags = memory.tags || [];
          const hasTitle = tags.some(tag => tag.startsWith('title:'));
          const hasSummary = tags.some(tag => tag.startsWith('summary:'));

          if (!force_update && hasTitle && hasSummary) {
            return {
              content: [
                {
                  type: 'text',
                  text: `ℹ️ Memory already has title and summary.\n\nUse force_update=true to regenerate.\n\n📌 Current Title: ${tags.find(tag => tag.startsWith('title:'))?.substring(6) || 'None'}\n📝 Current Summary: ${tags.find(tag => tag.startsWith('summary:'))?.substring(8) || 'None'}`,
                },
              ],
            };
          }

          // Initialize Ollama
          const ollama = new OllamaClient('http://localhost:11434', { model });
          const available = await ollama.isAvailable();
          
          if (!available) {
            return {
              content: [
                {
                  type: 'text',
                  text: `❌ Ollama server not available! Please ensure Ollama is running.`,
                },
              ],
            };
          }

          // Enhance with Ollama
          if (process.env.DEBUG_MCP) console.error(`🤖 Enhancing memory ${memory_id} with ${model}`);
          const enhancement = await ollama.enhanceMemory(memory.content, memory);

          // Update memory
          const cleanedTags = tags.filter(tag => 
            !tag.startsWith('title:') && !tag.startsWith('summary:')
          );

          const newTags = [
            ...cleanedTags,
            `title:${enhancement.title}`,
            `summary:${enhancement.summary}`
          ];

          memory.tags = newTags;
          memory.last_accessed = new Date().toISOString();
          memory.access_count = (memory.access_count || 0) + 1;

          await storage.saveMemory(memory);

          return {
            content: [
              {
                type: 'text',
                text: `✅ Memory enhanced with Ollama!\n\n🤖 Model: ${model}\n🆔 Memory ID: ${memory_id}\n📌 Title: ${enhancement.title}\n📝 Summary: ${enhancement.summary}\n\n🧠 Memory updated successfully.`,
              },
            ],
          };
        } catch (error) {
          console.error('Error in Ollama enhancement:', error);
          return {
            content: [
              {
                type: 'text',
                text: `❌ Failed to enhance memory with Ollama: ${error.message}`,
              },
            ],
          };
        }
      }

      case 'deduplicate_memories': {
        const { preview_only = false } = args;

        try {
          const deduplicator = new MemoryDeduplicator(storage);
          
          if (preview_only) {
            const preview = await deduplicator.previewDeduplication();
            
            let resultText = `📊 Memory Deduplication Preview\n\n`;
            resultText += `📈 Statistics:\n`;
            resultText += `• Total memories: ${preview.totalMemories}\n`;
            resultText += `• Unique memories: ${preview.uniqueMemories}\n`;
            resultText += `• Duplicated IDs: ${preview.duplicatedIds}\n`;
            resultText += `• Duplicate files to remove: ${preview.totalDuplicateFiles}\n\n`;
            
            if (preview.duplicates.length > 0) {
              resultText += `🔍 Sample Duplicates (first 10):\n`;
              for (const dup of preview.duplicates) {
                resultText += `\n📄 Memory ID: ${dup.id} (${dup.totalFiles} files)\n`;
                resultText += `✅ Keep: ${path.basename(dup.keepFile)}\n`;
                resultText += `❌ Remove: ${dup.removeFiles.map(f => path.basename(f)).join(', ')}\n`;
              }
            }
            
            resultText += `\n💡 Run without preview_only to actually remove duplicates.`;
            
            return {
              content: [
                {
                  type: 'text',
                  text: resultText,
                },
              ],
            };
          } else {
            const results = await deduplicator.deduplicateMemories();
            
            let resultText = `✅ Memory Deduplication Complete!\n\n`;
            resultText += `📊 Statistics:\n`;
            resultText += `• Total memories processed: ${results.totalMemories}\n`;
            resultText += `• Duplicated IDs found: ${results.duplicatedIds}\n`;
            resultText += `• Duplicate files found: ${results.duplicateFiles}\n`;
            resultText += `• Files removed: ${results.filesRemoved}\n`;
            
            if (results.errors.length > 0) {
              resultText += `\n❌ Errors encountered: ${results.errors.length}\n`;
              for (const error of results.errors.slice(0, 5)) {
                resultText += `• ${error.file}: ${error.error}\n`;
              }
            }
            
            const spaceFreed = results.filesRemoved;
            resultText += `\n💾 Freed up space by removing ${spaceFreed} duplicate files.`;
            
            return {
              content: [
                {
                  type: 'text',
                  text: resultText,
                },
              ],
            };
          }
        } catch (error) {
          console.error('Error in memory deduplication:', error);
          return {
            content: [
              {
                type: 'text',
                text: `❌ Failed to deduplicate memories: ${error.message}`,
              },
            ],
          };
        }
      }

      case 'smart_status_update': {
        const {
          task_id,
          natural_language_input,
          context = {},
          apply_automation = true
        } = args;

        try {
          // Parse natural language to determine intended status change
          const nlpResult = TaskNLPProcessor.parseStatusIntent(natural_language_input, context);
          
          // If no task_id provided, try to extract from natural language
          let targetTaskId = task_id;
          if (!targetTaskId) {
            const identifiers = TaskNLPProcessor.extractTaskIdentifiers(natural_language_input);
            if (identifiers.length > 0) {
              // Try to find task by serial or ID
              const tasks = await taskStorage.listTasks();
              const identifier = identifiers[0];
              
              if (identifier.type === 'serial') {
                const taskBySerial = tasks.find(t => t.serial === identifier.value);
                if (taskBySerial) targetTaskId = taskBySerial.id;
              } else if (identifier.type === 'id') {
                targetTaskId = identifier.value;
              }
            }
          }

          if (!targetTaskId) {
            return {
              content: [
                {
                  type: 'text',
                  text: `❌ Could not determine which task to update. Please provide a task ID or reference a specific task in your message.\n\n🤖 NLP Analysis: ${nlpResult.suggested_status ? `Detected intent: ${nlpResult.suggested_status} (${Math.round(nlpResult.confidence * 100)}% confidence)` : 'No clear status intent detected'}\n\n💡 Try: "I finished task TASK-001" or provide the task_id parameter.`,
                },
              ],
            };
          }

          // Get the task
          const task = await taskStorage.getTask(targetTaskId);
          if (!task) {
            return {
              content: [
                {
                  type: 'text',
                  text: `❌ Task with ID ${targetTaskId} not found`,
                },
              ],
            };
          }

          // If NLP didn't detect a clear intent, return analysis
          if (!nlpResult.suggested_status || nlpResult.confidence < 0.4) {
            return {
              content: [
                {
                  type: 'text',
                  text: `🤖 I couldn't determine the intended status change from: "${natural_language_input}"\n\n📊 Analysis:\n- Confidence: ${Math.round(nlpResult.confidence * 100)}%\n- Reasoning: ${nlpResult.reasoning}\n\n💡 Try being more specific, like:\n- "I finished the auth module" (for done)\n- "I'm working on the API" (for in_progress)\n- "The database work is blocked" (for blocked)`,
                },
              ],
            };
          }

          // Validate the status change
          const validation = await TaskStatusValidator.validateStatusChange(
            task,
            nlpResult.suggested_status,
            { ...context, naturalLanguageInput: natural_language_input },
            taskStorage
          );

          if (!validation.valid && !context.skip_validation) {
            return {
              content: [
                {
                  type: 'text',
                  text: `⚠️ Status change validation failed:\n\n🚫 **Blocking Issues:**\n${validation.blocking_issues.map(issue => `• ${issue}`).join('\n')}\n\n${validation.warnings.length > 0 ? `⚠️ **Warnings:**\n${validation.warnings.map(w => `• ${w}`).join('\n')}\n\n` : ''}${validation.suggestions.length > 0 ? `💡 **Suggestions:**\n${validation.suggestions.map(s => `• ${s.message || s}`).join('\n')}\n\n` : ''}Use skip_validation: true to override these checks.`,
                },
              ],
            };
          }

          // Apply automation if requested
          let automationApplied = false;
          if (apply_automation) {
            const automationResult = await TaskAutomation.checkForAutomatedUpdates(targetTaskId, taskStorage, storage);
            if (automationResult && automationResult.shouldUpdate) {
              automationApplied = true;
            }
          }

          // Update the task
          const updates = {
            status: nlpResult.suggested_status,
            reason: TaskNLPProcessor.generateStatusReason(
              task.status,
              nlpResult.suggested_status,
              {
                naturalLanguageInput: natural_language_input,
                taskTitle: task.title,
                matchedPhrases: nlpResult.matched_phrase
              }
            ),
            nlp_analysis: {
              confidence: nlpResult.confidence,
              matched_phrase: nlpResult.matched_phrase,
              reasoning: nlpResult.reasoning,
              original_input: natural_language_input,
              processed_at: new Date().toISOString()
            }
          };

          const updatedTask = await taskStorage.updateTask(targetTaskId, updates);

          // Create completion memory if task is done
          if (nlpResult.suggested_status === 'done' && task.status !== 'done') {
            await taskMemoryLinker.createTaskCompletionMemory(updatedTask);
          }

          return {
            content: [
              {
                type: 'text',
                text: `✅ Smart status update successful!\n\n📋 **Task:** ${updatedTask.title}\n🆔 **ID:** ${updatedTask.serial}\n📊 **Status:** ${task.status} → ${updatedTask.status}\n\n🤖 **NLP Analysis:**\n- Confidence: ${Math.round(nlpResult.confidence * 100)}%\n- Matched phrase: "${nlpResult.matched_phrase}"\n- Reasoning: ${nlpResult.reasoning}\n\n${automationApplied ? '🤖 **Automation applied**\n' : ''}${validation.warnings.length > 0 ? `⚠️ **Validation warnings:**\n${validation.warnings.slice(0, 3).map(w => `• ${w}`).join('\n')}\n\n` : ''}${validation.workflow_analysis?.next_suggested_actions?.length > 0 ? `💡 **Next suggested actions:**\n${validation.workflow_analysis.next_suggested_actions.slice(0, 3).map(a => `• ${a}`).join('\n')}` : ''}`,
              },
            ],
          };

        } catch (error) {
          console.error('Error in smart_status_update:', error);
          return {
            content: [
              {
                type: 'text',
                text: `❌ Smart status update failed: ${error.message}`,
              },
            ],
            isError: true,
          };
        }
      }

      case 'get_task_status_analytics': {
        const {
          project,
          time_range = 'week',
          include_trends = true,
          include_recommendations = true,
          include_project_breakdown = true
        } = args;

        try {
          const analytics = await TaskAnalytics.generateStatusAnalytics(taskStorage, {
            project,
            timeRange: time_range,
            includeTrends: include_trends,
            includeRecommendations: include_recommendations,
            includeProjectBreakdown: include_project_breakdown
          });

          if (analytics.error) {
            return {
              content: [
                {
                  type: 'text',
                  text: `❌ Analytics generation failed: ${analytics.message}`,
                },
              ],
            };
          }

          let analyticsText = `📊 **Task Status Analytics**\n\n`;
          analyticsText += `🎯 **Scope:** ${analytics.scope}\n`;
          analyticsText += `⏰ **Time Range:** ${analytics.time_range}\n`;
          analyticsText += `📅 **Generated:** ${new Date(analytics.generated_at).toLocaleString()}\n\n`;

          // Overview
          const overview = analytics.overview;
          analyticsText += `## 📈 Overview\n`;
          analyticsText += `- **Total Tasks:** ${overview.total_tasks}\n`;
          analyticsText += `- **Completion Rate:** ${overview.completion_rate}%\n`;
          analyticsText += `- **Active Tasks:** ${overview.active_tasks}\n`;
          analyticsText += `- **Blocked Tasks:** ${overview.blocked_tasks}\n`;
          analyticsText += `- **Health Score:** ${overview.health_score}/100\n\n`;

          // Status breakdown
          const statusBreakdown = analytics.status_breakdown;
          analyticsText += `## 📊 Status Breakdown\n`;
          analyticsText += `- **📝 Todo:** ${statusBreakdown.todo.count} (${statusBreakdown.todo.percentage}%) - ${statusBreakdown.todo.stale_count} stale\n`;
          analyticsText += `- **🔄 In Progress:** ${statusBreakdown.in_progress.count} (${statusBreakdown.in_progress.percentage}%) - ${statusBreakdown.in_progress.long_running} long-running\n`;
          analyticsText += `- **✅ Done:** ${statusBreakdown.done.count} (${statusBreakdown.done.percentage}%) - ${statusBreakdown.done.recent_completions} recent\n`;
          analyticsText += `- **🚫 Blocked:** ${statusBreakdown.blocked.count} (${statusBreakdown.blocked.percentage}%) - ${statusBreakdown.blocked.needs_attention} need attention\n\n`;

          // Productivity metrics
          const productivity = analytics.productivity_metrics;
          analyticsText += `## ⚡ Productivity Metrics\n`;
          analyticsText += `- **Throughput:** ${productivity.throughput} tasks/day\n`;
          analyticsText += `- **Work in Progress:** ${productivity.work_in_progress} tasks\n`;
          analyticsText += `- **Blocked Percentage:** ${productivity.blocked_percentage}%\n`;
          analyticsText += `- **Focus Score:** ${productivity.focus_score}% (time on high-priority)\n\n`;

          // Recommendations
          if (analytics.recommendations && analytics.recommendations.length > 0) {
            analyticsText += `## 💡 Recommendations\n`;
            analytics.recommendations.slice(0, 5).forEach(rec => {
              const priorityIcon = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
              analyticsText += `${priorityIcon} **${rec.title}:** ${rec.description}\n`;
              analyticsText += `   *Action:* ${rec.action}\n\n`;
            });
          }

          // Workflow insights
          if (analytics.workflow_insights) {
            const insights = analytics.workflow_insights;
            if (insights.bottlenecks.length > 0) {
              analyticsText += `## 🚧 Bottlenecks\n`;
              insights.bottlenecks.forEach(bottleneck => {
                const severityIcon = bottleneck.severity === 'high' ? '🔴' : '🟡';
                analyticsText += `${severityIcon} **${bottleneck.type}:** ${bottleneck.description}\n`;
              });
              analyticsText += `\n`;
            }
          }

          // Project breakdown
          if (analytics.project_analysis && include_project_breakdown) {
            analyticsText += `## 📁 Project Analysis\n`;
            Object.entries(analytics.project_analysis).slice(0, 5).forEach(([projectName, data]) => {
              analyticsText += `**${projectName}:** ${data.total_tasks} tasks, ${data.completion_rate}% complete\n`;
            });
          }

          return {
            content: [
              {
                type: 'text',
                text: analyticsText,
              },
            ],
          };

        } catch (error) {
          console.error('Error generating analytics:', error);
          return {
            content: [
              {
                type: 'text',
                text: `❌ Failed to generate analytics: ${error.message}`,
              },
            ],
            isError: true,
          };
        }
      }

      case 'validate_task_workflow': {
        const { task_id, proposed_status, context = {} } = args;

        try {
          const task = await taskStorage.getTask(task_id);
          if (!task) {
            return {
              content: [
                {
                  type: 'text',
                  text: `❌ Task with ID ${task_id} not found`,
                },
              ],
            };
          }

          const validation = await TaskStatusValidator.validateStatusChange(
            task,
            proposed_status,
            context,
            taskStorage
          );

          const report = TaskStatusValidator.generateValidationReport(validation, task, proposed_status);

          let validationText = `🔍 **Workflow Validation Report**\n\n`;
          validationText += `📋 **Task:** ${task.title} (${task.serial})\n`;
          validationText += `🔄 **Transition:** ${report.transition}\n`;
          validationText += `✅ **Valid:** ${validation.valid ? 'Yes' : 'No'}\n`;
          validationText += `🎯 **Confidence:** ${Math.round(validation.confidence * 100)}%\n\n`;

          if (validation.blocking_issues.length > 0) {
            validationText += `🚫 **Blocking Issues (${validation.blocking_issues.length}):**\n`;
            validation.blocking_issues.forEach(issue => {
              validationText += `• ${issue}\n`;
            });
            validationText += `\n`;
          }

          if (validation.warnings.length > 0) {
            validationText += `⚠️ **Warnings (${validation.warnings.length}):**\n`;
            validation.warnings.forEach(warning => {
              validationText += `• ${warning}\n`;
            });
            validationText += `\n`;
          }

          if (validation.suggestions.length > 0) {
            validationText += `💡 **Suggestions (${validation.suggestions.length}):**\n`;
            validation.suggestions.forEach(suggestion => {
              validationText += `• ${suggestion.message || suggestion}\n`;
            });
            validationText += `\n`;
          }

          if (validation.workflow_analysis) {
            const analysis = validation.workflow_analysis;
            validationText += `📊 **Workflow Analysis:**\n`;
            validationText += `- **Stage:** ${analysis.workflow_stage}\n`;
            validationText += `- **Completion:** ${analysis.completion_percentage}%\n`;
            
            if (analysis.next_suggested_actions.length > 0) {
              validationText += `- **Next Actions:**\n`;
              analysis.next_suggested_actions.slice(0, 3).forEach(action => {
                validationText += `  • ${action}\n`;
              });
            }
          }

          return {
            content: [
              {
                type: 'text',
                text: validationText,
              },
            ],
          };

        } catch (error) {
          console.error('Error in workflow validation:', error);
          return {
            content: [
              {
                type: 'text',
                text: `❌ Workflow validation failed: ${error.message}`,
              },
            ],
            isError: true,
          };
        }
      }

      case 'get_automation_suggestions': {
        const { task_id } = args;

        try {
          const suggestions = await TaskAutomation.getAutomationSuggestions(task_id, taskStorage, storage);

          let suggestionsText = `🤖 **Automation Suggestions**\n\n`;
          suggestionsText += `📋 **Task ID:** ${task_id}\n`;
          suggestionsText += `🔍 **Has Suggestions:** ${suggestions.has_suggestions ? 'Yes' : 'No'}\n`;
          suggestionsText += `⚡ **Automation Available:** ${suggestions.automation_available ? 'Yes' : 'No'}\n\n`;

          if (suggestions.has_suggestions) {
            if (suggestions.automation_available) {
              suggestionsText += `✅ **Recommended Action:** ${suggestions.recommended_status}\n`;
              suggestionsText += `🎯 **Confidence:** ${Math.round(suggestions.confidence * 100)}%\n`;
              suggestionsText += `📝 **Reasoning:** ${suggestions.reasoning}\n\n`;
              
              if (suggestions.details && Object.keys(suggestions.details).length > 0) {
                suggestionsText += `🔧 **Details:**\n`;
                Object.entries(suggestions.details).forEach(([key, value]) => {
                  suggestionsText += `- **${key}:** ${value}\n`;
                });
                suggestionsText += `\n`;
              }
              
              suggestionsText += `💡 **To apply:** Use the update_task tool with the recommended status, or use smart_status_update with apply_automation: true`;
            } else if (suggestions.suggestion) {
              suggestionsText += `💡 **Suggestion:** ${suggestions.suggestion.message}\n`;
              suggestionsText += `🎯 **Confidence:** ${Math.round(suggestions.suggestion.confidence * 100)}%\n`;
              suggestionsText += `📝 **Recommended Action:** ${suggestions.suggestion.suggested_action}\n`;
            }
          } else {
            suggestionsText += `ℹ️ ${suggestions.message || 'No automation opportunities detected at this time.'}\n\n`;
            suggestionsText += `💡 **Try again when:**\n`;
            suggestionsText += `• Task status changes\n`;
            suggestionsText += `• Subtasks are completed\n`;
            suggestionsText += `• New memories are added\n`;
            suggestionsText += `• Dependencies are resolved`;
          }

          return {
            content: [
              {
                type: 'text',
                text: suggestionsText,
              },
            ],
          };

        } catch (error) {
          console.error('Error getting automation suggestions:', error);
          return {
            content: [
              {
                type: 'text',
                text: `❌ Failed to get automation suggestions: ${error.message}`,
              },
            ],
            isError: true,
          };
        }
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // NEVER show startup messages in MCP mode
  // Startup message disabled to prevent MCP protocol corruption
}

main().catch(error => {
  if (!isMCPMode) console.error('MCP Server error:', error);
  // Never exit in MCP mode - would break connection
});