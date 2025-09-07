#!/usr/bin/env node

/**
 * Phase 1: Migrate Recent Data (Last 7 Days)
 * 
 * Safely migrate the most recently active storage locations
 * to consolidated storage with full validation.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Phase 1: Recent data locations (last 7 days)
const RECENT_LOCATIONS = [
  // Pomo projects (most recent)
  {
    source: '/mnt/d/MY PROJECTS/AI/LLM/AI Code Gen/my-builds/Productivity/Pomo/memories',
    target: 'Pomo',
    type: 'memories'
  },
  {
    source: '/mnt/d/MY PROJECTS/AI/LLM/AI Code Gen/my-builds/Productivity/Pomo/tasks', 
    target: 'Pomo',
    type: 'tasks'
  },
  {
    source: '/mnt/d/MY PROJECTS/AI/LLM/AI Code Gen/my-builds/Productivity/Pomo-TaskFlow/memories',
    target: 'Pomo-TaskFlow', 
    type: 'memories'
  },
  {
    source: '/mnt/d/MY PROJECTS/AI/LLM/AI Code Gen/my-builds/Productivity/Pomo-TaskFlow/tasks',
    target: 'Pomo-TaskFlow',
    type: 'tasks'
  },
  
  // RoughCut MCP local storage (has TASK-96112)
  {
    source: '/mnt/d/MY PROJECTS/AI/LLM/AI Code Gen/my-builds/Video + Motion/rough-cut-mcp/tasks',
    target: 'rough-cut-mcp-local',
    type: 'tasks'
  }
];

const TARGET_BASE = path.join(__dirname, 'memories'); // For memories
const TARGET_TASKS = path.join(__dirname, 'tasks');   // For tasks

function ensureTargetDirectory(targetProject, type) {
  const baseDir = type === 'memories' ? TARGET_BASE : TARGET_TASKS;
  const targetDir = path.join(baseDir, targetProject);
  
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
    console.log(`  📁 Created target directory: ${targetDir}`);
  }
  
  return targetDir;
}

function migrateMemoryFiles(sourceDir, targetDir) {
  if (!fs.existsSync(sourceDir)) {
    console.log(`  ⏭️ Source not found: ${sourceDir}`);
    return { migrated: 0, errors: [] };
  }
  
  const results = { migrated: 0, errors: [] };
  
  try {
    const memoryFiles = fs.readdirSync(sourceDir).filter(f => f.endsWith('.md'));
    
    for (const memoryFile of memoryFiles) {
      const sourcePath = path.join(sourceDir, memoryFile);
      const targetPath = path.join(targetDir, memoryFile);
      
      try {
        // Check if target already exists
        if (fs.existsSync(targetPath)) {
          // Compare modification times - keep newest
          const sourceStats = fs.statSync(sourcePath);
          const targetStats = fs.statSync(targetPath);
          
          if (sourceStats.mtime > targetStats.mtime) {
            fs.copyFileSync(sourcePath, targetPath);
            console.log(`    🔄 Updated: ${memoryFile}`);
          } else {
            console.log(`    ⏭️ Skipped: ${memoryFile} (target is newer)`);
          }
        } else {
          fs.copyFileSync(sourcePath, targetPath);
          console.log(`    ➕ Added: ${memoryFile}`);
        }
        results.migrated++;
      } catch (error) {
        results.errors.push(`${memoryFile}: ${error.message}`);
        console.log(`    ❌ Error: ${memoryFile} - ${error.message}`);
      }
    }
  } catch (error) {
    results.errors.push(`Directory read error: ${error.message}`);
  }
  
  return results;
}

function migrateTaskFiles(sourceDir, targetDir) {
  const results = { migrated: 0, errors: [] };
  
  // Look for tasks.json or individual task directories
  if (!fs.existsSync(sourceDir)) {
    console.log(`  ⏭️ Source not found: ${sourceDir}`);
    return results;
  }
  
  try {
    const entries = fs.readdirSync(sourceDir, { withFileTypes: true });
    
    // Check for direct tasks.json file
    const tasksJson = path.join(sourceDir, 'tasks.json');
    if (fs.existsSync(tasksJson)) {
      const targetJson = path.join(targetDir, 'tasks.json');
      
      // Merge with existing tasks.json if it exists
      let existingTasks = [];
      if (fs.existsSync(targetJson)) {
        try {
          const existingData = JSON.parse(fs.readFileSync(targetJson, 'utf8'));
          existingTasks = Array.isArray(existingData) ? existingData : [existingData];
        } catch (error) {
          console.log(`    ⚠️ Could not read existing ${targetJson}: ${error.message}`);
        }
      }
      
      // Read source tasks
      const sourceData = JSON.parse(fs.readFileSync(tasksJson, 'utf8'));
      const sourceTasks = Array.isArray(sourceData) ? sourceData : [sourceData];
      
      // Merge tasks by ID, keeping newest
      const existingIds = new Set(existingTasks.map(t => t.id));
      const mergedTasks = [...existingTasks];
      
      sourceTasks.forEach(sourceTask => {
        if (existingIds.has(sourceTask.id)) {
          // Update if newer
          const existingIndex = mergedTasks.findIndex(t => t.id === sourceTask.id);
          const existing = mergedTasks[existingIndex];
          
          const sourceDate = new Date(sourceTask.updated || sourceTask.created || 0);
          const existingDate = new Date(existing.updated || existing.created || 0);
          
          if (sourceDate > existingDate) {
            mergedTasks[existingIndex] = sourceTask;
            console.log(`    🔄 Updated task: ${sourceTask.id}`);
          } else {
            console.log(`    ⏭️ Kept existing: ${sourceTask.id}`);
          }
        } else {
          mergedTasks.push(sourceTask);
          console.log(`    ➕ Added task: ${sourceTask.id}`);
        }
      });
      
      // Write merged tasks
      fs.writeFileSync(targetJson, JSON.stringify(mergedTasks, null, 2));
      results.migrated += sourceTasks.length;
    }
    
    // Check for subdirectories with tasks.json
    const taskDirs = entries.filter(e => e.isDirectory()).map(e => e.name);
    for (const taskDir of taskDirs) {
      const subSourceDir = path.join(sourceDir, taskDir);
      const subTargetDir = path.join(targetDir, taskDir);
      
      ensureTargetDirectory(taskDir, 'tasks');
      const subResults = migrateTaskFiles(subSourceDir, subTargetDir);
      results.migrated += subResults.migrated;
      results.errors.push(...subResults.errors);
    }
    
  } catch (error) {
    results.errors.push(`Directory error: ${error.message}`);
  }
  
  return results;
}

// Main Phase 1 migration
async function migrateRecentData() {
  console.log('🚀 Phase 1: Migrating Recent Data (Last 7 Days)');
  console.log(`📊 Migrating ${RECENT_LOCATIONS.length} recent storage locations`);
  console.log(`🎯 Target: ${__dirname}/memories and ${__dirname}/tasks\\n`);
  
  let totalMigrated = 0;
  let totalErrors = [];
  
  for (const [index, location] of RECENT_LOCATIONS.entries()) {
    console.log(`📦 ${index + 1}/${RECENT_LOCATIONS.length}: ${location.target} (${location.type})`);
    console.log(`  📁 Source: ${location.source}`);
    
    const targetDir = ensureTargetDirectory(location.target, location.type);
    console.log(`  📁 Target: ${targetDir}`);
    
    let results;
    if (location.type === 'memories') {
      results = migrateMemoryFiles(location.source, targetDir);
    } else {
      results = migrateTaskFiles(location.source, targetDir);
    }
    
    console.log(`  ✅ Migrated ${results.migrated} items`);
    if (results.errors.length > 0) {
      console.log(`  ⚠️ ${results.errors.length} errors:`);
      results.errors.forEach(error => console.log(`    - ${error}`));
    }
    
    totalMigrated += results.migrated;
    totalErrors.push(...results.errors);
    console.log('');
  }
  
  // Summary
  console.log('='.repeat(60));
  console.log('📊 PHASE 1 MIGRATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Successfully migrated: ${totalMigrated} items`);
  console.log(`❌ Errors encountered: ${totalErrors.length}`);
  
  if (totalErrors.length > 0) {
    console.log('\\n❌ MIGRATION ERRORS:');
    totalErrors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
    });
  }
  
  console.log(`\\n🎯 Phase 1 Complete - Recent data consolidated`);
  console.log('✅ Ready for Phase 2: Active Project Data Migration');
  
  return totalErrors.length === 0;
}

migrateRecentData().catch(error => {
  console.error('❌ Phase 1 migration failed:', error.message);
  process.exit(1);
});