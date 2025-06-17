#!/usr/bin/env node

import path from 'path';
import fs from 'fs';

console.log('🧪 Testing NPX Behavior Simulation');
console.log('===================================\n');

// Simulate NPX environment
const originalDirname = '/mnt/d/APPSNospaces/Like-I-said-mcp-server-v2';
const simulatedNpxDirname = '/home/user/.npm/_npx/12345/node_modules/@endlessblink/like-i-said-v2';
const simulatedCwd = '/home/user/my-ai-project';

console.log('📍 Simulated Paths:');
console.log(`   NPX Cache (__dirname): ${simulatedNpxDirname}`);
console.log(`   User Directory (cwd):  ${simulatedCwd}`);

// Test the logic from cli.js
function testPathLogic(dirname, cwd) {
  const isNpxInstall = dirname.includes('npm-cache/_npx') || dirname.includes('node_modules');
  const projectPath = isNpxInstall ? cwd : dirname;
  const serverPath = path.join(isNpxInstall ? dirname : projectPath, 'server-markdown.js');
  
  console.log('\n🔍 Detection Results:');
  console.log(`   Is NPX Install: ${isNpxInstall}`);
  console.log(`   Project Path: ${projectPath}`);
  console.log(`   Server Test Path: ${serverPath}`);
  
  // Simulate file operations
  const filesToCopy = ['server-markdown.js', 'package.json', 'README.md'];
  
  console.log('\n📁 File Copy Operations:');
  filesToCopy.forEach(file => {
    const sourcePath = path.join(dirname, file);
    const destPath = path.join(projectPath, file);
    console.log(`   ${file}:`);
    console.log(`     From: ${sourcePath}`);
    console.log(`     To:   ${destPath}`);
  });
  
  // Simulate config generation
  const configServerPath = path.join(projectPath, 'server-markdown.js');
  console.log('\n⚙️  MCP Config Generation:');
  console.log(`   Config will point to: ${configServerPath}`);
  
  // Show example configs
  const exampleConfigs = [
    {
      name: 'Claude Desktop',
      path: 'C:\\Users\\user\\AppData\\Roaming\\Claude\\claude_desktop_config.json'
    },
    {
      name: 'Cursor',
      path: 'C:\\Users\\user\\AppData\\Roaming\\Cursor\\User\\globalStorage\\storage.json'
    }
  ];
  
  console.log('\n📋 Example MCP Configurations:');
  exampleConfigs.forEach(config => {
    console.log(`   ${config.name} (${config.path}):`);
    console.log('   {');
    console.log('     "mcpServers": {');
    console.log('       "like-i-said-memory": {');
    console.log('         "command": "node",');
    console.log(`         "args": ["${configServerPath.replace(/\\/g, '\\\\')}"]`);
    console.log('       }');
    console.log('     }');
    console.log('   }');
    console.log('');
  });
}

console.log('\n🎯 Testing Current (Local) Behavior:');
testPathLogic(originalDirname, process.cwd());

console.log('\n🎯 Testing NPX Behavior:');
testPathLogic(simulatedNpxDirname, simulatedCwd);

console.log('\n✅ Summary:');
console.log('   • NPX installs files to user\'s current directory');
console.log('   • MCP configs point to user\'s local files (not NPX cache)');
console.log('   • Users have full control over installation location');
console.log('   • No cleanup issues when NPX cache is cleared');