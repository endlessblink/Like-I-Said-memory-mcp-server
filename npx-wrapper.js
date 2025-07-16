#!/usr/bin/env node
/**
 * NPX Wrapper Script
 * This script is created locally and runs the MCP server from NPX
 * This solves Windows permission issues when NPX code tries to write files
 */

import { spawn } from 'child_process';
import process from 'process';

// Get the version from command line or use latest
const version = process.argv[2] || 'latest';
const packageName = `@endlessblink/like-i-said-v2${version !== 'latest' ? `@${version}` : ''}`;

// Run the MCP server via NPX with inherited stdio
const child = spawn('npx', [
  '--yes',  // Auto-install if needed
  packageName,
  'like-i-said-v2',
  'start'
], {
  stdio: 'inherit',
  shell: true,
  env: process.env  // Pass through all environment variables
});

child.on('error', (error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code || 0);
});