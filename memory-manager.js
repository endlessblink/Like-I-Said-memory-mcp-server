import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

class MemoryManager {
  constructor(options = {}) {
    this.baseDir = options.baseDir || path.join(process.cwd(), 'memories');
    this.currentProject = options.project || this.detectProject();
    this.sandboxed = options.sandboxed !== false;
    
    this.ensureDirectories();
  }

  detectProject() {
    // Detect project from git or directory name
    try {
      const gitPath = path.join(process.cwd(), '.git');
      if (fs.existsSync(gitPath)) {
        return path.basename(process.cwd());
      }
    } catch {}
    return 'default';
  }

  ensureDirectories() {
    const dirs = [
      this.baseDir,
      path.join(this.baseDir, 'global'),
      path.join(this.baseDir, 'projects'),
      path.join(this.baseDir, 'projects', this.currentProject)
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  validatePath(memoryPath) {
    if (!this.sandboxed) return true;
    
    const resolvedPath = path.resolve(memoryPath);
    const basePath = path.resolve(this.baseDir);
    
    return resolvedPath.startsWith(basePath) && resolvedPath.endsWith('.md');
  }

  parseMemory(content) {
    const lines = content.split('\n');
    const metadata = {};
    let contentStart = 0;
    let inFrontmatter = false;

    // Parse frontmatter
    if (lines[0] === '---') {
      inFrontmatter = true;
      for (let i = 1; i < lines.length; i++) {
        if (lines[i] === '---') {
          contentStart = i + 1;
          break;
        }
        const [key, ...valueParts] = lines[i].split(':');
        if (key && valueParts.length) {
          const value = valueParts.join(':').trim();
          try {
            // Try to parse as JSON for arrays/objects
            metadata[key.trim()] = JSON.parse(value);
          } catch {
            metadata[key.trim()] = value;
          }
        }
      }
    }

    const mainContent = lines.slice(contentStart).join('\n').trim();
    
    // Extract links from content
    const linkRegex = /\[\[([^\]]+)\]\]/g;
    const links = [];
    let match;
    while ((match = linkRegex.exec(mainContent)) !== null) {
      links.push(match[1]);
    }

    // Extract tags
    const tagRegex = /#([a-zA-Z0-9_-]+)/g;
    const tags = [];
    while ((match = tagRegex.exec(mainContent)) !== null) {
      tags.push(match[1]);
    }

    return {
      metadata: {
        ...metadata,
        links: metadata.links || links,
        tags: metadata.tags || tags,
        id: metadata.id || crypto.createHash('md5').update(mainContent).digest('hex').slice(0, 8)
      },
      content: mainContent
    };
  }

  formatMemory(data) {
    const { metadata, content } = data;
    const frontmatter = Object.keys(metadata)
      .filter(key => !['links', 'tags'].includes(key))
      .map(key => `${key}: ${JSON.stringify(metadata[key])}`)
      .join('\n');

    const links = metadata.links?.length ? `\nLinks: ${metadata.links.map(l => `[[${l}]]`).join(', ')}` : '';
    const tags = metadata.tags?.length ? `\nTags: ${metadata.tags.map(t => `#${t}`).join(' ')}` : '';

    return `---
${frontmatter}
---
${links}${tags}

${content}`;
  }

  getMemoryPath(key, scope = 'project') {
    const filename = `${key.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`;
    
    switch (scope) {
      case 'global':
        return path.join(this.baseDir, 'global', filename);
      case 'project':
        return path.join(this.baseDir, 'projects', this.currentProject, filename);
      default:
        return path.join(this.baseDir, 'projects', scope, filename);
    }
  }

  async addMemory(key, value, context = {}) {
    const memoryPath = this.getMemoryPath(key, context.scope);
    
    if (!this.validatePath(memoryPath)) {
      throw new Error('Invalid memory path');
    }

    const memory = {
      metadata: {
        id: context.id || crypto.createHash('md5').update(key + value).digest('hex').slice(0, 8),
        title: context.title || key,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        scope: context.scope || 'project',
        project: this.currentProject,
        tags: context.tags || [],
        links: context.links || [],
        ...context
      },
      content: value
    };

    const formatted = this.formatMemory(memory);
    fs.writeFileSync(memoryPath, formatted, 'utf8');

    // Update backlinks
    await this.updateBacklinks(memory.metadata.links, key);

    return memory;
  }

  async getMemory(key, scope = 'project') {
    const memoryPath = this.getMemoryPath(key, scope);
    
    if (!this.validatePath(memoryPath) || !fs.existsSync(memoryPath)) {
      // Try global scope if project scope fails
      if (scope === 'project') {
        return this.getMemory(key, 'global');
      }
      return null;
    }

    const content = fs.readFileSync(memoryPath, 'utf8');
    const parsed = this.parseMemory(content);
    
    return {
      key,
      path: memoryPath,
      ...parsed
    };
  }

  async listMemories(prefix = '', scope = 'all') {
    const memories = [];
    const scopes = scope === 'all' ? ['global', 'project'] : [scope];

    for (const currentScope of scopes) {
      const dir = currentScope === 'global' 
        ? path.join(this.baseDir, 'global')
        : path.join(this.baseDir, 'projects', this.currentProject);

      if (!fs.existsSync(dir)) continue;

      const files = fs.readdirSync(dir)
        .filter(file => file.endsWith('.md'))
        .filter(file => !prefix || file.startsWith(prefix));

      for (const file of files) {
        const key = path.basename(file, '.md');
        const memory = await this.getMemory(key, currentScope);
        if (memory) memories.push(memory);
      }
    }

    return memories;
  }

  async searchMemories(query, scope = 'all') {
    const memories = await this.listMemories('', scope);
    const results = [];

    for (const memory of memories) {
      const searchText = `${memory.metadata.title} ${memory.content} ${memory.metadata.tags?.join(' ')}`.toLowerCase();
      if (searchText.includes(query.toLowerCase())) {
        results.push({
          ...memory,
          relevance: this.calculateRelevance(memory, query)
        });
      }
    }

    return results.sort((a, b) => b.relevance - a.relevance);
  }

  calculateRelevance(memory, query) {
    const queryLower = query.toLowerCase();
    let score = 0;

    // Title match (highest weight)
    if (memory.metadata.title?.toLowerCase().includes(queryLower)) score += 10;
    
    // Content match
    if (memory.content.toLowerCase().includes(queryLower)) score += 5;
    
    // Tag match
    if (memory.metadata.tags?.some(tag => tag.toLowerCase().includes(queryLower))) score += 3;

    return score;
  }

  async deleteMemory(key, scope = 'project') {
    const memoryPath = this.getMemoryPath(key, scope);
    
    if (!this.validatePath(memoryPath) || !fs.existsSync(memoryPath)) {
      return false;
    }

    // Get memory to update backlinks
    const memory = await this.getMemory(key, scope);
    if (memory?.metadata.links) {
      await this.removeBacklinks(memory.metadata.links, key);
    }

    fs.unlinkSync(memoryPath);
    return true;
  }

  async updateBacklinks(links, fromKey) {
    for (const linkKey of links || []) {
      const targetMemory = await this.getMemory(linkKey);
      if (targetMemory) {
        const backlinks = targetMemory.metadata.backlinks || [];
        if (!backlinks.includes(fromKey)) {
          backlinks.push(fromKey);
          targetMemory.metadata.backlinks = backlinks;
          targetMemory.metadata.updated = new Date().toISOString();
          
          const formatted = this.formatMemory(targetMemory);
          const targetPath = this.getMemoryPath(linkKey, targetMemory.metadata.scope);
          fs.writeFileSync(targetPath, formatted, 'utf8');
        }
      }
    }
  }

  async removeBacklinks(links, fromKey) {
    for (const linkKey of links || []) {
      const targetMemory = await this.getMemory(linkKey);
      if (targetMemory?.metadata.backlinks) {
        targetMemory.metadata.backlinks = targetMemory.metadata.backlinks.filter(bl => bl !== fromKey);
        targetMemory.metadata.updated = new Date().toISOString();
        
        const formatted = this.formatMemory(targetMemory);
        const targetPath = this.getMemoryPath(linkKey, targetMemory.metadata.scope);
        fs.writeFileSync(targetPath, formatted, 'utf8');
      }
    }
  }

  async getMemoryGraph() {
    const memories = await this.listMemories();
    const nodes = memories.map(memory => ({
      id: memory.key,
      title: memory.metadata.title,
      content: memory.content.slice(0, 200) + (memory.content.length > 200 ? '...' : ''),
      tags: memory.metadata.tags || [],
      scope: memory.metadata.scope,
      created: memory.metadata.created,
      linkCount: (memory.metadata.links?.length || 0) + (memory.metadata.backlinks?.length || 0),
      size: Math.max(15, Math.min(30, memory.content.length / 20)) // Dynamic node size
    }));

    const edges = [];
    
    // Forward links (solid blue lines)
    memories.forEach(memory => {
      memory.metadata.links?.forEach(link => {
        if (memories.find(m => m.key === link)) {
          edges.push({
            source: memory.key,
            target: link,
            type: 'link',
            strength: 1
          });
        }
      });
    });

    // Backlinks (dashed red lines)
    memories.forEach(memory => {
      memory.metadata.backlinks?.forEach(backlink => {
        if (memories.find(m => m.key === backlink)) {
          edges.push({
            source: backlink,
            target: memory.key,
            type: 'backlink',
            strength: 0.5
          });
        }
      });
    });

    // Tag-based connections (weak dotted gray lines)
    memories.forEach(memory1 => {
      memories.forEach(memory2 => {
        if (memory1.key !== memory2.key) {
          const sharedTags = memory1.metadata.tags?.filter(tag => 
            memory2.metadata.tags?.includes(tag)
          ) || [];
          
          if (sharedTags.length > 0) {
            edges.push({
              source: memory1.key,
              target: memory2.key,
              type: 'tag-similarity',
              strength: 0.2,
              sharedTags
            });
          }
        }
      });
    });

    return { 
      nodes, 
      edges,
      stats: {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        linkTypes: {
          direct: edges.filter(e => e.type === 'link').length,
          backlinks: edges.filter(e => e.type === 'backlink').length,
          tagSimilarity: edges.filter(e => e.type === 'tag-similarity').length
        }
      }
    };
  }

  setProject(projectName) {
    this.currentProject = projectName;
    this.ensureDirectories();
  }

  listProjects() {
    const projectsDir = path.join(this.baseDir, 'projects');
    if (!fs.existsSync(projectsDir)) return [];
    
    return fs.readdirSync(projectsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
  }
}

export default MemoryManager;