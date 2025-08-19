#!/usr/bin/env node

import { spawn } from 'child_process';

console.log('Testing MCP server...');

const server = spawn('node', ['server-markdown.js'], {
  env: { ...process.env, MCP_MODE: 'true' },
  stdio: ['pipe', 'pipe', 'pipe']
});

// Send a tools/list request
const request = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/list'
}) + '\n';

server.stdin.write(request);

let output = '';
server.stdout.on('data', (data) => {
  output += data.toString();
  
  // Check if we got a valid response
  try {
    const response = JSON.parse(output);
    if (response.result && response.result.tools) {
      console.log('✅ Server is working!');
      console.log(`   Found ${response.result.tools.length} tools`);
      
      // Check for our specific tools
      const toolNames = response.result.tools.map(t => t.name);
      console.log('\nTools available:');
      toolNames.slice(0, 5).forEach(name => console.log(`   - ${name}`));
      if (toolNames.length > 5) {
        console.log(`   ... and ${toolNames.length - 5} more`);
      }
      
      server.kill();
      process.exit(0);
    }
  } catch (e) {
    // Not a complete JSON yet, wait for more data
  }
});

server.stderr.on('data', (data) => {
  // Ignore stderr unless it's an error
  const msg = data.toString();
  if (msg.includes('Error') || msg.includes('error')) {
    console.error('❌ Server error:', msg);
    server.kill();
    process.exit(1);
  }
});

// Timeout after 3 seconds
setTimeout(() => {
  console.log('❌ Server did not respond in time');
  server.kill();
  process.exit(1);
}, 3000);