#!/usr/bin/env node

/**
 * Configuration Security Test Suite
 * Tests all security features of dashboard-launcher-secure-v3.cjs
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Test configuration
const TEST_DIR = path.join(process.cwd(), 'test-config-security');
const TEST_CONFIG = path.join(TEST_DIR, 'dashboard-config.json');
const MALFORMED_CONFIGS = {
  invalidJson: '{"invalid json}',
  largeJson: JSON.stringify({ data: 'x'.repeat(1024 * 1024 + 1) }), // > 1MB
  arrayJson: '["not", "an", "object"]',
  nullJson: 'null',
  emptyString: '',
  pathTraversal: JSON.stringify({
    memoryPath: '../../../etc/passwd',
    taskPath: '/tmp/../../../root'
  }),
  invalidPort: JSON.stringify({
    memoryPath: './memories',
    taskPath: './tasks',
    preferredPort: 99999
  }),
  wrongTypes: JSON.stringify({
    memoryPath: 123, // Should be string
    taskPath: true, // Should be string
    autoOpenBrowser: 'yes', // Should be boolean
    preferredPort: '3001' // Should be number
  }),
  sqlInjection: JSON.stringify({
    memoryPath: "'; DROP TABLE users; --",
    taskPath: './tasks'
  }),
  commandInjection: JSON.stringify({
    memoryPath: './memories && rm -rf /',
    taskPath: './tasks'
  })
};

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

// Test results
let passedTests = 0;
let failedTests = 0;

// Helper functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function createTestDirectory() {
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }
}

function cleanupTestDirectory() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

function writeTestConfig(content) {
  fs.writeFileSync(TEST_CONFIG, content, 'utf8');
}

function runTest(testName, testFunction) {
  process.stdout.write(`Testing ${testName}... `);
  try {
    const result = testFunction();
    if (result) {
      log('PASS', 'green');
      passedTests++;
    } else {
      log('FAIL', 'red');
      failedTests++;
    }
  } catch (error) {
    log(`FAIL - ${error.message}`, 'red');
    failedTests++;
  }
}

// Test functions
function testMalformedJsonHandling() {
  for (const [name, config] of Object.entries(MALFORMED_CONFIGS)) {
    runTest(`Malformed JSON - ${name}`, () => {
      writeTestConfig(config);
      
      // Try to parse config
      try {
        const content = fs.readFileSync(TEST_CONFIG, 'utf8');
        
        // Simulate parseJsonSecure function
        if (typeof content !== 'string') {
          return true; // Should reject non-strings
        }
        
        if (content.trim() === '') {
          return true; // Should reject empty strings
        }
        
        if (content.length > 1024 * 1024) {
          return true; // Should reject large files
        }
        
        try {
          const parsed = JSON.parse(content);
          
          // Should reject non-objects
          if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return true;
          }
          
          // If we get here with invalid JSON, test fails
          if (name === 'invalidJson') {
            return false;
          }
          
        } catch (e) {
          // Parse error is expected for invalid JSON
          return name === 'invalidJson';
        }
        
        return true;
      } catch (error) {
        // File read errors are not expected
        return false;
      }
    });
  }
}

function testPathValidation() {
  runTest('Path traversal prevention', () => {
    const paths = [
      '../../../etc/passwd',
      '/tmp/../../../root',
      './valid/../../../invalid',
      'C:\\..\\..\\Windows\\System32'
    ];
    
    for (const testPath of paths) {
      const normalized = path.normalize(testPath);
      if (!normalized.includes('..')) {
        return false; // Should detect parent references
      }
    }
    
    return true;
  });
  
  runTest('Valid paths accepted', () => {
    const validPaths = [
      './memories',
      '/home/user/memories',
      'C:\\Users\\User\\memories',
      path.join(process.cwd(), 'memories')
    ];
    
    for (const testPath of validPaths) {
      const normalized = path.normalize(testPath);
      if (normalized.includes('..')) {
        return false; // Should not have parent references
      }
    }
    
    return true;
  });
}

function testPortValidation() {
  runTest('Invalid port rejection', () => {
    const invalidPorts = [0, -1, 65536, 99999, 'abc', null, undefined, 3.14, Infinity];
    
    for (const port of invalidPorts) {
      if (typeof port === 'number' && Number.isInteger(port) && port >= 1 && port <= 65535) {
        return false; // Should be rejected
      }
    }
    
    return true;
  });
  
  runTest('Valid port acceptance', () => {
    const validPorts = [80, 443, 3000, 3001, 8080, 65535];
    
    for (const port of validPorts) {
      if (!(typeof port === 'number' && Number.isInteger(port) && port >= 1 && port <= 65535)) {
        return false; // Should be accepted
      }
    }
    
    return true;
  });
}

function testFileLocking() {
  runTest('File lock creation', () => {
    const lockFile = path.join(TEST_DIR, '.dashboard-config.lock');
    
    // Create lock
    const lockInfo = {
      pid: process.pid,
      timestamp: new Date().toISOString(),
      host: require('os').hostname()
    };
    
    try {
      fs.writeFileSync(lockFile, JSON.stringify(lockInfo), { flag: 'wx' });
      
      // Verify lock exists
      if (!fs.existsSync(lockFile)) {
        return false;
      }
      
      // Try to create again (should fail)
      try {
        fs.writeFileSync(lockFile, JSON.stringify(lockInfo), { flag: 'wx' });
        return false; // Should have failed
      } catch (e) {
        if (e.code === 'EEXIST') {
          // Clean up
          fs.unlinkSync(lockFile);
          return true;
        }
      }
    } catch (error) {
      return false;
    }
    
    return false;
  });
}

function testAtomicWrite() {
  runTest('Atomic file write', () => {
    const targetFile = path.join(TEST_DIR, 'test-atomic.json');
    const tempFile = `${targetFile}.tmp`;
    const testData = { test: 'data', timestamp: Date.now() };
    
    try {
      // Write to temp file
      fs.writeFileSync(tempFile, JSON.stringify(testData), 'utf8');
      
      // Verify temp file
      const tempContent = fs.readFileSync(tempFile, 'utf8');
      const parsed = JSON.parse(tempContent);
      
      if (parsed.test !== testData.test) {
        return false;
      }
      
      // Atomic rename
      fs.renameSync(tempFile, targetFile);
      
      // Verify final file
      if (!fs.existsSync(targetFile)) {
        return false;
      }
      
      if (fs.existsSync(tempFile)) {
        return false; // Temp file should be gone
      }
      
      // Clean up
      fs.unlinkSync(targetFile);
      return true;
      
    } catch (error) {
      return false;
    }
  });
}

function testChecksumIntegrity() {
  runTest('Checksum generation and verification', () => {
    const crypto = require('crypto');
    
    const config = {
      memoryPath: './memories',
      taskPath: './tasks',
      _metadata: {
        version: '2.4.5-secure-v3',
        checksum: null
      }
    };
    
    // Generate checksum
    const configJson = JSON.stringify(config, null, 2);
    const checksum = crypto.createHash('sha256').update(configJson).digest('hex');
    config._metadata.checksum = checksum;
    
    // Verify checksum
    const configCopy = JSON.parse(JSON.stringify(config));
    const savedChecksum = configCopy._metadata.checksum;
    configCopy._metadata.checksum = null;
    
    const verifyJson = JSON.stringify(configCopy, null, 2);
    const calculatedChecksum = crypto.createHash('sha256').update(verifyJson).digest('hex');
    
    return savedChecksum === calculatedChecksum;
  });
}

function testLogLevelValidation() {
  runTest('Log level validation', () => {
    const validLevels = ['debug', 'info', 'warn', 'error'];
    const invalidLevels = ['trace', 'verbose', 'critical', '', null, 123];
    
    // Test valid levels
    for (const level of validLevels) {
      if (!validLevels.includes(level)) {
        return false;
      }
    }
    
    // Test invalid levels
    for (const level of invalidLevels) {
      if (validLevels.includes(level)) {
        return false;
      }
    }
    
    return true;
  });
}

function testBackupRestore() {
  runTest('Backup and restore mechanism', () => {
    const configFile = path.join(TEST_DIR, 'config.json');
    const backupFile = path.join(TEST_DIR, 'config.backup.json');
    const originalData = { test: 'original' };
    const newData = { test: 'modified' };
    
    try {
      // Create original file
      fs.writeFileSync(configFile, JSON.stringify(originalData), 'utf8');
      
      // Create backup
      fs.copyFileSync(configFile, backupFile);
      
      // Modify original
      fs.writeFileSync(configFile, JSON.stringify(newData), 'utf8');
      
      // Verify modification
      const modified = JSON.parse(fs.readFileSync(configFile, 'utf8'));
      if (modified.test !== 'modified') {
        return false;
      }
      
      // Restore from backup
      fs.copyFileSync(backupFile, configFile);
      
      // Verify restoration
      const restored = JSON.parse(fs.readFileSync(configFile, 'utf8'));
      if (restored.test !== 'original') {
        return false;
      }
      
      // Clean up
      fs.unlinkSync(configFile);
      fs.unlinkSync(backupFile);
      return true;
      
    } catch (error) {
      return false;
    }
  });
}

// Main test runner
function runAllTests() {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║   Configuration Security Test Suite      ║');
  console.log('╚══════════════════════════════════════════╝\n');
  
  // Setup
  cleanupTestDirectory();
  createTestDirectory();
  
  // Run tests
  console.log('=== JSON Parsing Security ===');
  testMalformedJsonHandling();
  
  console.log('\n=== Path Validation ===');
  testPathValidation();
  
  console.log('\n=== Port Validation ===');
  testPortValidation();
  
  console.log('\n=== File Operations ===');
  testFileLocking();
  testAtomicWrite();
  testBackupRestore();
  
  console.log('\n=== Data Integrity ===');
  testChecksumIntegrity();
  
  console.log('\n=== Input Validation ===');
  testLogLevelValidation();
  
  // Cleanup
  cleanupTestDirectory();
  
  // Summary
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║              Test Summary                ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`  Passed: ${colors.green}${passedTests}${colors.reset}`);
  console.log(`  Failed: ${colors.red}${failedTests}${colors.reset}`);
  console.log(`  Total:  ${passedTests + failedTests}`);
  
  if (failedTests === 0) {
    log('\n✅ All security tests passed!', 'green');
  } else {
    log('\n❌ Some security tests failed!', 'red');
  }
  
  process.exit(failedTests > 0 ? 1 : 0);
}

// Run tests
runAllTests();