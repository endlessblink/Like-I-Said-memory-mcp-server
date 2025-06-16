#!/usr/bin/env node

import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File paths
const LOG_FILE = path.join(__dirname, 'logs', 'wrapper.log');
const PID_FILE = path.join(__dirname, '.dashboard.pid');

// Process tracking
let dashboardProcess = null;
let mcpProcess = null;
let shouldRestart = true;

// Ensure logs directory exists
if (!fs.existsSync(path.dirname(LOG_FILE))) {
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
}

function log(msg) {
  const logMsg = `[${new Date().toISOString()}] ${msg}\n`;
  console.error(logMsg.trim()); // Use stderr so it doesn't interfere with MCP stdio
  fs.appendFileSync(LOG_FILE, logMsg);
}

function isDashboardRunning() {
  if (!fs.existsSync(PID_FILE)) return false;
  
  try {
    const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim());
    if (os.platform() === 'win32') {
      // execSync already imported
      try {
        execSync(`tasklist /PID ${pid}`, { stdio: 'ignore' });
        return true;
      } catch {
        return false;
      }
    } else {
      try {
        process.kill(pid, 0);
        return true;
      } catch {
        return false;
      }
    }
  } catch {
    return false;
  }
}

function startDashboard() {
  if (isDashboardRunning()) {
    log('Dashboard already running');
    return;
  }
  
  log('Starting dashboard server...');
  dashboardProcess = spawn('node', ['dashboard-server.js'], {
    cwd: __dirname,
    stdio: ['ignore', 'ignore', 'ignore'],
    detached: false,
    env: {
      ...process.env,
      MEMORY_MODE: 'markdown',
      PROJECT_ROOT: __dirname
    }
  });
  
  if (dashboardProcess.pid) {
    fs.writeFileSync(PID_FILE, dashboardProcess.pid.toString());
    log(`Dashboard started with PID: ${dashboardProcess.pid}`);
  }
  
  dashboardProcess.on('exit', (code) => {
    log(`Dashboard exited with code ${code}`);
    if (fs.existsSync(PID_FILE)) {
      fs.unlinkSync(PID_FILE);
    }
    dashboardProcess = null;
  });
  
  dashboardProcess.on('error', (err) => {
    log(`Dashboard error: ${err.message}`);
    dashboardProcess = null;
  });
}

function startMCPServer() {
  if (mcpProcess) return;
  
  log('Starting MCP server (stdio mode)...');
  
  // Start dashboard first
  startDashboard();
  
  // Start MCP server with stdio
  mcpProcess = spawn('node', ['server.js'], {
    cwd: __dirname,
    stdio: ['inherit', 'inherit', 'inherit'], // Use stdio for MCP communication
    env: {
      ...process.env,
      MEMORY_MODE: 'markdown',
      PROJECT_ROOT: __dirname
    }
  });
  
  mcpProcess.on('close', (code) => {
    log(`MCP server exited with code ${code}`);
    mcpProcess = null;
    stopDashboard();
  });
  
  mcpProcess.on('error', (err) => {
    log(`MCP server error: ${err.message}`);
    mcpProcess = null;
  });
  
  if (mcpProcess.pid) {
    log(`MCP server started with PID: ${mcpProcess.pid}`);
  }
}

function stopDashboard() {
  if (fs.existsSync(PID_FILE)) {
    try {
      const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim());
      if (os.platform() === 'win32') {
        execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
      } else {
        process.kill(pid, 'SIGTERM');
      }
      fs.unlinkSync(PID_FILE);
      log('Dashboard stopped');
    } catch (error) {
      log(`Error stopping dashboard: ${error.message}`);
    }
  }
  
  if (dashboardProcess) {
    dashboardProcess.kill('SIGTERM');
    dashboardProcess = null;
  }
}

function stopAllServers() {
  shouldRestart = false;
  log('Stopping all servers...');
  
  if (mcpProcess) {
    mcpProcess.kill('SIGTERM');
    mcpProcess = null;
  }
  
  stopDashboard();
}

// Cleanup when wrapper exits
function cleanup() {
  stopAllServers();
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', stopAllServers);

// Handle unexpected exits
process.on('uncaughtException', (error) => {
  log(`Uncaught exception: ${error.message}`);
  stopAllServers();
  process.exit(1);
});

// Start the servers
log('MCP Server Wrapper starting...');
startMCPServer();

// Keep wrapper alive and monitor
setInterval(() => {
  if (!mcpProcess && shouldRestart) {
    log('Restarting MCP server...');
    startMCPServer();
  }
}, 30000);
