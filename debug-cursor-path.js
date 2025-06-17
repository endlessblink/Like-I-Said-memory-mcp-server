#!/usr/bin/env node

import path from 'path';
import fs from 'fs';

// Same detection logic as CLI
const platform = process.platform;
const isWSL = process.env.WSL_DISTRO_NAME || process.env.WSL_INTEROP;
const homeDir = process.env.HOME || process.env.USERPROFILE;

console.log('=== Cursor Path Debug ===');
console.log('Platform:', platform);
console.log('Is WSL:', !!isWSL);
console.log('Home Dir:', homeDir);
console.log('APPDATA:', process.env.APPDATA);

const cursorConfig = {
  name: 'Cursor',
  darwin: path.join(homeDir, 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'storage.json'),
  win32: path.join(process.env.APPDATA || '', 'Cursor', 'User', 'globalStorage', 'storage.json'),
  linux: path.join(homeDir, '.config', 'Cursor', 'User', 'globalStorage', 'storage.json'),
  wsl: path.join(homeDir, '.cursor', 'mcp.json'),
  configKey: 'mcpServers',
  isWSL: isWSL
};

// Handle WSL-specific paths
let configPath = cursorConfig[platform];
if (isWSL && cursorConfig.wsl) {
  configPath = cursorConfig.wsl;
  console.log('🐧 WSL detected, using WSL path');
}

console.log('\n=== Detected Paths ===');
console.log('Selected path:', configPath);
console.log('Path exists:', fs.existsSync(configPath));
console.log('Directory exists:', fs.existsSync(path.dirname(configPath)));

// Check alternative paths
const altPaths = [
  path.join(homeDir, '.cursor', 'mcp_servers.json'),
  path.join(homeDir, '.cursor', 'config.json'),
  path.join(homeDir, '.cursor-server', 'data', 'User', 'settings.json'),
  path.join(homeDir, 'Library', 'Application Support', 'Cursor', 'User', 'settings.json'),
  path.join(process.env.APPDATA || '', 'Cursor', 'User', 'settings.json'),
  path.join(homeDir, '.config', 'Cursor', 'User', 'settings.json')
];

console.log('\n=== Alternative Paths ===');
altPaths.forEach((altPath, i) => {
  console.log(`${i + 1}. ${altPath}`);
  console.log(`   Exists: ${fs.existsSync(altPath)}`);
  console.log(`   Dir exists: ${fs.existsSync(path.dirname(altPath))}`);
});