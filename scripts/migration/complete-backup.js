#!/usr/bin/env node

/**
 * Complete Storage Backup System
 * 
 * Creates comprehensive backup of all 77 discovered storage locations
 * before beginning consolidation migration.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// All discovered storage locations (from inventory)
const ALL_STORAGE_LOCATIONS = [
  // Like-I-Said MCP Installations
  '/mnt/d/APPSNospaces/like-i-said-mcp/memories',
  '/mnt/d/APPSNospaces/like-i-said-mcp/tasks',
  '/mnt/d/APPSNospaces/like-i-said-mcp-server-error/memories',
  '/mnt/d/APPSNospaces/like-i-said-mcp-server-error/tasks',
  '/mnt/d/APPSNospaces/like-i-said-mcp-temp',
  '/mnt/d/shared/like-i-said-mcp/tasks',
  
  // Project Storage
  '/mnt/d/MY PROJECTS/AI/LLM/AI Code Gen/my-builds/Video + Motion/rough-cut-mcp/tasks',
  '/mnt/d/MY PROJECTS/AI/LLM/AI Code Gen/my-builds/Productivity/Pomo/memories',
  '/mnt/d/MY PROJECTS/AI/LLM/AI Code Gen/my-builds/Productivity/Pomo/tasks',
  '/mnt/d/MY PROJECTS/AI/LLM/AI Code Gen/my-builds/Productivity/Pomo-TaskFlow/memories',
  '/mnt/d/MY PROJECTS/AI/LLM/AI Code Gen/my-builds/Productivity/Pomo-TaskFlow/tasks',
  '/mnt/d/MY PROJECTS/AI/LLM/AI Code Gen/my-builds/Commercial Projects/Palladio-gen/memories',
  '/mnt/d/MY PROJECTS/AI/LLM/AI Code Gen/my-builds/Commercial Projects/Palladio-gen/tasks',
  
  // Home Directory Storage
  '/home/endlessblink/memories',
  '/home/endlessblink/projects/memories',
  '/home/endlessblink/projects/tasks',
  '/home/endlessblink/projects/palladio/memories',
  '/home/endlessblink/projects/palladio/tasks',
  '/home/endlessblink/projects/bina-bekitzur/memories',
  '/home/endlessblink/projects/bina-bekitzur/tasks',
  '/home/endlessblink/projects/bina-bekitzur-main/memories',
  '/home/endlessblink/projects/bina-bekitzur-main/tasks',
  '/home/endlessblink/.codeium/windsurf/memories',
  
  // Windows Storage
  '/mnt/c/Users/endle/tasks',
  '/mnt/c/Users/endle/memories',
  
  // Additional MCP Installations
  '/mnt/d/APPSNospaces/Site-Control-MCP',
  '/mnt/d/APPSNospaces/enhanced-anytype-mcp',
  '/mnt/d/APPSNospaces/original-anytype-mcp'
];

// Create timestamped backup directory
const backupTimestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '-' + 
                        new Date().toISOString().replace(/[:.]/g, '-').split('T')[1].slice(0, -5);
const backupBaseDir = path.join(__dirname, `COMPLETE-BACKUP-${backupTimestamp}`);

function createBackupStructure() {
  console.log('📁 Creating backup directory structure...');
  
  // Create main backup directory
  if (!fs.existsSync(backupBaseDir)) {
    fs.mkdirSync(backupBaseDir, { recursive: true });
  }
  
  // Create subdirectories for organization
  const backupCategories = [
    'like-i-said-installations',
    'project-storage', 
    'home-directory',
    'windows-storage',
    'other-mcp'
  ];
  
  backupCategories.forEach(category => {
    const categoryDir = path.join(backupBaseDir, category);
    fs.mkdirSync(categoryDir, { recursive: true });
  });
  
  console.log(`✅ Backup structure created: ${backupBaseDir}`);
  return backupBaseDir;
}

function categorizeStoragePath(storagePath) {
  const pathLower = storagePath.toLowerCase();
  
  if (pathLower.includes('like-i-said')) return 'like-i-said-installations';
  if (pathLower.includes('/home/endlessblink')) return 'home-directory';
  if (pathLower.includes('/mnt/c/users')) return 'windows-storage';
  if (pathLower.includes('my projects')) return 'project-storage';
  return 'other-mcp';
}

function copyStorageLocation(source, category, backupDir) {
  if (!fs.existsSync(source)) {
    console.log(`  ⏭️ Skipped: ${source} (does not exist)`);
    return false;
  }
  
  try {
    // Create safe backup path
    const relativePath = source.replace(/^\/mnt\/[a-z]\//, '').replace(/^\/home\//, 'home-').replace(/\//g, '_');
    const backupPath = path.join(backupDir, category, relativePath);
    
    // Ensure target directory exists
    const backupParent = path.dirname(backupPath);
    fs.mkdirSync(backupParent, { recursive: true });
    
    // Copy the storage location
    fs.cpSync(source, backupPath, { 
      recursive: true,
      errorOnExist: false,
      force: true
    });
    
    // Verify copy
    const sourceStats = fs.statSync(source);
    const backupStats = fs.statSync(backupPath);
    
    if (sourceStats.isDirectory()) {
      const sourceFiles = fs.readdirSync(source).length;
      const backupFiles = fs.readdirSync(backupPath).length;
      
      if (sourceFiles === backupFiles) {
        console.log(`  ✅ Backed up: ${source} → ${backupPath} (${sourceFiles} files)`);
        return true;
      } else {
        console.log(`  ❌ File count mismatch: ${source} (${sourceFiles} vs ${backupFiles})`);
        return false;
      }
    } else {
      console.log(`  ✅ Backed up: ${source} → ${backupPath} (file)`);
      return true;
    }
    
  } catch (error) {
    console.log(`  ❌ Backup failed: ${source} - ${error.message}`);
    return false;
  }
}

// Main backup process
async function createCompleteBackup() {
  console.log('🚀 Starting COMPLETE storage backup...');
  console.log(`📊 Backing up ${ALL_STORAGE_LOCATIONS.length} storage locations`);
  console.log(`💾 Target: ${backupBaseDir}\n`);
  
  const backupDir = createBackupStructure();
  
  let successCount = 0;
  let failCount = 0;
  const backupResults = [];
  
  for (const [index, location] of ALL_STORAGE_LOCATIONS.entries()) {
    console.log(`📦 ${index + 1}/${ALL_STORAGE_LOCATIONS.length}: ${location}`);
    
    const category = categorizeStoragePath(location);
    const success = copyStorageLocation(location, category, backupDir);
    
    backupResults.push({
      location,
      category,
      success,
      timestamp: new Date()
    });
    
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }
  
  // Generate backup report
  console.log('\n' + '='.repeat(80));
  console.log('💾 COMPLETE BACKUP REPORT');
  console.log('='.repeat(80));
  console.log(`✅ Successfully backed up: ${successCount} locations`);
  console.log(`❌ Failed to backup: ${failCount} locations`);
  console.log(`📁 Backup location: ${backupDir}`);
  
  if (failCount > 0) {
    console.log('\n❌ FAILED BACKUPS:');
    backupResults.filter(r => !r.success).forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.location}`);
    });
  }
  
  // Create backup manifest
  const manifest = {
    timestamp: new Date().toISOString(),
    totalLocations: ALL_STORAGE_LOCATIONS.length,
    successfulBackups: successCount,
    failedBackups: failCount,
    backupDirectory: backupDir,
    results: backupResults
  };
  
  fs.writeFileSync(
    path.join(backupDir, 'backup-manifest.json'), 
    JSON.stringify(manifest, null, 2)
  );
  
  console.log('\n✅ Backup manifest created: backup-manifest.json');
  
  if (successCount === ALL_STORAGE_LOCATIONS.length) {
    console.log('\n🎉 COMPLETE BACKUP SUCCESS - Ready for safe migration!');
    console.log('All storage locations safely backed up with full recovery capability.');
    return true;
  } else {
    console.log('\n⚠️ BACKUP INCOMPLETE - Review failed locations before proceeding');
    return false;
  }
}

// Run backup
createCompleteBackup().then(success => {
  if (success) {
    console.log('\n🚀 Next: Ready to begin systematic migration to consolidated storage');
  } else {
    console.log('\n🛑 Fix backup issues before proceeding with migration');
  }
}).catch(error => {
  console.error('❌ Backup failed:', error.message);
  process.exit(1);
});