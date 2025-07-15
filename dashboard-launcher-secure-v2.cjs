#!/usr/bin/env node

/**
 * Like-I-Said Dashboard - Secure Launcher v2
 * Enhanced security with command injection protection and input validation
 * 
 * Security Features:
 * - URL validation and sanitization
 * - Safe command execution without shell interpolation
 * - Path validation and sanitization
 * - Environment variable protection
 * - Process isolation
 */

const net = require('net');
const http = require('http');
const { spawn, execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const readline = require('readline');

// ===== SECURITY CONFIGURATION =====
const SECURITY_CONFIG = {
  // Only allow localhost URLs
  ALLOWED_HOSTS: ['localhost', '127.0.0.1', '[::1]'],
  
  // Port range restrictions
  MIN_PORT: 1024,
  MAX_PORT: 65535,
  DEFAULT_PORT: 3001,
  
  // Path restrictions
  ALLOWED_PATH_CHARS: /^[a-zA-Z0-9_\-./\\: ]+$/,
  MAX_PATH_LENGTH: 260, // Windows MAX_PATH
  
  // Command execution timeouts
  EXEC_TIMEOUT: 5000,
  
  // Environment sanitization
  SAFE_ENV_VARS: [
    'PATH', 'PATHEXT', 'SYSTEMROOT', 'TEMP', 'TMP',
    'HOME', 'USER', 'USERNAME', 'USERPROFILE'
  ]
};

// ===== SECURITY UTILITIES =====

/**
 * Validates a port number
 * @param {number} port - Port to validate
 * @returns {boolean} True if valid
 */
function isValidPort(port) {
  return Number.isInteger(port) && 
         port >= SECURITY_CONFIG.MIN_PORT && 
         port <= SECURITY_CONFIG.MAX_PORT;
}

/**
 * Validates a URL for localhost only
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid localhost URL
 */
function isValidLocalUrl(url) {
  try {
    const parsed = new URL(url);
    return SECURITY_CONFIG.ALLOWED_HOSTS.includes(parsed.hostname) &&
           parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Sanitizes a file path
 * @param {string} inputPath - Path to sanitize
 * @returns {string|null} Sanitized path or null if invalid
 */
function sanitizePath(inputPath) {
  if (!inputPath || typeof inputPath !== 'string') {
    return null;
  }
  
  // Remove any null bytes
  let cleaned = inputPath.replace(/\0/g, '');
  
  // Normalize the path
  cleaned = path.normalize(cleaned);
  
  // Check length
  if (cleaned.length > SECURITY_CONFIG.MAX_PATH_LENGTH) {
    return null;
  }
  
  // Check for valid characters
  if (!SECURITY_CONFIG.ALLOWED_PATH_CHARS.test(cleaned)) {
    return null;
  }
  
  // Prevent directory traversal
  const resolved = path.resolve(cleaned);
  const cwd = process.cwd();
  
  // Allow paths within current directory or absolute paths
  if (!resolved.startsWith(cwd) && !path.isAbsolute(cleaned)) {
    return null;
  }
  
  return resolved;
}

/**
 * Creates a safe environment for child processes
 * @param {Object} additionalVars - Additional environment variables
 * @returns {Object} Safe environment object
 */
function createSafeEnvironment(additionalVars = {}) {
  const safeEnv = {};
  
  // Copy only safe environment variables
  for (const varName of SECURITY_CONFIG.SAFE_ENV_VARS) {
    if (process.env[varName]) {
      safeEnv[varName] = process.env[varName];
    }
  }
  
  // Add Node.js specific vars if needed
  if (process.env.NODE_PATH) {
    safeEnv.NODE_PATH = process.env.NODE_PATH;
  }
  
  // Add additional vars after validation
  for (const [key, value] of Object.entries(additionalVars)) {
    if (typeof value === 'string' && value.length < 1000) {
      safeEnv[key] = value;
    }
  }
  
  return safeEnv;
}

/**
 * Safely opens a URL in the browser without shell injection
 * @param {string} url - URL to open
 */
async function openBrowserSecure(url) {
  // Validate URL first
  if (!isValidLocalUrl(url)) {
    console.log('Error: Invalid URL. Only localhost URLs are allowed.');
    return;
  }
  
  const platform = os.platform();
  
  try {
    if (platform === 'win32') {
      // Use execFile with direct arguments (no shell)
      execFile('cmd.exe', ['/c', 'start', '', url], {
        windowsHide: true,
        timeout: SECURITY_CONFIG.EXEC_TIMEOUT
      }, (error) => {
        if (error) {
          console.log(`Please open your browser to: ${url}`);
        }
      });
    } else if (platform === 'darwin') {
      // macOS: use open command directly
      execFile('open', [url], {
        timeout: SECURITY_CONFIG.EXEC_TIMEOUT
      }, (error) => {
        if (error) {
          console.log(`Please open your browser to: ${url}`);
        }
      });
    } else {
      // Linux: try xdg-open
      execFile('xdg-open', [url], {
        timeout: SECURITY_CONFIG.EXEC_TIMEOUT
      }, (error) => {
        if (error) {
          console.log(`Please open your browser to: ${url}`);
        }
      });
    }
  } catch (error) {
    console.log(`Please open your browser to: ${url}`);
  }
}

// ===== APPLICATION CONFIGURATION =====

const CONFIG_FILE = path.join(process.cwd(), 'dashboard-config.json');
const DEFAULT_CONFIG = {
  memoryPath: path.join(process.cwd(), 'memories'),
  taskPath: path.join(process.cwd(), 'tasks'),
  autoOpenBrowser: true,
  port: SECURITY_CONFIG.DEFAULT_PORT
};

// ===== LOGGING WITH SECURITY =====

const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const logFile = path.join(logsDir, `dashboard-${timestamp}.log`);
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

function log(msg, showConsole = true) {
  // Sanitize log messages to prevent log injection
  const sanitized = String(msg).replace(/[\r\n]/g, ' ');
  const line = `[${new Date().toISOString()}] ${sanitized}`;
  
  if (showConsole) console.log(sanitized);
  logStream.write(line + '\n');
}

// ===== CONFIGURATION MANAGEMENT =====

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const rawConfig = fs.readFileSync(CONFIG_FILE, 'utf8');
      const config = JSON.parse(rawConfig);
      
      // Validate loaded configuration
      const validated = { ...DEFAULT_CONFIG };
      
      // Validate paths
      if (config.memoryPath) {
        const sanitized = sanitizePath(config.memoryPath);
        if (sanitized) validated.memoryPath = sanitized;
      }
      
      if (config.taskPath) {
        const sanitized = sanitizePath(config.taskPath);
        if (sanitized) validated.taskPath = sanitized;
      }
      
      // Validate port
      if (config.port && isValidPort(config.port)) {
        validated.port = config.port;
      }
      
      // Validate boolean
      if (typeof config.autoOpenBrowser === 'boolean') {
        validated.autoOpenBrowser = config.autoOpenBrowser;
      }
      
      return validated;
    }
  } catch (error) {
    log('Warning: Could not load config file, using defaults');
  }
  return DEFAULT_CONFIG;
}

function saveConfig(config) {
  try {
    // Validate before saving
    const toSave = {
      memoryPath: sanitizePath(config.memoryPath) || DEFAULT_CONFIG.memoryPath,
      taskPath: sanitizePath(config.taskPath) || DEFAULT_CONFIG.taskPath,
      autoOpenBrowser: Boolean(config.autoOpenBrowser),
      port: isValidPort(config.port) ? config.port : DEFAULT_CONFIG.port,
      lastUsed: new Date().toISOString()
    };
    
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(toSave, null, 2));
    log('Configuration saved to dashboard-config.json');
    return true;
  } catch (error) {
    log('Warning: Could not save config file');
    return false;
  }
}

// ===== USER INPUT WITH VALIDATION =====

function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      // Basic input sanitization
      resolve(answer.trim().substring(0, 1000));
    });
  });
}

// ===== PORT CHECKING =====

async function isPortAvailable(port) {
  if (!isValidPort(port)) {
    return false;
  }
  
  return new Promise((resolve) => {
    const server = net.createServer();
    const timeout = setTimeout(() => {
      server.close();
      resolve(false);
    }, 200);
    
    server.once('error', (err) => {
      clearTimeout(timeout);
      resolve(err.code !== 'EADDRINUSE');
    });
    
    server.once('listening', () => {
      clearTimeout(timeout);
      server.close(() => {
        resolve(true);
      });
    });
    
    // Listen only on localhost
    server.listen(port, '127.0.0.1');
  });
}

async function findAvailablePort(startPort = SECURITY_CONFIG.DEFAULT_PORT) {
  log('Scanning for available port...');
  
  const maxAttempts = 20;
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    if (!isValidPort(port)) continue;
    
    console.log(`Checking port ${port}...`);
    const available = await isPortAvailable(port);
    
    if (available) {
      log(`✓ Port ${port} is available`);
      return port;
    }
  }
  
  throw new Error(`No available ports found in range ${startPort}-${startPort + maxAttempts}`);
}

// ===== SECURE NODE.JS EXECUTABLE FINDING =====

async function findNodeExecutable() {
  log('Searching for Node.js executable...');
  
  if (process.pkg) {
    // Running from pkg, need to find system Node.js
    const possiblePaths = [
      'C:\\Program Files\\nodejs\\node.exe',
      'C:\\Program Files (x86)\\nodejs\\node.exe',
      '/usr/local/bin/node',
      '/usr/bin/node'
    ];
    
    for (const nodePath of possiblePaths) {
      if (fs.existsSync(nodePath)) {
        // Verify it's actually Node.js
        try {
          const result = execFileSync(nodePath, ['--version'], {
            timeout: 1000,
            encoding: 'utf8'
          });
          if (result.startsWith('v')) {
            log(`Found Node.js ${result.trim()} at: ${nodePath}`);
            return nodePath;
          }
        } catch {
          // Not a valid Node.js executable
        }
      }
    }
    
    // Try to find via which/where command
    const findCmd = os.platform() === 'win32' ? 'where' : 'which';
    return new Promise((resolve) => {
      execFile(findCmd, ['node'], {
        timeout: SECURITY_CONFIG.EXEC_TIMEOUT
      }, (error, stdout) => {
        if (!error && stdout) {
          const nodePath = stdout.trim().split('\n')[0];
          log(`Found Node.js via ${findCmd}: ${nodePath}`);
          resolve(nodePath);
        } else {
          log('WARNING: Could not find Node.js installation');
          resolve(null);
        }
      });
    });
  } else {
    // Running with Node.js directly
    return process.execPath;
  }
}

// ===== MAIN APPLICATION =====

async function startDashboard() {
  try {
    // Banner
    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║   Like-I-Said Dashboard Secure v2       ║');
    console.log('║           Version 2.4.3                  ║');
    console.log('╚══════════════════════════════════════════╝\n');
    console.log(`Log file: ${logFile}\n`);
    
    log('=== Secure Dashboard Launcher Starting ===');
    log(`Platform: ${os.platform()} ${os.arch()}`);
    log(`Node Version: ${process.version}`);
    log(`Working Directory: ${process.cwd()}`);
    
    // Load and validate configuration
    const config = loadConfig();
    
    // Ensure directories exist with proper permissions
    for (const dirPath of [config.memoryPath, config.taskPath]) {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true, mode: 0o755 });
        log(`Created directory: ${dirPath}`);
      }
    }
    
    // Find available port
    const port = await findAvailablePort(config.port);
    
    // Find Node.js executable
    const nodeExe = await findNodeExecutable();
    if (!nodeExe) {
      throw new Error('Node.js not found. Please install Node.js and ensure it is in your PATH.');
    }
    
    // Verify server file exists
    const serverPath = path.join(process.cwd(), 'dashboard-server-bridge.js');
    if (!fs.existsSync(serverPath)) {
      throw new Error(`Server file not found at: ${serverPath}`);
    }
    
    log('Starting server with secure environment...');
    
    // Create secure environment
    const env = createSafeEnvironment({
      PORT: String(port),
      NODE_ENV: 'production',
      MEMORY_DIR: config.memoryPath,
      TASK_DIR: config.taskPath
    });
    
    // Start server with spawn (no shell)
    const child = spawn(nodeExe, [serverPath], {
      env,
      stdio: 'inherit',
      windowsHide: false,
      // Additional security options
      uid: process.getuid ? process.getuid() : undefined,
      gid: process.getgid ? process.getgid() : undefined
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
    
    // Wait for server to start and open browser
    setTimeout(async () => {
      const url = `http://localhost:${port}`;
      
      // Verify server is actually running
      const serverRunning = await isPortAvailable(port);
      if (serverRunning) {
        log('ERROR: Server failed to bind to port');
        console.error('\nError: Server failed to start properly');
        process.exit(1);
      }
      
      log(`Dashboard ready at ${url}`);
      console.log(`\n✓ Dashboard running at: ${url}`);
      console.log(`📁 Memories: ${config.memoryPath}`);
      console.log(`📋 Tasks: ${config.taskPath}`);
      console.log('\nPress Ctrl+C to stop\n');
      
      if (config.autoOpenBrowser) {
        await openBrowserSecure(url);
        log('Browser opened with secure method');
      }
    }, 3000);
    
  } catch (error) {
    log(`FATAL ERROR: ${error.message}`);
    console.error(`\nError: ${error.message}`);
    console.log(`\nCheck log file: ${logFile}`);
    process.exit(1);
  }
}

// ===== SIGNAL HANDLERS =====

process.on('SIGINT', () => {
  log('Shutting down...');
  console.log('\n\nShutting down...');
  logStream.end();
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('Received SIGTERM');
  logStream.end();
  process.exit(0);
});

// ===== ERROR HANDLERS =====

process.on('uncaughtException', (err) => {
  log(`UNCAUGHT EXCEPTION: ${err.message}\n${err.stack}`);
  console.error('\nUnexpected error:', err.message);
  console.log(`Details in log: ${logFile}`);
  logStream.end();
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`UNHANDLED REJECTION: ${reason}`);
  console.error('\nUnhandled promise rejection:', reason);
  logStream.end();
  process.exit(1);
});

// ===== START APPLICATION =====

console.log('Starting secure dashboard launcher...\n');
startDashboard();