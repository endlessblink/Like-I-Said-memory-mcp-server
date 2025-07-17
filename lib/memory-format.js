#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

/**
 * Shared memory format parser and generator
 * Used by both MCP server and dashboard to ensure consistency
 */

export class MemoryFormat {
  static FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---([\s\S]*)$/;
  static HTML_COMMENT_REGEX = /<!-- Memory Metadata\s*([\s\S]*?)\s*-->/;

  /**
   * Parse memory content from multiple possible formats
   * Supports both YAML frontmatter and HTML comment metadata
   */
  static parseMemoryContent(content) {
    if (!content || typeof content !== 'string') return null;

    // Try YAML frontmatter first (preferred format)
    const frontmatterMatch = content.match(this.FRONTMATTER_REGEX);
    if (frontmatterMatch) {
      return this.parseFrontmatter(frontmatterMatch[1], frontmatterMatch[2]);
    }

    // Try HTML comment metadata (legacy format)
    const htmlMatch = content.match(this.HTML_COMMENT_REGEX);
    if (htmlMatch) {
      return this.parseHtmlComment(content, htmlMatch[1]);
    }

    // No metadata found - return null
    return null;
  }

  /**
   * Parse YAML frontmatter format
   */
  static parseFrontmatter(frontmatter, bodyContent) {
    const memory = { 
      content: bodyContent.trim(), 
      metadata: {},
      format: 'yaml'
    };

    const lines = frontmatter.split(/\r?\n/);
    let inMetadata = false;

    lines.forEach(line => {
      if (line.trim() === 'metadata:') {
        inMetadata = true;
        return;
      }
      
      if (inMetadata && line.startsWith('  ')) {
        const metaLine = line.slice(2);
        const colonIndex = metaLine.indexOf(':');
        if (colonIndex === -1) return;
        
        const key = metaLine.slice(0, colonIndex).trim();
        const value = metaLine.slice(colonIndex + 1).trim();
        
        memory.metadata[key] = this.parseValue(value);
        return;
      }
      
      inMetadata = false;
      
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) return;

      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();

      // Handle special fields
      switch (key) {
        case 'tags':
        case 'related_memories':
          memory[key] = this.parseArrayValue(value);
          break;
        case 'complexity':
        case 'access_count':
          memory[key] = parseInt(value) || 0;
          break;
        case 'id':
        case 'timestamp':
        case 'category':
        case 'project':
        case 'priority':
        case 'status':
        case 'last_accessed':
          memory[key] = value;
          break;
      }
    });

    return memory;
  }

  /**
   * Parse HTML comment metadata format (legacy)
   */
  static parseHtmlComment(fullContent, metadataContent) {
    const memory = {
      content: fullContent.replace(this.HTML_COMMENT_REGEX, '').trim(),
      metadata: {},
      format: 'html-comment'
    };

    const lines = metadataContent.trim().split(/\r?\n/);
    
    lines.forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) return;

      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();

      switch (key) {
        case 'tags':
          // HTML comment format uses comma-separated tags
          memory[key] = value.split(',').map(t => t.trim()).filter(Boolean);
          break;
        case 'id':
        case 'timestamp':
          memory[key] = value;
          break;
      }
    });

    // Set defaults for missing fields
    if (!memory.complexity) memory.complexity = 1;
    if (!memory.priority) memory.priority = 'medium';
    if (!memory.status) memory.status = 'active';
    if (!memory.access_count) memory.access_count = 0;

    return memory;
  }

  /**
   * Parse array values from different formats
   */
  static parseArrayValue(value) {
    if (!value) return [];
    
    // Handle JSON array format ["tag1", "tag2"]
    if (value.startsWith('[') && value.endsWith(']')) {
      try {
        return JSON.parse(value);
      } catch {
        // Fallback to comma splitting
        return value.slice(1, -1).split(',').map(t => t.trim().replace(/['"]/g, '')).filter(Boolean);
      }
    }
    
    // Handle comma-separated format
    return value.split(',').map(t => t.trim()).filter(Boolean);
  }

  /**
   * Parse a value to its correct type
   */
  static parseValue(value) {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (/^\d+$/.test(value)) return parseInt(value);
    if (/^\d+\.\d+$/.test(value)) return parseFloat(value);
    return value;
  }

  /**
   * Generate standardized YAML frontmatter format
   */
  static generateMarkdownContent(memory) {
    const frontmatter = [
      '---',
      `id: ${memory.id}`,
      `timestamp: ${memory.timestamp}`,
      `complexity: ${memory.complexity || 1}`,
      memory.category ? `category: ${memory.category}` : null,
      memory.project ? `project: ${memory.project}` : null,
      memory.tags && memory.tags.length > 0 ? `tags: ${JSON.stringify(memory.tags)}` : 'tags: []',
      `priority: ${memory.priority || 'medium'}`,
      `status: ${memory.status || 'active'}`,
      memory.related_memories && memory.related_memories.length > 0 
        ? `related_memories: ${JSON.stringify(memory.related_memories)}` 
        : null,
      `access_count: ${memory.access_count || 0}`,
      `last_accessed: ${memory.last_accessed || memory.timestamp}`,
      'metadata:',
      `  content_type: ${memory.metadata?.content_type || 'text'}`,
      memory.metadata?.language ? `  language: ${memory.metadata.language}` : null,
      `  size: ${memory.content?.length || 0}`,
      `  mermaid_diagram: ${memory.metadata?.mermaid_diagram || false}`,
      '---',
      ''
    ].filter(line => line !== null).join('\n');

    return frontmatter + (memory.content || '');
  }

  /**
   * Parse a memory file from disk
   */
  static parseMemoryFile(filepath) {
    try {
      const content = fs.readFileSync(filepath, 'utf8');
      const memory = this.parseMemoryContent(content);
      
      if (!memory) return null;

      // Add file metadata
      memory.filename = path.basename(filepath);
      memory.filepath = filepath;
      
      // Extract project from directory structure
      const projectName = path.basename(path.dirname(filepath));
      if (projectName !== 'default' && projectName !== 'memories') {
        memory.project = projectName;
      }

      // Ensure all required fields exist
      this.ensureRequiredFields(memory);
      
      return memory;
    } catch (error) {
      console.error(`Error parsing memory file ${filepath}:`, error);
      return null;
    }
  }

  /**
   * Ensure memory has all required fields for compatibility
   */
  static ensureRequiredFields(memory) {
    // Core fields
    if (!memory.id) memory.id = path.basename(memory.filename || '', '.md');
    if (!memory.timestamp) memory.timestamp = new Date().toISOString();
    if (!memory.complexity) memory.complexity = 1;
    if (!memory.priority) memory.priority = 'medium';
    if (!memory.status) memory.status = 'active';
    if (!memory.access_count) memory.access_count = 0;
    if (!memory.last_accessed) memory.last_accessed = memory.timestamp;
    if (!memory.tags) memory.tags = [];
    
    // Metadata fields
    if (!memory.metadata) memory.metadata = {};
    if (!memory.metadata.content_type) memory.metadata.content_type = 'text';
    if (!memory.metadata.size) memory.metadata.size = memory.content?.length || 0;
    if (memory.metadata.mermaid_diagram === undefined) {
      memory.metadata.mermaid_diagram = false;
    }
    
    // Dashboard compatibility fields
    if (!memory.metadata.clients) memory.metadata.clients = [];
    if (!memory.metadata.accessCount) memory.metadata.accessCount = memory.access_count;
    if (!memory.metadata.created) memory.metadata.created = memory.timestamp;
    if (!memory.metadata.modified) memory.metadata.modified = memory.timestamp;
    if (!memory.metadata.lastAccessed) memory.metadata.lastAccessed = memory.last_accessed;
    if (!memory.metadata.contentType) memory.metadata.contentType = memory.metadata.content_type;
    
    return memory;
  }

  /**
   * Migrate a memory from old format to new format
   */
  static migrateMemory(filepath) {
    const memory = this.parseMemoryFile(filepath);
    if (!memory) return false;

    // If already in YAML format, skip
    if (memory.format === 'yaml') return true;

    // Generate new content with YAML frontmatter
    const newContent = this.generateMarkdownContent(memory);
    
    try {
      fs.writeFileSync(filepath, newContent, 'utf8');
      console.error(`✅ Migrated: ${filepath}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to migrate ${filepath}:`, error);
      return false;
    }
  }

  /**
   * Scan and migrate all memories in a directory
   */
  static async migrateAllMemories(memoriesDir) {
    let migrated = 0;
    let failed = 0;
    let skipped = 0;

    const scanDir = (dir) => {
      if (!fs.existsSync(dir)) return;
      
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (entry.name.endsWith('.md')) {
          const memory = this.parseMemoryFile(fullPath);
          if (!memory) {
            failed++;
          } else if (memory.format === 'html-comment') {
            if (this.migrateMemory(fullPath)) {
              migrated++;
            } else {
              failed++;
            }
          } else {
            skipped++;
          }
        }
      }
    };

    console.error('🔄 Starting memory format migration...');
    scanDir(memoriesDir);
    
    console.error(`\n📊 Migration complete:`);
    console.error(`✅ Migrated: ${migrated}`);
    console.error(`⏭️  Skipped: ${skipped} (already in correct format)`);
    console.error(`❌ Failed: ${failed}`);
    
    return { migrated, skipped, failed };
  }
}

export default MemoryFormat;