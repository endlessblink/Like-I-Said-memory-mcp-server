#!/usr/bin/env node

/**
 * MCP Health Monitor & Process Manager
 * 
 * Prevents MCP server process leaks and API Error 500 issues
 * Usage: node mcp-health-monitor.js [action]
 * Actions: status, cleanup, restart, monitor
 */

import { spawn, exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MCPHealthMonitor {
    constructor() {
        this.processPatterns = [
            'server-markdown.js',
            'context7-mcp',
            'mcp-server-sequential-thinking',
            'mcp-server-playwright'
        ];
        
        this.maxProcesses = {
            'server-markdown.js': 1,
            'context7-mcp': 3, // Allow multiple Claude sessions
            'mcp-server-sequential-thinking': 3,
            'mcp-server-playwright': 3
        };
        
        this.logFile = '/tmp/mcp-health-monitor.log';
    }

    log(message) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}\n`;
        console.log(logMessage.trim());
        
        try {
            fs.appendFileSync(this.logFile, logMessage);
        } catch (err) {
            console.error('Failed to write to log file:', err.message);
        }
    }

    async getProcesses() {
        return new Promise((resolve, reject) => {
            exec('ps aux', (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                    return;
                }

                const processes = [];
                const lines = stdout.split('\n');
                
                for (const line of lines) {
                    for (const pattern of this.processPatterns) {
                        if (line.includes(pattern) && !line.includes('grep')) {
                            const parts = line.trim().split(/\s+/);
                            processes.push({
                                pid: parts[1],
                                pattern: pattern,
                                command: parts.slice(10).join(' '),
                                cpu: parts[2],
                                mem: parts[3]
                            });
                        }
                    }
                }

                resolve(processes);
            });
        });
    }

    async checkHealth() {
        const processes = await this.getProcesses();
        const status = {
            healthy: true,
            issues: [],
            processes: {}
        };

        // Group processes by pattern
        for (const pattern of this.processPatterns) {
            status.processes[pattern] = processes.filter(p => p.pattern === pattern);
        }

        // Check for process leaks
        for (const [pattern, maxCount] of Object.entries(this.maxProcesses)) {
            const count = status.processes[pattern].length;
            if (count > maxCount) {
                status.healthy = false;
                status.issues.push(`Process leak detected: ${count} instances of ${pattern} (max: ${maxCount})`);
            }
        }

        // Check for zombie/stuck processes
        for (const process of processes) {
            const cpu = parseFloat(process.cpu);
            const mem = parseFloat(process.mem);
            
            if (cpu > 50 || mem > 10) {
                status.healthy = false;
                status.issues.push(`High resource usage: PID ${process.pid} (${process.pattern}) - CPU: ${cpu}%, MEM: ${mem}%`);
            }
        }

        return status;
    }

    async cleanup() {
        this.log('Starting MCP process cleanup...');
        const processes = await this.getProcesses();
        
        // Kill excessive processes (keep only the most recent ones)
        for (const [pattern, maxCount] of Object.entries(this.maxProcesses)) {
            const patternProcesses = processes.filter(p => p.pattern === pattern);
            
            if (patternProcesses.length > maxCount) {
                // Kill older processes (sort by PID, assuming higher PID = newer)
                patternProcesses.sort((a, b) => parseInt(b.pid) - parseInt(a.pid));
                const toKill = patternProcesses.slice(maxCount);
                
                for (const process of toKill) {
                    this.log(`Killing excessive process: PID ${process.pid} (${process.pattern})`);
                    try {
                        process.kill(parseInt(process.pid), 'SIGTERM');
                        // Wait a bit, then force kill if still running
                        setTimeout(() => {
                            try {
                                process.kill(parseInt(process.pid), 'SIGKILL');
                            } catch (err) {
                                // Process already dead, ignore
                            }
                        }, 5000);
                    } catch (err) {
                        this.log(`Failed to kill PID ${process.pid}: ${err.message}`);
                    }
                }
            }
        }

        this.log('Cleanup completed');
    }

    async restart() {
        this.log('Restarting Like-I-Said MCP server...');
        
        // Kill existing Like-I-Said servers
        const processes = await this.getProcesses();
        const likeISaidProcesses = processes.filter(p => p.pattern === 'server-markdown.js');
        
        for (const process of likeISaidProcesses) {
            this.log(`Stopping existing server: PID ${process.pid}`);
            try {
                process.kill(parseInt(process.pid), 'SIGTERM');
            } catch (err) {
                this.log(`Failed to stop PID ${process.pid}: ${err.message}`);
            }
        }

        // Wait for processes to die
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Clean up database files
        const dbFiles = [
            '/mnt/d/APPSNospaces/like-i-said-mcp/data/tasks-v3.db',
            '/mnt/d/APPSNospaces/like-i-said-mcp/data/tasks-v3.db-shm',
            '/mnt/d/APPSNospaces/like-i-said-mcp/data/tasks-v3.db-wal'
        ];

        for (const dbFile of dbFiles) {
            try {
                if (fs.existsSync(dbFile)) {
                    fs.unlinkSync(dbFile);
                    this.log(`Cleaned up database file: ${dbFile}`);
                }
            } catch (err) {
                this.log(`Failed to clean ${dbFile}: ${err.message}`);
            }
        }

        this.log('MCP server restart completed');
    }

    async monitor() {
        this.log('Starting continuous monitoring...');
        
        setInterval(async () => {
            try {
                const health = await this.checkHealth();
                
                if (!health.healthy) {
                    this.log(`Health check failed: ${health.issues.join(', ')}`);
                    await this.cleanup();
                } else {
                    this.log('Health check passed - all systems normal');
                }
            } catch (err) {
                this.log(`Health check error: ${err.message}`);
            }
        }, 30000); // Check every 30 seconds
    }

    async status() {
        const processes = await this.getProcesses();
        const health = await this.checkHealth();
        
        console.log('\n=== MCP HEALTH STATUS ===');
        console.log(`Overall Status: ${health.healthy ? '✅ HEALTHY' : '❌ UNHEALTHY'}`);
        
        if (health.issues.length > 0) {
            console.log('\n🚨 Issues Detected:');
            health.issues.forEach(issue => console.log(`  - ${issue}`));
        }
        
        console.log('\n📊 Process Summary:');
        for (const [pattern, procs] of Object.entries(health.processes)) {
            const max = this.maxProcesses[pattern] || 'unlimited';
            const status = procs.length <= (this.maxProcesses[pattern] || Infinity) ? '✅' : '❌';
            console.log(`  ${status} ${pattern}: ${procs.length} running (max: ${max})`);
            
            if (procs.length > 0) {
                procs.forEach(proc => {
                    console.log(`    - PID ${proc.pid}: CPU ${proc.cpu}%, MEM ${proc.mem}%`);
                });
            }
        }

        console.log(`\n📝 Log file: ${this.logFile}`);
        return health;
    }
}

// CLI Interface
async function main() {
    const monitor = new MCPHealthMonitor();
    const action = process.argv[2] || 'status';
    
    try {
        switch (action) {
            case 'status':
                await monitor.status();
                break;
            case 'cleanup':
                await monitor.cleanup();
                break;
            case 'restart':
                await monitor.restart();
                break;
            case 'monitor':
                await monitor.monitor();
                break;
            default:
                console.log('Usage: node mcp-health-monitor.js [status|cleanup|restart|monitor]');
                process.exit(1);
        }
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export default MCPHealthMonitor;