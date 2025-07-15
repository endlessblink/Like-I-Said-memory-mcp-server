#!/usr/bin/env node

/**
 * Like-I-Said Dashboard - Complete All-in-One Launcher
 * Includes configuration, auto-port detection, and custom paths
 */

const net = require('net');
const http = require('http');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const readline = require('readline');

// Configuration
const START_PORT = 3001;
const MAX_ATTEMPTS = 20;
const CONFIG_FILE = path.join(process.cwd(), 'dashboard-config.json');

// Default configuration
const DEFAULT_CONFIG = {
  memoryPath: path.join(process.cwd(), 'memories'),
  taskPath: path.join(process.cwd(), 'tasks'),
  autoOpenBrowser: true,
  lastUsed: null
};

// Create logs directory
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create timestamped log file
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const logFile = path.join(logsDir, `dashboard-${timestamp}.log`);
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

// Logging function
const log = (msg, showConsole = true) => {
  const line = `[${new Date().toISOString()}] ${msg}`;
  if (showConsole) console.log(msg);
  logStream.write(line + '\n');
};

// Load configuration
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      return { ...DEFAULT_CONFIG, ...config };
    }
  } catch (error) {
    log('Warning: Could not load config file, using defaults');
  }
  return DEFAULT_CONFIG;
}

// Save configuration
function saveConfig(config) {
  try {
    config.lastUsed = new Date().toISOString();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    log('Configuration saved to dashboard-config.json');
    return true;
  } catch (error) {
    log('Warning: Could not save config file');
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
  console.log('4. Save and Start Dashboard');
  console.log('5. Exit');
  
  const choice = await askQuestion('\nEnter choice (1-5): ');
  
  switch (choice) {
    case '1':
      const memoryPath = await askQuestion(`Enter memory path [${config.memoryPath}]: `);
      if (memoryPath) {
        const resolvedPath = path.resolve(memoryPath);
        if (!fs.existsSync(resolvedPath)) {
          fs.mkdirSync(resolvedPath, { recursive: true });
          console.log(`✓ Created directory: ${resolvedPath}`);
        }
        config.memoryPath = resolvedPath;
        console.log(`✓ Memory path set to: ${config.memoryPath}`);
      }
      return showConfigMenu(config);
      
    case '2':
      const taskPath = await askQuestion(`Enter task path [${config.taskPath}]: `);
      if (taskPath) {
        const resolvedPath = path.resolve(taskPath);
        if (!fs.existsSync(resolvedPath)) {
          fs.mkdirSync(resolvedPath, { recursive: true });
          console.log(`✓ Created directory: ${resolvedPath}`);
        }
        config.taskPath = resolvedPath;
        console.log(`✓ Task path set to: ${config.taskPath}`);
      }
      return showConfigMenu(config);
      
    case '3':
      const browser = await askQuestion(`Auto-open browser? (y/n) [${config.autoOpenBrowser ? 'y' : 'n'}]: `);
      if (browser.toLowerCase() === 'y' || browser.toLowerCase() === 'yes') {
        config.autoOpenBrowser = true;
      } else if (browser.toLowerCase() === 'n' || browser.toLowerCase() === 'no') {
        config.autoOpenBrowser = false;
      }
      console.log(`✓ Auto-open browser: ${config.autoOpenBrowser ? 'Yes' : 'No'}`);
      return showConfigMenu(config);
      
    case '4':
      saveConfig(config);
      console.log('✓ Configuration saved\n');
      return config;
      
    case '5':
      console.log('Goodbye!');
      process.exit(0);
      
    default:
      console.log('Invalid choice. Please enter 1-5.');
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
    }, 200);
    
    server.once('error', (err) => {
      clearTimeout(timeout);
      resolve(err.code !== 'EADDRINUSE');
    });
    
    server.once('listening', () => {
      clearTimeout(timeout);
      server.close(() => {
        // Double-check by trying to connect
        const client = new net.Socket();
        client.setTimeout(200);
        
        client.on('connect', () => {
          client.destroy();
          resolve(false);
        });
        
        client.on('timeout', () => {
          client.destroy();
          resolve(true);
        });
        
        client.on('error', () => {
          resolve(true);
        });
        
        client.connect(port, 'localhost');
      });
    });
    
    server.listen(port, '0.0.0.0');
  });
}

// Find available port
async function findAvailablePort(startPort = START_PORT) {
  log('Scanning for available port...');
  
  for (let port = startPort; port < startPort + MAX_ATTEMPTS; port++) {
    console.log(`Checking port ${port}...`);
    const available = await isPortAvailable(port);
    
    if (available) {
      log(`✓ Port ${port} is available`);
      console.log(`✓ Port ${port} is available!\n`);
      return port;
    } else {
      console.log(`✗ Port ${port} is busy`);
    }
  }
  
  throw new Error(`No available ports found in range ${startPort}-${startPort + MAX_ATTEMPTS}`);
}

// Find Node.js executable
async function findNodeExecutable() {
  log('Searching for Node.js executable...');
  
  if (process.pkg) {
    log('Running from pkg executable');
    const possiblePaths = [
      'C:\\Program Files\\nodejs\\node.exe',
      'C:\\Program Files (x86)\\nodejs\\node.exe',
      path.join(process.env.APPDATA || '', '..', 'Local', 'Programs', 'nodejs', 'node.exe')
    ];
    
    for (const nodePath of possiblePaths) {
      if (fs.existsSync(nodePath)) {
        log(`Found Node.js at: ${nodePath}`);
        return nodePath;
      }
    }
    
    return new Promise((resolve) => {
      exec('where node', (error, stdout) => {
        if (!error && stdout) {
          const nodePath = stdout.trim().split('\n')[0];
          log(`Found Node.js via where command: ${nodePath}`);
          resolve(nodePath);
        } else {
          log('WARNING: Could not find Node.js installation');
          resolve(null);
        }
      });
    });
  } else {
    log('Running with Node.js directly');
    return process.execPath;
  }
}

// Start the dashboard
async function startDashboard() {
  try {
    // Banner
    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║    Like-I-Said Dashboard Complete       ║');
    console.log('║           Version 2.4.3                  ║');
    console.log('╚══════════════════════════════════════════╝\n');
    console.log(`Log file: ${logFile}\n`);
    
    log('=== Dashboard Launcher Starting ===');
    log(`Platform: ${os.platform()} ${os.arch()}`);
    log(`Node Version: ${process.version}`);
    log(`Working Directory: ${process.cwd()}`);
    
    // Load configuration
    let config = loadConfig();
    
    // Check if this is first run or config flag
    const isFirstRun = !fs.existsSync(CONFIG_FILE);
    const forceConfig = process.argv.includes('--config');
    
    if (isFirstRun || forceConfig) {
      console.log('=== First Time Setup ===');
      console.log('Please configure your dashboard settings:\n');
      config = await showConfigMenu(config);
    } else {
      console.log('Current configuration:');
      console.log(`📁 Memories: ${config.memoryPath}`);
      console.log(`📋 Tasks: ${config.taskPath}`);
      console.log(`🌐 Auto-open: ${config.autoOpenBrowser ? 'Yes' : 'No'}`);
      
      if (config.lastUsed) {
        console.log(`📅 Last used: ${new Date(config.lastUsed).toLocaleString()}`);
      }
      
      const choice = await askQuestion('\nPress Enter to start, or type "config" to change settings: ');
      
      if (choice.toLowerCase() === 'config') {
        config = await showConfigMenu(config);
      }
    }
    
    // Ensure directories exist
    if (!fs.existsSync(config.memoryPath)) {
      fs.mkdirSync(config.memoryPath, { recursive: true });
      log(`Created memory directory: ${config.memoryPath}`);
    }
    if (!fs.existsSync(config.taskPath)) {
      fs.mkdirSync(config.taskPath, { recursive: true });
      log(`Created task directory: ${config.taskPath}`);
    }
    
    log(`Starting dashboard with config:`);
    log(`Memory: ${config.memoryPath}`);
    log(`Tasks: ${config.taskPath}`);
    
    // Find available port
    const port = await findAvailablePort();
    
    // Find Node.js executable
    const nodeExe = await findNodeExecutable();
    
    if (!nodeExe) {
      throw new Error('Node.js not found. Please install Node.js and ensure it is in your PATH.');
    }
    
    // Check for server file
    const serverPath = path.join(process.cwd(), 'dashboard-server-bridge.js');
    
    if (!fs.existsSync(serverPath)) {
      throw new Error(`Server file not found at: ${serverPath}`);
    }
    
    log(`Starting server with Node.js...`);
    log(`Command: ${nodeExe} "${serverPath}"`);
    
    // Set environment with custom paths
    const env = {
      ...process.env,
      PORT: port.toString(),
      NODE_ENV: 'production',
      MEMORY_DIR: config.memoryPath,
      TASK_DIR: config.taskPath
    };
    
    log(`Environment: PORT=${env.PORT}, MEMORY_DIR=${env.MEMORY_DIR}, TASK_DIR=${env.TASK_DIR}`);
    
    // Start server
    const child = spawn(nodeExe, [serverPath], {
      env,
      stdio: 'inherit',
      windowsHide: false
    });
    
    child.on('error', (err) => {
      log(`ERROR: Failed to start - ${err.message}`);
      console.error(`\nFailed to start server: ${err.message}`);
      process.exit(1);
    });
    
    child.on('exit', (code) => {
      log(`Server exited with code: ${code}`);
      if (code !== 0) {
        console.error(`\nServer crashed with code ${code}`);
        console.log(`Check log file: ${logFile}`);
      }
      process.exit(code || 0);
    });
    
    // Wait and open browser
    setTimeout(async () => {
      const url = `http://localhost:${port}`;
      log(`Dashboard ready at ${url}`);
      console.log(`\n✓ Dashboard running at: ${url}`);
      console.log(`📁 Memories: ${config.memoryPath}`);
      console.log(`📋 Tasks: ${config.taskPath}`);
      console.log('\nPress Ctrl+C to stop\n');
      
      if (config.autoOpenBrowser) {
        exec(`start "" "${url}"`);
        log('Browser opened automatically');
      }
    }, 3000);
    
  } catch (error) {
    log(`FATAL ERROR: ${error.message}`);
    console.error(`\nError: ${error.message}`);
    console.log(`\nCheck log file: ${logFile}`);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  log('Shutting down...');
  console.log('\n\nShutting down...');
  logStream.end();
  process.exit(0);
});

// Error handlers
process.on('uncaughtException', (err) => {
  log(`UNCAUGHT EXCEPTION: ${err.message}\n${err.stack}`);
  console.error('\nUnexpected error:', err.message);
  console.log(`Details in log: ${logFile}`);
  logStream.end();
  process.exit(1);
});

// Start
startDashboard();