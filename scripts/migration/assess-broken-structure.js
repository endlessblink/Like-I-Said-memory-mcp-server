#!/usr/bin/env node

/**
 * Assess Broken Nested Structure
 * 
 * Maps out the current broken nested directory mess to plan restoration
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class StructureAssessor {
  constructor() {
    this.memoriesDir = 'memories';
    this.tasksDir = 'tasks';
    this.issues = {
      nested: [],
      broken: [],
      scattered: [],
      duplicates: []
    };
    this.stats = {
      totalMemoryFiles: 0,
      totalTaskFiles: 0,
      nestedLevels: new Map(),
      projectsFound: new Set()
    };
  }
  
  async assessDirectory(dir, maxDepth = 5) {
    console.log(`🔍 Assessing directory structure: ${dir}`);
    
    if (!await fs.pathExists(dir)) {
      console.log(`❌ Directory not found: ${dir}`);
      return null;
    }
    
    const structure = await this.mapDirectory(dir, 0, maxDepth);
    return structure;
  }
  
  async mapDirectory(dirPath, currentDepth = 0, maxDepth = 5) {
    if (currentDepth > maxDepth) return { truncated: true };
    
    const items = [];
    
    try {
      const entries = await fs.readdir(dirPath);
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry);
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory()) {
          const children = await this.mapDirectory(fullPath, currentDepth + 1, maxDepth);
          items.push({
            type: 'directory',
            name: entry,
            path: fullPath,
            depth: currentDepth,
            children: children,
            isEmpty: await this.isDirectoryEmpty(fullPath)
          });
          
          // Track nesting levels
          if (currentDepth > 1) {
            this.issues.nested.push({
              path: fullPath,
              depth: currentDepth,
              issue: `Directory nested ${currentDepth} levels deep`
            });
          }
          
          this.stats.nestedLevels.set(fullPath, currentDepth);
          
        } else if (stat.isFile()) {
          const ext = path.extname(entry);
          const isMemory = ext === '.md' && dirPath.includes('memories');
          const isTask = (ext === '.md' || ext === '.json') && dirPath.includes('tasks');
          
          if (isMemory) {
            this.stats.totalMemoryFiles++;
            
            // Extract project name from path
            const projectPath = this.extractProjectFromPath(fullPath, 'memories');
            if (projectPath) this.stats.projectsFound.add(projectPath);
            
            // Check if nested too deeply for MCP compatibility
            if (currentDepth > 1) {
              this.issues.broken.push({
                path: fullPath,
                issue: 'Memory file nested too deep for MCP tools',
                expectedPath: this.getMCPExpectedPath(fullPath, 'memories'),
                depth: currentDepth
              });
            }
          }
          
          if (isTask) {
            this.stats.totalTaskFiles++;
            
            const projectPath = this.extractProjectFromPath(fullPath, 'tasks');
            if (projectPath) this.stats.projectsFound.add(projectPath);
            
            if (currentDepth > 1) {
              this.issues.broken.push({
                path: fullPath,
                issue: 'Task file nested too deep for MCP tools',
                expectedPath: this.getMCPExpectedPath(fullPath, 'tasks'),
                depth: currentDepth
              });
            }
          }
          
          items.push({
            type: 'file',
            name: entry,
            path: fullPath,
            depth: currentDepth,
            extension: ext,
            isMemory,
            isTask,
            size: stat.size
          });
        }
      }
    } catch (error) {
      items.push({
        type: 'error',
        name: path.basename(dirPath),
        error: error.message
      });
    }
    
    return items;
  }
  
  async isDirectoryEmpty(dirPath) {
    try {
      const entries = await fs.readdir(dirPath);
      return entries.length === 0;
    } catch {
      return true;
    }
  }
  
  extractProjectFromPath(filePath, baseDir) {
    const relativePath = path.relative(baseDir, filePath);
    const parts = relativePath.split(path.sep);
    
    // For nested structure like memories/category/project/file.md
    if (parts.length > 2) {
      return parts.slice(0, -1).join('/'); // Everything except the filename
    } else if (parts.length === 2) {
      return parts[0]; // Just the project directory
    }
    
    return null;
  }
  
  getMCPExpectedPath(filePath, baseDir) {
    const filename = path.basename(filePath);
    const relativePath = path.relative(baseDir, filePath);
    const parts = relativePath.split(path.sep);
    
    // MCP expects: memories/project/file.md
    if (parts.length > 2) {
      // Extract the actual project name (usually the last directory)
      const projectName = parts[parts.length - 2];
      return path.join(baseDir, projectName, filename);
    }
    
    return filePath; // Already in correct format
  }
  
  async findScatteredFiles() {
    console.log('🔍 Looking for scattered files...');
    
    // Find memory files in wrong locations
    const memoryFiles = await this.findFiles(this.memoriesDir, '.md');
    for (const file of memoryFiles) {
      const depth = file.split(path.sep).length - this.memoriesDir.split(path.sep).length - 1;
      if (depth !== 2) { // Should be memories/project/file.md
        this.issues.scattered.push({
          path: file,
          issue: `Memory file at wrong depth: ${depth} (should be 2)`,
          type: 'memory'
        });
      }
    }
    
    // Find task files in wrong locations  
    const taskFiles = await this.findFiles(this.tasksDir, ['.md', '.json']);
    for (const file of taskFiles) {
      const depth = file.split(path.sep).length - this.tasksDir.split(path.sep).length - 1;
      if (depth !== 2) { // Should be tasks/project/file.md
        this.issues.scattered.push({
          path: file,
          issue: `Task file at wrong depth: ${depth} (should be 2)`,
          type: 'task'
        });
      }
    }
  }
  
  async findFiles(baseDir, extensions) {
    const files = [];
    const exts = Array.isArray(extensions) ? extensions : [extensions];
    
    const traverse = async (dir) => {
      try {
        const entries = await fs.readdir(dir);
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry);
          const stat = await fs.stat(fullPath);
          
          if (stat.isDirectory()) {
            await traverse(fullPath);
          } else if (stat.isFile()) {
            const ext = path.extname(entry);
            if (exts.includes(ext)) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        // Skip unreadable directories
      }
    };
    
    await traverse(baseDir);
    return files;
  }
  
  async generateReport() {
    const timestamp = new Date().toISOString();
    
    const report = `# 🚨 BROKEN STRUCTURE ASSESSMENT REPORT

**Generated:** ${timestamp}
**Purpose:** Map current broken nested structure to plan restoration

## 📊 CURRENT STATE OVERVIEW

### File Counts:
- **Memory files:** ${this.stats.totalMemoryFiles}
- **Task files:** ${this.stats.totalTaskFiles}
- **Projects found:** ${this.stats.projectsFound.size}

### Nesting Issues:
- **Files nested too deep:** ${this.issues.broken.length}
- **Scattered files:** ${this.issues.scattered.length}
- **Nested directories:** ${this.issues.nested.length}

## 🚨 CRITICAL ISSUES FOUND

### Files Breaking MCP Compatibility:
${this.issues.broken.slice(0, 10).map(issue => 
  `- **${path.basename(issue.path)}**
  - Current: \`${issue.path}\`
  - Expected: \`${issue.expectedPath}\`
  - Issue: ${issue.issue} (depth: ${issue.depth})`
).join('\n\n')}

${this.issues.broken.length > 10 ? `\n... and ${this.issues.broken.length - 10} more files` : ''}

### Nested Directory Problems:
${this.issues.nested.slice(0, 5).map(issue =>
  `- \`${issue.path}\` (depth: ${issue.depth})`
).join('\n')}

${this.issues.nested.length > 5 ? `\n... and ${this.issues.nested.length - 5} more directories` : ''}

## 🎯 RESTORATION PLAN

### Phase 1: Flatten Structure
1. **Move all memory files** to \`memories/project/file.md\` format
2. **Move all task files** to \`tasks/project/file.md\` format  
3. **Remove empty nested directories**
4. **Preserve all file content** during moves

### Phase 2: True Consolidation  
1. **Merge memory files** by project theme into consolidated files
2. **Standardize task formats** (JSON → Markdown)
3. **Create mega-consolidated files** for context efficiency

### Expected Results:
- **MCP compatible paths:** All files at correct depth
- **Reduced file count:** From ${this.stats.totalMemoryFiles + this.stats.totalTaskFiles} to ~15 consolidated files
- **Working tools:** Dashboard and MCP tools functional

## 🛠️ NEXT STEPS

1. **Run flattening script** to restore proper directory structure
2. **Implement content consolidation** to merge related files
3. **Verify MCP tool compatibility** after each phase
4. **Test dashboard functionality** with new structure

---
**Assessment complete. Ready for restoration phase.**
`;

    const reportPath = path.join('structure-assessment-report.md');
    await fs.writeFile(reportPath, report);
    
    return reportPath;
  }
}

async function main() {
  const assessor = new StructureAssessor();
  
  console.log('🚨 ASSESSING BROKEN STRUCTURE...\n');
  
  // Map memories directory
  console.log('📁 Mapping memories directory...');
  await assessor.assessDirectory(assessor.memoriesDir);
  
  // Map tasks directory  
  console.log('📁 Mapping tasks directory...');
  await assessor.assessDirectory(assessor.tasksDir);
  
  // Find scattered files
  await assessor.findScatteredFiles();
  
  // Generate report
  const reportPath = await assessor.generateReport();
  
  console.log('\n📋 ASSESSMENT COMPLETE!');
  console.log(`📊 Found ${assessor.stats.totalMemoryFiles} memory files, ${assessor.stats.totalTaskFiles} task files`);
  console.log(`🚨 Critical issues: ${assessor.issues.broken.length} files breaking MCP compatibility`);
  console.log(`📄 Full report: ${reportPath}`);
  console.log('\n🎯 Ready for restoration phase!');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}

export default StructureAssessor;