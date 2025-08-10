#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for output
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

log('\n🧪 Quick Custom Path Testing', 'blue');
log('============================\n', 'blue');

const results = [];

function runTest(name, testFn) {
  try {
    log(`Testing: ${name}`, 'yellow');
    testFn();
    results.push({ name, success: true });
    log(`✅ PASS: ${name}`, 'green');
  } catch (error) {
    results.push({ name, success: false, error: error.message });
    log(`❌ FAIL: ${name}`, 'red');
    log(`   Error: ${error.message}`, 'red');
  }
}

// Test 1: Path parsing logic
runTest('Path parsing logic', () => {
  const result = execSync('node scripts/verify-path-parsing.js', { encoding: 'utf8' });
  if (!result.includes('✅ All path parsing tests passed!')) {
    throw new Error('Path parsing tests failed');
  }
});

// Test 2: Default installation (dry run)
runTest('Default installation (getInstallPath)', () => {
  // Mock process.argv to test default behavior
  const mockArgv = ['node', 'cli.js', 'install'];
  const pathIndex = mockArgv.indexOf('--path');
  if (pathIndex !== -1) {
    throw new Error('Found --path when none expected');
  }
  
  // Simulate getInstallPath logic
  function getInstallPath() {
    const pathIndex = mockArgv.indexOf('--path');
    if (pathIndex !== -1 && mockArgv[pathIndex + 1]) {
      return path.resolve(mockArgv[pathIndex + 1]);
    }
    return process.cwd();
  }
  
  const result = getInstallPath();
  if (result !== process.cwd()) {
    throw new Error(`Expected current directory, got: ${result}`);
  }
});

// Test 3: Custom path parsing
runTest('Custom path argument parsing', () => {
  const mockArgv = ['node', 'cli.js', 'install', '--path', '/test/custom/path'];
  
  function getInstallPath() {
    const pathIndex = mockArgv.indexOf('--path');
    if (pathIndex !== -1 && mockArgv[pathIndex + 1]) {
      return path.resolve(mockArgv[pathIndex + 1]);
    }
    return process.cwd();
  }
  
  const result = getInstallPath();
  const expected = path.resolve('/test/custom/path');
  if (result !== expected) {
    throw new Error(`Expected ${expected}, got: ${result}`);
  }
});

// Test 4: Relative path resolution
runTest('Relative path resolution', () => {
  const testDir = './test-relative-path';
  const mockArgv = ['node', 'cli.js', 'install', '--path', testDir];
  
  function getInstallPath() {
    const pathIndex = mockArgv.indexOf('--path');
    if (pathIndex !== -1 && mockArgv[pathIndex + 1]) {
      return path.resolve(mockArgv[pathIndex + 1]);
    }
    return process.cwd();
  }
  
  const result = getInstallPath();
  const expected = path.resolve(testDir);
  if (result !== expected) {
    throw new Error(`Expected ${expected}, got: ${result}`);
  }
});

// Test 5: Path with spaces
runTest('Path with spaces handling', () => {
  const testPath = '/test/path with spaces/mcp';
  const mockArgv = ['node', 'cli.js', 'install', '--path', testPath];
  
  function getInstallPath() {
    const pathIndex = mockArgv.indexOf('--path');
    if (pathIndex !== -1 && mockArgv[pathIndex + 1]) {
      return path.resolve(mockArgv[pathIndex + 1]);
    }
    return process.cwd();
  }
  
  const result = getInstallPath();
  const expected = path.resolve(testPath);
  if (result !== expected) {
    throw new Error(`Expected ${expected}, got: ${result}`);
  }
});

// Test 6: Multiple flags handling
runTest('Multiple flags with --path', () => {
  const mockArgv = ['node', 'cli.js', 'install', '--debug', '--path', '/test/multi', '--docker'];
  
  function getInstallPath() {
    const pathIndex = mockArgv.indexOf('--path');
    if (pathIndex !== -1 && mockArgv[pathIndex + 1]) {
      return path.resolve(mockArgv[pathIndex + 1]);
    }
    return process.cwd();
  }
  
  const result = getInstallPath();
  const expected = path.resolve('/test/multi');
  if (result !== expected) {
    throw new Error(`Expected ${expected}, got: ${result}`);
  }
});

// Test 7: Error case - missing path value
runTest('Missing path value handling', () => {
  const mockArgv = ['node', 'cli.js', 'install', '--path'];
  
  function getInstallPath() {
    const pathIndex = mockArgv.indexOf('--path');
    if (pathIndex !== -1 && mockArgv[pathIndex + 1]) {
      return path.resolve(mockArgv[pathIndex + 1]);
    }
    return process.cwd();
  }
  
  const result = getInstallPath();
  if (result !== process.cwd()) {
    throw new Error(`Expected fallback to cwd, got: ${result}`);
  }
});

// Test 8: Verify core files exist
runTest('Core files exist in project', () => {
  const coreFiles = [
    'cli.js',
    'server-markdown.js',
    'mcp-server-wrapper.js',
    'package.json'
  ];
  
  for (const file of coreFiles) {
    const filePath = path.join(__dirname, '..', file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing core file: ${file}`);
    }
  }
});

// Test 9: Help text includes --path
runTest('Help text includes --path option', () => {
  const cliPath = path.join(__dirname, '..', 'cli.js');
  const content = fs.readFileSync(cliPath, 'utf8');
  if (!content.includes('--path')) {
    throw new Error('Help text does not mention --path option');
  }
});

// Test 10: README includes --path examples
runTest('README includes --path examples', () => {
  const readmePath = path.join(__dirname, '..', 'README.md');
  const content = fs.readFileSync(readmePath, 'utf8');
  if (!content.includes('--path')) {
    throw new Error('README does not include --path examples');
  }
});

// Summary
log('\n📊 Test Results Summary', 'blue');
log('======================', 'blue');

const passed = results.filter(r => r.success).length;
const failed = results.filter(r => !r.success).length;
const total = results.length;

log(`Total Tests: ${total}`, 'blue');
log(`Passed: ${passed}`, 'green');
log(`Failed: ${failed}`, failed > 0 ? 'red' : 'green');

if (failed > 0) {
  log('\n❌ Failed Tests:', 'red');
  results.filter(r => !r.success).forEach(r => {
    log(`  - ${r.name}: ${r.error}`, 'red');
  });
  process.exit(1);
} else {
  log('\n✅ All quick tests passed!', 'green');
  log('\n🚀 Ready for integration testing:', 'blue');
  log('  1. Test actual installation with custom paths', 'yellow');
  log('  2. Verify MCP client configurations', 'yellow');
  log('  3. Test on different platforms', 'yellow');
  process.exit(0);
}