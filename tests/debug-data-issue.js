#!/usr/bin/env node

/**
 * Comprehensive debug script to identify the data loading issue
 */

import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { PathSettings } from '../lib/path-settings.js';
import { MemoryStorageWrapper } from '../lib/memory-storage-wrapper.js';
import { TaskStorage } from '../lib/task-storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Comprehensive Data Loading Debug...\\n');

async function checkCurrentConfiguration() {
  console.log('1️⃣ Current Configuration Check...\\n');
  
  // Check path settings
  const pathSettings = new PathSettings();
  const savedPaths = pathSettings.load();
  const effectivePaths = pathSettings.getEffectivePaths();
  
  console.log('💾 Saved Path Settings:', savedPaths);
  console.log('🎯 Effective Paths:', effectivePaths);
  console.log('🌍 Environment Variables:', {
    MEMORY_DIR: process.env.MEMORY_DIR || 'not set',
    TASK_DIR: process.env.TASK_DIR || 'not set'
  });
  
  // Check what API server is actually using
  try {
    const pathsResponse = await fetch('http://localhost:3001/api/paths');
    const pathsData = await pathsResponse.json();
    console.log('🌐 API Server Paths:', pathsData);
  } catch (error) {
    console.error('❌ Cannot reach API server:', error.message);
  }
  
  console.log('\\n');
}

async function checkDirectoryContents() {
  console.log('2️⃣ Directory Contents Check...\\n');
  
  const projectRoot = path.join(__dirname, '..');
  const possiblePaths = [
    path.join(projectRoot, 'memories'),
    path.join(projectRoot, 'tasks'),
    'memories',
    'tasks'
  ];
  
  // Check if there are any existing Like-I-Said installations
  const pathSettings = new PathSettings();
  const effectivePaths = pathSettings.getEffectivePaths();
  
  possiblePaths.push(effectivePaths.memories);
  possiblePaths.push(effectivePaths.tasks);
  
  // Remove duplicates
  const uniquePaths = [...new Set(possiblePaths)];
  
  for (const dirPath of uniquePaths) {
    const resolvedPath = path.resolve(dirPath);
    
    console.log(`📁 Checking: ${resolvedPath}`);
    
    if (fs.existsSync(resolvedPath)) {
      try {
        const stats = fs.statSync(resolvedPath);
        if (stats.isDirectory()) {
          const contents = fs.readdirSync(resolvedPath);
          const projects = contents.filter(item => {
            const itemPath = path.join(resolvedPath, item);
            return fs.statSync(itemPath).isDirectory();
          });
          
          console.log(`   ✅ EXISTS - ${projects.length} projects found`);
          
          // Count files in each project
          let totalFiles = 0;
          for (const project of projects.slice(0, 3)) { // Show first 3 projects
            const projectPath = path.join(resolvedPath, project);
            const files = fs.readdirSync(projectPath).filter(f => f.endsWith('.md'));
            totalFiles += files.length;
            console.log(`   - ${project}: ${files.length} files`);
          }
          
          if (projects.length > 3) {
            console.log(`   ... and ${projects.length - 3} more projects`);
          }
          
          console.log(`   📊 Total files: ${totalFiles}`);
        } else {
          console.log(`   ❌ NOT A DIRECTORY`);
        }
      } catch (error) {
        console.log(`   ❌ ERROR: ${error.message}`);
      }
    } else {
      console.log(`   ❌ DOES NOT EXIST`);
    }
    
    console.log('');
  }
}

async function checkStorageObjectsDirectly() {
  console.log('3️⃣ Storage Objects Direct Check...\\n');
  
  const pathSettings = new PathSettings();
  const effectivePaths = pathSettings.getEffectivePaths();
  
  console.log('🔗 Creating storage objects with effective paths...');
  console.log(`   Memories: ${effectivePaths.memories}`);
  console.log(`   Tasks: ${effectivePaths.tasks}`);
  
  try {
    const memoryStorage = new MemoryStorageWrapper(effectivePaths.memories);
    const taskStorage = new TaskStorage(effectivePaths.tasks, memoryStorage);
    
    console.log('✅ Storage objects created successfully');
    
    // Test memory storage
    const allMemories = memoryStorage.getAllMemories();
    console.log(`📝 Memory storage: ${allMemories.length} memories found`);
    
    if (allMemories.length > 0) {
      const sample = allMemories[0];
      console.log(`   Sample memory: ${sample.id} - ${sample.title || 'No title'}`);
      console.log(`   Projects: ${[...new Set(allMemories.map(m => m.project))].join(', ')}`);
    }
    
    // Test task storage
    const allTasks = taskStorage.getAllTasks();
    console.log(`📋 Task storage: ${allTasks.length} tasks found`);
    
    if (allTasks.length > 0) {
      const sample = allTasks[0];
      console.log(`   Sample task: ${sample.id} - ${sample.title || 'No title'}`);
      console.log(`   Projects: ${[...new Set(allTasks.map(t => t.project))].join(', ')}`);
    }
    
  } catch (error) {
    console.error('❌ Error creating storage objects:', error.message);
  }
  
  console.log('\\n');
}

async function checkAPIEndpoints() {
  console.log('4️⃣ API Endpoints Check...\\n');
  
  const endpoints = [
    { path: '/api/memories', name: 'Memories' },
    { path: '/api/tasks', name: 'Tasks' },
    { path: '/api/status', name: 'Status' },
    { path: '/api/paths', name: 'Paths' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`http://localhost:3001${endpoint.path}`);
      const data = await response.json();
      
      console.log(`📡 ${endpoint.name}:`);
      console.log(`   Status: ${response.status}`);
      
      if (endpoint.path === '/api/memories') {
        if (data.data) {
          console.log(`   Count: ${data.data.length}`);
          console.log(`   Pagination: ${JSON.stringify(data.pagination)}`);
        } else if (Array.isArray(data)) {
          console.log(`   Count: ${data.length}`);
        }
      } else if (endpoint.path === '/api/tasks') {
        if (data.data) {
          console.log(`   Count: ${data.data.length}`);
        } else if (Array.isArray(data)) {
          console.log(`   Count: ${data.length}`);
        }
      } else if (endpoint.path === '/api/status') {
        console.log(`   Memories: ${data.memories}`);
        console.log(`   Projects: ${data.projects}`);
      } else if (endpoint.path === '/api/paths') {
        console.log(`   Memory path: ${data.memories?.path}`);
        console.log(`   Memory exists: ${data.memories?.exists}`);
        console.log(`   Task path: ${data.tasks?.path}`);
        console.log(`   Task exists: ${data.tasks?.exists}`);
      }
      
    } catch (error) {
      console.log(`❌ ${endpoint.name}: ${error.message}`);
    }
    
    console.log('');
  }
}

async function diagnosePathMismatch() {
  console.log('5️⃣ Path Mismatch Diagnosis...\\n');
  
  // Check if the API server is pointing to empty directories
  // while data exists elsewhere
  
  try {
    const pathsResponse = await fetch('http://localhost:3001/api/paths');
    const pathsData = await pathsResponse.json();
    
    const apiMemoryPath = pathsData.memories?.path;
    const apiTaskPath = pathsData.tasks?.path;
    
    console.log('🔄 API Server Path Analysis:');
    console.log(`   API Memory Path: ${apiMemoryPath}`);
    console.log(`   API Task Path: ${apiTaskPath}`);
    
    // Check if these are empty
    if (apiMemoryPath && fs.existsSync(apiMemoryPath)) {
      const memoryContents = fs.readdirSync(apiMemoryPath);
      const memoryProjects = memoryContents.filter(item => {
        const itemPath = path.join(apiMemoryPath, item);
        return fs.statSync(itemPath).isDirectory();
      });
      
      console.log(`   API Memory Dir: ${memoryProjects.length} projects`);
      
      if (memoryProjects.length === 0) {
        console.log('   ⚠️  API is pointing to EMPTY memory directory!');
      }
    }
    
    if (apiTaskPath && fs.existsSync(apiTaskPath)) {
      const taskContents = fs.readdirSync(apiTaskPath);
      const taskProjects = taskContents.filter(item => {
        const itemPath = path.join(apiTaskPath, item);
        return fs.statSync(itemPath).isDirectory();
      });
      
      console.log(`   API Task Dir: ${taskProjects.length} projects`);
      
      if (taskProjects.length === 0) {
        console.log('   ⚠️  API is pointing to EMPTY task directory!');
      }
    }
    
    // Now check project root for existing data
    const projectRoot = path.join(__dirname, '..');
    const defaultMemoryPath = path.join(projectRoot, 'memories');
    const defaultTaskPath = path.join(projectRoot, 'tasks');
    
    console.log('\\n📁 Project Root Analysis:');
    console.log(`   Default Memory Path: ${defaultMemoryPath}`);
    console.log(`   Default Task Path: ${defaultTaskPath}`);
    
    if (fs.existsSync(defaultMemoryPath)) {
      const defaultMemoryContents = fs.readdirSync(defaultMemoryPath);
      const defaultMemoryProjects = defaultMemoryContents.filter(item => {
        const itemPath = path.join(defaultMemoryPath, item);
        return fs.statSync(itemPath).isDirectory();
      });
      
      console.log(`   Default Memory Dir: ${defaultMemoryProjects.length} projects`);
      
      if (defaultMemoryProjects.length > 0 && apiMemoryPath !== defaultMemoryPath) {
        console.log('   🚨 FOUND DATA in project root but API is pointing elsewhere!');
      }
    }
    
    if (fs.existsSync(defaultTaskPath)) {
      const defaultTaskContents = fs.readdirSync(defaultTaskPath);
      const defaultTaskProjects = defaultTaskContents.filter(item => {
        const itemPath = path.join(defaultTaskPath, item);
        return fs.statSync(itemPath).isDirectory();
      });
      
      console.log(`   Default Task Dir: ${defaultTaskProjects.length} projects`);
      
      if (defaultTaskProjects.length > 0 && apiTaskPath !== defaultTaskPath) {
        console.log('   🚨 FOUND DATA in project root but API is pointing elsewhere!');
      }
    }
    
  } catch (error) {
    console.error('❌ Path diagnosis failed:', error.message);
  }
  
  console.log('\\n');
}

async function runDiagnosis() {
  console.log('🚀 Starting comprehensive diagnosis...\\n');
  console.log('Make sure the API server is running on port 3001\\n');
  
  await checkCurrentConfiguration();
  await checkDirectoryContents();
  await checkStorageObjectsDirectly();
  await checkAPIEndpoints();
  await diagnosePathMismatch();
  
  console.log('\\n✅ Diagnosis complete!');
  console.log('\\nIf you see "FOUND DATA in project root but API is pointing elsewhere",');
  console.log('then the issue is that the API server is looking in the wrong location.');
  console.log('The solution is to update the paths to point to the actual data directories.');
}

runDiagnosis().catch(console.error);