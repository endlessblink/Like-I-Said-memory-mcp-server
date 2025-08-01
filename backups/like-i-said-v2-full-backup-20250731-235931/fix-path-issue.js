#!/usr/bin/env node

/**
 * Fix script to correct path configuration issues
 */

import { PathSettings } from '../lib/path-settings.js';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Path Configuration Fix Script...\\n');

async function findDataDirectories() {
  console.log('1️⃣ Searching for existing data directories...\\n');
  
  const projectRoot = path.join(__dirname, '..');
  const possibleLocations = [
    path.join(projectRoot, 'memories'),
    path.join(projectRoot, 'tasks'),
    path.join(process.cwd(), 'memories'),
    path.join(process.cwd(), 'tasks')
  ];
  
  const foundData = {
    memories: null,
    tasks: null
  };
  
  // Check each possible location
  for (const location of possibleLocations) {
    if (fs.existsSync(location)) {
      try {
        const contents = fs.readdirSync(location);
        const projects = contents.filter(item => {
          const itemPath = path.join(location, item);
          return fs.statSync(itemPath).isDirectory();
        });
        
        // Count total files
        let totalFiles = 0;
        for (const project of projects) {
          const projectPath = path.join(location, project);
          const files = fs.readdirSync(projectPath).filter(f => f.endsWith('.md'));
          totalFiles += files.length;
        }
        
        if (totalFiles > 0) {
          const type = location.includes('memories') ? 'memories' : 'tasks';
          if (!foundData[type]) {
            foundData[type] = {
              path: location,
              projects: projects.length,
              files: totalFiles
            };
            console.log(`✅ Found ${type} data: ${location}`);
            console.log(`   Projects: ${projects.length}, Files: ${totalFiles}`);
          }
        }
      } catch (error) {
        console.log(`❌ Error checking ${location}: ${error.message}`);
      }
    }
  }
  
  return foundData;
}

async function checkCurrentConfiguration() {
  console.log('\\n2️⃣ Checking current configuration...\\n');
  
  const pathSettings = new PathSettings();
  const currentPaths = pathSettings.getEffectivePaths();
  
  console.log('Current configuration:');
  console.log(`   Memories: ${currentPaths.memories}`);
  console.log(`   Tasks: ${currentPaths.tasks}`);
  
  // Check if current paths have data
  const currentMemoriesEmpty = !fs.existsSync(currentPaths.memories) || 
    fs.readdirSync(currentPaths.memories).length === 0;
  const currentTasksEmpty = !fs.existsSync(currentPaths.tasks) || 
    fs.readdirSync(currentPaths.tasks).length === 0;
  
  console.log(`   Memories directory empty: ${currentMemoriesEmpty}`);
  console.log(`   Tasks directory empty: ${currentTasksEmpty}`);
  
  return {
    currentPaths,
    memoriesEmpty: currentMemoriesEmpty,
    tasksEmpty: currentTasksEmpty
  };
}

async function fixPaths() {
  console.log('\\n3️⃣ Fixing path configuration...\\n');
  
  const foundData = await findDataDirectories();
  const currentConfig = await checkCurrentConfiguration();
  
  let needsUpdate = false;
  let newPaths = { ...currentConfig.currentPaths };
  
  // Update memory path if current is empty but we found data
  if (currentConfig.memoriesEmpty && foundData.memories) {
    console.log(`🔄 Updating memory path from ${currentConfig.currentPaths.memories} to ${foundData.memories.path}`);
    newPaths.memories = foundData.memories.path;
    needsUpdate = true;
  }
  
  // Update task path if current is empty but we found data
  if (currentConfig.tasksEmpty && foundData.tasks) {
    console.log(`🔄 Updating task path from ${currentConfig.currentPaths.tasks} to ${foundData.tasks.path}`);
    newPaths.tasks = foundData.tasks.path;
    needsUpdate = true;
  }
  
  if (needsUpdate) {
    const pathSettings = new PathSettings();
    const saved = pathSettings.save({
      memoriesPath: newPaths.memories,
      tasksPath: newPaths.tasks
    });
    
    if (saved) {
      console.log('✅ Path configuration updated successfully!');
      console.log('   New paths saved to data/path-settings.json');
      console.log('   Please restart the API server to apply changes.');
    } else {
      console.log('❌ Failed to save path configuration');
    }
  } else {
    console.log('✅ No path updates needed - configuration looks correct');
  }
  
  return needsUpdate;
}

async function runFix() {
  console.log('🚀 Starting path configuration fix...\\n');
  
  try {
    const updated = await fixPaths();
    
    if (updated) {
      console.log('\\n📋 Next steps:');
      console.log('1. Restart the API server (npm run start:dashboard)');
      console.log('2. Refresh the dashboard in your browser');
      console.log('3. Check that memories and tasks now load correctly');
    } else {
      console.log('\\n🔍 If data still isn\\'t loading, run the debug script:');
      console.log('   node tests/debug-data-issue.js');
    }
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
  }
}

runFix().catch(console.error);