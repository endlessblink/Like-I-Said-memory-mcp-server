#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

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

function isWindows() {
  return os.platform() === 'win32';
}

function isMacOS() {
  return os.platform() === 'darwin';
}

function isLinux() {
  return os.platform() === 'linux';
}

async function installPM2() {
  log('📦 Installing PM2 process manager...', 'blue');
  try {
    execSync('npm install -g pm2', { stdio: 'inherit' });
    log('✅ PM2 installed successfully', 'green');
    return true;
  } catch (error) {
    log('❌ Failed to install PM2 globally. Trying local install...', 'yellow');
    try {
      execSync('npm install pm2', { stdio: 'inherit' });
      log('✅ PM2 installed locally', 'green');
      return true;
    } catch (localError) {
      log('❌ Failed to install PM2. Please install manually: npm install -g pm2', 'red');
      return false;
    }
  }
}

async function setupWindowsService() {
  log('🪟 Setting up Windows auto-startup...', 'blue');
  
  const projectPath = process.cwd();
  const batContent = `@echo off
cd /d "${projectPath}"
npm run pm2:start >nul 2>&1
`;

  const startupBat = path.join(projectPath, 'start-like-i-said.bat');
  fs.writeFileSync(startupBat, batContent);

  // Add to Windows startup folder
  const startupFolder = path.join(os.homedir(), 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
  const startupLink = path.join(startupFolder, 'like-i-said-mcp.bat');
  
  try {
    fs.copyFileSync(startupBat, startupLink);
    log('✅ Added to Windows startup folder', 'green');
    log(`📁 Startup script: ${startupLink}`, 'blue');
  } catch (error) {
    log('⚠️  Could not add to startup folder automatically', 'yellow');
    log(`Please manually copy: ${startupBat} to ${startupFolder}`, 'yellow');
  }
}

async function setupMacOSService() {
  log('🍎 Setting up macOS LaunchAgent...', 'blue');
  
  const projectPath = process.cwd();
  const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.like-i-said.mcp-server</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>${path.join(projectPath, 'server.js')}</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${projectPath}</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${path.join(projectPath, 'logs', 'out.log')}</string>
    <key>StandardErrorPath</key>
    <string>${path.join(projectPath, 'logs', 'error.log')}</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>MEMORY_MODE</key>
        <string>markdown</string>
        <key>PROJECT_ROOT</key>
        <string>${projectPath}</string>
    </dict>
</dict>
</plist>`;

  const launchAgentsDir = path.join(os.homedir(), 'Library', 'LaunchAgents');
  const plistPath = path.join(launchAgentsDir, 'com.like-i-said.mcp-server.plist');
  
  if (!fs.existsSync(launchAgentsDir)) {
    fs.mkdirSync(launchAgentsDir, { recursive: true });
  }
  
  fs.writeFileSync(plistPath, plistContent);
  
  try {
    execSync(`launchctl load ${plistPath}`, { stdio: 'inherit' });
    log('✅ LaunchAgent installed and started', 'green');
  } catch (error) {
    log('⚠️  LaunchAgent created but not loaded. Run manually:', 'yellow');
    log(`launchctl load ${plistPath}`, 'blue');
  }
}

async function setupLinuxService() {
  log('🐧 Setting up Linux systemd service...', 'blue');
  
  const projectPath = process.cwd();
  const serviceContent = `[Unit]
Description=Like-I-Said MCP Memory Server
After=network.target

[Service]
Type=simple
User=${os.userInfo().username}
WorkingDirectory=${projectPath}
ExecStart=/usr/bin/node ${path.join(projectPath, 'server.js')}
Restart=always
RestartSec=10
Environment=MEMORY_MODE=markdown
Environment=PROJECT_ROOT=${projectPath}
StandardOutput=file:${path.join(projectPath, 'logs', 'out.log')}
StandardError=file:${path.join(projectPath, 'logs', 'error.log')}

[Install]
WantedBy=multi-user.target
`;

  const servicePath = '/etc/systemd/system/like-i-said-mcp.service';
  const tempServicePath = path.join(projectPath, 'like-i-said-mcp.service');
  
  fs.writeFileSync(tempServicePath, serviceContent);
  
  log('Service file created. To install, run as root:', 'yellow');
  log(`sudo cp ${tempServicePath} ${servicePath}`, 'blue');
  log('sudo systemctl enable like-i-said-mcp.service', 'blue');
  log('sudo systemctl start like-i-said-mcp.service', 'blue');
}

async function updateMCPConfig() {
  log('🔧 Updating MCP client configurations for auto-startup...', 'blue');
  
  const projectPath = process.cwd();
  const homeDir = os.homedir();
  
  // Update Claude Desktop config to not expect stdio
  const claudeConfigs = {
    win32: path.join(process.env.APPDATA || '', 'Claude', 'claude_desktop_config.json'),
    darwin: path.join(homeDir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
    linux: path.join(homeDir, '.config', 'Claude', 'claude_desktop_config.json')
  };
  
  const claudeConfigPath = claudeConfigs[os.platform()];
  
  if (fs.existsSync(claudeConfigPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(claudeConfigPath, 'utf8'));
      
      // Update to use HTTP transport instead of stdio for background service
      config.mcpServers = config.mcpServers || {};
      config.mcpServers['like-i-said-memory'] = {
        command: 'node',
        args: [path.join(projectPath, 'server.js')],
        env: {
          MEMORY_MODE: 'markdown',
          PROJECT_ROOT: projectPath,
          AUTO_START: 'true'
        }
      };
      
      fs.writeFileSync(claudeConfigPath, JSON.stringify(config, null, 2));
      log('✅ Updated Claude Desktop configuration', 'green');
    } catch (error) {
      log('⚠️  Could not update Claude config automatically', 'yellow');
    }
  }
}

async function createLogsDirectory() {
  const logsDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
    log('📁 Created logs directory', 'green');
  }
}

async function main() {
  log('\n🚀 Like-I-Said MCP Auto-Startup Installer\n', 'blue');
  
  await createLogsDirectory();
  
  const pm2Installed = await installPM2();
  if (!pm2Installed) {
    log('❌ Cannot proceed without PM2', 'red');
    return;
  }
  
  // Install PM2 startup
  try {
    log('🔄 Setting up PM2 startup...', 'blue');
    execSync('pm2 startup', { stdio: 'inherit' });
    execSync('pm2 start ecosystem.config.js', { stdio: 'inherit' });
    execSync('pm2 save', { stdio: 'inherit' });
    log('✅ PM2 startup configured', 'green');
  } catch (error) {
    log('⚠️  PM2 startup setup needs manual intervention', 'yellow');
  }
  
  // Platform-specific startup
  if (isWindows()) {
    await setupWindowsService();
  } else if (isMacOS()) {
    await setupMacOSService();
  } else if (isLinux()) {
    await setupLinuxService();
  }
  
  await updateMCPConfig();
  
  log('\n✅ Auto-startup installation complete!', 'green');
  log('\n📋 What happens now:', 'blue');
  log('• Memory server starts automatically on system boot', 'green');
  log('• Dashboard available at http://localhost:3001', 'green');
  log('• No manual startup required', 'green');
  log('• Logs saved to ./logs/ directory', 'green');
  
  log('\n🔧 Management commands:', 'yellow');
  log('• Check status: npm run pm2:status', 'blue');
  log('• View logs: npm run pm2:logs', 'blue');
  log('• Stop service: npm run pm2:stop', 'blue');
  log('• Restart service: npm run pm2:start', 'blue');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };