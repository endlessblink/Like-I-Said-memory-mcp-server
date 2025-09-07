#!/usr/bin/env node

/**
 * Dashboard Debug Logger
 * 
 * Comprehensive logging system to track what's happening with the dashboard
 * API connections, data loading, and service connectivity.
 */

import fs from 'fs-extra';
import path from 'path';

class DashboardDebugLogger {
  constructor() {
    this.logDir = 'logs';
    this.logFile = path.join(this.logDir, `dashboard-debug-${new Date().toISOString().split('T')[0]}.log`);
    this.initLogger();
  }

  async initLogger() {
    try {
      await fs.ensureDir(this.logDir);
      await this.log('STARTUP', 'Dashboard Debug Logger initialized');
    } catch (error) {
      console.error('Failed to initialize debug logger:', error.message);
    }
  }

  async log(category, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      category,
      message,
      data: data || undefined
    };

    const logLine = `[${timestamp}] [${category}] ${message}${data ? '\nDATA: ' + JSON.stringify(data, null, 2) : ''}\n\n`;

    try {
      // Write to file
      await fs.appendFile(this.logFile, logLine);
      
      // Also log to console with color coding
      const categoryColors = {
        'STARTUP': '\x1b[32m',    // Green
        'API': '\x1b[34m',        // Blue  
        'ERROR': '\x1b[31m',      // Red
        'DATA': '\x1b[33m',       // Yellow
        'SUCCESS': '\x1b[32m',    // Green
        'FAIL': '\x1b[31m',       // Red
        'INFO': '\x1b[36m'        // Cyan
      };
      
      const color = categoryColors[category] || '\x1b[37m';
      console.log(`${color}[DEBUG] [${category}] ${message}\x1b[0m`);
      
      if (data) {
        console.log(`${color}DATA:\x1b[0m`, data);
      }

    } catch (error) {
      console.error('Failed to write debug log:', error.message);
    }
  }

  // Specific logging methods
  async logApiRequest(endpoint, method, body, response) {
    await this.log('API', `${method} ${endpoint}`, {
      request_body: body,
      response_status: response?.status,
      response_headers: response?.headers,
      response_preview: typeof response?.data === 'string' 
        ? response.data.substring(0, 200) + '...'
        : response?.data
    });
  }

  async logDataLoad(dataType, count, sample = null) {
    await this.log('DATA', `${dataType} loaded: ${count} items`, {
      count,
      sample: sample || 'No sample provided'
    });
  }

  async logError(context, error, additional = null) {
    await this.log('ERROR', `${context}: ${error.message}`, {
      error_name: error.name,
      error_stack: error.stack,
      additional
    });
  }

  async logSuccess(context, message, data = null) {
    await this.log('SUCCESS', `${context}: ${message}`, data);
  }

  async logServiceCheck(service, isConnected, details = null) {
    const status = isConnected ? 'CONNECTED' : 'DISCONNECTED';
    await this.log('SERVICE', `${service}: ${status}`, details);
  }

  // Get recent logs for dashboard display
  async getRecentLogs(lines = 50) {
    try {
      const logContent = await fs.readFile(this.logFile, 'utf8');
      const logLines = logContent.split('\n').filter(line => line.trim());
      return logLines.slice(-lines).join('\n');
    } catch (error) {
      return 'No logs available';
    }
  }

  // Clear old logs
  async clearLogs() {
    try {
      if (await fs.pathExists(this.logFile)) {
        await fs.remove(this.logFile);
        await this.log('STARTUP', 'Debug logs cleared');
      }
    } catch (error) {
      console.error('Failed to clear logs:', error.message);
    }
  }
}

// Create singleton instance
const debugLogger = new DashboardDebugLogger();

export default debugLogger;