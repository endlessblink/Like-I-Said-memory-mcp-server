#!/usr/bin/env node

/**
 * MCP Guardian - Safeguard system to monitor and manage problematic MCP servers
 * Automatically disables failing MCP servers to prevent Claude Code crashes
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class MCPGuardian {
    constructor() {
        this.configPath = path.join(process.env.HOME, '.claude.json');
        this.guardianConfigPath = path.join(process.env.HOME, '.claude', 'guardian-config.json');
        this.logPath = path.join(process.env.HOME, '.claude', 'guardian.log');
        
        // Default guardian settings
        this.settings = {
            maxFailures: 3,           // Max failures before disabling
            failureWindow: 300000,    // 5 minutes window for failures
            retryDelay: 60000,        // 1 minute before retry
            maxRetries: 3,            // Max retry attempts
            healthCheckInterval: 30000, // 30 seconds health check
            enabled: true
        };
        
        this.serverStatus = new Map(); // Track server health
        this.loadSettings();
        this.ensureDirectories();
    }

    ensureDirectories() {
        const claudeDir = path.dirname(this.guardianConfigPath);
        if (!fs.existsSync(claudeDir)) {
            fs.mkdirSync(claudeDir, { recursive: true });
        }
    }

    loadSettings() {
        try {
            if (fs.existsSync(this.guardianConfigPath)) {
                const config = JSON.parse(fs.readFileSync(this.guardianConfigPath, 'utf8'));
                this.settings = { ...this.settings, ...config.settings };
                this.serverStatus = new Map(config.serverStatus || []);
            }
        } catch (error) {
            this.log('ERROR', `Failed to load guardian config: ${error.message}`);
        }
    }

    saveSettings() {
        try {
            const config = {
                settings: this.settings,
                serverStatus: Array.from(this.serverStatus.entries()),
                lastUpdated: new Date().toISOString()
            };
            fs.writeFileSync(this.guardianConfigPath, JSON.stringify(config, null, 2));
        } catch (error) {
            this.log('ERROR', `Failed to save guardian config: ${error.message}`);
        }
    }

    log(level, message) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [${level}] ${message}\n`;
        
        console.log(logEntry.trim());
        
        try {
            fs.appendFileSync(this.logPath, logEntry);
        } catch (error) {
            console.error('Failed to write to log file:', error.message);
        }
    }

    async loadClaudeConfig() {
        try {
            const config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
            return config;
        } catch (error) {
            this.log('ERROR', `Failed to load Claude config: ${error.message}`);
            return null;
        }
    }

    async saveClaudeConfig(config) {
        try {
            // Backup current config
            const backupPath = `${this.configPath}.guardian-backup.${Date.now()}`;
            fs.copyFileSync(this.configPath, backupPath);
            
            // Save new config
            fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
            this.log('INFO', 'Claude config updated successfully');
            return true;
        } catch (error) {
            this.log('ERROR', `Failed to save Claude config: ${error.message}`);
            return false;
        }
    }

    async testMCPServer(serverName, serverConfig) {
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                resolve({ success: false, error: 'Timeout' });
            }, 10000); // 10 second timeout

            try {
                const proc = spawn(serverConfig.command, serverConfig.args || [], {
                    env: { ...process.env, ...serverConfig.env },
                    stdio: ['pipe', 'pipe', 'pipe']
                });

                let hasResponded = false;

                proc.on('error', (error) => {
                    if (!hasResponded) {
                        hasResponded = true;
                        clearTimeout(timeout);
                        resolve({ success: false, error: error.message });
                    }
                });

                proc.on('exit', (code) => {
                    if (!hasResponded) {
                        hasResponded = true;
                        clearTimeout(timeout);
                        resolve({ 
                            success: code === 0, 
                            error: code !== 0 ? `Process exited with code ${code}` : null 
                        });
                    }
                });

                // Send MCP tools/list request
                const testRequest = JSON.stringify({
                    jsonrpc: "2.0",
                    id: 1,
                    method: "tools/list"
                });

                proc.stdin.write(testRequest + '\n');

                let responseData = '';
                proc.stdout.on('data', (data) => {
                    responseData += data.toString();
                    
                    try {
                        const response = JSON.parse(responseData);
                        if (response.id === 1) {
                            if (!hasResponded) {
                                hasResponded = true;
                                clearTimeout(timeout);
                                proc.kill();
                                resolve({ 
                                    success: !response.error, 
                                    error: response.error ? response.error.message : null 
                                });
                            }
                        }
                    } catch (e) {
                        // Incomplete JSON, continue reading
                    }
                });

                // Cleanup after timeout
                setTimeout(() => {
                    if (proc && !proc.killed) {
                        proc.kill();
                    }
                }, 10000);

            } catch (error) {
                clearTimeout(timeout);
                resolve({ success: false, error: error.message });
            }
        });
    }

    getServerHealth(serverName) {
        if (!this.serverStatus.has(serverName)) {
            this.serverStatus.set(serverName, {
                failures: [],
                disabled: false,
                lastCheck: null,
                retryCount: 0,
                lastRetry: null
            });
        }
        return this.serverStatus.get(serverName);
    }

    recordFailure(serverName, error) {
        const health = this.getServerHealth(serverName);
        const now = Date.now();
        
        // Add failure to list
        health.failures.push({ timestamp: now, error });
        health.lastCheck = now;
        
        // Remove old failures outside the window
        health.failures = health.failures.filter(
            f => now - f.timestamp <= this.settings.failureWindow
        );

        this.log('WARNING', `MCP server '${serverName}' failed: ${error}`);
        
        // Check if we should disable the server
        if (health.failures.length >= this.settings.maxFailures && !health.disabled) {
            health.disabled = true;
            health.retryCount = 0;
            this.log('ERROR', `Disabling MCP server '${serverName}' due to ${health.failures.length} failures`);
            return true; // Should disable
        }
        
        return false; // Don't disable yet
    }

    recordSuccess(serverName) {
        const health = this.getServerHealth(serverName);
        health.failures = []; // Clear failures on success
        health.lastCheck = Date.now();
        health.retryCount = 0;
        
        if (health.disabled) {
            health.disabled = false;
            this.log('INFO', `Re-enabled MCP server '${serverName}' after successful health check`);
        }
    }

    async disableServer(serverName) {
        const config = await this.loadClaudeConfig();
        if (!config) return false;

        // Move server to disabled section
        if (!config.disabledMcpServers) {
            config.disabledMcpServers = {};
        }

        if (config.mcpServers && config.mcpServers[serverName]) {
            config.disabledMcpServers[serverName] = {
                ...config.mcpServers[serverName],
                disabledAt: new Date().toISOString(),
                disabledReason: 'Automatic disable due to failures'
            };
            delete config.mcpServers[serverName];
        }

        // Also check project-specific servers
        if (config.projects) {
            for (const projectPath in config.projects) {
                const project = config.projects[projectPath];
                if (project.mcpServers && project.mcpServers[serverName]) {
                    if (!project.disabledMcpServers) {
                        project.disabledMcpServers = {};
                    }
                    project.disabledMcpServers[serverName] = {
                        ...project.mcpServers[serverName],
                        disabledAt: new Date().toISOString(),
                        disabledReason: 'Automatic disable due to failures'
                    };
                    delete project.mcpServers[serverName];
                }
            }
        }

        return await this.saveClaudeConfig(config);
    }

    async enableServer(serverName) {
        const config = await this.loadClaudeConfig();
        if (!config) return false;

        let restored = false;

        // Restore from global disabled servers
        if (config.disabledMcpServers && config.disabledMcpServers[serverName]) {
            if (!config.mcpServers) config.mcpServers = {};
            
            const serverConfig = { ...config.disabledMcpServers[serverName] };
            delete serverConfig.disabledAt;
            delete serverConfig.disabledReason;
            
            config.mcpServers[serverName] = serverConfig;
            delete config.disabledMcpServers[serverName];
            restored = true;
        }

        // Restore from project-specific disabled servers
        if (config.projects) {
            for (const projectPath in config.projects) {
                const project = config.projects[projectPath];
                if (project.disabledMcpServers && project.disabledMcpServers[serverName]) {
                    if (!project.mcpServers) project.mcpServers = {};
                    
                    const serverConfig = { ...project.disabledMcpServers[serverName] };
                    delete serverConfig.disabledAt;
                    delete serverConfig.disabledReason;
                    
                    project.mcpServers[serverName] = serverConfig;
                    delete project.disabledMcpServers[serverName];
                    restored = true;
                }
            }
        }

        if (restored) {
            const health = this.getServerHealth(serverName);
            health.disabled = false;
            health.failures = [];
            this.log('INFO', `Manually re-enabled MCP server '${serverName}'`);
            return await this.saveClaudeConfig(config);
        }

        return false;
    }

    async healthCheck() {
        if (!this.settings.enabled) return;

        const config = await this.loadClaudeConfig();
        if (!config || !config.mcpServers) return;

        this.log('INFO', 'Starting MCP health check');

        const promises = Object.entries(config.mcpServers).map(async ([serverName, serverConfig]) => {
            const health = this.getServerHealth(serverName);
            
            // Skip if recently checked and healthy
            if (health.lastCheck && Date.now() - health.lastCheck < this.settings.healthCheckInterval) {
                return;
            }

            const result = await this.testMCPServer(serverName, serverConfig);
            
            if (result.success) {
                this.recordSuccess(serverName);
            } else {
                const shouldDisable = this.recordFailure(serverName, result.error);
                if (shouldDisable) {
                    await this.disableServer(serverName);
                }
            }
        });

        await Promise.all(promises);
        this.saveSettings();
    }

    async startMonitoring() {
        if (!this.settings.enabled) {
            this.log('INFO', 'MCP Guardian is disabled');
            return;
        }

        this.log('INFO', 'Starting MCP Guardian monitoring');
        
        // Initial health check
        await this.healthCheck();
        
        // Set up periodic health checks
        setInterval(async () => {
            await this.healthCheck();
        }, this.settings.healthCheckInterval);
    }

    async status() {
        const config = await this.loadClaudeConfig();
        console.log('\n=== MCP Guardian Status ===');
        console.log(`Enabled: ${this.settings.enabled}`);
        console.log(`Max Failures: ${this.settings.maxFailures}`);
        console.log(`Failure Window: ${this.settings.failureWindow / 1000}s`);
        
        console.log('\n=== Active MCP Servers ===');
        if (config.mcpServers) {
            for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
                const health = this.getServerHealth(name);
                console.log(`${name}: ${health.failures.length} failures, last check: ${health.lastCheck ? new Date(health.lastCheck).toLocaleString() : 'never'}`);
            }
        }

        console.log('\n=== Disabled MCP Servers ===');
        if (config.disabledMcpServers) {
            for (const [name, serverConfig] of Object.entries(config.disabledMcpServers)) {
                console.log(`${name}: disabled at ${new Date(serverConfig.disabledAt).toLocaleString()}`);
            }
        }
    }
}

// CLI interface
async function main() {
    const guardian = new MCPGuardian();
    const command = process.argv[2];

    switch (command) {
        case 'start':
            await guardian.startMonitoring();
            break;
        case 'status':
            await guardian.status();
            break;
        case 'check':
            await guardian.healthCheck();
            console.log('Health check completed');
            break;
        case 'enable':
            const enableServer = process.argv[3];
            if (!enableServer) {
                console.error('Usage: mcp-guardian enable <server-name>');
                process.exit(1);
            }
            const enabled = await guardian.enableServer(enableServer);
            console.log(enabled ? `Enabled ${enableServer}` : `Failed to enable ${enableServer}`);
            break;
        case 'disable':
            const disableServer = process.argv[3];
            if (!disableServer) {
                console.error('Usage: mcp-guardian disable <server-name>');
                process.exit(1);
            }
            const disabled = await guardian.disableServer(disableServer);
            console.log(disabled ? `Disabled ${disableServer}` : `Failed to disable ${disableServer}`);
            break;
        default:
            console.log(`
MCP Guardian - Safeguard system for MCP servers

Usage:
  mcp-guardian start           Start monitoring (runs continuously)
  mcp-guardian status          Show status of all MCP servers
  mcp-guardian check           Run one-time health check
  mcp-guardian enable <name>   Re-enable a disabled server
  mcp-guardian disable <name>  Manually disable a server

The guardian will automatically disable servers that fail too many times
and can re-enable them once they're working again.
            `);
            break;
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = MCPGuardian;