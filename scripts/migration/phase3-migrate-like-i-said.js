#!/usr/bin/env node

/**
 * Phase 3: Migrate Like-I-Said Installations
 * 
 * Migrate all scattered Like-I-Said installations to consolidated storage.
 * This is the biggest phase with most of the data.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Phase 3: Like-I-Said installation locations (the bulk of data)
const LIKE_I_SAID_INSTALLATIONS = [
  // Server Error Installation (large dataset)
  '/mnt/d/APPSNospaces/like-i-said-mcp-server-error/memories',
  '/mnt/d/APPSNospaces/like-i-said-mcp-server-error/tasks',
  
  // Development installations
  '/mnt/d/MY PROJECTS/AI/LLM/AI Code Gen/my-builds/My MCP/like-i-said-npm-test-2/Like-I-Said-memory-mcp-server/memories',
  '/mnt/d/MY PROJECTS/AI/LLM/AI Code Gen/my-builds/My MCP/like-i-said-npm-test-2/Like-I-Said-memory-mcp-server/tasks'
];

function safeExists(path) {
  try { return fs.existsSync(path); } catch { return false; }
}

function safeReadDir(path) {
  try { return fs.readdirSync(path); } catch { return []; }
}

function migrateInstallationData(sourceInstallation) {
  console.log(`\\n📂 Migrating installation: ${sourceInstallation}`);
  
  if (!safeExists(sourceInstallation)) {
    console.log(`  ⏭️ Installation not found`);
    return { migrated: 0, errors: [] };
  }
  
  const results = { migrated: 0, errors: [], details: [] };
  const isMemoryDir = sourceInstallation.includes('/memories');
  const isTaskDir = sourceInstallation.includes('/tasks');
  
  try {
    if (isMemoryDir) {
      // Migrate memory data
      const targetMemoriesDir = path.join(__dirname, 'memories');
      
      // Check if this is a parent memories directory or specific project
      const entries = safeReadDir(sourceInstallation);
      
      for (const entry of entries) {
        const sourcePath = path.join(sourceInstallation, entry);
        const stats = fs.statSync(sourcePath);
        
        if (stats.isDirectory()) {
          // Project-specific memory directory
          const projectTargetDir = path.join(targetMemoriesDir, entry);
          if (!safeExists(projectTargetDir)) {
            fs.mkdirSync(projectTargetDir, { recursive: true });
          }
          
          // Copy all memory files from this project
          const memoryFiles = safeReadDir(sourcePath).filter(f => f.endsWith('.md'));
          
          for (const memFile of memoryFiles) {
            const srcMemPath = path.join(sourcePath, memFile);
            const tgtMemPath = path.join(projectTargetDir, memFile);
            
            try {
              if (safeExists(tgtMemPath)) {
                // Check if source is newer
                const srcStats = fs.statSync(srcMemPath);
                const tgtStats = fs.statSync(tgtMemPath);
                
                if (srcStats.mtime > tgtStats.mtime) {
                  fs.copyFileSync(srcMemPath, tgtMemPath);
                  results.details.push(`🔄 ${entry}/${memFile} (updated)`);
                } else {
                  results.details.push(`⏭️ ${entry}/${memFile} (kept existing)`);
                }
              } else {
                fs.copyFileSync(srcMemPath, tgtMemPath);
                results.details.push(`➕ ${entry}/${memFile} (new)`);
              }
              results.migrated++;
            } catch (error) {
              results.errors.push(`${entry}/${memFile}: ${error.message}`);
            }
          }
          
        } else if (entry.endsWith('.md')) {
          // Direct memory file in installation root
          const targetPath = path.join(targetMemoriesDir, 'imported-memories', entry);
          const targetDir = path.dirname(targetPath);
          
          if (!safeExists(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }
          
          try {
            fs.copyFileSync(sourcePath, targetPath);
            results.details.push(`➕ imported-memories/${entry}`);
            results.migrated++;
          } catch (error) {
            results.errors.push(`${entry}: ${error.message}`);
          }
        }
      }
      
    } else if (isTaskDir) {
      // Migrate task data
      const targetTasksDir = path.join(__dirname, 'tasks');
      
      const entries = safeReadDir(sourceInstallation);
      
      for (const entry of entries) {
        const sourcePath = path.join(sourceInstallation, entry);
        const stats = fs.statSync(sourcePath);
        
        if (stats.isDirectory()) {
          // Project-specific task directory
          const projectTargetDir = path.join(targetTasksDir, entry);
          if (!safeExists(projectTargetDir)) {
            fs.mkdirSync(projectTargetDir, { recursive: true });
          }
          
          // Check for tasks.json in source project
          const sourceTasksJson = path.join(sourcePath, 'tasks.json');
          const targetTasksJson = path.join(projectTargetDir, 'tasks.json');
          
          if (safeExists(sourceTasksJson)) {
            try {
              const sourceData = JSON.parse(fs.readFileSync(sourceTasksJson, 'utf8'));
              const sourceTasks = Array.isArray(sourceData) ? sourceData : [sourceData];
              
              // Read existing target tasks
              let existingTasks = [];
              if (safeExists(targetTasksJson)) {
                const existingData = JSON.parse(fs.readFileSync(targetTasksJson, 'utf8'));
                existingTasks = Array.isArray(existingData) ? existingData : [existingData];
              }
              
              // Merge tasks
              const existingIds = new Set(existingTasks.map(t => t.id));
              const mergedTasks = [...existingTasks];
              let addedCount = 0;
              
              sourceTasks.forEach(sourceTask => {
                if (!existingIds.has(sourceTask.id)) {
                  mergedTasks.push(sourceTask);
                  addedCount++;
                  results.details.push(`➕ ${entry}/${sourceTask.id}`);
                }
              });
              
              if (addedCount > 0) {
                fs.writeFileSync(targetTasksJson, JSON.stringify(mergedTasks, null, 2));
                results.migrated += addedCount;
              }
              
            } catch (error) {
              results.errors.push(`${entry}/tasks.json: ${error.message}`);
            }
          }
        }
      }
    }
    
  } catch (error) {
    results.errors.push(`Installation error: ${error.message}`);
  }
  
  return results;
}

// Main Phase 3 migration
async function migrateLikeISaidInstallations() {
  console.log('🚀 Phase 3: Migrating Like-I-Said Installations');
  console.log(`📊 Migrating ${LIKE_I_SAID_INSTALLATIONS.length} Like-I-Said installations`);
  console.log(`💾 This contains the bulk of your data\\n`);
  
  let totalMigrated = 0;
  let totalErrors = [];
  
  for (const [index, installation] of LIKE_I_SAID_INSTALLATIONS.entries()) {
    console.log(`📦 ${index + 1}/${LIKE_I_SAID_INSTALLATIONS.length}: ${path.basename(path.dirname(installation))}/${path.basename(installation)}`);
    
    const results = migrateInstallationData(installation);
    
    console.log(`  ✅ Migrated ${results.migrated} items`);
    
    if (results.details.length > 0) {
      console.log(`  📋 Items (showing first 10):`);
      results.details.slice(0, 10).forEach(detail => console.log(`    ${detail}`));
      if (results.details.length > 10) {
        console.log(`    ... and ${results.details.length - 10} more items`);
      }
    }
    
    if (results.errors.length > 0) {
      console.log(`  ⚠️ ${results.errors.length} errors`);
    }
    
    totalMigrated += results.migrated;
    totalErrors.push(...results.errors);
  }
  
  // Phase 3 Summary
  console.log('\\n' + '='.repeat(70));
  console.log('📊 PHASE 3 MIGRATION SUMMARY');
  console.log('='.repeat(70));
  console.log(`✅ Successfully migrated: ${totalMigrated} items`);
  console.log(`❌ Errors encountered: ${totalErrors.length}`);
  
  if (totalErrors.length > 0 && totalErrors.length <= 10) {
    console.log('\\n❌ ERRORS:');
    totalErrors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
    });
  } else if (totalErrors.length > 10) {
    console.log(`\\n⚠️ ${totalErrors.length} errors encountered (too many to display)`);
  }
  
  console.log('\\n🎯 Phase 3 Complete - Like-I-Said installations consolidated');
  console.log('✅ Ready for Phase 4: Historical Data Migration');
  
  return totalErrors.length === 0;
}

migrateLikeISaidInstallations().catch(error => {
  console.error('❌ Phase 3 migration failed:', error.message);
  process.exit(1);
});