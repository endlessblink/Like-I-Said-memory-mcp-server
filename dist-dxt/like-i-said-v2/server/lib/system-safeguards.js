import fs from 'fs';
import path from 'path';

/**
 * System Safeguards for Task Management
 * Prevents data corruption and ensures system stability
 */
export class SystemSafeguards {
  constructor() {
    this.backupDir = 'data-backups';
    this.tasksDir = 'tasks';
    this.memoriesDir = 'memories';
    this.ensureBackupDirectory();
  }

  ensureBackupDirectory() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Create backup before any destructive operation
   */
  async createBackup(operation = 'manual') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.backupDir, `backup-${timestamp}-${operation}`);
    
    try {
      fs.mkdirSync(backupPath, { recursive: true });
      
      // Backup tasks
      if (fs.existsSync(this.tasksDir)) {
        const tasksBackupPath = path.join(backupPath, 'tasks');
        await this.copyDirectory(this.tasksDir, tasksBackupPath);
      }
      
      // Backup memories
      if (fs.existsSync(this.memoriesDir)) {
        const memoriesBackupPath = path.join(backupPath, 'memories');
        await this.copyDirectory(this.memoriesDir, memoriesBackupPath);
      }
      
      // Create backup manifest
      const manifest = {
        timestamp: new Date().toISOString(),
        operation,
        contents: {
          tasks: fs.existsSync(this.tasksDir),
          memories: fs.existsSync(this.memoriesDir)
        }
      };
      
      fs.writeFileSync(
        path.join(backupPath, 'backup-manifest.json'),
        JSON.stringify(manifest, null, 2)
      );
      
      console.log(`✅ Backup created: ${backupPath}`);
      return backupPath;
    } catch (error) {
      console.error('❌ Backup failed:', error);
      throw error;
    }
  }

  /**
   * Copy directory recursively
   */
  async copyDirectory(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  /**
   * Validate task data before saving
   */
  validateTaskData(task) {
    const errors = [];
    
    // Required fields
    if (!task.id || typeof task.id !== 'string') {
      errors.push('Task ID is required and must be a string');
    }
    
    if (!task.title || typeof task.title !== 'string' || task.title.trim().length === 0) {
      errors.push('Task title is required and must be a non-empty string');
    }
    
    if (!task.project || typeof task.project !== 'string') {
      errors.push('Task project is required and must be a string');
    }
    
    // Status validation
    const validStatuses = ['todo', 'in_progress', 'completed', 'blocked', 'archived'];
    if (!validStatuses.includes(task.status)) {
      errors.push(`Task status must be one of: ${validStatuses.join(', ')}`);
    }
    
    // Priority validation
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (!validPriorities.includes(task.priority)) {
      errors.push(`Task priority must be one of: ${validPriorities.join(', ')}`);
    }
    
    // Memory connections validation
    if (task.memory_connections && !Array.isArray(task.memory_connections)) {
      errors.push('Memory connections must be an array');
    }
    
    return errors;
  }

  /**
   * Validate memory data before saving
   */
  validateMemoryData(memory) {
    const errors = [];
    
    if (!memory.id || typeof memory.id !== 'string') {
      errors.push('Memory ID is required and must be a string');
    }
    
    if (!memory.content || typeof memory.content !== 'string' || memory.content.trim().length === 0) {
      errors.push('Memory content is required and must be a non-empty string');
    }
    
    return errors;
  }

  /**
   * Check system health and integrity
   */
  async checkSystemHealth() {
    const health = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      issues: [],
      stats: {
        tasks: 0,
        memories: 0,
        projects: 0
      }
    };
    
    try {
      // Check tasks directory
      if (fs.existsSync(this.tasksDir)) {
        const taskFiles = await this.countFiles(this.tasksDir, '.md');
        health.stats.tasks = taskFiles;
        
        // Count projects
        const projects = fs.readdirSync(this.tasksDir, { withFileTypes: true })
          .filter(entry => entry.isDirectory())
          .length;
        health.stats.projects = projects;
      } else {
        health.issues.push('Tasks directory does not exist');
      }
      
      // Check memories directory
      if (fs.existsSync(this.memoriesDir)) {
        const memoryFiles = await this.countFiles(this.memoriesDir, '.md');
        health.stats.memories = memoryFiles;
      } else {
        health.issues.push('Memories directory does not exist');
      }
      
      // Check for orphaned files
      const orphanedFiles = await this.findOrphanedFiles();
      if (orphanedFiles.length > 0) {
        health.issues.push(`Found ${orphanedFiles.length} orphaned files`);
      }
      
      if (health.issues.length > 0) {
        health.status = 'warning';
      }
      
    } catch (error) {
      health.status = 'error';
      health.issues.push(`System health check failed: ${error.message}`);
    }
    
    return health;
  }

  /**
   * Count files recursively
   */
  async countFiles(dir, extension = '') {
    let count = 0;
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        count += await this.countFiles(fullPath, extension);
      } else if (!extension || entry.name.endsWith(extension)) {
        count++;
      }
    }
    
    return count;
  }

  /**
   * Find files that might be orphaned or corrupted
   */
  async findOrphanedFiles() {
    const orphaned = [];
    
    // Check for files outside proper directory structure
    const checkDirectory = (dir, validExtensions = ['.md']) => {
      if (!fs.existsSync(dir)) return;
      
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          checkDirectory(fullPath, validExtensions);
        } else {
          const ext = path.extname(entry.name);
          if (!validExtensions.includes(ext)) {
            orphaned.push(fullPath);
          }
        }
      }
    };
    
    checkDirectory(this.tasksDir);
    checkDirectory(this.memoriesDir);
    
    return orphaned;
  }

  /**
   * Clean up orphaned files
   */
  async cleanupOrphanedFiles() {
    const orphaned = await this.findOrphanedFiles();
    
    if (orphaned.length > 0) {
      await this.createBackup('cleanup');
      
      for (const file of orphaned) {
        try {
          fs.unlinkSync(file);
          console.log(`🗑️ Removed orphaned file: ${file}`);
        } catch (error) {
          console.error(`❌ Failed to remove ${file}:`, error);
        }
      }
    }
    
    return orphaned.length;
  }

  /**
   * Recovery from backup
   */
  async recoverFromBackup(backupPath) {
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup not found: ${backupPath}`);
    }
    
    const manifestPath = path.join(backupPath, 'backup-manifest.json');
    if (!fs.existsSync(manifestPath)) {
      throw new Error('Invalid backup: manifest not found');
    }
    
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    // Create backup of current state before recovery
    await this.createBackup('pre-recovery');
    
    // Restore tasks
    if (manifest.contents.tasks) {
      const tasksBackupPath = path.join(backupPath, 'tasks');
      if (fs.existsSync(tasksBackupPath)) {
        if (fs.existsSync(this.tasksDir)) {
          fs.rmSync(this.tasksDir, { recursive: true });
        }
        await this.copyDirectory(tasksBackupPath, this.tasksDir);
      }
    }
    
    // Restore memories
    if (manifest.contents.memories) {
      const memoriesBackupPath = path.join(backupPath, 'memories');
      if (fs.existsSync(memoriesBackupPath)) {
        if (fs.existsSync(this.memoriesDir)) {
          fs.rmSync(this.memoriesDir, { recursive: true });
        }
        await this.copyDirectory(memoriesBackupPath, this.memoriesDir);
      }
    }
    
    console.log(`✅ Recovery completed from backup: ${backupPath}`);
    return manifest;
  }
}

export default SystemSafeguards;