import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Discover existing Like-I-Said folders on the system
 */
export class FolderDiscovery {
  constructor() {
    this.commonLocations = this.getCommonLocations();
  }

  /**
   * Get common locations where Like-I-Said might be installed
   */
  getCommonLocations() {
    const home = os.homedir();
    const locations = [];

    // User home directory variations
    locations.push(
      path.join(home, 'memories'),
      path.join(home, 'tasks'),
      path.join(home, 'like-i-said'),
      path.join(home, 'like-i-said-mcp'),
      path.join(home, 'like-i-said-memory'),
      path.join(home, '.like-i-said')
    );

    // Documents folder
    if (process.platform === 'win32') {
      locations.push(
        path.join(home, 'Documents', 'like-i-said'),
        path.join(home, 'Documents', 'memories'),
        path.join(home, 'Documents', 'AI', 'like-i-said'),
        path.join(home, 'Documents', 'Claude', 'memories')
      );
    } else {
      locations.push(
        path.join(home, 'Documents', 'like-i-said'),
        path.join(home, 'Documents', 'memories')
      );
    }

    // Platform specific locations
    if (process.platform === 'win32') {
      // Windows specific paths
      locations.push(
        'C:\\like-i-said',
        'C:\\Users\\Public\\like-i-said',
        'D:\\like-i-said',
        'D:\\MY PROJECTS\\AI\\LLM\\AI Code Gen\\my-builds\\My MCP\\like-i-said-npm-test\\Like-I-Said-memory-mcp-server',
        'D:\\MY PROJECTS\\AI\\like-i-said'
      );
      
      // AppData locations
      locations.push(
        path.join(process.env.APPDATA || '', 'like-i-said'),
        path.join(process.env.LOCALAPPDATA || '', 'like-i-said')
      );
    } else if (process.platform === 'darwin') {
      // macOS specific
      locations.push(
        path.join(home, 'Library', 'Application Support', 'like-i-said'),
        '/usr/local/share/like-i-said'
      );
    } else {
      // Linux
      locations.push(
        path.join(home, '.local', 'share', 'like-i-said'),
        '/opt/like-i-said',
        '/usr/local/share/like-i-said'
      );
    }

    // Current working directory
    locations.push(
      path.join(process.cwd(), 'memories'),
      path.join(process.cwd(), 'tasks'),
      process.cwd()
    );

    // Remove duplicates and empty paths
    return [...new Set(locations.filter(loc => loc && loc.length > 0))];
  }

  /**
   * Check if a directory contains Like-I-Said data
   */
  async isLikeISaidDirectory(dirPath) {
    try {
      const stats = await fs.promises.stat(dirPath);
      if (!stats.isDirectory()) return false;

      // Check for memories or tasks subdirectories
      const hasMemories = fs.existsSync(path.join(dirPath, 'memories'));
      const hasTasks = fs.existsSync(path.join(dirPath, 'tasks'));
      
      // Check if the directory itself might be a memories/tasks folder
      const files = await fs.promises.readdir(dirPath);
      const hasMarkdownFiles = files.some(file => file.endsWith('.md'));
      const hasProjectFolders = files.some(file => {
        const filePath = path.join(dirPath, file);
        return fs.statSync(filePath).isDirectory() && !file.startsWith('.');
      });

      return (hasMemories || hasTasks) || (hasMarkdownFiles && hasProjectFolders);
    } catch (error) {
      return false;
    }
  }

  /**
   * Discover all Like-I-Said installations
   */
  async discoverFolders() {
    const discovered = [];
    const checked = new Set();

    for (const location of this.commonLocations) {
      // Skip if already checked
      if (checked.has(location)) continue;
      checked.add(location);

      try {
        // Check if location exists
        if (!fs.existsSync(location)) continue;

        // Check if it's a Like-I-Said directory
        if (await this.isLikeISaidDirectory(location)) {
          const info = await this.getFolderInfo(location);
          if (info) {
            discovered.push(info);
          }
        }

        // Also check parent directory
        const parent = path.dirname(location);
        if (!checked.has(parent) && fs.existsSync(parent)) {
          checked.add(parent);
          if (await this.isLikeISaidDirectory(parent)) {
            const info = await this.getFolderInfo(parent);
            if (info) {
              discovered.push(info);
            }
          }
        }
      } catch (error) {
        // Skip errors for inaccessible directories
        continue;
      }
    }

    // Sort by most recently modified
    discovered.sort((a, b) => b.lastModified - a.lastModified);

    return discovered;
  }

  /**
   * Get detailed information about a discovered folder
   */
  async getFolderInfo(dirPath) {
    try {
      const stats = await fs.promises.stat(dirPath);
      const memoriesPath = path.join(dirPath, 'memories');
      const tasksPath = path.join(dirPath, 'tasks');
      
      // Count items
      let memoryCount = 0;
      let taskCount = 0;
      let projectCount = new Set();

      if (fs.existsSync(memoriesPath)) {
        const memoriesInfo = await this.countItems(memoriesPath);
        memoryCount = memoriesInfo.fileCount;
        memoriesInfo.projects.forEach(p => projectCount.add(p));
      }

      if (fs.existsSync(tasksPath)) {
        const tasksInfo = await this.countItems(tasksPath);
        taskCount = tasksInfo.fileCount;
        tasksInfo.projects.forEach(p => projectCount.add(p));
      }

      // If no standard subdirs, check if this IS a memories/tasks dir
      if (memoryCount === 0 && taskCount === 0) {
        const directInfo = await this.countItems(dirPath);
        if (directInfo.fileCount > 0) {
          // This might be a memories or tasks directory itself
          const baseName = path.basename(dirPath).toLowerCase();
          if (baseName.includes('memor')) {
            memoryCount = directInfo.fileCount;
            directInfo.projects.forEach(p => projectCount.add(p));
          } else if (baseName.includes('task')) {
            taskCount = directInfo.fileCount;
            directInfo.projects.forEach(p => projectCount.add(p));
          }
        }
      }

      return {
        path: dirPath,
        name: this.generateFolderName(dirPath),
        memoriesPath: fs.existsSync(memoriesPath) ? memoriesPath : dirPath,
        tasksPath: fs.existsSync(tasksPath) ? tasksPath : dirPath,
        lastModified: stats.mtime,
        memoryCount,
        taskCount,
        projectCount: projectCount.size,
        isComplete: fs.existsSync(memoriesPath) && fs.existsSync(tasksPath)
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Count markdown files and projects in a directory
   */
  async countItems(dirPath) {
    let fileCount = 0;
    const projects = new Set();

    try {
      const items = await fs.promises.readdir(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stats = await fs.promises.stat(itemPath);
        
        if (stats.isDirectory() && !item.startsWith('.')) {
          projects.add(item);
          // Count files in subdirectory
          try {
            const subItems = await fs.promises.readdir(itemPath);
            fileCount += subItems.filter(f => f.endsWith('.md')).length;
          } catch (e) {
            // Skip inaccessible subdirs
          }
        } else if (item.endsWith('.md')) {
          fileCount++;
        }
      }
    } catch (error) {
      // Return what we have so far
    }

    return { fileCount, projects: Array.from(projects) };
  }

  /**
   * Generate a friendly name for the discovered folder
   */
  generateFolderName(dirPath) {
    const normalized = path.normalize(dirPath);
    
    // Special case for known user path
    if (normalized.includes('MY PROJECTS\\AI\\LLM')) {
      return 'User Installation (D: Drive)';
    }
    
    // Check if it's in home directory
    const home = os.homedir();
    if (normalized.startsWith(home)) {
      const relative = path.relative(home, normalized);
      if (relative === 'memories' || relative === 'tasks') {
        return 'Home Directory (Default)';
      }
      return `Home Directory (${relative})`;
    }
    
    // Check common patterns
    if (normalized.includes('Documents')) {
      return 'Documents Folder';
    }
    
    if (normalized.includes('AppData')) {
      return 'AppData Installation';
    }
    
    // Default to showing last two path segments
    const parts = normalized.split(path.sep);
    if (parts.length >= 2) {
      return parts.slice(-2).join(' / ');
    }
    
    return path.basename(normalized);
  }
}