#!/usr/bin/env node

/**
 * Platform Verification Script for Like-I-Said MCP Server v2
 * Verifies the DXT package will work correctly on the current platform
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function verifyPlatform() {
  log('🔍 Like-I-Said MCP Server v2 - Platform Verification', 'blue');
  console.log('='.repeat(50));

  const checks = [];

  // Check 1: Platform Information
  const platform = {
    os: process.platform,
    arch: process.arch,
    node: process.version,
    isWSL: !!(process.env.WSL_DISTRO_NAME || process.env.WSL_INTEROP)
  };

  log('\n📋 Platform Information:', 'blue');
  log(`  OS: ${platform.os} (${os.release()})`, 'gray');
  log(`  Architecture: ${platform.arch}`, 'gray');
  log(`  Node.js: ${platform.node}`, 'gray');
  if (platform.isWSL) {
    log('  Environment: WSL', 'yellow');
  }

  // Check 2: Node.js Version
  const nodeVersion = process.version.match(/^v(\d+)\.(\d+)/);
  const majorVersion = parseInt(nodeVersion[1]);
  
  if (majorVersion >= 16) {
    checks.push({ name: 'Node.js Version', passed: true });
    log('\n✅ Node.js version compatible (requires 16+)', 'green');
  } else {
    checks.push({ name: 'Node.js Version', passed: false });
    log('\n❌ Node.js version too old (requires 16+)', 'red');
  }

  // Check 3: Required Directories
  log('\n📁 Checking directory creation:', 'blue');
  const testDirs = ['memories', 'tasks', 'data-backups'];
  let dirCheck = true;

  for (const dir of testDirs) {
    const testPath = path.join(os.tmpdir(), `like-i-said-test-${dir}`);
    try {
      fs.mkdirSync(testPath, { recursive: true });
      fs.rmdirSync(testPath);
      log(`  ✓ Can create ${dir} directory`, 'green');
    } catch (error) {
      log(`  ✗ Cannot create ${dir} directory: ${error.message}`, 'red');
      dirCheck = false;
    }
  }
  
  checks.push({ name: 'Directory Creation', passed: dirCheck });

  // Check 4: File Operations
  log('\n📝 Checking file operations:', 'blue');
  const testFile = path.join(os.tmpdir(), 'like-i-said-test.md');
  let fileCheck = true;

  try {
    // Write test
    fs.writeFileSync(testFile, '# Test Memory\n\nTest content');
    log('  ✓ File write successful', 'green');

    // Read test
    const content = fs.readFileSync(testFile, 'utf8');
    if (content.includes('Test Memory')) {
      log('  ✓ File read successful', 'green');
    } else {
      throw new Error('File content mismatch');
    }

    // Delete test
    fs.unlinkSync(testFile);
    log('  ✓ File delete successful', 'green');
  } catch (error) {
    log(`  ✗ File operation failed: ${error.message}`, 'red');
    fileCheck = false;
  }

  checks.push({ name: 'File Operations', passed: fileCheck });

  // Check 5: Path Resolution
  log('\n🛤️ Checking path resolution:', 'blue');
  const pathTests = [
    { input: ['memories', 'project', 'file.md'], desc: 'Standard path' },
    { input: ['.', 'data', 'test.json'], desc: 'Relative path' },
    { input: [__dirname, '..', 'memories'], desc: 'Parent directory path' }
  ];

  let pathCheck = true;
  pathTests.forEach(({ input, desc }) => {
    try {
      const resolved = path.join(...input);
      log(`  ✓ ${desc}: ${resolved}`, 'green');
    } catch (error) {
      log(`  ✗ ${desc}: ${error.message}`, 'red');
      pathCheck = false;
    }
  });

  checks.push({ name: 'Path Resolution', passed: pathCheck });

  // Check 6: ES Modules
  log('\n📦 Checking ES module support:', 'blue');
  let moduleCheck = true;

  try {
    // Test dynamic import
    const testImport = await import('path');
    if (testImport.default || testImport.join) {
      log('  ✓ ES modules supported', 'green');
    } else {
      throw new Error('Module import failed');
    }
  } catch (error) {
    log(`  ✗ ES module error: ${error.message}`, 'red');
    moduleCheck = false;
  }

  checks.push({ name: 'ES Modules', passed: moduleCheck });

  // Summary
  console.log('\n' + '='.repeat(50));
  log('📊 Verification Summary', 'blue');
  console.log('='.repeat(50));

  const passed = checks.filter(c => c.passed).length;
  const failed = checks.filter(c => !c.passed).length;

  checks.forEach(check => {
    const icon = check.passed ? '✅' : '❌';
    const color = check.passed ? 'green' : 'red';
    log(`${icon} ${check.name}`, color);
  });

  console.log();
  if (failed === 0) {
    log('✅ Platform fully compatible with Like-I-Said MCP Server v2!', 'green');
    return 0;
  } else {
    log(`❌ Platform has ${failed} compatibility issue(s)`, 'red');
    log('\nPlease address the issues above before installation.', 'yellow');
    return 1;
  }
}

// Run verification
verifyPlatform()
  .then(exitCode => process.exit(exitCode))
  .catch(error => {
    log(`\n❌ Verification error: ${error.message}`, 'red');
    process.exit(1);
  });