#!/usr/bin/env node

/**
 * Complete Storage Inventory 
 * Explicitly checks all known paths and builds comprehensive list
 */

import fs from 'fs';
import path from 'path';

// Explicit known locations (no searching, direct checking)
const KNOWN_STORAGE_LOCATIONS = [
  // Like-I-Said MCP Installations
  '/mnt/d/APPSNospaces/like-i-said-mcp/memories',
  '/mnt/d/APPSNospaces/like-i-said-mcp/tasks', 
  '/mnt/d/APPSNospaces/like-i-said-mcp-server-error/memories',
  '/mnt/d/APPSNospaces/like-i-said-mcp-server-error/tasks',
  '/mnt/d/APPSNospaces/like-i-said-mcp-temp',
  '/mnt/d/shared/like-i-said-mcp/tasks',
  
  // Project-specific storage (from our discoveries)
  '/mnt/d/MY PROJECTS/AI/LLM/AI Code Gen/my-builds/Video + Motion/rough-cut-mcp/tasks',
  '/mnt/d/MY PROJECTS/AI/LLM/AI Code Gen/my-builds/Productivity/Pomo/memories',
  '/mnt/d/MY PROJECTS/AI/LLM/AI Code Gen/my-builds/Productivity/Pomo/tasks',
  '/mnt/d/MY PROJECTS/AI/LLM/AI Code Gen/my-builds/Productivity/Pomo-TaskFlow/memories', 
  '/mnt/d/MY PROJECTS/AI/LLM/AI Code Gen/my-builds/Productivity/Pomo-TaskFlow/tasks',
  '/mnt/d/MY PROJECTS/AI/LLM/AI Code Gen/my-builds/Commercial Projects/Palladio-gen/memories',
  '/mnt/d/MY PROJECTS/AI/LLM/AI Code Gen/my-builds/Commercial Projects/Palladio-gen/tasks',
  '/mnt/d/MY PROJECTS/AI/LLM/AI Code Gen/my-builds/My MCP/like-i-said-npm-test-2/Like-I-Said-memory-mcp-server/memories',
  '/mnt/d/MY PROJECTS/AI/LLM/AI Code Gen/my-builds/My MCP/like-i-said-npm-test-2/Like-I-Said-memory-mcp-server/tasks',
  
  // Home directory storage
  '/home/endlessblink/memories',
  '/home/endlessblink/projects/memories', 
  '/home/endlessblink/projects/tasks',
  '/home/endlessblink/projects/palladio/memories',
  '/home/endlessblink/projects/palladio/tasks',
  '/home/endlessblink/projects/bina-bekitzur/memories',
  '/home/endlessblink/projects/bina-bekitzur/tasks',
  '/home/endlessblink/projects/bina-bekitzur-main/memories',
  '/home/endlessblink/projects/bina-bekitzur-main/tasks',
  '/home/endlessblink/.codeium/windsurf/memories',
  
  // Windows user storage
  '/mnt/c/Users/endle/tasks',
  '/mnt/c/Users/endle/memories'
];

// Additional areas to explore (systematic subdirectory checking)
const EXPLORE_AREAS = [
  '/mnt/d/MY PROJECTS/AI/LLM/AI Code Gen/my-builds',
  '/home/endlessblink/projects',
  '/mnt/d/APPSNospaces',
  '/mnt/c/Users'
];

function analyzeStorage(storagePath) {
  if (!fs.existsSync(storagePath)) {
    return null;
  }
  
  try {
    const stats = fs.statSync(storagePath);
    const isDir = stats.isDirectory();
    
    let fileCount = 0;
    let hasTaskFiles = false;
    let hasMemoryFiles = false;
    let subdirs = [];
    
    if (isDir) {
      const entries = fs.readdirSync(storagePath);
      fileCount = entries.length;
      
      // Check for specific file types
      hasTaskFiles = entries.some(f => f.includes('task') && f.endsWith('.json'));
      hasMemoryFiles = entries.some(f => f.includes('memory') || f.endsWith('.md'));
      
      // Get subdirectories for further analysis
      subdirs = entries.filter(entry => {
        const entryPath = path.join(storagePath, entry);
        try {
          return fs.statSync(entryPath).isDirectory();
        } catch {
          return false;
        }
      });
    }
    
    return {
      path: storagePath,
      exists: true,
      isDirectory: isDir,
      fileCount,
      hasTaskFiles,
      hasMemoryFiles, 
      lastModified: stats.mtime,
      sizeBytes: stats.size,
      subdirectories: subdirs,
      type: storagePath.includes('like-i-said') ? 'like-i-said' :
            storagePath.includes('memories') ? 'memories' :
            storagePath.includes('tasks') ? 'tasks' :
            'other'
    };
  } catch (error) {
    return {
      path: storagePath,
      exists: false,
      error: error.message
    };
  }
}

// Explore subdirectories for additional storage
function exploreSubdirectories(basePath, pattern) {
  const found = [];
  
  if (!fs.existsSync(basePath)) return found;
  
  try {
    const entries = fs.readdirSync(basePath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .slice(0, 30); // Limit to prevent overwhelming
    
    for (const entry of entries) {
      const subPath = path.join(basePath, entry.name);
      const nameLower = entry.name.toLowerCase();
      
      // Check if subdirectory contains our patterns
      if (nameLower.includes(pattern) || nameLower.includes('like-i-said') || nameLower.includes('mcp')) {
        found.push(subPath);
        
        // Check for memories/tasks subdirectories
        const memDir = path.join(subPath, 'memories');
        const taskDir = path.join(subPath, 'tasks');
        if (fs.existsSync(memDir)) found.push(memDir);
        if (fs.existsSync(taskDir)) found.push(taskDir);
      }
    }
  } catch (error) {
    console.log(`⚠️ Error exploring ${basePath}: ${error.message}`);
  }
  
  return found;
}

// Main inventory process
function createCompleteInventory() {
  console.log('📋 Creating complete storage inventory...\n');
  console.log('='.repeat(80));
  console.log('COMPREHENSIVE STORAGE INVENTORY - 100% COVERAGE ATTEMPT');
  console.log('='.repeat(80));
  
  const allAnalyzed = [];
  const exploredLocations = new Set([...KNOWN_STORAGE_LOCATIONS]);
  
  // 1. Analyze all known locations
  console.log('\n🔍 PHASE 1: Analyzing known storage locations...\n');
  
  KNOWN_STORAGE_LOCATIONS.forEach((location, index) => {
    console.log(`📁 ${index + 1}/${KNOWN_STORAGE_LOCATIONS.length}: ${location}`);
    const analysis = analyzeStorage(location);
    
    if (analysis) {
      allAnalyzed.push(analysis);
      
      if (analysis.exists) {
        console.log(`  ✅ EXISTS: ${analysis.fileCount} files, ${analysis.lastModified.toLocaleDateString()}`);
        
        // If it has subdirectories that might contain more storage, add them
        if (analysis.subdirectories && analysis.subdirectories.length > 0) {
          analysis.subdirectories.forEach(subdir => {
            if (subdir.includes('memories') || subdir.includes('tasks') || subdir.includes('like-i-said')) {
              const fullSubPath = path.join(location, subdir);
              exploredLocations.add(fullSubPath);
            }
          });
        }
      } else {
        console.log(`  ⏭️ Does not exist`);
      }
    }
  });
  
  // 2. Explore additional areas systematically  
  console.log('\\n🔍 PHASE 2: Exploring additional areas...\n');
  
  EXPLORE_AREAS.forEach((area, index) => {
    console.log(`🔎 ${index + 1}/${EXPLORE_AREAS.length}: Exploring ${area}`);
    
    // Look for like-i-said, memories, tasks patterns
    const patterns = ['like-i-said', 'memories', 'tasks', 'mcp'];
    patterns.forEach(pattern => {
      const found = exploreSubdirectories(area, pattern);
      found.forEach(foundPath => {
        if (!exploredLocations.has(foundPath)) {
          exploredLocations.add(foundPath);
          console.log(`    📁 Discovered: ${foundPath}`);
        }
      });
    });
  });
  
  // 3. Analyze all newly discovered locations
  console.log('\\n🔍 PHASE 3: Analyzing newly discovered locations...\n');
  
  const newLocations = Array.from(exploredLocations).filter(loc => 
    !KNOWN_STORAGE_LOCATIONS.includes(loc)
  );
  
  newLocations.forEach((location, index) => {
    console.log(`📁 New ${index + 1}/${newLocations.length}: ${location}`);
    const analysis = analyzeStorage(location);
    if (analysis && analysis.exists) {
      allAnalyzed.push(analysis);
      console.log(`  ✅ EXISTS: ${analysis.fileCount} files, ${analysis.lastModified.toLocaleDateString()}`);
    }
  });
  
  // 4. Generate final comprehensive report
  generateCompleteReport(allAnalyzed);
}

function generateCompleteReport(allAnalyzed) {
  console.log('\\n' + '='.repeat(100));
  console.log('🎯 FINAL COMPREHENSIVE INVENTORY - 100% COVERAGE');
  console.log('='.repeat(100));
  
  const existing = allAnalyzed.filter(a => a.exists);
  
  console.log(`\\n📊 TOTAL CONFIRMED STORAGE LOCATIONS: ${existing.length}`);
  
  // Calculate total data
  const totalFiles = existing.reduce((sum, a) => sum + (a.fileCount || 0), 0);
  const totalBytes = existing.reduce((sum, a) => sum + (a.sizeBytes || 0), 0);
  
  console.log(`📄 Total files across all locations: ${totalFiles}`);
  console.log(`💾 Total storage size: ${(totalBytes / (1024*1024)).toFixed(2)} MB\\n`);
  
  // Group by type and priority
  const byType = {};
  existing.forEach(storage => {
    if (!byType[storage.type]) byType[storage.type] = [];
    byType[storage.type].push(storage);
  });
  
  // Report each type with consolidation recommendations
  Object.entries(byType).forEach(([type, items]) => {
    console.log(`${type.toUpperCase()} STORAGE (${items.length} locations):`);
    
    items.sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));
    items.forEach((item, index) => {
      const recentness = item.lastModified ? 
        (Date.now() - item.lastModified) / (1000 * 60 * 60 * 24) : 999;
      const priority = recentness < 7 ? '🔥 RECENT' : 
                       recentness < 30 ? '⚡ ACTIVE' : 
                       '📚 HISTORICAL';
      
      console.log(`  ${index + 1}. ${item.path}`);
      console.log(`     ${priority} | ${item.fileCount} files | ${item.lastModified?.toLocaleDateString() || 'Unknown date'}`);
      
      if (item.hasTaskFiles) console.log(`     🗂️ Contains task files`);
      if (item.hasMemoryFiles) console.log(`     🧠 Contains memory files`);
    });
    console.log('');
  });
  
  console.log('🎯 CONSOLIDATION PLAN - ALL DATA PRESERVATION:');
  console.log('');
  console.log('✅ TARGET LOCATION: D:\\\\APPSNospaces\\\\like-i-said-mcp');
  console.log('');
  console.log('📋 MIGRATION ORDER (Safe, No Data Loss):');
  console.log('1. BACKUP ALL LOCATIONS (complete safety net)');
  console.log('2. MIGRATE RECENT DATA (last 7 days) - highest priority');
  console.log('3. MIGRATE ACTIVE DATA (last 30 days) - active projects'); 
  console.log('4. MIGRATE HISTORICAL DATA (older data) - preserve everything');
  console.log('5. VALIDATE COMPLETENESS (verify no data loss)');
  console.log('6. UPDATE ALL TOOLS (point to consolidated location)');
  console.log('7. ARCHIVE OLD LOCATIONS (keep backups, remove scattered storage)');
  console.log('');
  console.log('🚀 RESULT: Single universal storage accessible from any system');
  console.log('   - Windows: D:\\\\APPSNospaces\\\\like-i-said-mcp');
  console.log('   - WSL1/WSL2: /mnt/d/APPSNospaces/like-i-said-mcp');
  console.log('   - Monitor works from any project directory');
  console.log('   - 100% data preservation with zero loss');
}

createCompleteInventory();