#!/usr/bin/env node

/**
 * HTTP wrapper for Like-I-Said MCP v2 - Smithery deployment
 * FIXED VERSION: Persistent STDIO connection approach
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
const REQUEST_TIMEOUT = 30000;

// Enable CORS for all routes
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Persistent MCP process and request management
let mcpProcess = null;
let activeRequest = null;
const requestQueue = [];
let buffer = '';

function startMCPProcess() {
  console.log('🔧 Starting persistent MCP process...');
  
  mcpProcess = spawn('node', [join(__dirname, 'server-markdown.js')], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      MCP_MEMORY_PATH: process.env.MCP_MEMORY_PATH || './memories',
      MEMORIES_DIR: process.env.MEMORIES_DIR || './memories'
    }
  });

  // Handle MCP responses - parse streaming JSON
  mcpProcess.stdout.on('data', (data) => {
    buffer += data.toString();
    
    // Look for complete JSON messages (ending with newline or complete object)
    let lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep incomplete line in buffer
    
    for (const line of lines) {
      if (line.trim()) {
        try {
          const response = JSON.parse(line.trim());
          if (activeRequest) {
            const { res, timeout } = activeRequest;
            clearTimeout(timeout);
            
            if (!res.headersSent) {
              res.json(response);
            }
            
            activeRequest = null;
            processNextRequest();
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
    console.log(`MCP process closed with code: ${code}`);
    
    // Reject active request if any
    if (activeRequest) {
      const { res, timeout } = activeRequest;
      clearTimeout(timeout);
      if (!res.headersSent) {
        res.status(500).json({ error: 'MCP process closed unexpectedly' });
      }
      activeRequest = null;
    }
    
    // Clear queue
    while (requestQueue.length > 0) {
      const { res, timeout } = requestQueue.shift();
      clearTimeout(timeout);
      if (!res.headersSent) {
        res.status(500).json({ error: 'MCP process unavailable' });
      }
    }
    
    // Restart after delay if not intentionally killed
    if (code !== 0 && code !== null) {
      setTimeout(() => {
        console.log('🔄 Restarting MCP process...');
        startMCPProcess();
      }, 2000);
    }
  });

  mcpProcess.on('error', (error) => {
    console.error('MCP process error:', error);
  });

  console.log('✅ MCP process started successfully');
}

function processNextRequest() {
  if (requestQueue.length > 0 && !activeRequest) {
    const queuedRequest = requestQueue.shift();
    executeRequest(queuedRequest);
  }
}

function executeRequest({ req, res, requestData }) {
  if (!mcpProcess || mcpProcess.killed) {
    res.status(503).json({ error: 'MCP service unavailable' });
    return;
  }

  const timeout = setTimeout(() => {
    if (activeRequest && activeRequest.res === res) {
      if (!res.headersSent) {
        res.status(504).json({ error: 'Request timeout' });
      }
      activeRequest = null;
      processNextRequest();
    }
  }, REQUEST_TIMEOUT);

  activeRequest = { res, timeout };

  try {
    mcpProcess.stdin.write(requestData + '\n');
  } catch (error) {
    clearTimeout(timeout);
    activeRequest = null;
    res.status(500).json({ error: 'Failed to send request to MCP server' });
    processNextRequest();
  }
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

// Health check endpoint
app.get('/health', (req, res) => {
  const mcpStatus = mcpProcess && !mcpProcess.killed ? 'running' : 'stopped';
  res.json({ 
    status: 'healthy', 
    service: 'like-i-said-mcp-v2',
    version: '2.3.5',
    transport: 'http-stream',
    memoryPath: process.env.MCP_MEMORY_PATH || './memories',
    mcpProcess: mcpStatus,
    activeRequests: activeRequest ? 1 : 0,
    queuedRequests: requestQueue.length
  });
});

// MCP tools listing endpoint
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

// Main MCP endpoint - HTTP wrapper with persistent connection
app.post('/mcp', async (req, res) => {
  try {
    const mcpRequest = req.body;
    
    // Add ID if missing
    if (!mcpRequest.id) {
      mcpRequest.id = Date.now();
    }

    const requestData = JSON.stringify(mcpRequest);
    const request = { req, res, requestData };

    // If no active request, process immediately
    if (!activeRequest) {
      executeRequest(request);
    } else {
      // Queue the request
      const timeout = setTimeout(() => {
        // Remove from queue if timeout
        const index = requestQueue.indexOf(request);
        if (index > -1) {
          requestQueue.splice(index, 1);
          if (!res.headersSent) {
            res.status(504).json({ error: 'Request timeout in queue' });
          }
        }
      }, REQUEST_TIMEOUT);

      request.timeout = timeout;
      requestQueue.push(request);
    }

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
  console.log(`🚀 Like-I-Said MCP HTTP Server (Fixed) running on port ${PORT}`);
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

  // Start persistent MCP process
  startMCPProcess();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  if (mcpProcess) {
    mcpProcess.kill('SIGTERM');
  }
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  if (mcpProcess) {
    mcpProcess.kill('SIGTERM');
  }
  process.exit(0);
});