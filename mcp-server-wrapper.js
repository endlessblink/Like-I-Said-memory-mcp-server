#!/usr/bin/env node

/**
 * Universal MCP Server Wrapper
 * 
 * This wrapper ensures clean stdio communication for all MCP clients:
 * - Claude Desktop (Windows/Mac/Linux)
 * - Claude Code (VSCode Extension)
 * - Cursor
 * - Windsurf
 * 
 * It redirects all console output to stderr to prevent protocol corruption.
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine if we should show debug output
const DEBUG = process.env.DEBUG_MCP === 'true';

// Redirect all console methods to stderr to prevent stdout pollution
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug
};

// Override console methods to use stderr
console.log = (...args) => {
  if (DEBUG) process.stderr.write(`[LOG] ${args.join(' ')}\n`);
};
console.error = (...args) => {
  if (DEBUG) process.stderr.write(`[ERROR] ${args.join(' ')}\n`);
};
console.warn = (...args) => {
  if (DEBUG) process.stderr.write(`[WARN] ${args.join(' ')}\n`);
};
console.info = (...args) => {
  if (DEBUG) process.stderr.write(`[INFO] ${args.join(' ')}\n`);
};
console.debug = (...args) => {
  if (DEBUG) process.stderr.write(`[DEBUG] ${args.join(' ')}\n`);
};

// Spawn the actual MCP server
const serverPath = path.join(__dirname, 'server-markdown.js');
const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    // Disable any debug output in child process
    DEBUG_MCP: 'false'
  }
});

// Handle stdin (from MCP client to server)
process.stdin.on('data', (data) => {
  server.stdin.write(data);
});

// Handle stdout (from server to MCP client) - pass through unchanged
server.stdout.on('data', (data) => {
  process.stdout.write(data);
});

// Handle stderr (debug/error output) - only show if DEBUG is enabled
server.stderr.on('data', (data) => {
  if (DEBUG) {
    process.stderr.write(`[SERVER] ${data}`);
  }
});

// Handle process termination
server.on('close', (code) => {
  if (DEBUG) {
    process.stderr.write(`[WRAPPER] Server exited with code ${code}\n`);
  }
  process.exit(code || 0);
});

// Handle errors
server.on('error', (err) => {
  if (DEBUG) {
    process.stderr.write(`[WRAPPER] Failed to start server: ${err.message}\n`);
  }
  process.exit(1);
});

// Handle parent process termination
process.on('SIGINT', () => {
  server.kill('SIGINT');
});
process.on('SIGTERM', () => {
  server.kill('SIGTERM');
});