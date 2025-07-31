#!/usr/bin/env node

// Test what the MCP server outputs
import { spawn } from 'child_process';

console.error('Testing MCP server output...\n');

// Test 1: Direct server start
console.error('=== Test 1: Direct server-markdown.js ===');
const test1 = spawn('node', ['server-markdown.js'], {
  env: { ...process.env, MCP_MODE: 'true', MCP_QUIET: 'true' }
});

test1.stdout.on('data', (data) => {
  console.error('STDOUT:', data.toString());
});

test1.stderr.on('data', (data) => {
  console.error('STDERR:', data.toString());
});

setTimeout(() => {
  test1.kill();
  
  // Test 2: Via mcp-quiet-wrapper
  console.error('\n=== Test 2: Via mcp-quiet-wrapper.js ===');
  const test2 = spawn('node', ['mcp-quiet-wrapper.js']);
  
  test2.stdout.on('data', (data) => {
    console.error('STDOUT:', data.toString());
  });
  
  test2.stderr.on('data', (data) => {
    console.error('STDERR:', data.toString());
  });
  
  setTimeout(() => {
    test2.kill();
    
    // Test 3: Via CLI start
    console.error('\n=== Test 3: Via cli.js start ===');
    const test3 = spawn('node', ['cli.js', 'start']);
    
    test3.stdout.on('data', (data) => {
      console.error('STDOUT:', data.toString());
    });
    
    test3.stderr.on('data', (data) => {
      console.error('STDERR:', data.toString());
    });
    
    setTimeout(() => {
      test3.kill();
      process.exit(0);
    }, 2000);
  }, 2000);
}, 2000);