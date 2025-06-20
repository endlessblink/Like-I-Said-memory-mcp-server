#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
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

// Auto-start backup system unless explicitly disabled
if (process.env.NO_BACKUP !== 'true') {
  console.error('🔄 Starting backup system...');
  import('./backup-system.js').catch(error => {
    console.error('⚠️  Backup system failed to start:', error.message);
    console.error('💡 Memories will still work, but without automatic backups');
  });
}

// AI Enhancement for automatic title and summary generation
class AIEnhancer {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  }

  sanitizeForJSON(text) {
    // Remove or replace invalid Unicode characters that can break JSON
    return text
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
      .replace(/[\uD800-\uDFFF]/g, '') // Remove surrogate pairs
      .replace(/\\/g, '\\\\') // Escape backslashes
      .replace(/"/g, '\\"'); // Escape quotes
  }

  async generateTitleAndSummary(content) {
    // Try OpenAI first, fallback to Anthropic
    if (this.openaiApiKey) {
      try {
        return await this.generateWithOpenAI(content);
      } catch (error) {
        console.error('OpenAI generation failed:', error.message);
        if (this.anthropicApiKey) {
          try {
            return await this.generateWithAnthropic(content);
          } catch (anthropicError) {
            console.error('Anthropic generation failed:', anthropicError.message);
          }
        }
      }
    } else if (this.anthropicApiKey) {
      try {
        return await this.generateWithAnthropic(content);
      } catch (error) {
        console.error('Anthropic generation failed:', error.message);
      }
    }

    // Return null if no API keys configured or all attempts failed
    return null;
  }

  async generateWithOpenAI(content) {
    // Sanitize content to remove invalid Unicode characters
    const sanitizedContent = this.sanitizeForJSON(content.slice(0, 2000));
    
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
            content: 'Generate a concise title (max 50 characters) and summary (max 150 characters) for the given memory content. Respond in JSON format: {"title": "...", "summary": "..."}'
          },
          {
            role: 'user',
            content: sanitizedContent
          }
        ],
        max_tokens: 100,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
    
    return {
      title: result.title?.slice(0, 50) || null,
      summary: result.summary?.slice(0, 150) || null
    };
  }

  async generateWithAnthropic(content) {
    // Sanitize content to remove invalid Unicode characters
    const sanitizedContent = this.sanitizeForJSON(content.slice(0, 2000));
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.anthropicApiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: `Generate a concise title (max 50 characters) and summary (max 150 characters) for this memory content. Respond in JSON format: {"title": "...", "summary": "..."}\n\nContent: ${sanitizedContent}`
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.content[0].text);
    
    return {
      title: result.title?.slice(0, 50) || null,
      summary: result.summary?.slice(0, 150) || null
    };
  }
}

// GitHub API Integration
class GitHubAPI {
  constructor() {
    this.baseURL = 'https://api.github.com';
    this.token = process.env.GITHUB_TOKEN;
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Like-I-Said-MCP-v2',
      ...options.headers
    };

    if (this.token) {
      headers.Authorization = `token ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        throw new Error(`GitHub API Error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('GitHub API request failed:', error);
      throw error;
    }
  }

  async createIssue(repository, title, body, labels = [], assignees = []) {
    const [owner, repo] = repository.split('/');
    if (!owner || !repo) {
      throw new Error('Repository must be in format "owner/repo"');
    }

    return await this.makeRequest(`/repos/${owner}/${repo}/issues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        body,
        labels,
        assignees
      })
    });
  }

  async searchRepositories(query, sort = 'stars', limit = 5) {
    const params = new URLSearchParams({
      q: query,
      sort,
      order: 'desc',
      per_page: Math.min(limit, 10)
    });

    const data = await this.makeRequest(`/search/repositories?${params}`);
    return data.items || [];
  }

  async getRepository(repository, includeReadme = false) {
    const [owner, repo] = repository.split('/');
    if (!owner || !repo) {
      throw new Error('Repository must be in format "owner/repo"');
    }

    const repoData = await this.makeRequest(`/repos/${owner}/${repo}`);
    
    if (includeReadme) {
      try {
        const readmeData = await this.makeRequest(`/repos/${owner}/${repo}/readme`);
        const readmeContent = Buffer.from(readmeData.content, 'base64').toString('utf-8');
        repoData.readme_content = readmeContent;
      } catch (error) {
        console.warn('Could not fetch README for', repository);
      }
    }

    return repoData;
  }

  async listIssues(repository, state = 'open', labels = '', limit = 10) {
    const [owner, repo] = repository.split('/');
    if (!owner || !repo) {
      throw new Error('Repository must be in format "owner/repo"');
    }

    const params = new URLSearchParams({
      state,
      per_page: Math.min(limit, 20)
    });

    if (labels) {
      params.append('labels', labels);
    }

    return await this.makeRequest(`/repos/${owner}/${repo}/issues?${params}`);
  }

  async createFile(repository, path, content, message, branch = 'main') {
    const [owner, repo] = repository.split('/');
    if (!owner || !repo) {
      throw new Error('Repository must be in format "owner/repo"');
    }

    return await this.makeRequest(`/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        content: Buffer.from(content).toString('base64'),
        branch
      })
    });
  }

  async updateFile(repository, path, content, message, sha, branch = 'main') {
    const [owner, repo] = repository.split('/');
    if (!owner || !repo) {
      throw new Error('Repository must be in format "owner/repo"');
    }

    return await this.makeRequest(`/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        content: Buffer.from(content).toString('base64'),
        sha,
        branch
      })
    });
  }

  async getFile(repository, path, branch = 'main') {
    const [owner, repo] = repository.split('/');
    if (!owner || !repo) {
      throw new Error('Repository must be in format "owner/repo"');
    }

    const params = new URLSearchParams({ ref: branch });
    return await this.makeRequest(`/repos/${owner}/${repo}/contents/${path}?${params}`);
  }

  async deleteFile(repository, path, message, sha, branch = 'main') {
    const [owner, repo] = repository.split('/');
    if (!owner || !repo) {
      throw new Error('Repository must be in format "owner/repo"');
    }

    return await this.makeRequest(`/repos/${owner}/${repo}/contents/${path}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        sha,
        branch
      })
    });
  }

  async createBranch(repository, branchName, fromBranch = 'main') {
    const [owner, repo] = repository.split('/');
    if (!owner || !repo) {
      throw new Error('Repository must be in format "owner/repo"');
    }

    // Get the SHA of the source branch
    const sourceRef = await this.makeRequest(`/repos/${owner}/${repo}/git/ref/heads/${fromBranch}`);
    const sourceSha = sourceRef.object.sha;

    // Create new branch
    return await this.makeRequest(`/repos/${owner}/${repo}/git/refs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: sourceSha
      })
    });
  }

  async createPullRequest(repository, title, body, head, base = 'main') {
    const [owner, repo] = repository.split('/');
    if (!owner || !repo) {
      throw new Error('Repository must be in format "owner/repo"');
    }

    return await this.makeRequest(`/repos/${owner}/${repo}/pulls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        body,
        head,
        base
      })
    });
  }

  async forkRepository(repository) {
    const [owner, repo] = repository.split('/');
    if (!owner || !repo) {
      throw new Error('Repository must be in format "owner/repo"');
    }

    return await this.makeRequest(`/repos/${owner}/${repo}/forks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async listBranches(repository) {
    const [owner, repo] = repository.split('/');
    if (!owner || !repo) {
      throw new Error('Repository must be in format "owner/repo"');
    }

    return await this.makeRequest(`/repos/${owner}/${repo}/branches`);
  }

  async getCommits(repository, branch = 'main', limit = 10) {
    const [owner, repo] = repository.split('/');
    if (!owner || !repo) {
      throw new Error('Repository must be in format "owner/repo"');
    }

    const params = new URLSearchParams({
      sha: branch,
      per_page: Math.min(limit, 20)
    });

    return await this.makeRequest(`/repos/${owner}/${repo}/commits?${params}`);
  }
}

const github = new GitHubAPI();

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

    return frontmatter + '\n' + memory.content;
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
    const projectDir = this.getProjectDir(memory.project);
    const filename = this.generateFilename(memory);
    const filepath = path.join(projectDir, filename);
    
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
    
    if (project) {
      const projectDir = this.getProjectDir(project);
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
        const files = fs.readdirSync(projectPath).filter(f => f.endsWith('.md'));
        
        for (const file of files) {
          const filepath = path.join(projectPath, file);
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

    fs.unlinkSync(existingMemory.filepath);

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

}

// Initialize storage
const storage = new MarkdownStorage();

console.error('Like-I-Said Memory Server v2 - Markdown File Mode');

// Create MCP server
const server = new Server(
  {
    name: 'like-i-said-memory-v2',
    version: '2.1.4',
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
        const { 
          content, 
          tags = [], 
          category, 
          project, 
          priority = 'medium',
          status = 'active',
          related_memories = [],
          language,
          title,
          summary
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
          title,
          summary,
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


      default:
        return {
          content: [
            {
              type: 'text',
              text: `❌ Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
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
  console.error('Like I Said Memory MCP Server v2 started successfully');
}

main().catch(console.error);
