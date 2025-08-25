import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * MCP Process Manager - Automatic Process Health Management
 * 
 * Prevents API Error 500 by automatically monitoring and cleaning up
 * excessive MCP server processes. Integrates directly into the MCP server
 * for zero-configuration operation.
 * 
 * Features:
 * - Automatic process leak detection
 * - Smart cleanup of excessive processes  
 * - Resource usage monitoring
 * - Self-healing capabilities
 * - Transparent operation
 */
export class MCPProcessManager {
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
    this.verbose = options.verbose === true;
    this.dryRun = options.dryRun === true;
    
    // Process patterns to monitor - MORE STRICT but SAFE limits
    // These are based on what's actually needed for a single project
    this.processPatterns = {
      'server-markdown.js': { max: 1, priority: 'critical' },  // Only OUR server
      'context7-mcp': { max: 2, priority: 'high' },            // Reduced from 3
      'mcp-server-sequential-thinking': { max: 2, priority: 'high' }, // Reduced from 3
      'mcp-server-playwright': { max: 2, priority: 'medium' }, // Reduced from 3
      'mcp-server': { max: 3, priority: 'medium' }             // Reduced from 5
    };
    
    // Health thresholds - MORE AGGRESSIVE but SAFE
    this.thresholds = {
      totalProcesses: 10,    // Reduced from 15 - triggers cleanup earlier
      cpuUsage: 30,          // Reduced from 50 - catch resource hogs earlier
      memoryUsage: 8,        // Reduced from 10 - memory limits
      processAge: 1800000,   // 30 min instead of 1 hour - clean stuck processes
      emergencyThreshold: 15 // Reduced from 25 - emergency at 15 processes
    };
    
    // Internal state
    this.lastCleanup = null;
    this.cleanupCount = 0;
    this.isHealthy = true;
    this.lastHealthCheck = null;
    
    // Statistics
    this.stats = {
      processesKilled: 0,
      cleanupRuns: 0,
      healthChecks: 0,
      lastIssues: []
    };
  }

  /**
   * Log message if verbose mode is enabled
   */
  log(message, level = 'info') {
    if (this.verbose || level === 'error') {
      const timestamp = new Date().toISOString();
      const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '📊';
      console.error(`[${timestamp}] ${prefix} MCPProcessManager: ${message}`);
    }
  }

  /**
   * Get all MCP-related processes
   */
  async getProcesses() {
    try {
      const { stdout } = await execAsync('ps aux');
      const processes = [];
      const lines = stdout.split('\n');
      const ourPid = process.pid; // Our own process ID
      
      for (const line of lines) {
        // Skip header and empty lines
        if (!line.trim() || line.includes('USER')) continue;
        
        // Check for MCP-related processes
        for (const [pattern, config] of Object.entries(this.processPatterns)) {
          if (line.includes(pattern) && !line.includes('grep')) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 11) {
              const pid = parseInt(parts[1]);
              
              // SAFETY: Never kill our own process!
              if (pid === ourPid) {
                continue;
              }
              
              processes.push({
                pid,
                pattern,
                user: parts[0],
                cpu: parseFloat(parts[2]),
                mem: parseFloat(parts[3]),
                command: parts.slice(10).join(' '),
                priority: config.priority,
                maxAllowed: config.max,
                isOurProcess: pid === ourPid
              });
            }
          }
        }
      }
      
      return processes;
    } catch (error) {
      this.log(`Failed to get processes: ${error.message}`, 'error');
      return [];
    }
  }

  /**
   * Analyze system health based on current processes
   */
  analyzeHealth(processes) {
    const health = {
      healthy: true,
      issues: [],
      stats: {},
      actions: []
    };

    // Group processes by pattern
    const processGroups = {};
    let totalProcesses = 0;

    for (const process of processes) {
      if (!processGroups[process.pattern]) {
        processGroups[process.pattern] = [];
      }
      processGroups[process.pattern].push(process);
      totalProcesses++;
    }

    // CRITICAL: Handle duplicate server-markdown.js instances FIRST
    // This is the main cause of API Error 500
    if (processGroups['server-markdown.js'] && processGroups['server-markdown.js'].length > 1) {
      health.healthy = false;
      const ourPid = process.pid;
      const duplicates = processGroups['server-markdown.js'].filter(p => p.pid !== ourPid);
      
      if (duplicates.length > 0) {
        health.issues.push(`🚨 CRITICAL: ${duplicates.length} duplicate server-markdown.js instances detected!`);
        for (const dup of duplicates) {
          health.actions.push({
            type: 'kill_duplicate_server',
            pid: dup.pid,
            pattern: 'server-markdown.js',
            reason: 'duplicate_server_instance'
          });
        }
      }
    }

    // Check process count limits for other patterns
    for (const [pattern, config] of Object.entries(this.processPatterns)) {
      const count = processGroups[pattern]?.length || 0;
      health.stats[pattern] = count;
      
      if (count > config.max) {
        health.healthy = false;
        const excess = count - config.max;
        health.issues.push(`Process leak: ${excess} excessive ${pattern} processes (${count}/${config.max})`);
        health.actions.push({
          type: 'cleanup',
          pattern,
          excess,
          processes: processGroups[pattern].slice(config.max) // Keep most recent
        });
      }
    }

    // Check total process count
    if (totalProcesses > this.thresholds.totalProcesses) {
      health.healthy = false;
      health.issues.push(`Too many total MCP processes: ${totalProcesses}/${this.thresholds.totalProcesses}`);
    }

    // Check resource usage
    for (const process of processes) {
      if (process.cpu > this.thresholds.cpuUsage) {
        health.issues.push(`High CPU: PID ${process.pid} (${process.pattern}) using ${process.cpu}%`);
        health.actions.push({
          type: 'kill_high_resource',
          pid: process.pid,
          reason: 'high_cpu',
          usage: process.cpu
        });
      }
      
      if (process.mem > this.thresholds.memoryUsage) {
        health.issues.push(`High Memory: PID ${process.pid} (${process.pattern}) using ${process.mem}%`);
        health.actions.push({
          type: 'kill_high_resource',
          pid: process.pid,
          reason: 'high_memory',
          usage: process.mem
        });
      }
    }

    // Emergency mode check
    if (totalProcesses > this.thresholds.emergencyThreshold) {
      health.issues.push('EMERGENCY: Excessive process count detected');
      health.actions.push({
        type: 'emergency_cleanup',
        totalProcesses
      });
    }

    return health;
  }

  /**
   * Execute cleanup actions
   */
  async executeCleanup(actions) {
    if (this.dryRun) {
      this.log(`DRY RUN: Would execute ${actions.length} cleanup actions`);
      return { success: true, killed: 0, errors: [] };
    }

    const results = { success: true, killed: 0, errors: [] };
    
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'kill_duplicate_server':
            // CRITICAL: Kill duplicate server-markdown.js instances immediately
            await this.killProcess(action.pid, 'SIGKILL'); // Use SIGKILL for immediate termination
            this.log(`🚨 Killed duplicate server-markdown.js: PID ${action.pid}`, 'warn');
            results.killed++;
            this.stats.processesKilled++;
            break;

          case 'cleanup':
            // Kill excessive processes (keep most recent)
            const processesToKill = action.processes
              .sort((a, b) => a.pid - b.pid) // Kill older processes first
              .slice(0, action.excess);
            
            for (const process of processesToKill) {
              await this.killProcess(process.pid, 'SIGTERM');
              this.log(`Killed excessive ${action.pattern} process: PID ${process.pid}`);
              results.killed++;
              this.stats.processesKilled++;
            }
            break;

          case 'kill_high_resource':
            await this.killProcess(action.pid, 'SIGTERM');
            this.log(`Killed high-resource process: PID ${action.pid} (${action.reason}: ${action.usage}%)`);
            results.killed++;
            this.stats.processesKilled++;
            break;

          case 'emergency_cleanup':
            // Emergency cleanup - more aggressive
            await this.emergencyCleanup(action.totalProcesses);
            break;
        }
      } catch (error) {
        this.log(`Cleanup action failed: ${error.message}`, 'error');
        results.errors.push(error.message);
        results.success = false;
      }
    }

    return results;
  }

  /**
   * Kill all other server-markdown.js instances except current process
   * This is called on startup to ensure single instance
   */
  async killAllOtherServers() {
    const ourPid = process.pid;
    let killedCount = 0;
    
    try {
      const { stdout } = await execAsync('ps aux | grep "server-markdown.js" | grep -v grep').catch(() => ({ stdout: '' }));
      const lines = stdout.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2) {
          const pid = parseInt(parts[1]);
          if (pid !== ourPid && !isNaN(pid)) {
            try {
              await execAsync(`kill -9 ${pid}`);
              this.log(`🔫 Killed duplicate server-markdown.js on startup: PID ${pid}`, 'warn');
              killedCount++;
            } catch (e) {
              // Process might already be dead
            }
          }
        }
      }
      
      if (killedCount > 0) {
        this.log(`✅ Killed ${killedCount} duplicate server-markdown.js instances on startup`, 'warn');
      }
    } catch (error) {
      this.log(`Error during startup server cleanup: ${error.message}`, 'error');
    }
    
    return killedCount;
  }

  /**
   * Kill a process with proper error handling
   */
  async killProcess(pid, signal = 'SIGTERM') {
    try {
      // Fix kill command syntax - use signal number or standard format
      const killCmd = signal === 'SIGTERM' ? `kill ${pid}` : signal === 'SIGKILL' ? `kill -9 ${pid}` : `kill -${signal} ${pid}`;
      await execAsync(killCmd);
      
      // Wait a bit, then force kill if still running
      setTimeout(async () => {
        try {
          await execAsync(`kill -0 ${pid}`); // Check if process still exists
          await execAsync(`kill -9 ${pid}`); // Force kill
          this.log(`Force killed stubborn process: PID ${pid}`);
        } catch {
          // Process already dead, which is what we want
        }
      }, 3000);
      
    } catch (error) {
      // Process might already be dead, which is fine
      if (!error.message.includes('No such process')) {
        throw error;
      }
    }
  }

  /**
   * Emergency cleanup - aggressive process termination
   */
  async emergencyCleanup(totalProcesses) {
    this.log(`EMERGENCY CLEANUP: ${totalProcesses} processes detected`, 'error');
    
    try {
      // Kill all MCP processes INCLUDING other server-markdown.js instances
      const ourPid = process.pid;
      
      // First, kill ALL other server-markdown.js instances except ours
      const { stdout } = await execAsync('ps aux | grep "server-markdown.js" | grep -v grep');
      const lines = stdout.split('\n').filter(line => line.trim());
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2) {
          const pid = parseInt(parts[1]);
          if (pid !== ourPid) {
            try {
              await execAsync(`kill -9 ${pid}`);
              this.log(`Killed duplicate server-markdown.js: PID ${pid}`, 'warn');
            } catch (e) {
              // Process might already be dead
            }
          }
        }
      }
      
      // Then kill all other MCP processes
      for (const [pattern] of Object.entries(this.processPatterns)) {
        if (pattern !== 'server-markdown.js') {
          await execAsync(`pkill -f "${pattern}"`).catch(() => {});
        }
      }
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Force kill any remaining problematic processes
      await execAsync('pkill -f "context7-mcp"').catch(() => {});
      await execAsync('pkill -f "mcp-server-sequential-thinking"').catch(() => {});
      await execAsync('pkill -f "mcp-server-playwright"').catch(() => {});
      
      this.log('Emergency cleanup completed', 'warn');
      
    } catch (error) {
      this.log(`Emergency cleanup error: ${error.message}`, 'error');
    }
  }

  /**
   * Run a complete health check and cleanup cycle
   */
  async runHealthCheck() {
    if (!this.enabled) return { skipped: true };
    
    this.stats.healthChecks++;
    this.lastHealthCheck = new Date();
    
    try {
      // Get current processes
      const processes = await this.getProcesses();
      
      // Analyze health
      const health = this.analyzeHealth(processes);
      
      // Update system health status
      this.isHealthy = health.healthy;
      this.stats.lastIssues = health.issues;
      
      // Log health status
      if (health.healthy) {
        this.log(`Health check passed - ${processes.length} MCP processes running normally`);
      } else {
        this.log(`Health issues detected: ${health.issues.join(', ')}`, 'warn');
      }
      
      // Execute cleanup if needed
      let cleanupResults = null;
      if (health.actions.length > 0) {
        cleanupResults = await this.executeCleanup(health.actions);
        this.lastCleanup = new Date();
        this.cleanupCount++;
        this.stats.cleanupRuns++;
      }
      
      return {
        healthy: health.healthy,
        processCount: processes.length,
        issues: health.issues,
        actions: health.actions.length,
        cleanup: cleanupResults,
        stats: this.getStats()
      };
      
    } catch (error) {
      this.log(`Health check failed: ${error.message}`, 'error');
      return { error: error.message };
    }
  }

  /**
   * Get system statistics
   */
  getStats() {
    return {
      ...this.stats,
      enabled: this.enabled,
      lastHealthCheck: this.lastHealthCheck,
      lastCleanup: this.lastCleanup,
      cleanupCount: this.cleanupCount,
      isHealthy: this.isHealthy
    };
  }

  /**
   * Enable/disable the process manager
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    this.log(`Process manager ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Manual cleanup trigger
   */
  async forceCleanup() {
    this.log('Manual cleanup triggered');
    return await this.runHealthCheck();
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      processesKilled: 0,
      cleanupRuns: 0,
      healthChecks: 0,
      lastIssues: []
    };
    this.log('Statistics reset');
  }
}

// Export singleton instance for use across the application
export const mcpProcessManager = new MCPProcessManager({
  enabled: true,
  verbose: process.env.MCP_PROCESS_VERBOSE === 'true'
});