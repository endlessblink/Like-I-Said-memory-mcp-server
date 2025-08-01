#!/usr/bin/env node

import { SystemSafeguards } from '../lib/system-safeguards.js';

async function testBackupSystem() {
  console.log('🧪 Testing Enhanced Backup System v2.8.5\n');
  
  const safeguards = new SystemSafeguards();
  
  // Test 1: Check system health
  console.log('1️⃣ Checking system health...');
  const health = await safeguards.checkSystemHealth();
  console.log(`   Status: ${health.status}`);
  console.log(`   Tasks: ${health.stats.tasks}`);
  console.log(`   Memories: ${health.stats.memories}`);
  console.log(`   Projects: ${health.stats.projects}`);
  console.log(`   Backups: ${health.stats.backups}`);
  console.log(`   Total Storage: ${safeguards.formatBytes(health.stats.totalStorageSize)}`);
  if (health.issues.length > 0) {
    console.log(`   Issues: ${health.issues.join(', ')}`);
  }
  console.log(`   Last Backup: ${health.backup.lastBackup}`);
  console.log(`   Next Backup: ${health.backup.nextBackup}`);
  console.log(`   Auto Backup: ${health.backup.autoBackupEnabled}\n`);
  
  // Test 2: Create a manual backup
  console.log('2️⃣ Creating manual backup...');
  try {
    const backupPath = await safeguards.createBackup('test-manual');
    console.log(`   ✅ Backup created successfully\n`);
  } catch (error) {
    console.error(`   ❌ Backup failed: ${error.message}\n`);
  }
  
  // Test 3: List backups
  console.log('3️⃣ Listing available backups...');
  const backups = await safeguards.listBackups();
  console.log(`   Found ${backups.length} backups:`);
  backups.slice(0, 5).forEach(backup => {
    console.log(`   - ${backup.name}`);
    console.log(`     Size: ${safeguards.formatBytes(backup.size)}`);
    console.log(`     Created: ${backup.manifest.timestamp}`);
    console.log(`     Operation: ${backup.manifest.operation}`);
    if (backup.manifest.statistics) {
      console.log(`     Contents: ${backup.manifest.statistics.tasks} tasks, ${backup.manifest.statistics.memories} memories`);
    }
  });
  if (backups.length > 5) {
    console.log(`   ... and ${backups.length - 5} more\n`);
  } else {
    console.log('');
  }
  
  // Test 4: Test automatic backup timer
  console.log('4️⃣ Testing automatic backup timer...');
  console.log(`   Backup interval: ${safeguards.formatDuration(safeguards.backupInterval)}`);
  console.log(`   Max backups: ${safeguards.maxBackups}`);
  console.log(`   Auto backup enabled: ${safeguards.autoBackup}`);
  
  // Start and immediately stop to test
  safeguards.startAutoBackup();
  console.log('   ✅ Auto backup timer started');
  
  safeguards.stopAutoBackup();
  console.log('   ✅ Auto backup timer stopped\n');
  
  // Test 5: Check backup rotation
  console.log('5️⃣ Checking backup rotation...');
  if (backups.length > safeguards.maxBackups) {
    console.log(`   ⚠️  Backup count (${backups.length}) exceeds maximum (${safeguards.maxBackups})`);
    console.log('   Running rotation...');
    await safeguards.rotateBackups();
    const newBackups = await safeguards.listBackups();
    console.log(`   ✅ Rotation complete. Backups reduced to ${newBackups.length}\n`);
  } else {
    console.log(`   ✅ Backup count (${backups.length}) within limits\n`);
  }
  
  console.log('✨ Backup system test complete!');
}

// Run the test
testBackupSystem().catch(console.error);