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

  // Migration from JSON
  async migrateFromJSON(jsonFilePath) {
    if (!fs.existsSync(jsonFilePath)) {
      console.log('No JSON file to migrate from');
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
    console.log(`Migrated ${migrated} memories. JSON backup saved to ${backupPath}`);

    return migrated;
  }
}

// Initialize storage
const storage = new MarkdownStorage();

// Auto-migrate from JSON if it exists (only once)
const jsonFile = path.join(process.cwd(), 'memories.json');
const migrationMarker = path.join(process.cwd(), '.migration-complete');
if (fs.existsSync(jsonFile) && !fs.existsSync(migrationMarker)) {
  console.error('Migrating from JSON to markdown files...');
  storage.migrateFromJSON(jsonFile).then(count => {
    console.error(`Migration complete: ${count} memories converted to markdown`);
    // Create marker to prevent re-migration
    fs.writeFileSync(migrationMarker, new Date().toISOString());
  });
}

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
      {
        name: 'github_create_issue',
        description: 'Create a new GitHub issue and store it as a memory',
        inputSchema: {
          type: 'object',
          properties: {
            repository: {
              type: 'string',
              description: 'Repository name (e.g., "owner/repo")',
            },
            title: {
              type: 'string',
              description: 'Issue title',
            },
            body: {
              type: 'string',
              description: 'Issue description/body',
            },
            labels: {
              type: 'array',
              items: { type: 'string' },
              description: 'Issue labels',
            },
            assignees: {
              type: 'array',
              items: { type: 'string' },
              description: 'GitHub usernames to assign',
            },
            project: {
              type: 'string',
              description: 'Project name to organize the memory',
            },
          },
          required: ['repository', 'title', 'body'],
        },
      },
      {
        name: 'github_search_repos',
        description: 'Search GitHub repositories and store results as memories',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query for repositories',
            },
            sort: {
              type: 'string',
              description: 'Sort by: stars, forks, updated, or created',
              enum: ['stars', 'forks', 'updated', 'created'],
            },
            limit: {
              type: 'number',
              description: 'Maximum number of repositories to return (1-10)',
              minimum: 1,
              maximum: 10,
            },
            project: {
              type: 'string',
              description: 'Project name to organize the memories',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'github_get_repo_info',
        description: 'Get detailed information about a GitHub repository and store as memory',
        inputSchema: {
          type: 'object',
          properties: {
            repository: {
              type: 'string',
              description: 'Repository name (e.g., "owner/repo")',
            },
            include_readme: {
              type: 'boolean',
              description: 'Include README content in the memory',
            },
            project: {
              type: 'string',
              description: 'Project name to organize the memory',
            },
          },
          required: ['repository'],
        },
      },
      {
        name: 'github_list_issues',
        description: 'List GitHub issues from a repository and store as memories',
        inputSchema: {
          type: 'object',
          properties: {
            repository: {
              type: 'string',
              description: 'Repository name (e.g., "owner/repo")',
            },
            state: {
              type: 'string',
              description: 'Issue state: open, closed, or all',
              enum: ['open', 'closed', 'all'],
            },
            labels: {
              type: 'string',
              description: 'Comma-separated list of labels to filter by',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of issues to return (1-20)',
              minimum: 1,
              maximum: 20,
            },
            project: {
              type: 'string',
              description: 'Project name to organize the memories',
            },
          },
          required: ['repository'],
        },
      },
      {
        name: 'github_create_file',
        description: 'Create a new file in a GitHub repository and store the action as memory',
        inputSchema: {
          type: 'object',
          properties: {
            repository: {
              type: 'string',
              description: 'Repository name (e.g., "owner/repo")',
            },
            path: {
              type: 'string',
              description: 'File path in the repository (e.g., "src/index.js")',
            },
            content: {
              type: 'string',
              description: 'File content to create',
            },
            message: {
              type: 'string',
              description: 'Commit message for the file creation',
            },
            branch: {
              type: 'string',
              description: 'Branch to create the file in (default: main)',
            },
            project: {
              type: 'string',
              description: 'Project name to organize the memory',
            },
          },
          required: ['repository', 'path', 'content', 'message'],
        },
      },
      {
        name: 'github_update_file',
        description: 'Update an existing file in a GitHub repository and store the action as memory',
        inputSchema: {
          type: 'object',
          properties: {
            repository: {
              type: 'string',
              description: 'Repository name (e.g., "owner/repo")',
            },
            path: {
              type: 'string',
              description: 'File path in the repository (e.g., "src/index.js")',
            },
            content: {
              type: 'string',
              description: 'New file content',
            },
            message: {
              type: 'string',
              description: 'Commit message for the file update',
            },
            branch: {
              type: 'string',
              description: 'Branch to update the file in (default: main)',
            },
            project: {
              type: 'string',
              description: 'Project name to organize the memory',
            },
          },
          required: ['repository', 'path', 'content', 'message'],
        },
      },
      {
        name: 'github_get_file',
        description: 'Get file content from a GitHub repository and store as memory',
        inputSchema: {
          type: 'object',
          properties: {
            repository: {
              type: 'string',
              description: 'Repository name (e.g., "owner/repo")',
            },
            path: {
              type: 'string',
              description: 'File path in the repository (e.g., "src/index.js")',
            },
            branch: {
              type: 'string',
              description: 'Branch to get the file from (default: main)',
            },
            project: {
              type: 'string',
              description: 'Project name to organize the memory',
            },
          },
          required: ['repository', 'path'],
        },
      },
      {
        name: 'github_delete_file',
        description: 'Delete a file from a GitHub repository and store the action as memory',
        inputSchema: {
          type: 'object',
          properties: {
            repository: {
              type: 'string',
              description: 'Repository name (e.g., "owner/repo")',
            },
            path: {
              type: 'string',
              description: 'File path in the repository (e.g., "src/index.js")',
            },
            message: {
              type: 'string',
              description: 'Commit message for the file deletion',
            },
            branch: {
              type: 'string',
              description: 'Branch to delete the file from (default: main)',
            },
            project: {
              type: 'string',
              description: 'Project name to organize the memory',
            },
          },
          required: ['repository', 'path', 'message'],
        },
      },
      {
        name: 'github_create_branch',
        description: 'Create a new branch in a GitHub repository and store the action as memory',
        inputSchema: {
          type: 'object',
          properties: {
            repository: {
              type: 'string',
              description: 'Repository name (e.g., "owner/repo")',
            },
            branch_name: {
              type: 'string',
              description: 'Name for the new branch',
            },
            from_branch: {
              type: 'string',
              description: 'Source branch to create from (default: main)',
            },
            project: {
              type: 'string',
              description: 'Project name to organize the memory',
            },
          },
          required: ['repository', 'branch_name'],
        },
      },
      {
        name: 'github_create_pr',
        description: 'Create a pull request in a GitHub repository and store as memory',
        inputSchema: {
          type: 'object',
          properties: {
            repository: {
              type: 'string',
              description: 'Repository name (e.g., "owner/repo")',
            },
            title: {
              type: 'string',
              description: 'Pull request title',
            },
            body: {
              type: 'string',
              description: 'Pull request description/body',
            },
            head: {
              type: 'string',
              description: 'Head branch (the branch with changes)',
            },
            base: {
              type: 'string',
              description: 'Base branch to merge into (default: main)',
            },
            project: {
              type: 'string',
              description: 'Project name to organize the memory',
            },
          },
          required: ['repository', 'title', 'body', 'head'],
        },
      },
      {
        name: 'github_fork_repo',
        description: 'Fork a GitHub repository and store the action as memory',
        inputSchema: {
          type: 'object',
          properties: {
            repository: {
              type: 'string',
              description: 'Repository name to fork (e.g., "owner/repo")',
            },
            project: {
              type: 'string',
              description: 'Project name to organize the memory',
            },
          },
          required: ['repository'],
        },
      },
      {
        name: 'github_list_branches',
        description: 'List all branches in a GitHub repository and store as memory',
        inputSchema: {
          type: 'object',
          properties: {
            repository: {
              type: 'string',
              description: 'Repository name (e.g., "owner/repo")',
            },
            project: {
              type: 'string',
              description: 'Project name to organize the memory',
            },
          },
          required: ['repository'],
        },
      },
      {
        name: 'github_get_commits',
        description: 'Get recent commits from a GitHub repository and store as memory',
        inputSchema: {
          type: 'object',
          properties: {
            repository: {
              type: 'string',
              description: 'Repository name (e.g., "owner/repo")',
            },
            branch: {
              type: 'string',
              description: 'Branch to get commits from (default: main)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of commits to return (1-20)',
              minimum: 1,
              maximum: 20,
            },
            project: {
              type: 'string',
              description: 'Project name to organize the memory',
            },
          },
          required: ['repository'],
        },
      },
    ],
  };
});

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

      // GitHub Integration Tools
      case 'github_create_issue': {
        const { repository, title, body, labels = [], assignees = [], project } = args;
        
        if (!github.token) {
          return {
            content: [
              {
                type: 'text',
                text: `⚠️ GitHub token not configured. Set GITHUB_TOKEN environment variable for full functionality.\n\n📝 Issue details stored as memory:\n🔗 Repository: ${repository}\n📋 Title: ${title}\n📄 Body: ${body}\n🏷️ Labels: ${labels.join(', ') || 'none'}\n👥 Assignees: ${assignees.join(', ') || 'none'}`,
              },
            ],
          };
        }

        try {
          const issue = await github.createIssue(repository, title, body, labels, assignees);
          
          // Store issue as memory
          const memory = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            content: `# GitHub Issue: ${title}\n\n**Repository:** ${repository}\n**Issue URL:** ${issue.html_url}\n**Number:** #${issue.number}\n**State:** ${issue.state}\n\n## Description\n${body}\n\n## Labels\n${labels.join(', ') || 'none'}\n\n## Assignees\n${assignees.join(', ') || 'none'}\n\n*Created via MCP GitHub integration*`,
            tags: ['github', 'issue', repository.split('/')[1], ...labels],
            category: 'code',
            project: project || 'github-integration',
            priority: 'medium',
            status: 'active',
            timestamp: new Date().toISOString(),
            access_count: 0,
            last_accessed: new Date().toISOString(),
          };

          await storage.saveMemory(memory);

          return {
            content: [
              {
                type: 'text',
                text: `✅ GitHub issue created successfully!\n\n🔗 Issue URL: ${issue.html_url}\n📋 Issue #${issue.number}: ${title}\n📁 Repository: ${repository}\n🆔 Memory ID: ${memory.id}\n📂 Project: ${project || 'github-integration'}\n\n💾 Issue details stored as memory with tags: ${memory.tags.join(', ')}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ Failed to create GitHub issue: ${error.message}\n\nPlease check:\n- Repository exists and you have access\n- GitHub token has issues:write permission\n- Repository format is "owner/repo"`,
              },
            ],
            isError: true,
          };
        }
      }

      case 'github_search_repos': {
        const { query, sort = 'stars', limit = 5, project } = args;

        try {
          const repos = await github.searchRepositories(query, sort, limit);
          
          if (repos.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: `🔍 No repositories found for query: "${query}"`,
                },
              ],
            };
          }

          // Store search results as memory
          const repoList = repos.map(repo => 
            `- **${repo.full_name}** (⭐ ${repo.stargazers_count})\n  ${repo.description || 'No description'}\n  🔗 ${repo.html_url}`
          ).join('\n\n');

          const memory = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            content: `# GitHub Repository Search Results\n\n**Query:** "${query}"\n**Sort:** ${sort}\n**Found:** ${repos.length} repositories\n\n## Results\n\n${repoList}\n\n*Search performed via MCP GitHub integration*`,
            tags: ['github', 'search', 'repositories', query.toLowerCase()],
            category: 'research',
            project: project || 'github-search',
            priority: 'medium',
            status: 'active',
            timestamp: new Date().toISOString(),
            access_count: 0,
            last_accessed: new Date().toISOString(),
          };

          await storage.saveMemory(memory);

          const resultSummary = repos.map(repo => 
            `📦 ${repo.full_name} (⭐ ${repo.stargazers_count}) - ${repo.description?.substring(0, 80) || 'No description'}...`
          ).join('\n');

          return {
            content: [
              {
                type: 'text',
                text: `🔍 Found ${repos.length} repositories for "${query}":\n\n${resultSummary}\n\n💾 Search results stored as memory (ID: ${memory.id})\n📂 Project: ${project || 'github-search'}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ GitHub repository search failed: ${error.message}`,
              },
            ],
            isError: true,
          };
        }
      }

      case 'github_get_repo_info': {
        const { repository, include_readme = false, project } = args;

        try {
          const repo = await github.getRepository(repository, include_readme);
          
          let content = `# GitHub Repository: ${repo.full_name}\n\n`;
          content += `**Description:** ${repo.description || 'No description'}\n`;
          content += `**Language:** ${repo.language || 'Not specified'}\n`;
          content += `**Stars:** ⭐ ${repo.stargazers_count}\n`;
          content += `**Forks:** 🍴 ${repo.forks_count}\n`;
          content += `**Issues:** 🐛 ${repo.open_issues_count}\n`;
          content += `**License:** ${repo.license?.name || 'None'}\n`;
          content += `**Created:** ${new Date(repo.created_at).toLocaleDateString()}\n`;
          content += `**Updated:** ${new Date(repo.updated_at).toLocaleDateString()}\n`;
          content += `**URL:** ${repo.html_url}\n`;
          content += `**Clone URL:** ${repo.clone_url}\n\n`;

          if (repo.topics && repo.topics.length > 0) {
            content += `**Topics:** ${repo.topics.join(', ')}\n\n`;
          }

          if (include_readme && repo.readme_content) {
            content += `## README\n\n${repo.readme_content}\n\n`;
          }

          content += `*Repository information retrieved via MCP GitHub integration*`;

          const memory = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            content,
            tags: ['github', 'repository', repo.name, repo.language?.toLowerCase(), ...(repo.topics || [])].filter(Boolean),
            category: 'research',
            project: project || 'github-repos',
            priority: 'medium',
            status: 'active',
            timestamp: new Date().toISOString(),
            access_count: 0,
            last_accessed: new Date().toISOString(),
          };

          await storage.saveMemory(memory);

          return {
            content: [
              {
                type: 'text',
                text: `📦 Repository information retrieved for ${repo.full_name}\n\n⭐ ${repo.stargazers_count} stars | 🍴 ${repo.forks_count} forks | 🐛 ${repo.open_issues_count} issues\n📝 ${repo.description || 'No description'}\n🔗 ${repo.html_url}\n\n💾 Repository details stored as memory (ID: ${memory.id})\n📂 Project: ${project || 'github-repos'}${include_readme ? '\n📖 README included' : ''}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ Failed to get repository information: ${error.message}\n\nPlease check:\n- Repository exists and is public (or you have access)\n- Repository format is "owner/repo"`,
              },
            ],
            isError: true,
          };
        }
      }

      case 'github_list_issues': {
        const { repository, state = 'open', labels = '', limit = 10, project } = args;

        try {
          const issues = await github.listIssues(repository, state, labels, limit);
          
          if (issues.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: `📋 No ${state} issues found in ${repository}${labels ? ` with labels: ${labels}` : ''}`,
                },
              ],
            };
          }

          const issueList = issues.map(issue => 
            `- **#${issue.number}: ${issue.title}**\n  👤 @${issue.user.login} | 📅 ${new Date(issue.created_at).toLocaleDateString()}\n  🏷️ ${issue.labels.map(l => l.name).join(', ') || 'no labels'}\n  🔗 ${issue.html_url}`
          ).join('\n\n');

          const memory = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            content: `# GitHub Issues: ${repository}\n\n**State:** ${state}\n**Labels:** ${labels || 'all'}\n**Found:** ${issues.length} issues\n\n## Issues\n\n${issueList}\n\n*Issues retrieved via MCP GitHub integration*`,
            tags: ['github', 'issues', repository.split('/')[1], state, ...(labels ? labels.split(',') : [])].filter(Boolean),
            category: 'code',
            project: project || 'github-issues',
            priority: 'medium',
            status: 'active',
            timestamp: new Date().toISOString(),
            access_count: 0,
            last_accessed: new Date().toISOString(),
          };

          await storage.saveMemory(memory);

          const issueSummary = issues.map(issue => 
            `📋 #${issue.number}: ${issue.title} (@${issue.user.login})`
          ).join('\n');

          return {
            content: [
              {
                type: 'text',
                text: `📋 Found ${issues.length} ${state} issues in ${repository}:\n\n${issueSummary}\n\n💾 Issues list stored as memory (ID: ${memory.id})\n📂 Project: ${project || 'github-issues'}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ Failed to list GitHub issues: ${error.message}\n\nPlease check:\n- Repository exists and is public (or you have access)\n- Repository format is "owner/repo"`,
              },
            ],
            isError: true,
          };
        }
      }

      // Advanced GitHub Repository Management Tools
      case 'github_create_file': {
        const { repository, path, content, message, branch = 'main', project } = args;

        if (!github.token) {
          return {
            content: [
              {
                type: 'text',
                text: `⚠️ GitHub token required for file operations. Set GITHUB_TOKEN environment variable.\n\n📝 File creation details stored as memory:\n🔗 Repository: ${repository}\n📁 Path: ${path}\n📝 Content: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}\n💬 Message: ${message}\n🌿 Branch: ${branch}`,
              },
            ],
          };
        }

        try {
          const result = await github.createFile(repository, path, content, message, branch);

          const memory = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            content: `# GitHub File Created: ${path}\n\n**Repository:** ${repository}\n**Branch:** ${branch}\n**Commit:** ${result.commit.html_url}\n**SHA:** ${result.content.sha}\n\n## File Details\n- **Path:** ${path}\n- **Size:** ${content.length} characters\n- **Message:** ${message}\n\n## Content Preview\n\`\`\`\n${content.substring(0, 500)}${content.length > 500 ? '\n...' : ''}\n\`\`\`\n\n*File created via MCP GitHub integration*`,
            tags: ['github', 'file-creation', repository.split('/')[1], path.split('/').pop()?.split('.').pop() || 'file'],
            category: 'code',
            project: project || 'github-files',
            priority: 'medium',
            status: 'active',
            timestamp: new Date().toISOString(),
            access_count: 0,
            last_accessed: new Date().toISOString(),
          };

          await storage.saveMemory(memory);

          return {
            content: [
              {
                type: 'text',
                text: `✅ File created successfully in ${repository}!\n\n📁 Path: ${path}\n🌿 Branch: ${branch}\n🔗 Commit: ${result.commit.html_url}\n📄 SHA: ${result.content.sha}\n💾 Memory ID: ${memory.id}\n📂 Project: ${project || 'github-files'}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ Failed to create file: ${error.message}\n\nPlease check:\n- Repository exists and you have write access\n- File path doesn't already exist\n- Branch exists\n- GitHub token has contents:write permission`,
              },
            ],
            isError: true,
          };
        }
      }

      case 'github_update_file': {
        const { repository, path, content, message, branch = 'main', project } = args;

        if (!github.token) {
          return {
            content: [
              {
                type: 'text',
                text: `⚠️ GitHub token required for file operations. Set GITHUB_TOKEN environment variable.`,
              },
            ],
          };
        }

        try {
          // First get the current file to get its SHA
          const currentFile = await github.getFile(repository, path, branch);
          const sha = currentFile.sha;
          
          const result = await github.updateFile(repository, path, content, message, sha, branch);

          const memory = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            content: `# GitHub File Updated: ${path}\n\n**Repository:** ${repository}\n**Branch:** ${branch}\n**Commit:** ${result.commit.html_url}\n**Previous SHA:** ${sha}\n**New SHA:** ${result.content.sha}\n\n## Update Details\n- **Path:** ${path}\n- **Size:** ${content.length} characters\n- **Message:** ${message}\n\n## New Content Preview\n\`\`\`\n${content.substring(0, 500)}${content.length > 500 ? '\n...' : ''}\n\`\`\`\n\n*File updated via MCP GitHub integration*`,
            tags: ['github', 'file-update', repository.split('/')[1], path.split('/').pop()?.split('.').pop() || 'file'],
            category: 'code',
            project: project || 'github-files',
            priority: 'medium',
            status: 'active',
            timestamp: new Date().toISOString(),
            access_count: 0,
            last_accessed: new Date().toISOString(),
          };

          await storage.saveMemory(memory);

          return {
            content: [
              {
                type: 'text',
                text: `✅ File updated successfully in ${repository}!\n\n📁 Path: ${path}\n🌿 Branch: ${branch}\n🔗 Commit: ${result.commit.html_url}\n📄 New SHA: ${result.content.sha}\n💾 Memory ID: ${memory.id}\n📂 Project: ${project || 'github-files'}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ Failed to update file: ${error.message}\n\nPlease check:\n- Repository exists and you have write access\n- File exists at the specified path\n- Branch exists\n- GitHub token has contents:write permission`,
              },
            ],
            isError: true,
          };
        }
      }

      case 'github_get_file': {
        const { repository, path, branch = 'main', project } = args;

        try {
          const file = await github.getFile(repository, path, branch);
          const content = Buffer.from(file.content, 'base64').toString('utf-8');

          const memory = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            content: `# GitHub File: ${path}\n\n**Repository:** ${repository}\n**Branch:** ${branch}\n**SHA:** ${file.sha}\n**Size:** ${file.size} bytes\n**URL:** ${file.html_url}\n\n## File Content\n\n\`\`\`${path.split('.').pop()}\n${content}\n\`\`\`\n\n*File retrieved via MCP GitHub integration*`,
            tags: ['github', 'file-content', repository.split('/')[1], path.split('/').pop()?.split('.').pop() || 'file'],
            category: 'code',
            project: project || 'github-files',
            priority: 'medium',
            status: 'active',
            timestamp: new Date().toISOString(),
            access_count: 0,
            last_accessed: new Date().toISOString(),
          };

          await storage.saveMemory(memory);

          return {
            content: [
              {
                type: 'text',
                text: `📄 File retrieved from ${repository}:\n\n📁 Path: ${path}\n🌿 Branch: ${branch}\n📄 SHA: ${file.sha}\n📏 Size: ${file.size} bytes\n🔗 URL: ${file.html_url}\n\n💾 File content stored as memory (ID: ${memory.id})\n📂 Project: ${project || 'github-files'}\n\n**Content Preview:**\n${content.substring(0, 300)}${content.length > 300 ? '...' : ''}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ Failed to get file: ${error.message}\n\nPlease check:\n- Repository exists and is accessible\n- File exists at the specified path\n- Branch exists`,
              },
            ],
            isError: true,
          };
        }
      }

      case 'github_delete_file': {
        const { repository, path, message, branch = 'main', project } = args;

        if (!github.token) {
          return {
            content: [
              {
                type: 'text',
                text: `⚠️ GitHub token required for file operations. Set GITHUB_TOKEN environment variable.`,
              },
            ],
          };
        }

        try {
          // First get the current file to get its SHA
          const currentFile = await github.getFile(repository, path, branch);
          const sha = currentFile.sha;
          
          const result = await github.deleteFile(repository, path, message, sha, branch);

          const memory = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            content: `# GitHub File Deleted: ${path}\n\n**Repository:** ${repository}\n**Branch:** ${branch}\n**Commit:** ${result.commit.html_url}\n**Deleted SHA:** ${sha}\n\n## Deletion Details\n- **Path:** ${path}\n- **Message:** ${message}\n- **Size:** ${currentFile.size} bytes (deleted)\n\n*File deleted via MCP GitHub integration*`,
            tags: ['github', 'file-deletion', repository.split('/')[1], path.split('/').pop()?.split('.').pop() || 'file'],
            category: 'code',
            project: project || 'github-files',
            priority: 'medium',
            status: 'active',
            timestamp: new Date().toISOString(),
            access_count: 0,
            last_accessed: new Date().toISOString(),
          };

          await storage.saveMemory(memory);

          return {
            content: [
              {
                type: 'text',
                text: `✅ File deleted successfully from ${repository}!\n\n📁 Path: ${path}\n🌿 Branch: ${branch}\n🔗 Commit: ${result.commit.html_url}\n💾 Memory ID: ${memory.id}\n📂 Project: ${project || 'github-files'}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ Failed to delete file: ${error.message}\n\nPlease check:\n- Repository exists and you have write access\n- File exists at the specified path\n- Branch exists\n- GitHub token has contents:write permission`,
              },
            ],
            isError: true,
          };
        }
      }

      case 'github_create_branch': {
        const { repository, branch_name, from_branch = 'main', project } = args;

        if (!github.token) {
          return {
            content: [
              {
                type: 'text',
                text: `⚠️ GitHub token required for branch operations. Set GITHUB_TOKEN environment variable.`,
              },
            ],
          };
        }

        try {
          const result = await github.createBranch(repository, branch_name, from_branch);

          const memory = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            content: `# GitHub Branch Created: ${branch_name}\n\n**Repository:** ${repository}\n**New Branch:** ${branch_name}\n**Source Branch:** ${from_branch}\n**Reference:** ${result.ref}\n**SHA:** ${result.object.sha}\n\n## Branch Details\n- Created from: ${from_branch}\n- Full reference: ${result.ref}\n- Target SHA: ${result.object.sha}\n\n*Branch created via MCP GitHub integration*`,
            tags: ['github', 'branch-creation', repository.split('/')[1], branch_name],
            category: 'code',
            project: project || 'github-branches',
            priority: 'medium',
            status: 'active',
            timestamp: new Date().toISOString(),
            access_count: 0,
            last_accessed: new Date().toISOString(),
          };

          await storage.saveMemory(memory);

          return {
            content: [
              {
                type: 'text',
                text: `✅ Branch created successfully in ${repository}!\n\n🌿 New Branch: ${branch_name}\n📋 Source: ${from_branch}\n🔗 Reference: ${result.ref}\n📄 SHA: ${result.object.sha}\n💾 Memory ID: ${memory.id}\n📂 Project: ${project || 'github-branches'}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ Failed to create branch: ${error.message}\n\nPlease check:\n- Repository exists and you have write access\n- Source branch exists\n- Branch name doesn't already exist\n- GitHub token has contents:write permission`,
              },
            ],
            isError: true,
          };
        }
      }

      case 'github_create_pr': {
        const { repository, title, body, head, base = 'main', project } = args;

        if (!github.token) {
          return {
            content: [
              {
                type: 'text',
                text: `⚠️ GitHub token required for pull request operations. Set GITHUB_TOKEN environment variable.`,
              },
            ],
          };
        }

        try {
          const pr = await github.createPullRequest(repository, title, body, head, base);

          const memory = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            content: `# GitHub Pull Request: ${title}\n\n**Repository:** ${repository}\n**PR URL:** ${pr.html_url}\n**Number:** #${pr.number}\n**State:** ${pr.state}\n**Head Branch:** ${head}\n**Base Branch:** ${base}\n\n## Description\n${body}\n\n## PR Details\n- **Author:** @${pr.user.login}\n- **Created:** ${new Date(pr.created_at).toLocaleString()}\n- **Mergeable:** ${pr.mergeable || 'Unknown'}\n- **Commits:** ${pr.commits || 'Unknown'}\n- **Changed Files:** ${pr.changed_files || 'Unknown'}\n\n*Pull request created via MCP GitHub integration*`,
            tags: ['github', 'pull-request', repository.split('/')[1], head, base],
            category: 'code',
            project: project || 'github-prs',
            priority: 'high',
            status: 'active',
            timestamp: new Date().toISOString(),
            access_count: 0,
            last_accessed: new Date().toISOString(),
          };

          await storage.saveMemory(memory);

          return {
            content: [
              {
                type: 'text',
                text: `✅ Pull request created successfully!\n\n🔗 PR URL: ${pr.html_url}\n📋 PR #${pr.number}: ${title}\n📁 Repository: ${repository}\n🌿 ${head} → ${base}\n👤 Author: @${pr.user.login}\n💾 Memory ID: ${memory.id}\n📂 Project: ${project || 'github-prs'}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ Failed to create pull request: ${error.message}\n\nPlease check:\n- Repository exists and you have write access\n- Head and base branches exist\n- There are differences between branches\n- GitHub token has pull_requests:write permission`,
              },
            ],
            isError: true,
          };
        }
      }

      case 'github_fork_repo': {
        const { repository, project } = args;

        if (!github.token) {
          return {
            content: [
              {
                type: 'text',
                text: `⚠️ GitHub token required for fork operations. Set GITHUB_TOKEN environment variable.`,
              },
            ],
          };
        }

        try {
          const fork = await github.forkRepository(repository);

          const memory = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            content: `# GitHub Repository Forked: ${repository}\n\n**Original Repository:** ${repository}\n**Forked Repository:** ${fork.full_name}\n**Fork URL:** ${fork.html_url}\n**Clone URL:** ${fork.clone_url}\n**SSH URL:** ${fork.ssh_url}\n\n## Fork Details\n- **Owner:** @${fork.owner.login}\n- **Created:** ${new Date(fork.created_at).toLocaleString()}\n- **Private:** ${fork.private}\n- **Default Branch:** ${fork.default_branch}\n\n## Original Repository Info\n- **Stars:** ⭐ ${fork.parent.stargazers_count}\n- **Forks:** 🍴 ${fork.parent.forks_count}\n- **Language:** ${fork.parent.language || 'Not specified'}\n\n*Repository forked via MCP GitHub integration*`,
            tags: ['github', 'fork', repository.split('/')[1], fork.name],
            category: 'code',
            project: project || 'github-forks',
            priority: 'medium',
            status: 'active',
            timestamp: new Date().toISOString(),
            access_count: 0,
            last_accessed: new Date().toISOString(),
          };

          await storage.saveMemory(memory);

          return {
            content: [
              {
                type: 'text',
                text: `✅ Repository forked successfully!\n\n📦 Original: ${repository}\n🍴 Fork: ${fork.full_name}\n🔗 Fork URL: ${fork.html_url}\n📥 Clone: ${fork.clone_url}\n👤 Owner: @${fork.owner.login}\n💾 Memory ID: ${memory.id}\n📂 Project: ${project || 'github-forks'}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ Failed to fork repository: ${error.message}\n\nPlease check:\n- Repository exists and is public (or you have access)\n- You haven't already forked this repository\n- GitHub token has repo permissions`,
              },
            ],
            isError: true,
          };
        }
      }

      case 'github_list_branches': {
        const { repository, project } = args;

        try {
          const branches = await github.listBranches(repository);

          if (branches.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: `🌿 No branches found in ${repository}`,
                },
              ],
            };
          }

          const branchList = branches.map(branch =>
            `- **${branch.name}** ${branch.protected ? '🔒' : ''}\n  SHA: ${branch.commit.sha}\n  ${branch.name === 'main' || branch.name === 'master' ? '📌 Default branch' : ''}`
          ).join('\n\n');

          const memory = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            content: `# GitHub Branches: ${repository}\n\n**Repository:** ${repository}\n**Total Branches:** ${branches.length}\n\n## Branches\n\n${branchList}\n\n*Branches retrieved via MCP GitHub integration*`,
            tags: ['github', 'branches', repository.split('/')[1]],
            category: 'code',
            project: project || 'github-branches',
            priority: 'medium',
            status: 'active',
            timestamp: new Date().toISOString(),
            access_count: 0,
            last_accessed: new Date().toISOString(),
          };

          await storage.saveMemory(memory);

          const branchSummary = branches.map(branch =>
            `🌿 ${branch.name} ${branch.protected ? '🔒' : ''} (${branch.commit.sha.substring(0, 7)})`
          ).join('\n');

          return {
            content: [
              {
                type: 'text',
                text: `🌿 Found ${branches.length} branches in ${repository}:\n\n${branchSummary}\n\n💾 Branch list stored as memory (ID: ${memory.id})\n📂 Project: ${project || 'github-branches'}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ Failed to list branches: ${error.message}\n\nPlease check:\n- Repository exists and is accessible\n- Repository format is "owner/repo"`,
              },
            ],
            isError: true,
          };
        }
      }

      case 'github_get_commits': {
        const { repository, branch = 'main', limit = 10, project } = args;

        try {
          const commits = await github.getCommits(repository, branch, limit);

          if (commits.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: `📝 No commits found in ${repository} on branch ${branch}`,
                },
              ],
            };
          }

          const commitList = commits.map(commit =>
            `- **${commit.sha.substring(0, 7)}** ${commit.commit.message.split('\n')[0]}\n  👤 ${commit.commit.author.name} | 📅 ${new Date(commit.commit.author.date).toLocaleDateString()}\n  🔗 ${commit.html_url}`
          ).join('\n\n');

          const memory = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            content: `# GitHub Commits: ${repository}\n\n**Repository:** ${repository}\n**Branch:** ${branch}\n**Total Commits:** ${commits.length}\n\n## Recent Commits\n\n${commitList}\n\n*Commits retrieved via MCP GitHub integration*`,
            tags: ['github', 'commits', repository.split('/')[1], branch],
            category: 'code',
            project: project || 'github-commits',
            priority: 'medium',
            status: 'active',
            timestamp: new Date().toISOString(),
            access_count: 0,
            last_accessed: new Date().toISOString(),
          };

          await storage.saveMemory(memory);

          const commitSummary = commits.map(commit =>
            `📝 ${commit.sha.substring(0, 7)}: ${commit.commit.message.split('\n')[0]} (@${commit.commit.author.name})`
          ).join('\n');

          return {
            content: [
              {
                type: 'text',
                text: `📝 Found ${commits.length} recent commits in ${repository} (${branch}):\n\n${commitSummary}\n\n💾 Commit history stored as memory (ID: ${memory.id})\n📂 Project: ${project || 'github-commits'}`,
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ Failed to get commits: ${error.message}\n\nPlease check:\n- Repository exists and is accessible\n- Branch exists\n- Repository format is "owner/repo"`,
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
  console.error('Like I Said Memory MCP Server v2 started successfully');
}

main().catch(console.error);