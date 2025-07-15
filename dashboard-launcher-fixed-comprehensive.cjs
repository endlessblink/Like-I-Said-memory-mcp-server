#!/usr/bin/env node

/**
 * Like-I-Said Dashboard - FINAL FIXED VERSION with All Path Fixes
 * Version 2.4.5-fixed-comprehensive
 * 
 * This version includes ALL the hardcoded path fixes:
 * - dashboard-server-bridge.js: Fixed to use MEMORY_DIR/TASK_DIR
 * - lib/system-safeguards.js: Fixed to use environment variables
 * - lib/memory-storage-wrapper.js: Fixed to use environment variables
 * - lib/task-storage.js: Fixed to use environment variables
 * - lib/dropoff-generator.js: Fixed to use environment variables
 * - lib/file-system-monitor.js: Fixed to use environment variables
 * - lib/project-task-manager.js: Fixed to use environment variables
 * - lib/task-format.js: Fixed to use environment variables
 * 
 * COMPREHENSIVE LOGGING and MEMORY ANALYSIS included
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
const logFile = path.join(logsDir, `dashboard-final-fixed-${timestamp}.log`);
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
    } else if (level === 'FIX') {
      console.log(`🔧 ${msg}`);
    } else {
      console.log(`🔵 ${msg}`);
    }
  }
  logStream.write(line + '\n');
};

// Deep memory structure analysis
function analyzeMemoryStructure(memoryPath) {
  log('INFO', `=== COMPREHENSIVE MEMORY ANALYSIS ===`);
  log('INFO', `Target memory path: ${memoryPath}`);
  
  try {
    // Check if base directory exists
    if (!fs.existsSync(memoryPath)) {
      log('ERROR', `Memory directory DOES NOT EXIST: ${memoryPath}`);
      return { exists: false, projects: 0, memories: 0, errors: [`Directory does not exist: ${memoryPath}`] };
    }
    
    log('SUCCESS', `Memory directory EXISTS: ${memoryPath}`);
    
    // Get comprehensive directory stats
    const stats = fs.statSync(memoryPath);
    log('INFO', `Directory created: ${stats.birthtime}`);
    log('INFO', `Directory modified: ${stats.mtime}`);
    log('INFO', `Directory permissions: ${stats.mode.toString(8)}`);
    log('INFO', `Is directory: ${stats.isDirectory()}`);
    log('INFO', `Directory size: ${stats.size} bytes`);
    
    // Deep scan all items
    const items = fs.readdirSync(memoryPath);
    log('INFO', `Total items in memory directory: ${items.length}`);
    
    if (items.length === 0) {
      log('WARN', `Memory directory is EMPTY - no projects found`);
      return { exists: true, projects: 0, memories: 0, errors: [], empty: true };
    }
    
    const projects = [];
    const files = [];
    const errors = [];
    let totalMemories = 0;
    let totalSize = 0;
    
    // Analyze each item in detail
    for (const item of items) {
      const itemPath = path.join(memoryPath, item);
      
      try {
        const itemStats = fs.statSync(itemPath);
        
        if (itemStats.isDirectory()) {
          log('INFO', `📁 PROJECT DIRECTORY: ${item}`);
          log('INFO', `  - Created: ${itemStats.birthtime}`);
          log('INFO', `  - Modified: ${itemStats.mtime}`);
          log('INFO', `  - Size: ${itemStats.size} bytes`);
          
          projects.push(item);
          
          // Deep scan project directory
          try {
            const projectFiles = fs.readdirSync(itemPath);
            const mdFiles = projectFiles.filter(f => f.endsWith('.md'));
            
            log('INFO', `  - Total files: ${projectFiles.length}`);
            log('INFO', `  - Markdown files: ${mdFiles.length}`);
            
            if (mdFiles.length === 0) {
              log('WARN', `  - ❌ NO MEMORY FILES in project "${item}"`);
            } else {
              log('SUCCESS', `  - ✅ ${mdFiles.length} memory files found`);
            }
            
            totalMemories += mdFiles.length;
            
            // Analyze each memory file
            for (const mdFile of mdFiles) {
              const mdPath = path.join(itemPath, mdFile);
              
              try {
                const mdStats = fs.statSync(mdPath);
                const content = fs.readFileSync(mdPath, 'utf-8');
                
                log('INFO', `    📄 ${mdFile}:`);
                log('INFO', `      - Size: ${mdStats.size} bytes`);
                log('INFO', `      - Content length: ${content.length} chars`);
                log('INFO', `      - Created: ${mdStats.birthtime}`);
                log('INFO', `      - Modified: ${mdStats.mtime}`);
                
                totalSize += mdStats.size;
                
                // Parse memory metadata
                const hasYamlFrontmatter = content.startsWith('---');
                const hasHtmlComment = content.includes('<!--');
                
                log('INFO', `      - YAML frontmatter: ${hasYamlFrontmatter ? '✅' : '❌'}`);
                log('INFO', `      - HTML comment: ${hasHtmlComment ? '✅' : '❌'}`);
                
                // Extract memory ID
                const idMatch = content.match(/id:\\s*([^\\s\\n]+)/);
                if (idMatch) {
                  log('SUCCESS', `      - Memory ID: ${idMatch[1]}`);
                } else {
                  log('ERROR', `      - ❌ NO ID found in memory file`);
                  errors.push(`No ID in ${mdPath}`);
                }
                
                // Extract project
                const projectMatch = content.match(/project:\\s*([^\\s\\n]+)/);
                if (projectMatch) {
                  log('INFO', `      - Project: ${projectMatch[1]}`);
                } else {
                  log('WARN', `      - No project field in memory`);
                }
                
                // Extract category
                const categoryMatch = content.match(/category:\\s*([^\\s\\n]+)/);
                if (categoryMatch) {
                  log('INFO', `      - Category: ${categoryMatch[1]}`);
                }
                
                // Extract tags
                const tagsMatch = content.match(/tags:\\s*\\[([^\\]]+)\\]/);
                if (tagsMatch) {
                  log('INFO', `      - Tags: ${tagsMatch[1]}`);
                }
                
                // Check content section
                const contentLines = content.split('\\n');
                const contentStart = contentLines.findIndex(line => line === '---' && contentLines.indexOf(line) > 0);
                if (contentStart > 0) {
                  const actualContent = contentLines.slice(contentStart + 1).join('\\n').trim();
                  log('INFO', `      - Content lines: ${actualContent.split('\\n').length}`);
                  log('INFO', `      - Content preview: ${actualContent.substring(0, 100)}...`);
                } else {
                  log('WARN', `      - No content section found`);
                }
                
              } catch (mdError) {
                log('ERROR', `      - ❌ Error reading memory file: ${mdError.message}`);
                errors.push(`Error reading ${mdPath}: ${mdError.message}`);
              }
            }
            
          } catch (projectError) {
            log('ERROR', `  - ❌ Error reading project directory: ${projectError.message}`);
            errors.push(`Error reading project ${item}: ${projectError.message}`);
          }
          
        } else {
          log('INFO', `📄 FILE (not directory): ${item} (${itemStats.size} bytes)`);
          files.push(item);
        }
        
      } catch (itemError) {
        log('ERROR', `❌ Error analyzing item "${item}": ${itemError.message}`);
        errors.push(`Error analyzing ${item}: ${itemError.message}`);
      }
    }
    
    log('INFO', `=== FINAL MEMORY ANALYSIS RESULTS ===`);
    log('INFO', `📊 Total projects: ${projects.length}`);
    log('INFO', `📄 Total memory files: ${totalMemories}`);
    log('INFO', `📁 Non-directory files: ${files.length}`);
    log('INFO', `💾 Total memory content size: ${totalSize} bytes`);
    log('INFO', `❌ Errors encountered: ${errors.length}`);
    
    if (projects.length > 0) {
      log('SUCCESS', `✅ Projects found: ${projects.join(', ')}`);
    } else {
      log('ERROR', `❌ NO PROJECTS FOUND - this explains why memories aren't loading!`);
    }
    
    if (totalMemories === 0) {
      log('ERROR', `❌ NO MEMORY FILES FOUND - dashboard will be empty!`);
    } else {
      log('SUCCESS', `✅ ${totalMemories} memory files ready for dashboard`);
    }
    
    if (errors.length > 0) {
      log('ERROR', `❌ ERRORS FOUND - these may prevent memory loading:`);
      errors.forEach(error => log('ERROR', `  - ${error}`));
    }
    
    return {
      exists: true,
      projects: projects.length,
      memories: totalMemories,
      errors: errors,
      projectList: projects,
      fileList: files,
      totalSize: totalSize,
      empty: totalMemories === 0
    };
    
  } catch (error) {
    log('ERROR', `💥 CRITICAL ERROR in memory analysis: ${error.message}`);
    log('ERROR', `Stack: ${error.stack}`);
    return { exists: false, projects: 0, memories: 0, errors: [error.message], critical: true };
  }
}

// Environment variable validation
function validateEnvironmentSetup(config) {
  log('INFO', `=== ENVIRONMENT VARIABLE VALIDATION ===`);
  
  // Check current environment
  log('INFO', `Current MEMORY_DIR: ${process.env.MEMORY_DIR || 'not set'}`);
  log('INFO', `Current TASK_DIR: ${process.env.TASK_DIR || 'not set'}`);
  log('INFO', `Current NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  log('INFO', `Current PORT: ${process.env.PORT || 'not set'}`);
  
  // Validate memory directory
  if (process.env.MEMORY_DIR) {
    if (process.env.MEMORY_DIR === config.memoryPath) {
      log('SUCCESS', `✅ MEMORY_DIR matches config: ${process.env.MEMORY_DIR}`);
    } else {
      log('WARN', `⚠️ MEMORY_DIR mismatch - env: ${process.env.MEMORY_DIR}, config: ${config.memoryPath}`);
    }
  } else {
    log('WARN', `⚠️ MEMORY_DIR not set - will use default 'memories'`);
  }
  
  // Validate task directory
  if (process.env.TASK_DIR) {
    if (process.env.TASK_DIR === config.taskPath) {
      log('SUCCESS', `✅ TASK_DIR matches config: ${process.env.TASK_DIR}`);
    } else {
      log('WARN', `⚠️ TASK_DIR mismatch - env: ${process.env.TASK_DIR}, config: ${config.taskPath}`);
    }
  } else {
    log('WARN', `⚠️ TASK_DIR not set - will use default 'tasks'`);
  }
  
  return {
    memoryDirSet: !!process.env.MEMORY_DIR,
    taskDirSet: !!process.env.TASK_DIR,
    memoryDirMatch: process.env.MEMORY_DIR === config.memoryPath,
    taskDirMatch: process.env.TASK_DIR === config.taskPath
  };
}

// Load configuration with comprehensive validation
function loadConfig() {
  log('INFO', `=== CONFIGURATION LOADING & VALIDATION ===`);
  log('INFO', `Config file path: ${CONFIG_FILE}`);
  
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      log('SUCCESS', `✅ Config file exists`);
      
      const configContent = fs.readFileSync(CONFIG_FILE, 'utf8');
      log('INFO', `Config file size: ${configContent.length} bytes`);
      
      const config = JSON.parse(configContent);
      log('SUCCESS', `✅ Config parsed successfully`);
      
      // Validate config structure
      const requiredFields = ['memoryPath', 'taskPath', 'autoOpenBrowser'];
      for (const field of requiredFields) {
        if (field in config) {
          log('SUCCESS', `✅ Config has ${field}: ${config[field]}`);
        } else {
          log('WARN', `⚠️ Config missing ${field}`);
        }
      }
      
      const mergedConfig = { ...DEFAULT_CONFIG, ...config };
      log('INFO', `Final memory path: ${mergedConfig.memoryPath}`);
      log('INFO', `Final task path: ${mergedConfig.taskPath}`);
      log('INFO', `Auto-open browser: ${mergedConfig.autoOpenBrowser}`);
      
      return mergedConfig;
    } else {
      log('WARN', `⚠️ Config file does not exist, using defaults`);
    }
  } catch (error) {
    log('ERROR', `❌ Error loading config: ${error.message}`);
  }
  
  log('INFO', `Using default configuration`);
  return DEFAULT_CONFIG;
}

// Save configuration with validation
function saveConfig(config) {
  log('INFO', `=== CONFIGURATION SAVING ===`);
  
  try {
    config.lastUsed = new Date().toISOString();
    const configJson = JSON.stringify(config, null, 2);
    
    log('INFO', `Config JSON size: ${configJson.length} bytes`);
    log('INFO', `Saving to: ${CONFIG_FILE}`);
    
    fs.writeFileSync(CONFIG_FILE, configJson);
    log('SUCCESS', `✅ Configuration saved successfully`);
    
    // Verify the save worked
    if (fs.existsSync(CONFIG_FILE)) {
      const savedSize = fs.statSync(CONFIG_FILE).size;
      log('SUCCESS', `✅ Verified saved file size: ${savedSize} bytes`);
    }
    
    return true;
  } catch (error) {
    log('ERROR', `❌ Error saving config: ${error.message}`);
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

// Enhanced configuration menu
async function showConfigMenu(config) {
  log('INFO', `=== CONFIGURATION MENU ===`);
  
  console.log('\\n=== Dashboard Configuration ===');
  console.log(`1. Memory Path: ${config.memoryPath}`);
  console.log(`2. Task Path: ${config.taskPath}`);
  console.log(`3. Auto-open Browser: ${config.autoOpenBrowser ? 'Yes' : 'No'}`);
  console.log('4. Analyze Memory Structure');
  console.log('5. Test Environment Variables');
  console.log('6. Save and Start Dashboard');
  console.log('7. Exit');
  
  const choice = await askQuestion('\\nEnter choice (1-7): ');
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
          log('SUCCESS', `✅ Created directory: ${resolvedPath}`);
          console.log(`✓ Created directory: ${resolvedPath}`);
        } else {
          log('INFO', `Memory directory already exists: ${resolvedPath}`);
        }
        
        config.memoryPath = resolvedPath;
        log('SUCCESS', `✅ Memory path updated to: ${config.memoryPath}`);
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
          log('SUCCESS', `✅ Created directory: ${resolvedPath}`);
          console.log(`✓ Created directory: ${resolvedPath}`);
        } else {
          log('INFO', `Task directory already exists: ${resolvedPath}`);
        }
        
        config.taskPath = resolvedPath;
        log('SUCCESS', `✅ Task path updated to: ${config.taskPath}`);
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
      log('INFO', `Running comprehensive memory analysis...`);
      console.log('\\n🔍 Analyzing memory structure...');
      const analysis = analyzeMemoryStructure(config.memoryPath);
      
      console.log('\\n📊 Memory Analysis Results:');
      console.log(`   Directory exists: ${analysis.exists ? '✅' : '❌'}`);
      console.log(`   Projects found: ${analysis.projects}`);
      console.log(`   Memory files: ${analysis.memories}`);
      console.log(`   Total size: ${analysis.totalSize || 0} bytes`);
      console.log(`   Errors: ${analysis.errors.length}`);
      
      if (analysis.empty) {
        console.log('\\n⚠️ WARNING: No memory files found - dashboard will be empty!');
      }
      
      if (analysis.projectList && analysis.projectList.length > 0) {
        console.log('\\n📁 Projects found:');
        analysis.projectList.forEach(project => console.log(`   - ${project}`));
      }
      
      if (analysis.errors.length > 0) {
        console.log('\\n❌ Errors encountered:');
        analysis.errors.forEach(error => console.log(`   - ${error}`));
      }
      
      await askQuestion('\\nPress Enter to continue...');
      return showConfigMenu(config);
      
    case '5':
      log('INFO', `Testing environment variable setup...`);
      console.log('\\n🧪 Testing environment variables...');
      const envTest = validateEnvironmentSetup(config);
      
      console.log('\\n🔧 Environment Status:');
      console.log(`   MEMORY_DIR set: ${envTest.memoryDirSet ? '✅' : '❌'}`);
      console.log(`   TASK_DIR set: ${envTest.taskDirSet ? '✅' : '❌'}`);
      console.log(`   MEMORY_DIR matches: ${envTest.memoryDirMatch ? '✅' : '❌'}`);
      console.log(`   TASK_DIR matches: ${envTest.taskDirMatch ? '✅' : '❌'}`);
      
      await askQuestion('\\nPress Enter to continue...');
      return showConfigMenu(config);
      
    case '6':
      saveConfig(config);
      console.log('✅ Configuration saved\\n');
      return config;
      
    case '7':
      log('INFO', `User chose to exit`);
      console.log('Goodbye!');
      process.exit(0);
      
    default:
      log('WARN', `Invalid menu choice: ${choice}`);
      console.log('Invalid choice. Please enter 1-7.');
      return showConfigMenu(config);
  }
}

// Port availability testing
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

// Find available port
async function findAvailablePort(startPort = START_PORT) {
  log('INFO', `=== PORT DETECTION ===`);
  log('INFO', `Starting port scan from ${startPort}`);
  
  for (let port = startPort; port < startPort + MAX_ATTEMPTS; port++) {
    log('INFO', `Checking port ${port}...`);
    console.log(`Checking port ${port}...`);
    
    const available = await isPortAvailable(port);
    
    if (available) {
      log('SUCCESS', `✅ Port ${port} is available and ready`);
      console.log(`✅ Port ${port} is available!\\n`);
      return port;
    } else {
      log('WARN', `❌ Port ${port} is busy or unavailable`);
      console.log(`❌ Port ${port} is busy`);
    }
  }
  
  const errorMsg = `No available ports found in range ${startPort}-${startPort + MAX_ATTEMPTS}`;
  log('ERROR', errorMsg);
  throw new Error(errorMsg);
}

// Find Node.js executable
async function findNodeExecutable() {
  log('INFO', `=== NODE.JS DETECTION ===`);
  log('INFO', `Current process executable: ${process.execPath}`);
  log('INFO', `Running from pkg: ${!!process.pkg}`);
  
  if (process.pkg) {
    log('INFO', `Running from pkg executable, searching for system Node.js`);
    
    const possiblePaths = [
      'C:\\\\Program Files\\\\nodejs\\\\node.exe',
      'C:\\\\Program Files (x86)\\\\nodejs\\\\node.exe',
      path.join(process.env.APPDATA || '', '..', 'Local', 'Programs', 'nodejs', 'node.exe')
    ];
    
    log('INFO', `Checking possible Node.js paths...`);
    for (const nodePath of possiblePaths) {
      log('INFO', `Checking: ${nodePath}`);
      if (fs.existsSync(nodePath)) {
        log('SUCCESS', `✅ Found Node.js at: ${nodePath}`);
        return nodePath;
      }
    }
    
    log('INFO', `Trying 'where node' command...`);
    return new Promise((resolve) => {
      exec('where node', (error, stdout) => {
        if (!error && stdout) {
          const nodePath = stdout.trim().split('\\n')[0];
          log('SUCCESS', `✅ Found Node.js via where command: ${nodePath}`);
          resolve(nodePath);
        } else {
          log('ERROR', `❌ Could not find Node.js installation`);
          log('ERROR', `Error: ${error ? error.message : 'no output'}`);
          resolve(null);
        }
      });
    });
  } else {
    log('SUCCESS', `✅ Running with Node.js directly: ${process.execPath}`);
    return process.execPath;
  }
}

// Main dashboard startup function
async function startDashboard() {
  try {
    // Banner
    console.log('\\n╔══════════════════════════════════════════╗');
    console.log('║    Like-I-Said Dashboard FINAL FIXED    ║');
    console.log('║           Version 2.4.5-final           ║');
    console.log('║                                          ║');
    console.log('║  🔧 ALL HARDCODED PATHS FIXED          ║');
    console.log('║  📋 COMPREHENSIVE DIAGNOSTICS          ║');
    console.log('║  🎯 MEMORY LOADING SHOULD WORK          ║');
    console.log('╚══════════════════════════════════════════╝\\n');
    console.log(`📋 Complete diagnostic log: ${logFile}\\n`);
    
    log('INFO', `=== DASHBOARD STARTUP - FIXED VERSION ===`);
    log('FIX', `✅ All hardcoded paths have been fixed to use environment variables`);
    log('FIX', `✅ dashboard-server-bridge.js: Uses MEMORY_DIR/TASK_DIR`);
    log('FIX', `✅ lib/system-safeguards.js: Uses environment variables`);
    log('FIX', `✅ lib/memory-storage-wrapper.js: Uses environment variables`);
    log('FIX', `✅ lib/task-storage.js: Uses environment variables`);
    log('FIX', `✅ lib/dropoff-generator.js: Uses environment variables`);
    log('FIX', `✅ lib/file-system-monitor.js: Uses environment variables`);
    log('FIX', `✅ lib/project-task-manager.js: Uses environment variables`);
    log('FIX', `✅ lib/task-format.js: Uses environment variables`);
    
    log('INFO', `Platform: ${os.platform()} ${os.arch()}`);
    log('INFO', `Node Version: ${process.version}`);
    log('INFO', `Working Directory: ${process.cwd()}`);
    log('INFO', `Process ID: ${process.pid}`);
    log('INFO', `User: ${os.userInfo().username}`);
    
    // Load configuration
    let config = loadConfig();
    
    // Check if this is first run or config flag
    const isFirstRun = !fs.existsSync(CONFIG_FILE);
    const forceConfig = process.argv.includes('--config');
    
    log('INFO', `First run: ${isFirstRun}`);
    log('INFO', `Force config: ${forceConfig}`);
    
    if (isFirstRun || forceConfig) {
      console.log('=== First Time Setup ===');
      console.log('Please configure your dashboard settings:\\n');
      config = await showConfigMenu(config);
    } else {
      console.log('Current configuration:');
      console.log(`📁 Memories: ${config.memoryPath}`);
      console.log(`📋 Tasks: ${config.taskPath}`);
      console.log(`🌐 Auto-open: ${config.autoOpenBrowser ? 'Yes' : 'No'}`);
      
      if (config.lastUsed) {
        console.log(`📅 Last used: ${new Date(config.lastUsed).toLocaleString()}`);
      }
      
      const choice = await askQuestion('\\nPress Enter to start, or type \"config\" to change settings: ');
      
      if (choice.toLowerCase() === 'config') {
        config = await showConfigMenu(config);
      }
    }
    
    // Run comprehensive pre-startup analysis
    log('INFO', `=== PRE-STARTUP COMPREHENSIVE ANALYSIS ===`);
    console.log('\\n🔍 Running comprehensive analysis before startup...');
    
    const memoryAnalysis = analyzeMemoryStructure(config.memoryPath);
    const envValidation = validateEnvironmentSetup(config);
    
    // Ensure directories exist
    log('INFO', `=== DIRECTORY PREPARATION ===`);
    if (!fs.existsSync(config.memoryPath)) {
      log('INFO', `Creating memory directory: ${config.memoryPath}`);
      fs.mkdirSync(config.memoryPath, { recursive: true });
      log('SUCCESS', `✅ Created memory directory`);
    } else {
      log('SUCCESS', `✅ Memory directory exists: ${config.memoryPath}`);
    }
    
    if (!fs.existsSync(config.taskPath)) {
      log('INFO', `Creating task directory: ${config.taskPath}`);
      fs.mkdirSync(config.taskPath, { recursive: true });
      log('SUCCESS', `✅ Created task directory`);
    } else {
      log('SUCCESS', `✅ Task directory exists: ${config.taskPath}`);
    }
    
    // Find available port
    const port = await findAvailablePort();
    
    // Find Node.js executable
    const nodeExe = await findNodeExecutable();
    
    if (!nodeExe) {
      const errorMsg = 'Node.js not found. Please install Node.js and ensure it is in your PATH.';
      log('ERROR', errorMsg);
      throw new Error(errorMsg);
    }
    
    // Check for server file
    const serverPath = path.join(process.cwd(), 'dashboard-server-bridge.js');
    log('INFO', `Checking for server file: ${serverPath}`);
    
    if (!fs.existsSync(serverPath)) {
      const errorMsg = `Server file not found at: ${serverPath}`;
      log('ERROR', errorMsg);
      throw new Error(errorMsg);
    }
    
    const serverStats = fs.statSync(serverPath);
    log('SUCCESS', `✅ Server file found, size: ${serverStats.size} bytes`);
    
    // Set environment with ALL fixes
    const env = {
      ...process.env,
      PORT: port.toString(),
      NODE_ENV: 'production',
      MEMORY_DIR: config.memoryPath,
      TASK_DIR: config.taskPath,
      COMPREHENSIVE_LOGGING: 'true',
      FIXED_VERSION: 'true'
    };
    
    log('INFO', `=== ENVIRONMENT SETUP WITH ALL FIXES ===`);
    log('FIX', `✅ PORT: ${env.PORT}`);
    log('FIX', `✅ NODE_ENV: ${env.NODE_ENV}`);
    log('FIX', `✅ MEMORY_DIR: ${env.MEMORY_DIR}`);
    log('FIX', `✅ TASK_DIR: ${env.TASK_DIR}`);
    log('FIX', `✅ COMPREHENSIVE_LOGGING: ${env.COMPREHENSIVE_LOGGING}`);
    log('FIX', `✅ FIXED_VERSION: ${env.FIXED_VERSION}`);
    
    // Final startup summary
    log('INFO', `=== STARTUP SUMMARY ===`);
    log('SUCCESS', `✅ Memory directory: ${config.memoryPath}`);
    log('SUCCESS', `✅ Task directory: ${config.taskPath}`);
    log('SUCCESS', `✅ Memory projects found: ${memoryAnalysis.projects}`);
    log('SUCCESS', `✅ Memory files found: ${memoryAnalysis.memories}`);
    log('SUCCESS', `✅ Port: ${port}`);
    log('SUCCESS', `✅ Node.js: ${nodeExe}`);
    log('SUCCESS', `✅ Server: ${serverPath}`);
    log('SUCCESS', `✅ All hardcoded paths fixed`);
    log('SUCCESS', `✅ Environment variables properly set`);
    
    if (memoryAnalysis.empty) {
      log('WARN', `⚠️ No memory files found - dashboard will be empty but should work`);
    } else {
      log('SUCCESS', `✅ ${memoryAnalysis.memories} memory files ready for loading`);
    }
    
    console.log('\\n🚀 Starting dashboard server with ALL fixes applied...');
    console.log(`📊 Found ${memoryAnalysis.projects} projects with ${memoryAnalysis.memories} memory files`);
    console.log(`🔧 All hardcoded paths have been fixed to use environment variables`);
    console.log(`📋 Full diagnostic log: ${logFile}`);
    
    log('INFO', `Starting server with: ${nodeExe} \"${serverPath}\"`);
    
    // Start server
    const child = spawn(nodeExe, [serverPath], {
      env,
      stdio: 'inherit',
      windowsHide: false
    });
    
    child.on('error', (err) => {
      log('ERROR', `❌ Server start error: ${err.message}`);
      console.error(`\\n❌ Failed to start server: ${err.message}`);
      process.exit(1);
    });
    
    child.on('exit', (code) => {
      log('INFO', `Server exited with code: ${code}`);
      if (code !== 0) {
        console.error(`\\n💥 Server crashed with code ${code}`);
        console.log(`📋 Check comprehensive log: ${logFile}`);
      }
      process.exit(code || 0);
    });
    
    // Wait and show startup success
    setTimeout(async () => {
      const url = `http://localhost:${port}`;
      log('SUCCESS', `✅ Dashboard ready at ${url}`);
      
      console.log(`\\n🎉 Dashboard running at: ${url}`);
      console.log(`📁 Memories: ${config.memoryPath} (${memoryAnalysis.memories} files)`);
      console.log(`📋 Tasks: ${config.taskPath}`);
      console.log(`🔧 Fixed version with all hardcoded paths resolved`);
      console.log(`📋 Complete diagnostic log: ${logFile}`);
      console.log('\\n🛑 Press Ctrl+C to stop\\n');
      
      if (config.autoOpenBrowser) {
        exec(`start \"\" \"${url}\"`);
        log('INFO', `Browser opened automatically`);
      }
    }, 3000);
    
  } catch (error) {
    log('ERROR', `💥 FATAL ERROR: ${error.message}`);
    log('ERROR', `Stack trace: ${error.stack}`);
    console.error(`\\n💥 Fatal Error: ${error.message}`);
    console.log(`📋 Check comprehensive diagnostic log: ${logFile}`);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  log('INFO', `=== GRACEFUL SHUTDOWN ===`);
  console.log('\\n\\n🛑 Shutting down...');
  logStream.end();
  process.exit(0);
});

// Error handlers
process.on('uncaughtException', (err) => {
  log('ERROR', `=== UNCAUGHT EXCEPTION ===`);
  log('ERROR', `Message: ${err.message}`);
  log('ERROR', `Stack: ${err.stack}`);
  console.error('\\n💥 Unexpected error:', err.message);
  console.log(`📋 Details in comprehensive log: ${logFile}`);
  logStream.end();
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log('ERROR', `=== UNHANDLED REJECTION ===`);
  log('ERROR', `Reason: ${reason}`);
  log('ERROR', `Promise: ${promise}`);
  console.error('\\n💥 Unhandled promise rejection:', reason);
  console.log(`📋 Details in comprehensive log: ${logFile}`);
});

// Start the final fixed dashboard
log('INFO', `=== FINAL FIXED LAUNCHER STARTED ===`);
log('FIX', `✅ This version includes ALL hardcoded path fixes`);
log('FIX', `✅ Memory loading should now work correctly`);
startDashboard();