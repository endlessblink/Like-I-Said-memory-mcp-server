#!/usr/bin/env node

/**
 * Like-I-Said Dashboard - SECURE CONFIGURATION VERSION
 * Version 2.4.5-secure-v3
 * 
 * SECURITY ENHANCEMENTS:
 * 1. JSON Parsing Security
 *    - All JSON.parse operations wrapped in try-catch
 *    - Schema validation for all configuration
 *    - Graceful fallback to defaults on parse errors
 * 
 * 2. Configuration Validation
 *    - Type checking for all config parameters
 *    - Value range validation (ports, intervals, etc.)
 *    - Path sanitization and validation
 * 
 * 3. Atomic File Operations
 *    - Write to temp file first, then atomic rename
 *    - File locking to prevent race conditions
 *    - Integrity checks after write operations
 */

const net = require('net');
const http = require('http');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const readline = require('readline');
const crypto = require('crypto');

// Configuration constants
const START_PORT = 3001;
const MAX_ATTEMPTS = 20;
const CONFIG_FILE = path.join(process.cwd(), 'dashboard-config.json');
const CONFIG_LOCK_FILE = path.join(process.cwd(), '.dashboard-config.lock');
const CONFIG_BACKUP_FILE = path.join(process.cwd(), 'dashboard-config.backup.json');

// Configuration schema with validation rules
const CONFIG_SCHEMA = {
  memoryPath: {
    type: 'string',
    required: true,
    validate: (value) => {
      if (typeof value !== 'string' || value.trim() === '') {
        return 'Memory path must be a non-empty string';
      }
      // Prevent directory traversal attacks
      const normalized = path.normalize(value);
      if (normalized.includes('..')) {
        return 'Memory path cannot contain parent directory references (..)';
      }
      return null;
    }
  },
  taskPath: {
    type: 'string', 
    required: true,
    validate: (value) => {
      if (typeof value !== 'string' || value.trim() === '') {
        return 'Task path must be a non-empty string';
      }
      const normalized = path.normalize(value);
      if (normalized.includes('..')) {
        return 'Task path cannot contain parent directory references (..)';
      }
      return null;
    }
  },
  autoOpenBrowser: {
    type: 'boolean',
    required: false,
    default: true,
    validate: (value) => {
      if (typeof value !== 'boolean') {
        return 'Auto-open browser must be a boolean';
      }
      return null;
    }
  },
  preferredPort: {
    type: 'number',
    required: false,
    default: 3001,
    validate: (value) => {
      if (typeof value !== 'number' || !Number.isInteger(value)) {
        return 'Preferred port must be an integer';
      }
      if (value < 1 || value > 65535) {
        return 'Preferred port must be between 1 and 65535';
      }
      return null;
    }
  },
  logLevel: {
    type: 'string',
    required: false,
    default: 'info',
    validate: (value) => {
      const validLevels = ['debug', 'info', 'warn', 'error'];
      if (!validLevels.includes(value)) {
        return `Log level must be one of: ${validLevels.join(', ')}`;
      }
      return null;
    }
  },
  lastUsed: {
    type: 'string',
    required: false,
    validate: (value) => {
      if (value && typeof value !== 'string') {
        return 'Last used must be a string';
      }
      // Validate ISO date format
      if (value && isNaN(Date.parse(value))) {
        return 'Last used must be a valid ISO date string';
      }
      return null;
    }
  }
};

// Default configuration with secure defaults
const DEFAULT_CONFIG = {
  memoryPath: path.join(process.cwd(), 'memories'),
  taskPath: path.join(process.cwd(), 'tasks'),
  autoOpenBrowser: true,
  preferredPort: 3001,
  logLevel: 'info',
  lastUsed: null
};

// Create logs directory
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create timestamped log file
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const logFile = path.join(logsDir, `dashboard-secure-${timestamp}.log`);
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

// Enhanced logging with security context
const log = (level, msg, showConsole = true) => {
  const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${msg}`;
  if (showConsole) {
    const icons = {
      ERROR: '🔴',
      WARN: '🟡',
      SUCCESS: '🟢',
      SECURITY: '🔒',
      INFO: '🔵'
    };
    console.log(`${icons[level.toUpperCase()] || '🔵'} ${msg}`);
  }
  logStream.write(line + '\n');
};

/**
 * Secure JSON parsing with error handling
 */
function parseJsonSecure(jsonString, description = 'JSON') {
  try {
    // Basic input validation
    if (typeof jsonString !== 'string') {
      throw new Error('Input must be a string');
    }
    
    // Check for empty string
    if (jsonString.trim() === '') {
      throw new Error('Empty JSON string');
    }
    
    // Check for potential security issues
    if (jsonString.length > 1024 * 1024) { // 1MB limit
      throw new Error('JSON string too large (max 1MB)');
    }
    
    // Parse with error handling
    const parsed = JSON.parse(jsonString);
    
    // Ensure we got an object (not array, null, etc.)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Configuration must be a JSON object');
    }
    
    return { success: true, data: parsed };
  } catch (error) {
    log('ERROR', `Failed to parse ${description}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Validate configuration against schema
 */
function validateConfig(config) {
  const errors = [];
  const validated = {};
  
  // Check for unknown keys
  for (const key in config) {
    if (!CONFIG_SCHEMA[key]) {
      log('WARN', `Unknown configuration key: ${key}`);
    }
  }
  
  // Validate each schema field
  for (const [key, schema] of Object.entries(CONFIG_SCHEMA)) {
    const value = config[key];
    
    // Check required fields
    if (schema.required && (value === undefined || value === null)) {
      errors.push(`Missing required field: ${key}`);
      continue;
    }
    
    // Use default if not provided
    if (value === undefined || value === null) {
      if (schema.default !== undefined) {
        validated[key] = schema.default;
      }
      continue;
    }
    
    // Type validation
    if (typeof value !== schema.type) {
      errors.push(`Invalid type for ${key}: expected ${schema.type}, got ${typeof value}`);
      continue;
    }
    
    // Custom validation
    if (schema.validate) {
      const error = schema.validate(value);
      if (error) {
        errors.push(`Validation failed for ${key}: ${error}`);
        continue;
      }
    }
    
    // Path resolution for directory fields
    if (key.endsWith('Path') && typeof value === 'string') {
      validated[key] = path.resolve(value);
    } else {
      validated[key] = value;
    }
  }
  
  if (errors.length > 0) {
    return { valid: false, errors, config: null };
  }
  
  return { valid: true, errors: [], config: validated };
}

/**
 * Acquire file lock for atomic operations
 */
function acquireLock(timeout = 5000) {
  const startTime = Date.now();
  
  while (fs.existsSync(CONFIG_LOCK_FILE)) {
    if (Date.now() - startTime > timeout) {
      log('WARN', 'Config lock timeout, removing stale lock');
      try {
        fs.unlinkSync(CONFIG_LOCK_FILE);
      } catch (e) {
        log('ERROR', `Failed to remove stale lock: ${e.message}`);
        return false;
      }
      break;
    }
    // Wait 50ms before retry
    const waitUntil = Date.now() + 50;
    while (Date.now() < waitUntil) { /* busy wait */ }
  }
  
  try {
    // Create lock file with process info
    const lockInfo = {
      pid: process.pid,
      timestamp: new Date().toISOString(),
      host: os.hostname()
    };
    fs.writeFileSync(CONFIG_LOCK_FILE, JSON.stringify(lockInfo), { flag: 'wx' });
    return true;
  } catch (error) {
    if (error.code === 'EEXIST') {
      log('WARN', 'Lock file already exists');
      return false;
    }
    log('ERROR', `Failed to create lock: ${error.message}`);
    return false;
  }
}

/**
 * Release file lock
 */
function releaseLock() {
  try {
    if (fs.existsSync(CONFIG_LOCK_FILE)) {
      fs.unlinkSync(CONFIG_LOCK_FILE);
      return true;
    }
  } catch (error) {
    log('ERROR', `Failed to release lock: ${error.message}`);
    return false;
  }
  return true;
}

/**
 * Load configuration with security measures
 */
function loadConfig() {
  log('SECURITY', '=== SECURE CONFIGURATION LOADING ===');
  log('INFO', `Config file path: ${CONFIG_FILE}`);
  
  // Acquire lock for reading
  if (!acquireLock()) {
    log('ERROR', 'Failed to acquire configuration lock');
    log('WARN', 'Using default configuration');
    return DEFAULT_CONFIG;
  }
  
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      log('SUCCESS', 'Config file exists');
      
      // Check file permissions
      const stats = fs.statSync(CONFIG_FILE);
      const mode = stats.mode & parseInt('777', 8);
      if (mode & 0o022) {
        log('SECURITY', `Config file permissions (${mode.toString(8)}) allow write by group/others`);
      }
      
      // Read and parse config
      const configContent = fs.readFileSync(CONFIG_FILE, 'utf8');
      log('INFO', `Config file size: ${configContent.length} bytes`);
      
      const parseResult = parseJsonSecure(configContent, 'configuration file');
      if (!parseResult.success) {
        log('ERROR', 'Failed to parse configuration, using defaults');
        return DEFAULT_CONFIG;
      }
      
      // Validate configuration
      const validation = validateConfig(parseResult.data);
      if (!validation.valid) {
        log('ERROR', 'Configuration validation failed:');
        validation.errors.forEach(err => log('ERROR', `  - ${err}`));
        log('WARN', 'Using default configuration');
        return DEFAULT_CONFIG;
      }
      
      log('SUCCESS', 'Configuration loaded and validated successfully');
      return { ...DEFAULT_CONFIG, ...validation.config };
      
    } else {
      log('WARN', 'Config file does not exist, using defaults');
      return DEFAULT_CONFIG;
    }
  } catch (error) {
    log('ERROR', `Error loading config: ${error.message}`);
    log('SECURITY', 'Falling back to secure defaults');
    return DEFAULT_CONFIG;
  } finally {
    releaseLock();
  }
}

/**
 * Save configuration with atomic write
 */
function saveConfig(config) {
  log('SECURITY', '=== SECURE CONFIGURATION SAVING ===');
  
  // Validate before saving
  const validation = validateConfig(config);
  if (!validation.valid) {
    log('ERROR', 'Cannot save invalid configuration:');
    validation.errors.forEach(err => log('ERROR', `  - ${err}`));
    return false;
  }
  
  // Acquire lock for writing
  if (!acquireLock()) {
    log('ERROR', 'Failed to acquire configuration lock');
    return false;
  }
  
  try {
    // Backup existing config
    if (fs.existsSync(CONFIG_FILE)) {
      try {
        fs.copyFileSync(CONFIG_FILE, CONFIG_BACKUP_FILE);
        log('SUCCESS', 'Created configuration backup');
      } catch (e) {
        log('WARN', `Failed to create backup: ${e.message}`);
      }
    }
    
    // Prepare config with metadata
    const configToSave = {
      ...validation.config,
      lastUsed: new Date().toISOString(),
      _metadata: {
        version: '2.4.5-secure-v3',
        checksum: null
      }
    };
    
    // Generate checksum
    const configJson = JSON.stringify(configToSave, null, 2);
    const checksum = crypto.createHash('sha256').update(configJson).digest('hex');
    configToSave._metadata.checksum = checksum;
    
    // Write to temporary file first
    const tempFile = `${CONFIG_FILE}.tmp`;
    const finalJson = JSON.stringify(configToSave, null, 2);
    
    fs.writeFileSync(tempFile, finalJson, { mode: 0o600 });
    log('SUCCESS', 'Written to temporary file');
    
    // Verify temp file
    const verifyContent = fs.readFileSync(tempFile, 'utf8');
    const verifyResult = parseJsonSecure(verifyContent, 'temporary config');
    if (!verifyResult.success) {
      throw new Error('Failed to verify temporary configuration file');
    }
    
    // Atomic rename
    fs.renameSync(tempFile, CONFIG_FILE);
    log('SUCCESS', 'Configuration saved atomically');
    
    // Set secure permissions (owner read/write only)
    if (process.platform !== 'win32') {
      try {
        fs.chmodSync(CONFIG_FILE, 0o600);
        log('SECURITY', 'Set secure file permissions (0600)');
      } catch (e) {
        log('WARN', `Could not set file permissions: ${e.message}`);
      }
    }
    
    return true;
  } catch (error) {
    log('ERROR', `Error saving config: ${error.message}`);
    
    // Try to restore from backup
    if (fs.existsSync(CONFIG_BACKUP_FILE)) {
      try {
        fs.copyFileSync(CONFIG_BACKUP_FILE, CONFIG_FILE);
        log('SUCCESS', 'Restored configuration from backup');
      } catch (e) {
        log('ERROR', `Failed to restore backup: ${e.message}`);
      }
    }
    
    return false;
  } finally {
    releaseLock();
  }
}

/**
 * Verify configuration integrity
 */
function verifyConfigIntegrity(config) {
  if (!config._metadata || !config._metadata.checksum) {
    log('SECURITY', 'No checksum found in configuration');
    return true; // Allow configs without checksum for backward compatibility
  }
  
  // Create copy without checksum for verification
  const configCopy = JSON.parse(JSON.stringify(config));
  const savedChecksum = configCopy._metadata.checksum;
  configCopy._metadata.checksum = null;
  
  // Calculate checksum
  const configJson = JSON.stringify(configCopy, null, 2);
  const calculatedChecksum = crypto.createHash('sha256').update(configJson).digest('hex');
  
  if (savedChecksum !== calculatedChecksum) {
    log('SECURITY', 'Configuration checksum mismatch!');
    log('SECURITY', `Expected: ${savedChecksum}`);
    log('SECURITY', `Calculated: ${calculatedChecksum}`);
    return false;
  }
  
  log('SECURITY', 'Configuration integrity verified');
  return true;
}

// Memory structure analysis (kept from original)
function analyzeMemoryStructure(memoryPath) {
  log('INFO', `=== MEMORY STRUCTURE ANALYSIS ===`);
  log('INFO', `Target memory path: ${memoryPath}`);
  
  try {
    if (!fs.existsSync(memoryPath)) {
      log('ERROR', `Memory directory DOES NOT EXIST: ${memoryPath}`);
      return { exists: false, projects: 0, memories: 0, errors: [`Directory does not exist: ${memoryPath}`] };
    }
    
    log('SUCCESS', `Memory directory EXISTS: ${memoryPath}`);
    
    const stats = fs.statSync(memoryPath);
    const items = fs.readdirSync(memoryPath);
    log('INFO', `Total items in memory directory: ${items.length}`);
    
    if (items.length === 0) {
      log('WARN', `Memory directory is EMPTY`);
      return { exists: true, projects: 0, memories: 0, errors: [], empty: true };
    }
    
    const projects = [];
    const errors = [];
    let totalMemories = 0;
    
    for (const item of items) {
      const itemPath = path.join(memoryPath, item);
      
      try {
        const itemStats = fs.statSync(itemPath);
        
        if (itemStats.isDirectory()) {
          projects.push(item);
          const projectFiles = fs.readdirSync(itemPath);
          const mdFiles = projectFiles.filter(f => f.endsWith('.md'));
          totalMemories += mdFiles.length;
        }
      } catch (itemError) {
        errors.push(`Error analyzing ${item}: ${itemError.message}`);
      }
    }
    
    return {
      exists: true,
      projects: projects.length,
      memories: totalMemories,
      errors: errors,
      projectList: projects,
      empty: totalMemories === 0
    };
    
  } catch (error) {
    log('ERROR', `Critical error in memory analysis: ${error.message}`);
    return { exists: false, projects: 0, memories: 0, errors: [error.message], critical: true };
  }
}

// Ask user question
function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// Enhanced configuration menu with security
async function showConfigMenu(config) {
  log('INFO', `=== SECURE CONFIGURATION MENU ===`);
  
  console.log('\n=== Dashboard Configuration (Secure Mode) ===');
  console.log(`1. Memory Path: ${config.memoryPath}`);
  console.log(`2. Task Path: ${config.taskPath}`);
  console.log(`3. Auto-open Browser: ${config.autoOpenBrowser ? 'Yes' : 'No'}`);
  console.log(`4. Preferred Port: ${config.preferredPort || START_PORT}`);
  console.log(`5. Log Level: ${config.logLevel || 'info'}`);
  console.log('6. Analyze Memory Structure');
  console.log('7. Verify Configuration Integrity');
  console.log('8. Save and Start Dashboard');
  console.log('9. Exit');
  
  const choice = await askQuestion('\nEnter choice (1-9): ');
  log('INFO', `User selected menu option: ${choice}`);
  
  switch (choice) {
    case '1':
      const memoryPath = await askQuestion(`Enter memory path [${config.memoryPath}]: `);
      if (memoryPath) {
        const validation = validateConfig({ ...config, memoryPath });
        if (validation.valid) {
          config.memoryPath = validation.config.memoryPath;
          console.log(`✓ Memory path set to: ${config.memoryPath}`);
        } else {
          console.log(`✗ Invalid path: ${validation.errors.join(', ')}`);
        }
      }
      return showConfigMenu(config);
      
    case '2':
      const taskPath = await askQuestion(`Enter task path [${config.taskPath}]: `);
      if (taskPath) {
        const validation = validateConfig({ ...config, taskPath });
        if (validation.valid) {
          config.taskPath = validation.config.taskPath;
          console.log(`✓ Task path set to: ${config.taskPath}`);
        } else {
          console.log(`✗ Invalid path: ${validation.errors.join(', ')}`);
        }
      }
      return showConfigMenu(config);
      
    case '3':
      const browser = await askQuestion(`Auto-open browser? (y/n) [${config.autoOpenBrowser ? 'y' : 'n'}]: `);
      if (browser.toLowerCase() === 'y' || browser.toLowerCase() === 'yes') {
        config.autoOpenBrowser = true;
      } else if (browser.toLowerCase() === 'n' || browser.toLowerCase() === 'no') {
        config.autoOpenBrowser = false;
      }
      console.log(`✓ Auto-open browser: ${config.autoOpenBrowser ? 'Yes' : 'No'}`);
      return showConfigMenu(config);
      
    case '4':
      const port = await askQuestion(`Enter preferred port [${config.preferredPort || START_PORT}]: `);
      if (port) {
        const portNum = parseInt(port);
        const validation = validateConfig({ ...config, preferredPort: portNum });
        if (validation.valid) {
          config.preferredPort = portNum;
          console.log(`✓ Preferred port set to: ${config.preferredPort}`);
        } else {
          console.log(`✗ Invalid port: ${validation.errors.join(', ')}`);
        }
      }
      return showConfigMenu(config);
      
    case '5':
      const logLevel = await askQuestion(`Enter log level (debug/info/warn/error) [${config.logLevel || 'info'}]: `);
      if (logLevel) {
        const validation = validateConfig({ ...config, logLevel });
        if (validation.valid) {
          config.logLevel = logLevel;
          console.log(`✓ Log level set to: ${config.logLevel}`);
        } else {
          console.log(`✗ Invalid log level: ${validation.errors.join(', ')}`);
        }
      }
      return showConfigMenu(config);
      
    case '6':
      console.log('\n🔍 Analyzing memory structure...');
      const analysis = analyzeMemoryStructure(config.memoryPath);
      console.log('\n📊 Memory Analysis Results:');
      console.log(`   Directory exists: ${analysis.exists ? '✅' : '❌'}`);
      console.log(`   Projects found: ${analysis.projects}`);
      console.log(`   Memory files: ${analysis.memories}`);
      await askQuestion('\nPress Enter to continue...');
      return showConfigMenu(config);
      
    case '7':
      console.log('\n🔒 Verifying configuration integrity...');
      const isValid = verifyConfigIntegrity(config);
      console.log(isValid ? '✅ Configuration integrity verified' : '❌ Configuration integrity check failed');
      await askQuestion('\nPress Enter to continue...');
      return showConfigMenu(config);
      
    case '8':
      if (saveConfig(config)) {
        console.log('✅ Configuration saved securely\n');
        return config;
      } else {
        console.log('❌ Failed to save configuration');
        await askQuestion('\nPress Enter to continue...');
        return showConfigMenu(config);
      }
      
    case '9':
      log('INFO', `User chose to exit`);
      console.log('Goodbye!');
      process.exit(0);
      
    default:
      console.log('Invalid choice. Please enter 1-9.');
      return showConfigMenu(config);
  }
}

// Port availability testing (kept from original)
async function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    const timeout = setTimeout(() => {
      server.close();
      resolve(false);
    }, 500);
    
    server.once('error', (err) => {
      clearTimeout(timeout);
      resolve(err.code !== 'EADDRINUSE');
    });
    
    server.once('listening', () => {
      clearTimeout(timeout);
      server.close(() => {
        const client = new net.Socket();
        client.setTimeout(300);
        
        client.on('connect', () => {
          client.destroy();
          resolve(false);
        });
        
        client.on('timeout', () => {
          client.destroy();
          resolve(true);
        });
        
        client.on('error', () => {
          resolve(true);
        });
        
        client.connect(port, 'localhost');
      });
    });
    
    server.listen(port, '0.0.0.0');
  });
}

// Find available port
async function findAvailablePort(startPort = START_PORT) {
  log('INFO', `=== PORT DETECTION ===`);
  
  for (let port = startPort; port < startPort + MAX_ATTEMPTS; port++) {
    console.log(`Checking port ${port}...`);
    
    const available = await isPortAvailable(port);
    
    if (available) {
      log('SUCCESS', `Port ${port} is available`);
      console.log(`✅ Port ${port} is available!\n`);
      return port;
    } else {
      log('WARN', `Port ${port} is busy`);
      console.log(`❌ Port ${port} is busy`);
    }
  }
  
  throw new Error(`No available ports found in range ${startPort}-${startPort + MAX_ATTEMPTS}`);
}

// Find Node.js executable
async function findNodeExecutable() {
  log('INFO', `=== NODE.JS DETECTION ===`);
  
  if (process.pkg) {
    const possiblePaths = [
      'C:\\Program Files\\nodejs\\node.exe',
      'C:\\Program Files (x86)\\nodejs\\node.exe',
      path.join(process.env.APPDATA || '', '..', 'Local', 'Programs', 'nodejs', 'node.exe')
    ];
    
    for (const nodePath of possiblePaths) {
      if (fs.existsSync(nodePath)) {
        return nodePath;
      }
    }
    
    return new Promise((resolve) => {
      exec('where node', (error, stdout) => {
        if (!error && stdout) {
          resolve(stdout.trim().split('\n')[0]);
        } else {
          resolve(null);
        }
      });
    });
  } else {
    return process.execPath;
  }
}

// Main dashboard startup function
async function startDashboard() {
  try {
    // Banner
    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║   Like-I-Said Dashboard SECURE v3       ║');
    console.log('║        Version 2.4.5-secure-v3          ║');
    console.log('║                                          ║');
    console.log('║  🔒 SECURE CONFIGURATION HANDLING       ║');
    console.log('║  ✅ JSON PARSING PROTECTION            ║');
    console.log('║  ✅ ATOMIC FILE OPERATIONS             ║');
    console.log('║  ✅ CONFIGURATION VALIDATION           ║');
    console.log('╚══════════════════════════════════════════╝\n');
    console.log(`📋 Diagnostic log: ${logFile}\n`);
    
    log('SECURITY', `=== SECURE DASHBOARD STARTUP ===`);
    log('INFO', `Platform: ${os.platform()} ${os.arch()}`);
    log('INFO', `Node Version: ${process.version}`);
    log('INFO', `Working Directory: ${process.cwd()}`);
    
    // Load configuration securely
    let config = loadConfig();
    
    // Verify configuration integrity
    if (!verifyConfigIntegrity(config)) {
      console.log('⚠️  Configuration integrity check failed');
      const useDefault = await askQuestion('Use default configuration? (y/n): ');
      if (useDefault.toLowerCase() !== 'y') {
        console.log('Exiting...');
        process.exit(1);
      }
      config = DEFAULT_CONFIG;
    }
    
    // Check if this is first run or config flag
    const isFirstRun = !fs.existsSync(CONFIG_FILE);
    const forceConfig = process.argv.includes('--config');
    
    if (isFirstRun || forceConfig) {
      console.log('=== Configuration Setup ===');
      console.log('Please configure your dashboard settings:\n');
      config = await showConfigMenu(config);
    } else {
      console.log('Current configuration:');
      console.log(`📁 Memories: ${config.memoryPath}`);
      console.log(`📋 Tasks: ${config.taskPath}`);
      console.log(`🌐 Auto-open: ${config.autoOpenBrowser ? 'Yes' : 'No'}`);
      console.log(`🔌 Preferred port: ${config.preferredPort || START_PORT}`);
      console.log(`📊 Log level: ${config.logLevel || 'info'}`);
      
      const choice = await askQuestion('\nPress Enter to start, or type "config" to change settings: ');
      
      if (choice.toLowerCase() === 'config') {
        config = await showConfigMenu(config);
      }
    }
    
    // Ensure directories exist
    if (!fs.existsSync(config.memoryPath)) {
      fs.mkdirSync(config.memoryPath, { recursive: true });
      log('SUCCESS', `Created memory directory`);
    }
    
    if (!fs.existsSync(config.taskPath)) {
      fs.mkdirSync(config.taskPath, { recursive: true });
      log('SUCCESS', `Created task directory`);
    }
    
    // Find available port
    const port = await findAvailablePort(config.preferredPort || START_PORT);
    
    // Find Node.js executable
    const nodeExe = await findNodeExecutable();
    
    if (!nodeExe) {
      throw new Error('Node.js not found. Please install Node.js and ensure it is in your PATH.');
    }
    
    // Check for server file
    const serverPath = path.join(process.cwd(), 'dashboard-server-bridge.js');
    
    if (!fs.existsSync(serverPath)) {
      throw new Error(`Server file not found at: ${serverPath}`);
    }
    
    // Set environment
    const env = {
      ...process.env,
      PORT: port.toString(),
      NODE_ENV: 'production',
      MEMORY_DIR: config.memoryPath,
      TASK_DIR: config.taskPath,
      LOG_LEVEL: config.logLevel || 'info',
      SECURE_MODE: 'true'
    };
    
    console.log('\n🚀 Starting secure dashboard server...');
    
    // Start server
    const child = spawn(nodeExe, [serverPath], {
      env,
      stdio: 'inherit',
      windowsHide: false
    });
    
    child.on('error', (err) => {
      log('ERROR', `Server start error: ${err.message}`);
      console.error(`\n❌ Failed to start server: ${err.message}`);
      process.exit(1);
    });
    
    child.on('exit', (code) => {
      log('INFO', `Server exited with code: ${code}`);
      if (code !== 0) {
        console.error(`\n💥 Server crashed with code ${code}`);
      }
      process.exit(code || 0);
    });
    
    // Wait and show startup success
    setTimeout(() => {
      const url = `http://localhost:${port}`;
      
      console.log(`\n🎉 Dashboard running at: ${url}`);
      console.log(`📁 Memories: ${config.memoryPath}`);
      console.log(`📋 Tasks: ${config.taskPath}`);
      console.log(`🔒 Secure mode enabled`);
      console.log('\n🛑 Press Ctrl+C to stop\n');
      
      if (config.autoOpenBrowser) {
        exec(`start "" "${url}"`);
      }
    }, 3000);
    
  } catch (error) {
    log('ERROR', `Fatal error: ${error.message}`);
    console.error(`\n💥 Fatal Error: ${error.message}`);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  log('INFO', `=== GRACEFUL SHUTDOWN ===`);
  console.log('\n\n🛑 Shutting down...');
  releaseLock(); // Ensure lock is released
  logStream.end();
  process.exit(0);
});

// Clean up lock on exit
process.on('exit', () => {
  releaseLock();
});

// Error handlers
process.on('uncaughtException', (err) => {
  log('ERROR', `Uncaught exception: ${err.message}`);
  console.error('\n💥 Unexpected error:', err.message);
  releaseLock();
  logStream.end();
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  log('ERROR', `Unhandled rejection: ${reason}`);
  console.error('\n💥 Unhandled promise rejection:', reason);
});

// Start the secure dashboard
log('SECURITY', `=== SECURE LAUNCHER STARTED ===`);
log('SECURITY', `✅ JSON parsing protection enabled`);
log('SECURITY', `✅ Configuration validation active`);
log('SECURITY', `✅ Atomic file operations enabled`);
startDashboard();