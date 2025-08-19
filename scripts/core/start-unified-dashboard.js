#!/usr/bin/env node

import { spawn, execSync } from 'child_process';
import { createServer } from 'net';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('\n🚀 Starting Like-I-Said Unified Dashboard...\n');

// Function to check if port is available
async function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(false);
      }
    });
    
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    
    server.listen(port, '0.0.0.0');
  });
}

// Function to find available port
async function findAvailablePort(startPort = 3005) {
  let port = startPort;
  const maxAttempts = 20;
  
  for (let i = 0; i < maxAttempts; i++) {
    if (await isPortAvailable(port)) {
      return port;
    }
    console.log(`Port ${port} is busy, trying ${port + 1}...`);
    port++;
  }
  
  throw new Error('Could not find an available port');
}

// Kill any existing processes
async function killExistingProcesses() {
  console.log('Cleaning up existing processes...');
  
  try {
    // Try to kill processes on different platforms
    if (process.platform === 'win32') {
      // Windows
      try {
        execSync('taskkill /F /IM node.exe /FI "WINDOWTITLE eq *vite*"', { stdio: 'ignore' });
        execSync('taskkill /F /IM node.exe /FI "WINDOWTITLE eq *dashboard*"', { stdio: 'ignore' });
      } catch {}
    } else {
      // Unix-like systems
      const killCommands = [
        'pkill -f "vite"',
        'pkill -f "dashboard-server-bridge"',
        'pkill -f "node.*3001"',
        'pkill -f "node.*3002"',
        'pkill -f "node.*5173"',
        'pkill -f "node.*4173"'
      ];
      
      for (const cmd of killCommands) {
        try {
          execSync(cmd, { stdio: 'ignore' });
        } catch {
          // Ignore errors
        }
      }
    }
    
    // Wait a moment for processes to die
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch {
    // Ignore errors
  }
}

// Check if dist directory exists
function checkDistDirectory() {
  const distPath = path.join(__dirname, '..', '..', 'dist');
  const distIndexPath = path.join(distPath, 'index.html');
  
  if (!fs.existsSync(distPath) || !fs.existsSync(distIndexPath)) {
    console.log('\n⚠️  No production build found. Building now...\n');
    return false;
  }
  
  // Check if build is recent (within last hour)
  const stats = fs.statSync(distIndexPath);
  const hourAgo = Date.now() - (60 * 60 * 1000);
  
  if (stats.mtimeMs < hourAgo) {
    console.log('\n⚠️  Build is more than an hour old. Rebuilding...\n');
    return false;
  }
  
  return true;
}

// Build the React app
async function buildReactApp() {
  return new Promise((resolve, reject) => {
    console.log('📦 Building React dashboard...\n');
    
    const build = spawn('npm', ['run', 'build'], {
      stdio: 'inherit',
      shell: true,
      cwd: path.join(__dirname, '..')
    });
    
    build.on('close', (code) => {
      if (code !== 0) {
        reject(new Error('Build failed'));
      } else {
        console.log('\n✅ Build completed successfully!\n');
        resolve();
      }
    });
  });
}

// Start the unified server
async function startUnifiedServer(port) {
  console.log(`\n🌐 Starting unified server on port ${port}...\n`);
  
  // Set the port environment variable - dashboard-server-bridge.js uses PORT
  process.env.PORT = port.toString();
  
  const server = spawn('node', ['dashboard-server-bridge.js'], {
    stdio: 'inherit',
    env: { ...process.env, PORT: port.toString() },
    cwd: path.join(__dirname, '..', '..')
  });
  
  server.on('error', (err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
  
  // Wait a moment for server to start
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log(`
✨ Dashboard is ready! ✨

🌐 Access your dashboard at: http://localhost:${port}
📡 API endpoints at: http://localhost:${port}/api
🔌 WebSocket at: ws://localhost:${port}

Press Ctrl+C to stop the server
`);
}

// Main function
async function main() {
  try {
    // Step 1: Kill existing processes
    await killExistingProcesses();
    
    // Step 2: Check and build if necessary
    if (!checkDistDirectory()) {
      await buildReactApp();
    } else {
      console.log('✅ Using existing production build\n');
    }
    
    // Step 3: Find available port (skip common ports like 3001 for Flowise)
    const port = await findAvailablePort(3005);
    console.log(`✅ Found available port: ${port}`);
    
    // Step 4: Start unified server
    await startUnifiedServer(port);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down gracefully...');
  process.exit(0);
});

// Run the main function
main().catch(console.error);