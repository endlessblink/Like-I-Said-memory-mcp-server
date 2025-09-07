#!/usr/bin/env node

/**
 * Focused Storage Discovery
 * Build comprehensive inventory using known patterns and manageable chunks
 */

import fs from 'fs';
import path from 'path';

// Known project areas (manageable search)
const PROJECT_AREAS = [
  '/mnt/d/APPSNospaces',
  '/mnt/d/MY PROJECTS',
  '/mnt/d/shared',
  '/home/endlessblink',
  '/mnt/c/Users'
];

// Results
const foundStorage = new Map(); // path -> info

function scanDirectoryChunk(dirPath, maxItems = 50) {
  if (!fs.existsSync(dirPath)) return [];
  
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .slice(0, maxItems); // Prevent overwhelming
    
    const results = [];
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const nameLower = entry.name.toLowerCase();
      
      // Check if this is storage we care about
      const isLikeISaid = nameLower.includes('like-i-said');
      const isMemoryStorage = nameLower.includes('memories') || nameLower.includes('memory');
      const isTaskStorage = nameLower.includes('tasks') || nameLower.includes('task');
      const isMCPStorage = nameLower.includes('mcp');
      const isProjectStorage = nameLower.includes('project');
      
      if (isLikeISaid || isMemoryStorage || isTaskStorage || isMCPStorage) {
        try {
          const stats = fs.statSync(fullPath);
          const fileCount = fs.readdirSync(fullPath).length;
          
          results.push({
            path: fullPath,
            type: isLikeISaid ? 'like-i-said-installation' :
                  isMemoryStorage ? 'memories' :
                  isTaskStorage ? 'tasks' : 
                  isMCPStorage ? 'mcp-related' : 'other',
            fileCount,
            lastModified: stats.mtime,
            sizeBytes: stats.size
          });
          
        } catch (error) {
          results.push({
            path: fullPath,
            type: 'error',
            error: error.message
          });
        }
      }
      
      // Also scan promising subdirectories recursively (but limited depth)
      if ((isLikeISaid || isProjectStorage || nameLower.includes('ai') || nameLower.includes('builds')) && entry.name.length < 50) {
        const subResults = scanDirectoryChunk(fullPath, 30);
        results.push(...subResults);
      }
    }
    
    return results;
  } catch (error) {
    return [{ path: dirPath, type: 'scan-error', error: error.message }];
  }
}

// Main discovery process
function discoverAll() {
  console.log('🔍 Starting focused comprehensive discovery...\n');
  
  for (const area of PROJECT_AREAS) {
    console.log(`📂 Scanning: ${area}`);
    
    if (!fs.existsSync(area)) {
      console.log(`  ⏭️ Not accessible\n`);
      continue;
    }
    
    const results = scanDirectoryChunk(area);
    
    results.forEach(result => {
      const key = result.path;
      foundStorage.set(key, result);
      
      if (result.type === 'error' || result.type === 'scan-error') {
        console.log(`  ⚠️ ${result.path}: ${result.error}`);
      } else {
        console.log(`  ✅ ${result.type}: ${result.path} (${result.fileCount} files)`);
      }
    });
    
    console.log(`  📊 Found ${results.length} storage locations in ${area}\n`);
  }
  
  generateReport();
}

function generateReport() {
  console.log('='.repeat(80));
  console.log('🎯 COMPLETE STORAGE DISCOVERY REPORT');
  console.log('='.repeat(80));
  
  const allStorage = Array.from(foundStorage.values()).filter(s => s.type !== 'error');
  
  console.log(`\n📊 TOTAL STORAGE LOCATIONS: ${allStorage.length}\n`);
  
  // Group by type
  const byType = {};
  allStorage.forEach(storage => {
    if (!byType[storage.type]) byType[storage.type] = [];
    byType[storage.type].push(storage);
  });
  
  // Report each type
  Object.entries(byType).forEach(([type, items]) => {
    console.log(`${type.toUpperCase()} (${items.length} locations):`);
    
    // Sort by most recent
    items.sort((a, b) => (b.lastModified || 0) - (a.lastModified || 0));
    
    items.slice(0, 20).forEach((item, index) => {
      const lastMod = item.lastModified ? item.lastModified.toLocaleDateString() : 'Unknown';
      console.log(`  ${index + 1}. ${item.path}`);
      console.log(`     Files: ${item.fileCount}, Modified: ${lastMod}`);
    });
    
    if (items.length > 20) {
      console.log(`     ... and ${items.length - 20} more ${type} locations`);
    }
    console.log('');
  });
  
  // Priority analysis
  console.log('🎯 CONSOLIDATION PRIORITIES:\n');
  
  const recent = allStorage.filter(s => {
    if (!s.lastModified) return false;
    const days = (Date.now() - s.lastModified) / (1000 * 60 * 60 * 24);
    return days < 7;
  });
  
  const active = allStorage.filter(s => {
    if (!s.lastModified) return false; 
    const days = (Date.now() - s.lastModified) / (1000 * 60 * 60 * 24);
    return days < 30 && s.fileCount > 0;
  });
  
  console.log(`RECENT (< 7 days): ${recent.length} locations`);
  recent.slice(0, 10).forEach((item, index) => {
    console.log(`  ${index + 1}. ${item.path} (${item.fileCount} files)`);
  });
  
  console.log(`\nACTIVE (< 30 days, has files): ${active.length} locations`);
  active.slice(0, 15).forEach((item, index) => {
    console.log(`  ${index + 1}. ${item.path} (${item.fileCount} files)`);
  });
  
  console.log(`\nHISTORICAL: ${allStorage.length - active.length} locations`);
  console.log('\n✅ Discovery complete - ready for comprehensive consolidation planning');
}

discoverAll();