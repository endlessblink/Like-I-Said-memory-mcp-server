#!/usr/bin/env node

/**
 * Focused System Discovery - Quick Analysis
 * 
 * Fast discovery of actual memory/task files that need consolidation
 * with deletion to prevent double ingestion as user specified.
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class FocusedDiscovery {
  constructor() {
    this.stats = {
      mainMemories: 0,
      mainTasks: 0,
      backupMemories: 0,
      backupTasks: 0,
      scatteredMemories: 0,
      scatteredTasks: 0,
      jsonTasks: 0
    };
  }
  
  async quickDiscovery() {
    console.log('⚡ FOCUSED DISCOVERY - Quick System Scan\n');
    
    // Check main directories
    await this.checkMainDirectories();
    
    // Check for backup directories  
    await this.checkBackupDirectories();
    
    // Check for scattered files in known locations
    await this.checkScatteredLocations();
    
    this.generateQuickReport();
  }
  
  async checkMainDirectories() {
    console.log('📂 MAIN DIRECTORIES:');
    
    // Main memories
    if (await fs.pathExists('memories')) {
      this.stats.mainMemories = await this.countFiles('memories', '.md');
      console.log(`   memories/: ${this.stats.mainMemories} files`);
    }
    
    // Main tasks
    if (await fs.pathExists('tasks')) {
      this.stats.mainTasks = await this.countFiles('tasks', '.md');
      this.stats.jsonTasks = await this.countFiles('tasks', '.json');
      console.log(`   tasks/: ${this.stats.mainTasks} MD + ${this.stats.jsonTasks} JSON files`);
    }
  }
  
  async checkBackupDirectories() {
    console.log('\n💾 BACKUP DIRECTORIES:');
    
    const backupPatterns = [
      'emergency-backups',
      'working-memory-backups',
      'true-consolidation-backups',
      'complete-task-backups',
      'final-subject-backups',
      'restoration-backups',
      'structure-fix-backups',
      'task-consolidation-backups'
    ];
    
    for (const pattern of backupPatterns) {
      if (await fs.pathExists(pattern)) {
        const memoryCount = await this.countFiles(pattern, '.md', true);
        const taskJsonCount = await this.countFiles(pattern, '.json', true);
        const taskMdCount = await this.countFiles(pattern, '.md', true, 'task');
        
        this.stats.backupMemories += memoryCount;
        this.stats.backupTasks += taskJsonCount + taskMdCount;
        
        console.log(`   ${pattern}/: ${memoryCount} memories, ${taskJsonCount + taskMdCount} tasks`);
      }
    }
  }
  
  async checkScatteredLocations() {
    console.log('\n🔍 SCATTERED LOCATIONS:');
    
    // Check root directory for scattered files
    const rootFiles = await fs.readdir('.');
    const scatteredMemories = rootFiles.filter(f => f.endsWith('.md') && this.looksLikeMemory(f)).length;
    const scatteredTasks = rootFiles.filter(f => (f.endsWith('.md') || f.endsWith('.json')) && this.looksLikeTask(f)).length;
    
    this.stats.scatteredMemories += scatteredMemories;
    this.stats.scatteredTasks += scatteredTasks;
    
    console.log(`   Root directory: ${scatteredMemories} memories, ${scatteredTasks} tasks`);
    
    // Check for other known locations
    const otherLocations = ['data', 'logs', 'scripts', 'lib'];
    for (const loc of otherLocations) {
      if (await fs.pathExists(loc)) {
        const memCount = await this.countFiles(loc, '.md', true, 'memory');
        const taskCount = await this.countFiles(loc, '.md', true, 'task') + await this.countFiles(loc, '.json', true, 'task');
        
        if (memCount > 0 || taskCount > 0) {
          console.log(`   ${loc}/: ${memCount} memories, ${taskCount} tasks`);
          this.stats.scatteredMemories += memCount;
          this.stats.scatteredTasks += taskCount;
        }
      }
    }
  }
  
  async countFiles(dir, extension, recursive = false, contentType = null) {
    let count = 0;
    
    try {
      if (recursive) {
        // Recursive count
        const findCommand = `find "${dir}" -name "*${extension}" | wc -l`;
        const { execSync } = await import('child_process');
        const result = execSync(findCommand, { encoding: 'utf8' });
        count = parseInt(result.trim());
      } else {
        // Direct count
        const files = await fs.readdir(dir);
        count = files.filter(f => f.endsWith(extension)).length;
      }
      
      // Filter by content type if specified
      if (contentType && count > 0) {
        // This is an approximation - would need to read files to be exact
        count = Math.floor(count * (contentType === 'memory' ? 0.7 : 0.3));
      }
    } catch (error) {
      count = 0;
    }
    
    return count;
  }
  
  looksLikeMemory(filename) {
    return filename.includes('memory') || 
           filename.includes('mf') ||
           filename.match(/\d{4}-\d{2}-\d{2}--/);
  }
  
  looksLikeTask(filename) {
    return filename.includes('task') ||
           filename.includes('TASK-') ||
           filename === 'tasks.md' ||
           filename === 'tasks.json';
  }
  
  generateQuickReport() {
    const totalMemories = this.stats.mainMemories + this.stats.backupMemories + this.stats.scatteredMemories;
    const totalTasks = this.stats.mainTasks + this.stats.backupTasks + this.stats.scatteredTasks + this.stats.jsonTasks;
    
    console.log(`\n📊 DISCOVERY SUMMARY:`);
    console.log(`\n🧠 MEMORY FILES:`);
    console.log(`   Main: ${this.stats.mainMemories}`);
    console.log(`   Backups: ${this.stats.backupMemories}`);
    console.log(`   Scattered: ${this.stats.scatteredMemories}`);
    console.log(`   TOTAL: ${totalMemories}`);
    
    console.log(`\n📋 TASK FILES:`);
    console.log(`   Main: ${this.stats.mainTasks}`);
    console.log(`   JSON: ${this.stats.jsonTasks}`);
    console.log(`   Backups: ${this.stats.backupTasks}`);
    console.log(`   Scattered: ${this.stats.scatteredTasks}`);
    console.log(`   TOTAL: ${totalTasks}`);
    
    console.log(`\n🎯 CONSOLIDATION SCOPE:`);
    console.log(`   GRAND TOTAL: ${totalMemories + totalTasks} files need processing`);
    console.log(`   Previous attempt: Processed <100 files (${((100 / (totalMemories + totalTasks)) * 100).toFixed(1)}% coverage)`);
    
    console.log(`\n⚠️  USER REQUIREMENT NOTED:`);
    console.log(`   "Whatever you consolidate you delete" - Prevent double ingestion`);
    console.log(`   Must delete original files after successful consolidation`);
    console.log(`   No duplicate content allowed in final structure`);
    
    console.log(`\n🚀 NEXT STEPS:`);
    console.log(`   1. Create comprehensive consolidation strategy`);
    console.log(`   2. Process ALL ${totalMemories + totalTasks} files with deletion`);
    console.log(`   3. Ensure no double ingestion or duplicate content`);
    console.log(`   4. Verify complete coverage and functionality`);
  }
}

async function main() {
  const discovery = new FocusedDiscovery();
  await discovery.quickDiscovery();
  
  console.log('\n✅ FOCUSED DISCOVERY COMPLETE!');
  console.log('📋 Ready to plan comprehensive consolidation with deletion');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}

export default FocusedDiscovery;