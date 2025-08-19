#!/usr/bin/env node

/**
 * Test Dashboard Startup
 * 
 * Verifies that the dashboard can start successfully even without @xenova/transformers
 */

import { spawn } from 'child_process';
import fetch from 'node-fetch';

console.log('🚀 Testing Dashboard Startup...\n');

async function waitForServer(url, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return true;
      }
    } catch (error) {
      // Server not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return false;
}

async function testDashboardStartup() {
  console.log('Starting dashboard server...');
  
  // Start the dashboard server
  const dashboardProcess = spawn('node', ['dashboard-server-bridge.js'], {
    cwd: process.cwd(),
    env: { ...process.env, DEBUG_MCP: 'true' },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let outputBuffer = '';
  let errorBuffer = '';

  dashboardProcess.stdout.on('data', (data) => {
    outputBuffer += data.toString();
    process.stdout.write(data);
  });

  dashboardProcess.stderr.on('data', (data) => {
    errorBuffer += data.toString();
    process.stderr.write(data);
  });

  try {
    console.log('Waiting for server to start...');
    const serverReady = await waitForServer('http://127.0.0.1:3001/api/status');
    
    if (!serverReady) {
      throw new Error('Server failed to start within 30 seconds');
    }

    console.log('\n✅ Server started successfully!');

    // Test API endpoints
    console.log('\nTesting API endpoints...');
    
    const tests = [
      { url: 'http://127.0.0.1:3001/api/status', name: 'Status endpoint' },
      { url: 'http://127.0.0.1:3001/api/memories', name: 'Memories endpoint' },
      { url: 'http://127.0.0.1:3001/api/tasks', name: 'Tasks endpoint' },
      { url: 'http://127.0.0.1:3001/api/settings', name: 'Settings endpoint' }
    ];

    for (const test of tests) {
      try {
        const response = await fetch(test.url);
        console.log(`${test.name}: ${response.status} ${response.statusText}`);
        
        if (!response.ok && response.status !== 401) {
          console.error(`❌ ${test.name} failed with status ${response.status}`);
        } else {
          console.log(`✅ ${test.name} working`);
        }
      } catch (error) {
        console.error(`❌ ${test.name} failed:`, error.message);
      }
    }

    // Check for xenova/transformers errors in output
    const hasXenovaError = errorBuffer.includes('ERR_MODULE_NOT_FOUND') && 
                          errorBuffer.includes('@xenova/transformers');
    
    if (hasXenovaError) {
      console.error('\n❌ Found @xenova/transformers import error in server output');
      console.error('The server should handle missing optional dependencies gracefully');
      return false;
    }

    // Check that vector storage initialized properly
    const vectorStorageInitialized = errorBuffer.includes('[VectorStorage]');
    if (vectorStorageInitialized) {
      console.log('\n✅ VectorStorage handled missing dependency gracefully');
    }

    return true;

  } finally {
    // Clean up: kill the server process
    console.log('\nStopping server...');
    dashboardProcess.kill('SIGTERM');
    
    // Give it time to shut down gracefully
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Force kill if still running
    try {
      dashboardProcess.kill('SIGKILL');
    } catch (e) {
      // Process already exited
    }
  }
}

// Run the test
testDashboardStartup()
  .then(success => {
    if (success) {
      console.log('\n✅ Dashboard startup test passed!');
      process.exit(0);
    } else {
      console.log('\n❌ Dashboard startup test failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n❌ Test failed with error:', error);
    process.exit(1);
  });