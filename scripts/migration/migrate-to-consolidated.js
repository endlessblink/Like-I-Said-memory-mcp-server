#!/usr/bin/env node

/**
 * Task Storage Consolidation Script
 * 
 * Migrates all local project tasks to Like-I-Said MCP consolidated storage
 * Ensures single source of truth for all task data
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const LIKE_I_SAID_TASKS_DIR = path.join(__dirname, 'tasks');
const PROJECT_PATHS = [
  '/mnt/d/MY PROJECTS/AI/LLM/AI Code Gen/my-builds/Video + Motion/rough-cut-mcp'
  // Add other project paths here as needed
];

console.log('🚀 Starting Task Storage Consolidation...');
console.log(`📁 Target: ${LIKE_I_SAID_TASKS_DIR}`);

// Scan for local task directories
async function scanLocalTasks() {
  const foundTasks = new Map(); // projectName -> tasks[]
  
  for (const projectPath of PROJECT_PATHS) {
    const tasksDir = path.join(projectPath, 'tasks');
    
    if (!fs.existsSync(tasksDir)) {
      console.log(`⏭️  No tasks directory in ${path.basename(projectPath)}`);
      continue;
    }
    
    console.log(`\n📂 Scanning ${path.basename(projectPath)}:`);
    
    try {
      const subDirs = fs.readdirSync(tasksDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      
      for (const subDir of subDirs) {
        const tasksFile = path.join(tasksDir, subDir, 'tasks.json');
        
        if (fs.existsSync(tasksFile)) {
          const tasksData = JSON.parse(fs.readFileSync(tasksFile, 'utf8'));
          const tasks = Array.isArray(tasksData) ? tasksData : [tasksData];
          
          console.log(`  📄 ${subDir}: ${tasks.length} tasks`);
          
          // Group by project name
          if (!foundTasks.has(subDir)) {
            foundTasks.set(subDir, []);
          }
          foundTasks.get(subDir).push(...tasks);
        }
      }
    } catch (error) {
      console.log(`❌ Error scanning ${projectPath}: ${error.message}`);
    }
  }
  
  return foundTasks;
}

// Merge tasks avoiding duplicates
function mergeTasks(existingTasks, newTasks) {
  const existingIds = new Set(existingTasks.map(t => t.id));
  const merged = [...existingTasks];
  
  for (const newTask of newTasks) {
    if (existingIds.has(newTask.id)) {
      // Update existing task if newer
      const existingIndex = merged.findIndex(t => t.id === newTask.id);
      const existingTask = merged[existingIndex];
      
      const newDate = new Date(newTask.updated || newTask.created || 0);
      const existingDate = new Date(existingTask.updated || existingTask.created || 0);
      
      if (newDate > existingDate) {
        console.log(`  🔄 Updating ${newTask.id} (newer version)`);
        merged[existingIndex] = newTask;
      } else {
        console.log(`  ⏭️  Keeping existing ${newTask.id} (already up-to-date)`);
      }
    } else {
      console.log(`  ➕ Adding new task ${newTask.id}`);
      merged.push(newTask);
    }
  }
  
  return merged;
}

// Migrate tasks to consolidated storage
async function migrateToConsolidated() {
  console.log('\\n🔍 Phase 1: Scanning local task storage...');
  const localTasks = await scanLocalTasks();
  
  console.log('\\n🔄 Phase 2: Migrating to consolidated storage...');
  
  for (const [projectName, tasks] of localTasks) {
    console.log(`\\n📦 Migrating project: ${projectName} (${tasks.length} tasks)`);
    
    // Ensure target directory exists
    const targetDir = path.join(LIKE_I_SAID_TASKS_DIR, projectName);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
      console.log(`  📁 Created directory: ${targetDir}`);
    }
    
    // Read existing consolidated tasks if any
    const targetFile = path.join(targetDir, 'tasks.json');
    let existingTasks = [];
    
    if (fs.existsSync(targetFile)) {
      try {
        const existingData = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
        existingTasks = Array.isArray(existingData) ? existingData : [existingData];
        console.log(`  📋 Found ${existingTasks.length} existing tasks in consolidated storage`);
      } catch (error) {
        console.log(`  ⚠️ Could not read existing tasks: ${error.message}`);
      }
    }
    
    // Merge tasks
    const mergedTasks = mergeTasks(existingTasks, tasks);
    
    // Write consolidated tasks
    try {
      fs.writeFileSync(targetFile, JSON.stringify(mergedTasks, null, 2) + '\\n');
      console.log(`  ✅ Wrote ${mergedTasks.length} tasks to ${targetFile}`);
    } catch (error) {
      console.log(`  ❌ Error writing consolidated tasks: ${error.message}`);
    }
  }
  
  console.log('\\n✅ Migration to consolidated storage complete!');
}

// Create backup of local tasks before cleanup
async function backupLocalTasks() {
  const backupDir = path.join(__dirname, 'migration-backup-' + new Date().toISOString().replace(/[:.]/g, '-'));
  fs.mkdirSync(backupDir, { recursive: true });
  
  console.log(`\\n💾 Creating backup in: ${backupDir}`);
  
  for (const projectPath of PROJECT_PATHS) {
    const tasksDir = path.join(projectPath, 'tasks');
    if (fs.existsSync(tasksDir)) {
      const projectName = path.basename(projectPath);
      const backupProjectDir = path.join(backupDir, projectName);
      
      try {
        fs.cpSync(tasksDir, backupProjectDir, { recursive: true });
        console.log(`  💾 Backed up ${projectName} tasks`);
      } catch (error) {
        console.log(`  ❌ Backup error for ${projectName}: ${error.message}`);
      }
    }
  }
  
  console.log(`✅ Backup complete: ${backupDir}`);
  return backupDir;
}

// Main migration process
async function main() {
  try {
    // Create backup first
    await backupLocalTasks();
    
    // Migrate tasks to consolidated storage
    await migrateToConsolidated();
    
    console.log('\\n🎉 Task Storage Consolidation Complete!');
    console.log('\\n📋 Next Steps:');
    console.log('1. Test monitor: npx @endlessblink/like-i-said-mcp watch');
    console.log('2. Verify all tasks appear correctly');
    console.log('3. Remove local task directories after verification');
    console.log('\\n💡 All tasks now in single consolidated storage location');
    
  } catch (error) {
    console.log(`\\n❌ Migration failed: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { migrateToConsolidated, scanLocalTasks };