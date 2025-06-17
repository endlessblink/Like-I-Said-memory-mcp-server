#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('=== Finding Windows Cursor Config ===');

// Try to find Windows user directories
try {
  const userDirs = fs.readdirSync('/mnt/c/Users').filter(dir => 
    !['Public', 'Default', 'Default User', 'All Users'].includes(dir) &&
    fs.statSync(path.join('/mnt/c/Users', dir)).isDirectory()
  );
  
  console.log('Found Windows users:', userDirs);
  
  for (const userDir of userDirs) {
    const possiblePaths = [
      `/mnt/c/Users/${userDir}/AppData/Roaming/Cursor/User/globalStorage/storage.json`,
      `/mnt/c/Users/${userDir}/AppData/Roaming/Cursor/User/settings.json`,
      `/mnt/c/Users/${userDir}/.cursor/mcp.json`,
    ];
    
    console.log(`\n--- Checking user: ${userDir} ---`);
    for (const configPath of possiblePaths) {
      console.log(`${configPath}: ${fs.existsSync(configPath) ? '✅' : '❌'}`);
      
      if (fs.existsSync(configPath)) {
        try {
          const content = fs.readFileSync(configPath, 'utf8');
          const config = JSON.parse(content);
          
          if (config.mcpServers) {
            console.log(`  📋 MCP servers found: ${Object.keys(config.mcpServers).join(', ')}`);
            console.log(`  🔍 Has like-i-said-memory: ${config.mcpServers['like-i-said-memory'] ? '✅' : '❌'}`);
          }
        } catch (e) {
          console.log(`  ⚠️  Could not parse JSON: ${e.message}`);
        }
      }
    }
  }
} catch (error) {
  console.error('Error accessing Windows user directories:', error.message);
}