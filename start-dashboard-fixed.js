#!/usr/bin/env node

import { spawn } from 'child_process';
import { createServer } from 'net';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('\n🚀 Starting Like-I-Said Dashboard (Fixed Version)...\n');

// Function to check if port is available
async function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = createServer();
    
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    
    // Bind to 127.0.0.1 for testing
    server.listen(port, '127.0.0.1');
  });
}

// Find available port
async function findAvailablePort(startPort = 3010) {
  let port = startPort;
  
  for (let i = 0; i < 10; i++) {
    if (await isPortAvailable(port)) {
      return port;
    }
    console.log(`Port ${port} is busy, trying ${port + 1}...`);
    port++;
  }
  
  throw new Error('Could not find an available port');
}

// Main function
async function main() {
  try {
    // Check if dist exists
    const distPath = path.join(__dirname, 'dist', 'index.html');
    if (!fs.existsSync(distPath)) {
      console.error('❌ No build found! Run: npm run build');
      process.exit(1);
    }
    
    // Find available port
    const port = await findAvailablePort(3010);
    console.log(`✅ Found available port: ${port}`);
    
    // Set environment variables
    process.env.PORT = port.toString();
    process.env.HOST = '127.0.0.1';
    process.env.NODE_ENV = 'production';
    
    console.log(`\n🌐 Starting server on http://127.0.0.1:${port}\n`);
    
    // Start the dashboard server
    const server = spawn('node', ['dashboard-server-bridge.js'], {
      stdio: 'inherit',
      env: process.env,
      cwd: __dirname
    });
    
    server.on('error', (err) => {
      console.error('Failed to start server:', err);
      process.exit(1);
    });
    
    // Give it time to start
    setTimeout(() => {
      console.log(`
✨ Dashboard should be ready! ✨

🌐 Try these URLs:
   - http://127.0.0.1:${port}
   - http://localhost:${port}
   
If using WSL2, also try:
   - http://172.29.98.150:${port}

Press Ctrl+C to stop the server
`);
    }, 3000);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down...');
  process.exit(0);
});

main().catch(console.error);