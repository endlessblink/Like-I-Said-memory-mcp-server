#!/usr/bin/env node

/**
 * Simple Task Monitor - Bulletproof Edition
 * 
 * Uses direct subprocess calls to working MCP tools.
 * No complex TaskStorage, no hybrid approaches - just works.
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Simple configuration
const config = {
  refreshInterval: 3000,
  filter: 'active'
};

// Parse arguments
function parseArgs() {
  const args = process.argv.slice(2);
  args.forEach(arg => {
    if (arg.startsWith('--filter=')) config.filter = arg.split('=')[1];
    if (arg.startsWith('--refresh=')) config.refreshInterval = parseFloat(arg.split('=')[1].replace('s', '')) * 1000;
    if (arg.startsWith('--project=')) config.project = arg.split('=')[1];
  });
  
  // Use passed project name or detect from directory
  if (!config.project) {
    config.project = process.env.PROJECT_NAME || path.basename(process.cwd());
  }
}

// Colors (simple ANSI)
const colors = {
  reset: '\x1b[0m', bold: '\x1b[1m', red: '\x1b[31m', green: '\x1b[32m',
  yellow: '\x1b[33m', blue: '\x1b[34m', cyan: '\x1b[36m', white: '\x1b[37m',
  gray: '\x1b[90m', redBg: '\x1b[41m', yellowBg: '\x1b[43m', inverse: '\x1b[7m'
};

// Get tasks using direct filesystem reading of unified storage
async function getTasks(projectName) {
  const fs = await import('fs');
  const path = await import('path');
  
  try {
    // Read directly from unified storage location
    const unifiedStoragePath = '/mnt/d/APPSNospaces/like-i-said-mcp';
    const projectTasksPath = path.join(unifiedStoragePath, 'tasks', projectName);
    
    // Check for both JSON and Markdown formats
    const jsonPath = path.join(projectTasksPath, 'tasks.json');
    const mdPath = path.join(projectTasksPath, 'consolidated-tasks.md');
    
    // Try JSON format first (newer format)
    if (fs.existsSync(jsonPath)) {
      const tasksData = fs.readFileSync(jsonPath, 'utf8');
      const tasks = JSON.parse(tasksData);
      console.log(`📊 [DEBUG] Found ${tasks.length} tasks in JSON format`);
      return Array.isArray(tasks) ? tasks : [];
    }
    
    // Try consolidated markdown format (YAML frontmatter format)
    if (fs.existsSync(mdPath)) {
      const tasksData = fs.readFileSync(mdPath, 'utf8');
      // Parse YAML frontmatter format tasks
      const taskBlocks = tasksData.split(/\n---\n/).filter(block => 
        block.includes('id: TASK-') && block.includes('title:')
      );
      
      const tasks = taskBlocks.map(taskBlock => {
        const lines = taskBlock.split('\n');
        const task = { project: projectName };
        
        lines.forEach(line => {
          const [key, ...valueParts] = line.split(':');
          if (key && valueParts.length > 0) {
            const value = valueParts.join(':').trim();
            switch(key.trim()) {
              case 'id': task.id = value; break;
              case 'title': task.title = value; break;
              case 'status': task.status = value; break;
              case 'priority': task.priority = value; break;
              case 'created': task.created = value; break;
              case 'updated': task.updated = value; break;
            }
          }
        });
        
        // Get description from content after frontmatter
        const contentMatch = taskBlock.match(/---\n\n(.+)$/s);
        if (contentMatch) {
          task.description = contentMatch[1].trim();
        }
        
        return task;
      }).filter(task => task.id && task.title);
      
      console.log(`📊 [DEBUG] Found ${tasks.length} tasks in YAML frontmatter format`);
      return tasks;
    }
    
    console.log(`📊 [DEBUG] No tasks found for project: ${projectName}`);
    return [];
    
  } catch (error) {
    console.error(`❌ [DEBUG] Error reading tasks for ${projectName}:`, error.message);
    return [];
  }
}

// Format tasks for display
function formatTasks(tasks, projectName) {
  if (tasks.length === 0) {
    return `${colors.green}✨ No tasks found for ${projectName}${colors.reset}`;
  }
  
  // Filter by status
  let filtered = tasks;
  if (config.filter === 'active') {
    filtered = tasks.filter(t => ['todo', 'in_progress'].includes(t.status));
  } else if (config.filter !== 'all') {
    filtered = tasks.filter(t => t.status === config.filter);
  }
  
  if (filtered.length === 0) {
    return `${colors.green}✨ No ${config.filter} tasks! You're all caught up.${colors.reset}`;
  }
  
  // Sort: urgent first, then in_progress before todo
  filtered.sort((a, b) => {
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    const statusOrder = { in_progress: 0, todo: 1, blocked: 2 };
    
    // Priority first
    const priorityDiff = (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
    if (priorityDiff !== 0) return priorityDiff;
    
    // Status second
    const statusDiff = (statusOrder[a.status] || 1) - (statusOrder[b.status] || 1);
    if (statusDiff !== 0) return statusDiff;
    
    return (a.title || '').localeCompare(b.title || '');
  });
  
  // Group by status
  const active = filtered.filter(t => t.status === 'in_progress');
  const todo = filtered.filter(t => t.status === 'todo'); 
  const blocked = filtered.filter(t => t.status === 'blocked');
  
  let output = '';
  
  // Header
  output += `${colors.blue}${colors.bold}📋 ${projectName} Tasks (${filtered.length} ${config.filter})${colors.reset}\n`;
  output += '─'.repeat(80) + '\n\n';
  
  // Active tasks
  if (active.length > 0) {
    output += `${colors.cyan}${colors.inverse} 🔥 CURRENTLY ACTIVE (${active.length}) ${colors.reset}\n\n`;
    active.forEach(task => {
      const priority = task.priority === 'urgent' ? `${colors.redBg}${colors.white} 🔥 URGENT ${colors.reset}` :
                       task.priority === 'high' ? `${colors.yellowBg} ⚡ HIGH ${colors.reset}` :
                       `${colors.blue}${task.priority || 'MED'}${colors.reset}`;
      output += `${colors.cyan}${colors.bold}▶▶ ACTIVE${colors.reset} │ ${priority} │ ${colors.cyan}${task.id}${colors.reset} │ ${colors.white}${colors.bold}${task.title}${colors.reset}\n`;
      if (task.description) {
        const desc = task.description.slice(0, 100) + (task.description.length > 100 ? '...' : '');
        output += `${colors.cyan}    ➤ ${desc}${colors.reset}\n`;
      }
      output += '\n';
    });
  }
  
  // Todo tasks
  if (todo.length > 0) {
    output += `${colors.white}${colors.bold} 📋 NEXT ACTIONS (${todo.length}) ${colors.reset}\n\n`;
    todo.slice(0, 10).forEach(task => {
      const priority = task.priority === 'urgent' ? `${colors.redBg}${colors.white} 🔥 URGENT ${colors.reset}` :
                       task.priority === 'high' ? `${colors.yellowBg} ⚡ HIGH ${colors.reset}` :
                       `${colors.blue}${task.priority || 'MED'}${colors.reset}`;
      output += `${colors.white}● TODO${colors.reset}     │ ${priority} │ ${colors.blue}${task.id}${colors.reset} │ ${colors.white}${colors.bold}${task.title}${colors.reset}\n`;
      if (task.description && todo.length <= 5) {
        const desc = task.description.slice(0, 100) + (task.description.length > 100 ? '...' : '');
        output += `${colors.gray}    ${desc}${colors.reset}\n`;
      }
      output += '\n';
    });
    if (todo.length > 10) {
      output += `${colors.gray}... and ${todo.length - 10} more todo tasks${colors.reset}\n\n`;
    }
  }
  
  // Blocked tasks
  if (blocked.length > 0) {
    output += `${colors.red}${colors.bold} ⚠ BLOCKED TASKS (${blocked.length}) ${colors.reset}\n\n`;
    blocked.forEach(task => {
      const priority = `${colors.red}${task.priority || 'MED'}${colors.reset}`;
      output += `${colors.red}⚠ BLOCKED${colors.reset}  │ ${priority} │ ${colors.red}${task.id}${colors.reset} │ ${colors.red}${task.title}${colors.reset}\n`;
      if (task.description) {
        const desc = task.description.slice(0, 100) + (task.description.length > 100 ? '...' : '');
        output += `${colors.gray}    ${desc}${colors.reset}\n`;
      }
      output += '\n';
    });
  }
  
  return output;
}

// Main monitor loop
async function monitor() {
  const projectName = config.project;
  let updateCount = 0;
  
  console.log(`🚀 Starting Simple Task Monitor for ${projectName}`);
  console.log(`📡 Refresh: ${config.refreshInterval/1000}s | Filter: ${config.filter}`);
  
  while (true) {
    try {
      console.clear();
      
      // Header with status
      console.log(`${colors.blue}${colors.bold}🔥 LIVE Task Monitor - ${projectName}${colors.reset}`);
      console.log(`${colors.gray}⏰ ${new Date().toLocaleTimeString()} | Updates: ${updateCount} | Filter: ${config.filter}${colors.reset}`);
      console.log('═'.repeat(80));
      console.log();
      
      // Get tasks for exact project name
      console.log(`🔍 Checking project: ${projectName}`);
      let tasks = await getTasks(projectName);
      
      // If no tasks, try common project variations
      if (tasks.length === 0) {
        const variations = [
          `${projectName}-core`,
          `${projectName}-artifacts`, 
          `${projectName}-design`,
          `${projectName}-main`,
          `${projectName}-development`
        ];
        
        console.log(`🔗 No tasks found, trying variations...`);
        for (const variant of variations) {
          const variantTasks = await getTasks(variant);
          if (variantTasks.length > 0) {
            console.log(`✅ Found ${variantTasks.length} tasks in "${variant}"`);
            tasks.push(...variantTasks);
          }
        }
      }
      
      // Display results
      const output = formatTasks(tasks, projectName);
      console.log(output);
      console.log(`${colors.gray}💡 Press Ctrl+C to exit${colors.reset}`);
      
      updateCount++;
      await new Promise(resolve => setTimeout(resolve, config.refreshInterval));
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, config.refreshInterval));
    }
  }
}

// Graceful exit
process.on('SIGINT', () => {
  console.clear();
  console.log('👋 Simple Task Monitor stopped');
  process.exit(0);
});

// Start
parseArgs();
monitor();