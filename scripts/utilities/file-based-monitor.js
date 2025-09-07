#!/usr/bin/env node

/**
 * Dead-Simple File-Based Task Monitor
 * 
 * No MCP complexity, no server spawning - just reads JSON files directly.
 * Checks both local project files AND Like-I-Said MCP files.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chokidar from 'chokidar';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const config = {
  refreshInterval: 3000,
  filter: 'active',
  project: null
};

// Parse arguments
function parseArgs() {
  const args = process.argv.slice(2);
  args.forEach(arg => {
    if (arg.startsWith('--filter=')) config.filter = arg.split('=')[1];
    if (arg.startsWith('--refresh=')) config.refreshInterval = parseFloat(arg.split('=')[1].replace('s', '')) * 1000;
    if (arg.startsWith('--project=')) config.project = arg.split('=')[1];
  });
  
  // Auto-detect project from current directory
  if (!config.project) {
    config.project = path.basename(process.cwd());
  }
}

// Simple colors
const colors = {
  reset: '\x1b[0m', bold: '\x1b[1m', red: '\x1b[31m', green: '\x1b[32m',
  yellow: '\x1b[33m', blue: '\x1b[34m', cyan: '\x1b[36m', white: '\x1b[37m',
  gray: '\x1b[90m', redBg: '\x1b[41m', yellowBg: '\x1b[43m', inverse: '\x1b[7m'
};

// Read tasks from a directory
function readTasksFromDirectory(taskDir) {
  if (!fs.existsSync(taskDir)) {
    return [];
  }
  
  let allTasks = [];
  
  try {
    const subDirs = fs.readdirSync(taskDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    for (const subDir of subDirs) {
      // Check if this subdirectory relates to our project
      const subDirProject = subDir.toLowerCase();
      const ourProject = config.project.toLowerCase();
      
      if (subDirProject.includes(ourProject) || ourProject.includes(subDirProject)) {
        const tasksFile = path.join(taskDir, subDir, 'tasks.json');
        
        if (fs.existsSync(tasksFile)) {
          try {
            const tasksData = JSON.parse(fs.readFileSync(tasksFile, 'utf8'));
            const tasks = Array.isArray(tasksData) ? tasksData : [tasksData];
            
            console.log(`📄 Found ${tasks.length} tasks in ${subDir} (${path.dirname(tasksFile)})`);
            allTasks.push(...tasks);
          } catch (error) {
            console.log(`⚠️ Error reading ${tasksFile}: ${error.message}`);
          }
        }
      }
    }
  } catch (error) {
    console.log(`❌ Error scanning directory ${taskDir}: ${error.message}`);
  }
  
  return allTasks;
}

// Get all tasks for the current project
function getAllTasks() {
  console.log(`\n🔍 Searching for ${config.project} tasks in both locations...`);
  
  let allTasks = [];
  
  // Location 1: Local project tasks  
  const localTaskDir = path.join(process.cwd(), 'tasks');
  console.log(`📁 Checking local: ${localTaskDir}`);
  const localTasks = readTasksFromDirectory(localTaskDir);
  allTasks.push(...localTasks);
  
  // Location 2: Like-I-Said MCP central storage
  const mcpTaskDir = path.join(__dirname, 'tasks');
  console.log(`📁 Checking central MCP: ${mcpTaskDir}`);
  const mcpTasks = readTasksFromDirectory(mcpTaskDir);
  
  // Merge, avoiding duplicates by ID
  const localIds = new Set(localTasks.map(t => t.id));
  const newMcpTasks = mcpTasks.filter(t => !localIds.has(t.id));
  allTasks.push(...newMcpTasks);
  
  console.log(`📊 Total tasks found: ${allTasks.length} (${localTasks.length} local + ${newMcpTasks.length} central)`);
  
  return allTasks;
}

// Format and display tasks
function displayTasks(tasks) {
  console.clear();
  
  // Header
  console.log(`${colors.blue}${colors.bold}🔥 LIVE Task Monitor - ${config.project}${colors.reset}`);
  console.log(`${colors.gray}⏰ ${new Date().toLocaleTimeString()} | Filter: ${config.filter} | Tasks: ${tasks.length}${colors.reset}`);
  console.log('═'.repeat(80));
  
  if (tasks.length === 0) {
    console.log(`${colors.yellow}\n⚠️  No tasks found for project: ${config.project}${colors.reset}`);
    console.log(`${colors.gray}💡 Try creating tasks or check project name${colors.reset}`);
    return;
  }
  
  // Filter tasks
  let filtered = tasks;
  if (config.filter === 'active') {
    filtered = tasks.filter(t => ['todo', 'in_progress'].includes(t.status));
  } else if (config.filter !== 'all') {
    filtered = tasks.filter(t => t.status === config.filter);
  }
  
  if (filtered.length === 0) {
    console.log(`${colors.green}\n✨ No ${config.filter} tasks! You're all caught up.${colors.reset}`);
    return;
  }
  
  // Sort by priority and status
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
  
  // Group and display
  const active = filtered.filter(t => t.status === 'in_progress');
  const todo = filtered.filter(t => t.status === 'todo');
  const blocked = filtered.filter(t => t.status === 'blocked');
  
  console.log('');
  
  // Active tasks
  if (active.length > 0) {
    console.log(`${colors.cyan}${colors.inverse} 🔥 CURRENTLY ACTIVE (${active.length}) ${colors.reset}\n`);
    active.forEach(task => {
      const priority = task.priority === 'urgent' ? `${colors.redBg}${colors.white} 🔥 URGENT ${colors.reset}` :
                       task.priority === 'high' ? `${colors.yellowBg} ⚡ HIGH ${colors.reset}` :
                       `${colors.blue}MED${colors.reset}`;
      const subProject = task.project ? task.project.replace(/^.*-/, '') : '';
      const projectTag = subProject ? `${colors.cyan}[${subProject}] ${colors.reset}` : '';
      
      console.log(`${colors.cyan}${colors.bold}▶▶ ACTIVE${colors.reset} │ ${priority} │ ${colors.cyan}${task.id}${colors.reset} │ ${projectTag}${colors.white}${colors.bold}${task.title}${colors.reset}`);
      if (task.description) {
        const desc = task.description.slice(0, 100) + (task.description.length > 100 ? '...' : '');
        console.log(`${colors.cyan}    ➤ ${desc}${colors.reset}`);
      }
      console.log('');
    });
  }
  
  // Todo tasks  
  if (todo.length > 0) {
    console.log(`${colors.white}${colors.bold} 📋 NEXT ACTIONS (${todo.length}) ${colors.reset}\n`);
    todo.slice(0, 8).forEach(task => {
      const priority = task.priority === 'urgent' ? `${colors.redBg}${colors.white} 🔥 URGENT ${colors.reset}` :
                       task.priority === 'high' ? `${colors.yellowBg} ⚡ HIGH ${colors.reset}` :
                       `${colors.blue}MED${colors.reset}`;
      const subProject = task.project ? task.project.replace(/^.*-/, '') : '';
      const projectTag = subProject ? `${colors.blue}[${subProject}] ${colors.reset}` : '';
      
      console.log(`${colors.white}● TODO${colors.reset}     │ ${priority} │ ${colors.blue}${task.id}${colors.reset} │ ${projectTag}${colors.white}${colors.bold}${task.title}${colors.reset}`);
    });
    if (todo.length > 8) {
      console.log(`${colors.gray}... and ${todo.length - 8} more todo tasks${colors.reset}`);
    }
    console.log('');
  }
  
  // Blocked tasks
  if (blocked.length > 0) {
    console.log(`${colors.red}${colors.bold} ⚠ BLOCKED TASKS (${blocked.length}) ${colors.reset}\n`);
    blocked.forEach(task => {
      const subProject = task.project ? task.project.replace(/^.*-/, '') : '';
      const projectTag = subProject ? `${colors.red}[${subProject}] ${colors.reset}` : '';
      
      console.log(`${colors.red}⚠ BLOCKED${colors.reset}  │ ${colors.red}MED${colors.reset} │ ${colors.red}${task.id}${colors.reset} │ ${projectTag}${colors.red}${task.title}${colors.reset}`);
      if (task.description) {
        const desc = task.description.slice(0, 100) + (task.description.length > 100 ? '...' : '');
        console.log(`${colors.gray}    ${desc}${colors.reset}`);
      }
    });
    console.log('');
  }
  
  console.log(`${colors.gray}💡 Press Ctrl+C to exit | Monitoring: ${config.project}${colors.reset}`);
}

// Main monitor function
async function monitor() {
  console.log(`🚀 Starting File-Based Task Monitor for ${config.project}`);
  console.log(`📡 Refresh: ${config.refreshInterval/1000}s | Filter: ${config.filter}`);
  
  // Monitor loop
  let updateCount = 0;
  
  const refreshDisplay = () => {
    try {
      const tasks = getAllTasks();
      
      // Apply filter
      let filtered = tasks;
      if (config.filter === 'active') {
        filtered = tasks.filter(t => ['todo', 'in_progress', 'blocked'].includes(t.status));
      } else if (config.filter !== 'all') {
        filtered = tasks.filter(t => t.status === config.filter);
      }
      
      displayTasks(filtered);
      updateCount++;
    } catch (error) {
      console.clear();
      console.log(`❌ Error: ${error.message}`);
    }
  };
  
  // Initial display
  refreshDisplay();
  
  // Setup file watching for real-time updates
  const watchPaths = [
    path.join(process.cwd(), 'tasks'),
    path.join(__dirname, 'tasks')
  ].filter(p => fs.existsSync(p));
  
  if (watchPaths.length > 0) {
    console.log(`${colors.gray}🔍 Watching for file changes in: ${watchPaths.join(', ')}${colors.reset}`);
    
    const watcher = chokidar.watch(watchPaths, { 
      ignored: /node_modules/,
      persistent: true,
      ignoreInitial: true
    });
    
    watcher.on('change', () => {
      console.log(`${colors.cyan}📝 Task file changed - updating...${colors.reset}`);
      setTimeout(refreshDisplay, 500); // Small delay for file write completion
    });
  }
  
  // Periodic refresh as backup
  setInterval(refreshDisplay, config.refreshInterval);
}

// Graceful exit
process.on('SIGINT', () => {
  console.clear();
  console.log('👋 File-Based Task Monitor stopped');
  process.exit(0);
});

// Start
parseArgs();
monitor();