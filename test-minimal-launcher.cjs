#!/usr/bin/env node

/**
 * Minimal test launcher to diagnose executable issues
 */

const fs = require('fs');
const path = require('path');

console.log('=== MINIMAL TEST LAUNCHER ===');
console.log('Testing basic functionality...\n');

try {
  // Test 1: Basic console output
  console.log('✓ Console output works');
  
  // Test 2: Check process info
  console.log('\nProcess Information:');
  console.log('- process.cwd():', process.cwd());
  console.log('- __dirname:', __dirname);
  console.log('- __filename:', __filename);
  console.log('- process.execPath:', process.execPath);
  console.log('- process.pkg:', !!process.pkg);
  
  // Test 3: Try to create logs directory
  console.log('\nTrying to create logs directory...');
  
  // Try different path approaches
  const approaches = [
    { name: 'process.cwd()', path: process.cwd() },
    { name: 'dirname of execPath', path: path.dirname(process.execPath) },
    { name: '__dirname', path: __dirname },
    { name: 'current directory', path: '.' }
  ];
  
  let logsDirCreated = false;
  let logsDir = null;
  
  for (const approach of approaches) {
    try {
      const testDir = path.join(approach.path, 'logs');
      console.log(`\nTrying ${approach.name}: ${testDir}`);
      
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
        console.log(`✓ Created logs directory at: ${testDir}`);
        logsDir = testDir;
        logsDirCreated = true;
        break;
      } else {
        console.log(`✓ Logs directory already exists at: ${testDir}`);
        logsDir = testDir;
        logsDirCreated = true;
        break;
      }
    } catch (error) {
      console.log(`✗ Failed with ${approach.name}: ${error.message}`);
    }
  }
  
  // Test 4: Try to write a log file
  if (logsDirCreated && logsDir) {
    console.log('\nTrying to write log file...');
    try {
      const testLog = path.join(logsDir, 'test-log.txt');
      fs.writeFileSync(testLog, `Test log created at ${new Date().toISOString()}\n`);
      console.log(`✓ Successfully wrote log file: ${testLog}`);
    } catch (error) {
      console.log(`✗ Failed to write log: ${error.message}`);
    }
  }
  
  // Test 5: Check for required files
  console.log('\nChecking for required files...');
  const requiredFiles = [
    'dashboard-server-bridge.js',
    'package.json',
    'manifest.json'
  ];
  
  for (const file of requiredFiles) {
    const exists = fs.existsSync(file);
    console.log(`- ${file}: ${exists ? '✓ Found' : '✗ Not found'}`);
  }
  
  console.log('\n=== TEST COMPLETE ===');
  console.log('Press any key to exit...');
  
  // Keep console open
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', () => {
      process.exit(0);
    });
  } else {
    setTimeout(() => process.exit(0), 5000);
  }
  
} catch (error) {
  console.error('\n❌ CRITICAL ERROR:', error.message);
  console.error('Stack:', error.stack);
  console.log('\nPress any key to exit...');
  
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', () => {
      process.exit(1);
    });
  } else {
    setTimeout(() => process.exit(1), 10000);
  }
}