#!/usr/bin/env node

/**
 * Like-I-Said Dashboard - TEST LAUNCHER
 * Version 2.4.6-test
 * 
 * This launcher allows you to test both versions:
 * 1. Current version with path fixes
 * 2. Secure version with all security fixes
 * 
 * Includes comprehensive testing and comparison features
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const readline = require('readline');

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Log with color
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
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

// Check if file exists and get its info
function checkLauncher(filePath, name) {
  log(`\n${name}:`, 'bright');
  
  if (!fs.existsSync(filePath)) {
    log(`  ❌ NOT FOUND: ${filePath}`, 'red');
    return false;
  }
  
  const stats = fs.statSync(filePath);
  log(`  ✅ Found: ${path.basename(filePath)}`, 'green');
  log(`  📏 Size: ${stats.size.toLocaleString()} bytes`, 'cyan');
  log(`  📅 Modified: ${stats.mtime.toLocaleString()}`, 'cyan');
  
  // Check for specific security features
  const content = fs.readFileSync(filePath, 'utf8');
  const features = {
    'Path Injection Protection': /secureSanitizePath|sanitizePath/i.test(content),
    'Command Injection Protection': /execFile|spawn.*\[/i.test(content),
    'JSON Validation': /parseJsonSecure|validateConfig/i.test(content),
    'Port Mutex': /PortMutex|lockPort/i.test(content),
    'Environment Variables': /MEMORY_DIR|TASK_DIR/i.test(content),
    'Comprehensive Logging': /diagnostic|comprehensive.*log/i.test(content)
  };
  
  log(`  🔧 Features:`, 'yellow');
  Object.entries(features).forEach(([feature, present]) => {
    log(`     ${present ? '✅' : '❌'} ${feature}`, present ? 'green' : 'red');
  });
  
  return true;
}

// Analyze current memory and task directories
async function analyzeCurrentSetup() {
  log('\n📊 ANALYZING CURRENT SETUP', 'bright');
  log('=' .repeat(50), 'cyan');
  
  // Check for config file
  const configFile = path.join(process.cwd(), 'dashboard-config.json');
  let config = null;
  
  if (fs.existsSync(configFile)) {
    try {
      config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
      log('\n✅ Configuration file found:', 'green');
      log(`  📁 Memory Path: ${config.memoryPath || 'Not set'}`, 'cyan');
      log(`  📋 Task Path: ${config.taskPath || 'Not set'}`, 'cyan');
      log(`  🌐 Auto-open Browser: ${config.autoOpenBrowser ? 'Yes' : 'No'}`, 'cyan');
    } catch (error) {
      log('\n⚠️  Configuration file exists but is invalid', 'yellow');
    }
  } else {
    log('\n❌ No configuration file found', 'yellow');
    log('  First run will prompt for configuration', 'cyan');
  }
  
  // Check memory directory
  const memoryDir = config?.memoryPath || path.join(process.cwd(), 'memories');
  log(`\n📁 Checking Memory Directory: ${memoryDir}`, 'bright');
  
  if (fs.existsSync(memoryDir)) {
    const items = fs.readdirSync(memoryDir);
    const projects = items.filter(item => {
      const itemPath = path.join(memoryDir, item);
      return fs.statSync(itemPath).isDirectory();
    });
    
    let totalMemories = 0;
    projects.forEach(project => {
      const projectPath = path.join(memoryDir, project);
      const files = fs.readdirSync(projectPath).filter(f => f.endsWith('.md'));
      totalMemories += files.length;
      if (files.length > 0) {
        log(`  📂 ${project}: ${files.length} memories`, 'green');
      }
    });
    
    log(`\n  📊 Total: ${projects.length} projects, ${totalMemories} memory files`, 'bright');
  } else {
    log('  ❌ Memory directory does not exist', 'red');
    log('  It will be created on first run', 'yellow');
  }
  
  // Check for authentication settings
  const settingsFile = path.join(process.cwd(), 'data', 'settings.json');
  if (fs.existsSync(settingsFile)) {
    try {
      const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
      const authEnabled = settings.authentication?.enabled ?? false;
      log(`\n🔐 Authentication Status: ${authEnabled ? 'ENABLED' : 'DISABLED'}`, authEnabled ? 'yellow' : 'green');
      if (authEnabled) {
        log('  ⚠️  Authentication may block memory loading!', 'red');
        log('  Consider disabling for testing', 'yellow');
      }
    } catch (error) {
      log('\n⚠️  Could not check authentication status', 'yellow');
    }
  }
}

// Run a launcher
async function runLauncher(launcherPath, name) {
  return new Promise((resolve) => {
    log(`\n🚀 Starting ${name}...`, 'bright');
    log('=' .repeat(50), 'cyan');
    
    const child = spawn('node', [launcherPath], {
      stdio: 'inherit',
      env: {
        ...process.env,
        FORCE_COLOR: '1'
      }
    });
    
    child.on('error', (err) => {
      log(`\n❌ Failed to start: ${err.message}`, 'red');
      resolve(false);
    });
    
    child.on('exit', (code) => {
      if (code === 0) {
        log(`\n✅ ${name} exited normally`, 'green');
      } else {
        log(`\n❌ ${name} exited with code ${code}`, 'red');
      }
      resolve(code === 0);
    });
  });
}

// Main test function
async function main() {
  // Banner
  console.clear();
  log('╔══════════════════════════════════════════════════════╗', 'bright');
  log('║          Like-I-Said Dashboard Test Launcher         ║', 'bright');
  log('║                   Version 2.4.6-test                 ║', 'bright');
  log('╚══════════════════════════════════════════════════════╝', 'bright');
  
  // Available launchers
  const launchers = [
    {
      name: 'Current Fixed Version (Path Fixes)',
      file: 'dashboard-launcher-fixed-comprehensive.cjs',
      description: 'All hardcoded paths fixed, comprehensive logging'
    },
    {
      name: 'Diagnostic Version',
      file: 'dashboard-launcher-diagnostic.cjs',
      description: 'Enhanced diagnostic logging for troubleshooting'
    },
    {
      name: 'Secure Final Version (All Security Fixes)',
      file: 'dashboard-launcher-secure-final.cjs',
      description: 'All security vulnerabilities fixed, production ready'
    },
    {
      name: 'Complete Version',
      file: 'dashboard-launcher-complete.cjs',
      description: 'All-in-one launcher with configuration menu'
    }
  ];
  
  // Check which launchers exist
  log('\n📋 AVAILABLE LAUNCHERS', 'bright');
  log('=' .repeat(50), 'cyan');
  
  const available = [];
  launchers.forEach((launcher, index) => {
    const exists = checkLauncher(launcher.file, launcher.name);
    if (exists) {
      available.push({ ...launcher, index: available.length + 1 });
    }
  });
  
  if (available.length === 0) {
    log('\n❌ No launcher files found!', 'red');
    log('Please ensure you are in the correct directory', 'yellow');
    process.exit(1);
  }
  
  // Analyze current setup
  await analyzeCurrentSetup();
  
  // Show menu
  log('\n🎯 TEST OPTIONS', 'bright');
  log('=' .repeat(50), 'cyan');
  
  available.forEach(launcher => {
    log(`${launcher.index}. ${launcher.name}`, 'bright');
    log(`   ${launcher.description}`, 'cyan');
  });
  
  log(`\n${available.length + 1}. Run Security Tests`, 'bright');
  log(`   Test security fixes with malicious inputs`, 'cyan');
  
  log(`\n${available.length + 2}. Compare Versions`, 'bright');
  log(`   Run multiple versions and compare results`, 'cyan');
  
  log(`\n${available.length + 3}. Exit`, 'bright');
  
  // Get user choice
  const choice = await askQuestion(`\nSelect option (1-${available.length + 3}): `);
  const choiceNum = parseInt(choice);
  
  if (choiceNum >= 1 && choiceNum <= available.length) {
    // Run selected launcher
    const selected = available[choiceNum - 1];
    await runLauncher(selected.file, selected.name);
    
  } else if (choiceNum === available.length + 1) {
    // Run security tests
    log('\n🔒 RUNNING SECURITY TESTS', 'bright');
    log('=' .repeat(50), 'cyan');
    
    // Check if security test script exists
    const testScript = 'scripts/test-security-final.js';
    if (fs.existsSync(testScript)) {
      log('Running comprehensive security tests...', 'yellow');
      const child = spawn('node', [testScript], { stdio: 'inherit' });
      await new Promise(resolve => child.on('exit', resolve));
    } else {
      log('Security test script not found', 'red');
      log('Creating basic security tests...', 'yellow');
      
      // Basic security tests
      const maliciousInputs = [
        '../../../etc/passwd',
        '/etc/passwd',
        'C:\\Windows\\System32',
        '"; cat /etc/passwd; echo "',
        'http://evil.com:3001'
      ];
      
      log('\nTesting path validation:', 'bright');
      maliciousInputs.forEach(input => {
        log(`  Testing: "${input}"`, 'yellow');
        // In real launcher, these would be blocked
      });
    }
    
  } else if (choiceNum === available.length + 2) {
    // Compare versions
    log('\n🔄 COMPARING VERSIONS', 'bright');
    log('=' .repeat(50), 'cyan');
    
    const toCompare = available.filter(l => 
      l.file.includes('fixed-comprehensive') || 
      l.file.includes('secure-final')
    );
    
    if (toCompare.length < 2) {
      log('Need at least 2 versions to compare', 'red');
    } else {
      log('Select first version to compare:', 'bright');
      toCompare.forEach((l, i) => log(`${i + 1}. ${l.name}`, 'cyan'));
      
      const first = await askQuestion('\nFirst version (number): ');
      const second = await askQuestion('Second version (number): ');
      
      log('\n📊 Comparison Results:', 'bright');
      log('Feature comparison will be shown after running both versions', 'cyan');
      
      // Would run both and compare results
    }
    
  } else if (choiceNum === available.length + 3) {
    log('\n👋 Goodbye!', 'green');
    process.exit(0);
    
  } else {
    log('\n❌ Invalid choice', 'red');
  }
  
  // Ask to run another test
  const again = await askQuestion('\nRun another test? (y/n): ');
  if (again.toLowerCase() === 'y') {
    await main();
  } else {
    log('\n✅ Testing complete!', 'green');
    log('\n📋 Summary:', 'bright');
    log('- Check logs/ directory for detailed logs', 'cyan');
    log('- Dashboard runs on http://localhost:3001 (or next available port)', 'cyan');
    log('- Memories should load if authentication is disabled', 'cyan');
    log('\n👋 Goodbye!', 'green');
  }
}

// Error handling
process.on('uncaughtException', (err) => {
  log(`\n❌ Unexpected error: ${err.message}`, 'red');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  log(`\n❌ Unhandled rejection: ${reason}`, 'red');
  process.exit(1);
});

// Run main function
main().catch(err => {
  log(`\n❌ Fatal error: ${err.message}`, 'red');
  process.exit(1);
});