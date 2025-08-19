#!/usr/bin/env node

/**
 * Validates Claude Desktop configuration format
 */

import fs from 'fs';
import path from 'path';

function validateClaudeConfig(configPath) {
  console.log(`Validating Claude Desktop config: ${configPath}`);
  
  try {
    // Check if file exists
    if (!fs.existsSync(configPath)) {
      console.error('❌ Config file not found');
      process.exit(1);
    }
    
    // Read and parse JSON
    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configContent);
    
    // Validate structure
    if (!config.mcpServers) {
      console.error('❌ Missing mcpServers property');
      process.exit(1);
    }
    
    // Check for like-i-said server
    if (!config.mcpServers['like-i-said-memory-v2']) {
      console.error('❌ like-i-said-memory-v2 server not configured');
      process.exit(1);
    }
    
    const serverConfig = config.mcpServers['like-i-said-memory-v2'];
    
    // Validate required properties
    if (!serverConfig.command) {
      console.error('❌ Missing command property');
      process.exit(1);
    }
    
    if (!serverConfig.args || !Array.isArray(serverConfig.args)) {
      console.error('❌ Missing or invalid args property');
      process.exit(1);
    }
    
    // Check command is valid
    const validCommands = ['node', 'npx', '/usr/bin/node', '/usr/local/bin/node'];
    const commandBase = path.basename(serverConfig.command);
    if (!validCommands.some(cmd => commandBase.includes(cmd))) {
      console.warn('⚠️  Unusual command:', serverConfig.command);
    }
    
    // Check args point to valid file
    const scriptPath = serverConfig.args[0];
    if (!scriptPath.includes('mcp-server-wrapper.js') && 
        !scriptPath.includes('server-markdown.js') &&
        !scriptPath.includes('like-i-said-v2')) {
      console.warn('⚠️  Unusual script path:', scriptPath);
    }
    
    console.log('✅ Claude Desktop configuration is valid');
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
  console.error('Usage: node validate-claude-config.js <config-path>');
  process.exit(1);
}

validateClaudeConfig(configPath);