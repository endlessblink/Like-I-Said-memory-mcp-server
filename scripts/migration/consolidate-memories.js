#!/usr/bin/env node

/**
 * Memory Consolidation Script - Context-Safe
 * 
 * Consolidates similar memories in small batches to avoid Claude context overflow
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class MemoryConsolidator {
  constructor(memoriesDir = 'memories') {
    this.memoriesDir = memoriesDir;
    this.batchSize = 5; // Safe batch size to avoid context overflow
  }

  async findConsolidationCandidates(project) {
    const projectDir = path.join(this.memoriesDir, project);
    const files = await fs.readdir(projectDir);
    const memoryFiles = files.filter(f => f.endsWith('.md'));
    
    // Group by patterns
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
  
  async consolidateGroup(project, groupName, files, maxBatch = 5) {
    if (files.length < 2) return null;
    
    console.log(`\n🔄 Consolidating ${groupName} group: ${files.length} files`);
    
    const projectDir = path.join(this.memoriesDir, project);
    const batch = files.slice(0, maxBatch); // Safe batch size
    
    const memories = [];
    for (const file of batch) {
      const content = await fs.readFile(path.join(projectDir, file), 'utf8');
      const memory = this.parseMemory(content, file);
      if (memory) memories.push(memory);
    }
    
    if (memories.length < 2) return null;
    
    // Create consolidated memory
    const consolidated = this.createConsolidatedMemory(memories, groupName, project);
    const filename = `consolidated-${groupName}-${Date.now()}.md`;
    const filepath = path.join(projectDir, filename);
    
    await fs.writeFile(filepath, consolidated);
    console.log(`✅ Created: ${filename}`);
    
    // Backup originals before deletion
    const backupDir = path.join(projectDir, 'pre-consolidation-backup');
    await fs.ensureDir(backupDir);
    
    for (const file of batch) {
      await fs.copy(path.join(projectDir, file), path.join(backupDir, file));
      await fs.remove(path.join(projectDir, file));
      console.log(`📦 Backed up and removed: ${file}`);
    }
    
    return {
      consolidated: filename,
      removed: batch.length,
      backupLocation: backupDir
    };
  }
  
  parseMemory(content, filename) {
    const lines = content.split('\n');
    const frontmatterEnd = lines.findIndex((line, i) => i > 0 && line === '---');
    
    if (frontmatterEnd === -1) return null;
    
    const frontmatter = {};
    const bodyLines = lines.slice(frontmatterEnd + 1);
    
    // Parse frontmatter
    for (let i = 1; i < frontmatterEnd; i++) {
      const line = lines[i];
      if (line.includes(':')) {
        const [key, ...valueParts] = line.split(':');
        frontmatter[key.trim()] = valueParts.join(':').trim();
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
    const tags = [...new Set(memories.flatMap(m => this.parseTags(m.metadata.tags)))];
    
    const frontmatter = `---
id: ${Date.now()}
timestamp: ${now}
complexity: 4
category: consolidated
project: ${project}
tags: ${JSON.stringify(tags)}
priority: high
status: active
consolidated_from: ${JSON.stringify(ids)}
group_type: ${groupName}
access_count: 0
metadata:
  content_type: text
  consolidation_date: ${now}
  original_count: ${memories.length}
---`;

    const body = `# CONSOLIDATED ${groupName.toUpperCase()} MEMORIES

This memory consolidates ${memories.length} related memories from ${project}.

## Summary
Key information extracted from ${memories.length} ${groupName} memories.

## Consolidated Content

${memories.map((memory, i) => `
### ${i + 1}. ${memory.filename}
**Date:** ${memory.metadata.timestamp || 'Unknown'}
**ID:** ${memory.metadata.id || 'N/A'}

${memory.content}

---
`).join('\n')}

## Consolidation Info
- **Consolidated:** ${now}
- **Original IDs:** ${ids.join(', ')}
- **Group:** ${groupName}
- **Count:** ${memories.length} memories
`;

    return frontmatter + '\n\n' + body;
  }
  
  parseTags(tagsString) {
    if (!tagsString) return [];
    try {
      return JSON.parse(tagsString);
    } catch {
      return tagsString.split(',').map(t => t.trim().replace(/["\[\]]/g, ''));
    }
  }
  
  async generateReport(project, results) {
    const reportPath = path.join(this.memoriesDir, project, 'consolidation-report.md');
    const timestamp = new Date().toISOString();
    
    const report = `# Memory Consolidation Report
**Project:** ${project}
**Date:** ${timestamp}

## Results
${results.map(r => r ? `
- **${r.consolidated}**: Consolidated ${r.removed} memories
- **Backup Location:** ${r.backupLocation}
` : '- No consolidation needed for group').join('\n')}

## Summary
- Total memories consolidated: ${results.reduce((sum, r) => sum + (r?.removed || 0), 0)}
- Consolidation files created: ${results.filter(r => r).length}
- All originals backed up before removal

## Next Steps
- Review consolidated memories for accuracy
- Update any references to old memory IDs
- Consider further consolidation if needed
`;

    await fs.writeFile(reportPath, report);
    return reportPath;
  }
}

// CLI interface
async function main() {
  const project = process.argv[2] || 'like-i-said-v2';
  const consolidator = new MemoryConsolidator();
  
  console.log(`🚀 Starting memory consolidation for project: ${project}`);
  
  try {
    const groups = await consolidator.findConsolidationCandidates(project);
    console.log('📊 Consolidation candidates found:');
    
    Object.entries(groups).forEach(([name, files]) => {
      console.log(`  ${name}: ${files.length} files`);
    });
    
    const results = [];
    
    // Process each group in safe batches
    for (const [groupName, files] of Object.entries(groups)) {
      if (files.length >= 2) {
        const result = await consolidator.consolidateGroup(project, groupName, files);
        results.push(result);
      } else {
        results.push(null);
      }
    }
    
    const reportPath = await consolidator.generateReport(project, results);
    console.log(`📋 Report generated: ${reportPath}`);
    console.log('\n✅ Consolidation complete!');
    
  } catch (error) {
    console.error('❌ Consolidation failed:', error);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

export default MemoryConsolidator;