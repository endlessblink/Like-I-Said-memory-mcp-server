#!/usr/bin/env node

// MCP Quiet Wrapper - Ensures ONLY JSON-RPC messages are output
// This prevents ALL console output except valid JSON-RPC 2.0 messages

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Transform } from 'stream';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create a transform stream that filters output
class JSONRPCFilter extends Transform {
  constructor(options) {
    super(options);
    this.buffer = '';
  }

  _transform(chunk, encoding, callback) {
    this.buffer += chunk.toString();
    
    // Process complete lines
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || ''; // Keep incomplete line in buffer
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // Only allow valid JSON-RPC messages through
      if (trimmed.startsWith('{') && trimmed.includes('"jsonrpc"')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed.jsonrpc === '2.0') {
            this.push(trimmed + '\n');
          }
        } catch (e) {
          // Not valid JSON, suppress it
        }
      }
    }
    
    callback();
  }

  _flush(callback) {
    // Process any remaining data
    if (this.buffer.trim()) {
      const trimmed = this.buffer.trim();
      if (trimmed.startsWith('{') && trimmed.includes('"jsonrpc"')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed.jsonrpc === '2.0') {
            this.push(trimmed + '\n');
          }
        } catch (e) {
          // Not valid JSON, suppress it
        }
      }
    }
    callback();
  }
}

// Start the server with environment variables to suppress output
const serverPath = join(__dirname, 'server-markdown.js');
const env = {
  ...process.env,
  MCP_MODE: 'true',
  MCP_QUIET: 'true',
  NO_COLOR: '1',
  FORCE_COLOR: '0',
  NODE_NO_WARNINGS: '1'
};

const child = spawn('node', [serverPath], {
  stdio: ['inherit', 'pipe', 'pipe'],
  env
});

// Create filters for stdout and stderr
const stdoutFilter = new JSONRPCFilter();
const stderrFilter = new JSONRPCFilter();

// Pipe filtered output
child.stdout.pipe(stdoutFilter).pipe(process.stdout);
child.stderr.pipe(stderrFilter).pipe(process.stderr);

// Handle child process exit
child.on('exit', (code) => {
  process.exit(code || 0);
});

child.on('error', (error) => {
  // Exit silently on error
  process.exit(1);
});