#!/usr/bin/env node

// Direct MCP Server Entry Point - Bypasses CLI completely
// This ensures clean startup without any help text or banners

// Set environment for MCP mode
process.env.MCP_MODE = 'true';
process.env.MCP_QUIET = 'true';
process.env.NO_COLOR = '1';
process.env.FORCE_COLOR = '0';

// Import the server directly
import('./server-markdown.js');