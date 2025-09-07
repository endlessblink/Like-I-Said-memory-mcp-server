#!/usr/bin/env node

/**
 * Phase 4: Migrate Historical Data
 * 
 * Final phase - migrate remaining historical data from home directories,
 * Windows storage, and any remaining scattered locations.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Phase 4: Historical and remaining data
const HISTORICAL_LOCATIONS = [
  // Home directory storage
  {
    source: '/home/endlessblink/projects/bina-bekitzur/memories',
    target: 'bina-bekitzur',
    type: 'memories'
  },
  {
    source: '/home/endlessblink/projects/bina-bekitzur/tasks',
    target: 'bina-bekitzur',
    type: 'tasks'
  },
  {
    source: '/home/endlessblink/projects/bina-bekitzur-main/memories',
    target: 'bina-bekitzur-main', 
    type: 'memories'
  },
  {
    source: '/home/endlessblink/projects/bina-bekitzur-main/tasks',
    target: 'bina-bekitzur-main',
    type: 'tasks'
  },
  
  // IDE storage
  {
    source: '/home/endlessblink/.codeium/windsurf/memories',
    target: 'windsurf-ide',
    type: 'memories'
  },
  
  // Individual memory files
  {
    source: '/home/endlessblink/memories',
    target: 'user-home',
    type: 'memories'
  },
  {
    source: '/mnt/c/Users/endle/memories',
    target: 'windows-user',
    type: 'memories'
  }
];

function migrateHistoricalData(location) {
  console.log(`\\n📂 ${location.target} (${location.type})`);
  console.log(`  📁 Source: ${location.source}`);
  
  if (!fs.existsSync(location.source)) {
    console.log(`  ⏭️ Source not found`);
    return { migrated: 0, errors: [] };
  }
  
  const targetDir = location.type === 'memories' ?
    path.join(__dirname, 'memories', location.target) :
    path.join(__dirname, 'tasks', location.target);
  
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
    console.log(`  📁 Created: ${targetDir}`);
  }
  
  const results = { migrated: 0, errors: [], details: [] };
  
  try {
    if (location.type === 'memories') {
      // Migrate memory files
      const memoryFiles = fs.readdirSync(location.source).filter(f => f.endsWith('.md'));
      
      for (const memFile of memoryFiles) {
        const sourcePath = path.join(location.source, memFile);
        const targetPath = path.join(targetDir, memFile);
        
        try {
          if (fs.existsSync(targetPath)) {
            // Keep newer version
            const sourceStats = fs.statSync(sourcePath);
            const targetStats = fs.statSync(targetPath);
            
            if (sourceStats.mtime > targetStats.mtime) {
              fs.copyFileSync(sourcePath, targetPath);
              results.details.push(`🔄 Updated: ${memFile}`);
            } else {
              results.details.push(`⏭️ Kept: ${memFile}`);
            }
          } else {
            fs.copyFileSync(sourcePath, targetPath);
            results.details.push(`➕ Added: ${memFile}`);
          }
          results.migrated++;
        } catch (error) {
          results.errors.push(`${memFile}: ${error.message}`);
        }
      }
    } else {
      // Migrate task files
      const tasksJson = path.join(location.source, 'tasks.json');
      if (fs.existsSync(tasksJson)) {
        const targetJson = path.join(targetDir, 'tasks.json');
        
        const sourceData = JSON.parse(fs.readFileSync(tasksJson, 'utf8'));
        const sourceTasks = Array.isArray(sourceData) ? sourceData : [sourceData];
        
        // Merge with existing
        let existingTasks = [];
        if (fs.existsSync(targetJson)) {
          const existingData = JSON.parse(fs.readFileSync(targetJson, 'utf8'));
          existingTasks = Array.isArray(existingData) ? existingData : [existingData];
        }
        
        const existingIds = new Set(existingTasks.map(t => t.id));
        const mergedTasks = [...existingTasks];
        
        sourceTasks.forEach(sourceTask => {
          if (!existingIds.has(sourceTask.id)) {
            mergedTasks.push(sourceTask);
            results.details.push(`➕ Task: ${sourceTask.id}`);
          }
        });
        
        fs.writeFileSync(targetJson, JSON.stringify(mergedTasks, null, 2));
        results.migrated += sourceTasks.length;
      }
    }
    
    console.log(`  ✅ ${results.migrated} items`);
    if (results.details.length > 0) {
      console.log(`  📋 First few: ${results.details.slice(0, 3).join(', ')}`);
    }
    
  } catch (error) {
    results.errors.push(`Migration error: ${error.message}`);
    console.log(`  ❌ Error: ${error.message}`);
  }
  
  return results;
}

// Execute Phase 4
async function runHistoricalMigration() {
  console.log('🚀 Phase 4: Migrating Historical Data');
  console.log(`📊 Migrating ${HISTORICAL_LOCATIONS.length} historical storage locations\\n`);
  
  let totalMigrated = 0;
  let totalErrors = [];
  
  for (const [index, location] of HISTORICAL_LOCATIONS.entries()) {
    console.log(`📦 ${index + 1}/${HISTORICAL_LOCATIONS.length}:`);
    
    const results = migrateHistoricalData(location);
    
    totalMigrated += results.migrated;
    totalErrors.push(...results.errors);
  }
  
  console.log('\\n' + '='.repeat(70));
  console.log('📊 PHASE 4 MIGRATION SUMMARY');  
  console.log('='.repeat(70));
  console.log(`✅ Successfully migrated: ${totalMigrated} items`);
  console.log(`❌ Errors encountered: ${totalErrors.length}`);
  console.log('\\n🎯 Phase 4 Complete - Historical data consolidated');
  console.log('\\n🎉 ALL PHASES COMPLETE - Ready for validation and testing!');
}

runHistoricalMigration();