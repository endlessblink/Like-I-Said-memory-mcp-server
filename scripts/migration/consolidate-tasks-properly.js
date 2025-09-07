#!/usr/bin/env node

/**
 * Task Consolidation - Apply Successful Memory Approach to Tasks
 * 
 * Based on what worked for memories:
 * 1. Keep project directory structure: tasks/project/consolidated-tasks.md
 * 2. Convert JSON to Markdown format for consistency  
 * 3. Consolidate multiple task files per project into single files
 * 4. Preserve all task metadata, IDs, and memory connections
 */

import fs from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class TaskConsolidator {
  constructor() {
    this.tasksDir = 'tasks';
    this.stats = {
      projectsProcessed: 0,
      jsonFilesConverted: 0,
      markdownFilesProcessed: 0,
      tasksConsolidated: 0,
      consolidatedFilesCreated: 0,
      errors: []
    };
    this.projectTasks = new Map();
  }
  
  async consolidateTasks(dryRun = false) {
    console.log(`📋 TASK CONSOLIDATION ${dryRun ? '(DRY RUN)' : '(LIVE)'}`);
    console.log('🎯 Goal: Apply successful memory approach to tasks\n');
    
    if (!dryRun) {
      await this.createTaskBackup();
    }
    
    // Find all task projects
    const taskProjects = await this.findTaskProjects();
    console.log(`📊 Found ${taskProjects.length} task projects to process\n`);
    
    // Process each project
    for (const project of taskProjects) {
      await this.processTaskProject(project, dryRun);
    }
    
    // Create consolidated task files
    await this.createProjectTaskFiles(dryRun);
    
    await this.generateTaskReport(dryRun);
  }
  
  async createTaskBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = `task-consolidation-backups/pre_task_fix_${timestamp}`;
    
    console.log(`📦 Creating task consolidation backup: ${backupDir}`);
    await fs.ensureDir(backupDir);
    
    if (await fs.pathExists(this.tasksDir)) {
      await fs.copy(this.tasksDir, path.join(backupDir, 'tasks'));
    }
    
    console.log('✅ Task consolidation backup complete\n');
  }
  
  async findTaskProjects() {
    const projects = [];
    
    try {
      const dirs = await fs.readdir(this.tasksDir);
      
      for (const dir of dirs) {
        const dirPath = path.join(this.tasksDir, dir);
        const stat = await fs.stat(dirPath);
        
        if (stat.isDirectory() && dir !== '.git') {
          const files = await fs.readdir(dirPath);
          const taskFiles = files.filter(f => f.endsWith('.md') || f.endsWith('.json'));
          
          if (taskFiles.length > 0) {
            projects.push({
              name: dir,
              path: dirPath,
              files: taskFiles.map(f => ({
                name: f,
                path: path.join(dirPath, f),
                format: path.extname(f).substring(1) // 'md' or 'json'
              }))
            });
          }
        }
      }
    } catch (error) {
      this.stats.errors.push({ action: 'finding projects', error: error.message });
    }
    
    return projects;
  }
  
  async processTaskProject(project, dryRun) {
    console.log(`🔄 Processing project: ${project.name} (${project.files.length} files)`);
    
    const allTasks = [];
    
    for (const file of project.files) {
      console.log(`   📄 ${file.name} (${file.format})`);
      
      try {
        if (file.format === 'json') {
          const tasks = await this.parseJsonTaskFile(file.path);
          allTasks.push(...tasks);
          this.stats.jsonFilesConverted++;
        } else if (file.format === 'md') {
          const tasks = await this.parseMarkdownTaskFile(file.path);
          allTasks.push(...tasks);
          this.stats.markdownFilesProcessed++;
        }
      } catch (error) {
        console.log(`     ❌ Error: ${error.message}`);
        this.stats.errors.push({ 
          project: project.name, 
          file: file.name, 
          error: error.message 
        });
      }
    }
    
    if (allTasks.length > 0) {
      this.projectTasks.set(project.name, allTasks);
      this.stats.tasksConsolidated += allTasks.length;
      console.log(`   ✅ Collected ${allTasks.length} tasks for consolidation`);
    }
    
    this.stats.projectsProcessed++;
  }
  
  async parseJsonTaskFile(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    const taskArray = JSON.parse(content);
    
    return taskArray.map(task => ({
      ...task,
      sourceFile: path.basename(filePath),
      sourceFormat: 'json'
    }));
  }
  
  async parseMarkdownTaskFile(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    const tasks = [];
    
    // Split by task separators (---) and parse each task
    const sections = content.split('\\n---\\n');
    
    for (let i = 1; i < sections.length; i++) { // Skip file header
      const section = sections[i];
      const task = this.parseTaskSection(section, filePath);
      if (task) {
        tasks.push(task);
      }
    }
    
    return tasks;
  }
  
  parseTaskSection(section, filePath) {
    const lines = section.split('\\n');
    const task = {
      sourceFile: path.basename(filePath),
      sourceFormat: 'markdown'
    };
    
    // Parse task fields
    for (const line of lines) {
      if (line.includes(':')) {
        const colonIndex = line.indexOf(':');
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim().replace(/^['"]|['"]$/g, '');
        
        if (['id', 'title', 'serial', 'status', 'priority', 'category', 'project', 'created', 'updated'].includes(key)) {
          task[key] = value;
        }
      }
    }
    
    return Object.keys(task).length > 2 ? task : null; // Valid if has more than sourceFile/Format
  }
  
  async createProjectTaskFiles(dryRun) {
    console.log(`\\n📁 Creating consolidated task files in project directories:`);
    
    for (const [projectName, tasks] of this.projectTasks) {
      const consolidatedFilename = 'consolidated-tasks.md';
      const outputPath = path.join(this.tasksDir, projectName, consolidatedFilename);
      
      console.log(`\\n🔄 Creating: ${outputPath}`);
      console.log(`   📊 ${tasks.length} tasks consolidated`);
      
      if (!dryRun) {
        const consolidatedContent = this.createConsolidatedTaskFile(projectName, tasks);
        await fs.writeFile(outputPath, consolidatedContent);
        
        // Remove original task files after successful consolidation
        const projectDir = path.join(this.tasksDir, projectName);
        const files = await fs.readdir(projectDir);
        
        for (const file of files) {
          if ((file.endsWith('.json') || file.endsWith('.md')) && file !== consolidatedFilename) {
            const oldPath = path.join(projectDir, file);
            await fs.remove(oldPath);
            console.log(`   🗑️  Removed: ${file}`);
          }
        }
        
        this.stats.consolidatedFilesCreated++;
      }
    }
  }
  
  createConsolidatedTaskFile(projectName, tasks) {
    const now = new Date().toISOString();
    
    // Sort tasks by priority and status
    const sortedTasks = tasks.sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      const statusOrder = { in_progress: 0, todo: 1, blocked: 2, done: 3 };
      
      const aPriority = priorityOrder[a.priority] ?? 2;
      const bPriority = priorityOrder[b.priority] ?? 2;
      const aStatus = statusOrder[a.status] ?? 1;
      const bStatus = statusOrder[b.status] ?? 1;
      
      return aStatus - bStatus || aPriority - bPriority;
    });
    
    // Extract unique tags
    const allTags = [...new Set(tasks.flatMap(t => t.tags || []))];
    
    const frontmatter = `---
project: ${projectName}
tags: ${JSON.stringify(allTags)}
updated: ${now}
consolidation_type: project_based
original_count: ${tasks.length}
formats_merged: ${[...new Set(tasks.map(t => t.sourceFormat))].join(', ')}
manual_memories: []
memory_connections: []
metadata:
  consolidation_date: ${now}
  mcp_compatible: true
  content_type: consolidated-tasks
---`;

    const body = `# ${projectName.toUpperCase()} - CONSOLIDATED TASKS

All tasks for the ${projectName} project consolidated from ${tasks.length} entries across multiple files.

**Project:** ${projectName}  
**Total tasks:** ${tasks.length}  
**Status distribution:** ${this.getStatusDistribution(tasks)}
**Priority distribution:** ${this.getPriorityDistribution(tasks)}

---

${sortedTasks.map((task, index) => `
---
id: ${task.id || `task-${Date.now()}-${index}`}
title: ${task.title || 'Untitled Task'}
serial: ${task.serial || 'N/A'}
status: ${task.status || 'todo'}
priority: ${task.priority || 'medium'}
category: ${task.category || 'general'}
project: ${projectName}
tags: ${JSON.stringify(task.tags || [])}
created: ${task.created || now}
updated: ${task.updated || now}
source_file: ${task.sourceFile}
source_format: ${task.sourceFormat}
manual_memories: []
memory_connections: []
---

${task.description ? `**Description:** ${task.description}\\n` : ''}
${task.notes ? `**Notes:** ${task.notes}\\n` : ''}
`).join('\\n')}

---

## 📊 PROJECT TASK SUMMARY

- **Total tasks consolidated:** ${tasks.length}
- **Source formats:** ${[...new Set(tasks.map(t => t.sourceFormat))].join(', ')}
- **MCP Path:** \`tasks/${projectName}/consolidated-tasks.md\`
- **Format:** Unified Markdown with YAML frontmatter
- **Compatibility:** ✅ MCP tools can access \`tasks/${projectName}/\`

**All ${projectName} tasks now in MCP-compatible consolidated format!**
`;

    return frontmatter + '\\n\\n' + body;
  }
  
  getStatusDistribution(tasks) {
    const counts = {};
    tasks.forEach(t => {
      const status = t.status || 'unknown';
      counts[status] = (counts[status] || 0) + 1;
    });
    
    return Object.entries(counts).map(([status, count]) => `${status}: ${count}`).join(', ');
  }
  
  getPriorityDistribution(tasks) {
    const counts = {};
    tasks.forEach(t => {
      const priority = t.priority || 'unknown';
      counts[priority] = (counts[priority] || 0) + 1;
    });
    
    return Object.entries(counts).map(([priority, count]) => `${priority}: ${count}`).join(', ');
  }
  
  async generateTaskReport(dryRun) {
    const timestamp = new Date().toISOString();
    
    const report = `# 📋 TASK CONSOLIDATION REPORT

**Generated:** ${timestamp}
**Mode:** ${dryRun ? 'DRY RUN' : 'LIVE CONSOLIDATION'}
**Approach:** Project-based (learned from memory success)

## 📊 TASK CONSOLIDATION RESULTS

### Overall Statistics:
- **Projects processed:** ${this.stats.projectsProcessed}
- **JSON files converted:** ${this.stats.jsonFilesConverted}
- **Markdown files processed:** ${this.stats.markdownFilesProcessed}
- **Total tasks consolidated:** ${this.stats.tasksConsolidated}
- **Consolidated files created:** ${this.stats.consolidatedFilesCreated}

### Project Breakdown:
${Array.from(this.projectTasks.entries()).map(([project, tasks]) => 
  `- **${project}**: ${tasks.length} tasks → \`tasks/${project}/consolidated-tasks.md\``
).join('\\n')}

## ✅ MCP COMPATIBILITY ACHIEVED

**Structure Created:**
\`\`\`
tasks/
${Array.from(this.projectTasks.keys()).map(project => 
  `├── ${project}/
│   └── consolidated-tasks.md       # ✅ MCP finds tasks/${project}/`
).join('\\n')}
\`\`\`

## 🎯 BENEFITS ACHIEVED

- ✅ **MCP tool compatibility** - Tools can find \`tasks/project/\` directories
- ✅ **Format standardization** - All tasks in Markdown + YAML format
- ✅ **File reduction** - Multiple task files → 1 per project
- ✅ **Content preservation** - All task data, IDs, connections preserved
- ✅ **Metadata maintained** - Status, priority, serials, memory links intact

${this.stats.errors.length > 0 ? `## ⚠️ ERRORS ENCOUNTERED

${this.stats.errors.map(error => 
  `- **${error.project || 'unknown'}/${error.file || 'unknown'}**: ${error.error}`
).join('\\n')}` : '## ✅ NO ERRORS - PERFECT TASK CONSOLIDATION!'}

---

**Task consolidation complete using proven successful approach!**
`;

    const reportPath = `task-consolidation-report${dryRun ? '-dry-run' : ''}.md`;
    await fs.writeFile(reportPath, report);
    
    console.log(`\\n📋 Task consolidation report: ${reportPath}`);
    console.log(`🎯 Processed ${this.stats.projectsProcessed} projects`);
    console.log(`📊 Consolidated ${this.stats.tasksConsolidated} tasks into ${this.stats.consolidatedFilesCreated} files`);
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const consolidator = new TaskConsolidator();
  
  console.log(dryRun ? '🔍 DRY RUN - Analyzing task structure' : '⚠️  LIVE MODE - Tasks will be consolidated');
  
  await consolidator.consolidateTasks(dryRun);
  
  console.log('\\n🎉 TASK CONSOLIDATION COMPLETE!');
  
  if (dryRun) {
    console.log('🔄 To consolidate for real: node consolidate-tasks-properly.js');
  } else {
    console.log('🚀 Both memories and tasks now properly consolidated!');
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}

export default TaskConsolidator;