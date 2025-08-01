#!/usr/bin/env node

/**
 * Comprehensive integration test that validates the entire system
 * This test MUST pass before any release
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import fetch from 'node-fetch';
import WebSocket from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_RESULTS = {
  passed: [],
  failed: [],
  startTime: Date.now()
};

// Test configuration
const TEST_CONFIG = {
  apiPort: null, // Will be determined dynamically
  uiPort: 5173,
  testTimeout: 30000, // 30 seconds
  networkIPs: [] // Will be populated
};

// Helper to add test result
function addResult(testName, passed, error = null) {
  if (passed) {
    TEST_RESULTS.passed.push(testName);
    console.log(`✅ ${testName}`);
  } else {
    TEST_RESULTS.failed.push({ test: testName, error: error?.message || 'Unknown error' });
    console.log(`❌ ${testName}: ${error?.message || 'Unknown error'}`);
  }
}

// Get network interfaces
async function getNetworkIPs() {
  const os = await import('os');
  const interfaces = os.networkInterfaces();
  const ips = [];
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  
  return ips;
}

// Test 1: Server startup with port detection
async function testServerStartup() {
  console.log('\n🔍 Testing server startup with port detection...\n');
  
  try {
    // Start the servers
    const serverProcess = spawn('npm', ['run', 'dev:full'], {
      cwd: path.join(__dirname, '..'),
      shell: true,
      detached: false
    });
    
    let apiReady = false;
    let uiReady = false;
    let apiPort = null;
    
    // Monitor output
    const outputPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        serverProcess.kill();
        reject(new Error('Server startup timeout'));
      }, TEST_CONFIG.testTimeout);
      
      serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(`[STDOUT] ${output.trim()}`);
        
        // Check for API server ready
        if (output.includes('API server responding correctly on port')) {
          const portMatch = output.match(/port (\d+)/);
          if (portMatch) {
            apiPort = parseInt(portMatch[1]);
            TEST_CONFIG.apiPort = apiPort;
            apiReady = true;
          }
        }
        
        // Check for UI ready
        if (output.includes('ready in') && output.includes('ms')) {
          uiReady = true;
        }
        
        if (apiReady && uiReady) {
          clearTimeout(timeout);
          resolve({ apiPort });
        }
      });
      
      serverProcess.stderr.on('data', (data) => {
        const output = data.toString();
        console.log(`[STDERR] ${output.trim()}`);
        
        // Check for errors
        if (output.includes('Failed to start server')) {
          clearTimeout(timeout);
          reject(new Error('Server failed to start'));
        }
      });
    });
    
    const result = await outputPromise;
    addResult('Server startup with dynamic port detection', true);
    
    // Keep server running for other tests
    return { serverProcess, apiPort: result.apiPort };
  } catch (error) {
    addResult('Server startup with dynamic port detection', false, error);
    throw error;
  }
}

// Test 2: API endpoint validation
async function testAPIEndpoints(apiPort) {
  console.log('\n🔍 Testing API endpoints...\n');
  
  const endpoints = [
    { path: '/api/status', method: 'GET', expectedFields: ['status', 'server'] },
    { path: '/api/paths', method: 'GET', expectedFields: ['memoriesPath', 'tasksPath'] },
    { path: '/api/memories', method: 'GET', expectedFields: null, expectArray: true },
    { path: '/api/tasks', method: 'GET', expectedFields: null, expectArray: true }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`http://localhost:${apiPort}${endpoint.path}`, {
        method: endpoint.method,
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (endpoint.expectArray && !Array.isArray(data)) {
        throw new Error('Expected array response');
      }
      
      if (endpoint.expectedFields) {
        for (const field of endpoint.expectedFields) {
          if (!(field in data)) {
            throw new Error(`Missing field: ${field}`);
          }
        }
      }
      
      addResult(`API endpoint ${endpoint.path}`, true);
    } catch (error) {
      addResult(`API endpoint ${endpoint.path}`, false, error);
    }
  }
}

// Test 3: CORS from different origins
async function testCORS(apiPort) {
  console.log('\n🔍 Testing CORS configuration...\n');
  
  const networkIPs = await getNetworkIPs();
  TEST_CONFIG.networkIPs = networkIPs;
  
  const origins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    ...networkIPs.map(ip => `http://${ip}:5173`)
  ];
  
  for (const origin of origins) {
    try {
      const response = await fetch(`http://localhost:${apiPort}/api/status`, {
        method: 'GET',
        headers: {
          'Origin': origin,
          'Content-Type': 'application/json'
        }
      });
      
      const corsHeader = response.headers.get('access-control-allow-origin');
      const credentialsHeader = response.headers.get('access-control-allow-credentials');
      
      if (!corsHeader || (corsHeader !== origin && corsHeader !== '*')) {
        throw new Error(`CORS origin not allowed: ${origin}`);
      }
      
      if (credentialsHeader !== 'true') {
        throw new Error('CORS credentials not allowed');
      }
      
      addResult(`CORS from origin ${origin}`, true);
    } catch (error) {
      addResult(`CORS from origin ${origin}`, false, error);
    }
  }
}

// Test 4: WebSocket connectivity
async function testWebSocket(apiPort) {
  console.log('\n🔍 Testing WebSocket connectivity...\n');
  
  const wsUrls = [
    `ws://localhost:${apiPort}`,
    `ws://127.0.0.1:${apiPort}`,
    ...TEST_CONFIG.networkIPs.map(ip => `ws://${ip}:${apiPort}`)
  ];
  
  for (const wsUrl of wsUrls) {
    try {
      await new Promise((resolve, reject) => {
        const ws = new WebSocket(wsUrl);
        const timeout = setTimeout(() => {
          ws.close();
          reject(new Error('WebSocket connection timeout'));
        }, 5000);
        
        ws.on('open', () => {
          clearTimeout(timeout);
          ws.close();
          resolve();
        });
        
        ws.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
      
      addResult(`WebSocket connection to ${wsUrl}`, true);
    } catch (error) {
      addResult(`WebSocket connection to ${wsUrl}`, false, error);
    }
  }
}

// Test 5: UI accessibility from network
async function testUIAccessibility() {
  console.log('\n🔍 Testing UI accessibility from network...\n');
  
  const urls = [
    `http://localhost:${TEST_CONFIG.uiPort}`,
    `http://127.0.0.1:${TEST_CONFIG.uiPort}`,
    ...TEST_CONFIG.networkIPs.map(ip => `http://${ip}:${TEST_CONFIG.uiPort}`)
  ];
  
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        timeout: 5000
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const html = await response.text();
      if (!html.includes('<!DOCTYPE html>')) {
        throw new Error('Invalid HTML response');
      }
      
      addResult(`UI accessible from ${url}`, true);
    } catch (error) {
      addResult(`UI accessible from ${url}`, false, error);
    }
  }
}

// Test 6: No hardcoded localhost in built files
async function testNoHardcodedLocalhost() {
  console.log('\n🔍 Testing for hardcoded localhost references...\n');
  
  const filesToCheck = [
    'src/utils/apiConfig.ts',
    'src/hooks/useWebSocket.ts',
    'src/hooks/useApi.ts'
  ];
  
  for (const file of filesToCheck) {
    try {
      const filePath = path.join(__dirname, '..', file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check for hardcoded localhost (excluding comments)
      const lines = content.split('\n');
      const problematicLines = [];
      
      lines.forEach((line, index) => {
        if (!line.trim().startsWith('//') && !line.trim().startsWith('*')) {
          if (line.includes('localhost:3001') || line.includes('127.0.0.1:3001')) {
            problematicLines.push({ line: index + 1, content: line.trim() });
          }
        }
      });
      
      if (problematicLines.length > 0) {
        throw new Error(`Found hardcoded localhost in ${file}: ${JSON.stringify(problematicLines)}`);
      }
      
      addResult(`No hardcoded localhost in ${file}`, true);
    } catch (error) {
      addResult(`No hardcoded localhost in ${file}`, false, error);
    }
  }
}

// Test 7: Port file creation and cleanup
async function testPortFileHandling(apiPort) {
  console.log('\n🔍 Testing port file handling...\n');
  
  try {
    const portFilePath = path.join(__dirname, '..', '.dashboard-port');
    
    // Check if port file exists
    if (!fs.existsSync(portFilePath)) {
      throw new Error('Port file not created');
    }
    
    // Check port file content
    const portFileContent = fs.readFileSync(portFilePath, 'utf8').trim();
    if (parseInt(portFileContent) !== apiPort) {
      throw new Error(`Port file contains ${portFileContent}, expected ${apiPort}`);
    }
    
    addResult('Port file creation and content', true);
  } catch (error) {
    addResult('Port file creation and content', false, error);
  }
}

// Main test runner
async function runAllTests() {
  console.log('🧪 Running comprehensive integration tests...\n');
  console.log('This test validates the entire system end-to-end.');
  console.log('ALL tests must pass before release.\n');
  
  let serverProcess = null;
  
  try {
    // Start servers and get port
    const { serverProcess: proc, apiPort } = await testServerStartup();
    serverProcess = proc;
    
    // Wait a bit for servers to stabilize
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Run all tests
    await testAPIEndpoints(apiPort);
    await testCORS(apiPort);
    await testWebSocket(apiPort);
    await testUIAccessibility();
    await testNoHardcodedLocalhost();
    await testPortFileHandling(apiPort);
    
  } catch (error) {
    console.error('\n💥 Critical test failure:', error.message);
  } finally {
    // Cleanup
    if (serverProcess) {
      console.log('\n🧹 Cleaning up...');
      serverProcess.kill();
      
      // Clean up port file
      const portFilePath = path.join(__dirname, '..', '.dashboard-port');
      if (fs.existsSync(portFilePath)) {
        fs.unlinkSync(portFilePath);
      }
    }
  }
  
  // Print summary
  const duration = ((Date.now() - TEST_RESULTS.startTime) / 1000).toFixed(2);
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${TEST_RESULTS.passed.length}`);
  console.log(`❌ Failed: ${TEST_RESULTS.failed.length}`);
  console.log(`⏱️  Duration: ${duration}s`);
  console.log(`📈 Success Rate: ${((TEST_RESULTS.passed.length / (TEST_RESULTS.passed.length + TEST_RESULTS.failed.length)) * 100).toFixed(1)}%`);
  
  if (TEST_RESULTS.failed.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    TEST_RESULTS.failed.forEach(({ test, error }) => {
      console.log(`   - ${test}: ${error}`);
    });
    console.log('\n⚠️  SYSTEM NOT READY FOR RELEASE!');
    process.exit(1);
  } else {
    console.log('\n✅ ALL TESTS PASSED! System ready for release.');
    process.exit(0);
  }
}

// Run tests
runAllTests().catch(console.error);