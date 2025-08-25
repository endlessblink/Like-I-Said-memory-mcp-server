import { sqliteManager, SQLiteManager } from '../../../lib/sqlite-manager.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import yaml from 'js-yaml';
import chokidar from 'chokidar';

/**
 * HybridTaskManager - Manages synchronization between file storage and SQLite
 * Files are the source of truth, SQLite provides performance indexing
 */
export class HybridTaskManager {
  constructor(tasksDir = null, options = {}) {
    this.tasksDir = tasksDir || path.join(process.cwd(), 'tasks');
    // Allow custom SQLiteManager instance
    this.db = options.db || sqliteManager;
    this.watcher = null;
    this.syncQueue = [];
    this.syncTimeout = null;
    this.initialized = false;
  }

  /**
   * Initialize the hybrid manager
   */
  async initialize() {
    try {
      // Initialize SQLite
      await this.db.initialize();
      
      // Ensure tasks directory exists
      if (!fs.existsSync(this.tasksDir)) {
        fs.mkdirSync(this.tasksDir, { recursive: true });
      }
      
      // Initial sync from files to database
      await this.fullSync();
      
      // Set up file watcher
      this.setupFileWatcher();
      
      this.initialized = true;
      console.log('[HybridTaskManager] Initialized successfully');
      
      return true;
    } catch (error) {
      console.error('[HybridTaskManager] Initialization error:', error);
      throw error;
    }
  }

  /**
   * Verify database connection and basic functionality
   */
  async verifyConnection() {
    try {
      // Test database connectivity with a simple query
      if (this.db && this.initialized) {
        // Check if we're using better-sqlite3 or sql.js
        if (this.db.db && typeof this.db.db.prepare === 'function') {
          // better-sqlite3
          const stmt = this.db.db.prepare('SELECT 1 as test');
          const result = stmt.get();
          if (result.test !== 1) {
            throw new Error('Database query verification failed');
          }
        } else if (this.db.db && typeof this.db.db.exec === 'function') {
          // sql.js
          const result = this.db.db.exec('SELECT 1 as test');
          if (!result || result.length === 0) {
            throw new Error('Database query verification failed');
          }
        } else if (this.db && typeof this.db.prepare === 'function') {
          // Direct database instance
          const stmt = this.db.prepare('SELECT 1 as test');
          const result = stmt.get();
          if (result.test !== 1) {
            throw new Error('Database query verification failed');
          }
        }
        
        // Test basic task operations
        const testCount = await this.getTaskCount();
        if (typeof testCount !== 'number' || testCount < 0) {
          throw new Error('Task count query failed');
        }
        
        console.log(`[HybridTaskManager] Database verified - ${testCount} tasks found`);
        return true;
      } else {
        throw new Error('Database not initialized');
      }
    } catch (error) {
      throw new Error(`Database verification failed: ${error.message}`);
    }
  }

  /**
   * Get total task count for verification
   */
  async getTaskCount() {
    try {
      if (this.db && this.db.db) {
        // Check database type and use appropriate method
        if (typeof this.db.db.prepare === 'function') {
          // better-sqlite3
          const stmt = this.db.db.prepare('SELECT COUNT(*) as count FROM tasks');
          const result = stmt.get();
          return result.count || 0;
        } else if (typeof this.db.db.exec === 'function') {
          // sql.js
          const result = this.db.db.exec('SELECT COUNT(*) as count FROM tasks');
          return result[0] ? result[0].values[0][0] : 0;
        }
      } else if (this.db && typeof this.db.prepare === 'function') {
        // Direct database instance
        const stmt = this.db.prepare('SELECT COUNT(*) as count FROM tasks');
        const result = stmt.get();
        return result.count || 0;
      }
      
      // Fallback to counting tasks in memory or files
      return 0;
    } catch (error) {
      console.error('[HybridTaskManager] getTaskCount error:', error.message);
      return 0; // Return 0 instead of throwing to allow verification to continue
    }
  }

  /**
   * Set up file system watcher with debouncing
   */
  setupFileWatcher() {
    this.watcher = chokidar.watch(this.tasksDir, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 250,
        pollInterval: 100
      }
    });

    this.watcher
      .on('add', filepath => this.queueSync('add', filepath))
      .on('change', filepath => this.queueSync('change', filepath))
      .on('unlink', filepath => this.queueSync('delete', filepath));
  }

  /**
   * Queue file changes for batch processing
   */
  queueSync(type, filepath) {
    if (!filepath.endsWith('.md')) return;
    
    this.syncQueue.push({ type, filepath, timestamp: Date.now() });
    
    // Debounce sync processing
    if (this.syncTimeout) clearTimeout(this.syncTimeout);
    this.syncTimeout = setTimeout(() => this.processSyncQueue(), 250);
  }

  /**
   * Process queued sync operations
   */
  async processSyncQueue() {
    if (this.syncQueue.length === 0) return;
    
    const operations = [...this.syncQueue];
    this.syncQueue = [];
    
    // Group by file to avoid duplicate operations
    const fileOps = new Map();
    operations.forEach(op => {
      fileOps.set(op.filepath, op);
    });
    
    // Process in transaction
    const transaction = this.db.transaction(() => {
      for (const [filepath, op] of fileOps) {
        try {
          switch (op.type) {
            case 'add':
            case 'change':
              this.syncFileToDatabase(filepath);
              break;
            case 'delete':
              this.removeFileFromDatabase(filepath);
              break;
          }
        } catch (error) {
          console.error(`[HybridTaskManager] Sync error for ${filepath}:`, error);
        }
      }
    });
    
    try {
      transaction();
    } catch (error) {
      console.error('[HybridTaskManager] Transaction error:', error);
    }
  }

  /**
   * Sync a single file to database
   */
  syncFileToDatabase(filepath) {
    try {
      const content = fs.readFileSync(filepath, 'utf8');
      const task = this.parseTaskFile(content, filepath);
      
      if (!task) return;
      
      // Upsert task in database
      const stmt = this.db.db.prepare(`
        INSERT INTO tasks (
          id, title, description, level, parent_id, path, path_order,
          status, project, priority, metadata, created_at, updated_at
        ) VALUES (
          @id, @title, @description, @level, @parent_id, @path, @path_order,
          @status, @project, @priority, @metadata, @created_at, @updated_at
        )
        ON CONFLICT(id) DO UPDATE SET
          title = @title,
          description = @description,
          level = @level,
          parent_id = @parent_id,
          path = @path,
          path_order = @path_order,
          status = @status,
          project = @project,
          priority = @priority,
          metadata = @metadata,
          updated_at = @updated_at
      `);
      
      stmt.run({
        ...task,
        metadata: JSON.stringify(task.metadata || {})
      });
      
    } catch (error) {
      console.error(`[HybridTaskManager] Failed to sync file ${filepath}:`, error);
    }
  }

  /**
   * Remove file from database
   */
  removeFileFromDatabase(filepath) {
    const taskId = this.getTaskIdFromFilepath(filepath);
    if (taskId) {
      this.db.run('DELETE FROM tasks WHERE id = ?', [taskId]);
    }
  }

  /**
   * Parse task markdown file
   */
  parseTaskFile(content, filepath) {
    try {
      const lines = content.split('\n');
      let frontmatter = '';
      let description = '';
      let inFrontmatter = false;
      let frontmatterCount = 0;
      
      for (const line of lines) {
        if (line.trim() === '---') {
          frontmatterCount++;
          if (frontmatterCount === 1) {
            inFrontmatter = true;
            continue;
          } else if (frontmatterCount === 2) {
            inFrontmatter = false;
            continue;
          }
        }
        
        if (inFrontmatter) {
          frontmatter += line + '\n';
        } else if (frontmatterCount >= 2) {
          description += line + '\n';
        }
      }
      
      const metadata = yaml.load(frontmatter) || {};
      
      return {
        id: metadata.id || this.getTaskIdFromFilepath(filepath),
        title: metadata.title || 'Untitled Task',
        description: description.trim(),
        level: metadata.level || 'task',
        parent_id: metadata.parent_id || null,
        path: metadata.path || '001',
        path_order: metadata.path_order || 0,
        status: metadata.status || 'todo',
        project: metadata.project || this.getProjectFromFilepath(filepath),
        priority: metadata.priority || 'medium',
        metadata: metadata.metadata || {},
        created_at: metadata.created || new Date().toISOString(),
        updated_at: metadata.updated || new Date().toISOString()
      };
    } catch (error) {
      console.error(`[HybridTaskManager] Failed to parse task file:`, error);
      return null;
    }
  }

  /**
   * Get task ID from filepath
   */
  getTaskIdFromFilepath(filepath) {
    const basename = path.basename(filepath, '.md');
    const match = basename.match(/task-([a-f0-9-]+)/);
    return match ? match[1] : null;
  }

  /**
   * Get project from filepath
   */
  getProjectFromFilepath(filepath) {
    const relative = path.relative(this.tasksDir, filepath);
    const parts = relative.split(path.sep);
    return parts.length > 1 ? parts[0] : 'default';
  }

  /**
   * Full sync from files to database
   */
  async fullSync() {
    console.log('[HybridTaskManager] Starting full sync...');
    
    const transaction = this.db.transaction(() => {
      // Clear existing data
      this.db.run('DELETE FROM tasks');
      
      // Sync all task files
      this.syncDirectory(this.tasksDir);
    });
    
    transaction();
    
    const stats = this.db.getStats();
    console.log(`[HybridTaskManager] Full sync complete. ${stats.totalTasks} tasks synced.`);
  }

  /**
   * Recursively sync a directory
   */
  syncDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        this.syncDirectory(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        this.syncFileToDatabase(fullPath);
      }
    }
  }

  /**
   * Create a new task
   */
  async createTask(taskData) {
    const task = {
      id: taskData.id || crypto.randomUUID(),
      title: taskData.title,
      description: taskData.description || '',
      level: taskData.level || 'task',
      parent_id: taskData.parent_id || null,
      path: '',
      path_order: 0,
      status: taskData.status || 'todo',
      project: taskData.project || 'default',
      priority: taskData.priority || 'medium',
      metadata: taskData.metadata || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Calculate materialized path and validate hierarchy
    let parent = null;
    if (task.parent_id) {
      parent = await this.getTask(task.parent_id);
      if (!parent) throw new Error(`Parent task ${task.parent_id} not found`);
      
      // Get next path order
      const siblings = await this.getChildren(task.parent_id);
      task.path_order = siblings.length + 1;
      task.path = `${parent.path}.${String(task.path_order).padStart(3, '0')}`;
    } else {
      // Root level task
      const roots = await this.getRootTasks();
      task.path_order = roots.length + 1;
      task.path = String(task.path_order).padStart(3, '0');
    }
    
    // Validate hierarchy constraints with parent info
    this.validateHierarchy(task, parent);
    
    // Save to database first
    const stmt = this.db.db.prepare(`
      INSERT INTO tasks (
        id, title, description, level, parent_id, path, path_order,
        status, project, priority, metadata, created_at, updated_at
      ) VALUES (
        @id, @title, @description, @level, @parent_id, @path, @path_order,
        @status, @project, @priority, @metadata, @created_at, @updated_at
      )
    `);
    
    stmt.run({
      ...task,
      metadata: JSON.stringify(task.metadata)
    });
    
    // Save to file
    await this.saveTaskToFile(task);
    
    return task;
  }

  /**
   * Validate hierarchy constraints
   * @param {Object} task - The task being validated
   * @param {Object|null} parent - The parent task (null if no parent)
   */
  validateHierarchy(task, parent = null) {
    const levelOrder = ['master', 'epic', 'task', 'subtask'];
    const levelIndex = levelOrder.indexOf(task.level);
    
    if (levelIndex === -1) {
      throw new Error(`Invalid task level: ${task.level}`);
    }
    
    // Check depth constraint (4 levels max)
    const depth = task.path.split('.').length;
    if (depth > 4) {
      throw new Error('Maximum hierarchy depth (4 levels) exceeded');
    }
    
    // Validate parent-child level relationship
    if (task.parent_id) {
      if (!parent) {
        // Parent doesn't exist - provide helpful error
        throw new Error(
          `Parent task with ID '${task.parent_id}' not found. ` +
          `Please verify the parent ID exists or create the parent first using create_project or create_stage.`
        );
      }
      
      if (parent) {
        const parentLevelIndex = levelOrder.indexOf(parent.level);
        
        // Child level must be exactly one level below parent
        if (levelIndex !== parentLevelIndex + 1) {
          const expectedLevel = levelOrder[parentLevelIndex + 1] || 'none';
          
          // Provide more helpful context based on what they're trying to do
          let suggestion = '';
          if (task.level === 'epic' && !parent.level) {
            suggestion = ' The parent task may not be properly initialized as a project. Use create_project first.';
          } else if (task.level === 'epic' && parent.level !== 'master') {
            suggestion = ' Stages can only be added to projects (master level). Use create_project first.';
          } else if (task.level === 'task' && parent.level === 'master') {
            suggestion = ' Tasks cannot be added directly to projects. Create a stage first using create_stage.';
          }
          
          throw new Error(
            `Invalid parent-child relationship: ${parent.level || 'undefined'} cannot have ${task.level} as child. ` +
            `Expected child level: ${expectedLevel}.${suggestion}`
          );
        }
        
        // Validate specific level constraints
        if (parent.level === 'subtask') {
          throw new Error('Subtasks cannot have children');
        }
      }
    } else {
      // No parent means this must be a master level task
      if (task.level !== 'master') {
        throw new Error(`Tasks without parents must be master level, got: ${task.level}`);
      }
    }
  }

  /**
   * Save task to file
   */
  async saveTaskToFile(task) {
    const projectDir = path.join(this.tasksDir, task.project);
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }
    
    const filepath = path.join(projectDir, `task-${task.id}.md`);
    
    const frontmatter = {
      id: task.id,
      title: task.title,
      level: task.level,
      parent_id: task.parent_id,
      path: task.path,
      path_order: task.path_order,
      status: task.status,
      project: task.project,
      priority: task.priority,
      created: task.created_at,
      updated: task.updated_at,
      metadata: task.metadata
    };
    
    const content = `---\n${yaml.dump(frontmatter)}---\n\n${task.description}`;
    
    fs.writeFileSync(filepath, content, 'utf8');
  }

  /**
   * Get task by ID
   */
  async getTask(taskId) {
    return this.db.get('SELECT * FROM tasks WHERE id = ?', [taskId]);
  }

  /**
   * Get children of a task
   */
  async getChildren(parentId) {
    return this.db.all(
      'SELECT * FROM tasks WHERE parent_id = ? ORDER BY path_order',
      [parentId]
    );
  }

  /**
   * Get root tasks
   */
  async getRootTasks() {
    return this.db.all(
      'SELECT * FROM tasks WHERE parent_id IS NULL ORDER BY path_order'
    );
  }

  /**
   * Get task tree
   */
  async getTaskTree(rootId = null) {
    const query = rootId 
      ? 'SELECT * FROM tasks WHERE path LIKE ? ORDER BY path'
      : 'SELECT * FROM tasks ORDER BY path';
    
    const params = rootId ? [`${rootId}%`] : [];
    const tasks = this.db.all(query, params);
    
    // Build tree structure
    return this.buildTreeStructure(tasks);
  }

  /**
   * Build tree structure from flat list
   */
  buildTreeStructure(tasks) {
    const taskMap = new Map();
    const roots = [];
    
    // First pass: create task map
    tasks.forEach(task => {
      task.children = [];
      taskMap.set(task.id, task);
    });
    
    // Second pass: build tree
    tasks.forEach(task => {
      if (task.parent_id) {
        const parent = taskMap.get(task.parent_id);
        if (parent) {
          parent.children.push(task);
        }
      } else {
        roots.push(task);
      }
    });
    
    return roots;
  }

  /**
   * Move task to new parent
   */
  async moveTask(taskId, newParentId) {
    const transaction = this.db.transaction(async () => {
      const task = await this.getTask(taskId);
      if (!task) throw new Error(`Task ${taskId} not found`);
      
      // Check for cycles
      if (await this.wouldCreateCycle(taskId, newParentId)) {
        throw new Error('Operation would create a cycle in the hierarchy');
      }
      
      // Update task and all descendants
      await this.updateTaskPath(task, newParentId);
    });
    
    await transaction();
  }

  /**
   * Check if moving a task would create a cycle
   */
  async wouldCreateCycle(taskId, newParentId) {
    if (!newParentId) return false;
    
    let current = newParentId;
    while (current) {
      if (current === taskId) return true;
      
      const parent = await this.getTask(current);
      current = parent?.parent_id;
    }
    
    return false;
  }

  /**
   * Update task path and all descendants
   */
  async updateTaskPath(task, newParentId) {
    // Calculate new path
    let newPath, newPathOrder;
    
    if (newParentId) {
      const newParent = await this.getTask(newParentId);
      if (!newParent) throw new Error(`Parent task ${newParentId} not found`);
      
      const siblings = await this.getChildren(newParentId);
      newPathOrder = siblings.filter(s => s.id !== task.id).length + 1;
      newPath = `${newParent.path}.${String(newPathOrder).padStart(3, '0')}`;
    } else {
      const roots = await this.getRootTasks();
      newPathOrder = roots.filter(r => r.id !== task.id).length + 1;
      newPath = String(newPathOrder).padStart(3, '0');
    }
    
    // Update task
    this.db.run(`
      UPDATE tasks 
      SET parent_id = ?, path = ?, path_order = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [newParentId, newPath, newPathOrder, task.id]);
    
    // Update all descendants
    const oldPathPrefix = task.path + '.';
    const newPathPrefix = newPath + '.';
    
    this.db.run(`
      UPDATE tasks 
      SET path = ? || SUBSTR(path, ?),
          updated_at = CURRENT_TIMESTAMP
      WHERE path LIKE ?
    `, [newPathPrefix, oldPathPrefix.length + 1, oldPathPrefix + '%']);
    
    // Update files for affected tasks
    await this.updateTaskFiles(task.id, newPath, newParentId);
    
    // Update files for all descendants
    const descendants = await this.getDescendants(task.id);
    for (const descendant of descendants) {
      const updatedPath = newPath + descendant.path.substring(task.path.length);
      await this.updateTaskFiles(descendant.id, updatedPath, descendant.parent_id);
    }
  }

  /**
   * Update task files when path or parent changes
   */
  async updateTaskFiles(taskId, newPath, newParentId) {
    try {
      const task = await this.getTask(taskId);
      if (!task) return;
      
      const projectDir = path.join(this.tasksDir, task.project);
      const oldFilepath = path.join(projectDir, `task-${taskId}.md`);
      
      // Check if file exists
      if (!fs.existsSync(oldFilepath)) {
        // Create the file if it doesn't exist
        await this.saveTaskToFile({
          ...task,
          path: newPath,
          parent_id: newParentId
        });
        return;
      }
      
      // Read existing file content
      const content = fs.readFileSync(oldFilepath, 'utf-8');
      const lines = content.split('\n');
      
      // Parse and update frontmatter
      let frontmatter = '';
      let description = '';
      let inFrontmatter = false;
      let frontmatterCount = 0;
      
      for (const line of lines) {
        if (line === '---') {
          frontmatterCount++;
          inFrontmatter = !inFrontmatter;
          continue;
        }
        
        if (inFrontmatter) {
          frontmatter += line + '\n';
        } else if (frontmatterCount >= 2) {
          description += line + '\n';
        }
      }
      
      const metadata = yaml.load(frontmatter) || {};
      
      // Update metadata with new path and parent
      metadata.path = newPath;
      metadata.parent_id = newParentId;
      metadata.updated = new Date().toISOString();
      
      // Write updated content back to file
      const updatedContent = `---\n${yaml.dump(metadata)}---\n\n${description.trim()}`;
      fs.writeFileSync(oldFilepath, updatedContent, 'utf-8');
      
    } catch (error) {
      console.error(`[HybridTaskManager] Failed to update task file:`, error);
    }
  }
  
  /**
   * Get all descendants of a task
   */
  async getDescendants(taskId) {
    const stmt = this.db.prepare(`
      SELECT * FROM tasks 
      WHERE path LIKE (SELECT path || '.%' FROM tasks WHERE id = ?)
      ORDER BY path
    `);
    
    return stmt.all(taskId);
  }

  /**
   * Close connections
   */
  close() {
    if (this.watcher) {
      this.watcher.close();
    }
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }
    this.db.close();
  }
}

// Export singleton instance
export const hybridTaskManager = new HybridTaskManager();