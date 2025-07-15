/**
 * Connection Protection System
 * Prevents system disconnection and data loss for real memories and tasks
 */

const fs = require('fs');
const path = require('path');

class ConnectionProtection {
  constructor(baseDir = 'memories', taskStoragePath = 'tasks') {
    this.baseDir = baseDir;
    this.taskStoragePath = taskStoragePath;
    this.backupDir = path.join(process.cwd(), 'data-backups');
    this.heartbeatInterval = null;
    this.connectionChecks = new Map();
    this.criticalDataPaths = [];
    this.isShuttingDown = false;
    
    this.init();
  }

  init() {
    // Ensure backup directory exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }

    // Register critical data paths
    this.registerCriticalPaths();
    
    // Start connection monitoring
    this.startHeartbeat();
    
    // Register graceful shutdown handlers
    this.registerShutdownHandlers();
    
    // Perform initial backup
    this.createEmergencyBackup('startup');
    
    if (process.env.DEBUG_MCP) console.error('🔒 Connection Protection System initialized');
  }

  registerCriticalPaths() {
    this.criticalDataPaths = [
      this.baseDir,
      this.taskStoragePath,
      path.join(process.cwd(), 'task-index.json'),
      path.join(process.cwd(), 'vector-storage')
    ];
  }

  startHeartbeat() {
    // Heartbeat every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000);
  }

  performHealthCheck() {
    if (this.isShuttingDown) return;

    try {
      // Check if critical directories exist and are accessible
      const checks = this.criticalDataPaths.map(dataPath => {
        const exists = fs.existsSync(dataPath);
        const accessible = exists ? this.testDirectoryAccess(dataPath) : false;
        
        return {
          path: dataPath,
          exists,
          accessible,
          timestamp: new Date().toISOString()
        };
      });

      const failedChecks = checks.filter(check => !check.exists || !check.accessible);
      
      if (failedChecks.length > 0) {
        console.error('🚨 Critical data paths inaccessible:', failedChecks);
        this.emergencyDataRecovery(failedChecks);
      }

      // Update connection status
      this.connectionChecks.set('last_check', {
        timestamp: new Date().toISOString(),
        status: failedChecks.length === 0 ? 'healthy' : 'degraded',
        checks
      });

      // Periodic backup every 10 minutes
      const lastBackup = this.connectionChecks.get('last_backup');
      const now = Date.now();
      if (!lastBackup || (now - lastBackup.timestamp) > 600000) {
        this.createEmergencyBackup('periodic');
      }

    } catch (error) {
      console.error('🚨 Health check failed:', error);
      this.createEmergencyBackup('error');
    }
  }

  testDirectoryAccess(dirPath) {
    try {
      if (fs.lstatSync(dirPath).isDirectory()) {
        // Test read access
        fs.readdirSync(dirPath);
        
        // Test write access with a temporary file
        const testFile = path.join(dirPath, '.health-check-tmp');
        fs.writeFileSync(testFile, 'test', 'utf8');
        fs.unlinkSync(testFile);
        
        return true;
      } else {
        // For files, test read access
        fs.readFileSync(dirPath, 'utf8');
        return true;
      }
    } catch (error) {
      return false;
    }
  }

  createEmergencyBackup(reason = 'manual') {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupSubDir = path.join(this.backupDir, `backup-${timestamp}-${reason}`);
      
      if (!fs.existsSync(backupSubDir)) {
        fs.mkdirSync(backupSubDir, { recursive: true });
      }

      let backupCount = 0;

      // Backup each critical path
      this.criticalDataPaths.forEach(criticalPath => {
        if (fs.existsSync(criticalPath)) {
          try {
            const backupPath = path.join(backupSubDir, path.basename(criticalPath));
            this.copyRecursive(criticalPath, backupPath);
            backupCount++;
          } catch (error) {
            console.error(`Failed to backup ${criticalPath}:`, error);
          }
        }
      });

      // Create backup manifest
      const manifest = {
        timestamp: new Date().toISOString(),
        reason,
        backupCount,
        criticalPaths: this.criticalDataPaths,
        systemInfo: {
          nodeVersion: process.version,
          platform: process.platform,
          cwd: process.cwd()
        }
      };

      fs.writeFileSync(
        path.join(backupSubDir, 'backup-manifest.json'),
        JSON.stringify(manifest, null, 2),
        'utf8'
      );

      this.connectionChecks.set('last_backup', {
        timestamp: Date.now(),
        path: backupSubDir,
        reason,
        backupCount
      });

      if (process.env.DEBUG_MCP) console.error(`✅ Emergency backup created: ${backupSubDir} (${backupCount} items)`);
      
      // Cleanup old backups (keep last 10)
      this.cleanupOldBackups();

    } catch (error) {
      console.error('🚨 Failed to create emergency backup:', error);
    }
  }

  copyRecursive(src, dest) {
    const stat = fs.lstatSync(src);
    
    if (stat.isDirectory()) {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      
      const entries = fs.readdirSync(src);
      entries.forEach(entry => {
        this.copyRecursive(path.join(src, entry), path.join(dest, entry));
      });
    } else {
      fs.copyFileSync(src, dest);
    }
  }

  cleanupOldBackups() {
    try {
      const backupEntries = fs.readdirSync(this.backupDir)
        .filter(entry => entry.startsWith('backup-'))
        .map(entry => ({
          name: entry,
          path: path.join(this.backupDir, entry),
          stat: fs.statSync(path.join(this.backupDir, entry))
        }))
        .sort((a, b) => b.stat.mtime - a.stat.mtime);

      // Keep only the 10 most recent backups
      if (backupEntries.length > 10) {
        const toDelete = backupEntries.slice(10);
        toDelete.forEach(backup => {
          try {
            this.removeRecursive(backup.path);
            if (process.env.DEBUG_MCP) console.error(`🗑️ Cleaned up old backup: ${backup.name}`);
          } catch (error) {
            console.error(`Failed to delete old backup ${backup.name}:`, error);
          }
        });
      }
    } catch (error) {
      console.error('Failed to cleanup old backups:', error);
    }
  }

  removeRecursive(dirPath) {
    if (fs.existsSync(dirPath)) {
      if (fs.lstatSync(dirPath).isDirectory()) {
        fs.readdirSync(dirPath).forEach(entry => {
          this.removeRecursive(path.join(dirPath, entry));
        });
        fs.rmdirSync(dirPath);
      } else {
        fs.unlinkSync(dirPath);
      }
    }
  }

  emergencyDataRecovery(failedChecks) {
    if (process.env.DEBUG_MCP) console.error('🚨 Initiating emergency data recovery...');
    
    failedChecks.forEach(check => {
      try {
        // Try to restore from most recent backup
        const latestBackup = this.findLatestBackup();
        if (latestBackup) {
          const backupItem = path.join(latestBackup, path.basename(check.path));
          if (fs.existsSync(backupItem)) {
            if (process.env.DEBUG_MCP) console.error(`🔄 Restoring ${check.path} from backup...`);
            
            // Ensure parent directory exists
            const parentDir = path.dirname(check.path);
            if (!fs.existsSync(parentDir)) {
              fs.mkdirSync(parentDir, { recursive: true });
            }
            
            this.copyRecursive(backupItem, check.path);
            if (process.env.DEBUG_MCP) console.error(`✅ Restored ${check.path}`);
          }
        }
      } catch (error) {
        console.error(`Failed to recover ${check.path}:`, error);
      }
    });
  }

  findLatestBackup() {
    try {
      const backups = fs.readdirSync(this.backupDir)
        .filter(entry => entry.startsWith('backup-'))
        .map(entry => ({
          name: entry,
          path: path.join(this.backupDir, entry),
          mtime: fs.statSync(path.join(this.backupDir, entry)).mtime
        }))
        .sort((a, b) => b.mtime - a.mtime);

      return backups.length > 0 ? backups[0].path : null;
    } catch (error) {
      console.error('Failed to find latest backup:', error);
      return null;
    }
  }

  registerShutdownHandlers() {
    const gracefulShutdown = (signal) => {
      if (process.env.DEBUG_MCP) console.error(`\n🔒 Received ${signal}, performing graceful shutdown...`);
      this.isShuttingDown = true;
      
      // Create final backup
      this.createEmergencyBackup(`shutdown-${signal.toLowerCase()}`);
      
      // Stop heartbeat
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
      }
      
      if (process.env.DEBUG_MCP) console.error('✅ Connection protection shutdown complete');
      process.exit(0);
    };

    // Handle various shutdown signals
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('🚨 Uncaught exception:', error);
      this.createEmergencyBackup('uncaught-exception');
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('🚨 Unhandled rejection:', reason);
      this.createEmergencyBackup('unhandled-rejection');
    });
  }

  preventDataLoss(operation, data) {
    // Create a backup before any critical operation
    try {
      this.createEmergencyBackup(`pre-${operation}`);
      return true;
    } catch (error) {
      console.error(`Failed to create pre-operation backup for ${operation}:`, error);
      return false;
    }
  }

  getConnectionStatus() {
    return {
      isHealthy: this.connectionChecks.get('last_check')?.status === 'healthy',
      lastCheck: this.connectionChecks.get('last_check'),
      lastBackup: this.connectionChecks.get('last_backup'),
      backupDirectory: this.backupDir,
      criticalPaths: this.criticalDataPaths
    };
  }
}

module.exports = { ConnectionProtection };