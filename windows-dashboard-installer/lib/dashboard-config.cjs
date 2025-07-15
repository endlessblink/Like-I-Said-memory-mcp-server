#!/usr/bin/env node

/**
 * Dashboard Configuration System
 * Manages persistent settings for the Like-I-Said dashboard launcher
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

class DashboardConfig {
  constructor() {
    this.configFile = path.join(process.cwd(), 'dashboard-config.json');
    this.defaultConfig = {
      memoryDirectory: path.join(process.cwd(), 'memories'),
      taskDirectory: path.join(process.cwd(), 'tasks'),
      autoOpenBrowser: true,
      preferredPort: 3001,
      logLevel: 'info',
      showStartupBanner: true,
      createDirectories: true,
      backupOnStartup: true,
      version: '2.4.3'
    };
    
    this.config = this.loadConfig();
  }

  /**
   * Load configuration from file or create with defaults
   */
  loadConfig() {
    try {
      if (fs.existsSync(this.configFile)) {
        const configData = JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
        // Merge with defaults to ensure all required fields exist
        return { ...this.defaultConfig, ...configData };
      }
    } catch (error) {
      console.warn(`Warning: Could not load config file: ${error.message}`);
    }
    
    // Return defaults if file doesn't exist or is corrupted
    return { ...this.defaultConfig };
  }

  /**
   * Save configuration to file
   */
  saveConfig() {
    try {
      const configDir = path.dirname(this.configFile);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.error(`Error saving config: ${error.message}`);
      return false;
    }
  }

  /**
   * Get configuration value
   */
  get(key) {
    return this.config[key];
  }

  /**
   * Set configuration value with validation
   */
  set(key, value) {
    // Validate specific keys
    if (key === 'preferredPort') {
      const portNum = parseInt(value);
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        console.warn(`Invalid port number: ${value}. Keeping current value.`);
        return false;
      }
      value = portNum;
    } else if (['autoOpenBrowser', 'showStartupBanner', 'createDirectories', 'backupOnStartup'].includes(key)) {
      if (typeof value === 'string') {
        value = value.toLowerCase() === 'true' || value === '1' || value.toLowerCase() === 'yes';
      }
    } else if (['memoryDirectory', 'taskDirectory'].includes(key)) {
      if (typeof value === 'string') {
        value = path.resolve(value);
      }
    } else if (key === 'logLevel') {
      const validLevels = ['debug', 'info', 'warn', 'error'];
      if (!validLevels.includes(value)) {
        console.warn(`Invalid log level: ${value}. Valid levels: ${validLevels.join(', ')}`);
        return false;
      }
    }
    
    this.config[key] = value;
    return this.saveConfig();
  }

  /**
   * Get all configuration
   */
  getAll() {
    return { ...this.config };
  }

  /**
   * Reset configuration to defaults
   */
  reset() {
    this.config = { ...this.defaultConfig };
    return this.saveConfig();
  }

  /**
   * Validate and create directories
   */
  validateDirectories() {
    const results = {
      memoryDirectory: this.validateDirectory(this.config.memoryDirectory),
      taskDirectory: this.validateDirectory(this.config.taskDirectory)
    };
    
    return results;
  }

  /**
   * Validate a single directory path
   */
  validateDirectory(dirPath) {
    const result = {
      path: dirPath,
      exists: false,
      canCreate: false,
      created: false,
      writable: false,
      error: null
    };

    try {
      // Check if directory exists
      if (fs.existsSync(dirPath)) {
        result.exists = true;
        
        // Check if writable
        try {
          fs.accessSync(dirPath, fs.constants.W_OK);
          result.writable = true;
        } catch (writeError) {
          result.error = `Directory exists but is not writable: ${writeError.message}`;
        }
      } else {
        // Try to create directory
        if (this.config.createDirectories) {
          try {
            fs.mkdirSync(dirPath, { recursive: true });
            result.created = true;
            result.exists = true;
            result.writable = true;
            result.canCreate = true;
          } catch (createError) {
            result.error = `Cannot create directory: ${createError.message}`;
          }
        } else {
          result.canCreate = this.canCreateDirectory(dirPath);
          result.error = 'Directory does not exist and auto-creation is disabled';
        }
      }
    } catch (error) {
      result.error = `Path validation error: ${error.message}`;
    }

    return result;
  }

  /**
   * Check if directory can be created
   */
  canCreateDirectory(dirPath) {
    try {
      const parentDir = path.dirname(dirPath);
      return fs.existsSync(parentDir) && fs.accessSync(parentDir, fs.constants.W_OK) === undefined;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get config file path
   */
  getConfigPath() {
    return this.configFile;
  }

  /**
   * Check if configuration file exists
   */
  configExists() {
    return fs.existsSync(this.configFile);
  }

  /**
   * Display current configuration
   */
  displayConfig() {
    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║          Current Configuration          ║');
    console.log('╚══════════════════════════════════════════╝');
    
    console.log(`\nMemory Directory: ${this.config.memoryDirectory}`);
    console.log(`Task Directory: ${this.config.taskDirectory}`);
    console.log(`Auto-open Browser: ${this.config.autoOpenBrowser ? 'Yes' : 'No'}`);
    console.log(`Preferred Port: ${this.config.preferredPort}`);
    console.log(`Log Level: ${this.config.logLevel}`);
    console.log(`Show Startup Banner: ${this.config.showStartupBanner ? 'Yes' : 'No'}`);
    console.log(`Create Directories: ${this.config.createDirectories ? 'Yes' : 'No'}`);
    console.log(`Backup on Startup: ${this.config.backupOnStartup ? 'Yes' : 'No'}`);
    console.log(`Config File: ${this.configFile}`);
    
    // Validate directories and show status
    const validation = this.validateDirectories();
    console.log('\nDirectory Status:');
    
    for (const [key, result] of Object.entries(validation)) {
      const label = key === 'memoryDirectory' ? 'Memory' : 'Task';
      const status = result.exists ? 
        (result.writable ? '✓ OK' : '⚠ Not writable') : 
        (result.canCreate ? '⚠ Will create' : '✗ Cannot create');
      
      console.log(`  ${label}: ${status}`);
      if (result.error) {
        console.log(`    Error: ${result.error}`);
      }
    }
    
    console.log('');
  }

  /**
   * Interactive configuration CLI
   */
  async runConfigWizard() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const question = (prompt) => new Promise((resolve) => {
      rl.question(prompt, resolve);
    });

    try {
      console.log('\n╔══════════════════════════════════════════╗');
      console.log('║        Configuration Wizard             ║');
      console.log('╚══════════════════════════════════════════╝');
      
      this.displayConfig();
      
      const shouldConfigure = await question('Do you want to change these settings? (y/N): ');
      
      if (shouldConfigure.toLowerCase() === 'y' || shouldConfigure.toLowerCase() === 'yes') {
        
        // Memory directory
        const memoryDir = await question(`Memory directory [${this.config.memoryDirectory}]: `);
        if (memoryDir.trim()) {
          this.config.memoryDirectory = path.resolve(memoryDir.trim());
        }
        
        // Task directory
        const taskDir = await question(`Task directory [${this.config.taskDirectory}]: `);
        if (taskDir.trim()) {
          this.config.taskDirectory = path.resolve(taskDir.trim());
        }
        
        // Auto-open browser
        const autoOpen = await question(`Auto-open browser? (Y/n) [${this.config.autoOpenBrowser ? 'Y' : 'n'}]: `);
        if (autoOpen.trim()) {
          this.config.autoOpenBrowser = autoOpen.toLowerCase() !== 'n' && autoOpen.toLowerCase() !== 'no';
        }
        
        // Preferred port
        const port = await question(`Preferred port [${this.config.preferredPort}]: `);
        if (port.trim()) {
          const portNum = parseInt(port.trim());
          if (!isNaN(portNum) && portNum > 0 && portNum < 65536) {
            this.config.preferredPort = portNum;
          } else {
            console.log('Invalid port number, keeping current value.');
          }
        }
        
        // Create directories
        const createDirs = await question(`Auto-create directories? (Y/n) [${this.config.createDirectories ? 'Y' : 'n'}]: `);
        if (createDirs.trim()) {
          this.config.createDirectories = createDirs.toLowerCase() !== 'n' && createDirs.toLowerCase() !== 'no';
        }
        
        // Log level
        const logLevel = await question(`Log level (debug/info/warn/error) [${this.config.logLevel}]: `);
        if (logLevel.trim() && ['debug', 'info', 'warn', 'error'].includes(logLevel.trim().toLowerCase())) {
          this.config.logLevel = logLevel.trim().toLowerCase();
        }
        
        // Save configuration
        if (this.saveConfig()) {
          console.log('\n✓ Configuration saved successfully!');
          
          // Validate directories after configuration
          console.log('\nValidating directories...');
          const validation = this.validateDirectories();
          
          let hasErrors = false;
          for (const [key, result] of Object.entries(validation)) {
            const label = key === 'memoryDirectory' ? 'Memory' : 'Task';
            
            if (result.error) {
              console.log(`✗ ${label}: ${result.error}`);
              hasErrors = true;
            } else if (result.created) {
              console.log(`✓ ${label}: Directory created successfully`);
            } else if (result.exists) {
              console.log(`✓ ${label}: Directory exists and is writable`);
            }
          }
          
          if (hasErrors) {
            console.log('\n⚠ Some directories have issues. Please fix them before starting the dashboard.');
          } else {
            console.log('\n✓ All directories are ready!');
          }
          
        } else {
          console.log('\n✗ Failed to save configuration.');
        }
        
      } else {
        console.log('\nConfiguration unchanged.');
      }
      
    } catch (error) {
      console.error(`Configuration error: ${error.message}`);
    } finally {
      rl.close();
    }
  }

  /**
   * Quick setup for first-time users
   */
  async quickSetup() {
    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║             Quick Setup                  ║');
    console.log('╚══════════════════════════════════════════╝');
    
    console.log('\nSetting up Like-I-Said dashboard with default configuration...');
    
    // Validate and create directories
    const validation = this.validateDirectories();
    let setupSuccess = true;
    
    for (const [key, result] of Object.entries(validation)) {
      const label = key === 'memoryDirectory' ? 'Memory' : 'Task';
      
      if (result.error) {
        console.log(`✗ ${label}: ${result.error}`);
        setupSuccess = false;
      } else if (result.created) {
        console.log(`✓ ${label}: Directory created at ${result.path}`);
      } else if (result.exists) {
        console.log(`✓ ${label}: Using existing directory at ${result.path}`);
      }
    }
    
    if (setupSuccess) {
      this.saveConfig();
      console.log(`\n✓ Quick setup complete! Configuration saved to ${this.configFile}`);
      console.log('\nYou can run the dashboard with: node dashboard-launcher-windows.cjs');
      console.log('Or reconfigure anytime with: node dashboard-launcher-windows.cjs --config');
    } else {
      console.log('\n✗ Setup failed. Please fix the directory issues above.');
      return false;
    }
    
    return true;
  }

  /**
   * Get normalized paths for Windows compatibility
   */
  getWindowsPaths() {
    return {
      memoryDirectory: this.config.memoryDirectory.replace(/\//g, '\\'),
      taskDirectory: this.config.taskDirectory.replace(/\//g, '\\'),
      configFile: this.configFile.replace(/\//g, '\\')
    };
  }

  /**
   * Export configuration for other modules
   */
  exportConfig() {
    return {
      ...this.config,
      paths: this.getWindowsPaths(),
      validation: this.validateDirectories()
    };
  }
}

module.exports = { DashboardConfig };