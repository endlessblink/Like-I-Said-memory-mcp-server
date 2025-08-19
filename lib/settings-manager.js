#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { z } from 'zod';

/**
 * Settings Manager for Like-I-Said MCP Server
 * Handles application configuration with file-based storage
 */

// Settings schema definition
const SettingsSchema = z.object({
  authentication: z.object({
    enabled: z.boolean().default(false),
    requireAuth: z.boolean().default(false),
    allowRegistration: z.boolean().default(false),
    sessionTimeout: z.string().default('24h'),
    refreshTokenTimeout: z.string().default('7d'),
  }).default({
    enabled: false,
    requireAuth: false,
    allowRegistration: false,
    sessionTimeout: '24h',
    refreshTokenTimeout: '7d'
  }),
  server: z.object({
    port: z.number().default(3001),
    host: z.string().default('localhost'),
    corsOrigins: z.array(z.string()).default(['http://localhost:8777', 'http://localhost:5173']),
  }).default({
    port: 8776,
    host: 'localhost',
    corsOrigins: ['http://localhost:8777', 'http://localhost:5173']
  }),
  features: z.object({
    autoBackup: z.boolean().default(true),
    backupInterval: z.number().default(3600000), // 1 hour in ms
    maxBackups: z.number().default(10),
    enableWebSocket: z.boolean().default(true),
    enableOllama: z.boolean().default(true),
    enableSemanticSearch: z.boolean().default(true),
    blockXenovaOnWindows: z.boolean().default(false),
    semanticSearchProvider: z.enum(['xenova', 'ollama', 'none']).default('xenova'),
  }).default({
    autoBackup: true,
    backupInterval: 3600000,
    maxBackups: 10,
    enableWebSocket: true,
    enableOllama: true,
    enableSemanticSearch: true,
    blockXenovaOnWindows: false,
    semanticSearchProvider: 'xenova'
  }),
  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    enableFileLogging: z.boolean().default(false),
    logDirectory: z.string().default('./logs'),
  }).default({
    level: 'info',
    enableFileLogging: false,
    logDirectory: './logs'
  })
});

export class SettingsManager {
  constructor() {
    this.settingsFile = path.join(process.cwd(), 'data', 'settings.json');
    this.defaultSettingsFile = path.join(process.cwd(), 'data', 'settings.default.json');
    this.settings = this.loadSettings();
  }

  /**
   * Ensure data directory exists
   */
  ensureDataDirectory() {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  /**
   * Load settings from file or create defaults
   */
  loadSettings() {
    this.ensureDataDirectory();

    try {
      // First check if user settings exist
      if (fs.existsSync(this.settingsFile)) {
        const data = fs.readFileSync(this.settingsFile, 'utf8');
        const parsed = JSON.parse(data);
        // Validate and merge with defaults
        return SettingsSchema.parse(parsed);
      }

      // Check for default settings template
      if (fs.existsSync(this.defaultSettingsFile)) {
        const data = fs.readFileSync(this.defaultSettingsFile, 'utf8');
        const parsed = JSON.parse(data);
        return SettingsSchema.parse(parsed);
      }

      // Create default settings
      const defaultSettings = SettingsSchema.parse({});
      this.saveSettings(defaultSettings);
      return defaultSettings;

    } catch (error) {
      console.error('Error loading settings:', error);
      console.error('Using default settings...');
      return SettingsSchema.parse({});
    }
  }

  /**
   * Save settings to file
   */
  saveSettings(settings = this.settings) {
    try {
      // Validate settings before saving
      const validated = SettingsSchema.parse(settings);
      
      // Save to file with pretty formatting
      fs.writeFileSync(
        this.settingsFile, 
        JSON.stringify(validated, null, 2),
        { mode: 0o600 }
      );
      
      this.settings = validated;
      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      throw new Error('Failed to save settings: ' + error.message);
    }
  }

  /**
   * Get all settings
   */
  getSettings() {
    return { ...this.settings };
  }

  /**
   * Get specific setting by path (e.g., 'authentication.enabled')
   */
  getSetting(path) {
    const keys = path.split('.');
    let value = this.settings;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  /**
   * Update specific setting
   */
  updateSetting(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let target = this.settings;
    
    // Navigate to the parent object
    for (const key of keys) {
      if (!(key in target)) {
        target[key] = {};
      }
      target = target[key];
    }
    
    // Set the value
    target[lastKey] = value;
    
    // Save settings
    return this.saveSettings();
  }

  /**
   * Update multiple settings at once
   */
  updateSettings(updates) {
    // Deep merge updates with current settings
    const merged = this.deepMerge(this.settings, updates);
    return this.saveSettings(merged);
  }

  /**
   * Deep merge utility
   */
  deepMerge(target, source) {
    const output = { ...target };
    
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    
    return output;
  }

  /**
   * Check if value is an object
   */
  isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  /**
   * Reset settings to defaults
   */
  resetToDefaults() {
    const defaultSettings = SettingsSchema.parse({});
    return this.saveSettings(defaultSettings);
  }

  /**
   * Check if authentication is enabled
   */
  isAuthEnabled() {
    return this.settings.authentication?.enabled === true;
  }

  /**
   * Check if authentication is required
   */
  isAuthRequired() {
    return this.settings.authentication?.enabled === true && 
           this.settings.authentication?.requireAuth === true;
  }

  /**
   * Export settings (for backup)
   */
  exportSettings() {
    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      settings: this.settings
    };
  }

  /**
   * Import settings (from backup)
   */
  importSettings(data) {
    try {
      if (!data.settings) {
        throw new Error('Invalid settings export format');
      }
      
      const validated = SettingsSchema.parse(data.settings);
      return this.saveSettings(validated);
    } catch (error) {
      throw new Error('Failed to import settings: ' + error.message);
    }
  }

  /**
   * Get settings info for display
   */
  getSettingsInfo() {
    return {
      authentication: {
        enabled: this.settings.authentication.enabled,
        requireAuth: this.settings.authentication.requireAuth,
        allowRegistration: this.settings.authentication.allowRegistration
      },
      server: {
        port: this.settings.server.port,
        host: this.settings.server.host
      },
      features: {
        autoBackup: this.settings.features.autoBackup,
        enableWebSocket: this.settings.features.enableWebSocket,
        enableOllama: this.settings.features.enableOllama
      },
      configFile: this.settingsFile
    };
  }
}

// Create singleton instance
export const settingsManager = new SettingsManager();