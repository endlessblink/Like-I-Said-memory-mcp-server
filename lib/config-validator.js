#!/usr/bin/env node

/**
 * Configuration Validator for Like-I-Said MCP Server
 * Validates and manages configuration with schema enforcement
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createLogger } from '../services/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.dirname(__dirname);

/**
 * Configuration Validator
 */
class ConfigValidator {
  constructor() {
    this.logger = createLogger('ConfigValidator');
    this.configPath = path.join(ROOT_DIR, 'mcp-config.json');
    this.schema = this.getDefaultSchema();
    this.config = null;
    this.errors = [];
    this.warnings = [];
  }
  
  /**
   * Get default configuration schema
   */
  getDefaultSchema() {
    return {
      server: {
        type: 'object',
        required: true,
        properties: {
          name: { type: 'string', required: true, default: 'like-i-said-mcp' },
          version: { type: 'string', required: true, pattern: /^\d+\.\d+\.\d+$/ },
          description: { type: 'string', required: false }
        }
      },
      plugins: {
        type: 'object',
        required: false,
        properties: {
          core: { type: 'array', items: 'string', default: ['memory-tools', 'task-tools'] },
          optional: { type: 'object' },
          custom: { type: 'array', items: 'string', default: [] }
        }
      },
      logging: {
        type: 'object',
        required: false,
        properties: {
          level: { 
            type: 'string', 
            enum: ['error', 'warn', 'info', 'debug'], 
            default: 'info' 
          },
          file: { type: 'boolean', default: false },
          directory: { type: 'string', default: 'logs' },
          maxFiles: { type: 'number', min: 1, max: 365, default: 7 },
          maxSize: { type: 'string', pattern: /^\d+[KMG]B$/, default: '10MB' }
        }
      },
      storage: {
        type: 'object',
        required: false,
        properties: {
          memoriesDir: { type: 'string', default: 'memories' },
          tasksDir: { type: 'string', default: 'tasks' },
          backupDir: { type: 'string', default: 'backups' },
          enableBackups: { type: 'boolean', default: true },
          backupInterval: { type: 'number', min: 3600000, default: 86400000 }
        }
      },
      performance: {
        type: 'object',
        required: false,
        properties: {
          maxToolExecutionTime: { type: 'number', min: 1000, max: 300000, default: 30000 },
          requestTimeout: { type: 'number', min: 1000, max: 600000, default: 60000 },
          maxConcurrentRequests: { type: 'number', min: 1, max: 100, default: 10 },
          enableMetrics: { type: 'boolean', default: true },
          metricsInterval: { type: 'number', min: 60000, default: 300000 }
        }
      },
      security: {
        type: 'object',
        required: false,
        properties: {
          enableAuth: { type: 'boolean', default: false },
          rateLimit: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean', default: true },
              maxRequests: { type: 'number', min: 1, max: 10000, default: 100 },
              windowMs: { type: 'number', min: 1000, default: 60000 }
            }
          },
          allowedOrigins: { type: 'array', items: 'string', default: ['*'] },
          maxPayloadSize: { type: 'string', pattern: /^\d+[KMG]B$/, default: '10MB' }
        }
      },
      health: {
        type: 'object',
        required: false,
        properties: {
          enabled: { type: 'boolean', default: true },
          port: { type: 'number', min: 1024, max: 65535, default: 8080 },
          path: { type: 'string', default: '/health' },
          checkInterval: { type: 'number', min: 5000, default: 30000 }
        }
      },
      deployment: {
        type: 'object',
        required: false,
        properties: {
          environment: { 
            type: 'string', 
            enum: ['development', 'staging', 'production'], 
            default: 'production' 
          },
          autoRestart: { type: 'boolean', default: true },
          gracefulShutdownTimeout: { type: 'number', min: 0, max: 60000, default: 10000 },
          processManager: { 
            type: 'string', 
            enum: ['native', 'pm2', 'systemd', 'docker'], 
            default: 'native' 
          }
        }
      }
    };
  }
  
  /**
   * Load configuration
   */
  async loadConfig(configPath = null) {
    const path = configPath || this.configPath;
    
    try {
      const content = await fs.promises.readFile(path, 'utf8');
      this.config = JSON.parse(content);
      this.logger.info(`Configuration loaded from ${path}`);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.logger.warn('Configuration file not found, using defaults');
        this.config = this.getDefaultConfig();
        return false;
      }
      throw error;
    }
  }
  
  /**
   * Validate configuration against schema
   */
  validate(config = null) {
    const configToValidate = config || this.config;
    this.errors = [];
    this.warnings = [];
    
    if (!configToValidate) {
      this.errors.push('No configuration to validate');
      return false;
    }
    
    // Validate each section
    for (const [section, schema] of Object.entries(this.schema)) {
      this.validateSection(section, schema, configToValidate[section]);
    }
    
    // Check for unknown sections
    for (const section of Object.keys(configToValidate)) {
      if (!this.schema[section]) {
        this.warnings.push(`Unknown configuration section: ${section}`);
      }
    }
    
    return this.errors.length === 0;
  }
  
  /**
   * Validate a configuration section
   */
  validateSection(sectionName, schema, value) {
    // Check if required
    if (schema.required && !value) {
      this.errors.push(`Missing required section: ${sectionName}`);
      return;
    }
    
    // Use default if not provided
    if (!value && !schema.required) {
      return;
    }
    
    // Check type
    if (schema.type === 'object' && typeof value !== 'object') {
      this.errors.push(`${sectionName} must be an object`);
      return;
    }
    
    // Validate properties
    if (schema.properties) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        const propPath = `${sectionName}.${propName}`;
        this.validateProperty(propPath, propSchema, value?.[propName]);
      }
      
      // Check for unknown properties
      if (value) {
        for (const prop of Object.keys(value)) {
          if (!schema.properties[prop]) {
            this.warnings.push(`Unknown property: ${sectionName}.${prop}`);
          }
        }
      }
    }
  }
  
  /**
   * Validate a property
   */
  validateProperty(path, schema, value) {
    // Check if required
    if (schema.required && value === undefined) {
      this.errors.push(`Missing required property: ${path}`);
      return;
    }
    
    // Skip if not provided and not required
    if (value === undefined) return;
    
    // Check type
    if (schema.type && !this.checkType(value, schema.type)) {
      this.errors.push(`${path} must be of type ${schema.type}`);
      return;
    }
    
    // Check enum values
    if (schema.enum && !schema.enum.includes(value)) {
      this.errors.push(`${path} must be one of: ${schema.enum.join(', ')}`);
      return;
    }
    
    // Check pattern
    if (schema.pattern && !schema.pattern.test(value)) {
      this.errors.push(`${path} does not match required pattern`);
      return;
    }
    
    // Check numeric constraints
    if (schema.type === 'number') {
      if (schema.min !== undefined && value < schema.min) {
        this.errors.push(`${path} must be at least ${schema.min}`);
      }
      if (schema.max !== undefined && value > schema.max) {
        this.errors.push(`${path} must be at most ${schema.max}`);
      }
    }
    
    // Check array items
    if (schema.type === 'array' && schema.items) {
      for (let i = 0; i < value.length; i++) {
        if (!this.checkType(value[i], schema.items)) {
          this.errors.push(`${path}[${i}] must be of type ${schema.items}`);
        }
      }
    }
    
    // Validate nested objects
    if (schema.type === 'object' && schema.properties) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        this.validateProperty(`${path}.${propName}`, propSchema, value?.[propName]);
      }
    }
  }
  
  /**
   * Check if value matches type
   */
  checkType(value, type) {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && !Array.isArray(value);
      default:
        return false;
    }
  }
  
  /**
   * Get default configuration
   */
  getDefaultConfig() {
    const config = {};
    
    for (const [section, schema] of Object.entries(this.schema)) {
      if (schema.properties) {
        config[section] = {};
        for (const [prop, propSchema] of Object.entries(schema.properties)) {
          if (propSchema.default !== undefined) {
            config[section][prop] = propSchema.default;
          }
        }
      }
    }
    
    return config;
  }
  
  /**
   * Merge configurations
   */
  mergeConfig(base, override) {
    const merged = JSON.parse(JSON.stringify(base));
    
    for (const [key, value] of Object.entries(override)) {
      if (typeof value === 'object' && !Array.isArray(value)) {
        merged[key] = this.mergeConfig(merged[key] || {}, value);
      } else {
        merged[key] = value;
      }
    }
    
    return merged;
  }
  
  /**
   * Apply environment variables
   */
  applyEnvironmentVariables(config) {
    const envConfig = {};
    
    // Map environment variables to config paths
    const envMappings = {
      'MCP_SERVER_NAME': 'server.name',
      'MCP_SERVER_VERSION': 'server.version',
      'MCP_LOG_LEVEL': 'logging.level',
      'MCP_LOG_FILE': 'logging.file',
      'MCP_ENABLE_AUTH': 'security.enableAuth',
      'MCP_RATE_LIMIT': 'security.rateLimit.enabled',
      'MCP_MAX_REQUESTS': 'security.rateLimit.maxRequests',
      'MCP_HEALTH_PORT': 'health.port',
      'MCP_HEALTH_ENABLED': 'health.enabled',
      'MCP_ENVIRONMENT': 'deployment.environment',
      'MCP_AUTO_RESTART': 'deployment.autoRestart'
    };
    
    for (const [envVar, configPath] of Object.entries(envMappings)) {
      const value = process.env[envVar];
      if (value !== undefined) {
        const parts = configPath.split('.');
        let current = envConfig;
        
        for (let i = 0; i < parts.length - 1; i++) {
          if (!current[parts[i]]) {
            current[parts[i]] = {};
          }
          current = current[parts[i]];
        }
        
        // Convert value to appropriate type
        const lastPart = parts[parts.length - 1];
        current[lastPart] = this.parseEnvValue(value);
        
        this.logger.debug(`Applied env var ${envVar} to ${configPath}`);
      }
    }
    
    return this.mergeConfig(config, envConfig);
  }
  
  /**
   * Parse environment variable value
   */
  parseEnvValue(value) {
    // Boolean
    if (value === 'true') return true;
    if (value === 'false') return false;
    
    // Number
    if (/^\d+$/.test(value)) return parseInt(value);
    if (/^\d+\.\d+$/.test(value)) return parseFloat(value);
    
    // String
    return value;
  }
  
  /**
   * Save configuration
   */
  async saveConfig(config = null, path = null) {
    const configToSave = config || this.config;
    const savePath = path || this.configPath;
    
    // Validate before saving
    if (!this.validate(configToSave)) {
      throw new Error(`Invalid configuration: ${this.errors.join(', ')}`);
    }
    
    // Create backup
    if (fs.existsSync(savePath)) {
      const backupPath = `${savePath}.backup-${Date.now()}`;
      await fs.promises.copyFile(savePath, backupPath);
      this.logger.info(`Backup created: ${backupPath}`);
    }
    
    // Save new configuration
    await fs.promises.writeFile(
      savePath,
      JSON.stringify(configToSave, null, 2)
    );
    
    this.logger.info(`Configuration saved to ${savePath}`);
  }
  
  /**
   * Get validation report
   */
  getValidationReport() {
    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      config: this.config
    };
  }
  
  /**
   * Print validation report
   */
  printReport(report = null) {
    const r = report || this.getValidationReport();
    
    console.log('\n=== Configuration Validation Report ===\n');
    
    if (r.valid) {
      console.log('✅ Configuration is valid');
    } else {
      console.log('❌ Configuration has errors');
    }
    
    if (r.errors.length > 0) {
      console.log('\nErrors:');
      r.errors.forEach(err => console.log(`  ❌ ${err}`));
    }
    
    if (r.warnings.length > 0) {
      console.log('\nWarnings:');
      r.warnings.forEach(warn => console.log(`  ⚠️ ${warn}`));
    }
    
    console.log('\n');
  }
}

// Export for use as module
export default ConfigValidator;
export { ConfigValidator };

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new ConfigValidator();
  const command = process.argv[2];
  
  switch (command) {
    case 'validate':
      validator.loadConfig().then(() => {
        const valid = validator.validate();
        validator.printReport();
        process.exit(valid ? 0 : 1);
      }).catch(error => {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      });
      break;
      
    case 'generate':
      const config = validator.getDefaultConfig();
      const outputPath = process.argv[3] || path.join(ROOT_DIR, 'mcp-config.json');
      validator.saveConfig(config, outputPath).then(() => {
        console.log(`Default configuration generated: ${outputPath}`);
      }).catch(error => {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      });
      break;
      
    case 'merge':
      const basePath = process.argv[3];
      const overridePath = process.argv[4];
      if (!basePath || !overridePath) {
        console.error('Usage: config-validator merge <base-config> <override-config>');
        process.exit(1);
      }
      Promise.all([
        fs.promises.readFile(basePath, 'utf8'),
        fs.promises.readFile(overridePath, 'utf8')
      ]).then(([base, override]) => {
        const merged = validator.mergeConfig(
          JSON.parse(base),
          JSON.parse(override)
        );
        console.log(JSON.stringify(merged, null, 2));
      }).catch(error => {
        console.error(`Error: ${error.message}`);
        process.exit(1);
      });
      break;
      
    default:
      console.log('Usage: config-validator <command>');
      console.log('Commands:');
      console.log('  validate  - Validate current configuration');
      console.log('  generate  - Generate default configuration');
      console.log('  merge     - Merge two configurations');
  }
}