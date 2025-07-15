#!/usr/bin/env node

/**
 * Like-I-Said Dashboard Launcher with Automatic Port Detection
 * Finds an available port and starts the dashboard
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

// Print banner
console.clear();
console.log(`${colors.blue}${colors.bright}
╔══════════════════════════════════════════╗
║      Like-I-Said Dashboard Launcher      ║
║            Version 2.4.3                 ║
║         Auto-Port Detection              ║
╚══════════════════════════════════════════╝
${colors.reset}`);

// Find an available port
function findAvailablePort(startPort, callback) {
  const server = createServer();
  
  server.listen(startPort, () => {
    const port = server.address().port;
    server.close(() => {
      callback(null, port);
    });
  });
  
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      // Port is busy, try the next one
      findAvailablePort(startPort + 1, callback);
    } else {
      callback(err);
    }
  });
}

// Check if server is already running
function checkServerRunning(port, callback) {
  const options = {
    hostname: HOST,
    port: port,
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
function waitForServer(port, callback, retries = 30) {
  checkServerRunning(port, (isRunning) => {
    if (isRunning) {
      callback();
    } else if (retries > 0) {
      setTimeout(() => waitForServer(port, callback, retries - 1), 1000);
    } else {
      console.error(`${colors.red}Error: Server failed to start${colors.reset}`);
      process.exit(1);
    }
  });
}

// Start the server with a specific port
function startServerWithPort(port) {
  // Set the port environment variable
  process.env.PORT = port;
  
  const dashboardUrl = `http://${HOST}:${port}`;
  
  console.log(`${colors.blue}Starting dashboard server on port ${port}...${colors.reset}`);
  
  // Start the server
  try {
    require('./dashboard-server-bridge.js');
  } catch (error) {
    // If running from pkg executable, use import
    import('./dashboard-server-bridge.js').catch(err => {
      console.error(`${colors.red}Failed to start server: ${err.message}${colors.reset}`);
      process.exit(1);
    });
  }
  
  // Wait for server to be ready
  waitForServer(port, () => {
    console.log(`${colors.green}✓ Dashboard server started successfully${colors.reset}`);
    console.log(`${colors.blue}Opening dashboard in browser...${colors.reset}`);
    openBrowser(dashboardUrl);
    console.log(`\n${colors.green}Dashboard is running at: ${dashboardUrl}${colors.reset}`);
    console.log(`${colors.yellow}Press Ctrl+C to stop the server${colors.reset}\n`);
  });
}

// Main function
function main() {
  console.log(`${colors.yellow}Finding available port...${colors.reset}`);
  
  // First, check if default port has our server running
  checkServerRunning(DEFAULT_PORT, (isRunning) => {
    if (isRunning) {
      // Check if it's our server by trying the API
      const req = http.get(`http://${HOST}:${DEFAULT_PORT}/api/status`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const status = JSON.parse(data);
            if (status.name === 'like-i-said-dashboard') {
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
            findAndStartNewPort();
          }
        });
      });
      req.on('error', findAndStartNewPort);
    } else {
      // Port is free, use it
      console.log(`${colors.green}✓ Port ${DEFAULT_PORT} is available${colors.reset}`);
      startServerWithPort(DEFAULT_PORT);
    }
  });
  
  function findAndStartNewPort() {
    console.log(`${colors.yellow}Port ${DEFAULT_PORT} is busy, searching for available port...${colors.reset}`);
    findAvailablePort(DEFAULT_PORT + 1, (err, port) => {
      if (err) {
        console.error(`${colors.red}Error finding available port: ${err.message}${colors.reset}`);
        process.exit(1);
      }
      
      if (port > DEFAULT_PORT + MAX_PORT_ATTEMPTS) {
        console.error(`${colors.red}No available ports found in range ${DEFAULT_PORT}-${DEFAULT_PORT + MAX_PORT_ATTEMPTS}${colors.reset}`);
        process.exit(1);
      }
      
      console.log(`${colors.green}✓ Found available port: ${port}${colors.reset}`);
      startServerWithPort(port);
    });
  }
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