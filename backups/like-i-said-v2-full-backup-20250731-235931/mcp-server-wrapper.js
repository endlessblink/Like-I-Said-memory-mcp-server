#!/usr/bin/env node

// CRITICAL: DO NOT MOVE THIS FILE!
// This file MUST remain in the root directory as MCP clients are configured to use this path.
// Moving this file will break all existing MCP client configurations.

// MCP Server Wrapper - Simple wrapper to start the Like-I-Said MCP server
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Start the actual server (server-markdown.js is in the same root directory)
const serverPath = join(__dirname, 'server-markdown.js');
const child = spawn('node', [serverPath], {
  stdio: 'inherit',
  env: process.env
});

// Forward exit codes
child.on('exit', (code) => {
  process.exit(code || 0);
});

// Handle errors
child.on('error', (error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});