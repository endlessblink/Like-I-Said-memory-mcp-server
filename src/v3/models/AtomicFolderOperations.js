/**
 * AtomicFolderOperations - Safe, atomic file operations for semantic folders
 * Ensures data integrity during folder restructuring
 */

import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

export class AtomicFolderOperations {
  constructor(options = {}) {
    this.tempDir = options.tempDir || '.v3-temp';
    this.backupDir = options.backupDir || '.v3-backups';
    this.lockFile = options.lockFile || '.v3-migration.lock';
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 100;
  }

  /**
   * Execute a migration plan atomically
   */
  async executeMigration(plan, options = {}) {
    const operationId = crypto.randomUUID();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.backupDir, `backup-${timestamp}-${operationId}`);
    
    // Acquire lock
    const lockAcquired = await this.acquireLock();
    if (!lockAcquired) {
      throw new Error('Could not acquire migration lock. Another migration may be in progress.');
    }
    
    try {
      // Phase 1: Validation
      await this.validateMigrationPlan(plan);
      
      // Phase 2: Create backup
      if (!options.skipBackup) {
        await this.createBackup(plan, backupPath);
      }
      
      // Phase 3: Create directories
      await this.createDirectories(plan.creates);
      
      // Phase 4: Execute moves atomically
      await this.executeMoves(plan.moves);
      
      // Phase 5: Cleanup empty directories
      if (!options.keepEmptyDirs) {
        await this.cleanupEmptyDirs(plan.moves);
      }
      
      // Phase 6: Verify integrity
      await this.verifyIntegrity(plan);
      
      return {
        success: true,
        operationId,
        backupPath: options.skipBackup ? null : backupPath,
        summary: {
          moved: plan.moves.length,
          created: plan.creates.length,
          errors: 0
        }
      };
      
    } catch (error) {
      // Rollback on error
      if (!options.skipBackup) {
        await this.rollbackFromBackup(backupPath, plan);
      }
      
      throw new Error(`Migration failed: ${error.message}`);
      
    } finally {
      // Always release lock
      await this.releaseLock();
    }
  }

  /**
   * Validate migration plan before execution
   */
  async validateMigrationPlan(plan) {
    const issues = [];
    
    // Check all source files exist
    for (const move of plan.moves) {
      try {
        await fs.access(move.oldPath, fs.constants.R_OK);
      } catch {
        issues.push(`Source file not found: ${move.oldPath}`);
      }
    }
    
    // Check for destination conflicts
    const destinations = new Set();
    for (const move of plan.moves) {
      if (destinations.has(move.newPath)) {
        issues.push(`Duplicate destination: ${move.newPath}`);
      }
      destinations.add(move.newPath);
      
      // Check if destination already exists
      try {
        await fs.access(move.newPath);
        issues.push(`Destination already exists: ${move.newPath}`);
      } catch {
        // Good, destination doesn't exist
      }
    }
    
    if (issues.length > 0) {
      throw new Error(`Validation failed:\n${issues.join('\n')}`);
    }
  }

  /**
   * Create backup of files to be moved
   */
  async createBackup(plan, backupPath) {
    await fs.mkdir(backupPath, { recursive: true });
    
    // Create backup manifest
    const manifest = {
      timestamp: new Date().toISOString(),
      plan: plan,
      files: []
    };
    
    // Copy files to backup
    for (const move of plan.moves) {
      const backupFile = path.join(backupPath, path.basename(move.oldPath));
      
      try {
        await fs.copyFile(move.oldPath, backupFile);
        manifest.files.push({
          original: move.oldPath,
          backup: backupFile,
          taskId: move.taskId
        });
      } catch (error) {
        throw new Error(`Backup failed for ${move.oldPath}: ${error.message}`);
      }
    }
    
    // Save manifest
    await fs.writeFile(
      path.join(backupPath, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );
  }

  /**
   * Create directories for semantic structure
   */
  async createDirectories(directories) {
    // Sort by depth to create parent directories first
    const sorted = directories.sort((a, b) => {
      const depthA = a.split(path.sep).length;
      const depthB = b.split(path.sep).length;
      return depthA - depthB;
    });
    
    for (const dir of sorted) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  /**
   * Execute file moves atomically
   */
  async executeMoves(moves) {
    // Group moves by directory for efficiency
    const movesByDir = new Map();
    
    for (const move of moves) {
      const dir = path.dirname(move.newPath);
      if (!movesByDir.has(dir)) {
        movesByDir.set(dir, []);
      }
      movesByDir.get(dir).push(move);
    }
    
    // Execute moves directory by directory
    for (const [dir, dirMoves] of movesByDir) {
      await this.executeDirectoryMoves(dir, dirMoves);
    }
  }

  /**
   * Execute moves within a directory
   */
  async executeDirectoryMoves(dir, moves) {
    // Use temp files for atomic moves
    const tempMoves = [];
    
    try {
      // Step 1: Move to temp files
      for (const move of moves) {
        const tempPath = path.join(dir, `.temp-${path.basename(move.newPath)}`);
        await this.atomicMove(move.oldPath, tempPath);
        tempMoves.push({ temp: tempPath, final: move.newPath });
      }
      
      // Step 2: Move from temp to final
      for (const tempMove of tempMoves) {
        await this.atomicMove(tempMove.temp, tempMove.final);
      }
      
    } catch (error) {
      // Cleanup temp files on error
      for (const tempMove of tempMoves) {
        try {
          await fs.unlink(tempMove.temp);
        } catch {
          // Ignore cleanup errors
        }
      }
      throw error;
    }
  }

  /**
   * Perform atomic file move with retry logic
   */
  async atomicMove(source, destination, retries = 0) {
    try {
      // Try rename first (atomic on same filesystem)
      await fs.rename(source, destination);
    } catch (error) {
      if (error.code === 'EXDEV') {
        // Cross-device move, use copy + delete
        await fs.copyFile(source, destination);
        await fs.unlink(source);
      } else if (error.code === 'EBUSY' && retries < this.maxRetries) {
        // File busy, retry after delay
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.atomicMove(source, destination, retries + 1);
      } else {
        throw error;
      }
    }
  }

  /**
   * Cleanup empty directories after migration
   */
  async cleanupEmptyDirs(moves) {
    const dirsToCheck = new Set();
    
    // Collect all source directories
    for (const move of moves) {
      let dir = path.dirname(move.oldPath);
      while (dir && dir !== '.' && dir !== '/') {
        dirsToCheck.add(dir);
        dir = path.dirname(dir);
      }
    }
    
    // Check and remove empty directories (deepest first)
    const sortedDirs = Array.from(dirsToCheck).sort((a, b) => b.length - a.length);
    
    for (const dir of sortedDirs) {
      try {
        const entries = await fs.readdir(dir);
        if (entries.length === 0) {
          await fs.rmdir(dir);
        }
      } catch {
        // Ignore errors (directory not empty or doesn't exist)
      }
    }
  }

  /**
   * Verify integrity after migration
   */
  async verifyIntegrity(plan) {
    const errors = [];
    
    for (const move of plan.moves) {
      try {
        // Check destination exists
        await fs.access(move.newPath, fs.constants.R_OK);
        
        // Verify source is gone
        try {
          await fs.access(move.oldPath);
          errors.push(`Source still exists: ${move.oldPath}`);
        } catch {
          // Good, source is gone
        }
      } catch {
        errors.push(`Destination missing: ${move.newPath}`);
      }
    }
    
    if (errors.length > 0) {
      throw new Error(`Integrity check failed:\n${errors.join('\n')}`);
    }
  }

  /**
   * Rollback from backup
   */
  async rollbackFromBackup(backupPath, plan) {
    try {
      const manifestPath = path.join(backupPath, 'manifest.json');
      const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
      
      // Restore files
      for (const file of manifest.files) {
        try {
          await fs.copyFile(file.backup, file.original);
        } catch (error) {
          console.error(`Failed to restore ${file.original}: ${error.message}`);
        }
      }
      
      // Remove any created files
      for (const move of plan.moves) {
        try {
          await fs.unlink(move.newPath);
        } catch {
          // Ignore if doesn't exist
        }
      }
      
    } catch (error) {
      console.error(`Rollback failed: ${error.message}`);
      throw new Error('Migration failed and rollback encountered errors. Manual intervention may be required.');
    }
  }

  /**
   * Acquire migration lock
   */
  async acquireLock() {
    try {
      await fs.writeFile(this.lockFile, JSON.stringify({
        pid: process.pid,
        timestamp: new Date().toISOString()
      }), { flag: 'wx' });
      return true;
    } catch (error) {
      if (error.code === 'EEXIST') {
        // Lock file exists, check if stale
        try {
          const lock = JSON.parse(await fs.readFile(this.lockFile, 'utf8'));
          const age = Date.now() - new Date(lock.timestamp).getTime();
          
          // Consider lock stale after 5 minutes
          if (age > 5 * 60 * 1000) {
            await fs.unlink(this.lockFile);
            return this.acquireLock();
          }
        } catch {
          // Can't read lock file
        }
        return false;
      }
      throw error;
    }
  }

  /**
   * Release migration lock
   */
  async releaseLock() {
    try {
      await fs.unlink(this.lockFile);
    } catch {
      // Ignore if already removed
    }
  }
}

export default AtomicFolderOperations;