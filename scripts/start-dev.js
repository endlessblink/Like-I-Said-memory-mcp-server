#!/usr/bin/env node
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Starting Like-I-Said Development Environment...\n');

// Clean up old port file
const portFile = path.join(process.cwd(), '.dashboard-port');
if (fs.existsSync(portFile)) {
  fs.unlinkSync(portFile);
  console.log('🧹 Cleaned old port file');
}

// Start API server first
console.log('📡 Starting API server...');
const api = spawn('npm', ['run', 'start:dashboard'], {
  stdio: 'pipe',
  shell: true
});

let apiStarted = false;

api.stdout.on('data', (data) => {
  process.stdout.write(`[API] ${data}`);
  
  // Check if API has started
  if (!apiStarted && data.toString().includes('Dashboard Bridge Server running on port')) {
    apiStarted = true;
    console.log('\n✅ API server started successfully!\n');
    
    // Wait a moment for port file to be written
    setTimeout(() => {
      // Now start the UI
      console.log('🎨 Starting UI server...\n');
      const ui = spawn('npm', ['run', 'dev'], {
        stdio: 'inherit',
        shell: true
      });
      
      ui.on('error', (err) => {
        console.error('Failed to start UI:', err);
        process.exit(1);
      });
    }, 1000);
  }
});

api.stderr.on('data', (data) => {
  process.stderr.write(`[API ERROR] ${data}`);
});

api.on('error', (err) => {
  console.error('Failed to start API:', err);
  process.exit(1);
});

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  process.exit(0);
});