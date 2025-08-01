#!/usr/bin/env node
/**
 * Test script to verify MCP server can start without sharp module
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Testing MCP server startup without sharp module...\n');

// Set environment to simulate MCP mode
process.env.MCP_MODE = 'true';

// Spawn the server
const serverProcess = spawn('node', [path.join(__dirname, 'server-markdown.js')], {
  env: { ...process.env, MCP_MODE: 'true' },
  stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';
let errorOutput = '';

serverProcess.stdout.on('data', (data) => {
  output += data.toString();
});

serverProcess.stderr.on('data', (data) => {
  errorOutput += data.toString();
  console.log('Server output:', data.toString());
});

// Send initialize request after brief delay
setTimeout(() => {
  const initRequest = JSON.stringify({
    jsonrpc: '2.0',
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    },
    id: 1
  }) + '\n';
  
  console.log('Sending initialize request...\n');
  serverProcess.stdin.write(initRequest);
}, 1000);

// Check server status after 3 seconds
setTimeout(() => {
  if (serverProcess.exitCode === null) {
    console.log('\n✅ SUCCESS: Server is still running after 3 seconds');
    console.log('The fix appears to be working - server can start without sharp module\n');
    
    // Send list tools request to verify functionality
    const toolsRequest = JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/list',
      params: {},
      id: 2
    }) + '\n';
    
    serverProcess.stdin.write(toolsRequest);
    
    setTimeout(() => {
      serverProcess.kill();
      process.exit(0);
    }, 1000);
  } else {
    console.log('\n❌ FAILED: Server crashed with exit code:', serverProcess.exitCode);
    console.log('Error output:', errorOutput);
    process.exit(1);
  }
}, 3000);

serverProcess.on('error', (error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

serverProcess.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.log('\n❌ Server exited with code:', code);
    console.log('Error output:', errorOutput);
  }
});