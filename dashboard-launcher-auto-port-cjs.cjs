#!/usr/bin/env node

/**
 * Like-I-Said Dashboard Launcher - CommonJS version for better pkg compatibility
 */

const { createServer } = require('net');
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Create logs directory
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create log file
const logFile = path.join(logsDir, `dashboard-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

// Logging functions
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  console.log(logMessage);
  logStream.write(logMessage + '\\n');
}

function logError(error, context = '') {
  const timestamp = new Date().toISOString();
  const errorMessage = `[${timestamp}] [ERROR] ${context}: ${error.message}\\n${error.stack || ''}`;
  console.error(errorMessage);
  logStream.write(errorMessage + '\\n');
}

// Configuration
const DEFAULT_PORT = 3001;
const MAX_PORT_ATTEMPTS = 100;
const HOST = 'localhost';

// Colors
const colors = {
  reset: '\\x1b[0m',
  bright: '\\x1b[1m',
  green: '\\x1b[32m',
  yellow: '\\x1b[33m',
  blue: '\\x1b[34m',
  red: '\\x1b[31m'
};

// Log startup info
log('=== Like-I-Said Dashboard Starting ===');
log(`Platform: ${os.platform()}`);
log(`Architecture: ${os.arch()}`);
log(`Node Version: ${process.version}`);
log(`Current Directory: ${process.cwd()}`);
log(`Script Directory: ${__dirname}`);
log(`Log File: ${logFile}`);

// Print banner
console.log(`${colors.blue}${colors.bright}
╔══════════════════════════════════════════╗
║      Like-I-Said Dashboard Launcher      ║
║         Auto-Port Detection v2           ║
╚══════════════════════════════════════════╝
${colors.reset}`);
console.log(`${colors.yellow}Creating log file: ${logFile}${colors.reset}\\n`);

// Helper to find available port
function findAvailablePort(startPort, callback) {
  const server = createServer();
  
  server.listen(startPort, '127.0.0.1', () => {
    const port = server.address().port;
    server.close(() => {
      callback(null, port);
    });
  });
  
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      findAvailablePort(startPort + 1, callback);
    } else {
      callback(err);
    }
  });
}

// Check if server is running
function checkServerRunning(port, callback) {
  const req = http.request({
    hostname: HOST,
    port: port,
    path: '/api/status',
    method: 'GET',
    timeout: 1000
  }, (res) => {
    callback(res.statusCode === 200);
  });

  req.on('error', () => callback(false));
  req.on('timeout', () => {
    req.destroy();
    callback(false);
  });

  req.end();
}

// Open browser
function openBrowser(url) {
  const platform = os.platform();
  let cmd;
  
  try {
    if (platform === 'win32') {
      // Windows
      spawn('cmd', ['/c', 'start', '""', url], { 
        detached: true, 
        stdio: 'ignore',
        shell: true 
      }).unref();
    } else if (platform === 'darwin') {
      // macOS
      spawn('open', [url], { 
        detached: true, 
        stdio: 'ignore' 
      }).unref();
    } else {
      // Linux
      spawn('xdg-open', [url], { 
        detached: true, 
        stdio: 'ignore' 
      }).unref();
    }
    log('Browser launch command sent');
  } catch (error) {
    logError(error, 'Failed to open browser');
    console.log(`${colors.yellow}Please open your browser to: ${url}${colors.reset}`);
  }
}

// Start the dashboard server
function startDashboard(port) {
  process.env.PORT = port;
  
  try {
    log(`Attempting to start dashboard on port ${port}...`);
    
    // Look for the server file
    const serverPaths = [
      path.join(__dirname, 'dashboard-server-bridge.js'),
      path.join(process.cwd(), 'dashboard-server-bridge.js'),
      path.resolve('dashboard-server-bridge.js')
    ];
    
    let serverPath = null;
    for (const p of serverPaths) {
      if (fs.existsSync(p)) {
        serverPath = p;
        log(`Found server at: ${serverPath}`);
        break;
      }
    }
    
    if (!serverPath) {
      // If pkg'ed, files might be in snapshot
      log('Server file not found in filesystem, attempting direct require...');
      require('./dashboard-server-bridge.js');
    } else {
      require(serverPath);
    }
    
    // Give server time to start
    setTimeout(() => {
      checkServerRunning(port, (isRunning) => {
        if (isRunning) {
          const url = `http://${HOST}:${port}`;
          console.log(`${colors.green}✓ Dashboard started on port ${port}${colors.reset}`);
          console.log(`${colors.blue}Opening browser to ${url}...${colors.reset}`);
          openBrowser(url);
          console.log(`\\n${colors.green}Dashboard is running!${colors.reset}`);
          console.log(`${colors.yellow}Press Ctrl+C to stop${colors.reset}`);
        } else {
          throw new Error('Server failed to start within timeout');
        }
      });
    }, 2000);
    
  } catch (error) {
    logError(error, 'Failed to start dashboard');
    console.error(`${colors.red}Failed to start: ${error.message}${colors.reset}`);
    console.log(`${colors.yellow}See log file: ${logFile}${colors.reset}`);
    process.exit(1);
  }
}

// Main function
function main() {
  log('Checking for available port...');
  console.log(`${colors.yellow}Finding available port...${colors.reset}`);
  
  // First check if dashboard is already running
  checkServerRunning(DEFAULT_PORT, (isRunning) => {
    if (isRunning) {
      console.log(`${colors.green}✓ Dashboard already running on port ${DEFAULT_PORT}${colors.reset}`);
      openBrowser(`http://${HOST}:${DEFAULT_PORT}`);
      setTimeout(() => process.exit(0), 3000);
    } else {
      // Find available port
      findAvailablePort(DEFAULT_PORT, (err, port) => {
        if (err) {
          logError(err, 'Port detection failed');
          console.error(`${colors.red}Error: ${err.message}${colors.reset}`);
          process.exit(1);
        }
        
        console.log(`${colors.green}✓ Found available port: ${port}${colors.reset}`);
        startDashboard(port);
      });
    }
  });
}

// Error handlers
process.on('uncaughtException', (error) => {
  logError(error, 'Uncaught exception');
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  console.log(`${colors.yellow}See log: ${logFile}${colors.reset}`);
  logStream.end();
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  log(`Unhandled rejection: ${reason}`, 'ERROR');
});

process.on('SIGINT', () => {
  log('Shutting down...');
  console.log(`\\n${colors.yellow}Shutting down...${colors.reset}`);
  logStream.end();
  process.exit(0);
});

// Start
main();