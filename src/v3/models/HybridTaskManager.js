import { sqliteManager } from '../../../lib/sqlite-manager.js';
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
  constructor(tasksDir = null) {
    this.tasksDir = tasksDir || path.join(process.cwd(), 'tasks');
    this.db = sqliteManager;
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
    
    // Calculate materialized path
    if (task.parent_id) {
      const parent = await this.getTask(task.parent_id);
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
    
    // Validate hierarchy constraints
    this.validateHierarchy(task);
    
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
   */
  validateHierarchy(task) {
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
    
    // TODO: Add parent-child level validation
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
    
    // Update files
    // TODO: Implement file updates
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