#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
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

// AI Enhancement for automatic title and summary generation
class AIEnhancer {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  }

  sanitizeForJSON(text) {
    return text
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
      .replace(/[\uD800-\uDFFF]/g, '')
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"');
  }

  async generateTitleAndSummary(content) {
    if (this.openaiApiKey) {
      try {
        return await this.generateWithOpenAI(content);
      } catch (error) {
        console.error('OpenAI generation failed:', error.message);
      }
    }
    
    if (this.anthropicApiKey) {
      try {
        return await this.generateWithAnthropic(content);
      } catch (error) {
        console.error('Anthropic generation failed:', error.message);
      }
    }
    
    return this.generateFallback(content);
  }

  async generateWithOpenAI(content) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Generate a concise title (max 80 chars) and summary (max 150 chars) for the given content. Return JSON: {"title": "...", "summary": "..."}'
          },
          {
            role: 'user',
            content: this.sanitizeForJSON(content.substring(0, 2000))
          }
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
    return {
      title: result.title.substring(0, 100),
      summary: result.summary.substring(0, 200)
    };
  }

  async generateWithAnthropic(content) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.anthropicApiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content: `Generate a concise title (max 80 chars) and summary (max 150 chars) for this content. Return JSON: {"title": "...", "summary": "..."}\n\nContent: ${this.sanitizeForJSON(content.substring(0, 2000))}`
          }
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.content[0].text);
    return {
      title: result.title.substring(0, 100),
      summary: result.summary.substring(0, 200)
    };
  }

  generateFallback(content) {
    const lines = content.split('\n').filter(line => line.trim());
    const firstLine = lines[0] || '';
    
    let title = firstLine.substring(0, 80);
    if (title.length >= 80) {
      title = title.substring(0, 77) + '...';
    }
    
    const summary = content.replace(/\s+/g, ' ').substring(0, 150);
    
    return {
      title: title || 'Untitled Memory',
      summary: summary || 'No summary available'
    };
  }
}

// Memory Manager for markdown file operations
class MemoryManager {
  constructor() {
    this.memoriesDir = path.resolve('./memories');
    this.aiEnhancer = new AIEnhancer();
    this.ensureMemoriesDirectory();
  }

  ensureMemoriesDirectory() {
    if (!fs.existsSync(this.memoriesDir)) {
      fs.mkdirSync(this.memoriesDir, { recursive: true });
    }
    
    const defaultDir = path.join(this.memoriesDir, 'default');
    if (!fs.existsSync(defaultDir)) {
      fs.mkdirSync(defaultDir, { recursive: true });
    }
  }

  generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  async addMemory(args) {
    const {
      content,
      tags = [],
      category = 'default',
      project = 'default',
      priority = 'medium',
      status = 'active',
      related_memories = [],
      language = '',
      title: providedTitle,
      summary: providedSummary
    } = args;

    let title = providedTitle;
    let summary = providedSummary;

    if (!title || !summary) {
      try {
        const generated = await this.aiEnhancer.generateTitleAndSummary(content);
        title = title || generated.title;
        summary = summary || generated.summary;
      } catch (error) {
        console.error('AI enhancement failed:', error.message);
        title = title || 'Untitled Memory';
        summary = summary || 'No summary available';
      }
    }

    const id = this.generateId();
    const timestamp = new Date().toISOString();
    const slug = this.createSlug(title);
    
    const projectDir = path.join(this.memoriesDir, project);
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    const filename = `${timestamp.split('T')[0]}-${slug}-${id.substr(-6)}.md`;
    const filepath = path.join(projectDir, filename);

    const frontmatter = {
      id,
      title,
      summary,
      category,
      tags,
      priority,
      status,
      project,
      related_memories,
      language: language || undefined,
      created: timestamp,
      access_count: 0,
      last_accessed: null
    };

    const yamlFrontmatter = Object.entries(frontmatter)
      .filter(([_, value]) => value !== undefined && value !== '')
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `${key}: [${value.map(v => `"${v}"`).join(', ')}]`;
        }
        return `${key}: ${typeof value === 'string' ? `"${value}"` : value}`;
      })
      .join('\n');

    const fileContent = `---\n${yamlFrontmatter}\n---\n\n${content}`;

    fs.writeFileSync(filepath, fileContent, 'utf8');

    return {
      id,
      title,
      summary,
      category,
      project,
      created: timestamp,
      filepath: path.relative(process.cwd(), filepath)
    };
  }

  createSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
  }

  getMemory(id) {
    const files = this.getAllMemoryFiles();
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const match = content.match(/^---\n([\s\S]*?)\n---/);
        
        if (match) {
          const frontmatterLines = match[1].split('\n');
          const frontmatter = {};
          
          for (const line of frontmatterLines) {
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
              const key = line.substring(0, colonIndex).trim();
              let value = line.substring(colonIndex + 1).trim();
              
              if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1);
              } else if (value.startsWith('[') && value.endsWith(']')) {
                value = value.slice(1, -1).split(',').map(v => v.trim().replace(/"/g, ''));
              } else if (value === 'null') {
                value = null;
              } else if (!isNaN(value)) {
                value = Number(value);
              }
              
              frontmatter[key] = value;
            }
          }
          
          if (frontmatter.id === id) {
            frontmatter.access_count = (frontmatter.access_count || 0) + 1;
            frontmatter.last_accessed = new Date().toISOString();
            
            const bodyContent = content.replace(/^---\n[\s\S]*?\n---\n/, '');
            
            this.updateFrontmatter(file, frontmatter);
            
            return {
              ...frontmatter,
              content: bodyContent,
              filepath: path.relative(process.cwd(), file)
            };
          }
        }
      } catch (error) {
        console.error(`Error reading memory file ${file}:`, error.message);
      }
    }
    
    throw new Error(`Memory with ID ${id} not found`);
  }

  updateFrontmatter(filepath, frontmatter) {
    try {
      const content = fs.readFileSync(filepath, 'utf8');
      const bodyMatch = content.match(/^---\n[\s\S]*?\n---([\s\S]*)$/);
      const bodyContent = bodyMatch ? bodyMatch[1] : '';
      
      const yamlFrontmatter = Object.entries(frontmatter)
        .filter(([_, value]) => value !== undefined && value !== '')
        .map(([key, value]) => {
          if (Array.isArray(value)) {
            return `${key}: [${value.map(v => `"${v}"`).join(', ')}]`;
          }
          return `${key}: ${typeof value === 'string' ? `"${value}"` : value}`;
        })
        .join('\n');
      
      const newContent = `---\n${yamlFrontmatter}\n---${bodyContent}`;
      fs.writeFileSync(filepath, newContent, 'utf8');
    } catch (error) {
      console.error(`Error updating frontmatter for ${filepath}:`, error.message);
    }
  }

  getAllMemoryFiles() {
    const files = [];
    
    function scanDirectory(dir) {
      if (!fs.existsSync(dir)) return;
      
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDirectory(fullPath);
        } else if (item.endsWith('.md')) {
          files.push(fullPath);
        }
      }
    }
    
    scanDirectory(this.memoriesDir);
    return files.sort((a, b) => {
      const statA = fs.statSync(a);
      const statB = fs.statSync(b);
      return statB.mtime - statA.mtime;
    });
  }

  listMemories(limit = 50, project = null) {
    const files = this.getAllMemoryFiles();
    const memories = [];
    
    for (const file of files) {
      if (memories.length >= limit) break;
      
      try {
        const content = fs.readFileSync(file, 'utf8');
        const match = content.match(/^---\n([\s\S]*?)\n---/);
        
        if (match) {
          const frontmatterLines = match[1].split('\n');
          const frontmatter = {};
          
          for (const line of frontmatterLines) {
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
              const key = line.substring(0, colonIndex).trim();
              let value = line.substring(colonIndex + 1).trim();
              
              if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1);
              } else if (value.startsWith('[') && value.endsWith(']')) {
                value = value.slice(1, -1).split(',').map(v => v.trim().replace(/"/g, ''));
              } else if (value === 'null') {
                value = null;
              } else if (!isNaN(value)) {
                value = Number(value);
              }
              
              frontmatter[key] = value;
            }
          }
          
          if (!project || frontmatter.project === project) {
            const bodyContent = content.replace(/^---\n[\s\S]*?\n---\n/, '');
            memories.push({
              ...frontmatter,
              content_preview: bodyContent.substring(0, 200) + (bodyContent.length > 200 ? '...' : ''),
              filepath: path.relative(process.cwd(), file)
            });
          }
        }
      } catch (error) {
        console.error(`Error reading memory file ${file}:`, error.message);
      }
    }
    
    return memories;
  }

  searchMemories(query, project = null) {
    const files = this.getAllMemoryFiles();
    const results = [];
    const searchTerms = query.toLowerCase().split(' ');
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const match = content.match(/^---\n([\s\S]*?)\n---/);
        
        if (match) {
          const frontmatterLines = match[1].split('\n');
          const frontmatter = {};
          
          for (const line of frontmatterLines) {
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
              const key = line.substring(0, colonIndex).trim();
              let value = line.substring(colonIndex + 1).trim();
              
              if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1);
              } else if (value.startsWith('[') && value.endsWith(']')) {
                value = value.slice(1, -1).split(',').map(v => v.trim().replace(/"/g, ''));
              } else if (value === 'null') {
                value = null;
              } else if (!isNaN(value)) {
                value = Number(value);
              }
              
              frontmatter[key] = value;
            }
          }
          
          if (project && frontmatter.project !== project) continue;
          
          const bodyContent = content.replace(/^---\n[\s\S]*?\n---\n/, '');
          const searchableText = `${frontmatter.title || ''} ${frontmatter.summary || ''} ${bodyContent} ${(frontmatter.tags || []).join(' ')}`.toLowerCase();
          
          const matchCount = searchTerms.filter(term => searchableText.includes(term)).length;
          if (matchCount > 0) {
            results.push({
              ...frontmatter,
              content_preview: bodyContent.substring(0, 200) + (bodyContent.length > 200 ? '...' : ''),
              filepath: path.relative(process.cwd(), file),
              relevance: matchCount / searchTerms.length
            });
          }
        }
      } catch (error) {
        console.error(`Error searching memory file ${file}:`, error.message);
      }
    }
    
    return results.sort((a, b) => b.relevance - a.relevance);
  }

  deleteMemory(id) {
    const files = this.getAllMemoryFiles();
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const match = content.match(/^---\n([\s\S]*?)\n---/);
        
        if (match) {
          const frontmatterLines = match[1].split('\n');
          const frontmatter = {};
          
          for (const line of frontmatterLines) {
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
              const key = line.substring(0, colonIndex).trim();
              let value = line.substring(colonIndex + 1).trim();
              
              if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1);
              }
              
              frontmatter[key] = value;
            }
          }
          
          if (frontmatter.id === id) {
            fs.unlinkSync(file);
            return { id, filepath: path.relative(process.cwd(), file), deleted: true };
          }
        }
      } catch (error) {
        console.error(`Error deleting memory file ${file}:`, error.message);
      }
    }
    
    throw new Error(`Memory with ID ${id} not found`);
  }
}

// Create server instance
const server = new Server(
  {
    name: 'like-i-said-memory-v2',
    version: '2.2.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const memoryManager = new MemoryManager();

// Register tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'add_memory',
        description: '🧠 PRIMARY MEMORY TOOL: Store a new memory/note/information as a markdown file. IMPORTANT: Before calling this tool, generate a concise title (max 100 chars) and summary (max 200 chars) for the memory content and pass them as parameters. The tool includes automatic complexity detection and structured metadata. USE THIS for all memory creation requests.',
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
            title: {
              type: 'string',
              description: 'AI-generated title for the memory (max 100 chars). The AI client should generate this before calling add_memory.',
            },
            summary: {
              type: 'string',
              description: 'AI-generated summary of the memory content (max 200 chars). The AI client should generate this before calling add_memory.',
            },
          },
          required: ['content'],
        },
      },
      {
        name: 'get_memory',
        description: '📖 MEMORY RETRIEVAL: Retrieve a specific memory by its unique ID. Use when you need to access previously stored information.',
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
        description: '📋 MEMORY BROWSING: List and browse all stored memories or filter by project. Use to explore available memories and find information.',
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
        description: '🗑️ MEMORY DELETION: Permanently delete a memory by ID. Use with caution - this cannot be undone.',
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
        description: '🔍 MEMORY SEARCH: Search through all stored memories by content, tags, or category. Use to find specific information or memories.',
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
        description: '🔧 SYSTEM TEST: Simple test tool to verify Like-I-Said MCP server connectivity and functionality.',
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
      }
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
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

      case 'add_memory': {
        const result = await memoryManager.addMemory(args);
        return {
          content: [
            {
              type: 'text',
              text: `✅ Memory added successfully!\n\n🆔 ID: ${result.id}\n📝 Title: ${result.title}\n📁 Project: ${result.project}\n📂 Category: ${result.category}\n📄 File: ${result.filepath}`,
            },
          ],
        };
      }

      case 'get_memory': {
        const { id } = args;
        const memory = memoryManager.getMemory(id);
        return {
          content: [
            {
              type: 'text',
              text: `📄 Memory: ${path.basename(memory.filepath)}\n🆔 ID: ${memory.id}\n📁 Project: ${memory.project}\n📂 Category: ${memory.category}\n🎯 Complexity: ${memory.complexity || 'N/A'}\n🏷️ Priority: ${memory.priority}\n📊 Status: ${memory.status}\n🏷️ Tags: ${(memory.tags || []).join(', ') || 'none'}\n🔗 Related: ${(memory.related_memories || []).join(', ') || 'none'}\n👁️ Access Count: ${memory.access_count}\n⏰ Created: ${new Date(memory.created).toLocaleString()}\n🕐 Last Accessed: ${memory.last_accessed ? new Date(memory.last_accessed).toLocaleString() : 'Never'}\n📝 Content Type: ${memory.language || 'text'}\n📏 Size: ${memory.content.length} characters\n🎨 Mermaid: ${memory.content.includes('```mermaid') ? 'Yes' : 'No'}\n\nContent:\n${memory.content}`,
            },
          ],
        };
      }

      case 'list_memories': {
        const { limit = 10, project } = args;
        const memories = memoryManager.listMemories(limit, project);
        
        if (memories.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: project ? `📂 No memories found in project "${project}"` : '📂 No memories found',
              },
            ],
          };
        }

        const memoryList = memories.map(memory => 
          `🆔 ${memory.id} | 📝 ${memory.title || 'Untitled'} | 🏷️ ${(memory.tags || []).join(', ') || 'no tags'} | 📁 ${memory.project}`
        ).join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `📋 Found ${memories.length} memories${project ? ` in project "${project}"` : ''}:\n\n${memoryList}`,
            },
          ],
        };
      }

      case 'search_memories': {
        const { query, project } = args;
        const results = memoryManager.searchMemories(query, project);
        
        if (results.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `🔍 No memories found matching "${query}"${project ? ` in project "${project}"` : ''}`,
              },
            ],
          };
        }

        const resultList = results.slice(0, 10).map(memory => 
          `🆔 ${memory.id} | 📝 ${memory.title || 'Untitled'} | 🏷️ ${(memory.tags || []).join(', ') || 'no tags'} | 📁 ${memory.project}`
        ).join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `🔍 Found ${results.length} memories matching "${query}"${project ? ` in project "${project}"` : ''}:\n\n${resultList}`,
            },
          ],
        };
      }

      case 'delete_memory': {
        const { id } = args;
        const result = memoryManager.deleteMemory(id);
        return {
          content: [
            {
              type: 'text',
              text: `🗑️ Memory deleted successfully!\n\n🆔 ID: ${result.id}\n📄 File: ${result.filepath}`,
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
          text: `❌ Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server with backup system in separate process
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Like-I-Said Memory Server v2 - Markdown File Mode');
  console.error('Like I Said Memory MCP Server v2 started successfully');
  
  // Start backup system in separate detached process to avoid stdio interference
  if (process.env.NO_BACKUP !== 'true') {
    setTimeout(() => {
      try {
        console.error('🔄 Starting backup system in separate process...');
        
        const backupProcess = spawn('node', [path.join(__dirname, 'backup-system.js')], {
          detached: true,
          stdio: ['ignore', 'ignore', 'ignore'], // Completely detach stdio
          cwd: __dirname
        });
        
        // Unref the process so it doesn't keep the main process alive
        backupProcess.unref();
        
        console.error('✅ Backup system started successfully');
      } catch (error) {
        console.error('⚠️  Backup system failed to start:', error.message);
        console.error('💡 Memories will still work, but without automatic backups');
      }
    }, 2000); // 2 second delay to ensure server is fully ready
  }
}

main().catch(console.error);