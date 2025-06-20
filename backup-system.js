import chokidar from 'chokidar';
import compressing from 'compressing';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Configuration
const MEMORIES_DIR = path.resolve('./memories');
const BACKUP_DIR = path.resolve('./backups');
const EXTERNAL_BACKUP = process.env.EXTERNAL_BACKUP_PATH || '/mnt/d/APPSNospaces/backups';
const MAX_LOCAL_BACKUPS = 30; // Keep 30 days of backups
const BACKUP_DEBOUNCE_MS = 5000; // Wait 5 seconds after last change

// Ensure backup directories exist
await fsp.mkdir(BACKUP_DIR, { recursive: true });
await fsp.mkdir(EXTERNAL_BACKUP, { recursive: true });

// Backup state
let backupTimeout = null;
let lastBackupHash = '';

/**
 * Generate SHA-256 checksum for a file
 */
async function generateChecksum(filePath) {
  const hash = crypto.createHash('sha256');
  const stream = fs.createReadStream(filePath);
  
  for await (const chunk of stream) {
    hash.update(chunk);
  }
  
  return hash.digest('hex');
}

/**
 * Get current state hash of memories directory
 */
async function getMemoriesStateHash() {
  const files = await fsp.readdir(MEMORIES_DIR, { recursive: true });
  const hash = crypto.createHash('sha256');
  
  for (const file of files.sort()) {
    if (file.endsWith('.md')) {
      const content = await fsp.readFile(path.join(MEMORIES_DIR, file), 'utf8');
      hash.update(file + content);
    }
  }
  
  return hash.digest('hex');
}

/**
 * Count memories in directory
 */
async function countMemories() {
  const files = await fsp.readdir(MEMORIES_DIR, { recursive: true });
  return files.filter(f => f.endsWith('.md')).length;
}

/**
 * Perform backup with verification
 */
async function performBackup() {
  console.log('🔄 Starting backup process...');
  
  try {
    // Check if there are actual changes
    const currentHash = await getMemoriesStateHash();
    if (currentHash === lastBackupHash) {
      console.log('⏭️  No changes detected, skipping backup');
      return;
    }
    
    // Count memories before backup
    const memoryCount = await countMemories();
    console.log(`📊 Backing up ${memoryCount} memories`);
    
    // Create timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `memories-backup-${timestamp}`;
    
    // Create compressed backup
    const localBackupPath = path.join(BACKUP_DIR, `${backupName}.tar.gz`);
    await compressing.tgz.compressDir(MEMORIES_DIR, localBackupPath);
    
    // Generate checksum
    const checksum = await generateChecksum(localBackupPath);
    await fsp.writeFile(`${localBackupPath}.sha256`, checksum);
    
    // Copy to external location
    const externalBackupPath = path.join(EXTERNAL_BACKUP, `${backupName}.tar.gz`);
    await fsp.copyFile(localBackupPath, externalBackupPath);
    await fsp.copyFile(`${localBackupPath}.sha256`, `${externalBackupPath}.sha256`);
    
    // Create metadata file
    const metadata = {
      timestamp: new Date().toISOString(),
      memoryCount,
      checksum,
      size: (await fsp.stat(localBackupPath)).size,
      stateHash: currentHash
    };
    await fsp.writeFile(
      `${localBackupPath}.meta.json`,
      JSON.stringify(metadata, null, 2)
    );
    
    // Git commit backup metadata (not the actual backup file)
    try {
      await execAsync(`git add ${BACKUP_DIR}/*.meta.json`);
      await execAsync(`git commit -m "🔒 Auto-backup: ${memoryCount} memories at ${timestamp}"`);
    } catch (e) {
      // Git commit is optional, don't fail backup
    }
    
    // Cleanup old backups
    await cleanupOldBackups();
    
    // Update state
    lastBackupHash = currentHash;
    
    console.log(`✅ Backup completed: ${backupName}`);
    console.log(`   Local: ${localBackupPath}`);
    console.log(`   External: ${externalBackupPath}`);
    console.log(`   Checksum: ${checksum}`);
    
  } catch (error) {
    console.error('❌ Backup failed:', error);
    // Send notification or alert
  }
}

/**
 * Clean up old backups keeping only recent ones
 */
async function cleanupOldBackups() {
  const files = await fsp.readdir(BACKUP_DIR);
  const backupFiles = files
    .filter(f => f.startsWith('memories-backup-') && f.endsWith('.tar.gz'))
    .map(f => ({
      name: f,
      path: path.join(BACKUP_DIR, f),
      time: fs.statSync(path.join(BACKUP_DIR, f)).mtime
    }))
    .sort((a, b) => b.time - a.time);
  
  // Keep only MAX_LOCAL_BACKUPS
  const toDelete = backupFiles.slice(MAX_LOCAL_BACKUPS);
  for (const file of toDelete) {
    await fsp.unlink(file.path);
    await fsp.unlink(`${file.path}.sha256`).catch(() => {});
    await fsp.unlink(`${file.path}.meta.json`).catch(() => {});
    console.log(`🗑️  Deleted old backup: ${file.name}`);
  }
}

/**
 * Verify backup integrity
 */
async function verifyBackup(backupPath) {
  const checksumFile = `${backupPath}.sha256`;
  if (!fs.existsSync(checksumFile)) {
    throw new Error('Checksum file not found');
  }
  
  const expectedChecksum = await fsp.readFile(checksumFile, 'utf8');
  const actualChecksum = await generateChecksum(backupPath);
  
  if (expectedChecksum.trim() !== actualChecksum) {
    throw new Error(`Checksum mismatch! Expected: ${expectedChecksum}, Got: ${actualChecksum}`);
  }
  
  return true;
}

/**
 * Restore from backup
 */
async function restoreFromBackup(backupPath) {
  console.log(`🔄 Restoring from backup: ${backupPath}`);
  
  // Verify integrity first
  await verifyBackup(backupPath);
  
  // Create restore directory
  const restoreDir = path.join(path.dirname(backupPath), 'restore-test');
  await fsp.rm(restoreDir, { recursive: true, force: true });
  await fsp.mkdir(restoreDir, { recursive: true });
  
  // Extract backup
  await compressing.tgz.uncompress(backupPath, restoreDir);
  
  // Count restored files
  const restoredFiles = await fsp.readdir(path.join(restoreDir, 'memories'), { recursive: true });
  const mdFiles = restoredFiles.filter(f => f.endsWith('.md'));
  
  console.log(`✅ Restored ${mdFiles.length} memory files`);
  
  // Cleanup test restore
  await fsp.rm(restoreDir, { recursive: true, force: true });
  
  return mdFiles.length;
}

/**
 * Schedule backup with debouncing
 */
function scheduleBackup() {
  if (backupTimeout) {
    clearTimeout(backupTimeout);
  }
  
  backupTimeout = setTimeout(() => {
    performBackup();
  }, BACKUP_DEBOUNCE_MS);
}

// Initialize watcher
console.log('🚀 Starting backup system...');
console.log(`📁 Watching: ${MEMORIES_DIR}`);
console.log(`💾 Local backups: ${BACKUP_DIR}`);
console.log(`💾 External backups: ${EXTERNAL_BACKUP}`);

// Initial backup
await performBackup();

// Set up file watcher
const watcher = chokidar.watch(MEMORIES_DIR, {
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 2000,
    pollInterval: 100
  },
  depth: 10
});

watcher
  .on('add', () => {
    console.log('📝 File added, scheduling backup...');
    scheduleBackup();
  })
  .on('change', () => {
    console.log('✏️  File changed, scheduling backup...');
    scheduleBackup();
  })
  .on('unlink', () => {
    console.log('🗑️  File deleted, scheduling backup...');
    scheduleBackup();
  })
  .on('addDir', () => scheduleBackup())
  .on('unlinkDir', () => scheduleBackup())
  .on('error', error => console.error('❌ Watcher error:', error));

// Periodic integrity check (every hour)
setInterval(async () => {
  console.log('🔍 Running periodic integrity check...');
  const files = await fsp.readdir(BACKUP_DIR);
  const latestBackup = files
    .filter(f => f.startsWith('memories-backup-') && f.endsWith('.tar.gz'))
    .sort()
    .pop();
  
  if (latestBackup) {
    try {
      await verifyBackup(path.join(BACKUP_DIR, latestBackup));
      console.log('✅ Latest backup integrity verified');
    } catch (error) {
      console.error('❌ Backup integrity check failed:', error);
    }
  }
}, 3600000); // 1 hour

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down backup system...');
  watcher.close();
  process.exit(0);
});

export { performBackup, verifyBackup, restoreFromBackup };