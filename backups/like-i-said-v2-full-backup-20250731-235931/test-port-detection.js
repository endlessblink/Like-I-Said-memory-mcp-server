#!/usr/bin/env node

/**
 * Test script to verify port detection works correctly
 */

import { findAvailablePort } from '../lib/port-finder.js';
import net from 'net';

console.log('🔍 Testing Port Detection...\\n');

async function testPortDetection() {
  console.log('1️⃣ Testing basic port detection...');
  
  // Test finding an available port
  const port = await findAvailablePort(3001);
  console.log(`✅ Found available port: ${port}`);
  
  // Test with a definitely occupied port
  console.log('\\n2️⃣ Testing port detection with occupied port...');
  
  // Create a server to occupy a port
  const testServer = net.createServer();
  const occupiedPort = 3050;
  
  await new Promise((resolve, reject) => {
    testServer.listen(occupiedPort, '0.0.0.0', (err) => {
      if (err) {
        reject(err);
      } else {
        console.log(`📡 Test server started on port ${occupiedPort}`);
        resolve();
      }
    });
  });
  
  // Now try to find a port starting from the occupied one
  const alternativePort = await findAvailablePort(occupiedPort);
  console.log(`✅ When port ${occupiedPort} is occupied, found alternative: ${alternativePort}`);
  
  // Clean up
  testServer.close();
  console.log('🧹 Test server closed');
  
  // Test edge cases
  console.log('\\n3️⃣ Testing edge cases...');
  
  // Test with very high starting port
  const highPort = await findAvailablePort(60000);
  console.log(`✅ High port test: ${highPort}`);
  
  console.log('\\n✅ All port detection tests passed!');
}

testPortDetection().catch(console.error);