#!/usr/bin/env node

/**
 * Comprehensive test suite for all Express server startup scenarios
 * Based on research of common issues and real-world problems
 */

import express from 'express';
import http from 'http';
import fetch from 'node-fetch';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import net from 'net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Color codes for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Test Case 1: Friend's scenario - port 3001 is free, server starts but routes return 404
async function testFriendsScenario() {
  log('\n🧪 TEST 1: Friend\'s Scenario (Port 3001 free, routes not ready)', 'blue');
  
  const app = express();
  const server = http.createServer(app);
  
  // Simulate delayed route registration (what might happen in real scenario)
  setTimeout(() => {
    app.get('/api/status', (req, res) => {
      res.json({ status: 'ok', server: 'Test Server' });
    });
  }, 50); // Routes registered 50ms after server starts
  
  return new Promise((resolve) => {
    // Use a random port to avoid conflicts
    server.listen(0, async () => {
      const port = server.address().port;
      log(`  Server started on port ${port}`, 'yellow');
      
      // Test immediately (simulating the old validation)
      try {
        const response = await fetch(`http://localhost:${port}/api/status`);
        log(`  Immediate check: ${response.status} ${response.statusText}`, 
            response.status === 404 ? 'red' : 'green');
      } catch (error) {
        log(`  Immediate check failed: ${error.message}`, 'red');
      }
      
      // Test after 500ms (our fix)
      await new Promise(r => setTimeout(r, 500));
      try {
        const response = await fetch(`http://localhost:${port}/api/status`);
        log(`  After 500ms delay: ${response.status} ${response.statusText}`, 
            response.status === 200 ? 'green' : 'red');
      } catch (error) {
        log(`  After 500ms failed: ${error.message}`, 'red');
      }
      
      server.close();
      resolve();
    });
  });
}

// Test Case 2: Port 0 issue - server gets random port but validation uses 0
async function testPort0Issue() {
  log('\n🧪 TEST 2: Port 0 Issue (Random port assignment)', 'blue');
  
  const app = express();
  const server = http.createServer(app);
  
  app.get('/api/status', (req, res) => {
    res.json({ status: 'ok' });
  });
  
  return new Promise((resolve) => {
    server.listen(0, async () => {
      const requestedPort = 0;
      const actualPort = server.address().port;
      
      log(`  Requested port: ${requestedPort}`, 'yellow');
      log(`  Actual port: ${actualPort}`, 'yellow');
      
      // Test with requested port (wrong)
      try {
        const response = await fetch(`http://localhost:${requestedPort}/api/status`);
        log(`  Using port ${requestedPort}: ${response.status}`, 'red');
      } catch (error) {
        log(`  Using port ${requestedPort}: ${error.message}`, 'red');
      }
      
      // Test with actual port (correct)
      try {
        const response = await fetch(`http://localhost:${actualPort}/api/status`);
        log(`  Using port ${actualPort}: ${response.status} ${response.statusText}`, 'green');
      } catch (error) {
        log(`  Using port ${actualPort}: ${error.message}`, 'red');
      }
      
      server.close();
      resolve();
    });
  });
}

// Test Case 3: Race condition with middleware initialization
async function testMiddlewareRaceCondition() {
  log('\n🧪 TEST 3: Middleware Race Condition', 'blue');
  
  const app = express();
  const server = http.createServer(app);
  
  // Simulate async middleware setup
  setTimeout(() => {
    app.use((req, res, next) => {
      req.customData = 'initialized';
      next();
    });
    
    app.get('/api/status', (req, res) => {
      res.json({ 
        status: 'ok',
        customData: req.customData || 'not initialized'
      });
    });
  }, 100);
  
  return new Promise((resolve) => {
    server.listen(0, async () => {
      const port = server.address().port;
      log(`  Server on port ${port}`, 'yellow');
      
      // Test immediately
      try {
        const response = await fetch(`http://localhost:${port}/api/status`);
        const data = response.status === 200 ? await response.json() : null;
        log(`  Immediate: ${response.status}, data: ${data?.customData || 'N/A'}`, 
            data?.customData === 'not initialized' ? 'yellow' : 'red');
      } catch (error) {
        log(`  Immediate: ${error.message}`, 'red');
      }
      
      // Test after delay
      await new Promise(r => setTimeout(r, 200));
      try {
        const response = await fetch(`http://localhost:${port}/api/status`);
        const data = await response.json();
        log(`  After 200ms: ${response.status}, data: ${data.customData}`, 
            data.customData === 'initialized' ? 'green' : 'red');
      } catch (error) {
        log(`  After 200ms: ${error.message}`, 'red');
      }
      
      server.close();
      resolve();
    });
  });
}

// Test Case 4: Static file handler interfering with API routes
async function testStaticFileInterference() {
  log('\n🧪 TEST 4: Static File Handler Interference', 'blue');
  
  const app = express();
  const server = http.createServer(app);
  
  // Wrong order: static before API routes
  const wrongApp = express();
  wrongApp.use(express.static('.'));
  wrongApp.get('/api/status', (req, res) => res.json({ status: 'ok' }));
  
  // Correct order: API routes before static
  const correctApp = express();
  correctApp.get('/api/status', (req, res) => res.json({ status: 'ok' }));
  correctApp.use(express.static('.'));
  
  // Test wrong order
  const wrongServer = http.createServer(wrongApp);
  await new Promise((resolve) => {
    wrongServer.listen(0, async () => {
      const port = wrongServer.address().port;
      log('  Testing wrong order (static first):', 'yellow');
      
      try {
        const response = await fetch(`http://localhost:${port}/api/status`);
        log(`    /api/status: ${response.status}`, response.status === 200 ? 'green' : 'red');
      } catch (error) {
        log(`    Error: ${error.message}`, 'red');
      }
      
      wrongServer.close();
      resolve();
    });
  });
  
  // Test correct order
  const correctServer = http.createServer(correctApp);
  await new Promise((resolve) => {
    correctServer.listen(0, async () => {
      const port = correctServer.address().port;
      log('  Testing correct order (API routes first):', 'yellow');
      
      try {
        const response = await fetch(`http://localhost:${port}/api/status`);
        log(`    /api/status: ${response.status}`, response.status === 200 ? 'green' : 'red');
      } catch (error) {
        log(`    Error: ${error.message}`, 'red');
      }
      
      correctServer.close();
      resolve();
    });
  });
}

// Test Case 5: Multiple server.listen calls
async function testMultipleListenCalls() {
  log('\n🧪 TEST 5: Multiple server.listen() Calls', 'blue');
  
  const app = express();
  const server = http.createServer(app);
  
  app.get('/api/status', (req, res) => res.json({ status: 'ok' }));
  
  return new Promise((resolve) => {
    // First listen
    server.listen(0, () => {
      const port1 = server.address().port;
      log(`  First listen: port ${port1}`, 'green');
      
      // Try to listen again (should fail)
      try {
        server.listen(0, () => {
          log('  Second listen succeeded (unexpected!)', 'red');
        });
      } catch (error) {
        log(`  Second listen failed as expected: ${error.message}`, 'green');
      }
      
      server.close();
      resolve();
    });
  });
}

// Test the actual dashboard server with current fixes
async function testCurrentDashboardServer() {
  log('\n🧪 TEST 6: Current Dashboard Server (with all fixes)', 'blue');
  
  // Kill any existing servers on test ports
  const testPorts = [3001, 3002, 3003];
  for (const port of testPorts) {
    try {
      await new Promise((resolve, reject) => {
        const client = net.connect(port, '127.0.0.1', () => {
          client.end();
          log(`  Port ${port} is in use, skipping...`, 'yellow');
          resolve();
        });
        client.on('error', () => {
          log(`  Port ${port} is free`, 'green');
          resolve();
        });
      });
    } catch (e) {
      // Port is free
    }
  }
  
  // Start the actual server
  const serverProcess = spawn('node', ['dashboard-server-bridge.js'], {
    cwd: __dirname,
    env: { ...process.env, NODE_ENV: 'test' }
  });
  
  let output = '';
  serverProcess.stdout.on('data', (data) => {
    output += data.toString();
  });
  
  serverProcess.stderr.on('data', (data) => {
    output += data.toString();
  });
  
  // Wait for server to start
  await new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      if (output.includes('Server startup validated successfully')) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 100);
    
    // Timeout after 30 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      resolve();
    }, 30000);
  });
  
  // Extract port from output
  const portMatch = output.match(/Server startup validated successfully on port (\d+)/);
  if (portMatch) {
    const port = parseInt(portMatch[1]);
    log(`  Server started successfully on port ${port}`, 'green');
    
    // Test endpoints
    const endpoints = ['/test', '/api/health', '/api/status', '/api-port'];
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`http://localhost:${port}${endpoint}`);
        log(`  ${endpoint}: ${response.status} ${response.statusText}`, 
            response.status === 200 ? 'green' : 'red');
      } catch (error) {
        log(`  ${endpoint}: ${error.message}`, 'red');
      }
    }
  } else {
    log('  Server failed to start or validate', 'red');
    log('  Output:', 'yellow');
    console.log(output);
  }
  
  // Cleanup
  serverProcess.kill();
  
  // Clean up port file
  const portFile = path.join(__dirname, '.dashboard-port');
  if (fs.existsSync(portFile)) {
    fs.unlinkSync(portFile);
  }
}

// Run all tests
async function runAllTests() {
  log('🚀 Running Comprehensive Server Startup Tests', 'blue');
  log('============================================\n', 'blue');
  
  try {
    await testFriendsScenario();
    await testPort0Issue();
    await testMiddlewareRaceCondition();
    await testStaticFileInterference();
    await testMultipleListenCalls();
    await testCurrentDashboardServer();
    
    log('\n✅ All tests completed!', 'green');
  } catch (error) {
    log(`\n❌ Test suite failed: ${error.message}`, 'red');
    console.error(error);
  }
}

// Run the tests
runAllTests();