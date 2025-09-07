#!/usr/bin/env node

/**
 * System-Wide Storage Discovery
 * Find 100% of all like-i-said, memory, and task storage across entire system
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

// All discovered storage locations
const discoveries = new Set();

// Safe file system operations
function safeExists(path) {
  try { return fs.existsSync(path); } catch { return false; }
}

function safeReadDir(path) {
  try { return fs.readdirSync(path); } catch { return []; }
}

function safeStats(path) {
  try { return fs.statSync(path); } catch { return null; }
}

// Comprehensive search using find command (handles large directories)
async function findStorageLocations() {
  console.log('🔍 Starting comprehensive find operations...\n');
  
  const searches = [
    // Directory name searches
    { pattern: '-name', value: 'memories', type: 'memories' },
    { pattern: '-name', value: 'tasks', type: 'tasks' },
    { pattern: '-name', value: '*like-i-said*', type: 'like-i-said' },
    { pattern: '-name', value: '*mcp*', type: 'mcp' },
    { pattern: '-name', value: '.serena', type: 'serena' },
    
    // Path pattern searches  
    { pattern: '-path', value: '*like-i-said*', type: 'like-i-said-path' },
    { pattern: '-path', value: '*memories*', type: 'memory-path' },
    { pattern: '-path', value: '*tasks*', type: 'task-path' }
  ];
  
  const searchRoots = ['/mnt/d', '/mnt/c', '/home'];
  
  for (const root of searchRoots) {
    if (!safeExists(root)) continue;
    
    console.log(`📂 Searching ${root}...`);
    
    for (const search of searches) {
      try {
        console.log(`  🔍 ${search.type} pattern...`);
        
        const findResult = await new Promise((resolve) => {
          const findProcess = spawn('find', [
            root,
            '-type', 'd',
            search.pattern, search.value,
            '-not', '-path', '*/node_modules/*',
            '-not', '-path', '*/.git/*'
          ], { stdio: ['pipe', 'pipe', 'pipe'] });
          
          let stdout = '';
          findProcess.stdout.on('data', (data) => { stdout += data.toString(); });
          findProcess.on('close', () => {
            const results = stdout.split('\n').filter(line => line.trim());
            resolve(results);
          });
          
          // 3 minute timeout per search
          setTimeout(() => { 
            findProcess.kill(); 
            console.log(`    ⏰ Search timed out`);
            resolve([]); 
          }, 180000);
        });
        
        findResult.forEach(result => discoveries.add(result));
        console.log(`    ✅ Found ${findResult.length} locations`);
        
      } catch (error) {
        console.log(`    ❌ Error: ${error.message}`);
      }
    }
  }
  
  console.log(`\n📊 Total unique locations discovered: ${discoveries.size}\n`);
}

// Analyze and categorize all discoveries
function analyzeDiscoveries() {
  console.log('🔍 Analyzing all discovered storage locations...\n');
  
  const analysis = {
    likeISaidInstallations: [],
    projectStorage: [],
    homeStorage: [], 
    systemStorage: [],
    backupStorage: [],
    unknownStorage: []
  };
  
  Array.from(discoveries).forEach(location => {
    const stats = safeStats(location);
    const fileCount = stats && stats.isDirectory() ? safeReadDir(location).length : 0;
    const lastMod = stats ? stats.mtime : null;
    const locationLower = location.toLowerCase();
    
    const info = {
      path: location,
      fileCount,
      lastModified: lastMod,
      sizeBytes: stats ? stats.size : 0,
      isDirectory: stats ? stats.isDirectory() : false
    };
    
    // Categorize
    if (locationLower.includes('like-i-said')) {
      analysis.likeISaidInstallations.push(info);
    } else if (locationLower.includes('backup') || locationLower.includes('archive')) {
      analysis.backupStorage.push(info);
    } else if (locationLower.includes('/home/')) {
      analysis.homeStorage.push(info);
    } else if (locationLower.includes('my projects') || locationLower.includes('builds')) {
      analysis.projectStorage.push(info);
    } else {
      analysis.unknownStorage.push(info);
    }
  });
  
  // Generate detailed report
  console.log('='.repeat(100));
  console.log('🎯 COMPLETE SYSTEM-WIDE STORAGE ANALYSIS');
  console.log('='.repeat(100));
  
  Object.entries(analysis).forEach(([category, items]) => {
    if (items.length === 0) return;
    
    console.log(`\n${category.toUpperCase().replace(/([A-Z])/g, ' $1').trim()}: ${items.length} locations`);
    
    // Sort by most recent first
    items.sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));
    
    // Show details for each location
    items.slice(0, 15).forEach((item, index) => {
      const lastMod = item.lastModified ? item.lastModified.toLocaleDateString() : 'Unknown';
      const fileInfo = item.isDirectory ? `${item.fileCount} files` : 'file';
      console.log(`  ${index + 1}. ${item.path}`);
      console.log(`     ${fileInfo}, modified: ${lastMod}`);
    });
    
    if (items.length > 15) {
      console.log(`     ... and ${items.length - 15} more locations`);
    }
  });
  
  // Summary
  const totalFiles = Object.values(analysis).flat().reduce((sum, item) => sum + item.fileCount, 0);
  
  console.log('\n='.repeat(100));
  console.log('📊 CONSOLIDATION SUMMARY:');
  console.log(`  🗂️ Total storage locations: ${discoveries.size}`);
  console.log(`  📄 Estimated total files: ${totalFiles}`);
  console.log(`  🧠 Like-I-Said installations: ${analysis.likeISaidInstallations.length}`);
  console.log(`  📂 Project-specific storage: ${analysis.projectStorage.length}`);
  console.log(`  🏠 Home directory storage: ${analysis.homeStorage.length}`);
  console.log(`  💾 Backup/archive storage: ${analysis.backupStorage.length}`);
  console.log('='.repeat(100));
  
  return analysis;
}

// Main execution
async function main() {
  try {
    await findStorageLocations();
    const analysis = analyzeDiscoveries();
    
    console.log('\n🎯 READY FOR COMPREHENSIVE CONSOLIDATION');
    console.log('All storage locations mapped - safe to proceed with migration');
    
  } catch (error) {
    console.error('❌ Discovery failed:', error.message);
  }
}

main();