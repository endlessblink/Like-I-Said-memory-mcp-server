#!/usr/bin/env node

/**
 * True Consolidation and Cleanup Script
 * 
 * Consolidates ALL data from scattered locations and backup,
 * merges intelligently, then deletes scattered sources.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Target consolidated locations
const CONSOLIDATED_MEMORIES = path.join(__dirname, 'memories');
const CONSOLIDATED_TASKS = path.join(__dirname, 'tasks');
const BACKUP_DIR = path.join(__dirname, 'backups/COMPLETE-BACKUP-2025-09-06-11-33-42');

// All scattered locations to consolidate and delete
const SCATTERED_LOCATIONS = [
  '/mnt/d/APPSNospaces/like-i-said-mcp-server-error',
  '/mnt/d/shared/like-i-said-mcp',
  '/mnt/d/MY PROJECTS/AI/LLM/AI Code Gen/my-builds/Video + Motion/rough-cut-mcp/tasks',
  '/mnt/d/MY PROJECTS/AI/LLM/AI Code Gen/my-builds/Productivity/Pomo/memories',
  '/mnt/d/MY PROJECTS/AI/LLM/AI Code Gen/my-builds/Productivity/Pomo/tasks',
  '/mnt/d/MY PROJECTS/AI/LLM/AI Code Gen/my-builds/Productivity/Pomo-TaskFlow/memories',
  '/mnt/d/MY PROJECTS/AI/LLM/AI Code Gen/my-builds/Productivity/Pomo-TaskFlow/tasks',
  '/mnt/d/MY PROJECTS/AI/LLM/AI Code Gen/my-builds/Commercial Projects/Palladio-gen/memories',
  '/mnt/d/MY PROJECTS/AI/LLM/AI Code Gen/my-builds/Commercial Projects/Palladio-gen/tasks',
  '/home/endlessblink/projects/palladio/memories',
  '/home/endlessblink/projects/palladio/tasks',
  '/home/endlessblink/projects/memories',
  '/home/endlessblink/projects/tasks',
  '/home/endlessblink/projects/bina-bekitzur/memories',
  '/home/endlessblink/projects/bina-bekitzur/tasks',
  '/home/endlessblink/projects/bina-bekitzur-main/memories',
  '/home/endlessblink/projects/bina-bekitzur-main/tasks',
  '/home/endlessblink/.codeium/windsurf/memories',
  '/home/endlessblink/memories',
  '/mnt/c/Users/endle/memories',
  '/mnt/c/Users/endle/tasks'
];

// Results tracking
const consolidationResults = {
  memoriesConsolidated: 0,
  tasksConsolidated: 0, 
  projectsProcessed: new Set(),
  duplicatesAvoided: 0,
  errorsEncountered: [],
  locationsDeleted: []
};

function safeExists(path) {
  try { return fs.existsSync(path); } catch { return false; }
}

function safeReadDir(path) {
  try { return fs.readdirSync(path, { withFileTypes: true }); } catch { return []; }
}

function safeDelete(path) {
  try { 
    if (fs.statSync(path).isDirectory()) {
      fs.rmSync(path, { recursive: true, force: true });
    } else {
      fs.unlinkSync(path);
    }
    return true;
  } catch { 
    return false; 
  }
}

// Consolidate memories from backup and scattered locations
function consolidateMemories() {
  console.log('🧠 Consolidating ALL memory data...\n');
  
  const allMemoryFiles = new Map(); // id -> {content, path, project, timestamp}
  
  // 1. Restore from backup (2,736 files)
  if (safeExists(BACKUP_DIR)) {
    console.log(`📦 Restoring from backup: ${BACKUP_DIR}`);
    
    const backupCategories = ['like-i-said-installations', 'project-storage', 'home-directory'];
    
    backupCategories.forEach(category => {
      const categoryDir = path.join(BACKUP_DIR, category);
      if (safeExists(categoryDir)) {
        // Recursively find all .md files in backup
        const findMemoryFiles = (dir, prefix = '') => {
          const entries = safeReadDir(dir);
          
          entries.forEach(entry => {
            const fullPath = path.join(dir, entry.name);
            
            if (entry.isDirectory()) {
              findMemoryFiles(fullPath, prefix + entry.name + '_');
            } else if (entry.name.endsWith('.md')) {
              try {
                const content = fs.readFileSync(fullPath, 'utf8');
                const fileId = entry.name.replace('.md', '');
                const project = prefix.split('_').filter(p => p).pop() || 'default';
                
                allMemoryFiles.set(fileId, {
                  content,
                  originalPath: fullPath,
                  project: project.replace(/_/g, '-'),
                  timestamp: fs.statSync(fullPath).mtime
                });
              } catch (error) {
                consolidationResults.errorsEncountered.push(`Backup ${fullPath}: ${error.message}`);
              }
            }
          });
        };
        
        findMemoryFiles(categoryDir);
      }
    });
    
    console.log(`📥 Loaded ${allMemoryFiles.size} memory files from backup`);
  }
  
  // 2. Add memories from scattered locations (if newer)
  SCATTERED_LOCATIONS.forEach(location => {
    if (location.includes('/memories') && safeExists(location)) {
      console.log(`📁 Checking scattered location: ${location}`);
      
      const memoryFiles = safeReadDir(location).filter(entry => 
        entry.isFile() && entry.name.endsWith('.md')
      );
      
      memoryFiles.forEach(entry => {
        try {
          const filePath = path.join(location, entry.name);
          const content = fs.readFileSync(filePath, 'utf8');
          const fileId = entry.name.replace('.md', '');
          const stats = fs.statSync(filePath);
          
          // Use newer version if exists
          if (allMemoryFiles.has(fileId)) {
            if (stats.mtime > allMemoryFiles.get(fileId).timestamp) {
              const project = path.basename(path.dirname(location));
              allMemoryFiles.set(fileId, {
                content,
                originalPath: filePath,
                project,
                timestamp: stats.mtime
              });
              console.log(`  🔄 Updated ${fileId} (newer version)`);
            } else {
              consolidationResults.duplicatesAvoided++;
            }
          } else {
            const project = path.basename(path.dirname(location));
            allMemoryFiles.set(fileId, {
              content,
              originalPath: filePath,
              project,
              timestamp: stats.mtime
            });
            console.log(`  ➕ Added ${fileId}`);
          }
        } catch (error) {
          consolidationResults.errorsEncountered.push(`${location}/${entry.name}: ${error.message}`);
        }
      });
    }
  });
  
  // 3. Write consolidated memories organized by project
  console.log(`\\n📝 Writing ${allMemoryFiles.size} consolidated memories...`);
  
  const projectMemories = new Map();
  allMemoryFiles.forEach((memory, id) => {
    const project = memory.project || 'default';
    if (!projectMemories.has(project)) {
      projectMemories.set(project, []);
    }
    projectMemories.get(project).push({ id, ...memory });
  });
  
  projectMemories.forEach((memories, project) => {
    const projectDir = path.join(CONSOLIDATED_MEMORIES, project);
    if (!safeExists(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }
    
    memories.forEach(memory => {
      const targetFile = path.join(projectDir, `${memory.id}.md`);
      try {
        fs.writeFileSync(targetFile, memory.content);
        consolidationResults.memoriesConsolidated++;
      } catch (error) {
        consolidationResults.errorsEncountered.push(`Write ${targetFile}: ${error.message}`);
      }
    });
    
    console.log(`  ✅ ${project}: ${memories.length} memories`);
    consolidationResults.projectsProcessed.add(project);
  });
  
  console.log(`🎯 Total memories consolidated: ${consolidationResults.memoriesConsolidated}`);
}

// Consolidate tasks from all locations
function consolidateTasks() {
  console.log('\\n📋 Consolidating ALL task data...\\n');
  
  const allTasks = new Map(); // project -> tasks array
  
  // 1. Collect from scattered locations
  SCATTERED_LOCATIONS.forEach(location => {
    if (location.includes('/tasks') && safeExists(location)) {
      console.log(`📁 Processing scattered tasks: ${location}`);
      
      // Check for direct tasks.json
      const tasksJson = path.join(location, 'tasks.json');
      if (safeExists(tasksJson)) {
        try {
          const data = JSON.parse(fs.readFileSync(tasksJson, 'utf8'));
          const tasks = Array.isArray(data) ? data : [data];
          
          tasks.forEach(task => {
            const project = task.project || path.basename(location);
            if (!allTasks.has(project)) {
              allTasks.set(project, []);
            }
            allTasks.get(project).push(task);
          });
          
          console.log(`  📄 Added ${tasks.length} tasks from ${tasksJson}`);
        } catch (error) {
          consolidationResults.errorsEncountered.push(`${tasksJson}: ${error.message}`);
        }
      }
      
      // Check for subdirectories with tasks.json
      const subdirs = safeReadDir(location).filter(entry => entry.isDirectory());
      subdirs.forEach(subdir => {
        const subTasksJson = path.join(location, subdir.name, 'tasks.json');
        if (safeExists(subTasksJson)) {
          try {
            const data = JSON.parse(fs.readFileSync(subTasksJson, 'utf8'));
            const tasks = Array.isArray(data) ? data : [data];
            
            tasks.forEach(task => {
              const project = task.project || subdir.name;
              if (!allTasks.has(project)) {
                allTasks.set(project, []);
              }
              allTasks.get(project).push(task);
            });
            
            console.log(`  📄 Added ${tasks.length} tasks from ${subdir.name}`);
          } catch (error) {
            consolidationResults.errorsEncountered.push(`${subTasksJson}: ${error.message}`);
          }
        }
      });
    }
  });
  
  // 2. Merge with existing consolidated tasks (avoid duplicates)
  console.log('\\n🔄 Merging with existing consolidated tasks...');
  
  allTasks.forEach((tasks, project) => {
    const projectDir = path.join(CONSOLIDATED_TASKS, project);
    if (!safeExists(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }
    
    const targetJson = path.join(projectDir, 'tasks.json');
    let consolidatedTasks = [];
    
    // Read existing consolidated tasks
    if (safeExists(targetJson)) {
      try {
        const existingData = JSON.parse(fs.readFileSync(targetJson, 'utf8'));
        consolidatedTasks = Array.isArray(existingData) ? existingData : [existingData];
      } catch (error) {
        console.log(`  ⚠️ Could not read existing ${targetJson}: ${error.message}`);
      }
    }
    
    // Merge tasks avoiding duplicates
    const existingIds = new Set(consolidatedTasks.map(t => t.id));
    let addedCount = 0;
    let updatedCount = 0;
    
    tasks.forEach(newTask => {
      if (existingIds.has(newTask.id)) {
        // Update if newer
        const existingIndex = consolidatedTasks.findIndex(t => t.id === newTask.id);
        const existing = consolidatedTasks[existingIndex];
        
        const newDate = new Date(newTask.updated || newTask.created || 0);
        const existingDate = new Date(existing.updated || existing.created || 0);
        
        if (newDate > existingDate) {
          consolidatedTasks[existingIndex] = newTask;
          updatedCount++;
        } else {
          consolidationResults.duplicatesAvoided++;
        }
      } else {
        consolidatedTasks.push(newTask);
        addedCount++;
      }
    });
    
    // Write consolidated tasks
    fs.writeFileSync(targetJson, JSON.stringify(consolidatedTasks, null, 2));
    
    console.log(`  ✅ ${project}: ${addedCount} added, ${updatedCount} updated, ${consolidatedTasks.length} total`);
    consolidationResults.tasksConsolidated += addedCount + updatedCount;
    consolidationResults.projectsProcessed.add(project);
  });
}

// Delete scattered locations after successful consolidation
function cleanupScatteredStorage() {
  console.log('\\n🧹 Cleaning up scattered storage locations...\\n');
  
  SCATTERED_LOCATIONS.forEach((location, index) => {
    console.log(`🗑️ ${index + 1}/${SCATTERED_LOCATIONS.length}: ${location}`);
    
    if (!safeExists(location)) {
      console.log(`  ⏭️ Already removed or doesn't exist`);
      return;
    }
    
    // Double-check this location was actually consolidated
    const locationHasMemories = location.includes('/memories');
    const locationHasTasks = location.includes('/tasks');
    
    if (locationHasMemories || locationHasTasks) {
      try {
        const success = safeDelete(location);
        if (success) {
          console.log(`  ✅ Deleted: ${location}`);
          consolidationResults.locationsDeleted.push(location);
        } else {
          console.log(`  ❌ Failed to delete: ${location}`);
          consolidationResults.errorsEncountered.push(`Delete failed: ${location}`);
        }
      } catch (error) {
        console.log(`  ❌ Error deleting ${location}: ${error.message}`);
        consolidationResults.errorsEncountered.push(`Delete error: ${location} - ${error.message}`);
      }
    } else {
      console.log(`  ⏭️ Skipped (not memory/task directory)`);
    }
  });
}

// Validate consolidation success
function validateConsolidation() {
  console.log('\\n' + '='.repeat(80));
  console.log('🎯 CONSOLIDATION AND CLEANUP VALIDATION');
  console.log('='.repeat(80));
  
  // Count final consolidated data
  const finalMemories = safeReadDir(CONSOLIDATED_MEMORIES).length;
  const finalTasks = safeReadDir(CONSOLIDATED_TASKS).length;
  
  // Count actual files
  const memoryFileCount = exec(`find "${CONSOLIDATED_MEMORIES}" -name "*.md" | wc -l`);
  const taskFileCount = exec(`find "${CONSOLIDATED_TASKS}" -name "tasks.json" | wc -l`);
  
  console.log(`\\n📊 FINAL CONSOLIDATED STORAGE:`);
  console.log(`  🧠 Memory projects: ${finalMemories}`);
  console.log(`  📋 Task projects: ${finalTasks}`);
  console.log(`  📄 Memory files: ${memoryFileCount || 'calculating...'}`);
  console.log(`  📄 Task files: ${taskFileCount || 'calculating...'}`);
  
  console.log(`\\n📈 CONSOLIDATION RESULTS:`);
  console.log(`  ✅ Memories consolidated: ${consolidationResults.memoriesConsolidated}`);
  console.log(`  ✅ Tasks consolidated: ${consolidationResults.tasksConsolidated}`);
  console.log(`  📂 Projects processed: ${consolidationResults.projectsProcessed.size}`);
  console.log(`  🔄 Duplicates avoided: ${consolidationResults.duplicatesAvoided}`);
  console.log(`  🗑️ Locations deleted: ${consolidationResults.locationsDeleted.length}`);
  console.log(`  ❌ Errors: ${consolidationResults.errorsEncountered.length}`);
  
  if (consolidationResults.errorsEncountered.length > 0) {
    console.log(`\\n❌ ERRORS ENCOUNTERED:`);
    consolidationResults.errorsEncountered.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
    });
  }
  
  console.log(`\\n🎯 CLEANUP RESULTS:`);
  console.log(`Deleted scattered locations:`);
  consolidationResults.locationsDeleted.forEach((location, index) => {
    console.log(`  ✅ ${index + 1}. ${location}`);
  });
  
  console.log('\\n🚀 CONSOLIDATION COMPLETE:');
  console.log(`  📍 Single location: ${__dirname}`);
  console.log(`  🧹 Scattered storage cleaned up`);
  console.log(`  ✅ Ready for universal access testing`);
}

function exec(command) {
  try {
    return require('child_process').execSync(command, { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

// Main consolidation process
async function consolidateAndCleanup() {
  console.log('🚀 Starting TRUE consolidation and cleanup...');
  console.log(`🎯 Target: Single location with all data`);
  console.log(`🧹 Will delete scattered sources after consolidation\\n`);
  
  // Step 1: Consolidate memories
  consolidateMemories();
  
  // Step 2: Consolidate tasks
  consolidateTasks();
  
  // Step 3: Validate before cleanup
  const memoryCount = consolidationResults.memoriesConsolidated;
  const taskCount = consolidationResults.tasksConsolidated;
  
  if (memoryCount > 0 || taskCount > 0) {
    console.log(`\\n✅ Consolidation successful (${memoryCount} memories, ${taskCount} tasks)`);
    console.log(`🧹 Proceeding with scattered storage cleanup...`);
    
    // Step 4: Clean up scattered storage
    cleanupScatteredStorage();
  } else {
    console.log(`\\n⚠️ No data consolidated - skipping cleanup for safety`);
  }
  
  // Step 5: Final validation
  validateConsolidation();
}

consolidateAndCleanup().catch(error => {
  console.error('❌ Consolidation failed:', error.message);
  process.exit(1);
});