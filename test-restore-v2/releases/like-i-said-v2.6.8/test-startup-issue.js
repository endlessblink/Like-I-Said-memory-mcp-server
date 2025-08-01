#!/usr/bin/env node

/**
 * Test script to simulate the startup validation issue
 * This reproduces the exact timing that causes 404 errors
 */

import express from 'express';
import http from 'http';
import fetch from 'node-fetch';

console.log('🧪 Testing server startup validation issue\n');

// Simulate the dashboard server setup
function createTestServer() {
  const app = express();
  const server = http.createServer(app);
  
  console.log('📋 Setting up routes...');
  
  // Add routes exactly like dashboard-server-bridge.js
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });
  
  app.get('/api/status', (req, res) => {
    res.json({ 
      status: 'ok',
      server: 'Test Server'
    });
  });
  
  app.get('/test', (req, res) => {
    res.send('OK');
  });
  
  return { app, server };
}

// Test different timing scenarios
async function testScenario(name, delayMs) {
  console.log(`\n📍 Testing: ${name}`);
  console.log(`   Delay: ${delayMs}ms`);
  
  const { app, server } = createTestServer();
  
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', async () => {
      const port = server.address().port;
      console.log(`   Server listening on port ${port}`);
      
      // Wait the specified delay
      if (delayMs > 0) {
        console.log(`   Waiting ${delayMs}ms...`);
        await new Promise(r => setTimeout(r, delayMs));
      }
      
      // Test each endpoint
      const endpoints = ['/test', '/api/health', '/api/status'];
      const results = [];
      
      for (const endpoint of endpoints) {
        try {
          const url = `http://127.0.0.1:${port}${endpoint}`;
          const response = await fetch(url, { 
            timeout: 1000,
            headers: { 'Accept': 'application/json' }
          });
          console.log(`   ${endpoint}: ${response.status} ${response.statusText}`);
          results.push({ endpoint, status: response.status });
        } catch (error) {
          console.log(`   ${endpoint}: ERROR - ${error.message}`);
          results.push({ endpoint, error: error.message });
        }
      }
      
      server.close();
      resolve(results);
    });
  });
}

// Test with middleware that delays route registration
async function testDelayedRoutes() {
  console.log(`\n📍 Testing: Delayed Route Registration`);
  
  const app = express();
  const server = http.createServer(app);
  
  // Add a middleware that delays everything
  app.use((req, res, next) => {
    setTimeout(next, 50);
  });
  
  // Add routes after a delay (simulating async setup)
  setTimeout(() => {
    console.log('   Adding routes after 100ms delay...');
    app.get('/api/status', (req, res) => {
      res.json({ status: 'ok' });
    });
  }, 100);
  
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', async () => {
      const port = server.address().port;
      console.log(`   Server listening on port ${port}`);
      
      // Test at different times
      const timings = [0, 50, 150, 200];
      
      for (const delay of timings) {
        await new Promise(r => setTimeout(r, delay));
        try {
          const response = await fetch(`http://127.0.0.1:${port}/api/status`);
          console.log(`   After ${delay}ms: ${response.status}`);
        } catch (error) {
          console.log(`   After ${delay}ms: ERROR - ${error.message}`);
        }
      }
      
      server.close();
      resolve();
    });
  });
}

// Test with actual dashboard server
async function testActualServer() {
  console.log(`\n📍 Testing: Actual Dashboard Server`);
  
  try {
    // Import the actual dashboard server
    const { default: DashboardBridge } = await import('./dashboard-server-bridge.js');
    
    // Create instance
    const bridge = new DashboardBridge(0); // Use random port
    
    // Start it
    await bridge.start();
    
    console.log('   ✅ Server started successfully');
    
    // Cleanup
    if (bridge.server) {
      bridge.server.close();
    }
  } catch (error) {
    console.log(`   ❌ Server failed to start: ${error.message}`);
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting server startup tests...\n');
  
  // Test different delay scenarios
  await testScenario('No delay', 0);
  await testScenario('100ms delay', 100);
  await testScenario('500ms delay', 500);
  
  // Test delayed route registration
  await testDelayedRoutes();
  
  // Test actual server
  await testActualServer();
  
  console.log('\n✅ Tests complete!');
}

// Run the tests
runTests().catch(console.error);