#!/usr/bin/env node

/**
 * Plugin Discovery System for Like-I-Said MCP Server
 * Automatically discovers and manages plugins with dependency resolution
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createLogger } from '../services/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.dirname(__dirname);

/**
 * Plugin Discovery and Management System
 */
class PluginDiscovery {
  constructor(config = {}) {
    this.pluginDir = config.pluginDir || path.join(ROOT_DIR, 'plugins');
    this.customPluginDirs = config.customPluginDirs || [];
    this.logger = config.logger || createLogger('PluginDiscovery');
    this.plugins = new Map();
    this.loadOrder = [];
    this.metadata = new Map();
    
    // Plugin categories
    this.categories = {
      core: [],      // Essential plugins
      tools: [],     // Tool providers
      storage: [],   // Storage backends
      ai: [],        // AI features
      analytics: [], // Analytics and metrics
      custom: []     // User-defined plugins
    };
  }
  
  /**
   * Discover all available plugins
   */
  async discover() {
    this.logger.info('Starting plugin discovery...');
    
    // Scan default plugin directory
    await this.scanDirectory(this.pluginDir);
    
    // Scan custom directories
    for (const dir of this.customPluginDirs) {
      await this.scanDirectory(dir);
    }
    
    // Resolve dependencies and determine load order
    this.resolveLoadOrder();
    
    this.logger.info(`Discovered ${this.plugins.size} plugins`);
    return this.getDiscoveryReport();
  }
  
  /**
   * Scan a directory for plugins
   */
  async scanDirectory(dir) {
    if (!fs.existsSync(dir)) {
      this.logger.debug(`Plugin directory not found: ${dir}`);
      return;
    }
    
    const files = await fs.promises.readdir(dir);
    
    for (const file of files) {
      if (!file.endsWith('.js') || file.startsWith('_')) {
        continue; // Skip non-JS files and files starting with underscore
      }
      
      const pluginPath = path.join(dir, file);
      await this.analyzePlugin(pluginPath);
    }
  }
  
  /**
   * Analyze a plugin file to extract metadata
   */
  async analyzePlugin(pluginPath) {
    try {
      const pluginName = path.basename(pluginPath, '.js');
      
      // Read file content to extract metadata
      const content = await fs.promises.readFile(pluginPath, 'utf8');
      
      // Extract metadata from comments or exports
      const metadata = this.extractMetadata(content, pluginPath);
      metadata.path = pluginPath;
      metadata.name = metadata.name || pluginName;
      
      // Store plugin info
      this.plugins.set(metadata.name, metadata);
      this.metadata.set(pluginPath, metadata);
      
      // Categorize plugin
      const category = metadata.category || 'custom';
      if (this.categories[category]) {
        this.categories[category].push(metadata.name);
      } else {
        this.categories.custom.push(metadata.name);
      }
      
      this.logger.debug(`Discovered plugin: ${metadata.name} (${category})`);
    } catch (error) {
      this.logger.error(`Failed to analyze plugin ${pluginPath}: ${error.message}`);
    }
  }
  
  /**
   * Extract metadata from plugin content
   */
  extractMetadata(content, pluginPath) {
    const metadata = {
      name: null,
      version: '1.0.0',
      description: null,
      category: 'custom',
      dependencies: [],
      provides: [],
      requires: [],
      optional: [],
      config: {},
      enabled: true
    };
    
    // Extract from JSDoc comments
    const metadataMatch = content.match(/\/\*\*[\s\S]*?\*\//);
    if (metadataMatch) {
      const docBlock = metadataMatch[0];
      
      // Extract @name
      const nameMatch = docBlock.match(/@name\s+(.+)/);
      if (nameMatch) metadata.name = nameMatch[1].trim();
      
      // Extract @version
      const versionMatch = docBlock.match(/@version\s+(.+)/);
      if (versionMatch) metadata.version = versionMatch[1].trim();
      
      // Extract @description
      const descMatch = docBlock.match(/@description\s+(.+)/);
      if (descMatch) metadata.description = descMatch[1].trim();
      
      // Extract @category
      const catMatch = docBlock.match(/@category\s+(.+)/);
      if (catMatch) metadata.category = catMatch[1].trim();
      
      // Extract @depends
      const dependsMatches = docBlock.matchAll(/@depends\s+(.+)/g);
      for (const match of dependsMatches) {
        metadata.dependencies.push(match[1].trim());
      }
      
      // Extract @provides
      const providesMatches = docBlock.matchAll(/@provides\s+(.+)/g);
      for (const match of providesMatches) {
        metadata.provides.push(match[1].trim());
      }
      
      // Extract @requires
      const requiresMatches = docBlock.matchAll(/@requires\s+(.+)/g);
      for (const match of requiresMatches) {
        metadata.requires.push(match[1].trim());
      }
      
      // Extract @optional
      const optionalMatches = docBlock.matchAll(/@optional\s+(.+)/g);
      for (const match of optionalMatches) {
        metadata.optional.push(match[1].trim());
      }
    }
    
    // Try to extract from exported metadata object
    const exportMatch = content.match(/export\s+const\s+metadata\s*=\s*({[\s\S]*?});/);
    if (exportMatch) {
      try {
        // Safe evaluation using Function constructor
        const evalFunc = new Function('return ' + exportMatch[1]);
        const exportedMeta = evalFunc();
        Object.assign(metadata, exportedMeta);
      } catch (error) {
        this.logger.debug(`Could not parse exported metadata: ${error.message}`);
      }
    }
    
    // Extract plugin class name if exists
    const classMatch = content.match(/export\s+(?:default\s+)?class\s+(\w+)/);
    if (classMatch && !metadata.name) {
      metadata.name = classMatch[1];
    }
    
    // Check if plugin exports required methods
    metadata.hasInit = content.includes('init(') || content.includes('initialize(');
    metadata.hasRegister = content.includes('register(');
    metadata.hasTools = content.includes('getTools(') || content.includes('tools:');
    
    return metadata;
  }
  
  /**
   * Resolve plugin dependencies and determine load order
   */
  resolveLoadOrder() {
    const resolved = new Set();
    const visited = new Set();
    const order = [];
    
    const resolve = (pluginName) => {
      if (resolved.has(pluginName)) return;
      if (visited.has(pluginName)) {
        this.logger.warn(`Circular dependency detected: ${pluginName}`);
        return;
      }
      
      visited.add(pluginName);
      const plugin = this.plugins.get(pluginName);
      
      if (!plugin) {
        this.logger.warn(`Plugin not found: ${pluginName}`);
        return;
      }
      
      // Resolve dependencies first
      for (const dep of plugin.dependencies) {
        resolve(dep);
      }
      
      resolved.add(pluginName);
      order.push(pluginName);
    };
    
    // Start with core plugins
    for (const pluginName of this.categories.core) {
      resolve(pluginName);
    }
    
    // Then resolve all other plugins
    for (const pluginName of this.plugins.keys()) {
      resolve(pluginName);
    }
    
    this.loadOrder = order;
  }
  
  /**
   * Get plugin by name
   */
  getPlugin(name) {
    return this.plugins.get(name);
  }
  
  /**
   * Get plugins by category
   */
  getByCategory(category) {
    return (this.categories[category] || []).map(name => this.plugins.get(name));
  }
  
  /**
   * Get all enabled plugins
   */
  getEnabledPlugins() {
    return Array.from(this.plugins.values()).filter(p => p.enabled);
  }
  
  /**
   * Get plugin load order
   */
  getLoadOrder() {
    return this.loadOrder.map(name => this.plugins.get(name));
  }
  
  /**
   * Check if plugin dependencies are satisfied
   */
  checkDependencies(pluginName) {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) return { satisfied: false, missing: [pluginName] };
    
    const missing = [];
    
    // Check required dependencies
    for (const dep of plugin.dependencies) {
      if (!this.plugins.has(dep)) {
        missing.push(dep);
      }
    }
    
    // Check required services
    for (const req of plugin.requires) {
      const provider = Array.from(this.plugins.values()).find(p => 
        p.provides.includes(req)
      );
      if (!provider) {
        missing.push(`service:${req}`);
      }
    }
    
    return {
      satisfied: missing.length === 0,
      missing
    };
  }
  
  /**
   * Load a plugin dynamically
   */
  async loadPlugin(pluginName) {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginName}`);
    }
    
    // Check dependencies
    const depCheck = this.checkDependencies(pluginName);
    if (!depCheck.satisfied) {
      throw new Error(`Missing dependencies for ${pluginName}: ${depCheck.missing.join(', ')}`);
    }
    
    try {
      // Dynamic import
      const module = await import(plugin.path);
      
      // Store loaded module
      plugin.module = module.default || module;
      plugin.loaded = true;
      
      this.logger.info(`Loaded plugin: ${pluginName}`);
      return plugin.module;
    } catch (error) {
      plugin.error = error.message;
      plugin.loaded = false;
      throw new Error(`Failed to load plugin ${pluginName}: ${error.message}`);
    }
  }
  
  /**
   * Load all enabled plugins in dependency order
   */
  async loadAll() {
    const loaded = [];
    const failed = [];
    
    for (const pluginName of this.loadOrder) {
      const plugin = this.plugins.get(pluginName);
      if (!plugin.enabled) continue;
      
      try {
        await this.loadPlugin(pluginName);
        loaded.push(pluginName);
      } catch (error) {
        this.logger.error(`Failed to load ${pluginName}: ${error.message}`);
        failed.push({ name: pluginName, error: error.message });
      }
    }
    
    return {
      loaded,
      failed,
      total: this.plugins.size
    };
  }
  
  /**
   * Get discovery report
   */
  getDiscoveryReport() {
    const report = {
      total: this.plugins.size,
      categories: {},
      loadOrder: this.loadOrder,
      dependencies: {},
      issues: []
    };
    
    // Count by category
    for (const [category, plugins] of Object.entries(this.categories)) {
      report.categories[category] = plugins.length;
    }
    
    // Check all dependencies
    for (const [name, plugin] of this.plugins) {
      const depCheck = this.checkDependencies(name);
      if (!depCheck.satisfied) {
        report.issues.push({
          plugin: name,
          type: 'missing-dependencies',
          missing: depCheck.missing
        });
      }
      
      if (plugin.dependencies.length > 0) {
        report.dependencies[name] = plugin.dependencies;
      }
    }
    
    return report;
  }
  
  /**
   * Generate plugin manifest
   */
  async generateManifest(outputPath = null) {
    const manifest = {
      version: '1.0.0',
      generated: new Date().toISOString(),
      plugins: {},
      categories: this.categories,
      loadOrder: this.loadOrder
    };
    
    for (const [name, plugin] of this.plugins) {
      manifest.plugins[name] = {
        name: plugin.name,
        version: plugin.version,
        description: plugin.description,
        category: plugin.category,
        path: path.relative(ROOT_DIR, plugin.path),
        dependencies: plugin.dependencies,
        provides: plugin.provides,
        requires: plugin.requires,
        optional: plugin.optional,
        enabled: plugin.enabled
      };
    }
    
    if (outputPath) {
      await fs.promises.writeFile(
        outputPath,
        JSON.stringify(manifest, null, 2)
      );
      this.logger.info(`Plugin manifest saved to ${outputPath}`);
    }
    
    return manifest;
  }
  
  /**
   * Watch for plugin changes
   */
  watchPlugins(callback) {
    const watcher = fs.watch(this.pluginDir, { recursive: true }, async (eventType, filename) => {
      if (!filename || !filename.endsWith('.js')) return;
      
      this.logger.debug(`Plugin change detected: ${filename}`);
      
      // Re-discover plugins
      await this.discover();
      
      if (callback) {
        callback(eventType, filename, this.getDiscoveryReport());
      }
    });
    
    return watcher;
  }
}

// Export for use as module
export default PluginDiscovery;
export { PluginDiscovery };

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const discovery = new PluginDiscovery();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'discover':
      discovery.discover().then(report => {
        console.log('\n=== Plugin Discovery Report ===\n');
        console.log(`Total plugins: ${report.total}`);
        console.log('\nCategories:');
        for (const [cat, count] of Object.entries(report.categories)) {
          console.log(`  ${cat}: ${count}`);
        }
        console.log('\nLoad order:');
        report.loadOrder.forEach((name, i) => {
          console.log(`  ${i + 1}. ${name}`);
        });
        if (report.issues.length > 0) {
          console.log('\nIssues:');
          for (const issue of report.issues) {
            console.log(`  ⚠️ ${issue.plugin}: ${issue.missing.join(', ')}`);
          }
        }
      });
      break;
      
    case 'manifest':
      discovery.discover().then(() => {
        const outputPath = process.argv[3] || path.join(ROOT_DIR, 'plugin-manifest.json');
        return discovery.generateManifest(outputPath);
      }).then(() => {
        console.log('Plugin manifest generated');
      });
      break;
      
    case 'load':
      const pluginName = process.argv[3];
      if (!pluginName) {
        console.error('Usage: node plugin-discovery.js load <plugin-name>');
        process.exit(1);
      }
      discovery.discover().then(() => {
        return discovery.loadPlugin(pluginName);
      }).then(() => {
        console.log(`Plugin ${pluginName} loaded successfully`);
      }).catch(error => {
        console.error(`Failed to load plugin: ${error.message}`);
        process.exit(1);
      });
      break;
      
    case 'watch':
      discovery.discover().then(() => {
        console.log('Watching for plugin changes...');
        discovery.watchPlugins((eventType, filename, report) => {
          console.log(`\n[${new Date().toISOString()}] ${eventType}: ${filename}`);
          console.log(`Plugins: ${report.total}, Issues: ${report.issues.length}`);
        });
      });
      break;
      
    default:
      console.log('Usage: node plugin-discovery.js <command>');
      console.log('Commands:');
      console.log('  discover  - Discover all available plugins');
      console.log('  manifest  - Generate plugin manifest');
      console.log('  load      - Load a specific plugin');
      console.log('  watch     - Watch for plugin changes');
  }
}