#!/usr/bin/env node

/**
 * Format Analyzer
 * 
 * Analyze all formats across consolidated storage to understand
 * what needs standardization for universal MCP access.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Results storage
const formatAnalysis = {
  taskFormats: new Map(),
  memoryFormats: new Map(),
  emptyDirectories: [],
  invalidData: [],
  standardCompliant: []
};

function analyzeTaskDirectory(projectPath, projectName) {
  const analysis = {
    project: projectName,
    path: projectPath,
    format: 'unknown',
    hasData: false,
    fileCount: 0,
    issues: []
  };
  
  try {
    if (!fs.existsSync(projectPath)) {
      analysis.issues.push('Directory does not exist');
      return analysis;
    }
    
    const files = fs.readdirSync(projectPath);
    analysis.fileCount = files.length;
    
    if (files.length === 0) {
      analysis.format = 'empty';
      formatAnalysis.emptyDirectories.push(analysis);
      return analysis;
    }
    
    // Check for tasks.json (standard format)
    const tasksJson = path.join(projectPath, 'tasks.json');
    if (fs.existsSync(tasksJson)) {
      try {
        const data = JSON.parse(fs.readFileSync(tasksJson, 'utf8'));
        
        if (Array.isArray(data)) {
          analysis.format = 'tasks.json-array';
          analysis.hasData = data.length > 0;
          
          // Validate task object structure
          if (data.length > 0) {
            const firstTask = data[0];
            const requiredFields = ['id', 'title', 'status', 'project'];
            const missingFields = requiredFields.filter(field => !firstTask.hasOwnProperty(field));
            
            if (missingFields.length === 0) {
              analysis.format = 'standard-compliant';
              formatAnalysis.standardCompliant.push(analysis);
            } else {
              analysis.issues.push(`Missing fields: ${missingFields.join(', ')}`);
            }
          }
        } else {
          analysis.format = 'tasks.json-object';
          analysis.issues.push('tasks.json is object, not array');
        }
      } catch (error) {
        analysis.format = 'tasks.json-invalid';
        analysis.issues.push(`JSON parse error: ${error.message}`);
      }
    }
    
    // Check for individual task files
    const taskFiles = files.filter(f => f.startsWith('task-') && f.endsWith('.md'));
    if (taskFiles.length > 0) {
      analysis.format = 'individual-md-files';
      analysis.hasData = true;
      analysis.issues.push(`Has ${taskFiles.length} individual .md task files`);
    }
    
    // Check for subdirectories (nested structure)
    const subdirs = files.filter(file => {
      const filePath = path.join(projectPath, file);
      try {
        return fs.statSync(filePath).isDirectory();
      } catch {
        return false;
      }
    });
    
    if (subdirs.length > 0) {
      analysis.format = 'nested-directories';
      analysis.issues.push(`Has ${subdirs.length} subdirectories: ${subdirs.join(', ')}`);
    }
    
  } catch (error) {
    analysis.format = 'error';
    analysis.issues.push(`Analysis error: ${error.message}`);
  }
  
  return analysis;
}

function analyzeMemoryDirectory(projectPath, projectName) {
  const analysis = {
    project: projectName,
    path: projectPath,
    format: 'unknown',
    hasData: false,
    fileCount: 0,
    issues: []
  };
  
  try {
    if (!fs.existsSync(projectPath)) {
      analysis.issues.push('Directory does not exist');
      return analysis;
    }
    
    const files = fs.readdirSync(projectPath);
    analysis.fileCount = files.length;
    
    if (files.length === 0) {
      analysis.format = 'empty';
      return analysis;
    }
    
    const memoryFiles = files.filter(f => f.endsWith('.md'));
    
    if (memoryFiles.length > 0) {
      analysis.hasData = true;
      analysis.format = 'markdown-files';
      
      // Check first memory file for frontmatter format
      const firstMemory = path.join(projectPath, memoryFiles[0]);
      const content = fs.readFileSync(firstMemory, 'utf8');
      
      if (content.startsWith('---')) {
        analysis.format = 'standard-frontmatter';
        
        // Try to parse frontmatter
        const frontmatterEnd = content.indexOf('---', 3);
        if (frontmatterEnd > 0) {
          const frontmatter = content.substring(4, frontmatterEnd);
          
          // Check for required fields
          const hasId = frontmatter.includes('id:');
          const hasTimestamp = frontmatter.includes('timestamp:');
          const hasProject = frontmatter.includes('project:');
          
          if (hasId && hasTimestamp && hasProject) {
            analysis.format = 'standard-compliant';
            formatAnalysis.standardCompliant.push(analysis);
          } else {
            const missing = [];
            if (!hasId) missing.push('id');
            if (!hasTimestamp) missing.push('timestamp'); 
            if (!hasProject) missing.push('project');
            analysis.issues.push(`Missing frontmatter: ${missing.join(', ')}`);
          }
        } else {
          analysis.issues.push('Invalid frontmatter structure');
        }
      } else {
        analysis.format = 'plain-markdown';
        analysis.issues.push('No YAML frontmatter');
      }
    }
    
    // Check for other file types
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    if (jsonFiles.length > 0) {
      analysis.issues.push(`Has ${jsonFiles.length} JSON files in memory directory`);
    }
    
  } catch (error) {
    analysis.format = 'error';
    analysis.issues.push(`Analysis error: ${error.message}`);
  }
  
  return analysis;
}

// Main analysis process
function analyzeAllFormats() {
  console.log('🔍 Starting comprehensive format analysis...');
  console.log(`📁 Target: ${__dirname}\\n`);
  
  // Analyze task directories
  const taskDir = path.join(__dirname, 'tasks');
  if (fs.existsSync(taskDir)) {
    const taskProjects = fs.readdirSync(taskDir);
    console.log(`📋 Analyzing ${taskProjects.length} task project directories...\\n`);
    
    taskProjects.forEach((projectName, index) => {
      console.log(`📂 ${index + 1}/${taskProjects.length}: ${projectName}`);
      const projectPath = path.join(taskDir, projectName);
      const analysis = analyzeTaskDirectory(projectPath, projectName);
      
      console.log(`  Format: ${analysis.format}, Files: ${analysis.fileCount}, Data: ${analysis.hasData}`);
      if (analysis.issues.length > 0) {
        console.log(`  Issues: ${analysis.issues.join('; ')}`);
      }
      
      // Store in format map
      if (!formatAnalysis.taskFormats.has(analysis.format)) {
        formatAnalysis.taskFormats.set(analysis.format, []);
      }
      formatAnalysis.taskFormats.get(analysis.format).push(analysis);
    });
  }
  
  // Analyze memory directories
  console.log('\\n🧠 Analyzing memory project directories...\\n');
  const memoryDir = path.join(__dirname, 'memories');
  if (fs.existsSync(memoryDir)) {
    const memoryProjects = fs.readdirSync(memoryDir);
    console.log(`📋 Analyzing ${memoryProjects.length} memory project directories...\\n`);
    
    memoryProjects.slice(0, 20).forEach((projectName, index) => {
      console.log(`📂 ${index + 1}/20: ${projectName} (showing first 20 only)`);
      const projectPath = path.join(memoryDir, projectName);
      const analysis = analyzeMemoryDirectory(projectPath, projectName);
      
      console.log(`  Format: ${analysis.format}, Files: ${analysis.fileCount}, Data: ${analysis.hasData}`);
      if (analysis.issues.length > 0) {
        console.log(`  Issues: ${analysis.issues.slice(0, 2).join('; ')}${analysis.issues.length > 2 ? '...' : ''}`);
      }
      
      // Store in format map
      if (!formatAnalysis.memoryFormats.has(analysis.format)) {
        formatAnalysis.memoryFormats.set(analysis.format, []);
      }
      formatAnalysis.memoryFormats.get(analysis.format).push(analysis);
    });
    
    if (memoryProjects.length > 20) {
      console.log(`  ... and ${memoryProjects.length - 20} more memory projects`);
    }
  }
  
  generateFormatReport();
}

function generateFormatReport() {
  console.log('\\n' + '='.repeat(80));
  console.log('🎯 FORMAT ANALYSIS REPORT');
  console.log('='.repeat(80));
  
  console.log('\\n📋 TASK FORMAT DISTRIBUTION:');
  formatAnalysis.taskFormats.forEach((projects, format) => {
    console.log(`  ${format}: ${projects.length} projects`);
    if (format === 'standard-compliant') {
      console.log(`    ✅ Ready for MCP access`);
    } else if (format === 'empty') {
      console.log(`    📁 Need task data migration`);
    } else {
      console.log(`    🔄 Need format conversion`);
    }
  });
  
  console.log('\\n🧠 MEMORY FORMAT DISTRIBUTION:');
  formatAnalysis.memoryFormats.forEach((projects, format) => {
    console.log(`  ${format}: ${projects.length} projects`);
    if (format === 'standard-compliant') {
      console.log(`    ✅ Ready for MCP access`);
    } else if (format === 'empty') {
      console.log(`    📁 Empty memory directories`);
    } else {
      console.log(`    🔄 Need format standardization`);
    }
  });
  
  console.log('\\n🎯 STANDARDIZATION REQUIRED:');
  
  const needsTaskConversion = Array.from(formatAnalysis.taskFormats.entries())
    .filter(([format]) => format !== 'standard-compliant' && format !== 'empty')
    .reduce((sum, [, projects]) => sum + projects.length, 0);
  
  const needsMemoryConversion = Array.from(formatAnalysis.memoryFormats.entries())
    .filter(([format]) => format !== 'standard-compliant' && format !== 'empty')
    .reduce((sum, [, projects]) => sum + projects.length, 0);
  
  const emptyTaskDirs = formatAnalysis.taskFormats.get('empty')?.length || 0;
  const emptyMemoryDirs = formatAnalysis.memoryFormats.get('empty')?.length || 0;
  
  console.log(`  📋 Task projects needing format conversion: ${needsTaskConversion}`);
  console.log(`  🧠 Memory projects needing format conversion: ${needsMemoryConversion}`);
  console.log(`  📁 Empty task directories needing data: ${emptyTaskDirs}`);
  console.log(`  📁 Empty memory directories: ${emptyMemoryDirs}`);
  
  const standardCompliantTasks = formatAnalysis.taskFormats.get('standard-compliant')?.length || 0;
  const standardCompliantMemories = formatAnalysis.memoryFormats.get('standard-compliant')?.length || 0;
  
  console.log(`\\n✅ Already standard-compliant:`);
  console.log(`  📋 Task projects: ${standardCompliantTasks}`);
  console.log(`  🧠 Memory projects: ${standardCompliantMemories}`);
  
  console.log('\\n🚀 NEXT STEPS:');
  console.log('1. Create format converter for non-standard projects');
  console.log('2. Migrate missing task data to empty directories');  
  console.log('3. Standardize all memory frontmatter');
  console.log('4. Validate MCP server access after standardization');
  console.log('5. Test universal monitor functionality');
}

analyzeAllFormats();