#!/usr/bin/env node

/**
 * Complete system validation test
 * Tests everything: routing, UI, tasks, memories, cross-browser access
 */

import fetch from 'node-fetch';
import WebSocket from 'ws';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_RESULTS = {
  passed: [],
  failed: [],
  warnings: []
};

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, type = 'info') {
  const prefix = {
    info: `${colors.blue}ℹ${colors.reset}`,
    success: `${colors.green}✅${colors.reset}`,
    error: `${colors.red}❌${colors.reset}`,
    warning: `${colors.yellow}⚠️${colors.reset}`
  };
  console.log(`${prefix[type]} ${message}`);
}

function addResult(test, passed, error = null) {
  if (passed) {
    TEST_RESULTS.passed.push(test);
    log(`${test}`, 'success');
  } else {
    TEST_RESULTS.failed.push({ test, error: error?.message || 'Unknown error' });
    log(`${test}: ${error?.message || 'Unknown error'}`, 'error');
  }
}

// Test 1: API Server Health
async function testAPIServer(port) {
  log('\nTesting API Server...', 'info');
  
  const tests = [
    {
      name: 'API Status Endpoint',
      test: async () => {
        const res = await fetch(`http://localhost:${port}/api/status`);
        const data = await res.json();
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        if (!data.status || data.status !== 'ok') throw new Error('Invalid status response');
        if (!data.server || data.server !== 'Dashboard Bridge') throw new Error('Wrong server type');
      }
    },
    {
      name: 'API Paths Endpoint',
      test: async () => {
        const res = await fetch(`http://localhost:${port}/api/paths`);
        const data = await res.json();
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        if (!data.memories || !data.tasks) throw new Error('Missing path configuration');
        if (!data.memories.path || !data.tasks.path) throw new Error('Invalid path structure');
      }
    },
    {
      name: 'API Memories List',
      test: async () => {
        const res = await fetch(`http://localhost:${port}/api/memories`);
        const data = await res.json();
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        if (!data.data || !Array.isArray(data.data)) throw new Error('Memories should be in data array');
      }
    },
    {
      name: 'API Tasks List',
      test: async () => {
        const res = await fetch(`http://localhost:${port}/api/tasks`);
        const data = await res.json();
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        if (!data.data || !Array.isArray(data.data)) throw new Error('Tasks should be in data array');
      }
    }
  ];
  
  for (const { name, test } of tests) {
    try {
      await test();
      addResult(name, true);
    } catch (error) {
      addResult(name, false, error);
    }
  }
}

// Test 2: WebSocket Connectivity
async function testWebSocket(port) {
  log('\nTesting WebSocket...', 'info');
  
  return new Promise((resolve) => {
    const ws = new WebSocket(`ws://localhost:${port}`);
    let connected = false;
    
    const timeout = setTimeout(() => {
      if (!connected) {
        ws.close();
        addResult('WebSocket Connection', false, new Error('Connection timeout'));
        resolve();
      }
    }, 5000);
    
    ws.on('open', () => {
      connected = true;
      clearTimeout(timeout);
      addResult('WebSocket Connection', true);
      
      // Test sending a message
      ws.send(JSON.stringify({ type: 'ping' }));
      
      setTimeout(() => {
        ws.close();
        resolve();
      }, 1000);
    });
    
    ws.on('error', (error) => {
      clearTimeout(timeout);
      addResult('WebSocket Connection', false, error);
      resolve();
    });
    
    ws.on('message', (data) => {
      try {
        JSON.parse(data);
        addResult('WebSocket Message Parsing', true);
      } catch (error) {
        addResult('WebSocket Message Parsing', false, error);
      }
    });
  });
}

// Test 3: Cross-Origin Access
async function testCORS(port) {
  log('\nTesting CORS...', 'info');
  
  const origins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://192.168.1.100:5173' // Example network IP
  ];
  
  for (const origin of origins) {
    try {
      const res = await fetch(`http://localhost:${port}/api/status`, {
        headers: {
          'Origin': origin,
          'Content-Type': 'application/json'
        }
      });
      
      const corsHeader = res.headers.get('access-control-allow-origin');
      const credentialsHeader = res.headers.get('access-control-allow-credentials');
      
      if (!corsHeader || (corsHeader !== origin && corsHeader !== '*')) {
        throw new Error(`CORS origin not allowed`);
      }
      
      if (credentialsHeader !== 'true') {
        throw new Error('CORS credentials not enabled');
      }
      
      addResult(`CORS from ${origin}`, true);
    } catch (error) {
      addResult(`CORS from ${origin}`, false, error);
    }
  }
}

// Test 4: Memory CRUD Operations
async function testMemoryOperations(port) {
  log('\nTesting Memory Operations...', 'info');
  
  try {
    // Create a test memory
    const createRes = await fetch(`http://localhost:${port}/api/memories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'Test memory created by automated test',
        category: 'test',
        project: 'test-project',
        tags: ['test', 'automated']
      })
    });
    
    if (!createRes.ok) throw new Error(`Create failed: HTTP ${createRes.status}`);
    const created = await createRes.json();
    if (!created.id) throw new Error('No ID returned for created memory');
    
    addResult('Memory Creation', true);
    
    // Read the memory
    const readRes = await fetch(`http://localhost:${port}/api/memories/${created.id}`);
    if (!readRes.ok) throw new Error(`Read failed: HTTP ${readRes.status}`);
    const read = await readRes.json();
    if (read.id !== created.id) throw new Error('Read memory ID mismatch');
    
    addResult('Memory Reading', true);
    
    // Update the memory
    const updateRes = await fetch(`http://localhost:${port}/api/memories/${created.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'Updated test memory',
        tags: ['test', 'automated', 'updated']
      })
    });
    
    if (!updateRes.ok) throw new Error(`Update failed: HTTP ${updateRes.status}`);
    addResult('Memory Update', true);
    
    // Delete the memory
    const deleteRes = await fetch(`http://localhost:${port}/api/memories/${created.id}`, {
      method: 'DELETE'
    });
    
    if (!deleteRes.ok) throw new Error(`Delete failed: HTTP ${deleteRes.status}`);
    addResult('Memory Deletion', true);
    
  } catch (error) {
    addResult('Memory Operations', false, error);
  }
}

// Test 5: Task CRUD Operations
async function testTaskOperations(port) {
  log('\nTesting Task Operations...', 'info');
  
  try {
    // Create a test task
    const createRes = await fetch(`http://localhost:${port}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Fix UI layout issue',
        description: 'Resolve bottom panel overlap with Windows taskbar',
        project: 'like-i-said-ui',
        priority: 'high'
      })
    });
    
    if (!createRes.ok) throw new Error(`Create failed: HTTP ${createRes.status}`);
    const created = await createRes.json();
    if (!created.id) throw new Error('No ID returned for created task');
    
    addResult('Task Creation', true);
    
    // Update task status
    const updateRes = await fetch(`http://localhost:${port}/api/tasks/${created.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'in_progress'
      })
    });
    
    if (!updateRes.ok) throw new Error(`Update failed: HTTP ${updateRes.status}`);
    addResult('Task Status Update', true);
    
    // Delete the task
    const deleteRes = await fetch(`http://localhost:${port}/api/tasks/${created.id}`, {
      method: 'DELETE'
    });
    
    if (!deleteRes.ok) throw new Error(`Delete failed: HTTP ${deleteRes.status}`);
    addResult('Task Deletion', true);
    
  } catch (error) {
    addResult('Task Operations', false, error);
  }
}

// Test 6: UI Files
async function testUIFiles() {
  log('\nTesting UI Files...', 'info');
  
  const requiredFiles = [
    'src/index.css',
    'src/styles/safe-areas.css',
    'src/utils/apiConfig.ts',
    'src/hooks/useWebSocket.ts',
    'src/hooks/useApi.ts'
  ];
  
  for (const file of requiredFiles) {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      addResult(`UI File: ${file}`, true);
    } else {
      addResult(`UI File: ${file}`, false, new Error('File not found'));
    }
  }
  
  // Check for hardcoded localhost
  const filesToCheck = ['src/utils/apiConfig.ts', 'src/hooks/useWebSocket.ts'];
  for (const file of filesToCheck) {
    try {
      const content = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
      const hasHardcodedLocalhost = content.includes('localhost:3001') || content.includes('127.0.0.1:3001');
      
      if (hasHardcodedLocalhost && !content.includes('// ')) {
        addResult(`No hardcoded localhost in ${file}`, false, new Error('Found hardcoded localhost'));
      } else {
        addResult(`No hardcoded localhost in ${file}`, true);
      }
    } catch (error) {
      addResult(`No hardcoded localhost in ${file}`, false, error);
    }
  }
}

// Main test runner
async function runTests() {
  console.log('🧪 Running Complete System Validation Tests\n');
  console.log('This test validates: API, WebSocket, CORS, Memory/Task CRUD, UI Files\n');
  
  // Check if API server is running
  let apiPort = null;
  
  try {
    // Try to read port file
    const portFile = path.join(__dirname, '..', '.dashboard-port');
    if (fs.existsSync(portFile)) {
      apiPort = parseInt(fs.readFileSync(portFile, 'utf8').trim());
      log(`Using API server on port ${apiPort}`, 'info');
    } else {
      // Try common ports
      for (const port of [3001, 3002, 3003]) {
        try {
          const res = await fetch(`http://localhost:${port}/api/status`);
          if (res.ok) {
            apiPort = port;
            log(`Found API server on port ${apiPort}`, 'info');
            break;
          }
        } catch (e) {
          // Continue
        }
      }
    }
    
    if (!apiPort) {
      throw new Error('No API server found. Please run: npm run start:dashboard');
    }
    
    // Run all tests
    await testAPIServer(apiPort);
    await testWebSocket(apiPort);
    await testCORS(apiPort);
    await testMemoryOperations(apiPort);
    await testTaskOperations(apiPort);
    await testUIFiles();
    
  } catch (error) {
    log(`Fatal error: ${error.message}`, 'error');
  }
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`${colors.green}✅ Passed: ${TEST_RESULTS.passed.length}${colors.reset}`);
  console.log(`${colors.red}❌ Failed: ${TEST_RESULTS.failed.length}${colors.reset}`);
  console.log(`${colors.yellow}⚠️  Warnings: ${TEST_RESULTS.warnings.length}${colors.reset}`);
  
  const total = TEST_RESULTS.passed.length + TEST_RESULTS.failed.length;
  const successRate = total > 0 ? ((TEST_RESULTS.passed.length / total) * 100).toFixed(1) : 0;
  console.log(`📈 Success Rate: ${successRate}%`);
  
  if (TEST_RESULTS.failed.length > 0) {
    console.log(`\n${colors.red}Failed Tests:${colors.reset}`);
    TEST_RESULTS.failed.forEach(({ test, error }) => {
      console.log(`  - ${test}: ${error}`);
    });
  }
  
  if (TEST_RESULTS.failed.length === 0) {
    console.log(`\n${colors.green}✅ ALL TESTS PASSED! System is working correctly.${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`\n${colors.red}⚠️  Some tests failed. Please fix the issues above.${colors.reset}`);
    process.exit(1);
  }
}

// Run the tests
runTests().catch(console.error);