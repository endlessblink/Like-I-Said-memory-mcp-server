#!/usr/bin/env node

/**
 * Test STDIO MCP server directly
 */

import { spawn } from 'child_process';

console.log('Testing STDIO MCP server directly...');

const mcpProcess = spawn('node', ['server-markdown.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let responseData = '';
let errorData = '';

mcpProcess.stdout.on('data', (data) => {
  responseData += data.toString();
  console.log('STDOUT:', data.toString());
});

mcpProcess.stderr.on('data', (data) => {
  errorData += data.toString();
  console.log('STDERR:', data.toString());
});

mcpProcess.on('close', (code) => {
  console.log(`Process closed with code: ${code}`);
  console.log('Full response:', responseData);
  if (errorData) console.log('Error output:', errorData);
});

mcpProcess.on('error', (error) => {
  console.error('Process error:', error);
});

// Send test request
const testRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: {
    name: 'test_tool',
    arguments: {
      message: 'Direct STDIO test'
    }
  }
};

console.log('Sending request:', JSON.stringify(testRequest));
mcpProcess.stdin.write(JSON.stringify(testRequest) + '\n');
mcpProcess.stdin.end();

// Timeout after 10 seconds
setTimeout(() => {
  console.log('Timeout - killing process');
  mcpProcess.kill();
}, 10000);