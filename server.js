#!/usr/bin/env node

// Compatibility shim for Claude Desktop looking for server.js
// Redirects to the actual MCP server

// Set environment for MCP mode
process.env.MCP_MODE = 'true';
process.env.MCP_QUIET = 'true';
process.env.NO_COLOR = '1';
process.env.FORCE_COLOR = '0';

// Import the actual server
import('./server-markdown.js');