#!/usr/bin/env node

/**
 * WebSocket Reconnection Test
 * Tests the auto-reconnection functionality when API server restarts
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔌 Testing WebSocket Auto-Reconnection...\n');

let serverProcess = null;

// Helper to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to check if port is in use
async function isPortInUse(port) {
  try {
    const response = await fetch(`http://localhost:${port}/api/status`);
    return response.ok;
  } catch {
    return false;
  }
}

// Find next available port
async function findAvailablePort(startPort = 3001) {
  for (let port = startPort; port < startPort + 100; port++) {
    if (!(await isPortInUse(port))) {
      return port;
    }
  }
  throw new Error('No available ports found');
}

// Start API server
function startServer(port) {
  return new Promise((resolve, reject) => {
    console.log(`Starting API server on port ${port}...`);
    
    const env = { ...process.env, PORT: port };
    serverProcess = spawn('node', ['dashboard-server-bridge.js'], {
      cwd: path.join(__dirname, '..'),
      env,
      stdio: 'pipe'
    });

    let started = false;
    
    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Dashboard Bridge Server running') && !started) {
        started = true;
        console.log(`✅ Server started on port ${port}`);
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error('Server error:', data.toString());
    });

    serverProcess.on('error', (error) => {
      reject(error);
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      if (!started) {
        reject(new Error('Server failed to start in 10 seconds'));
      }
    }, 10000);
  });
}

// Stop server
function stopServer() {
  return new Promise((resolve) => {
    if (serverProcess) {
      console.log('Stopping server...');
      serverProcess.on('close', () => {
        console.log('✅ Server stopped');
        serverProcess = null;
        resolve();
      });
      serverProcess.kill();
    } else {
      resolve();
    }
  });
}

// Test WebSocket reconnection
async function testReconnection() {
  let ws = null;
  let connectionCount = 0;
  let reconnectionDetected = false;

  try {
    // Start server on first port
    const port1 = await findAvailablePort(3001);
    await startServer(port1);
    await wait(2000);

    // Connect WebSocket
    console.log('\n📡 Connecting WebSocket...');
    const WebSocket = (await import('ws')).default;
    
    ws = new WebSocket(`ws://localhost:${port1}`);
    
    await new Promise((resolve, reject) => {
      ws.on('open', () => {
        connectionCount++;
        console.log(`✅ WebSocket connected (connection #${connectionCount})`);
        resolve();
      });
      ws.on('error', reject);
      setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
    });

    // Simulate server restart on different port
    console.log('\n🔄 Simulating server restart on different port...');
    await stopServer();
    await wait(2000);

    // Start on new port
    const port2 = await findAvailablePort(port1 + 1);
    await startServer(port2);

    // Wait for reconnection
    console.log('\n⏳ Waiting for auto-reconnection...');
    
    // Set up reconnection detection
    ws.on('open', () => {
      connectionCount++;
      console.log(`✅ WebSocket reconnected (connection #${connectionCount})`);
      reconnectionDetected = true;
    });

    // Wait up to 30 seconds for reconnection
    const maxWait = 30000;
    const startTime = Date.now();
    
    while (!reconnectionDetected && (Date.now() - startTime) < maxWait) {
      await wait(1000);
      
      // Check if the WebSocket hook would detect port change
      const portFileExists = await checkPortFile();
      if (portFileExists) {
        console.log('📄 Port file detected');
      }
    }

    if (reconnectionDetected) {
      console.log('\n✅ Auto-reconnection successful!');
      return true;
    } else {
      console.log('\n❌ Auto-reconnection failed - no reconnection detected');
      return false;
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    return false;
  } finally {
    if (ws) ws.close();
    await stopServer();
  }
}

// Check if port file is updated
async function checkPortFile() {
  const fs = await import('fs/promises');
  const portFilePath = path.join(__dirname, '..', '.dashboard-port');
  
  try {
    await fs.access(portFilePath);
    return true;
  } catch {
    return false;
  }
}

// Main test runner
async function runTest() {
  console.log('🚀 WebSocket Reconnection Test\n');
  console.log('This test will:');
  console.log('1. Start API server on one port');
  console.log('2. Connect WebSocket');
  console.log('3. Stop server and restart on different port');
  console.log('4. Verify WebSocket auto-reconnects\n');

  const success = await testReconnection();

  console.log('\n' + '═'.repeat(50));
  console.log('TEST RESULT:');
  console.log('═'.repeat(50));
  
  if (success) {
    console.log('\n✅ WebSocket auto-reconnection is working!\n');
    process.exit(0);
  } else {
    console.log('\n❌ WebSocket auto-reconnection needs fixing\n');
    process.exit(1);
  }
}

// Handle cleanup
process.on('SIGINT', async () => {
  console.log('\n\nCleaning up...');
  await stopServer();
  process.exit(0);
});

// Run test
runTest().catch(async (error) => {
  console.error('Test error:', error);
  await stopServer();
  process.exit(1);
});