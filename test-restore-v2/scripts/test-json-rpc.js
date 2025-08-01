#!/usr/bin/env node

// Test JSON-RPC communication
import { spawn } from 'child_process';

const child = spawn('node', ['cli.js', 'start'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Send a test JSON-RPC request
const testRequest = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '0.1.0',
    capabilities: {}
  }
}) + '\n';

console.error('Sending test request...');
child.stdin.write(testRequest);

// Capture output
let output = '';
child.stdout.on('data', (data) => {
  output += data.toString();
  console.error('STDOUT:', data.toString());
});

child.stderr.on('data', (data) => {
  console.error('STDERR:', data.toString());
});

// Wait and check
setTimeout(() => {
  child.kill();
  console.error('\nFinal output:', output);
  
  // Check if output contains the error pattern
  if (output.includes('📖 More in')) {
    console.error('\n❌ ERROR: Found "📖 More in" in output!');
    process.exit(1);
  } else if (output.includes('"jsonrpc":"2.0"')) {
    console.error('\n✅ SUCCESS: Clean JSON-RPC output detected');
    process.exit(0);
  } else {
    console.error('\n⚠️  WARNING: No JSON-RPC response received');
    process.exit(2);
  }
}, 3000);