#!/usr/bin/env node

/**
 * Like-I-Said Dashboard - PKG EXECUTABLE FIXED VERSION
 * Version 2.4.6-pkg-fixed
 * 
 * FIXES:
 * - Handles pkg executable paths correctly
 * - Creates logs in executable directory
 * - Finds files relative to executable
 */

const net = require('net');
const http = require('http');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const readline = require('readline');

// Get the correct base directory for pkg executables
function getBaseDir() {
  if (process.pkg) {
    // Running from pkg executable - use directory of executable
    return path.dirname(process.execPath);
  } else {
    // Running from Node.js - use current working directory
    return process.cwd();
  }
}

// Get the base directory FIRST
const BASE_DIR = getBaseDir();

// Configuration
const START_PORT = 3001;
const MAX_ATTEMPTS = 20;
const CONFIG_FILE = path.join(BASE_DIR, 'dashboard-config.json');

// Default configuration - use BASE_DIR
const DEFAULT_CONFIG = {
  memoryPath: path.join(BASE_DIR, 'memories'),
  taskPath: path.join(BASE_DIR, 'tasks'),
  autoOpenBrowser: true,
  lastUsed: null
};

// Create logs directory in BASE_DIR
const logsDir = path.join(BASE_DIR, 'logs');
try {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
    console.log(`✅ Created logs directory: ${logsDir}`);
  }
} catch (error) {
  console.error(`❌ Failed to create logs directory: ${error.message}`);
  console.error(`Attempted path: ${logsDir}`);
  // Try to continue anyway
}

// Create timestamped log file
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const logFile = path.join(logsDir, `dashboard-pkg-fixed-${timestamp}.log`);
let logStream = null;

try {
  logStream = fs.createWriteStream(logFile, { flags: 'a' });
  console.log(`✅ Log file created: ${logFile}`);
} catch (error) {
  console.error(`❌ Failed to create log file: ${error.message}`);
  // Continue without file logging
}

// Enhanced logging function with levels
const log = (level, msg, showConsole = true) => {
  const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${msg}`;
  if (showConsole) {
    if (level === 'ERROR') {
      console.error(`🔴 ${msg}`);
    } else if (level === 'WARN') {
      console.log(`🟡 ${msg}`);
    } else if (level === 'SUCCESS') {
      console.log(`🟢 ${msg}`);
    } else if (level === 'FIX') {
      console.log(`🔧 ${msg}`);
    } else {
      console.log(`🔵 ${msg}`);
    }
  }
  
  // Try to write to log file if available
  if (logStream && !logStream.destroyed) {
    try {
      logStream.write(line + '\n');
    } catch (error) {
      // Ignore logging errors
    }
  }
};

// Log startup information
log('INFO', `=== DASHBOARD STARTUP (PKG FIXED) ===`);
log('INFO', `Base Directory: ${BASE_DIR}`);
log('INFO', `Running from pkg: ${!!process.pkg}`);
log('INFO', `Process executable: ${process.execPath}`);
log('INFO', `Platform: ${os.platform()} ${os.arch()}`);
log('INFO', `Node Version: ${process.version}`);

// Deep memory structure analysis
function analyzeMemoryStructure(memoryPath) {
  log('INFO', `=== MEMORY ANALYSIS ===`);
  log('INFO', `Analyzing: ${memoryPath}`);
  
  try {
    // Check if base directory exists
    if (!fs.existsSync(memoryPath)) {
      log('ERROR', `Memory directory does not exist: ${memoryPath}`);
      return { exists: false, projects: 0, memories: 0, errors: [`Directory does not exist: ${memoryPath}`] };
    }
    
    log('SUCCESS', `Memory directory exists`);
    
    // Get directory stats
    const stats = fs.statSync(memoryPath);
    log('INFO', `Is directory: ${stats.isDirectory()}`);
    
    // Scan all items
    const items = fs.readdirSync(memoryPath);
    log('INFO', `Items found: ${items.length}`);
    
    if (items.length === 0) {
      log('WARN', `Memory directory is empty`);
      return { exists: true, projects: 0, memories: 0, errors: [], empty: true };
    }
    
    const projects = [];
    const errors = [];
    let totalMemories = 0;
    
    // Analyze each item
    for (const item of items) {
      const itemPath = path.join(memoryPath, item);
      
      try {
        const itemStats = fs.statSync(itemPath);
        
        if (itemStats.isDirectory()) {
          log('INFO', `Found project: ${item}`);
          projects.push(item);
          
          // Count markdown files
          try {
            const projectFiles = fs.readdirSync(itemPath);
            const mdFiles = projectFiles.filter(f => f.endsWith('.md'));
            totalMemories += mdFiles.length;
            
            if (mdFiles.length > 0) {
              log('SUCCESS', `  ${item}: ${mdFiles.length} memory files`);
            }
          } catch (projectError) {
            log('ERROR', `  Cannot read project ${item}: ${projectError.message}`);
            errors.push(`Cannot read project ${item}: ${projectError.message}`);
          }
        }
      } catch (itemError) {
        log('ERROR', `Cannot access ${item}: ${itemError.message}`);
        errors.push(`Cannot access ${item}: ${itemError.message}`);
      }
    }
    
    log('INFO', `=== ANALYSIS COMPLETE ===`);
    log('INFO', `Projects: ${projects.length}`);
    log('INFO', `Memory files: ${totalMemories}`);
    log('INFO', `Errors: ${errors.length}`);
    
    return {
      exists: true,
      projects: projects.length,
      memories: totalMemories,
      errors: errors,
      projectList: projects,
      empty: totalMemories === 0
    };
    
  } catch (error) {
    log('ERROR', `Analysis failed: ${error.message}`);
    return { exists: false, projects: 0, memories: 0, errors: [error.message], critical: true };
  }
}

// Load configuration
function loadConfig() {
  log('INFO', `Loading configuration from: ${CONFIG_FILE}`);
  
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const configContent = fs.readFileSync(CONFIG_FILE, 'utf8');
      const config = JSON.parse(configContent);
      log('SUCCESS', `Configuration loaded`);
      return { ...DEFAULT_CONFIG, ...config };
    } else {
      log('INFO', `No config file found, using defaults`);
    }
  } catch (error) {
    log('ERROR', `Config load error: ${error.message}`);
  }
  
  return DEFAULT_CONFIG;
}

// Save configuration
function saveConfig(config) {
  try {
    config.lastUsed = new Date().toISOString();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    log('SUCCESS', `Configuration saved`);
    return true;
  } catch (error) {
    log('ERROR', `Config save error: ${error.message}`);
    return false;
  }
}

// Ask user question
function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// Show configuration menu
async function showConfigMenu(config) {
  console.log('\n=== Dashboard Configuration ===');
  console.log(`1. Memory Path: ${config.memoryPath}`);
  console.log(`2. Task Path: ${config.taskPath}`);
  console.log(`3. Auto-open Browser: ${config.autoOpenBrowser ? 'Yes' : 'No'}`);
  console.log('4. Analyze Memory Structure');
  console.log('5. Save and Start Dashboard');
  console.log('6. Exit');
  
  const choice = await askQuestion('\nEnter choice (1-6): ');
  
  switch (choice) {
    case '1':
      const memoryPath = await askQuestion(`Enter memory path [${config.memoryPath}]: `);
      if (memoryPath) {
        config.memoryPath = path.resolve(memoryPath);
        console.log(`✓ Memory path set to: ${config.memoryPath}`);
      }
      return showConfigMenu(config);
      
    case '2':
      const taskPath = await askQuestion(`Enter task path [${config.taskPath}]: `);
      if (taskPath) {
        config.taskPath = path.resolve(taskPath);
        console.log(`✓ Task path set to: ${config.taskPath}`);
      }
      return showConfigMenu(config);
      
    case '3':
      config.autoOpenBrowser = !config.autoOpenBrowser;
      console.log(`✓ Auto-open browser: ${config.autoOpenBrowser ? 'Yes' : 'No'}`);
      return showConfigMenu(config);
      
    case '4':
      const analysis = analyzeMemoryStructure(config.memoryPath);
      console.log('\n📊 Memory Analysis Results:');
      console.log(`   Directory exists: ${analysis.exists ? '✅' : '❌'}`);
      console.log(`   Projects found: ${analysis.projects}`);
      console.log(`   Memory files: ${analysis.memories}`);
      await askQuestion('\nPress Enter to continue...');
      return showConfigMenu(config);
      
    case '5':
      saveConfig(config);
      console.log('✅ Configuration saved\n');
      return config;
      
    case '6':
      console.log('Goodbye!');
      process.exit(0);
      
    default:
      console.log('Invalid choice.');
      return showConfigMenu(config);
  }
}

// Port checking
async function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    const timeout = setTimeout(() => {
      server.close();
      resolve(false);
    }, 500);
    
    server.once('error', (err) => {
      clearTimeout(timeout);
      resolve(err.code !== 'EADDRINUSE');
    });
    
    server.once('listening', () => {
      clearTimeout(timeout);
      server.close(() => resolve(true));
    });
    
    server.listen(port, '0.0.0.0');
  });
}

// Find available port
async function findAvailablePort(startPort = START_PORT) {
  log('INFO', `Scanning for available port starting from ${startPort}`);
  
  for (let port = startPort; port < startPort + MAX_ATTEMPTS; port++) {
    console.log(`Checking port ${port}...`);
    const available = await isPortAvailable(port);
    
    if (available) {
      log('SUCCESS', `Port ${port} is available`);
      console.log(`✅ Port ${port} is available!\n`);
      return port;
    } else {
      log('INFO', `Port ${port} is busy`);
      console.log(`❌ Port ${port} is busy`);
    }
  }
  
  throw new Error(`No available ports found in range ${startPort}-${startPort + MAX_ATTEMPTS}`);
}

// Find Node.js executable
async function findNodeExecutable() {
  log('INFO', `Finding Node.js executable`);
  
  if (process.pkg) {
    // In pkg executable, need to find system Node.js
    const possiblePaths = [
      'C:\\Program Files\\nodejs\\node.exe',
      'C:\\Program Files (x86)\\nodejs\\node.exe',
      path.join(process.env.APPDATA || '', '..', 'Local', 'Programs', 'nodejs', 'node.exe')
    ];
    
    for (const nodePath of possiblePaths) {
      if (fs.existsSync(nodePath)) {
        log('SUCCESS', `Found Node.js at: ${nodePath}`);
        return nodePath;
      }
    }
    
    // Try where command
    return new Promise((resolve) => {
      exec('where node', (error, stdout) => {
        if (!error && stdout) {
          const nodePath = stdout.trim().split('\n')[0];
          log('SUCCESS', `Found Node.js via where: ${nodePath}`);
          resolve(nodePath);
        } else {
          log('ERROR', `Could not find Node.js`);
          resolve(null);
        }
      });
    });
  } else {
    return process.execPath;
  }
}

// Main dashboard startup
async function startDashboard() {
  try {
    // Banner
    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║    Like-I-Said Dashboard PKG FIXED      ║');
    console.log('║           Version 2.4.6                  ║');
    console.log('╚══════════════════════════════════════════╝\n');
    
    log('INFO', `Log file: ${logFile}`);
    console.log(`📋 Log file: ${logFile}\n`);
    
    // Load configuration
    let config = loadConfig();
    
    // Check if first run
    const isFirstRun = !fs.existsSync(CONFIG_FILE);
    
    if (isFirstRun || process.argv.includes('--config')) {
      console.log('=== Configuration Setup ===\n');
      config = await showConfigMenu(config);
    } else {
      console.log('Current configuration:');
      console.log(`📁 Memories: ${config.memoryPath}`);
      console.log(`📋 Tasks: ${config.taskPath}`);
      console.log(`🌐 Auto-open: ${config.autoOpenBrowser ? 'Yes' : 'No'}`);
      
      const choice = await askQuestion('\nPress Enter to start, or type "config" to change settings: ');
      
      if (choice.toLowerCase() === 'config') {
        config = await showConfigMenu(config);
      }
    }
    
    // Analyze memory structure
    console.log('\n🔍 Analyzing memory structure...');
    const memoryAnalysis = analyzeMemoryStructure(config.memoryPath);
    
    if (memoryAnalysis.exists && memoryAnalysis.memories > 0) {
      console.log(`✅ Found ${memoryAnalysis.memories} memory files in ${memoryAnalysis.projects} projects`);
    } else if (memoryAnalysis.exists) {
      console.log('⚠️  No memory files found yet');
    }
    
    // Find available port
    const port = await findAvailablePort();
    
    // Find Node.js
    const nodeExe = await findNodeExecutable();
    
    if (!nodeExe) {
      throw new Error('Node.js not found. Please install Node.js.');
    }
    
    // Find server file - try multiple locations
    let serverPath = null;
    const serverLocations = [
      path.join(BASE_DIR, 'dashboard-server-bridge.js'),
      path.join(process.cwd(), 'dashboard-server-bridge.js'),
      'dashboard-server-bridge.js'
    ];
    
    for (const location of serverLocations) {
      log('INFO', `Checking for server at: ${location}`);
      if (fs.existsSync(location)) {
        serverPath = location;
        log('SUCCESS', `Found server at: ${serverPath}`);
        break;
      }
    }
    
    if (!serverPath) {
      throw new Error('Server file not found (dashboard-server-bridge.js)');
    }
    
    // Set environment variables
    const env = {
      ...process.env,
      PORT: port.toString(),
      NODE_ENV: 'production',
      MEMORY_DIR: config.memoryPath,
      TASK_DIR: config.taskPath,
      PKG_FIXED: 'true'
    };
    
    log('INFO', `Starting server with environment:`);
    log('INFO', `PORT=${env.PORT}`);
    log('INFO', `MEMORY_DIR=${env.MEMORY_DIR}`);
    log('INFO', `TASK_DIR=${env.TASK_DIR}`);
    
    console.log('\n🚀 Starting dashboard server...');
    
    // Start server
    const child = spawn(nodeExe, [serverPath], {
      env,
      stdio: 'inherit',
      windowsHide: false
    });
    
    child.on('error', (err) => {
      log('ERROR', `Server error: ${err.message}`);
      console.error(`\n❌ Failed to start server: ${err.message}`);
      process.exit(1);
    });
    
    child.on('exit', (code) => {
      log('INFO', `Server exited with code: ${code}`);
      if (code !== 0) {
        console.error(`\n💥 Server crashed with code ${code}`);
        console.log(`📋 Check log file: ${logFile}`);
      }
      process.exit(code || 0);
    });
    
    // Wait and open browser
    setTimeout(() => {
      const url = `http://localhost:${port}`;
      log('SUCCESS', `Dashboard ready at ${url}`);
      
      console.log(`\n✅ Dashboard running at: ${url}`);
      console.log(`📁 Memories: ${config.memoryPath}`);
      console.log(`📋 Tasks: ${config.taskPath}`);
      console.log(`📋 Log file: ${logFile}`);
      console.log('\n🛑 Press Ctrl+C to stop\n');
      
      if (config.autoOpenBrowser) {
        exec(`start "" "${url}"`);
      }
    }, 3000);
    
  } catch (error) {
    log('ERROR', `Fatal error: ${error.message}`);
    console.error(`\n💥 Fatal Error: ${error.message}`);
    console.log(`📋 Check log file: ${logFile}`);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  log('INFO', `Shutting down...`);
  console.log('\n\n🛑 Shutting down...');
  if (logStream) {
    logStream.end();
  }
  process.exit(0);
});

// Error handlers
process.on('uncaughtException', (err) => {
  log('ERROR', `Uncaught exception: ${err.message}`);
  console.error('\n💥 Unexpected error:', err.message);
  console.log(`📋 Details in log: ${logFile}`);
  if (logStream) {
    logStream.end();
  }
  process.exit(1);
});

// Start
log('INFO', `=== PKG FIXED LAUNCHER STARTED ===`);
startDashboard();