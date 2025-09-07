#!/usr/bin/env node

/**
 * Restore Flat Structure - Emergency MCP Compatibility Fix
 * 
 * Flattens the broken nested directory mess back to proper MCP structure:
 * - memories/project/file.md (depth 2)
 * - tasks/project/file.md (depth 2)
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class StructureRestorer {
  constructor() {
    this.memoriesDir = 'memories';
    this.tasksDir = 'tasks';
    this.stats = {
      memoriesRestored: 0,
      tasksRestored: 0,
      directoriesRemoved: 0,
      errors: []
    };
    this.dryRun = false;
  }
  
  async restoreStructure(dryRun = false) {
    this.dryRun = dryRun;
    
    console.log(`🚨 EMERGENCY STRUCTURE RESTORATION ${dryRun ? '(DRY RUN)' : '(LIVE)'}`);
    console.log('🎯 Target: Restore proper MCP flat structure\n');
    
    // Create restoration backup
    if (!dryRun) {
      await this.createRestorationBackup();
    }
    
    // Restore memories directory
    console.log('📁 RESTORING MEMORIES STRUCTURE...');
    await this.restoreDirectory(this.memoriesDir, 'memory');
    
    // Restore tasks directory
    console.log('\n📁 RESTORING TASKS STRUCTURE...');
    await this.restoreDirectory(this.tasksDir, 'task');
    
    // Clean up empty directories
    console.log('\n🧹 CLEANING UP EMPTY DIRECTORIES...');
    await this.removeEmptyDirectories(this.memoriesDir);
    await this.removeEmptyDirectories(this.tasksDir);
    
    await this.generateRestorationReport();
  }
  
  async createRestorationBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = `restoration-backups/pre_flattening_${timestamp}`;
    
    console.log(`📦 Creating restoration backup: ${backupDir}`);
    
    await fs.ensureDir(backupDir);
    
    if (await fs.pathExists(this.memoriesDir)) {
      await fs.copy(this.memoriesDir, path.join(backupDir, 'memories'));
    }
    
    if (await fs.pathExists(this.tasksDir)) {
      await fs.copy(this.tasksDir, path.join(backupDir, 'tasks'));
    }
    
    console.log('✅ Restoration backup complete\n');
  }
  
  async restoreDirectory(baseDir, fileType) {
    if (!await fs.pathExists(baseDir)) {
      console.log(`⚠️  Directory not found: ${baseDir}`);
      return;
    }
    
    // Find all files that need to be moved
    const filesToRestore = await this.findBrokenFiles(baseDir, fileType);
    
    console.log(`📊 Found ${filesToRestore.length} ${fileType} files to restore`);
    
    for (const fileInfo of filesToRestore) {
      await this.restoreFile(fileInfo, baseDir, fileType);
    }
    
    console.log(`✅ Restored ${fileType === 'memory' ? this.stats.memoriesRestored : this.stats.tasksRestored} ${fileType} files`);
  }
  
  async findBrokenFiles(baseDir, fileType) {
    const brokenFiles = [];
    const extensions = fileType === 'memory' ? ['.md'] : ['.md', '.json'];
    
    const traverse = async (currentPath, depth = 0) => {
      try {
        const entries = await fs.readdir(currentPath);
        
        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry);
          const stat = await fs.stat(fullPath);
          
          if (stat.isDirectory()) {
            await traverse(fullPath, depth + 1);
          } else if (stat.isFile()) {
            const ext = path.extname(entry);
            
            if (extensions.includes(ext)) {
              const relativeToBase = path.relative(baseDir, fullPath);
              const pathDepth = relativeToBase.split(path.sep).length;
              
              // MCP expects exactly depth 2: baseDir/project/file.ext
              if (pathDepth !== 2) {
                const projectName = this.extractProjectName(fullPath, baseDir);
                const targetPath = path.join(baseDir, projectName, entry);
                
                brokenFiles.push({
                  source: fullPath,
                  target: targetPath,
                  projectName,
                  filename: entry,
                  currentDepth: pathDepth,
                  type: fileType
                });
              }
            }
          }
        }
      } catch (error) {
        this.stats.errors.push({
          path: currentPath,
          error: error.message,
          action: 'traversing'
        });
      }
    };
    
    await traverse(baseDir);
    return brokenFiles;
  }
  
  extractProjectName(filePath, baseDir) {
    const relativePath = path.relative(baseDir, filePath);
    const parts = relativePath.split(path.sep);
    
    // Strategy: Use the most meaningful directory name as project name
    // Skip generic names like 'pre-true-consolidation-backup'
    const genericNames = ['backup', 'pre-true-consolidation-backup', 'final-cleanup-backup', 'archived'];
    
    for (const part of parts) {
      if (!genericNames.includes(part) && part !== path.basename(filePath)) {
        return this.sanitizeProjectName(part);
      }
    }
    
    // Fallback: use first directory name
    return this.sanitizeProjectName(parts[0] || 'unknown');
  }
  
  sanitizeProjectName(name) {
    // Clean up project names for consistency
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  
  async restoreFile(fileInfo, baseDir, fileType) {
    const { source, target, projectName, filename } = fileInfo;
    
    try {
      // Ensure target directory exists
      const targetDir = path.dirname(target);
      if (!this.dryRun) {
        await fs.ensureDir(targetDir);
      }
      
      // Handle filename conflicts
      let finalTarget = target;
      if (!this.dryRun && await fs.pathExists(target)) {
        finalTarget = await this.resolveNameConflict(target);
      }
      
      console.log(`📁 ${projectName}/${filename}`);
      console.log(`   ${source} → ${finalTarget}`);
      
      if (!this.dryRun) {
        await fs.move(source, finalTarget, { overwrite: false });
      }
      
      if (fileType === 'memory') {
        this.stats.memoriesRestored++;
      } else {
        this.stats.tasksRestored++;
      }
      
    } catch (error) {
      this.stats.errors.push({
        source,
        target,
        error: error.message,
        action: 'moving file'
      });
      
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  async resolveNameConflict(targetPath) {
    const dir = path.dirname(targetPath);
    const name = path.basename(targetPath, path.extname(targetPath));
    const ext = path.extname(targetPath);
    
    let counter = 1;
    let newPath;
    
    do {
      newPath = path.join(dir, `${name}-${counter}${ext}`);
      counter++;
    } while (await fs.pathExists(newPath) && counter < 100);
    
    return newPath;
  }
  
  async removeEmptyDirectories(baseDir) {
    const emptyDirs = [];
    
    const findEmpty = async (dirPath) => {
      try {
        const entries = await fs.readdir(dirPath);
        let hasFiles = false;
        
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry);
          const stat = await fs.stat(fullPath);
          
          if (stat.isDirectory()) {
            await findEmpty(fullPath);
            
            // Check if directory is empty after recursive cleanup
            const subEntries = await fs.readdir(fullPath);
            if (subEntries.length === 0) {
              emptyDirs.push(fullPath);
            } else {
              hasFiles = true;
            }
          } else {
            hasFiles = true;
          }
        }
        
        // Don't remove base directories
        if (!hasFiles && dirPath !== baseDir && !path.basename(dirPath).startsWith('.')) {
          emptyDirs.push(dirPath);
        }
      } catch (error) {
        // Skip unreadable directories
      }
    };
    
    await findEmpty(baseDir);
    
    console.log(`📊 Found ${emptyDirs.length} empty directories to remove`);
    
    for (const emptyDir of emptyDirs) {
      try {
        console.log(`🗑️  Removing: ${emptyDir}`);
        if (!this.dryRun) {
          await fs.remove(emptyDir);
          this.stats.directoriesRemoved++;
        }
      } catch (error) {
        this.stats.errors.push({
          path: emptyDir,
          error: error.message,
          action: 'removing empty directory'
        });
      }
    }
  }
  
  async generateRestorationReport() {
    const timestamp = new Date().toISOString();
    
    const report = `# 🚨 STRUCTURE RESTORATION REPORT

**Generated:** ${timestamp}
**Operation:** ${this.dryRun ? 'DRY RUN' : 'LIVE RESTORATION'}

## 📊 RESTORATION RESULTS

### Files Restored:
- **Memory files:** ${this.stats.memoriesRestored}
- **Task files:** ${this.stats.tasksRestored}
- **Total files:** ${this.stats.memoriesRestored + this.stats.tasksRestored}

### Cleanup:
- **Empty directories removed:** ${this.stats.directoriesRemoved}
- **Errors encountered:** ${this.stats.errors.length}

## 🎯 EXPECTED STRUCTURE ACHIEVED

All files should now be at proper MCP depth:
- \`memories/project-name/file.md\` ✅
- \`tasks/project-name/file.md\` ✅

## ${this.stats.errors.length > 0 ? '⚠️ ERRORS ENCOUNTERED' : '✅ NO ERRORS'}

${this.stats.errors.length > 0 ? 
  this.stats.errors.slice(0, 10).map(error => 
    `- **${error.action}**: \`${error.source || error.path}\`
  - Error: ${error.error}`
  ).join('\n\n') : 'All operations completed successfully!'}

${this.stats.errors.length > 10 ? `\n... and ${this.stats.errors.length - 10} more errors` : ''}

## 🚀 NEXT STEPS

1. **Verify MCP tools work** - Test memory/task loading
2. **Test dashboard** - Ensure all projects display
3. **Implement true consolidation** - Merge file contents
4. **Clean up any remaining issues**

---
**Structure restoration ${this.dryRun ? 'simulation' : 'phase'} complete!**
`;

    const reportPath = `structure-restoration-report${this.dryRun ? '-dry-run' : ''}.md`;
    await fs.writeFile(reportPath, report);
    
    console.log(`\n📋 Restoration report: ${reportPath}`);
    console.log(`📊 Restored ${this.stats.memoriesRestored + this.stats.tasksRestored} files`);
    console.log(`🧹 Removed ${this.stats.directoriesRemoved} empty directories`);
    
    if (this.stats.errors.length > 0) {
      console.log(`⚠️  ${this.stats.errors.length} errors encountered (see report)`);
    } else {
      console.log('✅ No errors - restoration successful!');
    }
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const restorer = new StructureRestorer();
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No files will be moved');
  } else {
    console.log('⚠️  LIVE MODE - Files will be moved');
  }
  
  await restorer.restoreStructure(dryRun);
  
  console.log('\n🎉 STRUCTURE RESTORATION COMPLETE!');
  
  if (dryRun) {
    console.log('🔄 To run for real: node restore-flat-structure.js');
  } else {
    console.log('🚀 Ready for true content consolidation phase!');
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}

export default StructureRestorer;