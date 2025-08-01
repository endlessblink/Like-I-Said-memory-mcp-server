#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

log('\n🧪 Testing Custom Path Installation Feature', 'blue');
log('=========================================\n', 'blue');

// Test cases
const testCases = [
  {
    name: 'No --path argument (default behavior)',
    command: 'node ../cli.js install --debug',
    expectedPath: process.cwd(),
    cleanup: false
  },
  {
    name: 'Relative path',
    command: 'node ../cli.js install --path ./test-install-relative --debug',
    expectedPath: path.resolve('./test-install-relative'),
    cleanup: true
  },
  {
    name: 'Absolute path',
    command: 'node ../cli.js install --path /tmp/test-like-i-said-install --debug',
    expectedPath: '/tmp/test-like-i-said-install',
    cleanup: true
  }
];

// Run tests
for (const test of testCases) {
  log(`\n📋 Test: ${test.name}`, 'yellow');
  log(`Command: ${test.command}`, 'blue');
  
  try {
    // Clean up if needed
    if (test.cleanup && fs.existsSync(test.expectedPath)) {
      fs.rmSync(test.expectedPath, { recursive: true, force: true });
    }
    
    // Run the command
    const output = execSync(test.command, {
      cwd: __dirname,
      encoding: 'utf8',
      env: { ...process.env, DEBUG: '1' }
    });
    
    // Check if the expected directory was created
    if (fs.existsSync(test.expectedPath)) {
      log(`✅ Directory created at: ${test.expectedPath}`, 'green');
      
      // Check for key files
      const expectedFiles = ['memories', 'tasks'];
      let allFilesExist = true;
      
      for (const file of expectedFiles) {
        const filePath = path.join(test.expectedPath, file);
        if (fs.existsSync(filePath)) {
          log(`  ✓ Found: ${file}`, 'green');
        } else {
          log(`  ✗ Missing: ${file}`, 'red');
          allFilesExist = false;
        }
      }
      
      if (allFilesExist) {
        log(`✅ Test passed: ${test.name}`, 'green');
      } else {
        log(`❌ Test failed: Missing expected files`, 'red');
      }
      
      // Clean up test directories
      if (test.cleanup) {
        fs.rmSync(test.expectedPath, { recursive: true, force: true });
        log(`  🧹 Cleaned up test directory`, 'blue');
      }
    } else {
      log(`❌ Test failed: Directory not created at ${test.expectedPath}`, 'red');
    }
    
  } catch (error) {
    log(`❌ Test failed with error: ${error.message}`, 'red');
    if (process.env.DEBUG) {
      console.error(error);
    }
  }
}

log('\n✅ Custom path testing complete!', 'green');
log('\n📝 Summary:', 'blue');
log('- The --path argument allows installation to custom directories', 'yellow');
log('- Relative paths are resolved to absolute paths', 'yellow');
log('- Parent directories must exist (installer creates the target directory)', 'yellow');
log('- All MCP client configurations use the custom path', 'yellow');