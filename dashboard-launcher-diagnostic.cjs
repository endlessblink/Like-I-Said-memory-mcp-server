#!/usr/bin/env node

/**
 * Like-I-Said Dashboard - Diagnostic Version with Comprehensive Memory Loading Logs
 * Version 2.4.4-diagnostic
 * 
 * This version includes extensive logging to help identify memory loading issues
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
const logFile = path.join(logsDir, `dashboard-diagnostic-${timestamp}.log`);
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

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
    } else {
      console.log(`🔵 ${msg}`);
    }
  }
  logStream.write(line + '\n');
};

// Diagnostic memory analysis function
function analyzeMemoryStructure(memoryPath) {
  log('INFO', `=== MEMORY STRUCTURE ANALYSIS ===`);
  log('INFO', `Analyzing memory path: ${memoryPath}`);
  
  try {
    // Check if base directory exists
    if (!fs.existsSync(memoryPath)) {
      log('ERROR', `Memory directory does not exist: ${memoryPath}`);
      return { exists: false, projects: 0, memories: 0, errors: [] };
    }
    
    log('SUCCESS', `Memory directory exists: ${memoryPath}`);
    
    // Get directory stats
    const stats = fs.statSync(memoryPath);
    log('INFO', `Directory permissions: ${stats.mode.toString(8)}`);
    log('INFO', `Directory size: ${stats.size} bytes`);
    log('INFO', `Last modified: ${stats.mtime}`);
    
    // List all items in memory directory
    const items = fs.readdirSync(memoryPath);
    log('INFO', `Items in memory directory: ${items.length}`);
    
    const projects = [];
    const files = [];
    const errors = [];
    let totalMemories = 0;
    
    for (const item of items) {
      const itemPath = path.join(memoryPath, item);
      const itemStats = fs.statSync(itemPath);
      
      if (itemStats.isDirectory()) {
        log('INFO', `Found project directory: ${item}`);
        projects.push(item);
        
        try {
          // Analyze project directory
          const projectFiles = fs.readdirSync(itemPath);
          const mdFiles = projectFiles.filter(f => f.endsWith('.md'));
          
          log('INFO', `  Project "${item}" has ${mdFiles.length} markdown files`);
          totalMemories += mdFiles.length;
          
          // List each memory file
          for (const mdFile of mdFiles) {
            const mdPath = path.join(itemPath, mdFile);
            const mdStats = fs.statSync(mdPath);
            log('INFO', `    Memory file: ${mdFile} (${mdStats.size} bytes)`);
            
            // Try to read the file content
            try {
              const content = fs.readFileSync(mdPath, 'utf-8');
              const hasYamlFrontmatter = content.startsWith('---');
              const hasHtmlComment = content.includes('<!--');
              
              log('INFO', `      Content length: ${content.length} chars`);
              log('INFO', `      Has YAML frontmatter: ${hasYamlFrontmatter}`);
              log('INFO', `      Has HTML comment: ${hasHtmlComment}`);
              
              // Try to extract ID from content
              const idMatch = content.match(/id:\s*([^\s\n]+)/);
              if (idMatch) {
                log('INFO', `      Memory ID: ${idMatch[1]}`);
              } else {
                log('WARN', `      No ID found in memory file`);
              }
              
            } catch (readError) {
              log('ERROR', `      Cannot read file: ${readError.message}`);
              errors.push(`Cannot read ${mdPath}: ${readError.message}`);
            }
          }
          
        } catch (projectError) {
          log('ERROR', `  Cannot read project directory "${item}": ${projectError.message}`);
          errors.push(`Cannot read project ${item}: ${projectError.message}`);
        }
        
      } else {
        log('INFO', `Found file (not directory): ${item}`);
        files.push(item);
      }
    }
    
    log('INFO', `=== MEMORY ANALYSIS SUMMARY ===`);
    log('INFO', `Total projects: ${projects.length}`);
    log('INFO', `Total memory files: ${totalMemories}`);
    log('INFO', `Non-directory files: ${files.length}`);
    log('INFO', `Errors encountered: ${errors.length}`);
    
    if (errors.length > 0) {
      log('ERROR', `Error details:`);
      errors.forEach(error => log('ERROR', `  - ${error}`));
    }
    
    return {
      exists: true,
      projects: projects.length,
      memories: totalMemories,
      errors: errors,
      projectList: projects,
      fileList: files
    };
    
  } catch (error) {
    log('ERROR', `Critical error analyzing memory structure: ${error.message}`);
    return { exists: false, projects: 0, memories: 0, errors: [error.message] };
  }
}

// Enhanced configuration loading with diagnostics
function loadConfig() {
  log('INFO', `=== CONFIGURATION LOADING ===`);
  log('INFO', `Config file path: ${CONFIG_FILE}`);
  
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      log('SUCCESS', `Config file exists`);
      
      const configContent = fs.readFileSync(CONFIG_FILE, 'utf8');
      log('INFO', `Config file size: ${configContent.length} bytes`);
      
      const config = JSON.parse(configContent);
      log('SUCCESS', `Config parsed successfully`);
      log('INFO', `Config memory path: ${config.memoryPath || 'not set'}`);
      log('INFO', `Config task path: ${config.taskPath || 'not set'}`);
      
      const mergedConfig = { ...DEFAULT_CONFIG, ...config };
      log('INFO', `Final memory path: ${mergedConfig.memoryPath}`);
      log('INFO', `Final task path: ${mergedConfig.taskPath}`);
      
      return mergedConfig;
    } else {
      log('WARN', `Config file does not exist, using defaults`);
    }
  } catch (error) {
    log('ERROR', `Error loading config: ${error.message}`);
  }
  
  log('INFO', `Using default configuration`);
  return DEFAULT_CONFIG;
}

// Enhanced configuration saving with diagnostics
function saveConfig(config) {
  log('INFO', `=== CONFIGURATION SAVING ===`);
  
  try {
    config.lastUsed = new Date().toISOString();
    const configJson = JSON.stringify(config, null, 2);
    
    log('INFO', `Config JSON size: ${configJson.length} bytes`);
    log('INFO', `Saving to: ${CONFIG_FILE}`);
    
    fs.writeFileSync(CONFIG_FILE, configJson);
    log('SUCCESS', `Configuration saved successfully`);
    
    // Verify the save worked
    if (fs.existsSync(CONFIG_FILE)) {
      const savedSize = fs.statSync(CONFIG_FILE).size;
      log('SUCCESS', `Verified saved file size: ${savedSize} bytes`);
    }
    
    return true;
  } catch (error) {
    log('ERROR', `Error saving config: ${error.message}`);
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

// Enhanced configuration menu with diagnostics
async function showConfigMenu(config) {
  log('INFO', `=== CONFIGURATION MENU ===`);
  
  console.log('\n=== Dashboard Configuration ===');
  console.log(`1. Memory Path: ${config.memoryPath}`);
  console.log(`2. Task Path: ${config.taskPath}`);
  console.log(`3. Auto-open Browser: ${config.autoOpenBrowser ? 'Yes' : 'No'}`);
  console.log('4. Analyze Memory Structure');
  console.log('5. Save and Start Dashboard');
  console.log('6. Exit');
  
  const choice = await askQuestion('\nEnter choice (1-6): ');
  log('INFO', `User selected menu option: ${choice}`);
  
  switch (choice) {
    case '1':
      const memoryPath = await askQuestion(`Enter memory path [${config.memoryPath}]: `);
      if (memoryPath) {
        const resolvedPath = path.resolve(memoryPath);
        log('INFO', `User entered memory path: ${memoryPath}`);
        log('INFO', `Resolved to: ${resolvedPath}`);
        
        if (!fs.existsSync(resolvedPath)) {
          log('INFO', `Creating memory directory: ${resolvedPath}`);
          fs.mkdirSync(resolvedPath, { recursive: true });
          log('SUCCESS', `Created directory: ${resolvedPath}`);
          console.log(`✓ Created directory: ${resolvedPath}`);
        } else {
          log('INFO', `Memory directory already exists: ${resolvedPath}`);
        }
        
        config.memoryPath = resolvedPath;
        log('SUCCESS', `Memory path updated to: ${config.memoryPath}`);
        console.log(`✓ Memory path set to: ${config.memoryPath}`);
      }
      return showConfigMenu(config);
      
    case '2':
      const taskPath = await askQuestion(`Enter task path [${config.taskPath}]: `);
      if (taskPath) {
        const resolvedPath = path.resolve(taskPath);
        log('INFO', `User entered task path: ${taskPath}`);
        log('INFO', `Resolved to: ${resolvedPath}`);
        
        if (!fs.existsSync(resolvedPath)) {
          log('INFO', `Creating task directory: ${resolvedPath}`);
          fs.mkdirSync(resolvedPath, { recursive: true });
          log('SUCCESS', `Created directory: ${resolvedPath}`);
          console.log(`✓ Created directory: ${resolvedPath}`);
        } else {
          log('INFO', `Task directory already exists: ${resolvedPath}`);
        }
        
        config.taskPath = resolvedPath;
        log('SUCCESS', `Task path updated to: ${config.taskPath}`);
        console.log(`✓ Task path set to: ${config.taskPath}`);
      }
      return showConfigMenu(config);
      
    case '3':
      const browser = await askQuestion(`Auto-open browser? (y/n) [${config.autoOpenBrowser ? 'y' : 'n'}]: `);
      if (browser.toLowerCase() === 'y' || browser.toLowerCase() === 'yes') {
        config.autoOpenBrowser = true;
        log('INFO', `Auto-open browser enabled`);
      } else if (browser.toLowerCase() === 'n' || browser.toLowerCase() === 'no') {
        config.autoOpenBrowser = false;
        log('INFO', `Auto-open browser disabled`);
      }
      console.log(`✓ Auto-open browser: ${config.autoOpenBrowser ? 'Yes' : 'No'}`);
      return showConfigMenu(config);
      
    case '4':
      log('INFO', `Running memory structure analysis...`);
      console.log('\n🔍 Analyzing memory structure...\n');
      const analysis = analyzeMemoryStructure(config.memoryPath);
      
      console.log('\n📊 Memory Analysis Results:');
      console.log(`   Directory exists: ${analysis.exists ? '✓' : '✗'}`);
      console.log(`   Projects found: ${analysis.projects}`);
      console.log(`   Memory files: ${analysis.memories}`);
      console.log(`   Errors: ${analysis.errors.length}`);
      
      if (analysis.projectList && analysis.projectList.length > 0) {
        console.log('\n📁 Projects found:');
        analysis.projectList.forEach(project => console.log(`   - ${project}`));
      }
      
      if (analysis.errors.length > 0) {
        console.log('\n❌ Errors encountered:');
        analysis.errors.forEach(error => console.log(`   - ${error}`));
      }
      
      await askQuestion('\nPress Enter to continue...');
      return showConfigMenu(config);
      
    case '5':
      saveConfig(config);
      console.log('✓ Configuration saved\n');
      return config;
      
    case '6':
      log('INFO', `User chose to exit`);
      console.log('Goodbye!');
      process.exit(0);
      
    default:
      log('WARN', `Invalid menu choice: ${choice}`);
      console.log('Invalid choice. Please enter 1-6.');
      return showConfigMenu(config);
  }
}

// Enhanced port checking with diagnostics
async function isPortAvailable(port) {
  log('INFO', `Testing port ${port} availability...`);
  
  return new Promise((resolve) => {
    const server = net.createServer();
    const timeout = setTimeout(() => {
      log('WARN', `Port ${port} test timed out`);
      server.close();
      resolve(false);
    }, 500);
    
    server.once('error', (err) => {
      clearTimeout(timeout);
      log('INFO', `Port ${port} error: ${err.code}`);
      resolve(err.code !== 'EADDRINUSE');
    });
    
    server.once('listening', () => {
      clearTimeout(timeout);
      log('INFO', `Port ${port} listening test passed`);
      
      server.close(() => {
        // Triple-check with connection test
        const client = new net.Socket();
        client.setTimeout(300);
        
        client.on('connect', () => {
          log('WARN', `Port ${port} connection test - something is listening`);
          client.destroy();
          resolve(false);
        });
        
        client.on('timeout', () => {
          log('SUCCESS', `Port ${port} connection timeout - port is free`);
          client.destroy();
          resolve(true);
        });
        
        client.on('error', (err) => {
          log('SUCCESS', `Port ${port} connection error - port is free: ${err.code}`);
          resolve(true);
        });
        
        client.connect(port, 'localhost');
      });
    });
    
    server.listen(port, '0.0.0.0');
  });
}

// Enhanced port finding with diagnostics
async function findAvailablePort(startPort = START_PORT) {
  log('INFO', `=== PORT DETECTION ===`);
  log('INFO', `Starting port scan from ${startPort}`);
  
  for (let port = startPort; port < startPort + MAX_ATTEMPTS; port++) {
    log('INFO', `Checking port ${port}...`);
    console.log(`Checking port ${port}...`);
    
    const available = await isPortAvailable(port);
    
    if (available) {
      log('SUCCESS', `Port ${port} is available and ready`);
      console.log(`✓ Port ${port} is available!\n`);
      return port;
    } else {
      log('WARN', `Port ${port} is busy or unavailable`);
      console.log(`✗ Port ${port} is busy`);
    }
  }
  
  const errorMsg = `No available ports found in range ${startPort}-${startPort + MAX_ATTEMPTS}`;
  log('ERROR', errorMsg);
  throw new Error(errorMsg);
}

// Enhanced Node.js finding with diagnostics
async function findNodeExecutable() {
  log('INFO', `=== NODE.JS DETECTION ===`);
  log('INFO', `Current process executable: ${process.execPath}`);
  log('INFO', `Running from pkg: ${!!process.pkg}`);
  
  if (process.pkg) {
    log('INFO', `Running from pkg executable, searching for system Node.js`);
    
    const possiblePaths = [
      'C:\\Program Files\\nodejs\\node.exe',
      'C:\\Program Files (x86)\\nodejs\\node.exe',
      path.join(process.env.APPDATA || '', '..', 'Local', 'Programs', 'nodejs', 'node.exe')
    ];
    
    log('INFO', `Checking possible Node.js paths...`);
    for (const nodePath of possiblePaths) {
      log('INFO', `Checking: ${nodePath}`);
      if (fs.existsSync(nodePath)) {
        log('SUCCESS', `Found Node.js at: ${nodePath}`);
        return nodePath;
      }
    }
    
    log('INFO', `Trying 'where node' command...`);
    return new Promise((resolve) => {
      exec('where node', (error, stdout) => {
        if (!error && stdout) {
          const nodePath = stdout.trim().split('\n')[0];
          log('SUCCESS', `Found Node.js via where command: ${nodePath}`);
          resolve(nodePath);
        } else {
          log('ERROR', `Could not find Node.js installation`);
          log('ERROR', `Error: ${error ? error.message : 'no output'}`);
          resolve(null);
        }
      });
    });
  } else {
    log('SUCCESS', `Running with Node.js directly: ${process.execPath}`);
    return process.execPath;
  }
}

// Enhanced dashboard startup with comprehensive diagnostics
async function startDashboard() {
  try {
    // Banner
    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║    Like-I-Said Dashboard DIAGNOSTIC     ║');
    console.log('║           Version 2.4.4-diag            ║');
    console.log('╚══════════════════════════════════════════╝\n');
    console.log(`📋 Diagnostic log: ${logFile}\n`);
    
    log('INFO', `=== DASHBOARD STARTUP DIAGNOSTICS ===`);
    log('INFO', `Platform: ${os.platform()} ${os.arch()}`);
    log('INFO', `Node Version: ${process.version}`);
    log('INFO', `Working Directory: ${process.cwd()}`);
    log('INFO', `Process ID: ${process.pid}`);
    log('INFO', `User: ${os.userInfo().username}`);
    log('INFO', `Home: ${os.homedir()}`);
    
    // Load configuration with diagnostics
    let config = loadConfig();
    
    // Check if this is first run or config flag
    const isFirstRun = !fs.existsSync(CONFIG_FILE);
    const forceConfig = process.argv.includes('--config');
    
    log('INFO', `First run: ${isFirstRun}`);
    log('INFO', `Force config: ${forceConfig}`);
    
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
    
    // Run comprehensive memory analysis
    log('INFO', `=== PRE-STARTUP ANALYSIS ===`);
    console.log('\n🔍 Analyzing memory structure before startup...');
    const memoryAnalysis = analyzeMemoryStructure(config.memoryPath);
    
    // Ensure directories exist with diagnostics
    log('INFO', `=== DIRECTORY PREPARATION ===`);
    if (!fs.existsSync(config.memoryPath)) {
      log('INFO', `Creating memory directory: ${config.memoryPath}`);
      fs.mkdirSync(config.memoryPath, { recursive: true });
      log('SUCCESS', `Created memory directory`);
    } else {
      log('SUCCESS', `Memory directory exists: ${config.memoryPath}`);
    }
    
    if (!fs.existsSync(config.taskPath)) {
      log('INFO', `Creating task directory: ${config.taskPath}`);
      fs.mkdirSync(config.taskPath, { recursive: true });
      log('SUCCESS', `Created task directory`);
    } else {
      log('SUCCESS', `Task directory exists: ${config.taskPath}`);
    }
    
    // Find available port with diagnostics
    const port = await findAvailablePort();
    
    // Find Node.js executable with diagnostics
    const nodeExe = await findNodeExecutable();
    
    if (!nodeExe) {
      const errorMsg = 'Node.js not found. Please install Node.js and ensure it is in your PATH.';
      log('ERROR', errorMsg);
      throw new Error(errorMsg);
    }
    
    // Check for server file with diagnostics
    const serverPath = path.join(process.cwd(), 'dashboard-server-bridge.js');
    log('INFO', `Checking for server file: ${serverPath}`);
    
    if (!fs.existsSync(serverPath)) {
      const errorMsg = `Server file not found at: ${serverPath}`;
      log('ERROR', errorMsg);
      throw new Error(errorMsg);
    }
    
    const serverStats = fs.statSync(serverPath);
    log('SUCCESS', `Server file found, size: ${serverStats.size} bytes`);
    
    // Set environment with comprehensive logging
    const env = {
      ...process.env,
      PORT: port.toString(),
      NODE_ENV: 'production',
      MEMORY_DIR: config.memoryPath,
      TASK_DIR: config.taskPath,
      DIAGNOSTIC_MODE: 'true'
    };
    
    log('INFO', `=== ENVIRONMENT SETUP ===`);
    log('INFO', `PORT: ${env.PORT}`);
    log('INFO', `NODE_ENV: ${env.NODE_ENV}`);
    log('INFO', `MEMORY_DIR: ${env.MEMORY_DIR}`);
    log('INFO', `TASK_DIR: ${env.TASK_DIR}`);
    log('INFO', `DIAGNOSTIC_MODE: ${env.DIAGNOSTIC_MODE}`);
    
    // Log startup summary
    log('INFO', `=== STARTUP SUMMARY ===`);
    log('INFO', `Memory directory: ${config.memoryPath}`);
    log('INFO', `Task directory: ${config.taskPath}`);
    log('INFO', `Memory projects found: ${memoryAnalysis.projects}`);
    log('INFO', `Memory files found: ${memoryAnalysis.memories}`);
    log('INFO', `Port: ${port}`);
    log('INFO', `Node.js: ${nodeExe}`);
    log('INFO', `Server: ${serverPath}`);
    
    console.log('\n🚀 Starting dashboard server...');
    log('INFO', `Starting server with: ${nodeExe} "${serverPath}"`);
    
    // Start server with diagnostics
    const child = spawn(nodeExe, [serverPath], {
      env,
      stdio: 'inherit',
      windowsHide: false
    });
    
    child.on('error', (err) => {
      log('ERROR', `Server start error: ${err.message}`);
      console.error(`\n❌ Failed to start server: ${err.message}`);
      process.exit(1);
    });
    
    child.on('exit', (code) => {
      log('INFO', `Server exited with code: ${code}`);
      if (code !== 0) {
        console.error(`\n💥 Server crashed with code ${code}`);
        console.log(`📋 Check diagnostic log: ${logFile}`);
      }
      process.exit(code || 0);
    });
    
    // Wait and show startup success
    setTimeout(async () => {
      const url = `http://localhost:${port}`;
      log('SUCCESS', `Dashboard ready at ${url}`);
      
      console.log(`\n✅ Dashboard running at: ${url}`);
      console.log(`📁 Memories: ${config.memoryPath} (${memoryAnalysis.memories} files)`);
      console.log(`📋 Tasks: ${config.taskPath}`);
      console.log(`📋 Full diagnostic log: ${logFile}`);
      console.log('\n🛑 Press Ctrl+C to stop\n');
      
      if (config.autoOpenBrowser) {
        exec(`start "" "${url}"`);
        log('INFO', `Browser opened automatically`);
      }
    }, 3000);
    
  } catch (error) {
    log('ERROR', `FATAL ERROR: ${error.message}`);
    log('ERROR', `Stack trace: ${error.stack}`);
    console.error(`\n💥 Fatal Error: ${error.message}`);
    console.log(`📋 Check diagnostic log: ${logFile}`);
    process.exit(1);
  }
}

// Enhanced graceful shutdown
process.on('SIGINT', () => {
  log('INFO', `=== GRACEFUL SHUTDOWN ===`);
  log('INFO', `Received SIGINT, shutting down...`);
  console.log('\n\n🛑 Shutting down...');
  logStream.end();
  process.exit(0);
});

// Enhanced error handlers
process.on('uncaughtException', (err) => {
  log('ERROR', `=== UNCAUGHT EXCEPTION ===`);
  log('ERROR', `Message: ${err.message}`);
  log('ERROR', `Stack: ${err.stack}`);
  console.error('\n💥 Unexpected error:', err.message);
  console.log(`📋 Details in diagnostic log: ${logFile}`);
  logStream.end();
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log('ERROR', `=== UNHANDLED REJECTION ===`);
  log('ERROR', `Reason: ${reason}`);
  log('ERROR', `Promise: ${promise}`);
  console.error('\n💥 Unhandled promise rejection:', reason);
  console.log(`📋 Details in diagnostic log: ${logFile}`);
});

// Start the diagnostic dashboard
log('INFO', `=== DIAGNOSTIC LAUNCHER STARTED ===`);
startDashboard();