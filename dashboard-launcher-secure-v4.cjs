#!/usr/bin/env node

/**
 * Like-I-Said Dashboard - Secure Port Detection and Launch System v4
 * 
 * Security Features:
 * - Unified port detection with mutex locking
 * - Race condition prevention for concurrent processes
 * - Network security validation
 * - Proper timeout handling
 * - Rate limiting support
 * 
 * @module dashboard-launcher-secure-v4
 */

const net = require('net');
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Port configuration
  START_PORT: 3001,
  MAX_PORT: 3100,
  PORT_CHECK_TIMEOUT: 200,
  
  // Security configuration
  ALLOWED_PORT_RANGE: { min: 3001, max: 65535 },
  LOCK_DIR: path.join(os.tmpdir(), 'like-i-said-locks'),
  LOCK_TIMEOUT: 5000,
  
  // Server configuration
  SERVER_START_TIMEOUT: 30000,
  HEALTH_CHECK_INTERVAL: 1000,
  MAX_HEALTH_CHECKS: 30,
  
  // Rate limiting
  MIN_PORT_CHECK_INTERVAL: 50, // ms between port checks
  
  // Logging
  LOG_DIR: path.join(process.cwd(), 'logs'),
  ENABLE_DEBUG: process.env.DEBUG_LAUNCHER === 'true'
};

// ============================================================================
// SECURE MUTEX IMPLEMENTATION
// ============================================================================

class SecurePortMutex {
  constructor() {
    this.lockDir = CONFIG.LOCK_DIR;
    this.lockFile = path.join(this.lockDir, 'port-detection.lock');
    this.processId = `${process.pid}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    
    // Ensure lock directory exists
    if (!fs.existsSync(this.lockDir)) {
      fs.mkdirSync(this.lockDir, { recursive: true, mode: 0o700 });
    }
  }
  
  async acquire(timeout = CONFIG.LOCK_TIMEOUT) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        // Try to create lock file exclusively
        const fd = fs.openSync(this.lockFile, 'wx');
        fs.writeSync(fd, JSON.stringify({
          pid: process.pid,
          processId: this.processId,
          timestamp: Date.now(),
          host: os.hostname()
        }));
        fs.closeSync(fd);
        
        if (CONFIG.ENABLE_DEBUG) {
          console.log(`[MUTEX] Lock acquired by ${this.processId}`);
        }
        
        return true;
      } catch (err) {
        if (err.code === 'EEXIST') {
          // Lock exists, check if it's stale
          try {
            const lockData = JSON.parse(fs.readFileSync(this.lockFile, 'utf8'));
            const lockAge = Date.now() - lockData.timestamp;
            
            if (lockAge > CONFIG.LOCK_TIMEOUT) {
              // Stale lock, try to remove it
              fs.unlinkSync(this.lockFile);
              if (CONFIG.ENABLE_DEBUG) {
                console.log(`[MUTEX] Removed stale lock from PID ${lockData.pid}`);
              }
              continue;
            }
          } catch (e) {
            // Ignore errors reading lock file
          }
          
          // Active lock, wait a bit
          await new Promise(resolve => setTimeout(resolve, 100));
        } else {
          throw err;
        }
      }
    }
    
    throw new Error('Failed to acquire port detection lock (timeout)');
  }
  
  release() {
    try {
      const lockData = JSON.parse(fs.readFileSync(this.lockFile, 'utf8'));
      if (lockData.processId === this.processId) {
        fs.unlinkSync(this.lockFile);
        if (CONFIG.ENABLE_DEBUG) {
          console.log(`[MUTEX] Lock released by ${this.processId}`);
        }
      }
    } catch (err) {
      // Lock might have been removed already
    }
  }
}

// ============================================================================
// SECURE PORT DETECTION
// ============================================================================

class SecurePortDetector {
  constructor() {
    this.mutex = new SecurePortMutex();
    this.lastCheckTime = 0;
  }
  
  /**
   * Validate port number is within allowed range
   */
  validatePort(port) {
    if (typeof port !== 'number' || isNaN(port)) {
      throw new Error('Invalid port: must be a number');
    }
    
    if (port < CONFIG.ALLOWED_PORT_RANGE.min || port > CONFIG.ALLOWED_PORT_RANGE.max) {
      throw new Error(`Port ${port} is outside allowed range (${CONFIG.ALLOWED_PORT_RANGE.min}-${CONFIG.ALLOWED_PORT_RANGE.max})`);
    }
    
    return true;
  }
  
  /**
   * Check if a single port is available (with rate limiting)
   */
  async isPortAvailable(port) {
    this.validatePort(port);
    
    // Rate limiting
    const now = Date.now();
    const timeSinceLastCheck = now - this.lastCheckTime;
    if (timeSinceLastCheck < CONFIG.MIN_PORT_CHECK_INTERVAL) {
      await new Promise(resolve => 
        setTimeout(resolve, CONFIG.MIN_PORT_CHECK_INTERVAL - timeSinceLastCheck)
      );
    }
    this.lastCheckTime = Date.now();
    
    return new Promise((resolve) => {
      const server = net.createServer();
      let timeout;
      let resolved = false;
      
      const cleanup = (result) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          server.removeAllListeners();
          server.close(() => resolve(result));
        }
      };
      
      timeout = setTimeout(() => cleanup(false), CONFIG.PORT_CHECK_TIMEOUT);
      
      server.once('error', (err) => {
        cleanup(err.code !== 'EADDRINUSE');
      });
      
      server.once('listening', () => {
        cleanup(true);
      });
      
      server.listen(port, '127.0.0.1');
    });
  }
  
  /**
   * Find an available port within the configured range (with mutex)
   */
  async findAvailablePort() {
    console.log('🔍 Scanning for available port...');
    
    // Acquire mutex to prevent race conditions
    await this.mutex.acquire();
    
    try {
      for (let port = CONFIG.START_PORT; port <= CONFIG.MAX_PORT; port++) {
        if (CONFIG.ENABLE_DEBUG) {
          console.log(`[PORT] Checking port ${port}...`);
        }
        
        const available = await this.isPortAvailable(port);
        
        if (available) {
          console.log(`✅ Port ${port} is available`);
          return port;
        } else {
          if (CONFIG.ENABLE_DEBUG) {
            console.log(`[PORT] Port ${port} is busy`);
          }
        }
      }
      
      throw new Error(`No available ports found in range ${CONFIG.START_PORT}-${CONFIG.MAX_PORT}`);
    } finally {
      // Always release mutex
      this.mutex.release();
    }
  }
}

// ============================================================================
// SECURE SERVER LAUNCHER
// ============================================================================

class SecureServerLauncher {
  constructor() {
    this.portDetector = new SecurePortDetector();
    this.serverProcess = null;
    this.logStream = null;
  }
  
  /**
   * Initialize logging
   */
  initializeLogging() {
    if (!fs.existsSync(CONFIG.LOG_DIR)) {
      fs.mkdirSync(CONFIG.LOG_DIR, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logFile = path.join(CONFIG.LOG_DIR, `dashboard-secure-${timestamp}.log`);
    this.logStream = fs.createWriteStream(logFile, { flags: 'a' });
    
    this.log(`Secure Dashboard Launcher v4 started`, true);
    this.log(`Process ID: ${process.pid}`, true);
    this.log(`Node version: ${process.version}`, true);
    this.log(`Platform: ${os.platform()} ${os.release()}`, true);
    
    return logFile;
  }
  
  /**
   * Log message to file and optionally console
   */
  log(message, showConsole = false) {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}`;
    
    if (showConsole) {
      console.log(message);
    }
    
    if (this.logStream) {
      this.logStream.write(logLine + '\n');
    }
  }
  
  /**
   * Find server file with security checks
   */
  findServerFile() {
    const possiblePaths = [
      path.join(__dirname, 'dashboard-server-bridge.js'),
      path.join(process.cwd(), 'dashboard-server-bridge.js'),
      './dashboard-server-bridge.js'
    ];
    
    for (const serverPath of possiblePaths) {
      if (fs.existsSync(serverPath)) {
        // Security: Verify it's a file, not a symlink to somewhere dangerous
        const stats = fs.lstatSync(serverPath);
        if (stats.isFile() && !stats.isSymbolicLink()) {
          this.log(`Found server file: ${serverPath}`);
          return serverPath;
        }
      }
    }
    
    throw new Error('Could not find dashboard-server-bridge.js');
  }
  
  /**
   * Check if server is responding to health checks
   */
  async checkServerHealth(port, retries = CONFIG.MAX_HEALTH_CHECKS) {
    for (let i = 0; i < retries; i++) {
      try {
        const healthy = await new Promise((resolve) => {
          const req = http.get(
            {
              hostname: 'localhost',
              port: port,
              path: '/api/status',
              timeout: 5000,
              headers: {
                'User-Agent': 'dashboard-launcher-secure-v4'
              }
            },
            (res) => {
              resolve(res.statusCode === 200);
            }
          );
          
          req.on('error', () => resolve(false));
          req.on('timeout', () => {
            req.destroy();
            resolve(false);
          });
        });
        
        if (healthy) {
          return true;
        }
      } catch (err) {
        // Ignore errors, we'll retry
      }
      
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.HEALTH_CHECK_INTERVAL));
      }
    }
    
    return false;
  }
  
  /**
   * Launch the dashboard server
   */
  async launch() {
    const logFile = this.initializeLogging();
    
    try {
      // Find available port
      const port = await this.portDetector.findAvailablePort();
      
      // Find server file
      const serverPath = this.findServerFile();
      
      // Prepare environment
      const env = {
        ...process.env,
        PORT: port.toString(),
        NODE_ENV: 'production',
        // Security: Disable debug output in production
        DEBUG: '',
        DEBUG_MCP: ''
      };
      
      this.log(`Starting server on port ${port}...`);
      
      // Start server process
      this.serverProcess = spawn(process.execPath, [serverPath], {
        env,
        stdio: 'inherit',
        windowsHide: false
      });
      
      this.serverProcess.on('error', (err) => {
        this.log(`Server process error: ${err.message}`, true);
        console.error('Failed to start server:', err.message);
      });
      
      this.serverProcess.on('exit', (code) => {
        this.log(`Server process exited with code ${code}`, true);
        if (code !== 0) {
          console.error(`Server crashed! Check the log file: ${logFile}`);
        }
        process.exit(code || 1);
      });
      
      // Wait for server to be ready
      console.log('⏳ Waiting for server to start...');
      const serverReady = await this.checkServerHealth(port);
      
      if (serverReady) {
        const url = `http://localhost:${port}`;
        this.log(`Dashboard ready at ${url}`, true);
        console.log(`\n✨ Dashboard is running at: ${url}`);
        console.log('📝 Log file:', logFile);
        console.log('Press Ctrl+C to stop\n');
        
        // Try to open browser
        this.openBrowser(url);
      } else {
        throw new Error('Server failed to respond to health checks');
      }
      
    } catch (error) {
      this.log(`Fatal error: ${error.message}`, true);
      console.error('\n❌ Error:', error.message);
      console.log(`\n📝 Check log file: ${logFile}`);
      process.exit(1);
    }
  }
  
  /**
   * Open browser with the dashboard URL
   */
  openBrowser(url) {
    try {
      const platform = os.platform();
      const { exec } = require('child_process');
      
      if (platform === 'win32') {
        exec(`start "" "${url}"`);
      } else if (platform === 'darwin') {
        exec(`open "${url}"`);
      } else {
        exec(`xdg-open "${url}"`);
      }
      
      this.log('Browser launch command sent');
    } catch (err) {
      this.log(`Browser launch failed: ${err.message}`);
    }
  }
  
  /**
   * Cleanup on shutdown
   */
  shutdown() {
    this.log('Shutdown signal received', true);
    console.log('\n🛑 Shutting down...');
    
    if (this.serverProcess) {
      this.serverProcess.kill('SIGTERM');
    }
    
    if (this.logStream) {
      this.logStream.end();
    }
    
    // Clean up any stale locks
    try {
      const lockFile = path.join(CONFIG.LOCK_DIR, 'port-detection.lock');
      if (fs.existsSync(lockFile)) {
        fs.unlinkSync(lockFile);
      }
    } catch (err) {
      // Ignore cleanup errors
    }
    
    process.exit(0);
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

if (require.main === module) {
  const launcher = new SecureServerLauncher();
  
  // Handle shutdown signals
  process.on('SIGINT', () => launcher.shutdown());
  process.on('SIGTERM', () => launcher.shutdown());
  
  // Handle uncaught errors
  process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    launcher.log(`Uncaught exception: ${err.message}`, true);
    process.exit(1);
  });
  
  process.on('unhandledRejection', (err) => {
    console.error('Unhandled rejection:', err);
    launcher.log(`Unhandled rejection: ${err}`, true);
    process.exit(1);
  });
  
  // Launch the dashboard
  launcher.launch().catch(err => {
    console.error('Launch failed:', err);
    process.exit(1);
  });
}

// Export for testing
module.exports = {
  SecurePortDetector,
  SecurePortMutex,
  SecureServerLauncher,
  CONFIG
};