#!/usr/bin/env node

/**
 * HTTP wrapper for Like-I-Said MCP v2 - Smithery deployment
 * Provides HTTP transport layer around the existing STDIO MCP server
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

// Enable CORS for all routes (required for Smithery)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON bodies
app.use(express.json());

// Configuration handling from base64 query parameters
app.use((req, res, next) => {
  if (req.query.config) {
    try {
      const config = JSON.parse(Buffer.from(req.query.config, 'base64').toString());
      
      // Set environment variables from config
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
  res.json({ 
    status: 'healthy', 
    service: 'like-i-said-mcp-v2',
    version: '2.3.5',
    transport: 'http-stream',
    memoryPath: process.env.MCP_MEMORY_PATH || '/memories'
  });
});

// MCP tools listing endpoint
app.get('/mcp/tools', (req, res) => {
  res.json({
    tools: [
      {
        name: 'add_memory',
        description: 'Store information with tags, categories, and project context'
      },
      {
        name: 'get_memory', 
        description: 'Retrieve specific memory by ID'
      },
      {
        name: 'list_memories',
        description: 'Show memories with complexity levels and metadata'
      },
      {
        name: 'delete_memory',
        description: 'Remove specific memory'
      },
      {
        name: 'search_memories',
        description: 'Full-text search with project filtering'
      },
      {
        name: 'test_tool',
        description: 'Verify MCP connection'
      }
    ]
  });
});

// Main MCP endpoint - HTTP wrapper around STDIO server
app.post('/mcp', async (req, res) => {
  try {
    const mcpRequest = req.body;
    
    // Spawn STDIO MCP server process
    const mcpProcess = spawn('node', [join(__dirname, 'server-markdown.js')], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        // Ensure memory path is passed to STDIO server
        MCP_MEMORY_PATH: process.env.MCP_MEMORY_PATH || '/memories',
        MEMORIES_DIR: process.env.MEMORIES_DIR || '/memories'
      }
    });

    let responseData = '';
    let errorData = '';

    // Handle process output
    mcpProcess.stdout.on('data', (data) => {
      responseData += data.toString();
    });

    mcpProcess.stderr.on('data', (data) => {
      errorData += data.toString();
    });

    // Set timeout for response
    const timeout = setTimeout(() => {
      mcpProcess.kill();
      if (!res.headersSent) {
        res.status(504).json({ error: 'Request timeout' });
      }
    }, 30000);

    // Handle process completion
    mcpProcess.on('close', (code) => {
      clearTimeout(timeout);
      if (!res.headersSent) {
        if (responseData) {
          try {
            const response = JSON.parse(responseData.trim());
            res.json(response);
          } catch (parseError) {
            console.error('Failed to parse MCP response:', parseError);
            res.status(500).json({ 
              error: 'Invalid response format',
              details: parseError.message,
              rawResponse: responseData
            });
          }
        } else {
          console.error('MCP process error:', errorData);
          res.status(500).json({ 
            error: 'MCP server error',
            details: errorData,
            code: code 
          });
        }
      }
    });

    // Handle process errors
    mcpProcess.on('error', (error) => {
      console.error('Failed to start MCP process:', error);
      res.status(500).json({ 
        error: 'Failed to start MCP server',
        details: error.message 
      });
    });

    // Send request to STDIO server
    mcpProcess.stdin.write(JSON.stringify(mcpRequest) + '\n');
    mcpProcess.stdin.end();

  } catch (error) {
    console.error('HTTP wrapper error:', error);
    res.status(500).json({ 
      error: 'HTTP wrapper error',
      details: error.message 
    });
  }
});

// Dashboard integration - serve static files or proxy to dashboard server
app.get('/dashboard*', (req, res) => {
  res.json({ 
    message: 'Dashboard available',
    url: `http://localhost:${PORT}/dashboard`,
    note: 'Full dashboard requires dashboard-server-bridge.js'
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Like-I-Said MCP HTTP Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log(`📁 Memory path: ${process.env.MCP_MEMORY_PATH || '/memories'}`);
  
  // Initialize memory directory if it doesn't exist
  const memoryPath = process.env.MCP_MEMORY_PATH || './memories';
  try {
    if (!fs.existsSync(memoryPath)) {
      fs.mkdirSync(memoryPath, { recursive: true });
      console.log(`📁 Created memory directory: ${memoryPath}`);
    }
  } catch (error) {
    console.error('Warning: Could not create memory directory:', error);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  process.exit(0);
});