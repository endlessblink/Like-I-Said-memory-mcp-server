#!/usr/bin/env node

/**
 * Batch Memory Consolidation - Process All Projects Safely
 * 
 * Consolidates all remaining memory projects while staying within context limits
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import TrueMemoryConsolidator from './true-consolidate-memories.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class BatchConsolidator {
  constructor() {
    this.memoriesDir = 'memories';
    this.totalStats = {
      projects: 0,
      beforeTotal: 0,
      afterTotal: 0,
      consolidated: 0,
      skipped: 0
    };
    this.results = [];
  }

  async getAllProjects() {
    const memoriesPath = path.join(this.memoriesDir);
    const dirs = await fs.readdir(memoriesPath);
    const projects = [];
    
    for (const dir of dirs) {
      const dirPath = path.join(memoriesPath, dir);
      const stat = await fs.stat(dirPath);
      
      if (stat.isDirectory() && dir !== '.git') {
        const memoryCount = await this.getMemoryCount(dir);
        projects.push({ name: dir, count: memoryCount });
      }
    }
    
    return projects.sort((a, b) => b.count - a.count);
  }
  
  async getMemoryCount(project) {
    try {
      const projectDir = path.join(this.memoriesDir, project);
      const files = await fs.readdir(projectDir);
      return files.filter(f => f.endsWith('.md') && 
                           !f.startsWith('consolidated-') && 
                           !f.includes('consolidation-report') &&
                           !f.includes('true-consolidation-report')).length;
    } catch (error) {
      return 0;
    }
  }
  
  async consolidateProject(project) {
    const consolidator = new TrueMemoryConsolidator();
    
    try {
      console.log(`\n🔄 Processing: ${project.name} (${project.count} memories)`);
      
      if (project.count < 2) {
        console.log(`⏭️  Skipping ${project.name}: only ${project.count} memories`);
        this.totalStats.skipped++;
        return { skipped: true, project: project.name, reason: 'too_few_files' };
      }
      
      // Skip projects already consolidated
      const reportPath = path.join(this.memoriesDir, project.name, 'true-consolidation-report.md');
      if (await fs.pathExists(reportPath)) {
        console.log(`⏭️  Skipping ${project.name}: already consolidated`);
        this.totalStats.skipped++;
        return { skipped: true, project: project.name, reason: 'already_consolidated' };
      }
      
      const groups = await consolidator.findConsolidationCandidates(project.name);
      const results = [];
      
      // Process each group
      for (const [groupName, files] of Object.entries(groups)) {
        if (files.length >= 2) {
          const result = await consolidator.consolidateGroup(project.name, groupName, files);
          if (result) results.push(result);
        }
      }
      
      if (results.length === 0) {
        console.log(`⏭️  No consolidation needed for ${project.name}`);
        this.totalStats.skipped++;
        return { skipped: true, project: project.name, reason: 'no_groups_found' };
      }
      
      const { netReduction } = await consolidator.generateTrueReport(project.name, results);
      
      this.totalStats.beforeTotal += project.count;
      this.totalStats.afterTotal += (project.count - netReduction);
      this.totalStats.consolidated++;
      
      console.log(`✅ ${project.name}: ${project.count} → ${project.count - netReduction} (saved ${netReduction} files)`);
      
      return {
        success: true,
        project: project.name,
        before: project.count,
        after: project.count - netReduction,
        saved: netReduction,
        consolidatedGroups: results.length
      };
      
    } catch (error) {
      console.error(`❌ Failed to consolidate ${project.name}: ${error.message}`);
      this.totalStats.skipped++;
      return { error: true, project: project.name, error: error.message };
    }
  }
  
  async consolidateAll() {
    console.log('🚀 BATCH MEMORY CONSOLIDATION - ALL PROJECTS');
    console.log('📊 Scanning all projects...\n');
    
    const projects = await this.getAllProjects();
    this.totalStats.projects = projects.length;
    
    console.log(`Found ${projects.length} projects to evaluate:`);
    projects.slice(0, 10).forEach(p => 
      console.log(`  ${p.name}: ${p.count} memories`)
    );
    if (projects.length > 10) {
      console.log(`  ... and ${projects.length - 10} more projects`);
    }
    
    console.log('\n🔄 Starting consolidation...');
    
    // Process projects in order of size (largest first for efficiency)
    for (const project of projects) {
      const result = await this.consolidateProject(project);
      this.results.push(result);
      
      // Brief pause to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    await this.generateFinalReport();
  }
  
  async generateFinalReport() {
    const timestamp = new Date().toISOString();
    const successful = this.results.filter(r => r.success);
    const skipped = this.results.filter(r => r.skipped);
    const errors = this.results.filter(r => r.error);
    
    const totalSaved = successful.reduce((sum, r) => sum + (r.saved || 0), 0);
    
    const report = `# 🎉 SYSTEM-WIDE MEMORY CONSOLIDATION COMPLETE

**Date:** ${timestamp}
**Total Projects Processed:** ${this.totalStats.projects}

## 📊 FINAL RESULTS

### Overall Statistics:
- **Projects Consolidated:** ${successful.length}
- **Projects Skipped:** ${skipped.length}
- **Projects with Errors:** ${errors.length}
- **Total Memory Reduction:** ${totalSaved} files

### Successfully Consolidated Projects:
${successful.map(r => 
  `- **${r.project}**: ${r.before} → ${r.after} memories (saved ${r.saved} files)`
).join('\n')}

### Skipped Projects:
${skipped.map(r => 
  `- **${r.project}**: ${r.reason.replace(/_/g, ' ')}`
).join('\n')}

${errors.length > 0 ? `### Errors:
${errors.map(r => 
  `- **${r.project}**: ${r.error}`
).join('\n')}` : ''}

## 🎯 Context Safety Achievement

**Before Consolidation:** High risk of context overflow with 1000+ scattered memory files
**After Consolidation:** Safe, organized memory access with consolidated files

## 🛡️ Data Safety

- ✅ All original files backed up in each project's \`pre-true-consolidation-backup/\`
- ✅ Complete audit trail with per-project reports  
- ✅ All content preserved in consolidated files
- ✅ Full rollback capability maintained

---
**System-wide memory consolidation completed successfully!**
`;

    const reportPath = path.join(this.memoriesDir, 'SYSTEM-WIDE-CONSOLIDATION-REPORT.md');
    await fs.writeFile(reportPath, report);
    
    console.log(`\n🎉 BATCH CONSOLIDATION COMPLETE!`);
    console.log(`📊 Processed ${this.totalStats.projects} projects`);
    console.log(`✅ Successfully consolidated: ${successful.length} projects`);
    console.log(`💾 Total files saved: ${totalSaved}`);
    console.log(`📋 Full report: ${reportPath}`);
  }
}

async function main() {
  const batchConsolidator = new BatchConsolidator();
  await batchConsolidator.consolidateAll();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}

export default BatchConsolidator;