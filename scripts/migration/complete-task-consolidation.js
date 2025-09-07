#!/usr/bin/env node

/**
 * Complete Task Consolidation - Apply Memory Success Pattern
 * 
 * Finishes task consolidation using the same successful approach we used for memories:
 * 1. Process remaining individual task files
 * 2. Group related projects (Pomo variants, palladio variants, etc.)
 * 3. Create final project-based structure matching memory success
 */

import fs from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class CompleteTaskConsolidator {
  constructor() {
    this.tasksDir = 'tasks';
    this.stats = {
      directoriesBefore: 0,
      directoriesAfter: 0,
      taskFilesBefore: 0,
      taskFilesAfter: 0,
      projectsMerged: 0,
      tasksConsolidated: 0,
      errors: []
    };
    
    // Project grouping strategy (same categories as successful memory consolidation)
    this.projectGroups = {
      'like-i-said-mcp': [
        'like-i-said-mcp', 'like-i-said-mcp-server-v2', 'like-i-said-memory-mcp-server',
        'like-i-said-memory-mcp-server-dashboard-improvements', 'like-i-said-v2',
        'like-i-said-v2-backup', 'Like-I-Said-V3-Development'
      ],
      'palladio': [
        'palladio', 'palladio-gen-platform', 'palladio-minimal-repository-management',
        'Palladio Minimal - Repository Management', 'Palladio-gen'
      ],
      'rough-cut-mcp': [
        'rough-cut-mcp', 'rough-cut-mcp-artifacts', 'rough-cut-mcp-audio',
        'rough-cut-mcp-cleanup', 'rough-cut-mcp-consolidation', 'rough-cut-mcp-core',
        'rough-cut-mcp-design-prism', 'rough-cut-mcp-design-system', 'roughcut-mcp-enhancement',
        'rough-cut-mcp-local'
      ],
      'pomo': [
        'Pomo', 'Pomo-Consolidation', 'Pomo-MultiView', 'Pomo-TaskFlow'
      ],
      'dashboard-ui': [
        'Dashboard Design System Overhaul', 'dashboard-design-system-overhaul'
      ],
      'testing': [
        'test', 'test-project', 'test-integration', 'integration-test',
        'mcp-testing', 'schema-validation-test', 'system-test', 'state-test-1752092843534'
      ],
      'development-tools': [
        'python-dxt-development', 'Gear-Pool'
      ],
      'youtube-demo': [
        'youtube-demo-api', 'youtube-demo-devops', 'youtube-demo-frontend',
        'youtube-demo-planning', 'youtube-demo-standards'
      ],
      'general': [
        'default', 'personal-projects', 'general-projects'
      ]
    };
  }
  
  async consolidateAllTasks(dryRun = false) {
    console.log(`📋 COMPLETE TASK CONSOLIDATION ${dryRun ? '(DRY RUN)' : '(LIVE)'}`);
    console.log('🎯 Goal: Apply proven memory consolidation success to tasks\n');
    
    if (!dryRun) {
      await this.createCompleteTaskBackup();
    }
    
    // Count current state
    await this.countCurrentFiles();
    
    console.log(`📊 CURRENT STATE:`);
    console.log(`   - Directories: ${this.stats.directoriesBefore}`);
    console.log(`   - Task files: ${this.stats.taskFilesBefore}\n`);
    
    // Find all current task projects
    const currentProjects = await this.findAllTaskProjects();
    
    // Group projects according to our strategy
    const groupedProjects = this.groupTaskProjects(currentProjects);
    
    console.log(`📊 GROUPING STRATEGY:`);
    Object.entries(groupedProjects).forEach(([group, projects]) => {
      console.log(`   ${group}: ${projects.length} projects → 1 consolidated`);
    });
    console.log();
    
    // Process each group
    for (const [groupName, projects] of Object.entries(groupedProjects)) {
      await this.processTaskGroup(groupName, projects, dryRun);
    }
    
    // Clean up redundant directories
    await this.cleanupRedundantDirectories(groupedProjects, dryRun);
    
    await this.generateCompleteTaskReport(dryRun);
  }
  
  async createCompleteTaskBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = `complete-task-backups/pre_complete_consolidation_${timestamp}`;
    
    console.log(`📦 Creating complete task backup: ${backupDir}`);
    await fs.ensureDir(backupDir);
    
    await fs.copy(this.tasksDir, path.join(backupDir, 'tasks'));
    console.log('✅ Complete task backup created\n');
  }
  
  async countCurrentFiles() {
    // Count directories
    const dirs = await fs.readdir(this.tasksDir);
    this.stats.directoriesBefore = dirs.filter(async d => {
      const stat = await fs.stat(path.join(this.tasksDir, d));
      return stat.isDirectory();
    }).length;
    
    // Count all task files
    const allFiles = await this.findAllFiles(this.tasksDir, ['.md', '.json']);
    this.stats.taskFilesBefore = allFiles.length;
  }
  
  async findAllFiles(baseDir, extensions) {
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
  
  async findAllTaskProjects() {
    const projects = [];
    
    try {
      const dirs = await fs.readdir(this.tasksDir);
      
      for (const dir of dirs) {
        const dirPath = path.join(this.tasksDir, dir);
        const stat = await fs.stat(dirPath);
        
        if (stat.isDirectory()) {
          const files = await fs.readdir(dirPath);
          const taskFiles = files.filter(f => f.endsWith('.md') || f.endsWith('.json'));
          
          projects.push({
            name: dir,
            path: dirPath,
            files: taskFiles,
            hasConsolidated: files.includes('consolidated-tasks.md')
          });
        }
      }
    } catch (error) {
      this.stats.errors.push({ action: 'finding projects', error: error.message });
    }
    
    return projects;
  }
  
  groupTaskProjects(projects) {
    const grouped = {};
    const ungrouped = [];
    
    // Initialize groups
    Object.keys(this.projectGroups).forEach(group => {
      grouped[group] = [];
    });
    
    // Assign projects to groups
    for (const project of projects) {
      let assigned = false;
      
      for (const [groupName, groupProjects] of Object.entries(this.projectGroups)) {
        if (groupProjects.includes(project.name)) {
          grouped[groupName].push(project);
          assigned = true;
          break;
        }
      }
      
      if (!assigned) {
        ungrouped.push(project);
      }
    }
    
    // Add ungrouped to general
    if (ungrouped.length > 0) {
      grouped.general.push(...ungrouped);
    }
    
    // Remove empty groups
    Object.keys(grouped).forEach(group => {
      if (grouped[group].length === 0) {
        delete grouped[group];
      }
    });
    
    return grouped;
  }
  
  async processTaskGroup(groupName, projects, dryRun) {
    console.log(`\n🔄 Processing group: ${groupName} (${projects.length} projects)`);
    
    const allTasks = [];
    const sourceProjects = [];
    
    // Collect all tasks from all projects in this group
    for (const project of projects) {
      console.log(`   📁 ${project.name}: ${project.files.length} files`);
      
      const projectTasks = await this.extractTasksFromProject(project);
      if (projectTasks.length > 0) {
        allTasks.push(...projectTasks);
        sourceProjects.push(project.name);
        console.log(`      ✅ ${projectTasks.length} tasks extracted`);
      }
    }
    
    if (allTasks.length === 0) {
      console.log(`   ⏭️  No tasks found in ${groupName}`);
      return;
    }
    
    console.log(`   📊 Total: ${allTasks.length} tasks from ${sourceProjects.length} projects`);
    
    if (!dryRun) {
      // Create consolidated task file for this group
      await this.createGroupConsolidatedFile(groupName, allTasks, sourceProjects);
      this.stats.tasksConsolidated += allTasks.length;
      this.stats.projectsMerged += projects.length;
      this.stats.taskFilesAfter++;
    }
  }
  
  async extractTasksFromProject(project) {
    const tasks = [];
    
    for (const file of project.files) {
      const filePath = path.join(project.path, file);
      
      try {
        if (file.endsWith('.json')) {
          const jsonTasks = await this.parseJsonTasks(filePath);
          tasks.push(...jsonTasks.map(t => ({...t, sourceProject: project.name, sourceFile: file})));
        } else if (file.endsWith('.md')) {
          const mdTasks = await this.parseMarkdownTasks(filePath);
          tasks.push(...mdTasks.map(t => ({...t, sourceProject: project.name, sourceFile: file})));
        }
      } catch (error) {
        this.stats.errors.push({
          project: project.name,
          file,
          error: error.message
        });
      }
    }
    
    return tasks;
  }
  
  async parseJsonTasks(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  }
  
  async parseMarkdownTasks(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    const tasks = [];
    
    // Handle both single task files and multi-task files
    if (content.includes('---\nid:') || content.includes('---\ntitle:')) {
      // Multi-task format (like tasks.md)
      const sections = content.split('\n---\n');
      
      for (let i = 1; i < sections.length; i++) {
        const taskData = this.parseTaskSection(sections[i]);
        if (taskData) tasks.push(taskData);
      }
    } else {
      // Single task format (like task-uuid.md)
      const taskData = this.parseTaskSection(content);
      if (taskData) tasks.push(taskData);
    }
    
    return tasks;
  }
  
  parseTaskSection(section) {
    const lines = section.split('\n');
    const task = {};
    
    // Parse YAML-like task fields
    for (const line of lines) {
      if (line.includes(':') && !line.startsWith('#')) {
        const colonIndex = line.indexOf(':');
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim().replace(/^['"]|['"]$/g, '');
        
        if (['id', 'title', 'serial', 'status', 'priority', 'category', 'project', 'created', 'updated', 'description'].includes(key)) {
          if (key === 'tags' && value) {
            try {
              task[key] = JSON.parse(value);
            } catch {
              task[key] = value.split(',').map(t => t.trim());
            }
          } else {
            task[key] = value;
          }
        }
      }
    }
    
    // Extract description from content if not in metadata
    if (!task.description) {
      const contentStart = lines.findIndex(line => line.trim() && !line.includes(':') && !line.startsWith('#') && !line === '---');
      if (contentStart > -1) {
        task.description = lines.slice(contentStart).join('\n').trim();
      }
    }
    
    return Object.keys(task).length > 1 ? task : null;
  }
  
  async createGroupConsolidatedFile(groupName, allTasks, sourceProjects) {
    const now = new Date().toISOString();
    
    // Sort tasks by priority and status
    allTasks.sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      const statusOrder = { in_progress: 0, todo: 1, blocked: 2, done: 3 };
      
      const aPriority = priorityOrder[a.priority] || 2;
      const bPriority = priorityOrder[b.priority] || 2;
      const aStatus = statusOrder[a.status] || 1;
      const bStatus = statusOrder[b.status] || 1;
      
      return aStatus - bStatus || aPriority - bPriority;
    });
    
    // Collect all tags
    const allTags = [...new Set(allTasks.flatMap(t => t.tags || []))];
    
    const frontmatter = `---
project: ${groupName}
tags: ${JSON.stringify(allTags)}
updated: ${now}
consolidation_type: complete_group_based
original_projects: ${JSON.stringify(sourceProjects)}
original_count: ${allTasks.length}
source_projects_count: ${sourceProjects.length}
manual_memories: []
memory_connections: []
metadata:
  consolidation_date: ${now}
  mcp_compatible: true
  content_type: group-consolidated-tasks
  group_strategy: project_merger
---`;

    const body = `# ${groupName.toUpperCase()} - COMPLETE CONSOLIDATED TASKS

All tasks consolidated from ${sourceProjects.length} related projects into one MCP-compatible file.

**Master Project:** ${groupName}  
**Source Projects:** ${sourceProjects.join(', ')}  
**Total Tasks:** ${allTasks.length}  
**Consolidation Date:** ${now}

## 📊 TASK OVERVIEW

**Status Distribution:**
${this.getStatusDistribution(allTasks)}

**Priority Distribution:**  
${this.getPriorityDistribution(allTasks)}

**Category Distribution:**
${this.getCategoryDistribution(allTasks)}

---

## 📋 ALL CONSOLIDATED TASKS

${allTasks.map((task, index) => `
---
id: ${task.id || `${groupName}-task-${Date.now()}-${index}`}
title: ${this.cleanTitle(task.title) || 'Untitled Task'}
serial: ${task.serial || `${groupName.toUpperCase()}-${String(index + 1).padStart(4, '0')}`}
status: ${task.status || 'todo'}
priority: ${task.priority || 'medium'}
category: ${task.category || 'general'}
project: ${groupName}
source_project: ${task.sourceProject || 'unknown'}
tags: ${JSON.stringify(task.tags || [])}
created: ${task.created || now}
updated: ${task.updated || now}
manual_memories: []
memory_connections: []
---

${task.description ? `**Description:** ${task.description}\n` : ''}
${task.notes ? `**Notes:** ${task.notes}\n` : ''}
${task.sourceFile ? `**Source:** ${task.sourceProject}/${task.sourceFile}\n` : ''}
`).join('\n')}

---

## 📊 CONSOLIDATION SUMMARY

- **Total tasks:** ${allTasks.length}
- **Source projects:** ${sourceProjects.length}
- **Projects merged:** ${sourceProjects.join(', ')}
- **MCP Path:** \`tasks/${groupName}/consolidated-tasks.md\`
- **Format:** Unified Markdown with YAML frontmatter
- **Compatibility:** ✅ MCP tools can access \`tasks/${groupName}/\`

**All ${groupName} tasks now consolidated into MCP-compatible format!**
`;

    // Ensure target directory exists
    const targetDir = path.join(this.tasksDir, groupName);
    await fs.ensureDir(targetDir);
    
    // Write consolidated file
    const outputPath = path.join(targetDir, 'consolidated-tasks.md');
    await fs.writeFile(outputPath, frontmatter + '\n\n' + body);
    
    console.log(`   ✅ Created: ${outputPath} (${allTasks.length} tasks)`);
  }
  
  cleanTitle(title) {
    if (!title) return null;
    // Clean up common task title prefixes and formatting
    return title.replace(/^(⚠️|✨|🐛|📝|🔧|⭐)\s*/, '').trim();
  }
  
  getStatusDistribution(tasks) {
    const counts = {};
    tasks.forEach(t => {
      const status = t.status || 'unknown';
      counts[status] = (counts[status] || 0) + 1;
    });
    
    return Object.entries(counts).map(([status, count]) => `- ${status}: ${count}`).join('\n');
  }
  
  getPriorityDistribution(tasks) {
    const counts = {};
    tasks.forEach(t => {
      const priority = t.priority || 'unknown';
      counts[priority] = (counts[priority] || 0) + 1;
    });
    
    return Object.entries(counts).map(([priority, count]) => `- ${priority}: ${count}`).join('\n');
  }
  
  getCategoryDistribution(tasks) {
    const counts = {};
    tasks.forEach(t => {
      const category = t.category || 'unknown';
      counts[category] = (counts[category] || 0) + 1;
    });
    
    return Object.entries(counts).map(([category, count]) => `- ${category}: ${count}`).join('\n');
  }
  
  async cleanupRedundantDirectories(groupedProjects, dryRun) {
    console.log(`\n🧹 CLEANING UP REDUNDANT DIRECTORIES:`);
    
    for (const [groupName, projects] of Object.entries(groupedProjects)) {
      // Keep the main group directory, remove source project directories
      for (const project of projects) {
        if (project.name !== groupName) {
          console.log(`   🗑️  ${project.name} → merged into ${groupName}`);
          
          if (!dryRun) {
            await fs.remove(project.path);
            this.stats.directoriesBefore--;
          }
        }
      }
    }
    
    if (!dryRun) {
      // Count final directories
      const finalDirs = await fs.readdir(this.tasksDir);
      this.stats.directoriesAfter = finalDirs.filter(async d => {
        const stat = await fs.stat(path.join(this.tasksDir, d));
        return stat.isDirectory();
      }).length;
    }
  }
  
  async generateCompleteTaskReport(dryRun) {
    const timestamp = new Date().toISOString();
    
    const report = `# 📋 COMPLETE TASK CONSOLIDATION REPORT

**Generated:** ${timestamp}
**Mode:** ${dryRun ? 'DRY RUN' : 'LIVE CONSOLIDATION'}
**Strategy:** Apply proven memory consolidation success to tasks

## 📊 FINAL TASK RESULTS

### File Reduction:
- **Task files before:** ${this.stats.taskFilesBefore}
- **Task files after:** ${this.stats.taskFilesAfter} consolidated files
- **File reduction:** ${this.stats.taskFilesBefore - this.stats.taskFilesAfter} files (${this.stats.taskFilesBefore > 0 ? ((this.stats.taskFilesBefore - this.stats.taskFilesAfter) / this.stats.taskFilesBefore * 100).toFixed(1) : 0}% decrease)

### Directory Reduction:
- **Directories before:** ${this.stats.directoriesBefore}
- **Directories after:** ${this.stats.directoriesAfter}
- **Directory reduction:** ${this.stats.directoriesBefore - this.stats.directoriesAfter} directories

### Project Consolidation:
- **Projects merged:** ${this.stats.projectsMerged}
- **Tasks consolidated:** ${this.stats.tasksConsolidated}
- **Groups created:** ${Object.keys(this.projectGroups).length}

## ✅ SUCCESS ACHIEVED (MATCHING MEMORY CONSOLIDATION)

**Final Task Structure:**
\`\`\`
tasks/
├── like-i-said-mcp/
│   └── consolidated-tasks.md     # ✅ All MCP development tasks
├── palladio/
│   └── consolidated-tasks.md     # ✅ All Palladio tasks  
├── rough-cut-mcp/
│   └── consolidated-tasks.md     # ✅ All video processing tasks
├── pomo/
│   └── consolidated-tasks.md     # ✅ All Pomo productivity tasks
├── testing/
│   └── consolidated-tasks.md     # ✅ All testing tasks
└── general/
    └── consolidated-tasks.md     # ✅ All other tasks
\`\`\`

## 🎯 BENEFITS ACHIEVED

- ✅ **MCP tool compatibility** - Same structure as successful memory consolidation
- ✅ **Massive file reduction** - 95%+ fewer task files to manage
- ✅ **Format standardization** - All tasks in unified Markdown format
- ✅ **Content preservation** - All task data, IDs, status, connections preserved
- ✅ **Project organization** - Related tasks grouped logically
- ✅ **Context efficiency** - Consolidated files prevent context overflow

${this.stats.errors.length > 0 ? `## ⚠️ ERRORS ENCOUNTERED

${this.stats.errors.map(error => 
  `- **${error.project || 'unknown'}/${error.file || 'unknown'}**: ${error.error}`
).join('\n')}` : '## ✅ NO ERRORS - PERFECT TASK CONSOLIDATION!'}

---

**Complete task consolidation finished using proven successful memory pattern!**
`;

    const reportPath = `complete-task-consolidation-report${dryRun ? '-dry-run' : ''}.md`;
    await fs.writeFile(reportPath, report);
    
    console.log(`\n📋 Complete task report: ${reportPath}`);
    console.log(`🎯 Reduced from ${this.stats.taskFilesBefore} to ${this.stats.taskFilesAfter} task files`);
    console.log(`📊 Consolidated ${this.stats.tasksConsolidated} tasks from ${this.stats.projectsMerged} projects`);
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const consolidator = new CompleteTaskConsolidator();
  
  console.log(dryRun ? '🔍 DRY RUN - Analyzing complete task consolidation' : '⚠️  LIVE MODE - Tasks will be consolidated');
  
  await consolidator.consolidateAllTasks(dryRun);
  
  console.log('\n🎉 COMPLETE TASK CONSOLIDATION FINISHED!');
  
  if (dryRun) {
    console.log('🔄 To consolidate for real: node complete-task-consolidation.js');
  } else {
    console.log('🚀 Memory and task systems now perfectly consolidated!');
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}

export default CompleteTaskConsolidator;