#!/usr/bin/env node

/**
 * Like-I-Said Dashboard - Universal Launcher
 * Works with both CommonJS and ES modules
 */

const net = require('net');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Configuration
const START_PORT = 3001;
const MAX_ATTEMPTS = 20;

// Simple console output
console.log('\n=== Like-I-Said Dashboard ===');
console.log('Universal Launcher v2.4.3');
console.log('Finding available port...\n');

// Create a simple log file
const logFile = path.join(process.cwd(), 'dashboard-launcher.log');
const log = (msg) => {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  console.log(msg);
  fs.appendFileSync(logFile, line);
};

log(`Starting dashboard launcher...`);
log(`Platform: ${os.platform()}`);
log(`Working directory: ${process.cwd()}`);
log(`Node version: ${process.version}`);

// Find available port
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

// Start dashboard using child process (works with any module type)
async function startDashboard() {
  try {
    const port = await findPort();
    
    log(`Starting dashboard server on port ${port}...`);
    
    // Find the server file
    const possiblePaths = [
      path.join(__dirname, 'dashboard-server-bridge.js'),
      path.join(process.cwd(), 'dashboard-server-bridge.js'),
      'dashboard-server-bridge.js'
    ];
    
    let serverPath = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        serverPath = p;
        log(`Found server at: ${serverPath}`);
        break;
      }
    }
    
    if (!serverPath) {
      // In pkg environment, try relative path
      serverPath = './dashboard-server-bridge.js';
      log(`Using relative server path: ${serverPath}`);
    }
    
    // Start server as child process to avoid module conflicts
    const env = { ...process.env, PORT: port.toString() };
    const child = spawn(process.execPath, [serverPath], {
      env,
      stdio: 'inherit',
      windowsHide: false
    });
    
    child.on('error', (err) => {
      log(`Child process error: ${err.message}`);
      console.error('Failed to start server:', err.message);
    });
    
    child.on('exit', (code) => {
      log(`Server process exited with code ${code}`);
      if (code !== 0) {
        console.error('Server crashed! Check the log file:', logFile);
      }
      process.exit(code);
    });
    
    // Wait for server to start
    let attempts = 0;
    const checkServer = async () => {
      attempts++;
      const serverReady = await checkServerRunning(port);
      
      if (serverReady) {
        const url = `http://localhost:${port}`;
        log(`Dashboard is ready at ${url}`);
        console.log(`\nDashboard is running at: ${url}`);
        console.log('Press Ctrl+C to stop\n');
        
        // Open browser
        openBrowser(url);
      } else if (attempts < 30) {
        setTimeout(checkServer, 1000);
      } else {
        log('Server failed to respond after 30 seconds');
        console.error('Server failed to start properly');
        child.kill();
        process.exit(1);
      }
    };
    
    setTimeout(checkServer, 2000);
    
  } catch (error) {
    log(`Fatal error: ${error.message}`);
    console.error('\nError:', error.message);
    console.log(`\nCheck log file: ${logFile}`);
    process.exit(1);
  }
}

// Check if server is responding
async function checkServerRunning(port) {
  return new Promise((resolve) => {
    const req = require('http').get(`http://localhost:${port}/api/status`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Open browser
function openBrowser(url) {
  const platform = os.platform();
  try {
    if (platform === 'win32') {
      require('child_process').exec(`start "" "${url}"`);
    } else if (platform === 'darwin') {
      require('child_process').exec(`open "${url}"`);
    } else {
      require('child_process').exec(`xdg-open "${url}"`);
    }
    log('Browser command sent');
  } catch (err) {
    log(`Browser launch failed: ${err.message}`);
  }
}

// Handle shutdown
process.on('SIGINT', () => {
  log('Received shutdown signal');
  console.log('\nShutting down...');
  process.exit(0);
});

// Start
startDashboard();