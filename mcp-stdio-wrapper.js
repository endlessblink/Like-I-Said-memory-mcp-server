#!/usr/bin/env node

// MCP STDIO Wrapper - Ensures ONLY valid JSON-RPC messages go to stdout
// All other output is suppressed to prevent protocol corruption

import { Writable } from 'stream';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Create a custom stdout that filters output
const originalStdoutWrite = process.stdout.write.bind(process.stdout);
const originalStderrWrite = process.stderr.write.bind(process.stderr);

// Buffer to accumulate potential JSON messages
let buffer = '';

// Override stdout to filter output
process.stdout.write = function(chunk, encoding, callback) {
  const str = chunk.toString();
  buffer += str;
  
  // Try to extract complete JSON messages
  const lines = buffer.split('\n');
  buffer = lines.pop() || ''; // Keep incomplete line in buffer
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Only allow valid JSON-RPC messages through
    if (trimmed.startsWith('{') && trimmed.includes('"jsonrpc"')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.jsonrpc === '2.0') {
          originalStdoutWrite(trimmed + '\n');
        }
      } catch (e) {
        // Not valid JSON, suppress it
      }
    }
  }
  
  if (callback) callback();
  return true;
};

// Suppress ALL stderr output
process.stderr.write = function() {
  return true;
};

// Override console methods to prevent any output
const noop = () => {};
console.log = noop;
console.error = noop;
console.warn = noop;
console.info = noop;
console.debug = noop;
console.trace = noop;

// Set environment for quiet operation
process.env.MCP_QUIET = 'true';
process.env.MCP_MODE = 'true';
process.env.NO_COLOR = '1';
process.env.FORCE_COLOR = '0';
process.env.NODE_NO_WARNINGS = '1';

// Import and run the actual server
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const serverPath = join(__dirname, 'server-markdown.js');

import(serverPath).catch(err => {
  // Exit silently on error
  process.exit(1);
});