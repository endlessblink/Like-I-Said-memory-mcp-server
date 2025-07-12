#!/usr/bin/env node

/**
 * MCP Server Wrapper - ESM version
 * Ensures ABSOLUTELY NO non-JSON output goes to stdout
 */

// Store original methods BEFORE any other code runs
const originalLog = console.log;
const originalInfo = console.info;
const originalWarn = console.warn;
const originalDebug = console.debug;
const originalWrite = process.stdout.write;

// Override all console methods to redirect to stderr
console.log = function() {
  process.stderr.write('[LOG] ' + Array.from(arguments).join(' ') + '\n');
};
console.info = function() {
  process.stderr.write('[INFO] ' + Array.from(arguments).join(' ') + '\n');
};
console.warn = function() {
  process.stderr.write('[WARN] ' + Array.from(arguments).join(' ') + '\n');
};
console.debug = function() {
  process.stderr.write('[DEBUG] ' + Array.from(arguments).join(' ') + '\n');
};

// Override process.stdout.write to filter output
process.stdout.write = function(chunk, encoding, callback) {
  if (!chunk) return originalWrite.call(process.stdout, chunk, encoding, callback);
  
  const str = chunk.toString();
  
  // Only allow valid JSON-RPC messages through
  if (str.trim() && str.includes('"jsonrpc"') && str.trim().startsWith('{')) {
    return originalWrite.call(process.stdout, chunk, encoding, callback);
  }
  
  // Redirect non-JSON to stderr
  if (str.trim()) {
    process.stderr.write('[STDOUT-BLOCKED] ' + str);
  }
  
  if (callback) callback();
  return true;
};

// Set environment variables
process.env.MCP_MODE = 'true';
process.env.MCP_QUIET = 'true';

// Catch any uncaught errors to prevent stdout pollution
process.on('uncaughtException', function(err) {
  process.stderr.write('[UNCAUGHT] ' + err.stack + '\n');
  process.exit(1);
});

process.on('unhandledRejection', function(reason, promise) {
  process.stderr.write('[UNHANDLED] ' + reason + '\n');
  process.exit(1);
});

// Import and run the server
try {
  await import('./server-markdown.js');
} catch (error) {
  process.stderr.write('[WRAPPER-ERROR] Failed to load server: ' + error.message + '\n');
  process.exit(1);
}