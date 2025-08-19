/**
 * SemanticHybridTaskManager - Enhanced task manager with semantic folder support
 * Extends EnhancedHybridTaskManager to add semantic path management
 */

import { EnhancedHybridTaskManager } from './EnhancedHybridTaskManager.js';
import { V3PathManager } from './V3PathManager.js';
import { AtomicFolderOperations } from './AtomicFolderOperations.js';
import { SQLiteManager } from '../../../lib/sqlite-manager.js';
import path from 'path';
import { promises as fs } from 'fs';

export class SemanticHybridTaskManager extends EnhancedHybridTaskManager {
  constructor(options = {}) {
    // Pass tasksDir to parent
    const tasksDir = options.dataDir || options.tasksDir || null;
    
    // Create custom SQLiteManager for semantic tests
    const dbOptions = {};
    if (options.customDb) {
      dbOptions.db = new SQLiteManager(tasksDir, 'semantic-tasks.db');
    }
    
    super(tasksDir, dbOptions);
    
    // Initialize path manager and atomic operations
    this.pathManager = new V3PathManager({
      baseDir: this.tasksDir
    });
    
    this.atomicOps = new AtomicFolderOperations({
      tempDir: path.join(this.tasksDir, '.temp'),
      backupDir: path.join(this.tasksDir, '.backups')
    });
    
    // Configuration
    this.useSemanticPaths = options.useSemanticPaths !== false; // Default true
    this.migrationBatchSize = options.migrationBatchSize || 100;
  }

  /**
   * Override createTask to use semantic paths
   */
  async createTask(taskData) {
    // Create task with parent class
    const task = await super.createTask(taskData);
    
    if (this.useSemanticPaths) {
      // Generate semantic path
      const parentPath = task.parent_id ? 
        await this.getTaskSemanticPath(task.parent_id) : null;
      
      const semanticPath = await this.pathManager.generateSemanticPath(task, parentPath);
      
      // Move file to semantic location
      // Get default file path from parent
      const projectDir = path.join(this.tasksDir, task.project || 'default');
      const oldPath = path.join(projectDir, `task-${task.id}.md`);
      const newPath = this.pathManager.getTaskFilePath(task, semanticPath);
      
      // Ensure directory exists
      await fs.mkdir(path.dirname(newPath), { recursive: true });
      
      // Move file
      await fs.rename(oldPath, newPath);
      
      // Update task with semantic path
      task.semantic_path = semanticPath;
      
      // Update database
      this.db.run(
        'UPDATE tasks SET semantic_path = $semanticPath WHERE id = $id',
        { semanticPath, id: task.id }
      );
    }
    
    return task;
  }

  /**
   * Override moveTask to handle semantic path updates
   */
  async moveTask(taskId, newParentId) {
    if (!this.useSemanticPaths) {
      return super.moveTask(taskId, newParentId);
    }
    
    // Get task and validate move
    const task = await this.getTask(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    // Use parent's validation
    await super.moveTask(taskId, newParentId);
    
    // Update semantic paths for moved task and descendants
    await this.updateSemanticPaths(taskId);
    
    return true;
  }

  /**
   * Update semantic paths after a move operation
   */
  async updateSemanticPaths(taskId) {
    const task = await this.getTask(taskId);
    const subtree = await this.getTaskSubtree(taskId);
    
    // Build move plan
    const plan = {
      moves: [],
      creates: [],
      deletes: [],
      errors: []
    };
    
    // Process task and subtree
    const tasksToUpdate = [task, ...subtree];
    
    for (const t of tasksToUpdate) {
      const parentPath = t.parent_id ? 
        await this.getTaskSemanticPath(t.parent_id) : null;
      
      const newSemanticPath = await this.pathManager.generateSemanticPath(t, parentPath);
      
      if (t.semantic_path !== newSemanticPath) {
        const oldPath = this.pathManager.getTaskFilePath(t, t.semantic_path);
        const newPath = this.pathManager.getTaskFilePath(t, newSemanticPath);
        
        plan.moves.push({
          taskId: t.id,
          oldPath,
          newPath,
          semanticPath: newSemanticPath
        });
        
        // Add directory to create list
        const dir = path.dirname(newPath);
        if (!plan.creates.includes(dir)) {
          plan.creates.push(dir);
        }
      }
    }
    
    // Execute migration atomically
    if (plan.moves.length > 0) {
      await this.atomicOps.executeMigration(plan, { skipBackup: false });
      
      // Update database
      const updateStmt = this.db.prepare(
        'UPDATE tasks SET semantic_path = ? WHERE id = ?'
      );
      
      const updateMany = this.db.transaction((moves) => {
        for (const move of moves) {
          updateStmt.run(move.semanticPath, move.taskId);
        }
      });
      
      updateMany(plan.moves);
    }
  }

  /**
   * Get semantic path for a task
   */
  async getTaskSemanticPath(taskId) {
    const task = await this.getTask(taskId);
    return task?.semantic_path || null;
  }

  /**
   * Override getTaskFilePath to use semantic paths
   */
  getTaskFilePath(task) {
    if (this.useSemanticPaths && task.semantic_path) {
      return this.pathManager.getTaskFilePath(task, task.semantic_path);
    }
    
    // Fall back to flat structure
    const projectDir = path.join(this.tasksDir, task.project || 'default');
    return path.join(projectDir, `task-${task.id}.md`);
  }

  /**
   * Migrate existing tasks to semantic folder structure
   */
  async migrateToSemanticFolders(options = {}) {
    console.log('[SemanticHybridTaskManager] Starting migration to semantic folders...');
    
    // Get all tasks
    const allTasks = this.getTaskTree();
    
    // Generate migration plan
    const plan = await this.pathManager.generateMigrationPlan(allTasks);
    
    // Log plan summary
    console.log(`[SemanticHybridTaskManager] Migration plan:`);
    console.log(`  - Files to move: ${plan.moves.length}`);
    console.log(`  - Directories to create: ${plan.creates.length}`);
    console.log(`  - Errors: ${plan.errors.length}`);
    
    if (plan.errors.length > 0) {
      console.error('[SemanticHybridTaskManager] Migration plan errors:', plan.errors);
      
      if (!options.ignoreErrors) {
        throw new Error('Migration plan contains errors. Use ignoreErrors option to proceed anyway.');
      }
    }
    
    // Execute migration
    const result = await this.atomicOps.executeMigration(plan, {
      skipBackup: options.skipBackup || false,
      keepEmptyDirs: options.keepEmptyDirs || false
    });
    
    // Update database with semantic paths
    const updateStmt = this.db.prepare(
      'UPDATE tasks SET semantic_path = ? WHERE id = ?'
    );
    
    const updateMany = this.db.transaction((moves) => {
      for (const move of moves) {
        updateStmt.run(move.semanticPath, move.taskId);
      }
    });
    
    updateMany(plan.moves);
    
    // Enable semantic paths
    this.useSemanticPaths = true;
    
    console.log(`[SemanticHybridTaskManager] Migration complete:`, result.summary);
    
    return result;
  }

  /**
   * Get migration status
   */
  async getMigrationStatus() {
    const totalTasks = this.db.get('SELECT COUNT(*) as count FROM tasks').count;
    const migratedTasks = this.db.get(
      'SELECT COUNT(*) as count FROM tasks WHERE semantic_path IS NOT NULL'
    ).count;
    
    const status = {
      totalTasks,
      migratedTasks,
      pendingTasks: totalTasks - migratedTasks,
      percentComplete: totalTasks > 0 ? Math.round((migratedTasks / totalTasks) * 100) : 0,
      useSemanticPaths: this.useSemanticPaths
    };
    
    // Check for mixed state
    if (migratedTasks > 0 && migratedTasks < totalTasks) {
      status.warning = 'System is in mixed state with both flat and semantic paths';
    }
    
    return status;
  }

  /**
   * Rollback semantic folder migration
   */
  async rollbackMigration(backupPath) {
    if (!backupPath) {
      throw new Error('Backup path required for rollback');
    }
    
    console.log(`[SemanticHybridTaskManager] Rolling back migration from ${backupPath}...`);
    
    // Read backup manifest
    const manifestPath = path.join(backupPath, 'manifest.json');
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    
    // Create rollback plan (reverse of original)
    const rollbackPlan = {
      moves: manifest.plan.moves.map(move => ({
        taskId: move.taskId,
        oldPath: move.newPath,
        newPath: move.oldPath,
        semanticPath: null
      })),
      creates: [],
      deletes: manifest.plan.creates,
      errors: []
    };
    
    // Execute rollback
    await this.atomicOps.executeMigration(rollbackPlan, {
      skipBackup: true // Don't backup the rollback
    });
    
    // Clear semantic paths in database
    this.db.run('UPDATE tasks SET semantic_path = NULL');
    
    // Disable semantic paths
    this.useSemanticPaths = false;
    
    console.log('[SemanticHybridTaskManager] Rollback complete');
  }

  /**
   * Override syncFileToDatabase to handle semantic paths
   */
  async syncFileToDatabase(filePath) {
    const fileContent = await fs.readFile(filePath, 'utf8');
    const taskData = this.parseTaskFile(fileContent);
    
    if (!taskData.id) {
      console.error(`[SemanticHybridTaskManager] Task file missing ID: ${filePath}`);
      return;
    }
    
    // Extract semantic path from file location if using semantic paths
    if (this.useSemanticPaths) {
      const relativePath = path.relative(this.baseDir, path.dirname(filePath));
      taskData.semantic_path = relativePath;
    }
    
    // Let parent handle the sync
    await super.syncFileToDatabase(filePath);
  }

  /**
   * Get task by semantic path
   */
  async getTaskBySemanticPath(semanticPath) {
    return this.db.get(
      'SELECT * FROM tasks WHERE semantic_path = ?',
      semanticPath
    );
  }

  /**
   * Search tasks by path pattern
   */
  async searchByPath(pattern) {
    return this.db.all(
      'SELECT * FROM tasks WHERE semantic_path LIKE ? ORDER BY path',
      `%${pattern}%`
    );
  }
}

export default SemanticHybridTaskManager;