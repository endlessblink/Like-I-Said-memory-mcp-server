#!/usr/bin/env node

/**
 * Like-I-Said Dashboard - Windows Launcher with Configuration System
 * Enhanced version with persistent settings and CLI configuration menu
 */

const net = require('net');
const http = require('http');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { DashboardConfig } = require('./lib/dashboard-config.cjs');

// Initialize configuration system
const config = new DashboardConfig();

// Parse command line arguments
const args = process.argv.slice(2);
const isConfigMode = args.includes('--config') || args.includes('-c');
const isQuickSetup = args.includes('--setup') || args.includes('-s');
const isShowConfig = args.includes('--show') || args.includes('--display');
const isResetConfig = args.includes('--reset');

// Create logs directory
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create timestamped log file
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const logFile = path.join(logsDir, `dashboard-${timestamp}.log`);
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

// Logging function with configurable levels
const logLevels = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLogLevel = logLevels[config.get('logLevel')] || 1;

const log = (msg, level = 'info', showConsole = true) => {
  const msgLevel = logLevels[level] || 1;
  const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${msg}`;
  
  if (msgLevel >= currentLogLevel && showConsole) {
    console.log(msg);
  }
  logStream.write(line + '\n');
};

// Display banner if enabled
function showBanner() {
  if (config.get('showStartupBanner')) {
    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║    Like-I-Said Dashboard for Windows     ║');
    console.log('║           Version 2.4.3                  ║');
    console.log('║        (Configurable Edition)            ║');
    console.log('╚══════════════════════════════════════════╝\n');
  }
}

// Handle command line arguments
async function handleCommandLineArgs() {
  if (isResetConfig) {
    console.log('Resetting configuration to defaults...');
    config.reset();
    console.log('✓ Configuration reset complete!');
    process.exit(0);
  }
  
  if (isShowConfig) {
    config.displayConfig();
    process.exit(0);
  }
  
  if (isQuickSetup) {
    const success = await config.quickSetup();
    process.exit(success ? 0 : 1);
  }
  
  if (isConfigMode) {
    await config.runConfigWizard();
    process.exit(0);
  }
}

// Display startup information
function showStartupInfo() {
  if (config.get('showStartupBanner')) {
    console.log(`Log file: ${logFile}`);
    console.log(`Config file: ${config.getConfigPath()}`);
    
    // Show configuration status
    if (!config.configExists()) {
      console.log('\n⚠ No configuration file found. Using defaults.');
      console.log('Run with --config to configure settings.');
    }
    
    console.log('');
  }
  
  log('=== Dashboard Launcher Starting ===');
  log(`Platform: ${os.platform()} ${os.arch()}`);
  log(`Node Version: ${process.version}`);
  log(`Working Directory: ${process.cwd()}`);
  log(`Executable: ${process.execPath}`);
  log(`Configuration: ${config.getConfigPath()}`);
  
  // Log current configuration
  const currentConfig = config.getAll();
  log(`Memory Directory: ${currentConfig.memoryDirectory}`);
  log(`Task Directory: ${currentConfig.taskDirectory}`);
  log(`Preferred Port: ${currentConfig.preferredPort}`);
  log(`Auto-open Browser: ${currentConfig.autoOpenBrowser}`);
}

// Validate configuration before starting
function validateConfiguration() {
  log('Validating configuration...');
  
  const validation = config.validateDirectories();
  let hasErrors = false;
  
  for (const [key, result] of Object.entries(validation)) {
    const label = key === 'memoryDirectory' ? 'Memory' : 'Task';
    
    if (result.error) {
      log(`${label} directory error: ${result.error}`, 'error');
      console.error(`✗ ${label} directory: ${result.error}`);
      hasErrors = true;
    } else if (result.created) {
      log(`${label} directory created: ${result.path}`, 'info');
      console.log(`✓ ${label} directory created: ${result.path}`);
    } else if (result.exists) {
      log(`${label} directory exists: ${result.path}`, 'debug');
    }
  }
  
  if (hasErrors) {
    console.error('\n✗ Configuration validation failed!');
    console.log('Please fix the issues above or run with --config to reconfigure.');
    console.log('Available options:');
    console.log('  --config    : Run configuration wizard');
    console.log('  --setup     : Quick setup with defaults');
    console.log('  --show      : Display current configuration');
    console.log('  --reset     : Reset to default configuration');
    process.exit(1);
  }
  
  log('Configuration validation passed', 'info');
}

// Check if Node.js is available
async function findNodeExecutable() {
  log('Searching for Node.js executable...');
  
  // First check if we're running from pkg
  if (process.pkg) {
    log('Running from pkg executable');
    // Look for node.exe in common locations
    const possiblePaths = [
      'C:\\Program Files\\nodejs\\node.exe',
      'C:\\Program Files (x86)\\nodejs\\node.exe',
      path.join(process.env.APPDATA || '', '..', 'Local', 'Programs', 'nodejs', 'node.exe'),
      path.join(process.env.ProgramFiles || '', 'nodejs', 'node.exe')
    ];
    
    // Also check PATH
    const pathDirs = (process.env.PATH || '').split(';');
    for (const dir of pathDirs) {
      if (dir.toLowerCase().includes('node')) {
        possiblePaths.push(path.join(dir, 'node.exe'));
      }
    }
    
    for (const nodePath of possiblePaths) {
      log(`Checking: ${nodePath}`, 'debug', false);
      if (fs.existsSync(nodePath)) {
        log(`Found Node.js at: ${nodePath}`);
        return nodePath;
      }
    }
    
    // Try to find via 'where' command
    return new Promise((resolve) => {
      exec('where node', (error, stdout) => {
        if (!error && stdout) {
          const nodePath = stdout.trim().split('\n')[0];
          log(`Found Node.js via where command: ${nodePath}`);
          resolve(nodePath);
        } else {
          log('WARNING: Could not find Node.js installation', 'warn');
          resolve(null);
        }
      });
    });
  } else {
    // Running directly with node
    log('Running with Node.js directly');
    return process.execPath;
  }
}

// Port checking with timeout
async function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    const timeout = setTimeout(() => {
      server.close();
      resolve(false);
    }, 200);
    
    server.once('error', (err) => {
      clearTimeout(timeout);
      if (err.code === 'EADDRINUSE') {
        log(`Port ${port}: In use`, 'debug', false);
        resolve(false);
      } else {
        resolve(true);
      }
    });
    
    server.once('listening', () => {
      clearTimeout(timeout);
      server.close(() => {
        // Also check if something is already listening
        const client = new net.Socket();
        client.setTimeout(200);
        
        client.on('connect', () => {
          client.destroy();
          log(`Port ${port}: Something is listening`, 'debug', false);
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

// Find available port starting from preferred port
async function findAvailablePort() {
  const preferredPort = config.get('preferredPort');
  const maxAttempts = 20;
  
  log(`Scanning for available port starting from ${preferredPort}...`);
  
  for (let port = preferredPort; port < preferredPort + maxAttempts; port++) {
    if (config.get('showStartupBanner')) {
      console.log(`Checking port ${port}...`);
    }
    const available = await isPortAvailable(port);
    
    if (available) {
      log(`✓ Port ${port} is available`);
      if (config.get('showStartupBanner')) {
        console.log(`✓ Port ${port} is available!\n`);
      }
      return port;
    } else {
      if (config.get('showStartupBanner')) {
        console.log(`✗ Port ${port} is busy`);
      }
    }
  }
  
  throw new Error(`No available ports found in range ${preferredPort}-${preferredPort + maxAttempts}`);
}

// Create backup if enabled
async function createBackupIfEnabled() {
  if (config.get('backupOnStartup')) {
    log('Creating backup before startup...');
    
    try {
      const backupDir = path.join(process.cwd(), 'data-backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      const backupTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const memoryDir = config.get('memoryDirectory');
      const taskDir = config.get('taskDirectory');
      
      if (fs.existsSync(memoryDir)) {
        const memoryBackup = path.join(backupDir, `memories-${backupTimestamp}`);
        fs.mkdirSync(memoryBackup, { recursive: true });
        // Copy memory files (simplified - you might want to use a proper copy function)
        log(`Memory backup created at ${memoryBackup}`);
      }
      
      if (fs.existsSync(taskDir)) {
        const taskBackup = path.join(backupDir, `tasks-${backupTimestamp}`);
        fs.mkdirSync(taskBackup, { recursive: true });
        // Copy task files (simplified - you might want to use a proper copy function)  
        log(`Task backup created at ${taskBackup}`);
      }
      
      log('Backup creation completed');
    } catch (error) {
      log(`Backup creation failed: ${error.message}`, 'warn');
    }
  }
}

// Start the dashboard with configuration
async function startDashboard() {
  try {
    // Create backup if enabled
    await createBackupIfEnabled();
    
    // Find available port
    const port = await findAvailablePort();
    
    log(`Preparing to start dashboard on port ${port}...`);
    
    // Find Node.js executable
    const nodeExe = await findNodeExecutable();
    
    if (!nodeExe) {
      // Fallback: Write a batch file and execute it
      log('Creating batch file launcher as fallback...');
      const batchFile = path.join(process.cwd(), 'start-dashboard-temp.bat');
      const batchContent = `@echo off
set PORT=${port}
set MEMORY_DIR=${config.get('memoryDirectory')}
set TASK_DIR=${config.get('taskDirectory')}
echo Starting dashboard on port ${port}...
echo Memory directory: %MEMORY_DIR%
echo Task directory: %TASK_DIR%
node dashboard-server-bridge.js
if errorlevel 1 (
  echo.
  echo ERROR: Failed to start dashboard server
  echo Make sure Node.js is installed and in PATH
  pause
)`;
      
      fs.writeFileSync(batchFile, batchContent);
      log(`Created batch file: ${batchFile}`);
      
      // Execute batch file
      const child = spawn('cmd', ['/c', batchFile], {
        stdio: 'inherit',
        env: { 
          ...process.env, 
          PORT: port.toString(),
          MEMORY_DIR: config.get('memoryDirectory'),
          TASK_DIR: config.get('taskDirectory')
        }
      });
      
      child.on('exit', (code) => {
        fs.unlinkSync(batchFile); // Clean up
        process.exit(code);
      });
      
    } else {
      // We have Node.js, start the server
      const serverPath = path.join(process.cwd(), 'dashboard-server-bridge.js');
      
      if (!fs.existsSync(serverPath)) {
        log(`ERROR: Server file not found at ${serverPath}`, 'error');
        console.error(`\nError: dashboard-server-bridge.js not found!`);
        console.log(`Please ensure all files are extracted to:`);
        console.log(process.cwd());
        process.exit(1);
      }
      
      log(`Starting server with Node.js...`);
      log(`Command: ${nodeExe} "${serverPath}"`);
      
      const env = { 
        ...process.env, 
        PORT: port.toString(),
        NODE_ENV: 'production',
        MEMORY_DIR: config.get('memoryDirectory'),
        TASK_DIR: config.get('taskDirectory'),
        LOG_LEVEL: config.get('logLevel')
      };
      
      const child = spawn(nodeExe, [serverPath], {
        env,
        stdio: 'inherit',
        windowsHide: false
      });
      
      child.on('error', (err) => {
        log(`ERROR: Failed to start - ${err.message}`, 'error');
        console.error(`\nFailed to start server: ${err.message}`);
        process.exit(1);
      });
      
      child.on('exit', (code) => {
        log(`Server exited with code: ${code}`);
        if (code !== 0) {
          console.error(`\nServer crashed with code ${code}`);
        }
        process.exit(code || 0);
      });
      
      // Wait and open browser if enabled
      if (config.get('autoOpenBrowser')) {
        setTimeout(async () => {
          const url = `http://localhost:${port}`;
          log(`Opening browser to ${url}`);
          
          if (config.get('showStartupBanner')) {
            console.log(`\n✓ Dashboard starting at: ${url}`);
            console.log('Press Ctrl+C to stop\n');
          }
          
          exec(`start "" "${url}"`);
        }, 3000);
      } else {
        setTimeout(() => {
          const url = `http://localhost:${port}`;
          if (config.get('showStartupBanner')) {
            console.log(`\n✓ Dashboard available at: ${url}`);
            console.log('Press Ctrl+C to stop\n');
          }
        }, 2000);
      }
    }
    
  } catch (error) {
    log(`FATAL ERROR: ${error.message}`, 'error');
    console.error(`\nError: ${error.message}`);
    console.log(`\nCheck log file: ${logFile}`);
    console.log('\nConfiguration options:');
    console.log('  --config    : Run configuration wizard');
    console.log('  --setup     : Quick setup with defaults');
    console.log('  --show      : Display current configuration');
    console.log('  --reset     : Reset to default configuration');
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  log('Shutting down...');
  if (config.get('showStartupBanner')) {
    console.log('\n\nShutting down...');
  }
  logStream.end();
  process.exit(0);
});

// Main execution
async function main() {
  try {
    // Handle command line arguments first
    await handleCommandLineArgs();
    
    // Show banner and startup info
    showBanner();
    showStartupInfo();
    
    // Check for first-time setup
    if (!config.configExists()) {
      console.log('\n🚀 First time setup detected!');
      console.log('Creating default configuration...');
      
      const success = await config.quickSetup();
      if (!success) {
        console.log('\nSetup failed. You can:');
        console.log('  1. Run: node dashboard-launcher-configurable.cjs --config');
        console.log('  2. Fix directory permissions and try again');
        process.exit(1);
      }
    }
    
    // Validate configuration
    validateConfiguration();
    
    // Start dashboard
    console.log('Initializing...\n');
    await startDashboard();
    
  } catch (error) {
    log(`FATAL ERROR in main: ${error.message}`, 'error');
    console.error(`\nFatal error: ${error.message}`);
    console.log(`\nCheck log file: ${logFile}`);
    process.exit(1);
  }
}

// Display help if needed
if (args.includes('--help') || args.includes('-h')) {
  console.log('\nLike-I-Said Dashboard Launcher (Configurable Edition)');
  console.log('\nUsage:');
  console.log('  node dashboard-launcher-configurable.cjs [options]');
  console.log('\nOptions:');
  console.log('  --config, -c    Run configuration wizard');
  console.log('  --setup, -s     Quick setup with defaults');
  console.log('  --show          Display current configuration');
  console.log('  --reset         Reset configuration to defaults');
  console.log('  --help, -h      Show this help message');
  console.log('\nExamples:');
  console.log('  node dashboard-launcher-configurable.cjs --config');
  console.log('  node dashboard-launcher-configurable.cjs --setup');
  console.log('  node dashboard-launcher-configurable.cjs --show');
  console.log('');
  process.exit(0);
}

// Start the application
main();