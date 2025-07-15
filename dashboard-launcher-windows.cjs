#!/usr/bin/env node

/**
 * Like-I-Said Dashboard - Windows-Specific Launcher
 * Handles ES modules and port detection properly
 */

const net = require('net');
const http = require('http');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

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

// Banner
console.log('\n╔══════════════════════════════════════════╗');
console.log('║    Like-I-Said Dashboard for Windows     ║');
console.log('║           Version 2.4.3                  ║');
console.log('╚══════════════════════════════════════════╝\n');
console.log(`Log file: ${logFile}\n`);

log('=== Dashboard Launcher Starting ===');
log(`Platform: ${os.platform()} ${os.arch()}`);
log(`Node Version: ${process.version}`);
log(`Working Directory: ${process.cwd()}`);
log(`Executable: ${process.execPath}`);

// Configuration
const START_PORT = 3001;
const MAX_ATTEMPTS = 20;

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
      log(`Checking: ${nodePath}`, false);
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
          log('WARNING: Could not find Node.js installation');
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
        log(`Port ${port}: In use`, false);
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
          log(`Port ${port}: Something is listening`, false);
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
async function findAvailablePort() {
  log('Scanning for available port...');
  
  for (let port = START_PORT; port < START_PORT + MAX_ATTEMPTS; port++) {
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
  
  throw new Error(`No available ports found in range ${START_PORT}-${START_PORT + MAX_ATTEMPTS}`);
}

// Start the dashboard
async function startDashboard() {
  try {
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
echo Starting dashboard on port ${port}...
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
        env: { ...process.env, PORT: port.toString() }
      });
      
      child.on('exit', (code) => {
        fs.unlinkSync(batchFile); // Clean up
        process.exit(code);
      });
      
    } else {
      // We have Node.js, start the server
      const serverPath = path.join(process.cwd(), 'dashboard-server-bridge.js');
      
      if (!fs.existsSync(serverPath)) {
        log(`ERROR: Server file not found at ${serverPath}`);
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
        NODE_ENV: 'production'
      };
      
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
        }
        process.exit(code || 0);
      });
      
      // Wait and open browser
      setTimeout(async () => {
        const url = `http://localhost:${port}`;
        log(`Opening browser to ${url}`);
        console.log(`\n✓ Dashboard starting at: ${url}`);
        console.log('Press Ctrl+C to stop\n');
        
        exec(`start "" "${url}"`);
      }, 3000);
    }
    
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

// Start
console.log('Initializing...\n');
startDashboard();