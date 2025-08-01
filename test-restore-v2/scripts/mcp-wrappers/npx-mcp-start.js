#!/usr/bin/env node

// NPX MCP Start - Direct entry point for NPX execution
// This bypasses all CLI logic and starts the MCP server directly

// Set MCP environment
process.env.MCP_MODE = 'true';
process.env.MCP_QUIET = 'true';
process.env.NO_COLOR = '1';

// Import the quiet wrapper directly
import('./mcp-quiet-wrapper.js');