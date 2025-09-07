#!/usr/bin/env node

/**
 * Phase 2: Migrate Active Project Data
 * 
 * Migrate Palladio, Commercial projects, and remaining active storage
 * to consolidated storage with validation.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Phase 2: Active project data (last 30 days, high value)
const ACTIVE_PROJECT_LOCATIONS = [
  // Palladio projects
  {
    source: '/mnt/d/MY PROJECTS/AI/LLM/AI Code Gen/my-builds/Commercial Projects/Palladio-gen/memories',
    target: 'Palladio-gen',
    type: 'memories'
  },
  {
    source: '/mnt/d/MY PROJECTS/AI/LLM/AI Code Gen/my-builds/Commercial Projects/Palladio-gen/tasks',
    target: 'Palladio-gen', 
    type: 'tasks'
  },
  {
    source: '/home/endlessblink/projects/palladio/memories',
    target: 'palladio',
    type: 'memories'
  },
  {
    source: '/home/endlessblink/projects/palladio/tasks',
    target: 'palladio',
    type: 'tasks'
  },
  
  // General project storage from home directory
  {
    source: '/home/endlessblink/projects/memories',
    target: 'general-projects',
    type: 'memories'
  },
  {
    source: '/home/endlessblink/projects/tasks', 
    target: 'general-projects',
    type: 'tasks'
  },
  
  // Shared storage
  {
    source: '/mnt/d/shared/like-i-said-mcp/tasks',
    target: 'shared-storage',
    type: 'tasks',
    directMerge: true // Merge into main tasks directory
  }
];

function safeExists(path) {
  try { return fs.existsSync(path); } catch { return false; }
}

function ensureTargetDirectory(targetProject, type) {
  const baseDir = type === 'memories' ? 
    path.join(__dirname, 'memories') : 
    path.join(__dirname, 'tasks');
  const targetDir = path.join(baseDir, targetProject);
  
  if (!safeExists(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
    console.log(`  📁 Created: ${targetDir}`);
  }
  
  return targetDir;
}

function migrateFiles(sourceDir, targetDir, type, directMerge = false) {
  if (!safeExists(sourceDir)) {
    return { migrated: 0, errors: [] };
  }
  
  const results = { migrated: 0, errors: [], details: [] };
  
  try {
    if (type === 'memories') {
      // Migrate memory markdown files
      const memoryFiles = fs.readdirSync(sourceDir).filter(f => f.endsWith('.md'));
      
      for (const memFile of memoryFiles) {
        const sourcePath = path.join(sourceDir, memFile);
        const targetPath = path.join(targetDir, memFile);
        
        try {
          // Check for conflicts
          if (safeExists(targetPath)) {
            const sourceStats = fs.statSync(sourcePath);
            const targetStats = fs.statSync(targetPath);
            
            if (sourceStats.mtime > targetStats.mtime) {
              fs.copyFileSync(sourcePath, targetPath);
              results.details.push(`🔄 Updated: ${memFile}`);
            } else {
              results.details.push(`⏭️ Kept existing: ${memFile}`);
            }
          } else {
            fs.copyFileSync(sourcePath, targetPath);
            results.details.push(`➕ Added: ${memFile}`);
          }
          results.migrated++;
        } catch (error) {
          results.errors.push(`${memFile}: ${error.message}`);
        }
      }
      
    } else {
      // Migrate task files (JSON format)
      const tasksJson = path.join(sourceDir, 'tasks.json');
      
      if (safeExists(tasksJson)) {
        const targetJson = path.join(targetDir, 'tasks.json');
        
        // Read source tasks
        const sourceData = JSON.parse(fs.readFileSync(tasksJson, 'utf8'));
        const sourceTasks = Array.isArray(sourceData) ? sourceData : [sourceData];
        
        // Read existing tasks if any
        let existingTasks = [];
        if (safeExists(targetJson)) {
          try {
            const existingData = JSON.parse(fs.readFileSync(targetJson, 'utf8'));
            existingTasks = Array.isArray(existingData) ? existingData : [existingData];
          } catch (error) {
            console.log(`    ⚠️ Could not read existing ${targetJson}: ${error.message}`);
          }
        }
        
        // Merge tasks intelligently
        const existingIds = new Set(existingTasks.map(t => t.id));
        const mergedTasks = [...existingTasks];
        
        sourceTasks.forEach(sourceTask => {
          if (existingIds.has(sourceTask.id)) {
            // Update if source is newer
            const existingIndex = mergedTasks.findIndex(t => t.id === sourceTask.id);
            const existing = mergedTasks[existingIndex];
            
            const sourceDate = new Date(sourceTask.updated || sourceTask.created || 0);
            const existingDate = new Date(existing.updated || existing.created || 0);
            
            if (sourceDate > existingDate) {
              mergedTasks[existingIndex] = sourceTask;
              results.details.push(`🔄 Updated: ${sourceTask.id}`);
            } else {
              results.details.push(`⏭️ Kept existing: ${sourceTask.id}`);
            }
          } else {
            mergedTasks.push(sourceTask);
            results.details.push(`➕ Added: ${sourceTask.id}`);
          }
        });
        
        // Write merged tasks
        fs.writeFileSync(targetJson, JSON.stringify(mergedTasks, null, 2));
        results.migrated += sourceTasks.length;
      }
    }
  } catch (error) {
    results.errors.push(`Migration error: ${error.message}`);
  }
  
  return results;
}

// Main Phase 2 migration
async function migrateActiveProjects() {
  console.log('🚀 Phase 2: Migrating Active Project Data');
  console.log(`📊 Migrating ${ACTIVE_PROJECT_LOCATIONS.length} active project storage locations`);
  console.log(`🎯 Target: ${__dirname}/memories and ${__dirname}/tasks\\n`);
  
  let totalMigrated = 0;
  let totalErrors = [];
  const migrationResults = [];
  
  for (const [index, location] of ACTIVE_PROJECT_LOCATIONS.entries()) {
    console.log(`📦 ${index + 1}/${ACTIVE_PROJECT_LOCATIONS.length}: ${location.target} (${location.type})`);
    console.log(`  📁 Source: ${location.source}`);
    
    if (!safeExists(location.source)) {
      console.log(`  ⏭️ Source not found, skipping`);
      continue;
    }
    
    const targetDir = location.directMerge ? 
      path.join(__dirname, location.type) :
      ensureTargetDirectory(location.target, location.type);
    
    console.log(`  📁 Target: ${targetDir}`);
    
    const results = migrateFiles(location.source, targetDir, location.type, location.directMerge);
    
    console.log(`  ✅ Migrated ${results.migrated} items`);
    
    if (results.details.length > 0) {
      console.log(`  📋 Details:`);
      results.details.slice(0, 8).forEach(detail => console.log(`    ${detail}`));
      if (results.details.length > 8) {
        console.log(`    ... and ${results.details.length - 8} more items`);
      }
    }
    
    if (results.errors.length > 0) {
      console.log(`  ⚠️ ${results.errors.length} errors:`);
      results.errors.forEach(error => console.log(`    ❌ ${error}`));
    }
    
    migrationResults.push({
      location: location.target,
      migrated: results.migrated,
      errors: results.errors.length
    });
    
    totalMigrated += results.migrated;
    totalErrors.push(...results.errors);
    console.log('');
  }
  
  // Phase 2 Summary
  console.log('='.repeat(70));
  console.log('📊 PHASE 2 MIGRATION SUMMARY');
  console.log('='.repeat(70));
  console.log(`✅ Successfully migrated: ${totalMigrated} items`);
  console.log(`❌ Errors encountered: ${totalErrors.length}`);
  console.log(`📂 Projects consolidated: ${migrationResults.filter(r => r.migrated > 0).length}`);
  
  if (totalErrors.length > 0) {
    console.log('\\n❌ ERRORS:');
    totalErrors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
    });
  }
  
  console.log('\\n🎯 Phase 2 Complete - Active project data consolidated');
  console.log('✅ Ready for Phase 3: Like-I-Said Installation Migration');
  
  return totalErrors.length === 0;
}

migrateActiveProjects().catch(error => {
  console.error('❌ Phase 2 migration failed:', error.message);
  process.exit(1);
});