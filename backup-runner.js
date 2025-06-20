#!/usr/bin/env node

/**
 * Backup Runner - CLI interface for the backup system
 */

import { performBackup, verifyBackup, restoreFromBackup } from './backup-system.js';
import fs from 'fs/promises';
import path from 'path';

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  switch (command) {
    case 'backup':
    case '--single-backup':
      console.log('🔄 Running single backup...');
      await performBackup();
      process.exit(0);
      
    case 'verify':
      const backupFile = args[1];
      if (!backupFile) {
        console.error('Usage: node backup-runner.js verify <backup-file>');
        process.exit(1);
      }
      console.log(`🔍 Verifying backup: ${backupFile}`);
      try {
        await verifyBackup(backupFile);
        console.log('✅ Backup verified successfully');
      } catch (error) {
        console.error('❌ Backup verification failed:', error.message);
        process.exit(1);
      }
      break;
      
    case 'restore':
      const restoreFile = args[1];
      if (!restoreFile) {
        console.error('Usage: node backup-runner.js restore <backup-file>');
        process.exit(1);
      }
      console.log(`🔄 Testing restore from: ${restoreFile}`);
      try {
        const count = await restoreFromBackup(restoreFile);
        console.log(`✅ Restore test successful: ${count} files`);
      } catch (error) {
        console.error('❌ Restore test failed:', error.message);
        process.exit(1);
      }
      break;
      
    case 'status':
      console.log('📊 Backup System Status');
      console.log('=======================');
      
      // Count current memories
      const files = await fs.readdir('./memories', { recursive: true });
      const mdFiles = files.filter(f => f.endsWith('.md'));
      console.log(`Current memories: ${mdFiles.length}`);
      
      // List recent backups
      try {
        const backups = await fs.readdir('./backups');
        const recentBackups = backups
          .filter(f => f.endsWith('.tar.gz'))
          .sort()
          .slice(-5);
        
        console.log(`Recent backups: ${recentBackups.length > 0 ? recentBackups.length : 'None'}`);
        if (recentBackups.length > 0) {
          console.log('Latest:', recentBackups[recentBackups.length - 1]);
        }
      } catch (error) {
        console.log('Recent backups: Unable to check');
      }
      break;
      
    case 'watch':
    default:
      console.log('🚀 Starting backup watcher...');
      // Import and run the main backup system
      await import('./backup-system.js');
      break;
  }
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});