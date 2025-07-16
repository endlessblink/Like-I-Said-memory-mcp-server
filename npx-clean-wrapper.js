#!/usr/bin/env node

// Clean wrapper for NPX execution that suppresses all non-JSON output
// This prevents ANSI color codes and console messages from corrupting the MCP protocol

// Suppress all console output except stderr for MCP
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleInfo = console.info;

// Override console methods to prevent output corruption
console.log = () => {};
console.warn = () => {};
console.info = () => {};
console.error = (...args) => {
  // Only allow MCP protocol messages through stderr
  const message = args.join(' ');
  
  // Filter out ANSI codes and startup messages
  if (message.includes('\x1b[') || 
      message.includes('Starting') || 
      message.includes('Initialized') ||
      message.includes('✅') ||
      message.includes('🚀') ||
      message.includes('ℹ️') ||
      message.includes('⚠️')) {
    return;
  }
  
  // Only output clean JSON-RPC messages
  if (message.startsWith('{') && message.includes('"jsonrpc"')) {
    originalConsoleError.apply(console, args);
  }
};

// Set environment to ensure quiet mode
process.env.MCP_QUIET = 'true';
process.env.MCP_MODE = 'true';
process.env.NO_COLOR = '1';
process.env.FORCE_COLOR = '0';

// Import and run the actual server
import('./server-markdown.js').catch(err => {
  // Silent error - don't output anything that could corrupt JSON-RPC
  process.exit(1);
});