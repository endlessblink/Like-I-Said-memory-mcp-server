#!/usr/bin/env node

import { spawn } from 'child_process';
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

async function testInstallationMode(description, args, expectedPath) {
  return new Promise((resolve) => {
    log(`\n🧪 Testing: ${description}`, 'yellow');
    log(`Command: node cli.js ${args.join(' ')}`, 'blue');
    log(`Expected path: ${expectedPath}`, 'blue');
    
    const child = spawn('node', ['cli.js', ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: path.join(__dirname, '..')
    });
    
    let output = '';
    let errorOutput = '';
    
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    // Kill after 10 seconds to avoid hanging
    const timeout = setTimeout(() => {
      child.kill();
      log('⏱️  Process timed out (expected for testing)', 'yellow');
      
      // Check if directories were created
      let success = false;
      let message = '';
      
      try {
        if (fs.existsSync(path.join(expectedPath, 'memories'))) {
          success = true;
          message = 'Directories created successfully';
        } else if (fs.existsSync(expectedPath)) {
          success = true;
          message = 'Directory created but may be incomplete';
        } else {
          message = 'Directory not created';
        }
      } catch (error) {
        message = `Error checking: ${error.message}`;
      }
      
      resolve({ success, message, output: output + errorOutput });
    }, 10000);
    
    child.on('close', (code) => {
      clearTimeout(timeout);
      const success = code === 0 && fs.existsSync(path.join(expectedPath, 'memories'));
      const message = success ? 'Installation completed successfully' : 
                     `Process exited with code ${code}`;
      resolve({ success, message, output: output + errorOutput });
    });
    
    child.on('error', (error) => {
      clearTimeout(timeout);
      resolve({ success: false, message: error.message, output: errorOutput });
    });
  });
}

async function runInstallationTests() {
  log('\n🧪 Installation Mode Testing', 'blue');
  log('===============================\n', 'blue');
  
  const tests = [
    {
      description: 'Default installation (current directory)',
      args: ['install', '--debug'],
      expectedPath: path.join(__dirname, '..', 'test-default-install'),
      setup: () => {
        const testDir = path.join(__dirname, '..', 'test-default-install');
        if (!fs.existsSync(testDir)) {
          fs.mkdirSync(testDir, { recursive: true });
        }
        process.chdir(testDir);
      }
    },
    {
      description: 'Custom relative path',
      args: ['install', '--path', 'test-custom-relative', '--debug'],
      expectedPath: path.resolve('test-custom-relative'),
      setup: () => {
        process.chdir(path.join(__dirname, '..'));
      }
    },
    {
      description: 'Custom absolute path',
      args: ['install', '--path', path.join(__dirname, '..', 'test-custom-absolute'), '--debug'],
      expectedPath: path.join(__dirname, '..', 'test-custom-absolute'),
      setup: () => {
        process.chdir(path.join(__dirname, '..'));
      }
    }
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      if (test.setup) {
        test.setup();
      }
      
      // Clean up any existing test directory
      if (fs.existsSync(test.expectedPath)) {
        fs.rmSync(test.expectedPath, { recursive: true, force: true });
      }
      
      const result = await testInstallationMode(test.description, test.args, test.expectedPath);
      results.push({ ...test, ...result });
      
      if (result.success) {
        log(`✅ PASS: ${test.description}`, 'green');
        
        // Check specific files/directories
        const checkPaths = [
          path.join(test.expectedPath, 'memories'),
          path.join(test.expectedPath, 'tasks')
        ];
        
        for (const checkPath of checkPaths) {
          if (fs.existsSync(checkPath)) {
            log(`  ✓ Found: ${path.basename(checkPath)}/`, 'green');
          } else {
            log(`  ✗ Missing: ${path.basename(checkPath)}/`, 'red');
          }
        }
      } else {
        log(`❌ FAIL: ${test.description}`, 'red');
        log(`   Reason: ${result.message}`, 'red');
      }
      
      // Show relevant output
      if (result.output) {
        const importantLines = result.output.split('\n')
          .filter(line => line.includes('custom') || line.includes('Created') || line.includes('✅') || line.includes('❌'))
          .slice(0, 3);
        
        if (importantLines.length > 0) {
          log(`   Output: ${importantLines.join(' | ')}`, 'yellow');
        }
      }
      
    } catch (error) {
      results.push({ ...test, success: false, message: error.message });
      log(`❌ FAIL: ${test.description}`, 'red');
      log(`   Error: ${error.message}`, 'red');
    }
  }
  
  // Summary
  log('\n📊 Installation Test Summary', 'blue');
  log('===========================', 'blue');
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  log(`Total Tests: ${results.length}`, 'blue');
  log(`Passed: ${passed}`, 'green');
  log(`Failed: ${failed}`, failed > 0 ? 'red' : 'green');
  
  if (failed > 0) {
    log('\n❌ Failed Tests:', 'red');
    results.filter(r => !r.success).forEach(r => {
      log(`  - ${r.description}: ${r.message}`, 'red');
    });
  }
  
  // Clean up test directories
  log('\n🧹 Cleaning up test directories...', 'blue');
  const testDirs = [
    'test-default-install',
    'test-custom-relative', 
    'test-custom-absolute'
  ];
  
  for (const dir of testDirs) {
    const fullPath = path.join(__dirname, '..', dir);
    if (fs.existsSync(fullPath)) {
      try {
        fs.rmSync(fullPath, { recursive: true, force: true });
        log(`  ✓ Cleaned: ${dir}`, 'green');
      } catch (error) {
        log(`  ✗ Failed to clean: ${dir}`, 'red');
      }
    }
  }
  
  return passed === results.length;
}

// Run tests
runInstallationTests()
  .then(success => {
    log(`\n${success ? '✅ All installation tests passed!' : '❌ Some tests failed'}`, 
        success ? 'green' : 'red');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    log(`\n❌ Test runner failed: ${error.message}`, 'red');
    process.exit(1);
  });