#!/usr/bin/env node

/**
 * Health Monitoring System for Like-I-Said MCP Server
 * Provides comprehensive health checks and monitoring endpoints
 */

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.dirname(__dirname);

/**
 * Health Monitor Service
 */
class HealthMonitor {
  constructor(config = {}) {
    this.port = config.port || process.env.HEALTH_PORT || 8080;
    this.checkInterval = config.checkInterval || 30000; // 30 seconds
    this.app = express();
    this.server = null;
    this.wss = null;
    this.checks = new Map();
    this.history = [];
    this.maxHistorySize = 100;
    this.startTime = Date.now();
    
    this.setupEndpoints();
    this.registerDefaultChecks();
  }
  
  /**
   * Setup HTTP endpoints
   */
  setupEndpoints() {
    this.app.use(express.json());
    
    // Basic health check
    this.app.get('/health', (req, res) => {
      const health = this.getHealthStatus();
      const statusCode = health.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json(health);
    });
    
    // Detailed health check
    this.app.get('/health/detailed', async (req, res) => {
      const detailed = await this.getDetailedHealth();
      const statusCode = detailed.overall === 'healthy' ? 200 : 503;
      res.status(statusCode).json(detailed);
    });
    
    // Liveness probe (for k8s)
    this.app.get('/health/live', (req, res) => {
      res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
    });
    
    // Readiness probe (for k8s)
    this.app.get('/health/ready', async (req, res) => {
      const ready = await this.checkReadiness();
      const statusCode = ready ? 200 : 503;
      res.status(statusCode).json({ 
        ready, 
        timestamp: new Date().toISOString() 
      });
    });
    
    // Metrics endpoint
    this.app.get('/metrics', (req, res) => {
      const metrics = this.getMetrics();
      res.json(metrics);
    });
    
    // History endpoint
    this.app.get('/health/history', (req, res) => {
      res.json({
        history: this.history,
        count: this.history.length,
        maxSize: this.maxHistorySize
      });
    });
    
    // Force check endpoint
    this.app.post('/health/check', async (req, res) => {
      const result = await this.runAllChecks();
      res.json(result);
    });
  }
  
  /**
   * Register default health checks
   */
  registerDefaultChecks() {
    // File system check
    this.registerCheck('filesystem', async () => {
      const dirs = ['memories', 'tasks', 'logs', 'data'];
      const results = {};
      
      for (const dir of dirs) {
        const dirPath = path.join(ROOT_DIR, dir);
        try {
          await fs.promises.access(dirPath, fs.constants.R_OK | fs.constants.W_OK);
          results[dir] = 'accessible';
        } catch (error) {
          results[dir] = `error: ${error.message}`;
        }
      }
      
      const allAccessible = Object.values(results).every(v => v === 'accessible');
      return {
        healthy: allAccessible,
        details: results
      };
    });
    
    // Memory usage check
    this.registerCheck('memory', async () => {
      const usage = process.memoryUsage();
      const maxHeap = 512 * 1024 * 1024; // 512MB threshold
      const heapUsedPercent = (usage.heapUsed / maxHeap) * 100;
      
      return {
        healthy: usage.heapUsed < maxHeap,
        details: {
          heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
          rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
          external: `${Math.round(usage.external / 1024 / 1024)}MB`,
          heapUsedPercent: `${heapUsedPercent.toFixed(1)}%`,
          threshold: '512MB'
        }
      };
    });
    
    // Server process check
    this.registerCheck('mcp-server', async () => {
      try {
        // Check if any MCP server is running
        const { stdout } = await execAsync('pgrep -f "server-(minimal|enhanced|core|markdown).js" || echo "none"');
        const pids = stdout.trim().split('\n').filter(pid => pid !== 'none');
        
        if (pids.length === 0) {
          return {
            healthy: false,
            details: { status: 'not running' }
          };
        }
        
        // Get process details
        const processes = [];
        for (const pid of pids) {
          try {
            const { stdout: cmdline } = await execAsync(`ps -p ${pid} -o comm= || echo "unknown"`);
            processes.push({
              pid,
              command: cmdline.trim()
            });
          } catch {
            // Process might have ended
          }
        }
        
        return {
          healthy: processes.length > 0,
          details: {
            status: 'running',
            processes,
            count: processes.length
          }
        };
      } catch (error) {
        return {
          healthy: false,
          details: {
            status: 'error',
            error: error.message
          }
        };
      }
    });
    
    // Storage check
    this.registerCheck('storage', async () => {
      const storageDirs = {
        memories: path.join(ROOT_DIR, 'memories'),
        tasks: path.join(ROOT_DIR, 'tasks')
      };
      
      const stats = {};
      let totalFiles = 0;
      let totalSize = 0;
      
      for (const [name, dir] of Object.entries(storageDirs)) {
        try {
          const files = await this.countFilesRecursive(dir);
          const size = await this.getDirectorySize(dir);
          stats[name] = {
            files,
            size: `${(size / 1024).toFixed(1)}KB`
          };
          totalFiles += files;
          totalSize += size;
        } catch (error) {
          stats[name] = {
            error: error.message
          };
        }
      }
      
      return {
        healthy: true,
        details: {
          ...stats,
          total: {
            files: totalFiles,
            size: `${(totalSize / 1024).toFixed(1)}KB`
          }
        }
      };
    });
    
    // Configuration check
    this.registerCheck('configuration', async () => {
      const configFile = path.join(ROOT_DIR, 'mcp-config.json');
      
      try {
        const config = JSON.parse(await fs.promises.readFile(configFile, 'utf8'));
        
        return {
          healthy: true,
          details: {
            server: config.server?.name || 'unknown',
            version: config.server?.version || 'unknown',
            environment: config.deployment?.environment || 'unknown',
            logging: config.logging?.level || 'unknown'
          }
        };
      } catch (error) {
        return {
          healthy: false,
          details: {
            error: `Config error: ${error.message}`
          }
        };
      }
    });
    
    // Plugin status check
    this.registerCheck('plugins', async () => {
      const pluginDir = path.join(ROOT_DIR, 'plugins');
      
      try {
        const files = await fs.promises.readdir(pluginDir);
        const plugins = files.filter(f => f.endsWith('.js'));
        
        const pluginStatus = {};
        for (const plugin of plugins) {
          const pluginPath = path.join(pluginDir, plugin);
          try {
            const stats = await fs.promises.stat(pluginPath);
            pluginStatus[plugin.replace('.js', '')] = {
              available: true,
              size: `${(stats.size / 1024).toFixed(1)}KB`
            };
          } catch {
            pluginStatus[plugin.replace('.js', '')] = {
              available: false
            };
          }
        }
        
        return {
          healthy: plugins.length > 0,
          details: {
            count: plugins.length,
            plugins: pluginStatus
          }
        };
      } catch (error) {
        return {
          healthy: false,
          details: {
            error: error.message
          }
        };
      }
    });
  }
  
  /**
   * Register a custom health check
   */
  registerCheck(name, checkFn) {
    this.checks.set(name, checkFn);
  }
  
  /**
   * Run all health checks
   */
  async runAllChecks() {
    const results = {};
    let allHealthy = true;
    
    for (const [name, checkFn] of this.checks) {
      try {
        const result = await checkFn();
        results[name] = result;
        if (!result.healthy) {
          allHealthy = false;
        }
      } catch (error) {
        results[name] = {
          healthy: false,
          error: error.message
        };
        allHealthy = false;
      }
    }
    
    const status = {
      timestamp: new Date().toISOString(),
      overall: allHealthy ? 'healthy' : 'unhealthy',
      checks: results,
      uptime: this.getUptime()
    };
    
    // Add to history
    this.addToHistory(status);
    
    return status;
  }
  
  /**
   * Get basic health status
   */
  getHealthStatus() {
    const uptime = this.getUptime();
    const memory = process.memoryUsage();
    
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime,
      memory: {
        heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memory.heapTotal / 1024 / 1024)}MB`
      }
    };
  }
  
  /**
   * Get detailed health information
   */
  async getDetailedHealth() {
    return await this.runAllChecks();
  }
  
  /**
   * Check if service is ready
   */
  async checkReadiness() {
    try {
      // Check critical components
      const fsCheck = await this.checks.get('filesystem')();
      const configCheck = await this.checks.get('configuration')();
      
      return fsCheck.healthy && configCheck.healthy;
    } catch {
      return false;
    }
  }
  
  /**
   * Get metrics
   */
  getMetrics() {
    const memory = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      timestamp: new Date().toISOString(),
      uptime: this.getUptime(),
      memory: {
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
        rss: memory.rss,
        external: memory.external,
        arrayBuffers: memory.arrayBuffers
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      checks: {
        total: this.checks.size,
        lastRun: this.history.length > 0 ? this.history[0].timestamp : null
      }
    };
  }
  
  /**
   * Get uptime in human-readable format
   */
  getUptime() {
    const uptimeMs = Date.now() - this.startTime;
    const seconds = Math.floor(uptimeMs / 1000) % 60;
    const minutes = Math.floor(uptimeMs / 1000 / 60) % 60;
    const hours = Math.floor(uptimeMs / 1000 / 60 / 60) % 24;
    const days = Math.floor(uptimeMs / 1000 / 60 / 60 / 24);
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
    
    return parts.join(' ');
  }
  
  /**
   * Add check result to history
   */
  addToHistory(status) {
    this.history.unshift(status);
    if (this.history.length > this.maxHistorySize) {
      this.history.pop();
    }
  }
  
  /**
   * Count files recursively in directory
   */
  async countFilesRecursive(dir) {
    let count = 0;
    
    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isFile()) {
          count++;
        } else if (entry.isDirectory()) {
          count += await this.countFilesRecursive(path.join(dir, entry.name));
        }
      }
    } catch {
      // Directory might not exist
    }
    
    return count;
  }
  
  /**
   * Get directory size
   */
  async getDirectorySize(dir) {
    let size = 0;
    
    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isFile()) {
          const stats = await fs.promises.stat(fullPath);
          size += stats.size;
        } else if (entry.isDirectory()) {
          size += await this.getDirectorySize(fullPath);
        }
      }
    } catch {
      // Directory might not exist
    }
    
    return size;
  }
  
  /**
   * Start health monitoring service
   */
  async start() {
    this.server = createServer(this.app);
    
    // Setup WebSocket for real-time updates
    this.wss = new WebSocketServer({ server: this.server });
    
    this.wss.on('connection', (ws) => {
      console.log('[Health] WebSocket client connected');
      
      // Send initial status
      this.getDetailedHealth().then(health => {
        ws.send(JSON.stringify({
          type: 'health-update',
          data: health
        }));
      });
      
      ws.on('close', () => {
        console.log('[Health] WebSocket client disconnected');
      });
    });
    
    // Start periodic checks
    if (this.checkInterval > 0) {
      setInterval(async () => {
        const health = await this.runAllChecks();
        
        // Broadcast to all WebSocket clients
        this.wss.clients.forEach(client => {
          if (client.readyState === 1) { // WebSocket.OPEN
            client.send(JSON.stringify({
              type: 'health-update',
              data: health
            }));
          }
        });
        
        // Log if unhealthy
        if (health.overall !== 'healthy') {
          console.warn('[Health] System unhealthy:', health.checks);
        }
      }, this.checkInterval);
    }
    
    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        console.log(`[Health] Monitoring service started on port ${this.port}`);
        console.log(`[Health] Endpoints:`);
        console.log(`  - Basic health: http://localhost:${this.port}/health`);
        console.log(`  - Detailed health: http://localhost:${this.port}/health/detailed`);
        console.log(`  - Metrics: http://localhost:${this.port}/metrics`);
        console.log(`  - History: http://localhost:${this.port}/health/history`);
        console.log(`  - WebSocket: ws://localhost:${this.port}`);
        resolve();
      });
    });
  }
  
  /**
   * Stop health monitoring service
   */
  async stop() {
    if (this.wss) {
      this.wss.clients.forEach(client => client.close());
      this.wss.close();
    }
    
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(resolve);
      });
    }
  }
}

// Export for use as module
export default HealthMonitor;
export { HealthMonitor };

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const monitor = new HealthMonitor({
    port: process.env.HEALTH_PORT || 8080,
    checkInterval: parseInt(process.env.HEALTH_INTERVAL || '30000')
  });
  
  monitor.start().catch(console.error);
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n[Health] Shutting down...');
    await monitor.stop();
    process.exit(0);
  });
}