#!/usr/bin/env node

// Debug script to help troubleshoot MCP installation issues
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import os from 'os';

console.log('🔍 Like-I-Said MCP Server Installation Debugger');
console.log('==============================================\n');

// Check Node.js version
console.log('📋 Environment Information:');
console.log(`Node.js version: ${process.version}`);
console.log(`Platform: ${process.platform}`);
console.log(`Architecture: ${process.arch}`);
console.log(`Current directory: ${process.cwd()}\n`);

// Check if package.json exists
const packagePath = path.join(process.cwd(), 'package.json');
if (fs.existsSync(packagePath)) {
  try {
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    console.log('📦 Package Information:');
    console.log(`Name: ${pkg.name}`);
    console.log(`Version: ${pkg.version}`);
    console.log(`Main: ${pkg.main}\n`);
  } catch (e) {
    console.log('❌ Error reading package.json\n');
  }
} else {
  console.log('⚠️  No package.json found in current directory\n');
}

// Check for essential files
console.log('📁 File Check:');
const essentialFiles = [
  'mcp-server-wrapper.js',
  'server-markdown.js',
  'lib',
  'memories',
  'tasks'
];

essentialFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`${exists ? '✅' : '❌'} ${file}`);
});
console.log();

// Check lib directory contents
if (fs.existsSync('lib')) {
  console.log('📚 Lib Directory Contents:');
  try {
    const libFiles = fs.readdirSync('lib');
    console.log(`Found ${libFiles.length} files in lib/`);
    if (libFiles.length < 20) {
      console.log('❌ Too few files in lib/ directory - installation may be incomplete');
    } else {
      console.log('✅ Lib directory appears complete');
    }
  } catch (e) {
    console.log('❌ Error reading lib directory');
  }
  console.log();
}

// Test server startup
console.log('🧪 Testing Server Startup:');
try {
  const serverPath = path.join(process.cwd(), 'mcp-server-wrapper.js');
  if (fs.existsSync(serverPath)) {
    console.log('✅ mcp-server-wrapper.js found');
    
    // Try to run tools/list command
    console.log('🔧 Testing tools/list command...');
    try {
      const testCommand = `echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}' | node "${serverPath}"`;
      const result = execSync(testCommand, { 
        timeout: 5000,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      if (result.includes('add_memory')) {
        console.log('✅ Server responds correctly with memory tools');
      } else {
        console.log('❌ Server response does not include expected tools');
        console.log('Response:', result.substring(0, 200) + '...');
      }
    } catch (testError) {
      console.log('❌ Server test failed:', testError.message.substring(0, 100));
    }
  } else {
    console.log('❌ mcp-server-wrapper.js not found');
  }
} catch (e) {
  console.log('❌ Error testing server:', e.message);
}
console.log();

// Check Claude Desktop config
console.log('🖥️  Claude Desktop Configuration:');
const homeDir = os.homedir();
const configPaths = [
  path.join(process.env.APPDATA || '', 'Claude', 'claude_desktop_config.json'),
  path.join(homeDir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
  path.join(homeDir, '.config', 'Claude', 'claude_desktop_config.json')
];

let configFound = false;
for (const configPath of configPaths) {
  if (fs.existsSync(configPath)) {
    configFound = true;
    console.log(`✅ Config found: ${configPath}`);
    
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.mcpServers) {
        const serverNames = Object.keys(config.mcpServers);
        console.log(`   Configured servers: ${serverNames.join(', ')}`);
        
        if (config.mcpServers['like-i-said-memory-v2']) {
          const serverConfig = config.mcpServers['like-i-said-memory-v2'];
          console.log(`   Server command: ${serverConfig.command}`);
          console.log(`   Server args: ${JSON.stringify(serverConfig.args)}`);
          
          // Check if the server file exists
          const serverFile = serverConfig.args[0];
          if (serverFile && fs.existsSync(serverFile)) {
            console.log(`   ✅ Server file exists: ${serverFile}`);
          } else {
            console.log(`   ❌ Server file missing: ${serverFile}`);
          }
        } else {
          console.log('   ❌ like-i-said-memory-v2 not found in config');
        }
      } else {
        console.log('   ❌ No mcpServers section in config');
      }
    } catch (e) {
      console.log('   ❌ Error parsing config file');
    }
    break;
  }
}

if (!configFound) {
  console.log('❌ No Claude Desktop config file found');
}
console.log();

// Recommendations
console.log('💡 Troubleshooting Recommendations:');
console.log('1. Ensure you ran: npx -p @endlessblink/like-i-said-v2@2.6.1 like-i-said-v2 install');
console.log('2. Check that all essential files exist (especially lib/ directory)');
console.log('3. Verify Claude Desktop config points to correct server file');
console.log('4. Restart Claude Desktop completely after installation');
console.log('5. If issues persist, try a clean installation in a new directory');