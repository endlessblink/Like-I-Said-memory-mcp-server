#!/usr/bin/env node

/**
 * Comprehensive test suite for robust port detection and path finding
 */

import { 
  isPortAvailable, 
  findAvailablePort, 
  validateServerResponse, 
  startServerWithValidation 
} from '../lib/robust-port-finder.js';

import { 
  validateDirectoryAccess, 
  ensureDirectoryExists, 
  countDirectoryContents, 
  findExistingDataDirectories, 
  resolveOptimalPath, 
  validatePathsConfiguration 
} from '../lib/robust-path-finder.js';

import net from 'net';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Testing Robust Port Detection and Path Finding Systems...\\n');

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

function reportTest(testName, success, error = null) {
  if (success) {
    console.log(`✅ ${testName}`);
    testResults.passed++;
  } else {
    console.log(`❌ ${testName}: ${error?.message || 'Unknown error'}`);
    testResults.failed++;
    if (error) testResults.errors.push({ test: testName, error: error.message });
  }
}

async function testPortDetection() {
  console.log('🔍 Testing Port Detection System...\\n');
  
  // Test 1: Basic port availability check
  try {
    const available = await isPortAvailable(65432); // High port unlikely to be used
    reportTest('Basic port availability check', available);
  } catch (error) {
    reportTest('Basic port availability check', false, error);
  }
  
  // Test 2: Port unavailable check
  try {
    const server = net.createServer();
    await new Promise((resolve, reject) => {
      server.listen(65433, '127.0.0.1', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    const available = await isPortAvailable(65433);
    server.close();
    reportTest('Port unavailable detection', !available);
  } catch (error) {
    reportTest('Port unavailable detection', false, error);
  }
  
  // Test 3: Find available port
  try {
    const port = await findAvailablePort(65000);
    reportTest('Find available port', port >= 65000 && port < 65100);
  } catch (error) {
    reportTest('Find available port', false, error);
  }
  
  // Test 4: Port timeout handling
  try {
    const startTime = Date.now();
    await isPortAvailable(65434, 1000); // 1 second timeout
    const duration = Date.now() - startTime;
    reportTest('Port timeout handling', duration < 2000);
  } catch (error) {
    reportTest('Port timeout handling', false, error);
  }
  
  console.log('\\n');
}

async function testPathFinding() {
  console.log('🔍 Testing Path Finding System...\\n');
  
  const testDir = path.join(__dirname, 'test-data');
  
  // Setup test directories
  try {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
  } catch (error) {
    console.log(`⚠️ Setup error: ${error.message}`);
  }
  
  // Test 1: Directory validation
  try {
    const validation = await validateDirectoryAccess(testDir);
    reportTest('Directory validation', validation.valid);
  } catch (error) {
    reportTest('Directory validation', false, error);
  }
  
  // Test 2: Ensure directory exists
  try {
    const newDir = path.join(testDir, 'new-dir');
    const result = await ensureDirectoryExists(newDir, true);
    reportTest('Ensure directory exists', result.success && result.created);
  } catch (error) {
    reportTest('Ensure directory exists', false, error);
  }
  
  // Test 3: Count directory contents
  try {
    // Create test files
    const projectDir = path.join(testDir, 'test-project');
    fs.mkdirSync(projectDir, { recursive: true });
    fs.writeFileSync(path.join(projectDir, 'test1.md'), 'test content');
    fs.writeFileSync(path.join(projectDir, 'test2.md'), 'test content');
    
    const counts = await countDirectoryContents(testDir);
    reportTest('Count directory contents', counts.count === 2 && counts.projects === 1);
  } catch (error) {
    reportTest('Count directory contents', false, error);
  }
  
  // Test 4: Find existing data directories
  try {
    const candidates = await findExistingDataDirectories('memories');
    reportTest('Find existing data directories', Array.isArray(candidates));
  } catch (error) {
    reportTest('Find existing data directories', false, error);
  }
  
  // Test 5: Resolve optimal path
  try {
    const optimal = await resolveOptimalPath(testDir, 'test');
    reportTest('Resolve optimal path', optimal.path === path.resolve(testDir));
  } catch (error) {
    reportTest('Resolve optimal path', false, error);
  }
  
  // Test 6: Validate paths configuration
  try {
    const memoryPath = path.join(testDir, 'memories');
    const taskPath = path.join(testDir, 'tasks');
    
    fs.mkdirSync(memoryPath, { recursive: true });
    fs.mkdirSync(taskPath, { recursive: true });
    
    const validation = await validatePathsConfiguration(memoryPath, taskPath);
    reportTest('Validate paths configuration', validation.valid);
  } catch (error) {
    reportTest('Validate paths configuration', false, error);
  }
  
  // Test 7: Invalid paths configuration
  try {
    const validation = await validatePathsConfiguration(testDir, testDir); // Same path
    reportTest('Invalid paths detection', !validation.valid);
  } catch (error) {
    reportTest('Invalid paths detection', false, error);
  }
  
  // Cleanup
  try {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  } catch (error) {
    console.log(`⚠️ Cleanup error: ${error.message}`);
  }
  
  console.log('\\n');
}

async function testErrorHandling() {
  console.log('🔍 Testing Error Handling...\\n');
  
  // Test 1: Invalid port
  try {
    await isPortAvailable(-1);
    reportTest('Invalid port handling', false);
  } catch (error) {
    reportTest('Invalid port handling', true);
  }
  
  // Test 2: Non-existent directory
  try {
    const validation = await validateDirectoryAccess('/non/existent/path');
    reportTest('Non-existent directory handling', !validation.valid);
  } catch (error) {
    reportTest('Non-existent directory handling', false, error);
  }
  
  // Test 3: Permission denied (simulated)
  try {
    const result = await ensureDirectoryExists('/root/restricted', false);
    reportTest('Permission denied handling', !result.success);
  } catch (error) {
    reportTest('Permission denied handling', true);
  }
  
  console.log('\\n');
}

async function testPerformance() {
  console.log('🔍 Testing Performance...\\n');
  
  // Test 1: Port detection speed
  try {
    const startTime = Date.now();
    await findAvailablePort(60000);
    const duration = Date.now() - startTime;
    reportTest('Port detection performance', duration < 5000); // Should be under 5 seconds
  } catch (error) {
    reportTest('Port detection performance', false, error);
  }
  
  // Test 2: Path validation speed
  try {
    const startTime = Date.now();
    await validateDirectoryAccess(process.cwd());
    const duration = Date.now() - startTime;
    reportTest('Path validation performance', duration < 2000); // Should be under 2 seconds
  } catch (error) {
    reportTest('Path validation performance', false, error);
  }
  
  console.log('\\n');
}

async function testRealWorldScenarios() {
  console.log('🔍 Testing Real-World Scenarios...\\n');
  
  // Test 1: Common port conflicts
  const commonPorts = [3000, 3001, 8000, 8080];
  try {
    const port = await findAvailablePort(3000);
    reportTest('Common port conflict resolution', port >= 3000);
  } catch (error) {
    reportTest('Common port conflict resolution', false, error);
  }
  
  // Test 2: Multiple path candidates
  try {
    const projectRoot = path.join(__dirname, '..');
    const candidates = await findExistingDataDirectories('memories');
    reportTest('Multiple path candidates', Array.isArray(candidates));
  } catch (error) {
    reportTest('Multiple path candidates', false, error);
  }
  
  console.log('\\n');
}

async function runAllTests() {
  console.log('🚀 Starting comprehensive test suite...\\n');
  
  await testPortDetection();
  await testPathFinding();
  await testErrorHandling();
  await testPerformance();
  await testRealWorldScenarios();
  
  console.log('📊 Test Results Summary:');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  
  if (testResults.errors.length > 0) {
    console.log('\\n❌ Failed Tests:');
    testResults.errors.forEach(({ test, error }) => {
      console.log(`   - ${test}: ${error}`);
    });
  }
  
  console.log('\\n✅ Test suite completed!');
  
  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

runAllTests().catch(console.error);