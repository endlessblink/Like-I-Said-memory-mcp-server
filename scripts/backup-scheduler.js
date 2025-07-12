#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import archiver from 'archiver';
import chokidar from 'chokidar';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Automatic Memory Backup System
 * 
 * Features:
 * - Scheduled backups (every 6 hours)
 * - Change-triggered backups (when memories are modified)
 * - Retention policy (keeps 30 days of backups)
 * - Compressed archives (.zip format)
 * - Duplicate prevention
 */
class MemoryBackupScheduler {
  constructor(options = {}) {
    this.memoriesDir = path.join(__dirname, 'memories');
    this.backupDir = path.join(__dirname, 'backup');
    this.maxBackups = 30; // Keep 30 days of backups
    this.backupInterval = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
    this.debounceTime = 5 * 60 * 1000; // 5 minutes debounce for change-triggered backups
    this.lastBackupTime = 0;
    this.changeTimeout = null;
    this.silent = options.silent || false; // For MCP server integration
    
    this.ensureDirectories();
  }

  ensureDirectories() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Generate backup filename with timestamp
   */
  generateBackupFilename() {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5); // Remove milliseconds and make filename-safe
    return `memories-backup-${timestamp}Z.zip`;
  }

  /**
   * Get backup metadata (file count, size, etc.)
   */
  async getBackupMetadata() {
    const files = await this.getAllMemoryFiles();
    let totalSize = 0;
    
    for (const file of files) {
      try {
        const stats = await fs.promises.stat(file);
        totalSize += stats.size;
      } catch (error) {
        // File might have been deleted, skip it
      }
    }

    return {
      fileCount: files.length,
      totalSize,
      timestamp: new Date().toISOString(),
      backupVersion: '1.0'
    };
  }

  /**
   * Get all memory files recursively
   */
  async getAllMemoryFiles() {
    const files = [];
    
    async function scanDirectory(dir) {
      try {
        const items = await fs.promises.readdir(dir, { withFileTypes: true });
        
        for (const item of items) {
          const fullPath = path.join(dir, item.name);
          
          if (item.isDirectory() && !item.name.startsWith('.')) {
            await scanDirectory(fullPath);
          } else if (item.isFile() && item.name.endsWith('.md')) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        console.error(`Error scanning directory ${dir}:`, error.message);
      }
    }
    
    await scanDirectory(this.memoriesDir);
    return files;
  }

  /**
   * Create a compressed backup
   */
  async createBackup(reason = 'scheduled') {
    const backupFilename = this.generateBackupFilename();
    const backupPath = path.join(this.backupDir, backupFilename);
    
    if (!this.silent) {
      console.log(`🔄 Creating ${reason} backup: ${backupFilename}`);
    }
    
    try {
      // Get metadata before backup
      const metadata = await this.getBackupMetadata();
      
      // Create zip archive
      const output = createWriteStream(backupPath);
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });

      // Handle errors
      output.on('close', () => {
        if (!this.silent) {
          console.log(`✅ Backup created: ${backupFilename} (${archive.pointer()} bytes)`);
          console.log(`📊 Backed up ${metadata.fileCount} memory files`);
        }
      });

      archive.on('error', (err) => {
        throw err;
      });

      // Pipe archive data to the file
      archive.pipe(output);

      // Add all memory files to archive
      const files = await this.getAllMemoryFiles();
      for (const file of files) {
        try {
          const relativePath = path.relative(this.memoriesDir, file);
          archive.file(file, { name: `memories/${relativePath}` });
        } catch (error) {
          if (!this.silent) {
            console.warn(`⚠️ Skipping file ${file}: ${error.message}`);
          }
        }
      }

      // Add metadata file
      archive.append(JSON.stringify(metadata, null, 2), { name: 'backup-metadata.json' });

      // Finalize the archive
      await archive.finalize();

      // Wait for the stream to close
      await new Promise((resolve, reject) => {
        output.on('close', resolve);
        output.on('error', reject);
      });

      this.lastBackupTime = Date.now();
      
      // Clean up old backups
      await this.cleanupOldBackups();
      
      return backupPath;
    } catch (error) {
      if (!this.silent) {
        console.error(`❌ Backup failed: ${error.message}`);
      }
      
      // Clean up failed backup file
      try {
        if (fs.existsSync(backupPath)) {
          await fs.promises.unlink(backupPath);
        }
      } catch (cleanupError) {
        console.error(`Failed to cleanup failed backup: ${cleanupError.message}`);
      }
      
      throw error;
    }
  }

  /**
   * Clean up old backup files
   */
  async cleanupOldBackups() {
    try {
      const files = await fs.promises.readdir(this.backupDir);
      const backupFiles = files
        .filter(file => file.startsWith('memories-backup-') && file.endsWith('.zip'))
        .map(file => ({
          name: file,
          path: path.join(this.backupDir, file),
          stats: fs.statSync(path.join(this.backupDir, file))
        }))
        .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime()); // Newest first

      if (backupFiles.length > this.maxBackups) {
        const filesToDelete = backupFiles.slice(this.maxBackups);
        
        for (const file of filesToDelete) {
          await fs.promises.unlink(file.path);
          if (!this.silent) {
            console.log(`🗑️ Deleted old backup: ${file.name}`);
          }
        }
      }
    } catch (error) {
      console.error(`Error cleaning up old backups: ${error.message}`);
    }
  }

  /**
   * Start file watcher for change-triggered backups
   */
  startFileWatcher() {
    if (!this.silent) {
      console.log('👀 Starting file watcher for change-triggered backups...');
    }
    
    const watcher = chokidar.watch(this.memoriesDir, {
      ignored: /(^|[\/\\])\../, // Ignore dotfiles
      persistent: true,
      ignoreInitial: true,
      depth: 10,
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100
      }
    });

    watcher.on('all', (event, filePath) => {
      if (path.extname(filePath) === '.md') {
        if (!this.silent) {
          console.log(`📝 Memory file ${event}: ${path.basename(filePath)}`);
        }
        this.scheduleChangeBackup();
      }
    });

    watcher.on('error', error => {
      console.error('File watcher error:', error);
    });

    return watcher;
  }

  /**
   * Schedule a backup after file changes (with debouncing)
   */
  scheduleChangeBackup() {
    // Clear existing timeout
    if (this.changeTimeout) {
      clearTimeout(this.changeTimeout);
    }

    // Don't create backup if one was created recently
    const timeSinceLastBackup = Date.now() - this.lastBackupTime;
    if (timeSinceLastBackup < this.debounceTime) {
      if (!this.silent) {
        console.log(`⏰ Skipping backup, last backup was ${Math.round(timeSinceLastBackup / 1000)}s ago`);
      }
      return;
    }

    // Schedule backup after debounce period
    this.changeTimeout = setTimeout(async () => {
      try {
        await this.createBackup('change-triggered');
      } catch (error) {
        if (!this.silent) {
          console.error('Change-triggered backup failed:', error.message);
        }
      }
    }, this.debounceTime);

    if (!this.silent) {
      console.log(`⏰ Backup scheduled in ${this.debounceTime / 1000}s (after file changes)`);
    }
  }

  /**
   * Start scheduled backups
   */
  startScheduledBackups() {
    if (!this.silent) {
      console.log(`⏰ Starting scheduled backups every ${this.backupInterval / 1000 / 60 / 60} hours...`);
    }
    
    // Create initial backup
    setTimeout(() => {
      this.createBackup('initial').catch(error => {
        if (!this.silent) {
          console.error('Initial backup failed:', error.message);
        }
      });
    }, 10000); // Wait 10 seconds after startup

    // Schedule regular backups
    setInterval(async () => {
      try {
        await this.createBackup('scheduled');
      } catch (error) {
        if (!this.silent) {
          console.error('Scheduled backup failed:', error.message);
        }
      }
    }, this.backupInterval);
  }

  /**
   * Get backup status and list
   */
  async getBackupStatus() {
    try {
      const files = await fs.promises.readdir(this.backupDir);
      const backupFiles = [];
      
      for (const file of files) {
        if (file.startsWith('memories-backup-') && file.endsWith('.zip')) {
          const filePath = path.join(this.backupDir, file);
          const stats = await fs.promises.stat(filePath);
          
          backupFiles.push({
            name: file,
            size: stats.size,
            created: stats.mtime,
            ageHours: Math.round((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60))
          });
        }
      }
      
      backupFiles.sort((a, b) => b.created.getTime() - a.created.getTime());
      
      return {
        totalBackups: backupFiles.length,
        latestBackup: backupFiles[0] || null,
        backups: backupFiles,
        lastBackupTime: this.lastBackupTime,
        nextScheduledBackup: this.lastBackupTime + this.backupInterval
      };
    } catch (error) {
      console.error('Error getting backup status:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Start the backup system
   */
  start() {
    if (!this.silent) {
      console.log('🚀 Starting Memory Backup System...');
      console.log(`📁 Memories directory: ${this.memoriesDir}`);
      console.log(`💾 Backup directory: ${this.backupDir}`);
      console.log(`🗓️ Retention: ${this.maxBackups} backups`);
    }
    
    this.startScheduledBackups();
    this.startFileWatcher();
    
    if (!this.silent) {
      console.log('✅ Memory Backup System started successfully');
    }
  }

  /**
   * Create a manual backup
   */
  async manualBackup() {
    return await this.createBackup('manual');
  }
}

// CLI interface
if (process.argv[1] === __filename) {
  const command = process.argv[2];
  const backupSystem = new MemoryBackupScheduler();

  switch (command) {
    case 'start':
      backupSystem.start();
      break;
      
    case 'backup':
      backupSystem.manualBackup()
        .then(path => {
          console.log(`✅ Manual backup created: ${path}`);
          process.exit(0);
        })
        .catch(error => {
          console.error(`❌ Manual backup failed: ${error.message}`);
          process.exit(1);
        });
      break;
      
    case 'status':
      backupSystem.getBackupStatus()
        .then(status => {
          console.log('📊 Backup Status:');
          console.log(`Total backups: ${status.totalBackups}`);
          if (status.latestBackup) {
            console.log(`Latest backup: ${status.latestBackup.name}`);
            console.log(`Created: ${status.latestBackup.created.toLocaleString()}`);
            console.log(`Size: ${Math.round(status.latestBackup.size / 1024)}KB`);
            console.log(`Age: ${status.latestBackup.ageHours} hours`);
          }
          process.exit(0);
        })
        .catch(error => {
          console.error(`❌ Status check failed: ${error.message}`);
          process.exit(1);
        });
      break;
      
    default:
      console.log('Memory Backup System');
      console.log('Usage:');
      console.log('  node backup-scheduler.js start   - Start automatic backup system');
      console.log('  node backup-scheduler.js backup  - Create manual backup');
      console.log('  node backup-scheduler.js status  - Show backup status');
      process.exit(0);
  }
}

export default MemoryBackupScheduler;