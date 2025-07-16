#!/usr/bin/env node

/**
 * API Integration Tests
 * Tests all critical API endpoints and data loading functionality
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Running API Integration Tests...\n');

let testsPassed = 0;
let testsFailed = 0;

// Helper to make API calls
async function testApiEndpoint(name, url, expectedStatus = 200) {
  try {
    const apiUrl = `http://localhost:3001${url}`;
    console.log(`Testing ${name}: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.status === expectedStatus) {
      console.log(`✅ ${name} - Status: ${response.status}`);
      
      // Try to parse JSON response
      try {
        const data = await response.json();
        console.log(`   Response type: ${Array.isArray(data) ? 'Array' : typeof data}`);
        if (data.data) {
          console.log(`   Paginated response with ${data.data.length} items`);
        } else if (Array.isArray(data)) {
          console.log(`   Array response with ${data.length} items`);
        }
      } catch (e) {
        console.log(`   Non-JSON response`);
      }
      
      testsPassed++;
      return true;
    } else {
      console.error(`❌ ${name} - Expected ${expectedStatus}, got ${response.status}`);
      testsFailed++;
      return false;
    }
  } catch (error) {
    console.error(`❌ ${name} - Error: ${error.message}`);
    testsFailed++;
    return false;
  }
}

// Test WebSocket connection
async function testWebSocket() {
  return new Promise((resolve) => {
    try {
      const WebSocket = (await import('ws')).default;
      const ws = new WebSocket('ws://localhost:3001');
      
      const timeout = setTimeout(() => {
        console.error('❌ WebSocket Connection - Timeout');
        testsFailed++;
        ws.close();
        resolve(false);
      }, 5000);

      ws.on('open', () => {
        console.log('✅ WebSocket Connection - Connected');
        testsPassed++;
        clearTimeout(timeout);
        ws.close();
        resolve(true);
      });

      ws.on('error', (error) => {
        console.error(`❌ WebSocket Connection - Error: ${error.message}`);
        testsFailed++;
        clearTimeout(timeout);
        resolve(false);
      });
    } catch (error) {
      console.error(`❌ WebSocket Connection - Error: ${error.message}`);
      testsFailed++;
      resolve(false);
    }
  });
}

// Test data loading endpoints
async function testDataLoading() {
  console.log('\n📊 Testing Data Loading Endpoints...\n');

  // Test memory endpoints
  await testApiEndpoint('Memories List', '/api/memories');
  await testApiEndpoint('Memories Paginated', '/api/memories?page=1&limit=10');
  
  // Test task endpoints
  await testApiEndpoint('Tasks List', '/api/tasks');
  await testApiEndpoint('Tasks Paginated', '/api/tasks?page=1&limit=10');
  
  // Test path endpoints
  await testApiEndpoint('Current Paths', '/api/paths');
  
  // Test status endpoint
  await testApiEndpoint('API Status', '/api/status');
  
  // Test WebSocket
  await testWebSocket();
}

// Test CORS headers
async function testCorsHeaders() {
  console.log('\n🔒 Testing CORS Configuration...\n');
  
  try {
    const response = await fetch('http://localhost:3001/api/status', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:5173',
        'Access-Control-Request-Method': 'GET',
      },
    });

    const corsHeaders = {
      'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
      'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
      'access-control-allow-headers': response.headers.get('access-control-allow-headers'),
    };

    if (corsHeaders['access-control-allow-origin'] === 'http://localhost:5173') {
      console.log('✅ CORS Headers - Properly configured');
      testsPassed++;
    } else {
      console.error('❌ CORS Headers - Misconfigured');
      console.error('   Headers:', corsHeaders);
      testsFailed++;
    }
  } catch (error) {
    console.error(`❌ CORS Headers - Error: ${error.message}`);
    testsFailed++;
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting API Integration Tests...');
  console.log('   Make sure the API server is running on port 3001\n');

  const timeout = setTimeout(() => {
    console.error('\n❌ Test timeout after 60 seconds');
    process.exit(1);
  }, 60000);

  try {
    // Check if server is running
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('http://localhost:3001/api/status', {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error('Server not responding');
      }
    } catch (error) {
      console.error('❌ API server is not running on port 3001');
      console.error('   Run "npm run start:dashboard" first\n');
      console.error('   Error:', error.message);
      clearTimeout(timeout);
      process.exit(1);
    }

    // Run all tests
    await testDataLoading();
    await testCorsHeaders();

    clearTimeout(timeout);

    // Summary
    console.log('\n' + '═'.repeat(50));
    console.log('TEST SUMMARY:');
    console.log('═'.repeat(50));
    console.log(`✅ Passed: ${testsPassed}`);
    console.log(`❌ Failed: ${testsFailed}`);
    console.log(`📊 Total: ${testsPassed + testsFailed}`);
    
    if (testsFailed > 0) {
      console.log('\n❌ Some tests failed. Fix the issues above.\n');
      process.exit(1);
    } else {
      console.log('\n✅ All API integration tests passed!\n');
      process.exit(0);
    }
  } catch (error) {
    clearTimeout(timeout);
    console.error('\n❌ Test runner error:', error.message);
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});