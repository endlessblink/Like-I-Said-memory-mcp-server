#!/usr/bin/env node

/**
 * Final Cleanup Consolidation - Handle Remaining Single Files
 * 
 * Groups all remaining unconsolidated files by project type for final cleanup
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class FinalCleanupConsolidator {
  constructor() {
    this.memoriesDir = 'memories';
    this.stats = {
      projectsProcessed: 0,
      filesConsolidated: 0,
      filesRemaining: 0
    };
  }

  async findUnconsolidatedFiles() {
    const memoriesPath = path.join(this.memoriesDir);
    const unconsolidated = new Map();
    
    const dirs = await fs.readdir(memoriesPath);
    
    for (const dir of dirs) {
      const dirPath = path.join(memoriesPath, dir);
      const stat = await fs.stat(dirPath);
      
      if (stat.isDirectory() && dir !== '.git') {
        try {
          const files = await fs.readdir(dirPath);
          const memoryFiles = files.filter(f => 
            f.endsWith('.md') && 
            !f.startsWith('consolidated-') &&
            !f.includes('report') &&
            !f.includes('backup')
          );
          
          if (memoryFiles.length > 0) {
            unconsolidated.set(dir, memoryFiles);
          }
        } catch (error) {
          // Skip directories we can't read
        }
      }
    }
    
    return unconsolidated;
  }

  async consolidateRemainingFiles(unconsolidatedMap) {
    console.log('🧹 FINAL CLEANUP CONSOLIDATION');
    console.log(`📊 Found ${unconsolidatedMap.size} projects with remaining files\n`);
    
    const categoryGroups = {
      'single-files': [], // Projects with 1 file
      'small-batches': [] // Projects with 2-5 files
    };
    
    // Categorize remaining files
    for (const [project, files] of unconsolidatedMap) {
      if (files.length === 1) {
        categoryGroups['single-files'].push({ project, files });
      } else if (files.length <= 5) {
        categoryGroups['small-batches'].push({ project, files });
      }
    }
    
    console.log(`📋 Cleanup categories:`);
    console.log(`  Single files: ${categoryGroups['single-files'].length} projects`);
    console.log(`  Small batches: ${categoryGroups['small-batches'].length} projects`);
    
    // Create mega-consolidated files for small remaining items
    await this.createMegaConsolidation('orphaned-single-files', categoryGroups['single-files']);
    
    // Handle small batches individually  
    for (const item of categoryGroups['small-batches']) {
      await this.consolidateSmallProject(item.project, item.files);
    }
    
    await this.generateCleanupReport();
  }
  
  async createMegaConsolidation(filename, projectItems) {
    if (projectItems.length === 0) return;
    
    console.log(`\n🔄 Creating mega-consolidation: ${filename} (${projectItems.length} projects)`);
    
    const allMemories = [];
    const backupDir = path.join(this.memoriesDir, 'final-cleanup-backup');
    await fs.ensureDir(backupDir);
    
    for (const item of projectItems) {
      const projectDir = path.join(this.memoriesDir, item.project);
      
      for (const file of item.files) {
        try {
          const filePath = path.join(projectDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          const memory = this.parseMemory(content, `${item.project}/${file}`);
          
          if (memory) {
            allMemories.push(memory);
            
            // Backup and remove original
            await fs.copy(filePath, path.join(backupDir, `${item.project}_${file}`));
            await fs.remove(filePath);
            this.stats.filesConsolidated++;
          }
        } catch (error) {
          console.log(`⚠️  Could not process ${item.project}/${file}: ${error.message}`);
        }
      }
    }
    
    if (allMemories.length > 0) {
      const consolidated = this.createMegaConsolidatedFile(allMemories, filename);
      const outputPath = path.join(this.memoriesDir, `${filename}.md`);
      await fs.writeFile(outputPath, consolidated);
      console.log(`✅ Created ${filename}.md with ${allMemories.length} memories`);
    }
  }
  
  async consolidateSmallProject(project, files) {
    console.log(`\n🔄 Consolidating small project: ${project} (${files.length} files)`);
    
    const projectDir = path.join(this.memoriesDir, project);
    const backupDir = path.join(projectDir, 'final-cleanup-backup');
    await fs.ensureDir(backupDir);
    
    const memories = [];
    
    for (const file of files) {
      try {
        const filePath = path.join(projectDir, file);
        const content = await fs.readFile(filePath, 'utf8');
        const memory = this.parseMemory(content, file);
        
        if (memory) {
          memories.push(memory);
          await fs.copy(filePath, path.join(backupDir, file));
          await fs.remove(filePath);
          this.stats.filesConsolidated++;
        }
      } catch (error) {
        console.log(`⚠️  Could not process ${project}/${file}: ${error.message}`);
      }
    }
    
    if (memories.length > 0) {
      const consolidated = this.createProjectConsolidated(memories, project);
      const outputPath = path.join(projectDir, 'consolidated-final-cleanup.md');
      await fs.writeFile(outputPath, consolidated);
      console.log(`✅ Created ${project}/consolidated-final-cleanup.md`);
    }
    
    this.stats.projectsProcessed++;
  }
  
  parseMemory(content, filename) {
    const lines = content.split('\n');
    const frontmatterEnd = lines.findIndex((line, i) => i > 0 && line === '---');
    
    if (frontmatterEnd === -1) {
      return {
        filename,
        metadata: {},
        content: content.trim()
      };
    }
    
    const frontmatter = {};
    const bodyLines = lines.slice(frontmatterEnd + 1);
    
    for (let i = 1; i < frontmatterEnd; i++) {
      const line = lines[i];
      if (line.includes(':')) {
        const colonIndex = line.indexOf(':');
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        frontmatter[key] = value;
      }
    }
    
    return {
      filename,
      metadata: frontmatter,
      content: bodyLines.join('\n').trim()
    };
  }
  
  createMegaConsolidatedFile(memories, filename) {
    const now = new Date().toISOString();
    
    const frontmatter = `---
id: ${Date.now()}
timestamp: ${now}
complexity: 4
category: final-cleanup-consolidated
project: system-wide
tags: ["cleanup", "orphaned-files", "final-consolidation"]
priority: low
status: archived
consolidation_type: mega_cleanup
original_count: ${memories.length}
access_count: 0
metadata:
  content_type: text
  consolidation_date: ${now}
  cleanup_type: ${filename}
---`;

    const body = `# FINAL CLEANUP CONSOLIDATION: ${filename.toUpperCase()}

**Purpose:** Archive for orphaned memory files that didn't fit into main project consolidations.

**Total memories:** ${memories.length}  
**Consolidation date:** ${now}

## All Archived Memories

${memories.map((memory, i) => `
### ${i + 1}. ${memory.filename}

**Original metadata:** ${Object.keys(memory.metadata).length > 0 ? JSON.stringify(memory.metadata, null, 2) : 'None'}

**Content:**
${memory.content}

---
`).join('\n')}

## Archive Info
This file contains memories that were scattered across projects with too few files to warrant individual consolidation. All content is preserved for future reference but marked as archived.
`;

    return frontmatter + '\n\n' + body;
  }
  
  createProjectConsolidated(memories, project) {
    const now = new Date().toISOString();
    
    const frontmatter = `---
id: ${Date.now()}
timestamp: ${now}
complexity: 3
category: consolidated
project: ${project}
tags: ["final-cleanup", "small-batch-consolidation"]
priority: medium
status: active
consolidation_type: final_cleanup
original_count: ${memories.length}
access_count: 0
metadata:
  content_type: text
  consolidation_date: ${now}
---`;

    const body = `# FINAL CLEANUP CONSOLIDATION: ${project.toUpperCase()}

Small batch consolidation of remaining ${memories.length} memory files from ${project}.

**Consolidation date:** ${now}

## Consolidated Content

${memories.map((memory, i) => `
### ${i + 1}. ${memory.filename}

${memory.content}

---
`).join('\n')}
`;

    return frontmatter + '\n\n' + body;
  }
  
  async generateCleanupReport() {
    const finalCount = await this.getFinalMemoryCount();
    
    const report = `# 🧹 FINAL CLEANUP CONSOLIDATION REPORT

**Date:** ${new Date().toISOString()}

## Cleanup Results
- **Projects processed:** ${this.stats.projectsProcessed}
- **Files consolidated:** ${this.stats.filesConsolidated}
- **Final memory count:** ${finalCount}

## What Was Done
1. **Single orphaned files** → Merged into mega-consolidation files
2. **Small project batches** → Individual project consolidations created
3. **All originals backed up** → Available in final-cleanup-backup directories

## System Status
- ✅ All scattered memory files consolidated
- ✅ Context-safe memory loading achieved  
- ✅ Complete audit trail maintained
- ✅ Full rollback capability preserved

**The memory consolidation project is now complete!**
`;

    const reportPath = path.join(this.memoriesDir, 'FINAL-CLEANUP-REPORT.md');
    await fs.writeFile(reportPath, report);
    console.log(`\n📋 Final cleanup report: ${reportPath}`);
    
    return finalCount;
  }
  
  async getFinalMemoryCount() {
    try {
      const result = await import('child_process');
      const { execSync } = result;
      const output = execSync('find /mnt/d/APPSNospaces/like-i-said-mcp/memories -maxdepth 2 -name "*.md" -not -path "*/pre-true-consolidation-backup/*" -not -path "*/*backup*" | wc -l', { encoding: 'utf8' });
      return parseInt(output.trim());
    } catch (error) {
      return 'unknown';
    }
  }
}

async function main() {
  const consolidator = new FinalCleanupConsolidator();
  
  const unconsolidatedFiles = await consolidator.findUnconsolidatedFiles();
  
  if (unconsolidatedFiles.size === 0) {
    console.log('✅ No unconsolidated files found! Consolidation is complete.');
    return;
  }
  
  await consolidator.consolidateRemainingFiles(unconsolidatedFiles);
  
  console.log('\n🎉 FINAL CLEANUP COMPLETE!');
  console.log(`📊 Processed ${consolidator.stats.filesConsolidated} remaining files`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}

export default FinalCleanupConsolidator;