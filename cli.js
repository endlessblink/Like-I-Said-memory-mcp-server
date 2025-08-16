#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Detect OS and MCP client configurations
function detectEnvironment() {
  const platform = process.platform;
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  
  const configs = {
    'claude-desktop': {
      name: 'Claude Desktop',
      darwin: path.join(homeDir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
      win32: path.join(process.env.APPDATA || '', 'Claude', 'claude_desktop_config.json'),
      linux: path.join(homeDir, '.config', 'Claude', 'claude_desktop_config.json'),
      configKey: 'mcpServers'
    },
    'claude-code': {
      name: 'Claude Code (VS Code Extension)',
      darwin: path.join(homeDir, 'Library', 'Application Support', 'Code', 'User', 'settings.json'),
      win32: path.join(process.env.APPDATA || '', 'Code', 'User', 'settings.json'),
      linux: path.join(homeDir, '.config', 'Code', 'User', 'settings.json'),
      configKey: 'claude.mcpServers',
      isVSCode: true
    },
    'cursor': {
      name: 'Cursor',
      darwin: path.join(homeDir, 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'storage.json'),
      win32: path.join(process.env.APPDATA || '', 'Cursor', 'User', 'globalStorage', 'storage.json'),
      linux: path.join(homeDir, '.config', 'Cursor', 'User', 'globalStorage', 'storage.json'),
      configKey: 'mcpServers',
      altPaths: [
        // Alternative paths to check
        path.join(homeDir, '.cursor', 'mcp_servers.json'),
        path.join(homeDir, '.cursor', 'config.json'),
        path.join(homeDir, 'Library', 'Application Support', 'Cursor', 'User', 'settings.json'),
        path.join(process.env.APPDATA || '', 'Cursor', 'User', 'settings.json'),
        path.join(homeDir, '.config', 'Cursor', 'User', 'settings.json')
      ]
    },
    'windsurf': {
      name: 'Windsurf',
      darwin: path.join(homeDir, 'Library', 'Application Support', 'Windsurf', 'User', 'settings.json'),
      win32: path.join(process.env.APPDATA || '', 'Windsurf', 'User', 'settings.json'),
      linux: path.join(homeDir, '.config', 'Windsurf', 'User', 'settings.json'),
      configKey: 'mcp.servers',
      isVSCode: true
    },
    'continue': {
      name: 'Continue (VS Code)',
      darwin: path.join(homeDir, '.continue', 'config.json'),
      win32: path.join(homeDir, '.continue', 'config.json'),
      linux: path.join(homeDir, '.continue', 'config.json'),
      configKey: 'mcpServers'
    },
    'zed': {
      name: 'Zed Editor',
      darwin: path.join(homeDir, '.config', 'zed', 'settings.json'),
      win32: path.join(homeDir, 'AppData', 'Roaming', 'Zed', 'settings.json'),
      linux: path.join(homeDir, '.config', 'zed', 'settings.json'),
      configKey: 'assistant.mcp_servers'
    },
    'codeium': {
      name: 'Codeium',
      darwin: path.join(homeDir, '.codeium', 'config.json'),
      win32: path.join(homeDir, '.codeium', 'config.json'),
      linux: path.join(homeDir, '.codeium', 'config.json'),
      configKey: 'mcpServers'
    }
  };

  const detectedConfigs = {};
  Object.keys(configs).forEach(client => {
    const config = configs[client];
    let configPath = config[platform];
    let exists = false;

    // Check main path
    if (configPath && fs.existsSync(path.dirname(configPath))) {
      exists = true;
    }
    
    // Check alternative paths if main path doesn't exist
    if (!exists && config.altPaths) {
      for (const altPath of config.altPaths) {
        if (altPath && fs.existsSync(path.dirname(altPath))) {
          configPath = altPath;
          exists = true;
          break;
        }
      }
    }

    detectedConfigs[client] = {
      ...config,
      path: configPath,
      exists
    };
  });

  return {
    platform,
    homeDir,
    configs: detectedConfigs
  };
}

// Initialize memory structure
async function initializeMemoryStructure() {
  const dirs = [
    'memories',
    'memories/global',
    'memories/projects',
    '.like-i-said'
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      log(`✓ Created ${dir}`, 'green');
    }
  }

  // Create default global memories
  const globalReadme = path.join('memories', 'global', 'README.md');
  if (!fs.existsSync(globalReadme)) {
    fs.writeFileSync(globalReadme, `# Global Memories

This directory contains memories that are accessible across all projects.

## Usage
- System preferences
- User information
- Global configurations
- Shared knowledge

## Format
Each memory is stored as a Markdown file with frontmatter metadata.
`);
    log('✓ Created global memory structure', 'green');
  }

  // Create config file
  const config = {
    version: '2.0.0',
    storage: {
      type: 'markdown',
      directory: 'memories'
    },
    security: {
      sandboxed: true,
      allowedPaths: ['memories/**/*.md']
    },
    features: {
      projectIsolation: true,
      graphVisualization: true,
      autoBackup: true
    }
  };

  fs.writeFileSync('.like-i-said/config.json', JSON.stringify(config, null, 2));
  log('✓ Created configuration', 'green');
}

// Configure MCP clients
async function configureMCPClient(clientKey, clientConfig) {
  const projectPath = process.cwd();
  const configPath = clientConfig.path;
  
  if (!configPath) {
    log(`Skipping ${clientConfig.name}: No config path for platform`, 'yellow');
    return false;
  }

  let config = {};
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (e) {
      log(`Warning: Could not parse existing ${clientConfig.name} config`, 'yellow');
    }
  }

  // Create server configuration
  const serverConfig = {
    command: 'node',
    args: [path.join(projectPath, 'server-wrapper.js')],
    env: {
      MEMORY_MODE: 'markdown',
      PROJECT_ROOT: projectPath
    }
  };

  // Handle different client configuration formats
  const configKeys = clientConfig.configKey.split('.');
  let targetConfig = config;

  // Navigate/create nested structure
  for (let i = 0; i < configKeys.length - 1; i++) {
    if (!targetConfig[configKeys[i]]) {
      targetConfig[configKeys[i]] = {};
    }
    targetConfig = targetConfig[configKeys[i]];
  }

  const finalKey = configKeys[configKeys.length - 1];
  if (!targetConfig[finalKey]) {
    targetConfig[finalKey] = {};
  }

  // Special handling for different client types
  if (clientConfig.isVSCode) {
    // VS Code style configuration
    if (clientKey === 'claude-code') {
      targetConfig[finalKey]['like-i-said-memory'] = {
        command: serverConfig.command,
        args: serverConfig.args,
        env: serverConfig.env
      };
    } else if (clientKey === 'windsurf') {
      targetConfig[finalKey]['like-i-said-memory'] = {
        command: serverConfig.command,
        args: serverConfig.args,
        env: serverConfig.env
      };
    }
  } else if (clientKey === 'cursor') {
    // Cursor-specific configuration
    targetConfig[finalKey]['like-i-said-memory'] = {
      command: serverConfig.command,
      args: serverConfig.args,
      env: serverConfig.env,
      description: "Like-I-Said Memory Server - Persistent AI memory across conversations"
    };
  } else {
    // Standard MCP configuration
    targetConfig[finalKey]['like-i-said-memory'] = serverConfig;
  }

  // Ensure directory exists
  const configDir = path.dirname(configPath);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  // Write configuration
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  log(`✓ Configured ${clientConfig.name}`, 'green');
  return true;
}

// Main setup flow
async function main() {
  log('\n🧠 Like-I-Said Memory MCP Server Setup\n', 'blue');

  const env = detectEnvironment();
  log(`Detected OS: ${env.platform}`, 'blue');

  // Check if already in a project
  const isGitRepo = fs.existsSync('.git');
  const projectName = isGitRepo ? 
    path.basename(process.cwd()) : 
    await new Promise(resolve => {
      rl.question('Project name (or press Enter for global): ', resolve);
    });

  log('\n📁 Initializing memory structure...', 'blue');
  await initializeMemoryStructure();

  // Install dependencies if needed
  if (!fs.existsSync('node_modules')) {
    log('\n📦 Installing dependencies...', 'blue');
    execSync('npm install', { stdio: 'inherit' });
  }

  // Configure MCP clients
  log('\n🔧 Detecting and configuring MCP clients...', 'blue');
  
  const availableClients = [];
  const configuredClients = [];

  // Check each client
  Object.keys(env.configs).forEach(clientKey => {
    const clientConfig = env.configs[clientKey];
    
    if (clientConfig.exists && clientConfig.path) {
      availableClients.push(clientKey);
      log(`🔍 Found: ${clientConfig.name}`, 'blue');
    }
  });

  if (availableClients.length === 0) {
    log('⚠️  No MCP clients detected.', 'yellow');
    log('\nSupported clients:', 'blue');
    log('• Claude Desktop - https://claude.ai/desktop', 'yellow');
    log('• Claude Code (VS Code Extension)', 'yellow');
    log('• Cursor - https://cursor.sh', 'yellow');
    log('• Windsurf - https://codeium.com/windsurf', 'yellow');
    log('• Continue (VS Code Extension)', 'yellow');
    log('• Zed Editor - https://zed.dev', 'yellow');
    log('• Codeium', 'yellow');
  } else {
    log(`\n📱 Configuring ${availableClients.length} detected client(s)...`, 'blue');
    
    for (const clientKey of availableClients) {
      const clientConfig = env.configs[clientKey];
      try {
        const success = await configureMCPClient(clientKey, clientConfig);
        if (success) {
          configuredClients.push(clientConfig.name);
        }
      } catch (error) {
        log(`❌ Failed to configure ${clientConfig.name}: ${error.message}`, 'red');
      }
    }

    if (configuredClients.length > 0) {
      log(`\n✅ Successfully configured: ${configuredClients.join(', ')}`, 'green');
    }
  }

  // Create project memory if specified
  if (projectName) {
    const projectDir = path.join('memories', 'projects', projectName);
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
      fs.writeFileSync(
        path.join(projectDir, 'README.md'),
        `# ${projectName} Memories\n\nProject-specific memories and context.\n`
      );
      log(`✓ Created project: ${projectName}`, 'green');
    }
  }

  log('\n✅ Setup complete!', 'green');
  log('\n🚀 How it works:', 'blue');
  log('• Memory server starts automatically when Claude/Cursor starts', 'green');
  log('• Dashboard runs in background while clients are open', 'green'); 
  log('• Everything stops when you close Claude/Cursor', 'green');
  log('• No manual startup needed!', 'green');
  
  log('\n📋 Next steps:', 'blue');
  log('1. Restart Claude Desktop or Cursor', 'yellow');
  log('2. Test: Ask Claude "Can you store a test memory?"', 'yellow');
  log('3. View dashboard: http://localhost:3001 (when running)', 'yellow');
  
  log('\n🔧 Useful commands:', 'blue');
  log('• View logs: npm run logs', 'yellow');
  log('• Manual start: npm start', 'yellow');
  log('• Web dashboard: npm run dev:full', 'yellow');
  log('• Docker setup: npm run docker:setup', 'yellow');
  
  rl.close();
}

// Handle commands
const command = process.argv[2];

switch (command) {
  case 'init':
    main().catch(console.error);
    break;
  case 'start':
    require('./server.js');
    break;
  case 'migrate':
    const { migrateFromJson } = require('./migrate.js');
    migrateFromJson().catch(console.error);
    break;
  case 'migrate:preview':
    const { showPreview } = require('./migrate.js');
    showPreview().catch(console.error);
    break;
  case 'debug:cursor':
    require('./debug-cursor.js');
    break;
  default:
    log('Like-I-Said Memory MCP Server v2.0', 'blue');
    log('\n🎯 Supported Clients:', 'green');
    log('  • Claude Desktop, Claude Code (VS Code)', 'yellow');
    log('  • Cursor, Windsurf, Continue', 'yellow');
    log('  • Zed Editor, Codeium, Docker', 'yellow');
    
    log('\n📋 Commands:', 'blue');
    log('  node cli.js init            - Auto-detect and configure all clients', 'yellow');
    log('  node cli.js start           - Start the MCP server manually', 'yellow');
    log('  node cli.js migrate:preview - Preview data migration from JSON', 'yellow');
    log('  node cli.js migrate         - Migrate existing memory.json data', 'yellow');
    
    log('\n🔧 npm scripts:', 'blue');
    log('  npm start                   - Start with auto-startup wrapper', 'yellow');
    log('  npm run dev:full            - Start web dashboard + API', 'yellow');
    log('  npm run docker:setup        - Build and run Docker container', 'yellow');
    log('  npm run logs                - View server logs', 'yellow');
    
    log('\n🚀 Quick Start:', 'green');
    log('  1. npm install', 'yellow');
    log('  2. node cli.js init', 'yellow');  
    log('  3. Restart your AI client', 'yellow');
    log('  4. Ask: "Can you store a test memory?"', 'yellow');
    
    log('\n📖 More info: https://github.com/endlessblink/like-i-said-mcp-server', 'blue');
}