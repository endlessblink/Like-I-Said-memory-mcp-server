import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validatePathsConfiguration, safeUpdatePaths, resolveOptimalPath } from './robust-path-finder.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Manages persistent path settings for Like-I-Said
 */
export class PathSettings {
  constructor() {
    this.settingsDir = path.join(process.cwd(), 'data');
    this.settingsFile = path.join(this.settingsDir, 'path-settings.json');
    this.ensureSettingsDir();
  }

  ensureSettingsDir() {
    if (!fs.existsSync(this.settingsDir)) {
      fs.mkdirSync(this.settingsDir, { recursive: true });
    }
  }

  /**
   * Load saved path settings
   */
  load() {
    try {
      if (fs.existsSync(this.settingsFile)) {
        const data = fs.readFileSync(this.settingsFile, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.warn('Failed to load path settings:', error);
    }

    // Return defaults if no settings exist
    return {
      memoriesPath: process.env.MEMORY_DIR || 'memories',
      tasksPath: process.env.TASK_DIR || 'tasks',
      lastUpdated: null
    };
  }

  /**
   * Save path settings
   */
  save(settings) {
    try {
      const data = {
        ...settings,
        lastUpdated: new Date().toISOString()
      };
      
      fs.writeFileSync(
        this.settingsFile, 
        JSON.stringify(data, null, 2),
        'utf-8'
      );
      
      return true;
    } catch (error) {
      console.error('Failed to save path settings:', error);
      return false;
    }
  }

  /**
   * Ensure directory exists and is writable using robust validation
   */
  async ensureDirectory(dirPath) {
    try {
      const result = await resolveOptimalPath(dirPath, path.basename(dirPath));
      return { 
        success: true, 
        path: result.path,
        hasData: result.hasData,
        reason: result.reason
      };
    } catch (error) {
      return { 
        success: false, 
        path: dirPath,
        error: error.message 
      };
    }
  }

  /**
   * Validate paths configuration with comprehensive checks
   */
  async validatePaths(memoriesPath, tasksPath) {
    return await validatePathsConfiguration(memoriesPath, tasksPath);
  }

  /**
   * Safely update paths with validation and backup
   */
  async safeUpdatePaths(newMemoryPath, newTaskPath) {
    const currentPaths = this.getEffectivePaths();
    
    try {
      const result = await safeUpdatePaths(
        currentPaths.memories,
        currentPaths.tasks,
        newMemoryPath,
        newTaskPath
      );
      
      // Save the validated paths
      const saved = this.save({
        memoriesPath: result.memories.path,
        tasksPath: result.tasks.path
      });
      
      if (!saved) {
        throw new Error('Failed to save path configuration');
      }
      
      return result;
    } catch (error) {
      console.error('Safe path update failed:', error);
      throw error;
    }
  }

  /**
   * Get effective paths (from settings or environment)
   */
  getEffectivePaths() {
    const settings = this.load();
    
    return {
      memories: process.env.MEMORY_DIR || settings.memoriesPath || 'memories',
      tasks: process.env.TASK_DIR || settings.tasksPath || 'tasks'
    };
  }
}