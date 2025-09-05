/**
 * Logger Service
 * Lightweight logging with levels and optional file output
 */

import fs from 'fs';
import path from 'path';

export class Logger {
  constructor(name, options = {}) {
    this.name = name;
    this.level = options.level || process.env.LOG_LEVEL || 'info';
    this.logToFile = options.logToFile || process.env.LOG_TO_FILE === 'true';
    this.logDir = options.logDir || 'logs';
    
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
    
    if (this.logToFile) {
      this.ensureLogDir();
      this.logFile = this.getLogFile();
    }
  }

  ensureLogDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  getLogFile() {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.logDir, `mcp-${date}.log`);
  }

  shouldLog(level) {
    return this.levels[level] <= this.levels[this.level];
  }

  formatMessage(level, message, data) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${this.name}]`;
    
    let fullMessage = `${prefix} ${message}`;
    if (data) {
      if (typeof data === 'object') {
        fullMessage += ' ' + JSON.stringify(data);
      } else {
        fullMessage += ' ' + data;
      }
    }
    
    return fullMessage;
  }

  log(level, message, data) {
    if (!this.shouldLog(level)) return;
    
    const formattedMessage = this.formatMessage(level, message, data);
    
    // Always log to stderr for MCP (doesn't interfere with stdio protocol)
    console.error(formattedMessage);
    
    // Optionally log to file
    if (this.logToFile && this.logFile) {
      try {
        fs.appendFileSync(this.logFile, formattedMessage + '\n');
      } catch (error) {
        console.error(`Failed to write to log file: ${error.message}`);
      }
    }
  }

  error(message, data) {
    this.log('error', message, data);
  }

  warn(message, data) {
    this.log('warn', message, data);
  }

  info(message, data) {
    this.log('info', message, data);
  }

  debug(message, data) {
    this.log('debug', message, data);
  }

  /**
   * Create a child logger with a sub-name
   */
  child(subName) {
    return new Logger(`${this.name}:${subName}`, {
      level: this.level,
      logToFile: this.logToFile,
      logDir: this.logDir
    });
  }
}

// Default logger factory
export function createLogger(name, options) {
  return new Logger(name, options);
}