#!/usr/bin/env node

// Script to update Claude Desktop configuration with new memory/task paths
import fs from 'fs';
import path from 'path';
import os from 'os';

const newMemoryDir = process.argv[2];
const newTaskDir = process.argv[3];

if (!newMemoryDir || !newTaskDir) {
  console.log('Usage: node update-memory-path.js <memory-dir> <task-dir>');
  console.log('Example: node update-memory-path.js "D:\\MyNewMemories" "D:\\MyNewTasks"');
  process.exit(1);
}

// Find Claude Desktop config
const homeDir = os.homedir();
const configPaths = [
  path.join(process.env.APPDATA || '', 'Claude', 'claude_desktop_config.json'),
  path.join(homeDir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
  path.join(homeDir, '.config', 'Claude', 'claude_desktop_config.json')
];

let configPath = null;
for (const p of configPaths) {
  if (fs.existsSync(p)) {
    configPath = p;
    break;
  }
}

if (!configPath) {
  console.error('❌ Could not find Claude Desktop configuration file');
  process.exit(1);
}

// Read and update config
try {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  
  if (config.mcpServers && config.mcpServers['like-i-said-memory-v2']) {
    config.mcpServers['like-i-said-memory-v2'].env = config.mcpServers['like-i-said-memory-v2'].env || {};
    config.mcpServers['like-i-said-memory-v2'].env.MEMORY_DIR = newMemoryDir;
    config.mcpServers['like-i-said-memory-v2'].env.TASK_DIR = newTaskDir;
    
    // Backup original
    fs.writeFileSync(configPath + '.backup', fs.readFileSync(configPath));
    
    // Write updated config
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    
    console.log('✅ Configuration updated successfully!');
    console.log(`   Memory Dir: ${newMemoryDir}`);
    console.log(`   Task Dir: ${newTaskDir}`);
    console.log('');
    console.log('⚠️  Please restart Claude Desktop for changes to take effect');
  } else {
    console.error('❌ like-i-said-memory-v2 not found in configuration');
  }
} catch (error) {
  console.error('❌ Error updating configuration:', error.message);
}