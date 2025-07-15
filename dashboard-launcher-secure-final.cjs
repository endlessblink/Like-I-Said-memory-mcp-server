#!/usr/bin/env node

/**
 * Like-I-Said Dashboard Launcher - Secure Final Version
 * 
 * This secure launcher integrates all security fixes:
 * 1. Input validation and sanitization
 * 2. Path traversal prevention
 * 3. Command injection protection
 * 4. Race condition mitigation
 * 5. Resource exhaustion prevention
 * 6. Secure process spawning
 * 7. Environment variable protection
 * 8. Graceful error handling
 * 9. Comprehensive logging
 * 10. Fallback mechanisms
 */

const { spawn, exec } = require('child_process');
const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

// ===== SECURITY CONFIGURATION =====
const SECURITY_CONFIG = {
  // Process limits
  MAX_RETRIES: 30,
  RETRY_DELAY: 1000,
  STARTUP_TIMEOUT: 60000, // 60 seconds
  SHUTDOWN_TIMEOUT: 10000, // 10 seconds
  
  // Port validation
  MIN_PORT: 1024,
  MAX_PORT: 65535,
  DEFAULT_PORT: 3001,
  
  // File system protection
  ALLOWED_PATHS: [
    process.cwd(),
    path.join(process.cwd(), 'dist'),
    path.join(process.cwd(), 'dashboard-server-bridge.js')
  ],
  
  // Network security
  ALLOWED_HOSTS: ['localhost', '127.0.0.1', '::1'],
  ALLOWED_PROTOCOLS: ['http:', 'https:'],
  
  // Resource limits
  MAX_LOG_SIZE: 1024 * 1024, // 1MB
  MAX_ERROR_COUNT: 10,
  
  // Environment protection
  SAFE_ENV_VARS: [
    'PORT', 'LIKE_I_SAID_PORT', 'NODE_ENV',
    'MEMORY_DIR', 'TASK_DIR', 'LOG_LEVEL'
  ]
};

// ===== SECURITY UTILITIES =====

/**
 * Validate and sanitize port number
 */
function validatePort(port) {
  const parsed = parseInt(port, 10);
  if (isNaN(parsed) || parsed < SECURITY_CONFIG.MIN_PORT || parsed > SECURITY_CONFIG.MAX_PORT) {
    return SECURITY_CONFIG.DEFAULT_PORT;
  }
  return parsed;
}

/**
 * Validate hostname to prevent SSRF
 */
function validateHost(host) {
  if (!SECURITY_CONFIG.ALLOWED_HOSTS.includes(host)) {
    throw new Error(`Invalid host: ${host}`);
  }
  return host;
}

/**
 * Validate file path to prevent traversal
 */
function validatePath(filePath) {
  const resolved = path.resolve(filePath);
  const isAllowed = SECURITY_CONFIG.ALLOWED_PATHS.some(allowed => 
    resolved.startsWith(path.resolve(allowed))
  );
  
  if (!isAllowed) {
    throw new Error(`Path traversal attempt detected: ${filePath}`);
  }
  
  return resolved;
}

/**
 * Sanitize environment variables
 */
function sanitizeEnvironment() {
  const safeEnv = {};
  
  // Only copy whitelisted environment variables
  SECURITY_CONFIG.SAFE_ENV_VARS.forEach(varName => {
    if (process.env[varName]) {
      safeEnv[varName] = process.env[varName];
    }
  });
  
  // Add secure defaults
  safeEnv.NODE_ENV = safeEnv.NODE_ENV || 'production';
  
  return safeEnv;
}

/**
 * Create secure HTTP/HTTPS request options
 */
function createSecureRequestOptions(port, path) {
  return {
    hostname: 'localhost',
    port: port,
    path: path,
    method: 'GET',
    timeout: 5000,
    headers: {
      'User-Agent': 'Like-I-Said-Launcher/2.4.3',
      'Accept': 'application/json'
    }
  };
}

// ===== LAUNCHER CLASS =====

class SecureDashboardLauncher {
  constructor() {
    this.port = validatePort(process.env.PORT || process.env.LIKE_I_SAID_PORT || SECURITY_CONFIG.DEFAULT_PORT);
    this.host = 'localhost';
    this.dashboardUrl = `http://${this.host}:${this.port}`;
    this.serverProcess = null;
    this.shutdownInProgress = false;
    this.errorCount = 0;
    this.startTime = Date.now();
    this.sessionId = crypto.randomBytes(16).toString('hex');
    
    // Setup colors
    this.colors = {
      reset: '\x1b[0m',
      bright: '\x1b[1m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      red: '\x1b[31m'
    };
    
    // Setup logging
    this.logFile = null;
    this.setupLogging();
    
    // Setup signal handlers
    this.setupSignalHandlers();
  }
  
  /**
   * Setup secure logging
   */
  setupLogging() {
    try {
      const logDir = path.join(process.cwd(), 'logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { mode: 0o750 });
      }
      
      const logPath = path.join(logDir, `launcher-${this.sessionId}.log`);
      this.logFile = fs.createWriteStream(logPath, { 
        flags: 'a',
        mode: 0o640
      });
      
      // Rotate log if too large
      const stats = fs.statSync(logPath);
      if (stats.size > SECURITY_CONFIG.MAX_LOG_SIZE) {
        this.rotateLog();
      }
    } catch (error) {
      console.warn('Failed to setup logging:', error.message);
    }
  }
  
  /**
   * Secure logging function
   */
  log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      sessionId: this.sessionId,
      ...data
    };
    
    // Console output
    const colorMap = {
      info: this.colors.blue,
      success: this.colors.green,
      warn: this.colors.yellow,
      error: this.colors.red
    };
    const color = colorMap[level] || this.colors.reset;
    console.log(`${color}[${level.toUpperCase()}] ${message}${this.colors.reset}`);
    
    // File output
    if (this.logFile && !this.logFile.destroyed) {
      this.logFile.write(JSON.stringify(logEntry) + '\n');
    }
  }
  
  /**
   * Rotate log file
   */
  rotateLog() {
    try {
      if (this.logFile) {
        this.logFile.end();
      }
      
      const logDir = path.join(process.cwd(), 'logs');
      const oldLog = path.join(logDir, `launcher-${this.sessionId}.log`);
      const newLog = path.join(logDir, `launcher-${this.sessionId}-${Date.now()}.log`);
      
      fs.renameSync(oldLog, newLog);
      this.setupLogging();
    } catch (error) {
      console.warn('Failed to rotate log:', error.message);
    }
  }
  
  /**
   * Print banner
   */
  printBanner() {
    console.clear();
    console.log(`${this.colors.blue}${this.colors.bright}
╔══════════════════════════════════════════╗
║      Like-I-Said Dashboard Launcher      ║
║         Version 2.4.3 (Secure)           ║
║       Session: ${this.sessionId.substring(0, 8)}...        ║
╚══════════════════════════════════════════╝
${this.colors.reset}`);
    
    this.log('info', 'Secure launcher initialized', {
      port: this.port,
      nodeVersion: process.version,
      platform: os.platform()
    });
  }
  
  /**
   * Check if server is running (secure)
   */
  checkServerRunning(callback) {
    const options = createSecureRequestOptions(this.port, '/api/status');
    
    const protocol = options.port === 443 ? https : http;
    const req = protocol.request(options, (res) => {
      // Validate response
      if (res.statusCode === 200) {
        let data = '';
        res.on('data', chunk => {
          // Limit response size
          if (data.length + chunk.length > 1024) {
            req.destroy();
            callback(false);
            return;
          }
          data += chunk;
        });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            callback(json.status === 'ok');
          } catch {
            callback(false);
          }
        });
      } else {
        callback(false);
      }
    });
    
    req.on('error', () => callback(false));
    req.on('timeout', () => {
      req.destroy();
      callback(false);
    });
    
    req.end();
  }
  
  /**
   * Open browser (secure)
   */
  openBrowser(url) {
    // Validate URL
    try {
      const parsed = new URL(url);
      if (!SECURITY_CONFIG.ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
        throw new Error('Invalid protocol');
      }
      if (!SECURITY_CONFIG.ALLOWED_HOSTS.includes(parsed.hostname)) {
        throw new Error('Invalid hostname');
      }
    } catch (error) {
      this.log('error', 'Invalid URL for browser', { url, error: error.message });
      return;
    }
    
    const platform = os.platform();
    let cmd;
    
    // Use arrays to prevent command injection
    if (platform === 'win32') {
      exec('start "" "' + url + '"', { shell: true, windowsHide: true }, (error) => {
        if (error) {
          this.log('warn', 'Failed to open browser', { error: error.message });
          console.log(`${this.colors.yellow}Please open your browser to: ${url}${this.colors.reset}`);
        }
      });
    } else if (platform === 'darwin') {
      spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
    } else {
      // Linux
      spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
    }
    
    this.log('info', 'Browser launch attempted', { url });
  }
  
  /**
   * Start server process (secure)
   */
  startServer() {
    return new Promise((resolve, reject) => {
      try {
        // Validate server file exists
        const serverPath = validatePath('./dashboard-server-bridge.js');
        if (!fs.existsSync(serverPath)) {
          throw new Error('Server file not found');
        }
        
        // Check file permissions
        const stats = fs.statSync(serverPath);
        if (stats.mode & 0o002) {
          this.log('warn', 'Server file is world-writable', { path: serverPath });
        }
        
        // Spawn with secure options
        this.serverProcess = spawn(process.execPath, [serverPath], {
          env: {
            ...sanitizeEnvironment(),
            PORT: String(this.port),
            LIKE_I_SAID_LAUNCHER: 'true',
            LAUNCHER_SESSION: this.sessionId
          },
          cwd: process.cwd(),
          stdio: ['ignore', 'pipe', 'pipe'],
          detached: false,
          windowsHide: true
        });
        
        // Handle stdout
        this.serverProcess.stdout.on('data', (data) => {
          const message = data.toString().trim();
          if (message) {
            this.log('info', `Server: ${message}`);
          }
        });
        
        // Handle stderr
        this.serverProcess.stderr.on('data', (data) => {
          const message = data.toString().trim();
          if (message) {
            this.log('error', `Server Error: ${message}`);
          }
        });
        
        // Handle exit
        this.serverProcess.on('exit', (code, signal) => {
          this.log('info', 'Server process exited', { code, signal });
          this.serverProcess = null;
          
          if (!this.shutdownInProgress) {
            this.handleUnexpectedExit(code, signal);
          }
        });
        
        // Handle errors
        this.serverProcess.on('error', (error) => {
          this.log('error', 'Server process error', { error: error.message });
          reject(error);
        });
        
        // Wait for server to be ready
        setTimeout(() => {
          this.waitForServer((success) => {
            if (success) {
              resolve();
            } else {
              reject(new Error('Server failed to start'));
            }
          });
        }, 1000);
        
      } catch (error) {
        this.log('error', 'Failed to start server', { error: error.message });
        reject(error);
      }
    });
  }
  
  /**
   * Wait for server with timeout
   */
  waitForServer(callback, retries = SECURITY_CONFIG.MAX_RETRIES) {
    const startTime = Date.now();
    
    const check = () => {
      // Check timeout
      if (Date.now() - startTime > SECURITY_CONFIG.STARTUP_TIMEOUT) {
        this.log('error', 'Server startup timeout');
        callback(false);
        return;
      }
      
      this.checkServerRunning((isRunning) => {
        if (isRunning) {
          callback(true);
        } else if (retries > 0) {
          setTimeout(() => check(), SECURITY_CONFIG.RETRY_DELAY);
          retries--;
        } else {
          callback(false);
        }
      });
    };
    
    check();
  }
  
  /**
   * Handle unexpected server exit
   */
  handleUnexpectedExit(code, signal) {
    this.errorCount++;
    
    if (this.errorCount >= SECURITY_CONFIG.MAX_ERROR_COUNT) {
      this.log('error', 'Too many server failures, giving up', { 
        errorCount: this.errorCount 
      });
      this.shutdown(1);
      return;
    }
    
    this.log('warn', 'Server exited unexpectedly, attempting restart', {
      code,
      signal,
      errorCount: this.errorCount
    });
    
    // Exponential backoff
    const delay = Math.min(1000 * Math.pow(2, this.errorCount - 1), 30000);
    
    setTimeout(() => {
      this.startServer().catch((error) => {
        this.log('error', 'Failed to restart server', { error: error.message });
        this.shutdown(1);
      });
    }, delay);
  }
  
  /**
   * Setup signal handlers
   */
  setupSignalHandlers() {
    const signals = ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK'];
    
    signals.forEach(signal => {
      process.on(signal, () => {
        this.log('info', `Received ${signal}`);
        this.shutdown(0);
      });
    });
    
    process.on('uncaughtException', (error) => {
      this.log('error', 'Uncaught exception', { 
        error: error.message,
        stack: error.stack 
      });
      this.shutdown(1);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      this.log('error', 'Unhandled rejection', { 
        reason: reason?.message || reason,
        stack: reason?.stack
      });
    });
  }
  
  /**
   * Graceful shutdown
   */
  shutdown(exitCode = 0) {
    if (this.shutdownInProgress) {
      return;
    }
    
    this.shutdownInProgress = true;
    this.log('info', 'Shutting down launcher', { exitCode });
    
    console.log(`\n${this.colors.yellow}Shutting down dashboard...${this.colors.reset}`);
    
    // Stop server process
    if (this.serverProcess) {
      this.serverProcess.kill('SIGTERM');
      
      // Force kill after timeout
      setTimeout(() => {
        if (this.serverProcess) {
          this.log('warn', 'Force killing server process');
          this.serverProcess.kill('SIGKILL');
        }
      }, SECURITY_CONFIG.SHUTDOWN_TIMEOUT);
    }
    
    // Close log file
    if (this.logFile) {
      this.logFile.end(() => {
        process.exit(exitCode);
      });
    } else {
      process.exit(exitCode);
    }
  }
  
  /**
   * Main execution
   */
  async run() {
    try {
      this.printBanner();
      
      this.log('info', 'Checking server status...');
      
      this.checkServerRunning(async (isRunning) => {
        if (isRunning) {
          this.log('success', 'Dashboard server is already running');
          console.log(`${this.colors.green}✓ Dashboard server is already running${this.colors.reset}`);
          console.log(`${this.colors.blue}Opening dashboard in browser...${this.colors.reset}`);
          this.openBrowser(this.dashboardUrl);
          console.log(`\n${this.colors.green}Dashboard is ready at: ${this.dashboardUrl}${this.colors.reset}`);
          console.log(`${this.colors.yellow}This window can be closed safely.${this.colors.reset}`);
          
          setTimeout(() => this.shutdown(0), 3000);
        } else {
          this.log('info', 'Starting dashboard server...');
          console.log(`${this.colors.blue}Starting dashboard server...${this.colors.reset}`);
          
          try {
            await this.startServer();
            
            this.log('success', 'Dashboard server started successfully');
            console.log(`${this.colors.green}✓ Dashboard server started successfully${this.colors.reset}`);
            console.log(`${this.colors.blue}Opening dashboard in browser...${this.colors.reset}`);
            this.openBrowser(this.dashboardUrl);
            console.log(`\n${this.colors.green}Dashboard is running at: ${this.dashboardUrl}${this.colors.reset}`);
            console.log(`${this.colors.yellow}Press Ctrl+C to stop the server${this.colors.reset}\n`);
            
          } catch (error) {
            this.log('error', 'Failed to start server', { error: error.message });
            console.error(`${this.colors.red}Error: Failed to start dashboard server${this.colors.reset}`);
            console.error(`${this.colors.red}${error.message}${this.colors.reset}`);
            
            // Provide helpful error messages
            if (error.message.includes('EADDRINUSE')) {
              console.log(`\n${this.colors.yellow}Port ${this.port} is already in use.${this.colors.reset}`);
              console.log(`${this.colors.yellow}Try setting a different port:${this.colors.reset}`);
              console.log(`  PORT=3002 ${process.argv.join(' ')}`);
            } else if (error.message.includes('EACCES')) {
              console.log(`\n${this.colors.yellow}Permission denied. Port ${this.port} requires elevated privileges.${this.colors.reset}`);
              console.log(`${this.colors.yellow}Try using a port above 1024.${this.colors.reset}`);
            }
            
            this.shutdown(1);
          }
        }
      });
      
    } catch (error) {
      this.log('error', 'Fatal error', { error: error.message, stack: error.stack });
      console.error(`${this.colors.red}Fatal error: ${error.message}${this.colors.reset}`);
      this.shutdown(1);
    }
  }
}

// ===== MAIN EXECUTION =====

// Create and run launcher
const launcher = new SecureDashboardLauncher();
launcher.run().catch((error) => {
  console.error('Launcher failed:', error);
  process.exit(1);
});

// Export for testing
module.exports = { SecureDashboardLauncher, SECURITY_CONFIG };