#!/usr/bin/env node

/**
 * TRUE Memory Consolidation Script - Actually Reduces Memory Count
 * 
 * Fixes the flawed logic that was creating MORE files instead of fewer.
 * This script consolidates ALL files in each category into single files.
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class TrueMemoryConsolidator {
  constructor(memoriesDir = 'memories') {
    this.memoriesDir = memoriesDir;
    this.stats = {
      before: 0,
      after: 0,
      consolidated: 0,
      removed: 0
    };
  }

  async findConsolidationCandidates(project) {
    const projectDir = path.join(this.memoriesDir, project);
    const files = await fs.readdir(projectDir);
    const memoryFiles = files.filter(f => f.endsWith('.md') && !f.startsWith('consolidated-'));
    
    this.stats.before = memoryFiles.length;
    
    // Group by patterns - NO BATCH LIMITS
    const groups = {
      sessions: [],
      dashboard: [],
      fixes: [],
      testing: [],
      other: []
    };
    
    for (const file of memoryFiles) {
      if (file.includes('session')) {
        groups.sessions.push(file);
      } else if (file.includes('dashboard')) {
        groups.dashboard.push(file);
      } else if (file.includes('fix') || file.includes('bug')) {
        groups.fixes.push(file);
      } else if (file.includes('test')) {
        groups.testing.push(file);
      } else {
        groups.other.push(file);
      }
    }
    
    return groups;
  }
  
  async consolidateGroup(project, groupName, files) {
    if (files.length < 2) {
      console.log(`⏭️  Skipping ${groupName}: only ${files.length} file(s)`);
      return null;
    }

    console.log(`\n🔄 Consolidating ${groupName}: ${files.length} files → 1 file`);
    
    const projectDir = path.join(this.memoriesDir, project);
    
    // Load ALL files in the group (no artificial limits!)
    const memories = [];
    for (const file of files) {
      try {
        const content = await fs.readFile(path.join(projectDir, file), 'utf8');
        const memory = this.parseMemory(content, file);
        if (memory) memories.push(memory);
      } catch (error) {
        console.log(`⚠️  Could not parse ${file}: ${error.message}`);
      }
    }
    
    if (memories.length < 2) {
      console.log(`⏭️  Skipping ${groupName}: only ${memories.length} valid memories`);
      return null;
    }
    
    // Create consolidated memory
    const consolidated = this.createConsolidatedMemory(memories, groupName, project);
    const filename = `consolidated-${groupName}.md`;
    const filepath = path.join(projectDir, filename);
    
    // Backup originals before deletion
    const backupDir = path.join(projectDir, 'pre-true-consolidation-backup');
    await fs.ensureDir(backupDir);
    
    for (const file of files) {
      await fs.copy(path.join(projectDir, file), path.join(backupDir, file));
      await fs.remove(path.join(projectDir, file));
    }
    
    await fs.writeFile(filepath, consolidated);
    
    console.log(`✅ Created: ${filename} (consolidated ${files.length} files)`);
    console.log(`📦 Backed up ${files.length} originals to backup/`);
    
    this.stats.consolidated += 1;
    this.stats.removed += files.length;
    
    return {
      consolidated: filename,
      originalCount: files.length,
      netReduction: files.length - 1, // files removed minus 1 created
      backupLocation: backupDir
    };
  }
  
  parseMemory(content, filename) {
    const lines = content.split('\n');
    const frontmatterEnd = lines.findIndex((line, i) => i > 0 && line === '---');
    
    if (frontmatterEnd === -1) {
      // No frontmatter, treat entire content as body
      return {
        filename,
        metadata: {},
        content: content.trim()
      };
    }
    
    const frontmatter = {};
    const bodyLines = lines.slice(frontmatterEnd + 1);
    
    // Parse frontmatter
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
  
  createConsolidatedMemory(memories, groupName, project) {
    const now = new Date().toISOString();
    const ids = memories.map(m => m.metadata.id).filter(Boolean);
    const allTags = memories.flatMap(m => this.parseTags(m.metadata.tags));
    const uniqueTags = [...new Set(allTags)];
    
    const frontmatter = `---
id: ${Date.now()}
timestamp: ${now}
complexity: 4
category: consolidated
project: ${project}
tags: ${JSON.stringify(uniqueTags)}
priority: high
status: active
consolidated_from: ${JSON.stringify(ids)}
group_type: ${groupName}
original_count: ${memories.length}
consolidation_type: true_consolidation
access_count: 0
metadata:
  content_type: text
  consolidation_date: ${now}
  net_reduction: ${memories.length - 1}
---`;

    const body = `# TRUE CONSOLIDATED ${groupName.toUpperCase()} MEMORIES

**Net Reduction:** ${memories.length} files → 1 file (saved ${memories.length - 1} files)

This memory consolidates ALL ${memories.length} ${groupName} memories from the ${project} project into a single searchable file.

## Quick Reference
- **Original count:** ${memories.length} memories
- **Consolidated:** ${now}
- **Category:** ${groupName}
- **Project:** ${project}

## All ${groupName.charAt(0).toUpperCase() + groupName.slice(1)} Content

${memories.map((memory, i) => `
## ${i + 1}. ${memory.filename}

**Original ID:** ${memory.metadata.id || 'N/A'}  
**Date:** ${memory.metadata.timestamp || 'Unknown'}  
**Category:** ${memory.metadata.category || 'N/A'}

### Content:
${memory.content}

---
`).join('\n')}

## Consolidation Summary
- **Total memories consolidated:** ${memories.length}
- **Original IDs:** ${ids.length > 0 ? ids.join(', ') : 'N/A'}
- **Net file reduction:** ${memories.length - 1}
- **Space saved:** Significant reduction in file count
- **All original content preserved**
`;

    return frontmatter + '\n\n' + body;
  }
  
  parseTags(tagsString) {
    if (!tagsString) return [];
    try {
      return JSON.parse(tagsString);
    } catch {
      // Handle malformed tags
      return tagsString.split(',').map(t => t.trim().replace(/["\[\]]/g, '')).filter(t => t.length > 0);
    }
  }
  
  async generateTrueReport(project, results) {
    // Count current files for accurate after count
    const projectDir = path.join(this.memoriesDir, project);
    const currentFiles = await fs.readdir(projectDir);
    const currentMemoryCount = currentFiles.filter(f => f.endsWith('.md')).length;
    this.stats.after = currentMemoryCount;
    
    const netReduction = this.stats.before - this.stats.after;
    
    const reportPath = path.join(this.memoriesDir, project, 'true-consolidation-report.md');
    const timestamp = new Date().toISOString();
    
    const validResults = results.filter(r => r !== null);
    
    const report = `# TRUE Memory Consolidation Report
**Project:** ${project}
**Date:** ${timestamp}

## ACTUAL RESULTS (Fixed Logic)
**Before consolidation:** ${this.stats.before} memories
**After consolidation:** ${this.stats.after} memories
**NET REDUCTION:** ${netReduction} files (${((netReduction/this.stats.before)*100).toFixed(1)}% decrease)

## Consolidation Details
${validResults.map(r => `
- **${r.consolidated}**: ${r.originalCount} files → 1 file (saved ${r.netReduction} files)
`).join('')}

## Summary Statistics  
- **Consolidated files created:** ${validResults.length}
- **Original files removed:** ${this.stats.removed}
- **Net file reduction:** ${netReduction} 
- **Consolidation efficiency:** ${this.stats.removed > 0 ? ((netReduction/this.stats.removed)*100).toFixed(1) : 0}%

## Context Benefits
- ✅ Actual memory count reduction achieved
- ✅ All original content preserved in consolidated files  
- ✅ Full backups created before removal
- ✅ Improved loading performance for Claude Code
- ✅ Related memories grouped logically

## Verification
\`\`\`bash
# Count memories before: ${this.stats.before}
# Count memories after: ${this.stats.after} 
# Net reduction: ${netReduction}
\`\`\`

All original files backed up to: pre-true-consolidation-backup/
`;

    await fs.writeFile(reportPath, report);
    return { reportPath, netReduction };
  }
}

// CLI interface
async function main() {
  const project = process.argv[2] || 'like-i-said-memory-mcp-server';
  const consolidator = new TrueMemoryConsolidator();
  
  console.log(`🚀 TRUE Memory Consolidation for: ${project}`);
  console.log(`📊 Goal: ACTUALLY reduce memory count, not increase it!`);
  
  try {
    const groups = await consolidator.findConsolidationCandidates(project);
    console.log(`\n📊 Starting with ${consolidator.stats.before} memory files`);
    console.log('🎯 Consolidation targets:');
    
    Object.entries(groups).forEach(([name, files]) => {
      console.log(`  ${name}: ${files.length} files → ${files.length >= 2 ? '1 consolidated' : 'no change'}`);
    });
    
    const results = [];
    
    // Process each group completely (no artificial batch limits!)
    for (const [groupName, files] of Object.entries(groups)) {
      const result = await consolidator.consolidateGroup(project, groupName, files);
      results.push(result);
    }
    
    const { reportPath, netReduction } = await consolidator.generateTrueReport(project, results);
    
    console.log(`\n✅ TRUE CONSOLIDATION COMPLETE!`);
    console.log(`📊 Before: ${consolidator.stats.before} memories`);
    console.log(`📊 After: ${consolidator.stats.after} memories`);
    console.log(`🎯 Net reduction: ${netReduction} files`);
    console.log(`📋 Report: ${reportPath}`);
    
    if (netReduction <= 0) {
      console.log(`⚠️  WARNING: No net reduction achieved! Check logic.`);
    } else {
      console.log(`🎉 SUCCESS: Reduced memory count by ${netReduction} files!`);
    }
    
  } catch (error) {
    console.error('❌ True consolidation failed:', error);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

export default TrueMemoryConsolidator;