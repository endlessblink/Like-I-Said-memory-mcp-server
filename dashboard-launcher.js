#!/usr/bin/env node

/**
 * Like-I-Said Dashboard Launcher
 * This script starts the dashboard server and opens the browser
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Configuration
const PORT = process.env.PORT || process.env.LIKE_I_SAID_PORT || 3001;
const HOST = 'localhost';
const DASHBOARD_URL = `http://${HOST}:${PORT}`;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

// Print banner
console.clear();
console.log(`${colors.blue}${colors.bright}
╔══════════════════════════════════════════╗
║      Like-I-Said Dashboard Launcher      ║
║            Version 2.4.3                 ║
╚══════════════════════════════════════════╝
${colors.reset}`);

// Check if server is already running
function checkServerRunning(callback) {
  const options = {
    hostname: HOST,
    port: PORT,
    path: '/api/status',
    method: 'GET',
    timeout: 1000
  };

  const req = http.request(options, (res) => {
    callback(res.statusCode === 200);
  });

  req.on('error', () => {
    callback(false);
  });

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
  
  if (platform === 'win32') {
    cmd = `start "" "${url}"`;
  } else if (platform === 'darwin') {
    cmd = `open "${url}"`;
  } else {
    cmd = `xdg-open "${url}"`;
  }
  
  require('child_process').exec(cmd, (error) => {
    if (error) {
      console.log(`${colors.yellow}Please open your browser to: ${url}${colors.reset}`);
    }
  });
}

// Wait for server to be ready
function waitForServer(callback, retries = 30) {
  checkServerRunning((isRunning) => {
    if (isRunning) {
      callback();
    } else if (retries > 0) {
      setTimeout(() => waitForServer(callback, retries - 1), 1000);
    } else {
      console.error(`${colors.red}Error: Server failed to start${colors.reset}`);
      process.exit(1);
    }
  });
}

// Main function
function main() {
  console.log(`${colors.yellow}Checking server status...${colors.reset}`);
  
  checkServerRunning((isRunning) => {
    if (isRunning) {
      console.log(`${colors.green}✓ Dashboard server is already running${colors.reset}`);
      console.log(`${colors.blue}Opening dashboard in browser...${colors.reset}`);
      openBrowser(DASHBOARD_URL);
      console.log(`\n${colors.green}Dashboard is ready at: ${DASHBOARD_URL}${colors.reset}`);
      console.log(`${colors.yellow}This window can be closed safely.${colors.reset}`);
      setTimeout(() => process.exit(0), 3000);
    } else {
      console.log(`${colors.blue}Starting dashboard server...${colors.reset}`);
      
      // Start the server
      require('./dashboard-server-bridge.js');
      
      // Wait for server to be ready
      waitForServer(() => {
        console.log(`${colors.green}✓ Dashboard server started successfully${colors.reset}`);
        console.log(`${colors.blue}Opening dashboard in browser...${colors.reset}`);
        openBrowser(DASHBOARD_URL);
        console.log(`\n${colors.green}Dashboard is running at: ${DASHBOARD_URL}${colors.reset}`);
        console.log(`${colors.yellow}Press Ctrl+C to stop the server${colors.reset}\n`);
      });
    }
  });
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(`\n${colors.yellow}Shutting down dashboard server...${colors.reset}`);
  process.exit(0);
});

process.on('SIGTERM', () => {
  process.exit(0);
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error(`${colors.red}Unexpected error:${colors.reset}`, error.message);
  console.log(`${colors.yellow}Please report this issue at: https://github.com/endlessblink/Like-I-Said-memory-mcp-server/issues${colors.reset}`);
  process.exit(1);
});

// Start the application
main();