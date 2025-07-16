import fs from 'fs';
import path from 'path';
import { MemoryFormat } from './memory-format.js';

/**
 * Simple memory storage wrapper for dashboard-server-bridge
 * Provides memory search functionality needed by TaskMemoryLinker
 */
export class MemoryStorageWrapper {
  constructor(baseDir = null) {
    this.baseDir = baseDir || process.env.MEMORY_DIR || 'memories';
    this.ensureDirectories();
  }

  ensureDirectories() {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  /**
   * List all memories from all projects
   */
  async listMemories() {
    const memories = [];
    
    try {
      const projects = fs.readdirSync(this.baseDir).filter(dir => {
        const dirPath = path.join(this.baseDir, dir);
        return fs.statSync(dirPath).isDirectory();
      });

      for (const project of projects) {
        const projectDir = path.join(this.baseDir, project);
        const files = fs.readdirSync(projectDir).filter(f => f.endsWith('.md'));
        
        for (const file of files) {
          try {
            const filePath = path.join(projectDir, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            const memory = MemoryFormat.parseMemoryContent(content);
            if (memory) {
              memory.filepath = filePath;
              memory.filename = file;
              memories.push(memory);
            }
          } catch (error) {
            console.error(`Error parsing memory file ${file}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error listing memories:', error);
    }

    return memories;
  }

  /**
   * Get a specific memory by ID
   */
  async getMemory(id) {
    const memories = await this.listMemories();
    return memories.find(m => m.id === id) || null;
  }

  /**
   * Search memories by query
   */
  async searchMemories(query) {
    const memories = await this.listMemories();
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);
    
    if (searchTerms.length === 0) {
      return memories;
    }

    const results = [];
    
    for (const memory of memories) {
      let score = 0;
      const searchableText = [
        memory.content,
        memory.project || '',
        memory.category || '',
        ...(memory.tags || [])
      ].join(' ').toLowerCase();

      for (const term of searchTerms) {
        if (searchableText.includes(term)) {
          score++;
        }
      }

      if (score > 0) {
        results.push({
          ...memory,
          relevance: score / searchTerms.length
        });
      }
    }

    return results.sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * Update memory (needed by TaskMemoryLinker)
   */
  async updateMemory(id, updates) {
    // This is a simplified implementation
    // In production, this would update the actual markdown file
    console.error(`Memory update requested for ${id}:`, updates);
    return { id, ...updates };
  }
}