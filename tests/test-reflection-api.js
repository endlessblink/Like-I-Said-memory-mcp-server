#!/usr/bin/env node

/**
 * Test Reflection API Endpoints
 * Tests all the new reflection/self-improvement API endpoints
 */

import fetch from 'node-fetch';
import { spawn } from 'child_process';

const BASE_URL = 'http://localhost:8776';
const API_BASE = `${BASE_URL}/api`;

// Test results tracking
let passedTests = 0;
let failedTests = 0;
const testResults = [];

// Helper function to make API requests
async function testEndpoint(method, path, body = null, description = '') {
  const url = `${API_BASE}${path}`;
  console.log(`\n🧪 Testing: ${method} ${path}`);
  if (description) console.log(`   ${description}`);
  
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`   ✅ Success (${response.status})`);
      console.log(`   Response keys: ${Object.keys(data).join(', ')}`);
      passedTests++;
      testResults.push({ endpoint: path, status: 'PASSED', method });
      return data;
    } else {
      console.log(`   ❌ Failed (${response.status}): ${data.error || 'Unknown error'}`);
      failedTests++;
      testResults.push({ endpoint: path, status: 'FAILED', method, error: data.error });
      return null;
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    failedTests++;
    testResults.push({ endpoint: path, status: 'ERROR', method, error: error.message });
    return null;
  }
}

// Wait for server to be ready
async function waitForServer(maxAttempts = 30) {
  console.log('⏳ Waiting for server to be ready...');
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`${API_BASE}/health`);
      if (response.ok) {
        console.log('✅ Server is ready!\n');
        return true;
      }
    } catch (error) {
      // Server not ready yet
    }
    process.stdout.write('.');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  console.log('\n❌ Server did not start in time');
  return false;
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Reflection API Tests');
  console.log('='*50);
  
  // Start the dashboard server
  console.log('\n📡 Starting dashboard server...');
  const serverProcess = spawn('node', ['dashboard-server-bridge.js'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: '8776' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  // Capture server output
  serverProcess.stdout.on('data', (data) => {
    // Suppress server output during tests
  });
  
  serverProcess.stderr.on('data', (data) => {
    // Log errors
    if (data.toString().includes('Error')) {
      console.error('Server error:', data.toString());
    }
  });
  
  // Wait for server to start
  const serverReady = await waitForServer();
  if (!serverReady) {
    serverProcess.kill();
    process.exit(1);
  }
  
  console.log('📊 Testing Reflection API Endpoints\n');
  console.log('='*50);
  
  // Test GET endpoints
  console.log('\n📥 Testing GET Endpoints:');
  
  await testEndpoint('GET', '/reflection/metrics', null, 
    'Get current performance metrics');
  
  await testEndpoint('GET', '/reflection/report?period=weekly', null,
    'Get weekly performance report');
  
  await testEndpoint('GET', '/reflection/report?period=daily', null,
    'Get daily performance report');
  
  await testEndpoint('GET', '/reflection/data', null,
    'Get reflection data (patterns, thresholds, confidence)');
  
  await testEndpoint('GET', '/reflection/status', null,
    'Get system status');
  
  await testEndpoint('GET', '/reflection/settings', null,
    'Get reflection settings');
  
  await testEndpoint('GET', '/reflection/patterns', null,
    'Get all learned patterns');
  
  await testEndpoint('GET', '/reflection/backups', null,
    'Get available backups');
  
  // Test POST endpoints
  console.log('\n📤 Testing POST Endpoints:');
  
  const newPattern = await testEndpoint('POST', '/reflection/patterns', {
    type: 'work_detection',
    description: 'Test pattern for API testing',
    indicators: ['test', 'api', 'endpoint'],
    confidence: 0.75
  }, 'Create a new pattern');
  
  await testEndpoint('POST', '/reflection/feedback', {
    patternId: 'test-pattern-1',
    feedback: 'positive'
  }, 'Provide positive feedback on a pattern');
  
  await testEndpoint('POST', '/reflection/backups', null,
    'Create a new backup');
  
  await testEndpoint('POST', '/reflection/rollback', {
    backupTimestamp: new Date().toISOString()
  }, 'Rollback to a backup (mock)');
  
  await testEndpoint('POST', '/reflection/reset', null,
    'Reset to defaults (mock)');
  
  // Test PUT endpoints
  console.log('\n📝 Testing PUT Endpoints:');
  
  await testEndpoint('PUT', '/reflection/settings', {
    reflectionEnabled: true,
    autoThresholdAdjustment: false,
    sandboxMode: true,
    learningRate: 0.15,
    confidenceThreshold: 0.7
  }, 'Update reflection settings');
  
  await testEndpoint('PUT', '/reflection/thresholds', {
    problemSolving: 2.5,
    implementation: 1.8
  }, 'Update pattern thresholds');
  
  // Test DELETE endpoints
  console.log('\n🗑️ Testing DELETE Endpoints:');
  
  if (newPattern && newPattern.id) {
    await testEndpoint('DELETE', `/reflection/patterns/${newPattern.id}`, null,
      'Delete a pattern');
  } else {
    await testEndpoint('DELETE', '/reflection/patterns/test-pattern-123', null,
      'Delete a pattern (mock ID)');
  }
  
  // Test export endpoint
  console.log('\n💾 Testing Export Endpoint:');
  
  const exportData = await testEndpoint('GET', '/reflection/export', null,
    'Export all reflection data');
  
  // Print summary
  console.log('\n' + '='*50);
  console.log('📊 Test Summary:\n');
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📈 Success Rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);
  
  console.log('\n📋 Detailed Results:');
  console.log('─'.repeat(60));
  testResults.forEach(result => {
    const status = result.status === 'PASSED' ? '✅' : '❌';
    const method = result.method.padEnd(6);
    const endpoint = result.endpoint.padEnd(35);
    console.log(`${status} ${method} ${endpoint} ${result.status}`);
    if (result.error) {
      console.log(`         Error: ${result.error}`);
    }
  });
  
  // Cleanup
  console.log('\n🧹 Cleaning up...');
  serverProcess.kill();
  
  // Exit with appropriate code
  process.exit(failedTests > 0 ? 1 : 0);
}

// Run the tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});