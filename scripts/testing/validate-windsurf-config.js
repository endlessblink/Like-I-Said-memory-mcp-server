#!/usr/bin/env node

/**
 * Validates Windsurf Editor configuration format
 */

import fs from 'fs';
import path from 'path';

function validateWindsurfConfig(configPath) {
  console.log(`Validating Windsurf Editor config: ${configPath}`);
  
  try {
    // Check if file exists
    if (!fs.existsSync(configPath)) {
      console.error('❌ Config file not found');
      process.exit(1);
    }
    
    // Read and parse JSON
    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configContent);
    
    // Validate structure (Windsurf has nested mcp property)
    if (!config.mcp) {
      console.error('❌ Missing mcp property');
      process.exit(1);
    }
    
    if (!config.mcp.servers) {
      console.error('❌ Missing mcp.servers property');
      process.exit(1);
    }
    
    // Check for like-i-said server
    if (!config.mcp.servers['like-i-said-memory-v2']) {
      console.error('❌ like-i-said-memory-v2 server not configured');
      process.exit(1);
    }
    
    const serverConfig = config.mcp.servers['like-i-said-memory-v2'];
    
    // Validate required properties
    if (!serverConfig.command) {
      console.error('❌ Missing command property');
      process.exit(1);
    }
    
    if (!serverConfig.args || !Array.isArray(serverConfig.args)) {
      console.error('❌ Missing or invalid args property');
      process.exit(1);
    }
    
    // Windsurf-specific validations
    if (serverConfig.env && serverConfig.env.MCP_QUIET !== 'true') {
      console.warn('⚠️  Windsurf works best with MCP_QUIET=true');
    }
    
    console.log('✅ Windsurf Editor configuration is valid');
    console.log('  Command:', serverConfig.command);
    console.log('  Script:', serverConfig.args[0]);
    if (serverConfig.env) {
      console.log('  Environment variables:', Object.keys(serverConfig.env).join(', '));
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    process.exit(1);
  }
}

// Get config path from command line
const configPath = process.argv[2];
if (!configPath) {
  console.error('Usage: node validate-windsurf-config.js <config-path>');
  process.exit(1);
}

validateWindsurfConfig(configPath);