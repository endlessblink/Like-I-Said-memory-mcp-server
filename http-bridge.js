#!/usr/bin/env node

/**
 * HTTP-to-stdio Bridge for Like-I-Said MCP Server
 * Allows n8n to connect to your MCP server via HTTP
 */

import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import cors from 'cors';

const app = express();
const PORT = 3030;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', bridge: 'like-i-said-mcp', port: PORT });
});

// MCP proxy endpoint
app.post('/mcp', async (req, res) => {
  try {
    const mcpRequest = req.body;
    
    // Spawn your MCP server
    const mcpServer = spawn('node', ['server.js'], {
      cwd: 'D:\\APPSNospaces\\like-i-said-mcp-server-v2',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let response = '';
    let error = '';
    
    // Handle server output
    mcpServer.stdout.on('data', (data) => {
      response += data.toString();
    });
    
    mcpServer.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    // Send MCP request
    mcpServer.stdin.write(JSON.stringify(mcpRequest) + '\n');
    mcpServer.stdin.end();
    
    // Wait for response
    mcpServer.on('close', (code) => {
      if (code === 0 && response) {
        try {
          const mcpResponse = JSON.parse(response.trim());
          res.json(mcpResponse);
        } catch (parseError) {
          res.status(500).json({ 
            error: 'Failed to parse MCP response', 
            raw: response,
            parseError: parseError.message 
          });
        }
      } else {
        res.status(500).json({ 
          error: 'MCP server error', 
          code, 
          stderr: error,
          stdout: response 
        });
      }
    });
    
    // Timeout after 30 seconds
    setTimeout(() => {
      mcpServer.kill();
      res.status(408).json({ error: 'MCP request timeout' });
    }, 30000);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start the bridge
app.listen(PORT, () => {
  console.log(`🌉 Like-I-Said MCP HTTP Bridge running on http://localhost:${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log('');
  console.log('To use in n8n MCP Client:');
  console.log('Command: curl');
  console.log('Args: ["-X", "POST", "-H", "Content-Type: application/json", "-d", "@-", "http://host.docker.internal:3030/mcp"]');
});
