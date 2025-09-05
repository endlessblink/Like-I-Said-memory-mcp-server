/**
 * Minimal Storage Service
 * Lightweight memory storage without heavy dependencies
 */

import fs from 'fs';
import path from 'path';

export class MinimalStorage {
  constructor(baseDir = 'memories') {
    this.baseDir = baseDir;
    this.ensureDirectories();
  }

  ensureDirectories() {
    try {
      if (!fs.existsSync(this.baseDir)) {
        fs.mkdirSync(this.baseDir, { recursive: true });
      }
      const defaultDir = path.join(this.baseDir, 'default');
      if (!fs.existsSync(defaultDir)) {
        fs.mkdirSync(defaultDir, { recursive: true });
      }
    } catch (error) {
      console.error(`Directory creation issue: ${error.message}`);
    }
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  async saveMemory(content, metadata = {}) {
    const memory = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      content: content,
      project: metadata.project || 'default',
      tags: metadata.tags || [],
      complexity: this.detectComplexity(content),
      category: this.detectCategory(content),
      ...metadata
    };

    const filename = this.generateFilename(memory);
    const filepath = path.join(this.baseDir, memory.project, filename);
    
    // Ensure project directory exists
    const projectDir = path.join(this.baseDir, memory.project);
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    const markdownContent = this.formatMemory(memory);
    fs.writeFileSync(filepath, markdownContent, 'utf8');
    
    return memory;
  }

  detectComplexity(content) {
    const length = content.length;
    if (length > 2000) return 4;
    if (length > 1000) return 3;
    if (length > 500) return 2;
    return 1;
  }

  detectCategory(content) {
    const lowerContent = content.toLowerCase();
    if (lowerContent.includes('code') || lowerContent.includes('function') || lowerContent.includes('class')) {
      return 'code';
    }
    if (lowerContent.includes('task') || lowerContent.includes('todo')) {
      return 'task';
    }
    if (lowerContent.includes('research') || lowerContent.includes('analysis')) {
      return 'research';
    }
    return 'general';
  }

  generateFilename(memory) {
    const date = new Date(memory.timestamp);
    const dateStr = date.toISOString().split('T')[0];
    const title = (memory.title || memory.content.substring(0, 50))
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .substring(0, 30);
    return `${dateStr}-${title}-${memory.id}.md`;
  }

  formatMemory(memory) {
    const frontmatter = [
      '---',
      `id: ${memory.id}`,
      `timestamp: ${memory.timestamp}`,
      `complexity: ${memory.complexity}`,
      `category: ${memory.category}`,
      memory.project ? `project: ${memory.project}` : null,
      memory.tags?.length > 0 ? `tags: ${JSON.stringify(memory.tags)}` : 'tags: []',
      '---',
      ''
    ].filter(line => line !== null).join('\n');

    return frontmatter + (memory.content || '');
  }

  async listMemories(filters = {}) {
    const memories = [];
    const scanDir = (dir) => {
      if (!fs.existsSync(dir)) return;
      
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (entry.name.endsWith('.md')) {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            const memory = this.parseMemory(content, fullPath);
            if (memory && this.matchesFilters(memory, filters)) {
              memories.push(memory);
            }
          } catch (error) {
            console.error(`Error reading ${fullPath}: ${error.message}`);
          }
        }
      }
    };

    scanDir(this.baseDir);
    return memories.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  parseMemory(content, filepath) {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!frontmatterMatch) return null;

    const memory = { content: frontmatterMatch[2].trim() };
    const frontmatter = frontmatterMatch[1];
    
    const lines = frontmatter.split('\n');
    lines.forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) return;
      
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      
      if (key === 'tags' && value.startsWith('[')) {
        try {
          memory[key] = JSON.parse(value);
        } catch {
          memory[key] = [];
        }
      } else if (key === 'complexity') {
        memory[key] = parseInt(value) || 1;
      } else {
        memory[key] = value;
      }
    });

    memory.filepath = filepath;
    return memory;
  }

  matchesFilters(memory, filters) {
    if (filters.project && memory.project !== filters.project) return false;
    if (filters.category && memory.category !== filters.category) return false;
    if (filters.minComplexity && memory.complexity < filters.minComplexity) return false;
    return true;
  }

  async searchMemories(query) {
    const allMemories = await this.listMemories();
    const queryLower = query.toLowerCase();
    
    return allMemories.filter(memory => 
      memory.content.toLowerCase().includes(queryLower) ||
      memory.tags?.some(tag => tag.toLowerCase().includes(queryLower))
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