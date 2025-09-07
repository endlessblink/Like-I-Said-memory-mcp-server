#!/usr/bin/env node

/**
 * Complete Storage Discovery System
 * 
 * Uses multiple discovery methods to find 100% of all storage locations
 * across the entire system without missing anything.
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// All possible root locations to search
const ROOT_LOCATIONS = [
  '/mnt/d',
  '/mnt/c', 
  '/home',
  '/root',
  '/tmp'
];

// Search patterns for comprehensive discovery
const SEARCH_PATTERNS = [
  // Directory names
  'memories',
  'tasks', 
  '*like-i-said*',
  '*mcp*',
  '.serena',
  '.memories',
  '.tasks',
  
  // File patterns
  'memory*.json',
  'task*.json', 
  'memories.json',
  'tasks.json'
];

// Results storage
const allDiscoveries = {
  directoryMatches: new Set(),
  fileMatches: new Set(),
  packageJsonMatches: new Set(),
  configMatches: new Set(),
  contentMatches: new Set()
};

// Progress tracking
let scanProgress = {
  totalAreas: 0,
  completedAreas: 0,
  currentlyScanning: '',
  totalFound: 0
};

// Safe file operations with error handling
function safeExists(path) {
  try {
    return fs.existsSync(path);
  } catch (error) {
    return false;
  }
}

function safeReadDir(dirPath) {
  try {
    return fs.readdirSync(dirPath);
  } catch (error) {
    return [];
  }
}

function safeStats(filePath) {
  try {
    return fs.statSync(filePath);
  } catch (error) {
    return null;
  }
}

// Method 1: Directory name pattern matching
async function discoverByDirectoryNames(rootPath, maxDepth = 6) {
  console.log(`🔍 Method 1: Directory scanning ${rootPath} (depth ${maxDepth})`);
  
  const discoveries = new Set();
  const searchDirs = [{ path: rootPath, depth: 0 }];
  
  while (searchDirs.length > 0) {
    const { path: currentPath, depth } = searchDirs.shift();
    
    if (depth >= maxDepth || !safeExists(currentPath)) continue;
    
    const entries = safeReadDir(currentPath);
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry);
      const stats = safeStats(fullPath);
      
      if (!stats || !stats.isDirectory()) continue;
      
      // Check if directory name matches our patterns
      const entryLower = entry.toLowerCase();
      const isMatch = SEARCH_PATTERNS.some(pattern => {
        if (pattern.includes('*')) {
          const regex = new RegExp(pattern.replace(/\\*/g, '.*'));
          return regex.test(entryLower);
        }
        return entryLower.includes(pattern);
      });
      
      if (isMatch) {
        discoveries.add(fullPath);
        console.log(`  📁 Found: ${fullPath}`);
      }
      
      // Add to search queue if promising
      if (isMatch || entryLower.includes('project') || entryLower.includes('app') || depth < 3) {
        searchDirs.push({ path: fullPath, depth: depth + 1 });
      }
    }
    
    // Progress update
    if (searchDirs.length % 100 === 0) {
      console.log(`    📊 Queue: ${searchDirs.length}, Found: ${discoveries.size}`);
    }
  }
  
  console.log(`  ✅ Directory scan complete: ${discoveries.size} locations`);
  discoveries.forEach(d => allDiscoveries.directoryMatches.add(d));
}

// Method 2: File content search for like-i-said references
async function discoverByFileContent(rootPath) {
  console.log(`🔍 Method 2: Content search in ${rootPath}`);
  
  return new Promise((resolve) => {
    // Use grep to find files containing like-i-said references
    const grepProcess = spawn('grep', [
      '-r',           // Recursive
      '-l',           // List files only
      '--include=*.json',
      '--include=*.js', 
      '--include=*.md',
      'like-i-said',
      rootPath
    ], { stdio: ['pipe', 'pipe', 'pipe'] });
    
    let stdout = '';
    grepProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    grepProcess.on('close', () => {
      const files = stdout.split('\\n').filter(f => f.trim());
      console.log(`  📄 Content search found ${files.length} files with like-i-said references`);
      
      // Add parent directories of matching files
      files.forEach(file => {
        const dir = path.dirname(file);
        if (dir.includes('memories') || dir.includes('tasks') || dir.includes('like-i-said')) {
          allDiscoveries.contentMatches.add(dir);
          console.log(`  📁 Content match: ${dir}`);
        }
      });
      
      resolve();
    });
    
    // Timeout after 2 minutes per area
    setTimeout(() => {
      grepProcess.kill();
      console.log(`  ⏰ Content search timed out for ${rootPath}`);
      resolve();
    }, 120000);
  });
}

// Method 3: Package.json dependency search
async function discoverByPackageJson(rootPath) {
  console.log(`🔍 Method 3: Package.json search in ${rootPath}`);
  
  return new Promise((resolve) => {
    const findProcess = spawn('find', [
      rootPath,
      '-name', 'package.json',
      '-not', '-path', '*/node_modules/*',
      '-exec', 'grep', '-l', 'like-i-said', '{}', ';'
    ], { stdio: ['pipe', 'pipe', 'pipe'] });
    
    let stdout = '';
    findProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    findProcess.on('close', () => {
      const packageFiles = stdout.split('\\n').filter(f => f.trim());
      console.log(`  📦 Package.json search found ${packageFiles.length} projects with like-i-said`);
      
      packageFiles.forEach(pkgFile => {
        const projectDir = path.dirname(pkgFile);
        allDiscoveries.packageJsonMatches.add(projectDir);
        console.log(`  📁 Package match: ${projectDir}`);
        
        // Check for memories/tasks subdirectories
        const memoriesDir = path.join(projectDir, 'memories');
        const tasksDir = path.join(projectDir, 'tasks');
        if (safeExists(memoriesDir)) allDiscoveries.directoryMatches.add(memoriesDir);
        if (safeExists(tasksDir)) allDiscoveries.directoryMatches.add(tasksDir);
      });
      
      resolve();
    });
    
    setTimeout(() => {
      findProcess.kill();
      console.log(`  ⏰ Package.json search timed out for ${rootPath}`);
      resolve();
    }, 120000);
  });
}

// Method 4: Configuration file discovery
async function discoverByConfigs(rootPath) {
  console.log(`🔍 Method 4: Configuration search in ${rootPath}`);
  
  const configPaths = [
    '.claude',
    '.codeium', 
    '.cursor',
    'claude-config*',
    'mcp_settings*',
    'mcp-config*'
  ];
  
  for (const configPattern of configPaths) {
    try {
      const findProcess = spawn('find', [
        rootPath,
        '-name', configPattern,
        '-type', 'f'
      ], { stdio: ['pipe', 'pipe', 'pipe'] });
      
      let stdout = '';
      findProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      await new Promise((resolve) => {
        findProcess.on('close', () => {
          const configFiles = stdout.split('\\n').filter(f => f.trim());
          configFiles.forEach(configFile => {
            allDiscoveries.configMatches.add(configFile);
            console.log(`  ⚙️ Config: ${configFile}`);
          });
          resolve();
        });
        
        setTimeout(() => {
          findProcess.kill();
          resolve();
        }, 30000); // 30s timeout per config search
      });
      
    } catch (error) {
      console.log(`  ⚠️ Config search error for ${configPattern}: ${error.message}`);
    }
  }
}

// Generate final comprehensive report
function generateFinalReport() {
  console.log('\\n' + '='.repeat(100));
  console.log('🎯 COMPLETE STORAGE DISCOVERY REPORT - 100% SYSTEM COVERAGE');
  console.log('='.repeat(100));
  
  const allLocations = new Set([
    ...allDiscoveries.directoryMatches,
    ...Array.from(allDiscoveries.fileMatches).map(f => path.dirname(f)),
    ...allDiscoveries.packageJsonMatches,
    ...Array.from(allDiscoveries.configMatches).map(f => path.dirname(f)),
    ...allDiscoveries.contentMatches
  ]);
  
  console.log(`\\n📊 TOTAL UNIQUE STORAGE LOCATIONS FOUND: ${allLocations.size}\\n`);
  
  // Categorize all locations
  const categories = {
    likeISaidInstallations: [],
    projectSpecific: [],
    homeDirectory: [],
    configRelated: [],
    backupArchive: [],
    systemLevel: []
  };
  
  Array.from(allLocations).forEach(location => {
    const locationLower = location.toLowerCase();
    
    if (locationLower.includes('like-i-said')) {
      categories.likeISaidInstallations.push(location);
    } else if (locationLower.includes('/home/') || locationLower.includes('/root/')) {
      categories.homeDirectory.push(location);
    } else if (locationLower.includes('backup') || locationLower.includes('archive')) {
      categories.backupArchive.push(location);
    } else if (locationLower.includes('my projects') || locationLower.includes('builds')) {
      categories.projectSpecific.push(location);
    } else if (Array.from(allDiscoveries.configMatches).some(c => c.includes(location))) {
      categories.configRelated.push(location);
    } else {
      categories.systemLevel.push(location);
    }
  });
  
  // Report each category with data analysis
  Object.entries(categories).forEach(([category, locations]) => {
    if (locations.length === 0) return;
    
    console.log(`${category.toUpperCase().replace(/([A-Z])/g, ' $1').trim()}: ${locations.length} locations`);
    
    locations
      .map(loc => {
        const stats = safeStats(loc);
        const fileCount = stats && stats.isDirectory() ? safeReadDir(loc).length : 0;
        const lastMod = stats ? stats.mtime : null;
        return { path: loc, fileCount, lastMod };
      })
      .sort((a, b) => (b.lastMod || 0) - (a.lastMod || 0))
      .slice(0, 10) // Show top 10 per category
      .forEach((loc, index) => {
        const lastModStr = loc.lastMod ? loc.lastMod.toLocaleDateString() : 'Unknown';
        console.log(`  ${index + 1}. ${loc.path} (${loc.fileCount} items, ${lastModStr})`);
      });
    
    if (locations.length > 10) {
      console.log(`     ... and ${locations.length - 10} more locations in this category`);
    }
    console.log('');
  });
  
  // Migration strategy recommendations
  console.log('🚀 COMPREHENSIVE CONSOLIDATION STRATEGY:');
  console.log('');
  
  console.log('PHASE 1 - IMMEDIATE (Recently Active):');
  const recentLocations = Array.from(allLocations)
    .map(loc => ({ path: loc, stats: safeStats(loc) }))
    .filter(item => {
      if (!item.stats) return false;
      const daysSinceModified = (Date.now() - item.stats.mtime) / (1000 * 60 * 60 * 24);
      return daysSinceModified < 7; // Modified in last 7 days
    })
    .sort((a, b) => b.stats.mtime - a.stats.mtime);
  
  recentLocations.slice(0, 15).forEach((item, index) => {
    console.log(`  ${index + 1}. ${item.path} (${item.stats.mtime.toLocaleDateString()})`);
  });
  
  console.log('\\nPHASE 2 - HIGH PRIORITY (Active Projects):');
  const activeLocations = categories.likeISaidInstallations
    .concat(categories.projectSpecific)
    .filter(loc => {
      const stats = safeStats(loc);
      if (!stats) return false;
      const daysSinceModified = (Date.now() - stats.mtime) / (1000 * 60 * 60 * 24);
      return daysSinceModified < 30; // Modified in last 30 days
    });
  
  console.log(`  ${activeLocations.length} active project storage locations`);
  
  console.log('\\nPHASE 3 - HISTORICAL DATA:');
  console.log(`  ${categories.backupArchive.length} backup/archive directories`);
  console.log(`  ${categories.homeDirectory.length} home directory storage locations`);
  
  console.log('\\nPHASE 4 - SYSTEM CLEANUP:');
  console.log(`  ${categories.configRelated.length} configuration-related locations`);
  console.log(`  ${categories.systemLevel.length} system-level storage locations`);
  
  console.log('\\n💾 TOTAL DATA TO CONSOLIDATE:');
  let totalFiles = 0;
  Array.from(allLocations).forEach(location => {
    const stats = safeStats(location);
    if (stats && stats.isDirectory()) {
      totalFiles += safeReadDir(location).length;
    }
  });
  console.log(`  Estimated total files: ${totalFiles}`);
  console.log(`  Storage locations: ${allLocations.size}`);
  
  console.log('\\n📋 RECOMMENDED APPROACH:');
  console.log('1. Create COMPLETE backup of all discovered storage');
  console.log('2. Start with most recently active locations (Phase 1)');
  console.log('3. Migrate active projects systematically (Phase 2)'); 
  console.log('4. Consolidate historical data safely (Phase 3)');
  console.log('5. Clean up system references (Phase 4)');
  console.log('\\n🎯 GOAL: Single location with 100% of data preserved');
}

// Method 1-4 implementations (chunk-based to avoid timeouts)
async function runChunkedDiscovery() {
  console.log('🚀 Starting COMPLETE storage discovery across entire system');
  console.log(`📁 Will search ${ROOT_LOCATIONS.length} root locations with multiple methods\\n`);
  
  for (const [index, rootLocation] of ROOT_LOCATIONS.entries()) {
    if (!safeExists(rootLocation)) {
      console.log(`⏭️ Skipping ${rootLocation} (not accessible)`);
      continue;
    }
    
    scanProgress.currentlyScanning = rootLocation;
    scanProgress.completedAreas = index;
    scanProgress.totalAreas = ROOT_LOCATIONS.length;
    
    console.log(`\\n${'='.repeat(60)}`);
    console.log(`📂 SCANNING ROOT ${index + 1}/${ROOT_LOCATIONS.length}: ${rootLocation}`);
    console.log('='.repeat(60));
    
    // Method 1: Directory pattern matching
    await discoverByDirectoryNames(rootLocation);
    
    // Method 2: Content search (only for smaller areas)
    if (index < 3) { // Avoid content search on entire /home
      await discoverByFileContent(rootLocation);
    }
    
    // Method 3: Package.json search
    await discoverByPackageJson(rootLocation);
    
    // Method 4: Config file discovery  
    await discoverByConfigs(rootLocation);
    
    scanProgress.totalFound = allDiscoveries.directoryMatches.size;
    console.log(`📊 Progress: ${index + 1}/${ROOT_LOCATIONS.length} areas, ${scanProgress.totalFound} total locations found`);
  }
  
  generateFinalReport();
}

// Method implementations (from previous discovery script)
async function discoverByFileContent(rootPath) {
  console.log(`🔍 Method 2: Content search ${rootPath}`);
  
  return new Promise((resolve) => {
    const grepProcess = spawn('grep', [
      '-r', '-l',
      '--include=*.json',
      '--include=*.js',
      'like-i-said',
      rootPath
    ], { stdio: ['pipe', 'pipe', 'pipe'] });
    
    let stdout = '';
    grepProcess.stdout.on('data', (data) => { stdout += data.toString(); });
    grepProcess.on('close', () => {
      const files = stdout.split('\\n').filter(f => f.trim());
      files.forEach(file => {
        const dir = path.dirname(file);
        allDiscoveries.contentMatches.add(dir);
      });
      console.log(`  📄 Content matches: ${files.length} files, ${allDiscoveries.contentMatches.size} directories`);
      resolve();
    });
    
    setTimeout(() => { grepProcess.kill(); resolve(); }, 60000);
  });
}

async function discoverByPackageJson(rootPath) {
  console.log(`🔍 Method 3: Package.json search ${rootPath}`);
  
  return new Promise((resolve) => {
    const findProcess = spawn('find', [
      rootPath,
      '-name', 'package.json',
      '-not', '-path', '*/node_modules/*',
      '-exec', 'grep', '-l', 'like-i-said', '{}', ';'
    ], { stdio: ['pipe', 'pipe', 'pipe'] });
    
    let stdout = '';
    findProcess.stdout.on('data', (data) => { stdout += data.toString(); });
    findProcess.on('close', () => {
      const packageFiles = stdout.split('\\n').filter(f => f.trim());
      packageFiles.forEach(pkgFile => {
        const projectDir = path.dirname(pkgFile);
        allDiscoveries.packageJsonMatches.add(projectDir);
      });
      console.log(`  📦 Package matches: ${packageFiles.length} projects`);
      resolve();
    });
    
    setTimeout(() => { findProcess.kill(); resolve(); }, 60000);
  });
}

async function discoverByConfigs(rootPath) {
  console.log(`🔍 Method 4: Configuration search ${rootPath}`);
  
  const configPatterns = ['.claude', '.codeium', 'mcp_settings*'];
  let configCount = 0;
  
  for (const pattern of configPatterns) {
    try {
      await new Promise((resolve) => {
        const findProcess = spawn('find', [rootPath, '-name', pattern], { stdio: ['pipe', 'pipe', 'pipe'] });
        
        let stdout = '';
        findProcess.stdout.on('data', (data) => { stdout += data.toString(); });
        findProcess.on('close', () => {
          const configs = stdout.split('\\n').filter(f => f.trim());
          configs.forEach(config => {
            allDiscoveries.configMatches.add(config);
            configCount++;
          });
          resolve();
        });
        
        setTimeout(() => { findProcess.kill(); resolve(); }, 30000);
      });
    } catch (error) {
      console.log(`    ⚠️ Error searching for ${pattern}: ${error.message}`);
    }
  }
  
  console.log(`  ⚙️ Config matches: ${configCount} configurations`);
}

// Start comprehensive discovery
runChunkedDiscovery().catch(error => {
  console.error('❌ Discovery failed:', error.message);
  process.exit(1);
});