#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import process from 'process';

const execAsync = promisify(exec);

const PORTS = {
  API: 3001,
  UI: 5173
};

async function killProcessOnPort(port) {
  const platform = process.platform;
  
  try {
    if (platform === 'win32') {
      // Windows: Find and kill process
      const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
      const lines = stdout.trim().split('\n');
      const pids = new Set();
      
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0') {
          pids.add(pid);
        }
      }
      
      for (const pid of pids) {
        try {
          await execAsync(`taskkill /PID ${pid} /F`);
          console.log(`✅ Killed process ${pid} on port ${port}`);
        } catch (e) {
          // Process might already be dead
        }
      }
    } else {
      // Unix/Mac: Find and kill process
      const { stdout } = await execAsync(`lsof -ti :${port}`);
      const pids = stdout.trim().split('\n').filter(Boolean);
      
      for (const pid of pids) {
        try {
          await execAsync(`kill -9 ${pid}`);
          console.log(`✅ Killed process ${pid} on port ${port}`);
        } catch (e) {
          // Process might already be dead
        }
      }
    }
  } catch (error) {
    // No process found on port, which is fine
    if (!error.message.includes('No such process') && !error.message.includes('not found')) {
      console.log(`ℹ️  No process found on port ${port}`);
    }
  }
}

async function cleanupPorts() {
  console.log('🧹 Cleaning up ports...');
  
  await Promise.all([
    killProcessOnPort(PORTS.API),
    killProcessOnPort(PORTS.UI)
  ]);
  
  console.log('✨ Ports cleaned up successfully!');
}

// Run cleanup
cleanupPorts().catch(error => {
  console.error('❌ Error cleaning up ports:', error);
  process.exit(1);
});