import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
   * Ensure directory exists and is writable
   */
  async ensureDirectory(dirPath) {
    try {
      const absolutePath = path.resolve(dirPath);
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(absolutePath)) {
        fs.mkdirSync(absolutePath, { recursive: true });
        console.log(`✅ Created directory: ${absolutePath}`);
      }
      
      // Check if directory is writable
      try {
        const testFile = path.join(absolutePath, '.write-test');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        return { success: true, path: absolutePath };
      } catch (error) {
        return { 
          success: false, 
          path: absolutePath,
          error: 'Directory is not writable' 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        path: dirPath,
        error: error.message 
      };
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