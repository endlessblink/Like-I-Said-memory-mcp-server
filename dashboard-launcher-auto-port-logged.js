#!/usr/bin/env node

/**
 * Like-I-Said Dashboard Launcher with Auto Port Detection and Logging
 * Creates a log file to help diagnose issues
 */

import { createServer } from 'net';
import { spawn } from 'child_process';
import http from 'http';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create logs directory
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create log file with timestamp
const logFile = path.join(logsDir, `dashboard-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

// Log to both console and file
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  console.log(logMessage);
  logStream.write(logMessage + '\n');
}

// Log errors with stack trace
function logError(error, context = '') {
  const timestamp = new Date().toISOString();
  const errorMessage = `[${timestamp}] [ERROR] ${context}: ${error.message}\n${error.stack || ''}`;
  console.error(errorMessage);
  logStream.write(errorMessage + '\n');
}

// Configuration
const DEFAULT_PORT = 3001;
const MAX_PORT_ATTEMPTS = 100;
const HOST = 'localhost';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

// Log system information
log('=== Like-I-Said Dashboard Starting ===');
log(`Platform: ${os.platform()}`);
log(`Node Version: ${process.version}`);
log(`Current Directory: ${process.cwd()}`);
log(`Executable Path: ${process.execPath}`);
log(`Script Path: ${__filename}`);
log(`Log File: ${logFile}`);

// Print banner
console.clear();
console.log(`${colors.blue}${colors.bright}
╔══════════════════════════════════════════╗
║      Like-I-Said Dashboard Launcher      ║
║            Version 2.4.3                 ║
║         Auto-Port Detection              ║
╚══════════════════════════════════════════╝
${colors.reset}`);
console.log(`${colors.yellow}Log file: ${logFile}${colors.reset}\n`);

// Find an available port
function findAvailablePort(startPort, callback) {
  log(`Checking port ${startPort}...`);
  const server = createServer();
  
  server.listen(startPort, () => {
    const port = server.address().port;
    log(`Port ${port} is available`);
    server.close(() => {
      callback(null, port);
    });
  });
  
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      log(`Port ${startPort} is busy, trying next...`);
      findAvailablePort(startPort + 1, callback);
    } else {
      logError(err, `Error checking port ${startPort}`);
      callback(err);
    }
  });
}

// Check if server is already running
function checkServerRunning(port, callback) {
  log(`Checking if server is running on port ${port}...`);
  const options = {
    hostname: HOST,
    port: port,
    path: '/api/status',
    method: 'GET',
    timeout: 1000
  };

  const req = http.request(options, (res) => {
    log(`Server responded on port ${port} with status ${res.statusCode}`);
    callback(res.statusCode === 200);
  });

  req.on('error', (err) => {
    log(`No server found on port ${port}: ${err.message}`);
    callback(false);
  });

  req.on('timeout', () => {
    log(`Timeout checking port ${port}`);
    req.destroy();
    callback(false);
  });

  req.end();
}

// Open browser
function openBrowser(url) {
  const platform = os.platform();
  let cmd;
  
  log(`Opening browser for platform: ${platform}`);
  
  if (platform === 'win32') {
    cmd = `start "" "${url}"`;
  } else if (platform === 'darwin') {
    cmd = `open "${url}"`;
  } else {
    cmd = `xdg-open "${url}"`;
  }
  
  require('child_process').exec(cmd, (error) => {
    if (error) {
      logError(error, 'Failed to open browser');
      console.log(`${colors.yellow}Please open your browser to: ${url}${colors.reset}`);
    } else {
      log('Browser opened successfully');
    }
  });
}

// Wait for server to be ready
function waitForServer(port, callback, retries = 30) {
  log(`Waiting for server to be ready on port ${port} (attempt ${31 - retries}/30)...`);
  checkServerRunning(port, (isRunning) => {
    if (isRunning) {
      log('Server is ready!');
      callback();
    } else if (retries > 0) {
      setTimeout(() => waitForServer(port, callback, retries - 1), 1000);
    } else {
      log('Server failed to start after 30 attempts', 'ERROR');
      console.error(`${colors.red}Error: Server failed to start${colors.reset}`);
      process.exit(1);
    }
  });
}

// Start the server with a specific port
function startServerWithPort(port) {
  try {
    // Set the port environment variable
    process.env.PORT = port;
    
    const dashboardUrl = `http://${HOST}:${port}`;
    
    log(`Starting dashboard server on port ${port}...`);
    console.log(`${colors.blue}Starting dashboard server on port ${port}...${colors.reset}`);
    
    // Try to find the dashboard-server-bridge.js file
    const possiblePaths = [
      path.join(__dirname, 'dashboard-server-bridge.js'),
      path.join(process.cwd(), 'dashboard-server-bridge.js'),
      './dashboard-server-bridge.js'
    ];
    
    let serverPath = null;
    for (const p of possiblePaths) {
      log(`Checking for server at: ${p}`);
      if (fs.existsSync(p)) {
        serverPath = p;
        log(`Found server at: ${serverPath}`);
        break;
      }
    }
    
    if (!serverPath) {
      throw new Error('Could not find dashboard-server-bridge.js in any expected location');
    }
    
    // Try different approaches to start the server
    log('Attempting to start server...');
    
    // First try: direct require (for CommonJS compatibility)
    try {
      require(serverPath);
      log('Server started using require()');
    } catch (requireError) {
      log(`Require failed: ${requireError.message}, trying dynamic import...`);
      
      // Second try: dynamic import (for ES modules)
      import(serverPath).then(() => {
        log('Server started using dynamic import');
      }).catch(importError => {
        logError(importError, 'Failed to start server with import');
        
        // Third try: spawn as child process
        log('Trying to spawn server as child process...');
        const child = spawn(process.execPath, [serverPath], {
          env: { ...process.env, PORT: port },
          stdio: 'inherit'
        });
        
        child.on('error', (err) => {
          logError(err, 'Child process error');
        });
        
        child.on('exit', (code) => {
          log(`Child process exited with code ${code}`);
        });
      });
    }
    
    // Wait for server to be ready
    waitForServer(port, () => {
      log('Dashboard server started successfully');
      console.log(`${colors.green}✓ Dashboard server started successfully${colors.reset}`);
      console.log(`${colors.blue}Opening dashboard in browser...${colors.reset}`);
      openBrowser(dashboardUrl);
      console.log(`\n${colors.green}Dashboard is running at: ${dashboardUrl}${colors.reset}`);
      console.log(`${colors.yellow}Press Ctrl+C to stop the server${colors.reset}\n`);
    });
    
  } catch (error) {
    logError(error, 'Failed to start server');
    console.error(`${colors.red}Failed to start server: ${error.message}${colors.reset}`);
    console.log(`${colors.yellow}Check the log file for details: ${logFile}${colors.reset}`);
    process.exit(1);
  }
}

// Main function
function main() {
  try {
    log('Starting main function...');
    console.log(`${colors.yellow}Finding available port...${colors.reset}`);
    
    // First, check if default port has our server running
    checkServerRunning(DEFAULT_PORT, (isRunning) => {
      if (isRunning) {
        log(`Server already running on port ${DEFAULT_PORT}, checking if it's ours...`);
        // Check if it's our server by trying the API
        const req = http.get(`http://${HOST}:${DEFAULT_PORT}/api/status`, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              const status = JSON.parse(data);
              if (status.name === 'like-i-said-dashboard') {
                log('Found existing Like-I-Said dashboard instance');
                console.log(`${colors.green}✓ Dashboard server is already running on port ${DEFAULT_PORT}${colors.reset}`);
                console.log(`${colors.blue}Opening dashboard in browser...${colors.reset}`);
                openBrowser(`http://${HOST}:${DEFAULT_PORT}`);
                console.log(`\n${colors.green}Dashboard is ready at: http://${HOST}:${DEFAULT_PORT}${colors.reset}`);
                console.log(`${colors.yellow}This window can be closed safely.${colors.reset}`);
                setTimeout(() => process.exit(0), 3000);
              } else {
                findAndStartNewPort();
              }
            } catch (e) {
              log(`Failed to parse server response: ${e.message}`);
              findAndStartNewPort();
            }
          });
        });
        req.on('error', (err) => {
          logError(err, 'Error checking existing server');
          findAndStartNewPort();
        });
      } else {
        // Port is free, use it
        log(`Port ${DEFAULT_PORT} is free, using it`);
        console.log(`${colors.green}✓ Port ${DEFAULT_PORT} is available${colors.reset}`);
        startServerWithPort(DEFAULT_PORT);
      }
    });
    
    function findAndStartNewPort() {
      log(`Port ${DEFAULT_PORT} is busy with another service, finding new port...`);
      console.log(`${colors.yellow}Port ${DEFAULT_PORT} is busy, searching for available port...${colors.reset}`);
      findAvailablePort(DEFAULT_PORT + 1, (err, port) => {
        if (err) {
          logError(err, 'Error finding available port');
          console.error(`${colors.red}Error finding available port: ${err.message}${colors.reset}`);
          process.exit(1);
        }
        
        if (port > DEFAULT_PORT + MAX_PORT_ATTEMPTS) {
          log(`No available ports found in range`, 'ERROR');
          console.error(`${colors.red}No available ports found in range ${DEFAULT_PORT}-${DEFAULT_PORT + MAX_PORT_ATTEMPTS}${colors.reset}`);
          process.exit(1);
        }
        
        log(`Found available port: ${port}`);
        console.log(`${colors.green}✓ Found available port: ${port}${colors.reset}`);
        startServerWithPort(port);
      });
    }
  } catch (error) {
    logError(error, 'Unexpected error in main function');
    console.error(`${colors.red}Unexpected error: ${error.message}${colors.reset}`);
    console.log(`${colors.yellow}Check the log file for details: ${logFile}${colors.reset}`);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('Received SIGINT, shutting down...');
  console.log(`\n${colors.yellow}Shutting down dashboard server...${colors.reset}`);
  logStream.end();
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('Received SIGTERM, shutting down...');
  logStream.end();
  process.exit(0);
});

// Error handling
process.on('uncaughtException', (error) => {
  logError(error, 'Uncaught exception');
  console.error(`${colors.red}Unexpected error:${colors.reset}`, error.message);
  console.log(`${colors.yellow}Check the log file for details: ${logFile}${colors.reset}`);
  console.log(`${colors.yellow}Please report this issue at: https://github.com/endlessblink/Like-I-Said-memory-mcp-server/issues${colors.reset}`);
  logStream.end();
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled rejection at: ${promise}, reason: ${reason}`, 'ERROR');
  console.error(`${colors.red}Unhandled promise rejection:${colors.reset}`, reason);
  console.log(`${colors.yellow}Check the log file for details: ${logFile}${colors.reset}`);
});

// Start the application
log('Starting application...');
main();