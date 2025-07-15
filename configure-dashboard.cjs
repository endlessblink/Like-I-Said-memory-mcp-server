#!/usr/bin/env node

/**
 * Dashboard Configuration Utility
 * Standalone CLI tool for configuring Like-I-Said dashboard settings
 */

const { DashboardConfig } = require('./lib/dashboard-config.cjs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

// Initialize configuration
const config = new DashboardConfig();

// Display usage information
function showUsage() {
  console.log('\nLike-I-Said Dashboard Configuration Utility');
  console.log('\nUsage:');
  console.log('  node configure-dashboard.cjs [command]');
  console.log('\nCommands:');
  console.log('  configure     Run interactive configuration wizard');
  console.log('  setup         Quick setup with defaults');
  console.log('  show          Display current configuration');
  console.log('  reset         Reset configuration to defaults');
  console.log('  validate      Validate current configuration');
  console.log('  help          Show this help message');
  console.log('\nExamples:');
  console.log('  node configure-dashboard.cjs configure');
  console.log('  node configure-dashboard.cjs setup');
  console.log('  node configure-dashboard.cjs show');
  console.log('  node configure-dashboard.cjs validate');
  console.log('');
}

// Validate configuration and show detailed results
function validateConfiguration() {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║          Configuration Validation       ║');
  console.log('╚══════════════════════════════════════════╝');
  
  const validation = config.validateDirectories();
  const currentConfig = config.getAll();
  
  // Check configuration file
  console.log('\nConfiguration File:');
  if (config.configExists()) {
    console.log(`✓ Found at: ${config.getConfigPath()}`);
  } else {
    console.log(`⚠ Not found, using defaults`);
  }
  
  // Check directories
  console.log('\nDirectory Validation:');
  let allValid = true;
  
  for (const [key, result] of Object.entries(validation)) {
    const label = key === 'memoryDirectory' ? 'Memory Directory' : 'Task Directory';
    
    console.log(`\n${label}:`);
    console.log(`  Path: ${result.path}`);
    
    if (result.exists) {
      if (result.writable) {
        console.log(`  Status: ✓ Ready to use`);
      } else {
        console.log(`  Status: ⚠ Exists but not writable`);
        allValid = false;
      }
    } else {
      if (result.canCreate) {
        console.log(`  Status: ⚠ Will be created when needed`);
      } else {
        console.log(`  Status: ✗ Cannot create directory`);
        allValid = false;
      }
    }
    
    if (result.error) {
      console.log(`  Error: ${result.error}`);
      allValid = false;
    }
  }
  
  // Check port configuration
  console.log('\nPort Configuration:');
  const port = currentConfig.preferredPort;
  if (port >= 1024 && port < 65536) {
    console.log(`✓ Preferred port ${port} is valid`);
  } else {
    console.log(`⚠ Preferred port ${port} may require admin privileges`);
  }
  
  // Overall status
  console.log('\nOverall Status:');
  if (allValid) {
    console.log('✓ Configuration is valid and ready to use');
    return true;
  } else {
    console.log('✗ Configuration has issues that need to be resolved');
    console.log('\nRecommendations:');
    console.log('1. Run: node configure-dashboard.cjs configure');
    console.log('2. Choose appropriate directories with write permissions');
    console.log('3. Enable auto-create directories if needed');
    return false;
  }
}

// Set specific configuration values (for scripting)
function setConfigValue(key, value) {
  const validKeys = [
    'memoryDirectory', 'taskDirectory', 'autoOpenBrowser', 
    'preferredPort', 'logLevel', 'showStartupBanner', 
    'createDirectories', 'backupOnStartup'
  ];
  
  if (!validKeys.includes(key)) {
    console.error(`Invalid configuration key: ${key}`);
    console.log(`Valid keys: ${validKeys.join(', ')}`);
    return false;
  }
  
  // Type conversion for specific keys
  if (key === 'preferredPort') {
    value = parseInt(value);
    if (isNaN(value) || value < 1 || value > 65535) {
      console.error('Port must be a number between 1 and 65535');
      return false;
    }
  } else if (['autoOpenBrowser', 'showStartupBanner', 'createDirectories', 'backupOnStartup'].includes(key)) {
    value = value.toLowerCase() === 'true' || value === '1' || value.toLowerCase() === 'yes';
  } else if (['memoryDirectory', 'taskDirectory'].includes(key)) {
    value = path.resolve(value);
  }
  
  const success = config.set(key, value);
  if (success) {
    console.log(`✓ Set ${key} = ${value}`);
    return true;
  } else {
    console.error(`Failed to set ${key}`);
    return false;
  }
}

// Main command handler
async function handleCommand() {
  switch (command) {
    case 'configure':
    case 'config':
      await config.runConfigWizard();
      break;
      
    case 'setup':
      console.log('\nRunning quick setup...');
      const success = await config.quickSetup();
      process.exit(success ? 0 : 1);
      break;
      
    case 'show':
    case 'display':
      config.displayConfig();
      break;
      
    case 'reset':
      console.log('\nResetting configuration to defaults...');
      const resetSuccess = config.reset();
      if (resetSuccess) {
        console.log('✓ Configuration reset successfully!');
        config.displayConfig();
      } else {
        console.error('✗ Failed to reset configuration');
        process.exit(1);
      }
      break;
      
    case 'validate':
    case 'check':
      const isValid = validateConfiguration();
      process.exit(isValid ? 0 : 1);
      break;
      
    case 'set':
      if (args.length < 3) {
        console.error('Usage: node configure-dashboard.cjs set <key> <value>');
        console.log('\nExample: node configure-dashboard.cjs set preferredPort 3005');
        process.exit(1);
      }
      const success2 = setConfigValue(args[1], args[2]);
      process.exit(success2 ? 0 : 1);
      break;
      
    case 'get':
      if (args.length < 2) {
        console.error('Usage: node configure-dashboard.cjs get <key>');
        process.exit(1);
      }
      const value = config.get(args[1]);
      if (value !== undefined) {
        console.log(value);
      } else {
        console.error(`Configuration key '${args[1]}' not found`);
        process.exit(1);
      }
      break;
      
    case 'help':
    case '--help':
    case '-h':
      showUsage();
      break;
      
    default:
      if (!command) {
        // No command provided, show current config and ask what to do
        console.log('\nLike-I-Said Dashboard Configuration Utility');
        
        if (config.configExists()) {
          config.displayConfig();
          console.log('\nWhat would you like to do?');
          console.log('  configure  - Change settings');
          console.log('  validate   - Check configuration');
          console.log('  help       - Show all options');
        } else {
          console.log('\n⚠ No configuration found. Running quick setup...');
          const success = await config.quickSetup();
          process.exit(success ? 0 : 1);
        }
      } else {
        console.error(`Unknown command: ${command}`);
        showUsage();
        process.exit(1);
      }
  }
}

// Error handling
process.on('uncaughtException', (error) => {
  console.error(`\nFatal error: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`\nUnhandled rejection: ${reason}`);
  process.exit(1);
});

// Run the command handler
handleCommand();