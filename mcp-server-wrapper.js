#!/usr/bin/env node

// MCP Server Wrapper - Simple wrapper to start the Like-I-Said MCP server
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Start the actual server
const serverPath = join(__dirname, 'server-markdown.js');

// Set working directory to where memories/tasks should be stored
// This fixes NPX permission issues on Windows
const workingDir = process.env.MEMORY_DIR ? 
  dirname(process.env.MEMORY_DIR) : 
  process.cwd();

const child = spawn('node', [serverPath], {
  stdio: 'inherit',
  env: process.env,
  cwd: workingDir  // Set working directory for file operations
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