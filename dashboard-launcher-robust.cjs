#!/usr/bin/env node

/**
 * Like-I-Said Dashboard - Robust Port Detection
 * Properly detects busy ports including Flowise on 3001
 */

const net = require('net');
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Configuration
const START_PORT = 3001;
const MAX_ATTEMPTS = 20;

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
console.log('║    Like-I-Said Dashboard Launcher v2     ║');
console.log('║        Robust Port Detection             ║');
console.log('╚══════════════════════════════════════════╝\n');
console.log(`Log file: ${logFile}\n`);

log('=== Dashboard Launcher Starting ===');
log(`Platform: ${os.platform()} ${os.arch()}`);
log(`Node Version: ${process.version}`);
log(`Working Directory: ${process.cwd()}`);
log(`Process ID: ${process.pid}`);

// More robust port checking - try multiple methods
async function isPortAvailable(port) {
  log(`Checking port ${port} availability...`, false);
  
  // Method 1: Try to create a server
  const checkServer = () => new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        log(`Port ${port} check: Server creation failed - EADDRINUSE`, false);
        resolve(false);
      } else {
        log(`Port ${port} check: Server creation error - ${err.code}`, false);
        resolve(true); // Other errors mean port might be available
      }
    });
    
    server.once('listening', () => {
      server.close();
      log(`Port ${port} check: Successfully created server`, false);
      resolve(true);
    });
    
    server.listen(port, '0.0.0.0');
  });
  
  // Method 2: Try to connect to the port
  const checkConnection = () => new Promise((resolve) => {
    const client = net.createConnection({ port, host: 'localhost' }, () => {
      client.end();
      log(`Port ${port} check: Connection succeeded - port is BUSY`, false);
      resolve(false); // If we can connect, port is busy
    });
    
    client.on('error', () => {
      log(`Port ${port} check: Connection failed - port might be free`, false);
      resolve(true); // Can't connect means port might be free
    });
    
    client.setTimeout(500);
    client.on('timeout', () => {
      client.destroy();
      resolve(true);
    });
  });
  
  // Method 3: HTTP check (for web services like Flowise)
  const checkHttp = () => new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}`, (res) => {
      log(`Port ${port} check: HTTP response ${res.statusCode} - port is BUSY`, false);
      resolve(false); // Got HTTP response, port is busy
    });
    
    req.on('error', () => {
      log(`Port ${port} check: HTTP request failed - port might be free`, false);
      resolve(true); // HTTP failed, might be free
    });
    
    req.setTimeout(500);
    req.on('timeout', () => {
      req.destroy();
      resolve(true);
    });
  });
  
  // Run all checks
  const [serverCheck, connectCheck, httpCheck] = await Promise.all([
    checkServer(),
    checkConnection(),
    checkHttp()
  ]);
  
  // Port is only available if ALL checks say it's free
  const available = serverCheck && connectCheck && httpCheck;
  
  log(`Port ${port} final result: ${available ? 'AVAILABLE' : 'BUSY'}`);
  
  return available;
}

// Find available port
async function findAvailablePort() {
  log('Starting port scan...');
  
  for (let port = START_PORT; port < START_PORT + MAX_ATTEMPTS; port++) {
    console.log(`Checking port ${port}...`);
    
    const available = await isPortAvailable(port);
    
    if (available) {
      log(`✓ Found available port: ${port}`);
      console.log(`✓ Port ${port} is available!\n`);
      return port;
    } else {
      console.log(`✗ Port ${port} is busy`);
    }
  }
  
  throw new Error(`No available ports found in range ${START_PORT}-${START_PORT + MAX_ATTEMPTS}`);
}

// Start dashboard using child process
async function startDashboard() {
  try {
    const port = await findAvailablePort();
    
    log(`Preparing to start dashboard on port ${port}...`);
    
    // Find server file
    const serverPaths = [
      path.join(__dirname, 'dashboard-server-bridge.js'),
      path.join(process.cwd(), 'dashboard-server-bridge.js'),
      './dashboard-server-bridge.js'
    ];
    
    let serverPath = null;
    for (const p of serverPaths) {
      log(`Checking for server at: ${p}`, false);
      if (fs.existsSync(p)) {
        serverPath = p;
        log(`Found server at: ${serverPath}`);
        break;
      }
    }
    
    if (!serverPath) {
      serverPath = 'dashboard-server-bridge.js';
      log(`Using default server path: ${serverPath}`);
    }
    
    // Set environment
    const env = { 
      ...process.env, 
      PORT: port.toString(),
      NODE_ENV: 'production'
    };
    
    log(`Starting server process...`);
    log(`Command: ${process.execPath} ${serverPath}`, false);
    log(`Environment PORT: ${env.PORT}`, false);
    
    // Start server
    const child = spawn(process.execPath, [serverPath], {
      env,
      stdio: 'inherit',
      windowsHide: false
    });
    
    child.on('error', (err) => {
      log(`ERROR: Child process failed - ${err.message}`);
      console.error(`\nFailed to start server: ${err.message}`);
      console.log(`Check the log file: ${logFile}`);
      process.exit(1);
    });
    
    child.on('exit', (code, signal) => {
      log(`Server process exited - code: ${code}, signal: ${signal}`);
      if (code !== 0 && code !== null) {
        console.error(`\nServer crashed with code ${code}`);
        console.log(`Check the log file: ${logFile}`);
      }
      process.exit(code || 0);
    });
    
    // Monitor server startup
    log('Waiting for server to be ready...');
    let checks = 0;
    
    const checkReady = async () => {
      checks++;
      
      try {
        const ready = await new Promise((resolve) => {
          const req = http.get(`http://localhost:${port}/api/status`, (res) => {
            resolve(res.statusCode === 200);
          });
          req.on('error', () => resolve(false));
          req.setTimeout(1000, () => {
            req.destroy();
            resolve(false);
          });
        });
        
        if (ready) {
          const url = `http://localhost:${port}`;
          log(`✓ Dashboard is ready at ${url}`);
          console.log(`\n✓ Dashboard is running at: ${url}`);
          console.log('Press Ctrl+C to stop\n');
          
          // Open browser
          openBrowser(url);
        } else if (checks < 30) {
          setTimeout(checkReady, 1000);
        } else {
          throw new Error('Server failed to respond after 30 seconds');
        }
      } catch (err) {
        log(`ERROR: Server check failed - ${err.message}`);
        child.kill();
        process.exit(1);
      }
    };
    
    setTimeout(checkReady, 2000);
    
  } catch (error) {
    log(`FATAL ERROR: ${error.message}`);
    console.error(`\nError: ${error.message}`);
    console.log(`\nDetails in log file: ${logFile}`);
    process.exit(1);
  }
}

// Open browser
function openBrowser(url) {
  try {
    const platform = os.platform();
    let cmd;
    
    if (platform === 'win32') {
      cmd = `start "" "${url}"`;
    } else if (platform === 'darwin') {
      cmd = `open "${url}"`;
    } else {
      cmd = `xdg-open "${url}"`;
    }
    
    require('child_process').exec(cmd);
    log('Browser launch command sent');
  } catch (err) {
    log(`Browser launch failed: ${err.message}`);
    console.log(`Please open your browser to: ${url}`);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  log('Received SIGINT - shutting down gracefully');
  console.log('\n\nShutting down...');
  logStream.end();
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('Received SIGTERM');
  logStream.end();
  process.exit(0);
});

// Error handlers
process.on('uncaughtException', (err) => {
  log(`UNCAUGHT EXCEPTION: ${err.message}\n${err.stack}`);
  console.error('\nUnexpected error:', err.message);
  console.log(`Details in log: ${logFile}`);
  logStream.end();
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`UNHANDLED REJECTION at ${promise}: ${reason}`);
  console.error('Unhandled promise rejection:', reason);
});

// Start
log('Initializing dashboard launcher...');
startDashboard();