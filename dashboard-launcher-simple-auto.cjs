#!/usr/bin/env node

/**
 * Like-I-Said Dashboard - Simple Auto Port Launcher
 * Guaranteed to skip busy ports
 */

const net = require('net');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Configuration
const START_PORT = 3001;
const MAX_ATTEMPTS = 20;

// Simple console output
console.log('\n=== Like-I-Said Dashboard ===');
console.log('Finding available port...\n');

// Create a simple log file
const logFile = path.join(process.cwd(), 'dashboard-simple.log');
const log = (msg) => {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  console.log(msg);
  fs.appendFileSync(logFile, line);
};

log(`Starting dashboard launcher...`);
log(`Platform: ${os.platform()}`);
log(`Working directory: ${process.cwd()}`);

// Find available port with timeout
function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    const timeout = setTimeout(() => {
      server.close();
      resolve(false);
    }, 100);
    
    server.once('error', () => {
      clearTimeout(timeout);
      resolve(false);
    });
    
    server.once('listening', () => {
      clearTimeout(timeout);
      server.close();
      resolve(true);
    });
    
    server.listen(port, '127.0.0.1');
  });
}

async function findPort() {
  for (let port = START_PORT; port < START_PORT + MAX_ATTEMPTS; port++) {
    log(`Checking port ${port}...`);
    const available = await checkPort(port);
    if (available) {
      log(`Port ${port} is available!`);
      return port;
    } else {
      log(`Port ${port} is busy`);
    }
  }
  throw new Error('No available ports found');
}

// Start dashboard
async function startDashboard() {
  try {
    const port = await findPort();
    
    // Set environment variable
    process.env.PORT = port;
    process.env.DASHBOARD_PORT = port;
    
    log(`Starting dashboard on port ${port}...`);
    
    // Try to start the server
    try {
      // Look for the server file
      const serverPath = path.join(__dirname, 'dashboard-server-bridge.js');
      if (fs.existsSync(serverPath)) {
        require(serverPath);
      } else {
        // Try in current directory
        require('./dashboard-server-bridge.js');
      }
      
      // Wait a bit for server to start
      setTimeout(() => {
        const url = `http://localhost:${port}`;
        log(`Dashboard started at ${url}`);
        
        // Open browser
        const platform = os.platform();
        if (platform === 'win32') {
          exec(`start "" "${url}"`);
        } else if (platform === 'darwin') {
          exec(`open "${url}"`);
        } else {
          exec(`xdg-open "${url}"`);
        }
        
        console.log(`\nDashboard is running at: ${url}`);
        console.log('Press Ctrl+C to stop\n');
        
      }, 2000);
      
    } catch (err) {
      log(`Error starting server: ${err.message}`);
      throw err;
    }
    
  } catch (error) {
    log(`Fatal error: ${error.message}`);
    console.error('\nError:', error.message);
    console.log(`\nCheck log file: ${logFile}`);
    process.exit(1);
  }
}

// Handle shutdown
process.on('SIGINT', () => {
  log('Shutting down...');
  console.log('\nShutting down...');
  process.exit(0);
});

// Start
startDashboard();