#!/usr/bin/env node

/**
 * Final MCP Server Fix for Claude Desktop on Windows
 * This server ensures absolutely NO stdout pollution
 */

// CRITICAL: Override console BEFORE any imports
const originalWrite = process.stdout.write;
const writes = [];

// Capture ALL stdout writes
process.stdout.write = function(chunk, encoding, callback) {
  const str = chunk ? chunk.toString() : '';
  
  // Store for analysis
  writes.push({
    time: new Date().toISOString(),
    content: str,
    stack: new Error().stack
  });
  
  // Only allow JSON-RPC through
  if (str.trim() && str.startsWith('{') && str.includes('"jsonrpc"')) {
    return originalWrite.call(process.stdout, chunk, encoding, callback);
  }
  
  // Log what we blocked to stderr for debugging
  if (str.trim() && str !== '\n') {
    process.stderr.write(`[BLOCKED at ${new Date().toISOString()}]: ${str}`);
  }
  
  if (callback) callback();
  return true;
};

// Set all console methods to stderr
['log', 'info', 'warn', 'error', 'debug'].forEach(method => {
  console[method] = (...args) => {
    process.stderr.write(`[console.${method}] ${args.join(' ')}\n`);
  };
});

// Now we can safely import
import('./server-markdown.js').then(() => {
  // Server started
}).catch(err => {
  process.stderr.write(`[FATAL ERROR] ${err.message}\n${err.stack}\n`);
  
  // Log all captured writes for debugging
  process.stderr.write('\n[STDOUT WRITE HISTORY]:\n');
  writes.forEach(w => {
    process.stderr.write(`Time: ${w.time}\n`);
    process.stderr.write(`Content: ${JSON.stringify(w.content)}\n`);
    process.stderr.write(`Stack: ${w.stack}\n\n`);
  });
  
  process.exit(1);
});