#!/usr/bin/env node

/**
 * Live Task Dashboard - Continuous terminal display of tasks
 * 
 * Features:
 * - Real-time task monitoring with configurable refresh intervals
 * - Color-coded status and priority display
 * - Filtering options for focus (active, todo, project-specific)
 * - Connection status and update indicators
 * - Graceful handling of terminal resize and interruption
 * 
 * Usage:
 *   node watch-tasks.js                    # Default: active tasks, 3s refresh
 *   node watch-tasks.js --filter=todo      # Show only todo tasks
 *   node watch-tasks.js --refresh=5s       # Custom refresh interval
 *   node watch-tasks.js --project=my-app   # Project-specific view
 *   node watch-tasks.js --compact          # Compact display mode
 */

import { spawn } from 'child_process';
import { formatTasksForTerminal } from './lib/terminal-formatter.js';
import { sortTasks } from './lib/task-sorter.js';
import fs from 'fs';
import path from 'path';

// Configuration with defaults
const config = {
  refreshInterval: 3000, // 3 seconds default
  filter: 'active',      // Show active tasks by default
  project: null,         // All projects by default
  compact: false,        // Full display by default
  showTimestamp: true,   // Show last update time
  showLiveIndicator: true, // Show "LIVE" status
  sort: 'priority'       // Default: sort by status then priority
};

// State tracking
let isRunning = true;
let lastUpdateTime = null;
let taskCount = 0;
let lastTaskCount = 0;
let updateCounter = 0;
let connectionStatus = 'connected';

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  
  args.forEach(arg => {
    if (arg.startsWith('--filter=')) {
      config.filter = arg.split('=')[1];
    } else if (arg.startsWith('--refresh=')) {
      const interval = arg.split('=')[1];
      const seconds = parseFloat(interval.replace('s', ''));
      config.refreshInterval = seconds * 1000;
    } else if (arg.startsWith('--project=')) {
      config.project = arg.split('=')[1];
    } else if (arg.startsWith('--sort=')) {
      config.sort = arg.split('=')[1];
    } else if (arg === '--compact') {
      config.compact = true;
    } else if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    }
  });
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
🔥 Live Task Dashboard - Real-time task monitoring

Usage:
  node watch-tasks.js [options]

Options:
  --filter=FILTER     Filter tasks (active, todo, in_progress, done, blocked)
  --refresh=TIME      Refresh interval (e.g., 3s, 5s, 10s)
  --project=NAME      Show tasks from specific project only
  --compact           Use compact display mode (fewer columns)
  --help, -h          Show this help message

Examples:
  node watch-tasks.js                    # Active tasks, 3s refresh
  node watch-tasks.js --filter=todo      # Todo tasks only
  node watch-tasks.js --refresh=5s       # 5 second refresh
  node watch-tasks.js --project=my-app   # Project-specific view
  node watch-tasks.js --compact          # Minimal display

Controls:
  Ctrl+C              Exit dashboard
  Terminal resize     Auto-adjusts display
`);
}

/**
 * Clear terminal screen
 */
function clearScreen() {
  process.stdout.write('\x1b[2J\x1b[H');
}

/**
 * Get formatted timestamp
 */
function getTimestamp() {
  return new Date().toLocaleTimeString();
}

/**
 * Create live status header
 */
function createStatusHeader() {
  const timestamp = getTimestamp();
  const refreshRate = `${config.refreshInterval / 1000}s`;
  const filterInfo = config.filter ? ` (${config.filter})` : '';
  const projectInfo = config.project ? ` - ${config.project}` : '';
  
  let header = `🔥 LIVE Task Dashboard${projectInfo}${filterInfo}`;
  
  if (config.showTimestamp) {
    header += `\n⏰ Last updated: ${timestamp} | Refresh: ${refreshRate} | Updates: ${updateCounter}`;
  }
  
  if (taskCount !== lastTaskCount && lastTaskCount > 0) {
    const change = taskCount - lastTaskCount;
    const changeIndicator = change > 0 ? `+${change}` : `${change}`;
    header += ` | Tasks: ${taskCount} (${changeIndicator})`;
  } else {
    header += ` | Tasks: ${taskCount}`;
  }
  
  // Connection status
  const statusIcon = connectionStatus === 'connected' ? '🟢' : '🔴';
  header += ` | ${statusIcon} ${connectionStatus}`;
  
  return header + '\n' + '='.repeat(Math.min(80, process.stdout.columns || 80)) + '\n';
}

/**
 * Load tasks from actual Like-I-Said MCP system dynamically
 */
async function loadTasks() {
  try {
    // Import formatter
    const { formatTasksForLiveMonitor } = await import('./lib/simple-monitor-formatter.js').catch(e => {
      throw new Error(`Failed to import formatter: ${e.message}`);
    });
    const fs = await import('fs');
    const path = await import('path');
    
    // Read from the current project's local task directory
    const currentProjectDir = process.env.ORIGINAL_CWD || process.cwd();
    const projectName = path.basename(currentProjectDir);
    
    // HYBRID MODE: Check both local files AND central MCP system
    console.log(`🔍 Checking both local files and central MCP system`);
    
    let allProjectTasks = [];
    
    // METHOD 1: Check local project files (for real-time updates like TASK-96112)
    const localTasksDir = path.join(currentProjectDir, 'tasks');
    if (fs.existsSync(localTasksDir)) {
      console.log(`📁 Reading local task files from: ${localTasksDir}`);
      
      try {
        const subDirs = fs.readdirSync(localTasksDir, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .map(dirent => dirent.name);
        
        for (const subDir of subDirs) {
          const tasksFile = path.join(localTasksDir, subDir, 'tasks.json');
          if (fs.existsSync(tasksFile)) {
            const tasksData = JSON.parse(fs.readFileSync(tasksFile, 'utf8'));
            const tasks = Array.isArray(tasksData) ? tasksData : [tasksData];
            console.log(`📄 Local: Found ${tasks.length} tasks in ${subDir}`);
            allProjectTasks.push(...tasks);
          }
        }
      } catch (error) {
        console.log(`❌ Error reading local files: ${error.message}`);
      }
    }
    
    // METHOD 2: Also check central MCP system (for tasks stored centrally)
    try {
      const { TaskStorage } = await import('./lib/task-storage.js').catch(e => {
        throw new Error(`Failed to import task storage: ${e.message}`);
      });
      
      const taskStorage = new TaskStorage();
      const allTaskData = await taskStorage.listTasks({});
      const allTasks = Array.isArray(allTaskData) ? allTaskData : (allTaskData?.tasks || []);
      
      // Find tasks from central system that match our project
      const centralTasks = allTasks.filter(task => {
        if (!task.project) return false;
        const taskProject = task.project.toLowerCase();
        const ourProject = config.project.toLowerCase();
        return taskProject.includes(ourProject) || ourProject.includes(taskProject);
      });
      
      if (centralTasks.length > 0) {
        console.log(`🌐 Central: Found ${centralTasks.length} tasks in ${[...new Set(centralTasks.map(t => t.project))].join(', ')}`);
        
        // Merge central tasks, avoiding duplicates by ID
        const localIds = new Set(allProjectTasks.map(t => t.id));
        const newCentralTasks = centralTasks.filter(t => !localIds.has(t.id));
        allProjectTasks.push(...newCentralTasks);
      }
    } catch (error) {
      console.log(`⚠️ Could not check central system: ${error.message}`);
    }
    
    console.log(`📊 Total tasks found: ${allProjectTasks.length} (local + central)`);
    
    // Show which projects we found tasks in
    const allProjects = [...new Set(allProjectTasks.map(task => task.project))];
    console.log(`📋 Projects: ${allProjects.join(', ')}`);
    
    // Apply active filter if needed
    let tasks = allProjectTasks;
    if (config.filter === 'active') {
      tasks = allProjectTasks.filter(task => ['todo', 'in_progress'].includes(task.status));
    } else if (config.filter && config.filter !== 'all') {
      tasks = allProjectTasks.filter(task => task.status === config.filter);
    }
    
    console.log(`📊 Found ${tasks.length} tasks matching filter '${config.filter}'`);
    
    // Apply optimal sorting
    const sortedTasks = sortTasks(tasks, config.sort);
    
    connectionStatus = 'connected';
    return formatTasksForLiveMonitor(sortedTasks, { filter: config.filter, project: config.project });
    
  } catch (error) {
    connectionStatus = 'error';
    return `❌ Error loading tasks: ${error.message}`;
  }
}

/**
 * Main dashboard display loop
 */
async function displayDashboard() {
  if (!isRunning) return;
  
  try {
    // Load task data
    const taskDisplay = await loadTasks();
    
    // Count tasks from the display (rough estimate)
    lastTaskCount = taskCount;
    const taskMatches = taskDisplay.match(/├.*?┤/g);
    taskCount = taskMatches ? taskMatches.length - 1 : 0; // -1 for header row
    
    // Clear and redraw
    clearScreen();
    console.log(createStatusHeader());
    console.log(taskDisplay);
    
    // Update counters
    updateCounter++;
    lastUpdateTime = new Date();
    
    // Instructions
    console.log('\n💡 Press Ctrl+C to exit');
    
  } catch (error) {
    clearScreen();
    console.log(createStatusHeader());
    console.log(`❌ Error updating dashboard: ${error.message}`);
    connectionStatus = 'error';
  }
  
  // Schedule next update
  setTimeout(displayDashboard, config.refreshInterval);
}

/**
 * Handle graceful shutdown
 */
function handleExit() {
  isRunning = false;
  clearScreen();
  console.log('👋 Live Task Dashboard stopped');
  console.log(`📊 Total updates: ${updateCounter}`);
  console.log(`⏱️  Runtime: ${lastUpdateTime ? Math.round((Date.now() - (lastUpdateTime.getTime() - (updateCounter * config.refreshInterval))) / 1000) : 0}s`);
  process.exit(0);
}

/**
 * Handle terminal resize
 */
function handleResize() {
  // Force immediate refresh on resize
  if (isRunning) {
    displayDashboard();
  }
}

/**
 * Main entry point
 */
async function main() {
  // Parse command line arguments
  parseArgs();
  
  // Setup signal handlers
  process.on('SIGINT', handleExit);
  process.on('SIGTERM', handleExit);
  process.on('SIGUSR1', handleExit); // For nodemon
  process.on('SIGUSR2', handleExit); // For nodemon
  
  // Handle terminal resize
  process.stdout.on('resize', handleResize);
  
  // Initial display
  clearScreen();
  console.log('🚀 Starting Live Task Dashboard...');
  console.log(`📡 Refresh interval: ${config.refreshInterval / 1000}s`);
  console.log(`🎯 Filter: ${config.filter}`);
  if (config.project) console.log(`📁 Project: ${config.project}`);
  console.log('⏳ Loading tasks...\n');
  
  // Start the dashboard loop
  setTimeout(displayDashboard, 1000); // Small delay for startup message
}

// Start the application
main().catch(error => {
  console.error('❌ Failed to start Live Task Dashboard:', error.message);
  process.exit(1);
});