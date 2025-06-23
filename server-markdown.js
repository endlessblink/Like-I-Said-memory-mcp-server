#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { Transform, Readable } from 'stream';
import JSONStream from 'JSONStream';
import { initSanitizationWatcher, sanitizeUnicode } from './memory-sanitizer.js';


// Load .env file if it exists
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, { encoding: 'utf-8', ignoreBOM: true });
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
    // More flexible frontmatter regex that handles various formats
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/;
    const match = content.match(frontmatterRegex);
    
    if (!match) {
      console.error(`[DEBUG] No frontmatter found, treating as plain content`);
      return {
        id: `generated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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

    // Ensure required fields are present
    if (!memory.id) {
      memory.id = `auto-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      console.error(`[DEBUG] Generated ID for memory without ID: ${memory.id}`);
    }
    
    if (!memory.timestamp) {
      memory.timestamp = new Date().toISOString();
    }

    return memory;
  }

  parseMarkdownFile(filepath) {
    try {
      // Enforce UTF-8 and ignore BOM
      const content = fs.readFileSync(filepath, { encoding: 'utf-8', ignoreBOM: true });
      const parsed = this.parseMarkdownContent(content);
      
      if (!parsed) {
        console.error(`[DEBUG] parseMarkdownContent returned null for ${filepath}`);
        return null;
      }

      const filename = path.basename(filepath);
      const projectName = path.basename(path.dirname(filepath));
      
      return {
        ...parsed,
        filename,
        filepath,
        project: projectName
      };
    } catch (error) {
      console.error(`Error reading markdown file ${filepath}:`, error);
      return null;
    }
  }

  async saveMemory(memory) {
    const projectDir = this.getProjectDir(memory.project);
    const filename = this.generateFilename(memory);
    const filepath = path.join(projectDir, filename);
    
    let markdownContent = this.generateMarkdownContent(memory);
    // Pre-sanitize content before writing to disk
    markdownContent = sanitizeUnicode(markdownContent);
    await fs.promises.writeFile(filepath, markdownContent, 'utf8');

    memory.filename = path.basename(filepath);
    return memory;
  }

  async getMemory(id) {
    const memories = await this.listMemories();
    return memories.find(m => m.id === id) || null;
  }

  async listMemories(project) {
    const memories = [];
    let parseFailures = 0;
    let totalFiles = 0;
    
    console.error(`[DEBUG] === LISTMEMORIES START ===`);
    console.error(`[DEBUG] Requested project: ${project}`);
    console.error(`[DEBUG] Memory root (baseDir): ${this.baseDir}`);
    console.error(`[DEBUG] Current working directory: ${process.cwd()}`);
    console.error(`[DEBUG] Server file location: ${__dirname}`);
    
    // File system audit
    try {
      const defaultDir = path.join(this.baseDir, 'default');
      console.error(`[DEBUG] Testing default directory: ${defaultDir}`);
      if (fs.existsSync(defaultDir)) {
        const allFiles = fs.readdirSync(defaultDir);
        console.error(`[DEBUG] 'default' directory contains ${allFiles.length} total files`);
        const mdFiles = allFiles.filter(f => f.endsWith('.md'));
        console.error(`[DEBUG] 'default' directory contains ${mdFiles.length} .md files`);
        console.error(`[DEBUG] First 5 .md files:`, mdFiles.slice(0, 5));
      } else {
        console.error(`[DEBUG] 'default' directory does not exist!`);
      }
    } catch (auditError) {
      console.error(`[ERROR] File system audit failed:`, auditError.message);
    }
    
    if (project) {
      const projectDir = this.getProjectDir(project);
      const files = fs.readdirSync(projectDir).filter(f => f.endsWith('.md'));
      totalFiles = files.length;
      
      for (const file of files) {
        const filepath = path.join(projectDir, file);
        try {
          const memory = this.parseMarkdownFile(filepath);
          if (memory) {
            memories.push(memory);
          } else {
            parseFailures++;
          }
        } catch (error) {
          console.error(`[ERROR] Exception parsing ${filepath}:`, error.message);
          parseFailures++;
        }
      }
    } else {
      console.error(`[DEBUG] Scanning ALL subdirectories dynamically in: ${this.baseDir}`);
      
      // Dynamic scan: Get ALL subdirectories automatically
      let projectDirs;
      try {
        projectDirs = fs.readdirSync(this.baseDir).filter(dir => {
          const dirPath = path.join(this.baseDir, dir);
          try {
            return fs.statSync(dirPath).isDirectory();
          } catch (e) {
            console.error(`[ERROR] Cannot stat ${dirPath}:`, e.message);
            return false;
          }
        });
      } catch (error) {
        console.error(`[ERROR] Cannot read baseDir ${this.baseDir}:`, error.message);
        return memories;
      }
      
      console.error(`[DEBUG] Found ${projectDirs.length} project directories: ${projectDirs.join(', ')}`);
      
      // Scan ALL directories found
      for (const projectDir of projectDirs) {
        const projectPath = path.join(this.baseDir, projectDir);
        console.error(`[DEBUG] Scanning directory: ${projectPath}`);
        
        let files;
        try {
          files = fs.readdirSync(projectPath).filter(f => f.endsWith('.md'));
          totalFiles += files.length;
          console.error(`[DEBUG] Project '${projectDir}': scanning ${files.length} .md files`);
        } catch (error) {
          console.error(`[ERROR] Cannot read project dir ${projectPath}:`, error.message);
          continue;
        }
        
        for (const file of files) {
          const filepath = path.join(projectPath, file);
          try {
            const memory = this.parseMarkdownFile(filepath);
            if (memory) {
              memories.push(memory);
            } else {
              parseFailures++;
              console.error(`[DEBUG] parseMarkdownFile returned null for: ${file}`);
            }
          } catch (error) {
            console.error(`[ERROR] Exception parsing ${filepath}:`, error.message);
            parseFailures++;
          }
        }
      }
      
      console.error(`[SUMMARY] Total files: ${totalFiles}, Parsed: ${memories.length}, Failed: ${parseFailures}`);
    }

    return memories.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async updateMemory(id, updates) {
    const memory = await this.getMemory(id);
    if (!memory) {
      return null;
    }

    const updatedMemory = { ...memory, ...updates, timestamp: new Date().toISOString() };
    delete updatedMemory.filepath; // remove property before re-generating content

    let updatedContent = this.generateMarkdownContent(updatedMemory);
    // Pre-sanitize before writing update
    updatedContent = sanitizeUnicode(updatedContent);
    await fs.promises.writeFile(memory.filepath, updatedContent, 'utf8');

    return this.parseMarkdownFile(memory.filepath);
  }

  async deleteMemory(id) {
    const memory = await this.getMemory(id);
    if (!memory) return false;

    fs.unlinkSync(memory.filepath);
    return true;
  }

  async findProjectDir(projectName) {
    if (!projectName) {
        return null;
    }
    const allProjects = (await fs.promises.readdir(this.baseDir, { withFileTypes: true }))
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
    
    const foundDirName = allProjects.find(p => p.toLowerCase() === projectName.toLowerCase());
    return foundDirName ? path.join(this.baseDir, foundDirName) : null;
  }

  async streamMemories(project) {
    const readable = new Readable({
      objectMode: true,
      read() {}
    });

    const processFiles = async (projectDir) => {
        try {
            const files = await fs.promises.readdir(projectDir);
            for (const file of files) {
                if (path.extname(file) === '.md') {
                    const filepath = path.join(projectDir, file);
                    try {
                        const memory = this.parseMarkdownFile(filepath);
                        if (memory) {
                            readable.push(memory);
                        }
                    } catch (error) {
                        readable.push({ error: `Failed to parse ${file}`, details: error.message });
                    }
                }
            }
        } catch (e) {
            // Ignore errors for directories that can't be read, etc.
        }
    };
    
    (async () => {
        if (project) {
            const projectDir = await this.findProjectDir(project);
            if (projectDir) {
                await processFiles(projectDir);
            }
        } else {
            // No project specified, stream from all projects
            const allProjects = (await fs.promises.readdir(this.baseDir, { withFileTypes: true }))
                .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.'));
            
            for (const projectDirEnt of allProjects) {
                 const projectDir = path.join(this.baseDir, projectDirEnt.name);
                 await processFiles(projectDir);
            }
        }
        readable.push(null); // End of stream
    })();

    return readable;
  }

  async searchMemories(query, project) {
    const allMemories = await this.listMemories(project); // Now uses the robust streamMemories
    if (!query) {
      return allMemories;
    }
    return this.enhancedSearch(allMemories, query);
  }

  enhancedSearch(memories, query) {
    const lowerCaseQuery = query.toLowerCase();
    const queryTerms = lowerCaseQuery.split(/\s+/).filter(term => term.length > 2);
    
    // Technical synonym mapping for MCP/memory queries
    const synonyms = {
      'mcp': ['model context protocol', 'memory', 'server', 'connection'],
      'cursor': ['client', 'ide', 'integration'],
      'windsurf': ['client', 'ide', 'integration'],
      'memory': ['storage', 'data', 'recall', 'save'],
      'fix': ['solution', 'repair', 'resolve', 'solve'],
      'connection': ['integration', 'setup', 'config', 'link'],
      'bina-bekitzur': ['project', 'implementation', 'system']
    };
    
    // Expand query terms with synonyms
    const expandedTerms = new Set(queryTerms);
    queryTerms.forEach(term => {
      if (synonyms[term]) {
        synonyms[term].forEach(synonym => expandedTerms.add(synonym));
      }
    });
    
    const results = [];
    
    memories.forEach(memory => {
      let score = 0;
      const searchableText = this.getSearchableText(memory).toLowerCase();
      
      // Multi-field scoring with different weights
      expandedTerms.forEach(term => {
        // Content match (weight: 1.0)
        if (memory.content.toLowerCase().includes(term)) {
          score += 1.0;
        }
        
        // Title/filename match (weight: 2.0)
        if (memory.filename?.toLowerCase().includes(term)) {
          score += 2.0;
        }
        
        // Tags match (weight: 1.5)
        if (memory.tags?.some(tag => tag.toLowerCase().includes(term))) {
          score += 1.5;
        }
        
        // Category match (weight: 1.2)
        if (memory.category?.toLowerCase().includes(term)) {
          score += 1.2;
        }
        
        // Project match (weight: 1.8)
        if (memory.project?.toLowerCase().includes(term)) {
          score += 1.8;
        }
        
        // Exact phrase bonus in content (weight: 3.0)
        if (memory.content.toLowerCase().includes(lowerCaseQuery)) {
          score += 3.0;
        }
      });
      
      // Fuzzy matching for compound terms
      if (this.fuzzyMatch(searchableText, lowerCaseQuery)) {
        score += 0.5;
      }
      
      if (score > 0) {
        results.push({ memory, score });
      }
    });
    
    return results;
  }

  getSearchableText(memory) {
    return [
      memory.content || '',
      memory.filename || '',
      memory.category || '',
      memory.project || '',
      ...(memory.tags || [])
    ].join(' ');
  }

  fuzzyMatch(text, query) {
    // Simple fuzzy matching for compound technical terms
    const words = query.split(/\s+/);
    return words.every(word => 
      text.includes(word) || 
      text.includes(word.slice(0, -1)) || // Handle plurals
      this.levenshteinDistance(word, this.findClosestWord(text, word)) <= 2
    );
  }

  findClosestWord(text, target) {
    const words = text.split(/\s+/);
    let closest = '';
    let minDistance = Infinity;
    
    words.forEach(word => {
      const distance = this.levenshteinDistance(target, word);
      if (distance < minDistance) {
        minDistance = distance;
        closest = word;
      }
    });
    
    return closest;
  }

  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

}

// Smart path detection: relative for new installs, absolute after first use
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getMemoriesPath() {
  // Priority 1: Environment variable override (for flexibility)
  if (process.env.MCP_MEMORY_PATH) {
    console.error(`🔧 Using environment variable path: ${process.env.MCP_MEMORY_PATH}`);
    return process.env.MCP_MEMORY_PATH;
  }
  
  // Priority 2: Use __dirname for reliable path resolution
  const memoriesPath = path.join(__dirname, 'memories');
  console.error(`🔧 Using __dirname-based path: ${memoriesPath}`);
  
  // Ensure memories directory exists
  if (!fs.existsSync(memoriesPath)) {
    console.error(`🔧 Creating memories directory: ${memoriesPath}`);
    fs.mkdirSync(memoriesPath, { recursive: true });
  }
  
  return memoriesPath;
}

const memoriesPath = getMemoriesPath();
console.error(`🔧 Debug: Server at: ${__dirname}`);
console.error(`🔧 Debug: Final memories path: ${memoriesPath}`);
const storage = new MarkdownStorage(memoriesPath);

console.error('Like-I-Said Memory Server v2 - Markdown File Mode');

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
        description: 'Store a new memory as a markdown file with enhanced frontmatter and complexity detection',
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
        description: 'Search memories by content, tags, or category',
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
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // Custom Transform stream for sanitizing memory content
  class UnicodeSanitizer extends Transform {
    constructor() {
      super({ objectMode: true });
    }
    _transform(memory, encoding, callback) {
      if (memory.content) {
        memory.content = sanitizeUnicode(memory.content);
      }
      this.push(memory);
      callback();
    }
  }

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

        const filepath = await storage.saveMemory(memory);
        const complexity = storage.detectComplexityLevel(memory);
        const contentType = storage.detectContentType(content);
        
        return {
          content: [
            {
              type: 'text',
              text: `✅ Memory stored as markdown file: ${path.basename(filepath)}\n🆔 ID: ${memory.id}\n📁 Project: ${project || 'default'}\n🎯 Complexity Level: ${complexity}\n📝 Content Type: ${contentType}\n🏷️ Priority: ${priority}\n📊 Status: ${status}\n\nContent Preview:\n${content.substring(0, 150)}${content.length > 150 ? '...' : ''}`,
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
        console.error(`[MCP DEBUG] list_memories called with limit=${limit}, project=${project || 'none'}`);
        
        const memoryStream = await storage.streamMemories(project);
        const sanitizer = new UnicodeSanitizer();
        
        const memories = [];
        await new Promise((resolve, reject) => {
            memoryStream
                .pipe(sanitizer)
                .on('data', (mem) => memories.push(mem))
                .on('end', resolve)
                .on('error', reject);
        });

        console.error(`[MCP DEBUG] listMemories returned ${memories.length} memories`);
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
          const line = `🆔 ${memory.id} | ${complexityIcon} L${memory.complexity || 1} | ${priorityIcon} ${sanitizeUnicode(preview)} | ⏰ ${new Date(memory.timestamp).toLocaleDateString()} | 📁 ${memory.project || 'default'}`;
          return sanitizeUnicode(line);
        }).join('\n');

        const responseText = `📚 Total memories: ${total}${project ? ` in project: ${project}` : ''}\n🎯 Complexity Legend: 🟢 L1 (Simple) | 🟡 L2 (Enhanced) | 🟠 L3 (Project) | 🔴 L4 (Advanced)\n🏷️ Priority: 🔥 High | 📝 Medium | ❄️ Low\n\n📋 ${limitedMemories.length > 0 ? `Showing ${limitedMemories.length}:` : 'Recent memories:'}\n${memoryList}`;
        
        return {
          content: [
            {
              type: 'text',
              text: sanitizeUnicode(responseText),
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

        // Sanitize content before sending
        const safeResults = results.map(mem => {
          if (mem.error) return mem; // Pass through error objects
          return {
            ...mem,
            content: sanitizeUnicode(mem.content || ''),
          };
        });

        if (safeResults.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `🔍 No memories found matching "${query}"${project ? ` in project: ${project}` : ''}`,
              },
            ],
          };
        }

        const resultList = safeResults.map(memory => {
          const preview = memory.content.length > 80 ? memory.content.substring(0, 80) + '...' : memory.content;
          return `🆔 ${memory.id} | 📝 ${preview} | 🏷️ ${memory.tags?.join(', ') || 'no tags'} | 📁 ${memory.project || 'default'}`;
        }).join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `🔍 Found ${safeResults.length} memories matching "${query}"${project ? ` in project: ${project}` : ''}:\n\n${resultList}`,
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

// A function to validate all memory files on startup
async function validateAllMemories() {
  console.log('Running startup validation of all memory files...');
  const storage = new MarkdownStorage();
  const projects = (await fs.promises.readdir(storage.baseDir, { withFileTypes: true }))
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  let corruptedCount = 0;
  for (const project of projects) {
    const projectDir = storage.getProjectDir(project);
    const files = await fs.promises.readdir(projectDir);
    for (const file of files) {
      if (path.extname(file) === '.md') {
        const filepath = path.join(projectDir, file);
        try {
          const buffer = await fs.promises.readFile(filepath);
          new TextDecoder('utf-8', { fatal: true }).decode(buffer);
        } catch (error) {
          if (error instanceof TypeError) {
            console.error(`[Startup Check] Corrupted file found: ${filepath}`);
            corruptedCount++;
          }
        }
      }
    }
  }

  if (corruptedCount > 0) {
    console.error(`[Startup Check] Validation complete. Found ${corruptedCount} corrupted files. The server will still start, but these files may cause issues.`);
  } else {
    console.log('[Startup Check] Validation complete. All memory files appear to be valid.');
  }
}

// Start the server
async function main() {
  await validateAllMemories().catch(err => {
    console.error('Error during startup validation:', err);
  });

  if (process.env.ENABLE_AUTO_SANITIZE === 'true') {
    const storage = new MarkdownStorage();
    initSanitizationWatcher(storage.baseDir);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Like I Said Memory MCP Server v2 started successfully');
}

main().catch(console.error);