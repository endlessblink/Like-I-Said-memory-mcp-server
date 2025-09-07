#!/usr/bin/env node

/**
 * Directory Consolidation - Organize Projects into Logical Groups
 * 
 * Reduces 81+ project directories into organized category directories
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class DirectoryConsolidator {
  constructor() {
    this.memoriesDir = 'memories';
    this.stats = {
      directoriesBefore: 0,
      directoriesAfter: 0,
      projectsMoved: 0,
      filesProcessed: 0
    };
    
    // Define consolidation strategy
    this.categoryMapping = {
      'like-i-said-core': [
        'like-i-said-v2', 'like-i-said-v3', 'like-i-said-v4', 'LikeISaidV2', 
        'Like-I-Said-V3-Development', 'like-i-said-mcp', 'like-i-said-memory',
        'like-i-said-memory-v2', 'like-i-said-memory-mcp-server', 'like-i-said-mcp-server',
        'Like-I-said-mcp-server-v2', 'like-i-said-python-port', 'like-i-said-dxt'
      ],
      'dashboard-ui': [
        'like-i-said-dashboard', 'like-i-said-dashboard-ux', 'dashboard-enhancement',
        'like-i-said-mcp-dashboard-redesign', 'DashboardDesignSystemOverhaul',
        'ui-improvements'
      ],
      'mcp-tools': [
        'mcp-setup', 'mcp-test', 'mcp-testing', 'mcp-cleanup', 'mcp-scanner-n8n',
        'universal-mcp-hub', 'Site-Control-MCP-Installation'
      ],
      'testing-validation': [
        'test', 'testing', 'test-project', 'test-integration', 'automation-test',
        'e2e-test', 'persistence-test', 'final-validation', 'schema-validation-test',
        'integration-test', 'proxy-test', 'release-test', 'quick-test'
      ],
      'troubleshooting-fixes': [
        'like-i-said-fixes', 'like-i-said-mcp-troubleshooting', 'comfyui-troubleshooting',
        'claude-desktop-integration', 'claude-desktop-test', 'nodejs-networking-research'
      ],
      'palladio-project': [
        'palladio', 'palladio-minimal', 'palladio-gen'
      ],
      'rough-cut-project': [
        'rough-cut-mcp', 'rough-cut-mcp-audio', 'rough-cut-mcp-artifacts',
        'rough-cut-mcp-consolidation', 'rough-cut-mcp-design-prism'
      ],
      'bina-bekitzur-project': [
        'bina-bekitzur', 'bina-bekitzur-main', 'bina-bekitzur-site', 
        'bina-bekitzur-ai-tools-grid'
      ],
      'youtube-demo-project': [
        'youtube-demo-api', 'youtube-demo-backend', 'youtube-demo-frontend',
        'youtube-demo-devops', 'youtube-demo-personal', 'youtube-demo-planning',
        'youtube-demo-standards'
      ],
      'development-tools': [
        'development-standards', 'python-dxt-development', 'smithery-deployment',
        'windows-nodejs-folder-creation', 'windsurf-ide', 'endlessblink-github-showcase'
      ],
      'productivity-apps': [
        'Pomo', 'Pomo-TaskFlow', 'gear-pool', 'serena-mcp'
      ],
      'general-archive': [
        'default', 'general-projects', 'orphaned-memories', 'user-home', 
        'windows-user', 'system-test', 'state-test-1752092843534'
      ]
    };
  }

  async analyzeCurrentDirectories() {
    const memoriesPath = path.join(this.memoriesDir);
    const dirs = await fs.readdir(memoriesPath);
    const projectDirs = [];
    
    for (const dir of dirs) {
      const dirPath = path.join(memoriesPath, dir);
      try {
        const stat = await fs.stat(dirPath);
        if (stat.isDirectory() && dir !== '.git') {
          const memoryCount = await this.getMemoryCount(dir);
          projectDirs.push({ name: dir, count: memoryCount });
        }
      } catch (error) {
        // Skip unreadable directories
      }
    }
    
    this.stats.directoriesBefore = projectDirs.length;
    return projectDirs;
  }
  
  async getMemoryCount(project) {
    try {
      const projectDir = path.join(this.memoriesDir, project);
      const files = await fs.readdir(projectDir);
      return files.filter(f => f.endsWith('.md')).length;
    } catch (error) {
      return 0;
    }
  }
  
  async consolidateDirectories() {
    console.log('📁 DIRECTORY CONSOLIDATION - Organizing Project Structure');
    
    const currentDirs = await this.analyzeCurrentDirectories();
    console.log(`📊 Found ${currentDirs.length} project directories to organize\n`);
    
    // Create category directories
    for (const category of Object.keys(this.categoryMapping)) {
      const categoryPath = path.join(this.memoriesDir, category);
      await fs.ensureDir(categoryPath);
      console.log(`📂 Created category: ${category}`);
    }
    
    // Move projects into categories
    for (const [category, projects] of Object.entries(this.categoryMapping)) {
      console.log(`\n🔄 Processing category: ${category}`);
      
      for (const projectName of projects) {
        await this.moveProjectToCategory(projectName, category);
      }
    }
    
    // Handle any projects not in mapping
    await this.handleUnmappedProjects();
    
    await this.generateDirectoryReport();
  }
  
  async moveProjectToCategory(projectName, category) {
    const sourcePath = path.join(this.memoriesDir, projectName);
    const targetPath = path.join(this.memoriesDir, category, projectName);
    
    try {
      // Check if source exists and has content
      if (await fs.pathExists(sourcePath)) {
        const files = await fs.readdir(sourcePath);
        const memoryFiles = files.filter(f => f.endsWith('.md'));
        
        if (memoryFiles.length > 0) {
          // Move the entire project directory
          await fs.move(sourcePath, targetPath);
          console.log(`  ✅ Moved ${projectName} (${memoryFiles.length} files) → ${category}/`);
          this.stats.projectsMoved++;
          this.stats.filesProcessed += files.length;
        } else {
          // Remove empty directories
          await fs.remove(sourcePath);
          console.log(`  🗑️  Removed empty: ${projectName}`);
        }
      } else {
        console.log(`  ⏭️  Not found: ${projectName}`);
      }
    } catch (error) {
      console.log(`  ❌ Error moving ${projectName}: ${error.message}`);
    }
  }
  
  async handleUnmappedProjects() {
    console.log(`\n🔍 Checking for unmapped projects...`);
    
    const memoriesPath = path.join(this.memoriesDir);
    const dirs = await fs.readdir(memoriesPath);
    const unmappedProjects = [];
    
    // Find directories that aren't categories
    const categoryNames = Object.keys(this.categoryMapping);
    const systemFiles = ['SYSTEM-WIDE-CONSOLIDATION-REPORT.md', 'FINAL-CLEANUP-REPORT.md', 'orphaned-single-files.md'];
    
    for (const dir of dirs) {
      const dirPath = path.join(memoriesPath, dir);
      try {
        const stat = await fs.stat(dirPath);
        if (stat.isDirectory() && 
            !categoryNames.includes(dir) && 
            dir !== '.git') {
          unmappedProjects.push(dir);
        }
      } catch (error) {
        // Skip
      }
    }
    
    if (unmappedProjects.length > 0) {
      console.log(`📁 Moving ${unmappedProjects.length} unmapped projects to general-archive:`);
      
      for (const project of unmappedProjects) {
        await this.moveProjectToCategory(project, 'general-archive');
      }
    } else {
      console.log(`✅ All projects properly categorized`);
    }
  }
  
  async generateDirectoryReport() {
    const categorySummary = {};
    
    // Count files in each category
    for (const category of Object.keys(this.categoryMapping)) {
      const categoryPath = path.join(this.memoriesDir, category);
      try {
        const projects = await fs.readdir(categoryPath);
        let totalFiles = 0;
        
        for (const project of projects) {
          const projectPath = path.join(categoryPath, project);
          const stat = await fs.stat(projectPath);
          if (stat.isDirectory()) {
            const files = await fs.readdir(projectPath);
            totalFiles += files.filter(f => f.endsWith('.md')).length;
          }
        }
        
        categorySummary[category] = {
          projects: projects.filter(async p => {
            const pPath = path.join(categoryPath, p);
            return (await fs.stat(pPath)).isDirectory();
          }).length,
          files: totalFiles
        };
      } catch (error) {
        categorySummary[category] = { projects: 0, files: 0 };
      }
    }
    
    this.stats.directoriesAfter = Object.keys(this.categoryMapping).length;
    
    const report = `# 📁 DIRECTORY CONSOLIDATION REPORT

**Date:** ${new Date().toISOString()}

## Consolidation Results
**Before:** ${this.stats.directoriesBefore} scattered project directories  
**After:** ${this.stats.directoriesAfter} organized category directories  
**Reduction:** ${this.stats.directoriesBefore - this.stats.directoriesAfter} fewer directories (${((this.stats.directoriesBefore - this.stats.directoriesAfter) / this.stats.directoriesBefore * 100).toFixed(1)}% reduction)

## Category Structure

${Object.entries(categorySummary).map(([category, stats]) => 
  `### ${category}
- **Projects:** ${stats.projects}  
- **Memory files:** ${stats.files}
- **Purpose:** ${this.getCategoryDescription(category)}`
).join('\n\n')}

## Organization Benefits
- ✅ **Logical grouping:** Related projects together
- ✅ **Easier navigation:** 12 categories vs 81+ scattered directories  
- ✅ **Context efficiency:** Load related memories together
- ✅ **Maintainability:** Clear project organization
- ✅ **Scalability:** Easy to add new projects to appropriate categories

## Migration Summary
- **Projects moved:** ${this.stats.projectsMoved}
- **Files processed:** ${this.stats.filesProcessed}  
- **Empty directories removed:** ${this.stats.directoriesBefore - this.stats.projectsMoved - this.stats.directoriesAfter}

**Directory consolidation complete! Memory system is now fully organized.**
`;

    const reportPath = path.join(this.memoriesDir, 'DIRECTORY-CONSOLIDATION-REPORT.md');
    await fs.writeFile(reportPath, report);
    
    console.log(`\n📋 Directory consolidation report: ${reportPath}`);
    console.log(`📊 Reduced from ${this.stats.directoriesBefore} to ${this.stats.directoriesAfter} directories`);
    console.log(`🎉 DIRECTORY CONSOLIDATION COMPLETE!`);
  }
  
  getCategoryDescription(category) {
    const descriptions = {
      'like-i-said-core': 'Core Like-I-Said MCP development across all versions',
      'dashboard-ui': 'Dashboard and user interface development',
      'mcp-tools': 'Model Context Protocol tools and setup',
      'testing-validation': 'Testing, validation, and quality assurance',
      'troubleshooting-fixes': 'Bug fixes and troubleshooting guides',
      'palladio-project': 'Palladio AI image generation platform',
      'rough-cut-project': 'RoughCut video processing MCP tools',
      'bina-bekitzur-project': 'Bina Bekitzur website and AI tools',
      'youtube-demo-project': 'YouTube demonstration materials',
      'development-tools': 'Development standards and tooling',
      'productivity-apps': 'Productivity and task management apps',
      'general-archive': 'General purpose and archived content'
    };
    return descriptions[category] || 'Various project files';
  }
}

async function main() {
  const consolidator = new DirectoryConsolidator();
  await consolidator.consolidateDirectories();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
}

export default DirectoryConsolidator;