#!/usr/bin/env node

/**
 * Debug script to check why data isn't loading
 */

import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Debugging Data Loading Issues...\n');

async function checkAPIEndpoints() {
  console.log('1️⃣ Checking API endpoints...\n');
  
  try {
    // Check memories endpoint
    console.log('📋 Testing /api/memories:');
    const memoriesResponse = await fetch('http://localhost:3001/api/memories');
    const memoriesData = await memoriesResponse.json();
    
    console.log(`   Status: ${memoriesResponse.status}`);
    console.log(`   Data type: ${Array.isArray(memoriesData) ? 'Array' : 'Object'}`);
    
    if (memoriesData.data) {
      console.log(`   Memories count: ${memoriesData.data.length}`);
      console.log(`   Pagination:`, memoriesData.pagination);
    } else if (Array.isArray(memoriesData)) {
      console.log(`   Memories count: ${memoriesData.length}`);
    }
    
    // Check tasks endpoint
    console.log('\n📋 Testing /api/tasks:');
    const tasksResponse = await fetch('http://localhost:3001/api/tasks');
    const tasksData = await tasksResponse.json();
    
    console.log(`   Status: ${tasksResponse.status}`);
    console.log(`   Data type: ${Array.isArray(tasksData) ? 'Array' : 'Object'}`);
    
    if (tasksData.data) {
      console.log(`   Tasks count: ${tasksData.data.length}`);
      console.log(`   Pagination:`, tasksData.pagination);
    } else if (Array.isArray(tasksData)) {
      console.log(`   Tasks count: ${tasksData.length}`);
    }
    
    // Check current paths
    console.log('\n📋 Testing /api/paths:');
    const pathsResponse = await fetch('http://localhost:3001/api/paths');
    const pathsData = await pathsResponse.json();
    
    console.log(`   Status: ${pathsResponse.status}`);
    console.log(`   Current paths:`, pathsData);
    
  } catch (error) {
    console.error('❌ API Error:', error.message);
  }
}

async function checkLocalData() {
  console.log('\n\n2️⃣ Checking local data directories...\n');
  
  const projectRoot = path.join(__dirname, '..');
  const memoriesDir = path.join(projectRoot, 'memories');
  const tasksDir = path.join(projectRoot, 'tasks');
  
  // Check memories
  if (fs.existsSync(memoriesDir)) {
    const projects = fs.readdirSync(memoriesDir).filter(f => {
      const stat = fs.statSync(path.join(memoriesDir, f));
      return stat.isDirectory();
    });
    
    console.log(`📁 Memories directory: ${memoriesDir}`);
    console.log(`   Projects found: ${projects.length}`);
    projects.slice(0, 5).forEach(p => console.log(`   - ${p}`));
    
    // Count memories in each project
    let totalMemories = 0;
    projects.forEach(project => {
      const projectDir = path.join(memoriesDir, project);
      const files = fs.readdirSync(projectDir).filter(f => f.endsWith('.md'));
      totalMemories += files.length;
    });
    console.log(`   Total memories: ${totalMemories}`);
  } else {
    console.log(`❌ Memories directory not found: ${memoriesDir}`);
  }
  
  // Check tasks
  if (fs.existsSync(tasksDir)) {
    const projects = fs.readdirSync(tasksDir).filter(f => {
      const stat = fs.statSync(path.join(tasksDir, f));
      return stat.isDirectory();
    });
    
    console.log(`\n📁 Tasks directory: ${tasksDir}`);
    console.log(`   Projects found: ${projects.length}`);
    projects.slice(0, 5).forEach(p => console.log(`   - ${p}`));
    
    // Count tasks
    let totalTasks = 0;
    projects.forEach(project => {
      const projectDir = path.join(tasksDir, project);
      const files = fs.readdirSync(projectDir).filter(f => f.endsWith('.md'));
      totalTasks += files.length;
    });
    console.log(`   Total tasks: ${totalTasks}`);
  } else {
    console.log(`❌ Tasks directory not found: ${tasksDir}`);
  }
}

async function checkWebSocket() {
  console.log('\n\n3️⃣ Checking WebSocket connection...\n');
  
  try {
    const WebSocket = (await import('ws')).default;
    const ws = new WebSocket('ws://localhost:3001');
    
    const timeout = setTimeout(() => {
      console.log('❌ WebSocket connection timeout');
      ws.close();
    }, 5000);
    
    ws.on('open', () => {
      console.log('✅ WebSocket connected');
      clearTimeout(timeout);
      
      // Listen for messages
      ws.on('message', (data) => {
        console.log('📨 WebSocket message:', data.toString());
      });
      
      // Close after 3 seconds
      setTimeout(() => {
        ws.close();
      }, 3000);
    });
    
    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
      clearTimeout(timeout);
    });
    
  } catch (error) {
    console.error('❌ WebSocket test failed:', error.message);
  }
}

// Run all checks
async function runDebug() {
  console.log('🚀 Starting debug checks...\n');
  console.log('Make sure the API server is running on port 3001\n');
  
  await checkAPIEndpoints();
  await checkLocalData();
  await checkWebSocket();
  
  console.log('\n\n✅ Debug checks complete');
}

runDebug().catch(console.error);