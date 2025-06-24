#!/usr/bin/env node

/**
 * HTTP wrapper for Like-I-Said MCP v2 - Smithery deployment
 * Version 2: Persistent STDIO connection
 */

import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for all routes
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Persistent MCP process
let mcpProcess = null;
let requestQueue = new Map(); // id -> { resolve, reject, timeout }

function startMCPProcess() {
  if (mcpProcess) {
    mcpProcess.kill();
  }

  mcpProcess = spawn('node', [join(__dirname, 'server-markdown.js')], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      MCP_MEMORY_PATH: process.env.MCP_MEMORY_PATH || './memories',
      MEMORIES_DIR: process.env.MEMORIES_DIR || './memories'
    }
  });

  let buffer = '';

  mcpProcess.stdout.on('data', (data) => {
    buffer += data.toString();
    
    // Process complete JSON messages
    let newlineIndex;
    while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      
      if (line) {
        try {
          const response = JSON.parse(line);
          const requestId = response.id;
          
          if (requestQueue.has(requestId)) {
            const { resolve, timeout } = requestQueue.get(requestId);
            clearTimeout(timeout);
            requestQueue.delete(requestId);
            resolve(response);
          }
        } catch (error) {
          console.error('Failed to parse MCP response:', error, 'Line:', line);
        }
      }
    }
  });

  mcpProcess.stderr.on('data', (data) => {
    console.error('MCP stderr:', data.toString());
  });

  mcpProcess.on('close', (code) => {
    console.log('MCP process closed with code:', code);
    // Reject all pending requests
    for (const [id, { reject, timeout }] of requestQueue) {
      clearTimeout(timeout);
      reject(new Error('MCP process closed'));
    }
    requestQueue.clear();
    
    // Restart after delay
    setTimeout(() => {
      console.log('Restarting MCP process...');
      startMCPProcess();
    }, 1000);
  });

  mcpProcess.on('error', (error) => {
    console.error('MCP process error:', error);
  });

  console.log('🔧 MCP process started');
}

function sendMCPRequest(request) {
  return new Promise((resolve, reject) => {
    if (!mcpProcess || mcpProcess.killed) {
      reject(new Error('MCP process not available'));
      return;
    }

    const requestId = request.id;
    const timeout = setTimeout(() => {
      requestQueue.delete(requestId);
      reject(new Error('Request timeout'));
    }, 30000);

    requestQueue.set(requestId, { resolve, reject, timeout });

    try {
      mcpProcess.stdin.write(JSON.stringify(request) + '\n');
    } catch (error) {
      clearTimeout(timeout);
      requestQueue.delete(requestId);
      reject(error);
    }
  });
}

// Configuration handling
app.use((req, res, next) => {
  if (req.query.config) {
    try {
      const config = JSON.parse(Buffer.from(req.query.config, 'base64').toString());
      
      if (config.storagePath) {
        process.env.MCP_MEMORY_PATH = config.storagePath;
        process.env.MEMORIES_DIR = config.storagePath;
      }
      if (config.apiKey) {
        process.env.API_KEY = config.apiKey;
      }
      if (config.projectName) {
        process.env.DEFAULT_PROJECT = config.projectName;
      }
      
      console.log('Configuration applied:', { 
        storagePath: config.storagePath, 
        hasApiKey: !!config.apiKey,
        projectName: config.projectName 
      });
    } catch (error) {
      console.error('Error parsing configuration:', error);
    }
  }
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'like-i-said-mcp-v2',
    version: '2.3.5',
    transport: 'http-stream',
    memoryPath: process.env.MCP_MEMORY_PATH || './memories',
    mcpProcessActive: mcpProcess && !mcpProcess.killed
  });
});

// Tools listing
app.get('/mcp/tools', (req, res) => {
  res.json({
    tools: [
      { name: 'add_memory', description: 'Store information with tags, categories, and project context' },
      { name: 'get_memory', description: 'Retrieve specific memory by ID' },
      { name: 'list_memories', description: 'Show memories with complexity levels and metadata' },
      { name: 'delete_memory', description: 'Remove specific memory' },
      { name: 'search_memories', description: 'Full-text search with project filtering' },
      { name: 'test_tool', description: 'Verify MCP connection' }
    ]
  });
});

// Main MCP endpoint
app.post('/mcp', async (req, res) => {
  try {
    const mcpRequest = req.body;
    
    if (!mcpRequest.id) {
      mcpRequest.id = Date.now(); // Add ID if missing
    }

    const response = await sendMCPRequest(mcpRequest);
    res.json(response);
    
  } catch (error) {
    console.error('MCP request error:', error);
    res.status(500).json({ 
      error: 'MCP request failed',
      details: error.message 
    });
  }
});

// Dashboard placeholder
app.get('/dashboard*', (req, res) => {
  res.json({ 
    message: 'Dashboard available',
    url: `http://localhost:${PORT}/dashboard`,
    note: 'Full dashboard requires dashboard-server-bridge.js'
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Like-I-Said MCP HTTP Server v2 running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log(`📁 Memory path: ${process.env.MCP_MEMORY_PATH || './memories'}`);
  
  // Initialize memory directory
  const memoryPath = process.env.MCP_MEMORY_PATH || './memories';
  try {
    if (!fs.existsSync(memoryPath)) {
      fs.mkdirSync(memoryPath, { recursive: true });
      console.log(`📁 Created memory directory: ${memoryPath}`);
    }
  } catch (error) {
    console.error('Warning: Could not create memory directory:', error);
  }

  // Start MCP process
  startMCPProcess();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  if (mcpProcess) mcpProcess.kill();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  if (mcpProcess) mcpProcess.kill();
  process.exit(0);
});