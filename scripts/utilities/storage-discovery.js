#!/usr/bin/env node

/**
 * Comprehensive Storage Discovery Tool
 * 
 * Systematically finds ALL memory and task storage across the entire system
 * without timing out or missing critical locations.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Target directories to search (manageable chunks)
const SEARCH_AREAS = [
  '/mnt/d/APPSNospaces',
  '/mnt/d/MY PROJECTS/AI/LLM/AI Code Gen/my-builds',
  '/mnt/d/shared', 
  '/home/endlessblink/projects',
  '/home/endlessblink',
  '/mnt/c/Users'
];

// Storage patterns to look for
const STORAGE_PATTERNS = [
  'memories',
  'tasks', 
  'like-i-said',
  'mcp',
  '.serena'
];

// Results storage
const discoveries = {
  likeISaidInstallations: [],
  projectStorage: [],
  homeDirectoryStorage: [],
  backupDirectories: [],
  unknownStorage: []
};

// Utility functions
function getFileCount(dir) {
  try {
    if (!fs.existsSync(dir)) return 0;
    return fs.readdirSync(dir).length;
  } catch (error) {
    return -1;
  }
}

function getLastModified(dir) {
  try {
    if (!fs.existsSync(dir)) return null;
    const stats = fs.statSync(dir);
    return stats.mtime;
  } catch (error) {
    return null;
  }
}

function scanDirectory(baseDir, maxDepth = 3, currentDepth = 0) {
  const results = [];
  
  if (currentDepth >= maxDepth || !fs.existsSync(baseDir)) {
    return results;
  }
  
  try {
    const entries = fs.readdirSync(baseDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .filter(dirent => !dirent.name.startsWith('.') || STORAGE_PATTERNS.some(p => dirent.name.includes(p)))
      .slice(0, 50); // Limit to prevent overwhelming
    
    for (const entry of entries) {
      const fullPath = path.join(baseDir, entry.name);
      const entryName = entry.name.toLowerCase();
      
      // Check if this directory matches storage patterns
      const isStorageDir = STORAGE_PATTERNS.some(pattern => entryName.includes(pattern));
      const isProjectDir = entryName.includes('project') || entryName.includes('app');
      
      if (isStorageDir) {
        results.push({
          path: fullPath,
          type: entryName.includes('memories') ? 'memories' : 
                entryName.includes('tasks') ? 'tasks' :
                entryName.includes('like-i-said') ? 'like-i-said-installation' :
                'other-storage',
          fileCount: getFileCount(fullPath),
          lastModified: getLastModified(fullPath),
          depth: currentDepth
        });
      }
      
      // Recurse into promising directories
      if (isStorageDir || isProjectDir || entryName.includes('mcp')) {
        const subResults = scanDirectory(fullPath, maxDepth, currentDepth + 1);
        results.push(...subResults);
      }
    }
  } catch (error) {
    console.log(`⚠️ Error scanning ${baseDir}: ${error.message}`);
  }
  
  return results;
}

// Categorize discoveries
function categorizeDiscovery(discovery) {
  const pathLower = discovery.path.toLowerCase();
  
  if (pathLower.includes('like-i-said') && (pathLower.includes('memories') || pathLower.includes('tasks'))) {
    discoveries.likeISaidInstallations.push(discovery);
  } else if (pathLower.includes('backup') || pathLower.includes('archive')) {
    discoveries.backupDirectories.push(discovery);
  } else if (pathLower.includes('/home/endlessblink')) {
    discoveries.homeDirectoryStorage.push(discovery);
  } else if (pathLower.includes('my projects') || pathLower.includes('productivity')) {
    discoveries.projectStorage.push(discovery);
  } else {
    discoveries.unknownStorage.push(discovery);
  }
}

// Generate comprehensive report
function generateReport() {
  console.log('\\n' + '='.repeat(80));
  console.log('🔍 COMPREHENSIVE STORAGE DISCOVERY REPORT');
  console.log('='.repeat(80));
  
  const totalLocations = Object.values(discoveries).reduce((sum, arr) => sum + arr.length, 0);
  console.log(`\\n📊 SUMMARY: Found ${totalLocations} storage locations\\n`);
  
  // Like-I-Said MCP Installations
  if (discoveries.likeISaidInstallations.length > 0) {
    console.log('🧠 LIKE-I-SAID MCP INSTALLATIONS:');
    discoveries.likeISaidInstallations
      .sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0))
      .forEach((loc, index) => {
        const lastMod = loc.lastModified ? loc.lastModified.toLocaleString() : 'Unknown';
        const fileCount = loc.fileCount >= 0 ? loc.fileCount : '?';
        console.log(`  ${index + 1}. ${loc.path}`);
        console.log(`     Type: ${loc.type} | Files: ${fileCount} | Modified: ${lastMod}`);
      });
    console.log('');
  }
  
  // Project-specific storage
  if (discoveries.projectStorage.length > 0) {
    console.log('📂 PROJECT-SPECIFIC STORAGE:');
    discoveries.projectStorage
      .sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0))
      .slice(0, 15) // Show top 15 most recent
      .forEach((loc, index) => {
        const lastMod = loc.lastModified ? loc.lastModified.toLocaleString() : 'Unknown';
        const fileCount = loc.fileCount >= 0 ? loc.fileCount : '?';
        console.log(`  ${index + 1}. ${loc.path}`);
        console.log(`     Type: ${loc.type} | Files: ${fileCount} | Modified: ${lastMod}`);
      });
    if (discoveries.projectStorage.length > 15) {
      console.log(`     ... and ${discoveries.projectStorage.length - 15} more project storage locations`);
    }
    console.log('');
  }
  
  // Home directory storage
  if (discoveries.homeDirectoryStorage.length > 0) {
    console.log('🏠 HOME DIRECTORY STORAGE:');
    discoveries.homeDirectoryStorage
      .sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0))
      .slice(0, 10) // Show top 10 most recent
      .forEach((loc, index) => {
        const lastMod = loc.lastModified ? loc.lastModified.toLocaleString() : 'Unknown';
        const fileCount = loc.fileCount >= 0 ? loc.fileCount : '?';
        console.log(`  ${index + 1}. ${loc.path}`);
        console.log(`     Type: ${loc.type} | Files: ${fileCount} | Modified: ${lastMod}`);
      });
    if (discoveries.homeDirectoryStorage.length > 10) {
      console.log(`     ... and ${discoveries.homeDirectoryStorage.length - 10} more home storage locations`);
    }
    console.log('');
  }
  
  // Backup directories (summarized)
  if (discoveries.backupDirectories.length > 0) {
    console.log(`💾 BACKUP/ARCHIVE DIRECTORIES: ${discoveries.backupDirectories.length} found (summary only)`);
    console.log('');
  }
  
  // Unknown storage
  if (discoveries.unknownStorage.length > 0) {
    console.log('❓ UNKNOWN/OTHER STORAGE:');
    discoveries.unknownStorage.slice(0, 8).forEach((loc, index) => {
      console.log(`  ${index + 1}. ${loc.path} (${loc.type})`);
    });
    if (discoveries.unknownStorage.length > 8) {
      console.log(`     ... and ${discoveries.unknownStorage.length - 8} more unknown locations`);
    }
    console.log('');
  }
  
  // Recommendations
  console.log('🎯 MIGRATION PRIORITY RECOMMENDATIONS:');
  console.log('');
  console.log('HIGH PRIORITY (Active Projects):');
  const activeLocs = [...discoveries.likeISaidInstallations, ...discoveries.projectStorage]
    .filter(loc => {
      const recent = loc.lastModified && (Date.now() - loc.lastModified) < (7 * 24 * 60 * 60 * 1000); // 7 days
      const hasData = loc.fileCount > 0;
      return recent && hasData;
    })
    .sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));
  
  activeLocs.slice(0, 8).forEach((loc, index) => {
    console.log(`  ${index + 1}. ${loc.path} (${loc.fileCount} files, modified ${loc.lastModified?.toLocaleDateString()})`);
  });
  
  console.log('\\nMEDIUM PRIORITY (Historical Data):');
  console.log(`  - ${discoveries.homeDirectoryStorage.length} home directory locations`);
  console.log(`  - ${discoveries.backupDirectories.length} backup directories`);
  
  console.log('\\nLOW PRIORITY (Archives/Unknown):');
  console.log(`  - ${discoveries.unknownStorage.length} unknown storage locations`);
  
  console.log('\\n📋 NEXT STEPS:');
  console.log('1. Review high priority locations for immediate migration');
  console.log('2. Test current consolidated storage with monitor');
  console.log('3. Migrate active projects one at a time');
  console.log('4. Archive or merge historical data');
}

// Main discovery process
async function discover() {
  console.log('🔍 Starting systematic storage discovery...');
  console.log(`📁 Scanning ${SEARCH_AREAS.length} major areas\\n`);
  
  for (const [index, searchArea] of SEARCH_AREAS.entries()) {
    console.log(`📂 Scanning area ${index + 1}/${SEARCH_AREAS.length}: ${searchArea}`);
    
    if (!fs.existsSync(searchArea)) {
      console.log(`  ⏭️ Skipped (not accessible)`);
      continue;
    }
    
    try {
      const results = scanDirectory(searchArea, 4); // Max 4 levels deep
      console.log(`  ✅ Found ${results.length} storage locations`);
      
      // Categorize results
      results.forEach(categorizeDiscovery);
      
    } catch (error) {
      console.log(`  ❌ Error scanning: ${error.message}`);
    }
  }
  
  generateReport();
}

// Run discovery
discover().catch(error => {
  console.error('❌ Discovery failed:', error.message);
  process.exit(1);
});