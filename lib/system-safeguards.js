import fs from 'fs';
import path from 'path';
import { settingsManager } from './settings-manager.js';
import { PathSettings } from './path-settings.js';
import { mcpProcessManager } from './mcp-process-manager.js';

/**
 * System Safeguards for Task Management
 * Prevents data corruption and ensures system stability
 * 
 * v2.8.5 Updates:
 * - Dynamic path support via PathSettings
 * - Settings-based backup configuration
 * - Enhanced backup manifest with version info
 * - Support for data/ directory backups
 * - Automatic backup rotation based on settings
 */
export class SystemSafeguards {
  constructor() {
    this.backupDir = 'data-backups';
    
    // Use PathSettings for dynamic path support
    this.pathSettings = new PathSettings();
    const paths = this.pathSettings.getEffectivePaths();
    this.tasksDir = paths.tasks;
    this.memoriesDir = paths.memories;
    
    // Data directory for settings, auth, etc.
    this.dataDir = 'data';
    
    // Load backup settings
    this.settings = settingsManager.getSettings();
    this.maxBackups = this.settings.features?.maxBackups || 10;
    this.backupInterval = this.settings.features?.backupInterval || 3600000; // 1 hour
    this.autoBackup = this.settings.features?.autoBackup !== false;
    
    this.ensureBackupDirectory();
    this.lastBackupTime = null;
    this.backupTimer = null;
  }

  ensureBackupDirectory() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Create backup before any destructive operation
   * Enhanced with v2.8.5 features
   */
  async createBackup(operation = 'manual') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.backupDir, `backup-${timestamp}-${operation}`);
    
    try {
      fs.mkdirSync(backupPath, { recursive: true });
      
      // Count existing files for statistics
      const stats = {
        tasks: 0,
        memories: 0,
        dataFiles: 0,
        totalSize: 0
      };
      
      // Backup tasks
      if (fs.existsSync(this.tasksDir)) {
        const tasksBackupPath = path.join(backupPath, 'tasks');
        await this.copyDirectory(this.tasksDir, tasksBackupPath);
        stats.tasks = await this.countFiles(this.tasksDir, '.md');
      }
      
      // Backup memories
      if (fs.existsSync(this.memoriesDir)) {
        const memoriesBackupPath = path.join(backupPath, 'memories');
        await this.copyDirectory(this.memoriesDir, memoriesBackupPath);
        stats.memories = await this.countFiles(this.memoriesDir, '.md');
      }
      
      // Backup data directory (settings, auth, etc.)
      if (fs.existsSync(this.dataDir)) {
        const dataBackupPath = path.join(backupPath, 'data');
        await this.copyDirectory(this.dataDir, dataBackupPath);
        stats.dataFiles = await this.countFiles(this.dataDir);
      }
      
      // Calculate total backup size
      stats.totalSize = await this.getDirectorySize(backupPath);
      
      // Create enhanced backup manifest
      const manifest = {
        timestamp: new Date().toISOString(),
        operation,
        version: '2.8.5',
        paths: {
          tasks: this.tasksDir,
          memories: this.memoriesDir,
          data: this.dataDir
        },
        contents: {
          tasks: fs.existsSync(this.tasksDir),
          memories: fs.existsSync(this.memoriesDir),
          data: fs.existsSync(this.dataDir)
        },
        statistics: stats,
        settings: {
          autoBackup: this.autoBackup,
          maxBackups: this.maxBackups,
          backupInterval: this.backupInterval
        }
      };
      
      fs.writeFileSync(
        path.join(backupPath, 'backup-manifest.json'),
        JSON.stringify(manifest, null, 2)
      );
      
      console.error(`✅ Backup created: ${backupPath}`);
      console.error(`📊 Backed up: ${stats.tasks} tasks, ${stats.memories} memories, ${stats.dataFiles} data files (${this.formatBytes(stats.totalSize)})`);
      
      // Update last backup time
      this.lastBackupTime = new Date();
      
      // Rotate old backups if needed
      await this.rotateBackups();
      
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
   * Enhanced with backup status and storage metrics
   */
  async checkSystemHealth() {
    const health = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      issues: [],
      stats: {
        tasks: 0,
        memories: 0,
        projects: 0,
        backups: 0,
        totalStorageSize: 0
      },
      backup: {
        lastBackup: this.lastBackupTime?.toISOString() || 'never',
        nextBackup: this.getNextBackupTime()?.toISOString() || 'not scheduled',
        autoBackupEnabled: this.autoBackup
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
      
      // Check backup directory
      if (fs.existsSync(this.backupDir)) {
        const backups = fs.readdirSync(this.backupDir, { withFileTypes: true })
          .filter(entry => entry.isDirectory() && entry.name.startsWith('backup-'));
        health.stats.backups = backups.length;
        
        // Check if backup rotation is needed
        if (backups.length > this.maxBackups) {
          health.issues.push(`Backup count (${backups.length}) exceeds maximum (${this.maxBackups})`);
        }
      }
      
      // Calculate total storage size
      health.stats.totalStorageSize = await this.calculateTotalStorageSize();
      
      // Check for orphaned files
      const orphanedFiles = await this.findOrphanedFiles();
      if (orphanedFiles.length > 0) {
        health.issues.push(`Found ${orphanedFiles.length} orphaned files`);
      }
      
      // Check backup freshness
      if (this.autoBackup && this.lastBackupTime) {
        const timeSinceLastBackup = Date.now() - this.lastBackupTime.getTime();
        if (timeSinceLastBackup > this.backupInterval * 2) {
          health.issues.push('Backup is overdue');
        }
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
          const fileName = entry.name;
          
          // Ignore common git and system files
          const ignoredFiles = ['.gitkeep', '.gitignore', '.DS_Store', 'Thumbs.db'];
          
          if (!validExtensions.includes(ext) && !ignoredFiles.includes(fileName)) {
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
          console.error(`🗑️ Removed orphaned file: ${file}`);
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
    
    // Restore data directory (new in v2.8.5)
    if (manifest.contents.data) {
      const dataBackupPath = path.join(backupPath, 'data');
      if (fs.existsSync(dataBackupPath)) {
        if (fs.existsSync(this.dataDir)) {
          fs.rmSync(this.dataDir, { recursive: true });
        }
        await this.copyDirectory(dataBackupPath, this.dataDir);
      }
    }
    
    console.error(`✅ Recovery completed from backup: ${backupPath}`);
    return manifest;
  }

  /**
   * Get directory size in bytes
   */
  async getDirectorySize(dir) {
    let size = 0;
    
    if (!fs.existsSync(dir)) return 0;
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        size += await this.getDirectorySize(fullPath);
      } else {
        const stats = fs.statSync(fullPath);
        size += stats.size;
      }
    }
    
    return size;
  }

  /**
   * Format bytes to human-readable string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Calculate total storage size
   */
  async calculateTotalStorageSize() {
    let total = 0;
    
    total += await this.getDirectorySize(this.tasksDir);
    total += await this.getDirectorySize(this.memoriesDir);
    total += await this.getDirectorySize(this.dataDir);
    total += await this.getDirectorySize(this.backupDir);
    
    return total;
  }

  /**
   * Rotate old backups based on maxBackups setting
   */
  async rotateBackups() {
    if (!fs.existsSync(this.backupDir)) return;
    
    const backups = fs.readdirSync(this.backupDir, { withFileTypes: true })
      .filter(entry => entry.isDirectory() && entry.name.startsWith('backup-'))
      .map(entry => ({
        name: entry.name,
        path: path.join(this.backupDir, entry.name),
        timestamp: this.extractTimestampFromBackupName(entry.name)
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
    
    // Keep only the most recent backups
    while (backups.length > this.maxBackups) {
      const oldest = backups.shift();
      try {
        fs.rmSync(oldest.path, { recursive: true });
        console.error(`🗑️ Rotated old backup: ${oldest.name}`);
      } catch (error) {
        console.error(`❌ Failed to rotate backup ${oldest.name}:`, error);
      }
    }
  }

  /**
   * Extract timestamp from backup directory name
   */
  extractTimestampFromBackupName(name) {
    // Format: backup-2025-01-19T12-30-45-000Z-operation
    const match = name.match(/backup-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)/);
    if (match) {
      const timestamp = match[1].replace(/-(\d{2})-(\d{2})-(\d{3}Z)$/, ':$1:$2.$3');
      return new Date(timestamp).getTime();
    }
    return 0;
  }

  /**
   * Get next scheduled backup time
   */
  getNextBackupTime() {
    if (!this.autoBackup || !this.lastBackupTime) return null;
    
    return new Date(this.lastBackupTime.getTime() + this.backupInterval);
  }

  /**
   * Start automatic backup timer
   */
  startAutoBackup() {
    if (!this.autoBackup) return;
    
    // Clear existing timer
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
    }
    
    // Set up periodic backup
    this.backupTimer = setInterval(async () => {
      try {
        await this.createBackup('automatic');
        
        // Also run process health check during backup
        if (mcpProcessManager) {
          const healthCheck = await mcpProcessManager.runHealthCheck();
          if (!healthCheck.healthy) {
            console.error('⚠️ Process health issues detected during backup:', healthCheck.issues?.join(', '));
          }
        }
        
      } catch (error) {
        console.error('❌ Automatic backup failed:', error);
      }
    }, this.backupInterval);
    
    console.error(`⏰ Automatic backup scheduled every ${this.formatDuration(this.backupInterval)}`);
  }

  /**
   * Stop automatic backup timer
   */
  stopAutoBackup() {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
      this.backupTimer = null;
      console.error('⏹️ Automatic backup stopped');
    }
  }

  /**
   * Check system process health and cleanup if needed
   * Integrates with MCP Process Manager for comprehensive health monitoring
   */
  async checkProcessHealth() {
    if (!mcpProcessManager) {
      return { healthy: true, message: 'Process manager not available' };
    }

    try {
      const healthCheck = await mcpProcessManager.runHealthCheck();
      
      if (!healthCheck.healthy) {
        console.error('🚨 System process health issues detected:', healthCheck.issues?.join(', '));
        
        // If issues are severe, create a backup before any cleanup
        if (healthCheck.issues?.some(issue => issue.includes('EMERGENCY'))) {
          console.error('🆘 Emergency process situation - creating backup before cleanup');
          await this.createBackup('emergency-process-cleanup');
        }
        
        return {
          healthy: false,
          issues: healthCheck.issues,
          processCount: healthCheck.processCount,
          actionsPerformed: healthCheck.actions,
          stats: healthCheck.stats
        };
      }
      
      return {
        healthy: true,
        processCount: healthCheck.processCount,
        stats: healthCheck.stats
      };
      
    } catch (error) {
      console.error('❌ Process health check failed:', error.message);
      return { healthy: false, error: error.message };
    }
  }

  /**
   * Format duration in milliseconds to human-readable string
   */
  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else {
      return `${seconds} second${seconds > 1 ? 's' : ''}`;
    }
  }

  /**
   * List available backups
   */
  async listBackups() {
    if (!fs.existsSync(this.backupDir)) return [];
    
    const backups = fs.readdirSync(this.backupDir, { withFileTypes: true })
      .filter(entry => entry.isDirectory() && entry.name.startsWith('backup-'))
      .map(entry => {
        const manifestPath = path.join(this.backupDir, entry.name, 'backup-manifest.json');
        let manifest = null;
        
        try {
          if (fs.existsSync(manifestPath)) {
            manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
          }
        } catch (error) {
          console.error(`Failed to read manifest for ${entry.name}:`, error);
        }
        
        return {
          name: entry.name,
          path: path.join(this.backupDir, entry.name),
          manifest,
          size: 0 // Will be populated if needed
        };
      })
      .filter(backup => backup.manifest)
      .sort((a, b) => new Date(b.manifest.timestamp) - new Date(a.manifest.timestamp));
    
    // Optionally calculate sizes
    for (const backup of backups) {
      backup.size = await this.getDirectorySize(backup.path);
    }
    
    return backups;
  }
}

export default SystemSafeguards;