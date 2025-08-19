/**
 * V3PathManager - Semantic folder structure management
 * Handles path generation, validation, and migration with cross-platform support
 */

import path from 'path';
import { promises as fs } from 'fs';
import crypto from 'crypto';

export class V3PathManager {
  constructor(options = {}) {
    this.baseDir = options.baseDir || 'tasks';
    this.maxPathLength = this.detectPlatformLimits();
    this.reservedChars = this.getReservedChars();
    this.pathCache = new Map();
    this.slugCache = new Map();
  }

  /**
   * Detect platform-specific path length limits
   */
  detectPlatformLimits() {
    const platform = process.platform;
    
    // Conservative limits accounting for full paths
    if (platform === 'win32') {
      return 200; // Windows limit minus buffer
    } else if (platform === 'darwin') {
      return 900; // macOS limit minus buffer  
    } else {
      return 200; // Linux/default conservative limit
    }
  }

  /**
   * Get platform-specific reserved characters
   */
  getReservedChars() {
    const platform = process.platform;
    const common = ['/', '\\', ':', '*', '?', '"', '<', '>', '|', '\0'];
    
    if (platform === 'win32') {
      // Windows has more restrictions
      return [...common, ...Array.from({length: 32}, (_, i) => String.fromCharCode(i))];
    }
    
    return common;
  }

  /**
   * Generate semantic path for a task
   */
  async generateSemanticPath(task, parentPath = null) {
    // Build hierarchy components
    const components = [];
    
    if (parentPath) {
      components.push(parentPath);
    }
    
    // Add task component
    const taskComponent = this.generateTaskComponent(task);
    components.push(taskComponent);
    
    // Join and validate
    let semanticPath = path.join(...components);
    
    // Ensure path length is within limits
    if (semanticPath.length > this.maxPathLength) {
      semanticPath = await this.truncatePath(semanticPath, task);
    }
    
    return semanticPath;
  }

  /**
   * Generate task component for path (level-prefix + slug)
   */
  generateTaskComponent(task) {
    const levelPrefix = this.getLevelPrefix(task.level);
    const slug = this.generateSlug(task.title, task.id);
    const pathNumber = String(task.path_order || 1).padStart(3, '0');
    
    return `${pathNumber}-${levelPrefix}-${slug}`;
  }

  /**
   * Get level prefix for semantic organization
   */
  getLevelPrefix(level) {
    const prefixes = {
      'master': 'PROJECT',
      'epic': 'STAGE',
      'task': 'TASK',
      'subtask': 'SUB'
    };
    
    return prefixes[level] || 'TASK';
  }

  /**
   * Generate URL-safe slug from title
   */
  generateSlug(title, id) {
    // Check cache first
    const cacheKey = `${title}-${id}`;
    if (this.slugCache.has(cacheKey)) {
      return this.slugCache.get(cacheKey);
    }
    
    // Generate slug
    let slug = title
      .toLowerCase()
      .trim()
      // Replace spaces and special chars with hyphens
      .replace(/[\s_]+/g, '-')
      // Remove reserved chars
      .replace(new RegExp(`[${this.reservedChars.map(c => '\\' + c).join('')}]`, 'g'), '')
      // Remove accents
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      // Remove consecutive hyphens
      .replace(/-+/g, '-')
      // Remove leading/trailing hyphens
      .replace(/^-+|-+$/g, '');
    
    // Ensure slug is not empty
    if (!slug) {
      slug = 'task';
    }
    
    // Add short hash for uniqueness
    const shortHash = id.substring(0, 8);
    slug = `${slug}-${shortHash}`;
    
    // Cache the result
    this.slugCache.set(cacheKey, slug);
    
    return slug;
  }

  /**
   * Truncate path to fit within platform limits
   */
  async truncatePath(fullPath, task) {
    const pathParts = fullPath.split(path.sep);
    const fileName = `${task.id}.md`;
    const maxComponentLength = Math.floor((this.maxPathLength - fileName.length) / pathParts.length);
    
    // Truncate each component proportionally
    const truncatedParts = pathParts.map(part => {
      if (part.length > maxComponentLength) {
        // Keep prefix and hash
        const match = part.match(/^(\d{3}-\w+)-(.+)-([a-f0-9]{8})$/);
        if (match) {
          const [, prefix, slug, hash] = match;
          const maxSlugLength = maxComponentLength - prefix.length - hash.length - 2;
          const truncatedSlug = slug.substring(0, Math.max(maxSlugLength, 10));
          return `${prefix}-${truncatedSlug}-${hash}`;
        }
        return part.substring(0, maxComponentLength);
      }
      return part;
    });
    
    return path.join(...truncatedParts);
  }

  /**
   * Validate a semantic path
   */
  validatePath(semanticPath) {
    // Check length
    if (semanticPath.length > this.maxPathLength) {
      return {
        valid: false,
        reason: `Path exceeds platform limit of ${this.maxPathLength} characters`
      };
    }
    
    // Check for reserved characters
    for (const char of this.reservedChars) {
      if (semanticPath.includes(char)) {
        return {
          valid: false,
          reason: `Path contains reserved character: ${char}`
        };
      }
    }
    
    // Check depth (max 4 levels)
    const depth = semanticPath.split(path.sep).length;
    if (depth > 4) {
      return {
        valid: false,
        reason: 'Path exceeds maximum depth of 4 levels'
      };
    }
    
    return { valid: true };
  }

  /**
   * Get file path for a task
   */
  getTaskFilePath(task, semanticPath) {
    const fileName = `${task.id}.md`;
    return path.join(this.baseDir, semanticPath, fileName);
  }

  /**
   * Parse semantic path to extract metadata
   */
  parseSemanticPath(semanticPath) {
    const components = semanticPath.split(path.sep);
    const hierarchy = [];
    
    for (const component of components) {
      const match = component.match(/^(\d{3})-(\w+)-(.+)$/);
      if (match) {
        const [, order, level, slug] = match;
        hierarchy.push({
          order: parseInt(order),
          level: level.toLowerCase(),
          slug,
          full: component
        });
      }
    }
    
    return {
      hierarchy,
      depth: hierarchy.length,
      project: hierarchy[0]?.slug || null
    };
  }

  /**
   * Generate migration plan from flat to semantic structure
   */
  async generateMigrationPlan(tasks) {
    const plan = {
      moves: [],
      creates: [],
      deletes: [],
      errors: []
    };
    
    // Build task hierarchy map
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const rootTasks = tasks.filter(t => !t.parent_id);
    
    // Process hierarchy depth-first
    for (const root of rootTasks) {
      await this.planTaskMigration(root, taskMap, plan, null);
    }
    
    return plan;
  }

  /**
   * Plan migration for a task and its children
   */
  async planTaskMigration(task, taskMap, plan, parentPath) {
    try {
      // Generate semantic path
      const semanticPath = await this.generateSemanticPath(task, parentPath);
      
      // Validate path
      const validation = this.validatePath(semanticPath);
      if (!validation.valid) {
        plan.errors.push({
          task: task.id,
          reason: validation.reason
        });
        return;
      }
      
      // Add to plan
      const oldPath = path.join(this.baseDir, task.project || 'default', `task-${task.id}.md`);
      const newPath = this.getTaskFilePath(task, semanticPath);
      
      if (oldPath !== newPath) {
        plan.moves.push({
          taskId: task.id,
          oldPath,
          newPath,
          semanticPath
        });
        
        // Ensure directory exists
        const dir = path.dirname(newPath);
        if (!plan.creates.includes(dir)) {
          plan.creates.push(dir);
        }
      }
      
      // Process children
      const children = Array.from(taskMap.values()).filter(t => t.parent_id === task.id);
      for (const child of children) {
        await this.planTaskMigration(child, taskMap, plan, semanticPath);
      }
      
    } catch (error) {
      plan.errors.push({
        task: task.id,
        reason: error.message
      });
    }
  }

  /**
   * Clear caches
   */
  clearCache() {
    this.pathCache.clear();
    this.slugCache.clear();
  }
}

// Export for testing
export default V3PathManager;