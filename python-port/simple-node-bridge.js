#!/usr/bin/env node
/**
 * Simple Node.js Bridge for Python MCP Server
 * Minimal implementation focused on reliable stdio handling
 */

const { spawn } = require('child_process');
const readline = require('readline');
const path = require('path');

// Configure Python process
const pythonExe = process.platform === 'win32' ? 'python' : 'python3';
const scriptPath = path.join(__dirname, 'server', 'windows_robust_server.py');

// Spawn Python with proper stdio handling
const python = spawn(pythonExe, [scriptPath], {
    stdio: ['pipe', 'pipe', 'inherit'],
    env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
        PYTHONIOENCODING: 'utf-8'
    }
});

// Handle Python errors
python.on('error', (err) => {
    console.error(`Failed to start Python: ${err.message}`);
    process.exit(1);
});

python.on('exit', (code) => {
    process.exit(code || 0);
});

// Setup readers
const stdinReader = readline.createInterface({
    input: process.stdin,
    crlfDelay: Infinity
});

const pythonReader = readline.createInterface({
    input: python.stdout,
    crlfDelay: Infinity
});

// Forward stdin to Python
stdinReader.on('line', (line) => {
    python.stdin.write(line + '\n');
});

// Forward Python output to stdout
pythonReader.on('line', (line) => {
    console.log(line);
});

// Handle shutdown
process.on('SIGINT', () => {
    python.kill('SIGTERM');
    process.exit(0);
});

process.on('SIGTERM', () => {
    python.kill('SIGTERM');
    process.exit(0);
});