#!/usr/bin/env node

import chokidar from 'chokidar';
import { parentPort } from 'worker_threads';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MEMORIES_DIR = process.env.MEMORIES_DIR || path.resolve('./memories');
const BACKUP_DIR = path.resolve('./backup');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

let backupTimeout;
let pendingChanges = new Set();

const watcher = chokidar.watch(MEMORIES_DIR, {
  persistent: true,
  ignoreInitial: true, // Don't trigger on initial scan
  awaitWriteFinish: {
    stabilityThreshold: 2000,
    pollInterval: 100
  },
  usePolling: true, // Required for WSL2 compatibility
  depth: 10,
  ignored: [
    '**/node_modules/**',
    '**/.git/**',
    '**/backup/**'
  ]
});

function logChange(type, filepath) {
  const relativePath = path.relative(MEMORIES_DIR, filepath);
  pendingChanges.add({ type, path: relativePath, fullPath: filepath });
  
  // Debounce backup creation to avoid excessive backups
  clearTimeout(backupTimeout);
  backupTimeout = setTimeout(() => {
    createBackup();
  }, 3000); // Wait 3 seconds after last change
  
  // Notify parent about the change
  if (parentPort) {
    parentPort.postMessage({
      type: 'backup-event',
      data: { 
        timestamp: new Date().toISOString(),
        operation: type, 
        path: relativePath,
        changes: pendingChanges.size
      }
    });
  }
}

async function createBackup() {
  if (pendingChanges.size === 0) return;
  
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_DIR, `memories-backup-${timestamp}.tar.gz`);
    
    // Create compressed backup
    const tar = spawn('tar', [
      '-czf', backupFile,
      '-C', path.dirname(MEMORIES_DIR),
      path.basename(MEMORIES_DIR)
    ], {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    tar.on('close', (code) => {
      if (code === 0) {
        if (parentPort) {
          parentPort.postMessage({
            type: 'backup-created',
            data: {
              timestamp: new Date().toISOString(),
              file: backupFile,
              changes: Array.from(pendingChanges)
            }
          });
        }
        
        // Clean up old backups (keep last 30)
        cleanupOldBackups();
        
        // Clear pending changes
        pendingChanges.clear();
      } else {
        if (parentPort) {
          parentPort.postMessage({
            type: 'backup-error',
            data: { error: `Backup process exited with code ${code}` }
          });
        }
      }
    });
    
    tar.on('error', (error) => {
      if (parentPort) {
        parentPort.postMessage({
          type: 'backup-error',
          data: { error: error.message }
        });
      }
    });
    
  } catch (error) {
    if (parentPort) {
      parentPort.postMessage({
        type: 'backup-error',
        data: { error: error.message }
      });
    }
  }
}

function cleanupOldBackups() {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('memories-backup-') && f.endsWith('.tar.gz'))
      .map(f => ({
        name: f,
        path: path.join(BACKUP_DIR, f),
        mtime: fs.statSync(path.join(BACKUP_DIR, f)).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime);
    
    // Keep only the latest 30 backups
    const filesToDelete = files.slice(30);
    
    filesToDelete.forEach(file => {
      try {
        fs.unlinkSync(file.path);
      } catch (err) {
        // Ignore errors during cleanup
      }
    });
    
    if (filesToDelete.length > 0 && parentPort) {
      parentPort.postMessage({
        type: 'backup-cleanup',
        data: { deleted: filesToDelete.length, kept: Math.min(files.length, 30) }
      });
    }
    
  } catch (error) {
    // Ignore cleanup errors
  }
}

// Setup file watchers
watcher
  .on('add', path => logChange('add', path))
  .on('change', path => logChange('change', path))
  .on('unlink', path => logChange('remove', path))
  .on('addDir', path => logChange('addDir', path))
  .on('unlinkDir', path => logChange('removeDir', path))
  .on('error', error => {
    if (parentPort) {
      parentPort.postMessage({
        type: 'watcher-error',
        data: { error: error.message }
      });
    }
  });

// Handle messages from parent
if (parentPort) {
  parentPort.on('message', (message) => {
    if (message === 'shutdown') {
      watcher.close().then(() => {
        process.exit(0);
      });
    } else if (message === 'force-backup') {
      createBackup();
    } else if (message === 'status') {
      parentPort.postMessage({
        type: 'status',
        data: {
          watching: MEMORIES_DIR,
          backupDir: BACKUP_DIR,
          pendingChanges: pendingChanges.size,
          watchedPaths: watcher.getWatched()
        }
      });
    }
  });
  
  // Send ready signal
  parentPort.postMessage({
    type: 'ready',
    data: {
      pid: process.pid,
      memoriesDir: MEMORIES_DIR,
      backupDir: BACKUP_DIR
    }
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  watcher.close().then(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  watcher.close().then(() => {
    process.exit(0);
  });
});