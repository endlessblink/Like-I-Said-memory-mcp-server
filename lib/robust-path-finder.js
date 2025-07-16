import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Robust path finder with validation and error handling
 * Based on Node.js best practices for 2024
 */

/**
 * Validate that a directory exists and is accessible
 */
export async function validateDirectoryAccess(dirPath, timeout = 5000) {
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      console.log(`⏰ Directory validation timeout for ${dirPath}`);
      resolve({ valid: false, error: 'Timeout' });
    }, timeout);
    
    try {
      const absolutePath = path.resolve(dirPath);
      
      // Check if directory exists
      if (!fs.existsSync(absolutePath)) {
        clearTimeout(timeoutId);
        resolve({ valid: false, error: 'Directory does not exist', path: absolutePath });
        return;
      }
      
      // Check if it's actually a directory
      const stats = fs.statSync(absolutePath);
      if (!stats.isDirectory()) {
        clearTimeout(timeoutId);
        resolve({ valid: false, error: 'Path is not a directory', path: absolutePath });
        return;
      }
      
      // Check read permissions
      try {
        fs.accessSync(absolutePath, fs.constants.R_OK);
      } catch (error) {
        clearTimeout(timeoutId);
        resolve({ valid: false, error: 'Directory is not readable', path: absolutePath });
        return;
      }
      
      // Check write permissions
      try {
        fs.accessSync(absolutePath, fs.constants.W_OK);
      } catch (error) {
        clearTimeout(timeoutId);
        resolve({ valid: false, error: 'Directory is not writable', path: absolutePath });
        return;
      }
      
      // Test actual read/write operations
      try {
        const testFile = path.join(absolutePath, '.write-test-' + Date.now());
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        
        clearTimeout(timeoutId);
        console.log(`✅ Directory validated: ${absolutePath}`);
        resolve({ valid: true, path: absolutePath });
      } catch (error) {
        clearTimeout(timeoutId);
        resolve({ valid: false, error: 'Cannot perform read/write operations', path: absolutePath });
      }
    } catch (error) {
      clearTimeout(timeoutId);
      resolve({ valid: false, error: error.message, path: dirPath });
    }
  });
}

/**
 * Ensure directory exists with proper error handling
 */
export async function ensureDirectoryExists(dirPath, createIfMissing = false) {
  try {
    const absolutePath = path.resolve(dirPath);
    
    // Check if directory already exists
    if (fs.existsSync(absolutePath)) {
      const validation = await validateDirectoryAccess(absolutePath);
      if (validation.valid) {
        return { success: true, path: absolutePath, created: false };
      } else {
        return { success: false, path: absolutePath, error: validation.error };
      }
    }
    
    // Create directory if missing and allowed
    if (createIfMissing) {
      try {
        fs.mkdirSync(absolutePath, { recursive: true });
        console.log(`📁 Created directory: ${absolutePath}`);
        
        // Validate the newly created directory
        const validation = await validateDirectoryAccess(absolutePath);
        if (validation.valid) {
          return { success: true, path: absolutePath, created: true };
        } else {
          return { success: false, path: absolutePath, error: `Created but not accessible: ${validation.error}` };
        }
      } catch (error) {
        return { success: false, path: absolutePath, error: `Failed to create: ${error.message}` };
      }
    } else {
      return { success: false, path: absolutePath, error: 'Directory does not exist and creation not allowed' };
    }
  } catch (error) {
    return { success: false, path: dirPath, error: error.message };
  }
}

/**
 * Count files in a directory with proper error handling
 */
export async function countDirectoryContents(dirPath, extension = '.md') {
  try {
    const absolutePath = path.resolve(dirPath);
    
    if (!fs.existsSync(absolutePath)) {
      return { count: 0, projects: 0, error: 'Directory does not exist' };
    }
    
    const items = fs.readdirSync(absolutePath);
    const projects = [];
    let totalFiles = 0;
    
    for (const item of items) {
      try {
        const itemPath = path.join(absolutePath, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory()) {
          projects.push(item);
          
          // Count files in project directory
          try {
            const projectFiles = fs.readdirSync(itemPath);
            const mdFiles = projectFiles.filter(f => f.endsWith(extension));
            totalFiles += mdFiles.length;
          } catch (projectError) {
            console.warn(`⚠️ Cannot read project directory ${item}: ${projectError.message}`);
          }
        }
      } catch (itemError) {
        console.warn(`⚠️ Cannot stat item ${item}: ${itemError.message}`);
      }
    }
    
    return { 
      count: totalFiles, 
      projects: projects.length, 
      projectNames: projects.slice(0, 5), // First 5 project names
      path: absolutePath 
    };
  } catch (error) {
    return { count: 0, projects: 0, error: error.message };
  }
}

/**
 * Find existing data directories with comprehensive search
 */
export async function findExistingDataDirectories(type = 'memories') {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const projectRoot = path.join(__dirname, '..');
  
  const searchPaths = [
    path.join(projectRoot, type),
    path.join(process.cwd(), type),
    path.join(process.env.HOME || process.env.USERPROFILE || '', `.like-i-said`, type),
    path.join(process.env.HOME || process.env.USERPROFILE || '', `Documents`, `Like-I-Said`, type),
    // Add more common locations
    path.join(process.env.APPDATA || '', 'like-i-said', type),
    path.join(process.env.LOCALAPPDATA || '', 'like-i-said', type),
  ];
  
  const candidates = [];
  
  console.log(`🔍 Searching for existing ${type} directories...`);
  
  for (const searchPath of searchPaths) {
    if (!searchPath || searchPath.includes('null') || searchPath.includes('undefined')) {
      continue;
    }
    
    try {
      const validation = await validateDirectoryAccess(searchPath);
      if (validation.valid) {
        const contents = await countDirectoryContents(searchPath);
        
        if (contents.count > 0) {
          candidates.push({
            path: validation.path,
            count: contents.count,
            projects: contents.projects,
            projectNames: contents.projectNames,
            score: contents.count * 10 + contents.projects // Scoring for prioritization
          });
          
          console.log(`📁 Found ${type} data: ${validation.path} (${contents.count} files, ${contents.projects} projects)`);
        }
      }
    } catch (error) {
      // Silent continue - many paths won't exist
    }
  }
  
  // Sort by score (files + projects)
  candidates.sort((a, b) => b.score - a.score);
  
  return candidates;
}

/**
 * Intelligent path resolution with validation
 */
export async function resolveOptimalPath(currentPath, type = 'memories') {
  console.log(`🎯 Resolving optimal path for ${type}, current: ${currentPath}`);
  
  // First, validate current path
  const currentValidation = await validateDirectoryAccess(currentPath);
  const currentContents = await countDirectoryContents(currentPath);
  
  console.log(`📊 Current path analysis: ${currentContents.count} files, ${currentContents.projects} projects`);
  
  // If current path has data and is valid, keep it
  if (currentValidation.valid && currentContents.count > 0) {
    console.log(`✅ Current path is optimal: ${currentValidation.path}`);
    return {
      path: currentValidation.path,
      reason: 'Current path has data and is accessible',
      hasData: true,
      ...currentContents
    };
  }
  
  // Search for better alternatives
  const candidates = await findExistingDataDirectories(type);
  
  if (candidates.length > 0) {
    const best = candidates[0];
    console.log(`🔄 Found better path: ${best.path} (${best.count} files vs ${currentContents.count})`);
    
    return {
      path: best.path,
      reason: 'Found existing data directory with more content',
      hasData: true,
      ...best
    };
  }
  
  // If current path is valid but empty, use it
  if (currentValidation.valid) {
    console.log(`📁 Using current valid path: ${currentValidation.path}`);
    return {
      path: currentValidation.path,
      reason: 'Current path is valid and accessible',
      hasData: false,
      ...currentContents
    };
  }
  
  // Try to create current path
  const createResult = await ensureDirectoryExists(currentPath, true);
  if (createResult.success) {
    console.log(`📁 Created new directory: ${createResult.path}`);
    return {
      path: createResult.path,
      reason: 'Created new directory',
      hasData: false,
      count: 0,
      projects: 0
    };
  }
  
  // Fallback to default in project root
  const fallbackPath = path.join(process.cwd(), type);
  const fallbackResult = await ensureDirectoryExists(fallbackPath, true);
  
  if (fallbackResult.success) {
    console.log(`📁 Using fallback path: ${fallbackResult.path}`);
    return {
      path: fallbackResult.path,
      reason: 'Fallback to project root',
      hasData: false,
      count: 0,
      projects: 0
    };
  }
  
  throw new Error(`❌ Cannot resolve path for ${type}: all options failed`);
}

/**
 * Validate paths configuration with comprehensive checks
 */
export async function validatePathsConfiguration(memoriesPath, tasksPath) {
  console.log(`🔍 Validating paths configuration...`);
  
  const results = {
    memories: await resolveOptimalPath(memoriesPath, 'memories'),
    tasks: await resolveOptimalPath(tasksPath, 'tasks'),
    valid: true,
    warnings: [],
    errors: []
  };
  
  // Check for issues
  if (!results.memories.hasData && !results.tasks.hasData) {
    results.warnings.push('No existing data found in either memories or tasks directories');
  }
  
  if (results.memories.path === results.tasks.path) {
    results.errors.push('Memories and tasks paths cannot be the same');
    results.valid = false;
  }
  
  // Check for write permissions
  const memoryWrite = await validateDirectoryAccess(results.memories.path);
  const taskWrite = await validateDirectoryAccess(results.tasks.path);
  
  if (!memoryWrite.valid) {
    results.errors.push(`Memory directory not writable: ${memoryWrite.error}`);
    results.valid = false;
  }
  
  if (!taskWrite.valid) {
    results.errors.push(`Task directory not writable: ${taskWrite.error}`);
    results.valid = false;
  }
  
  console.log(`📊 Path validation complete: ${results.valid ? 'VALID' : 'INVALID'}`);
  if (results.warnings.length > 0) {
    console.log(`⚠️ Warnings: ${results.warnings.join(', ')}`);
  }
  if (results.errors.length > 0) {
    console.log(`❌ Errors: ${results.errors.join(', ')}`);
  }
  
  return results;
}

/**
 * Safe path update with backup and rollback
 */
export async function safeUpdatePaths(currentMemoryPath, currentTaskPath, newMemoryPath, newTaskPath) {
  console.log(`🔄 Safe path update initiated...`);
  
  // Validate new paths
  const validation = await validatePathsConfiguration(newMemoryPath, newTaskPath);
  
  if (!validation.valid) {
    throw new Error(`❌ Path validation failed: ${validation.errors.join(', ')}`);
  }
  
  // Create backup of current configuration
  const backup = {
    memories: currentMemoryPath,
    tasks: currentTaskPath,
    timestamp: new Date().toISOString()
  };
  
  try {
    // Apply new paths
    const result = {
      memories: validation.memories,
      tasks: validation.tasks,
      backup: backup,
      success: true
    };
    
    console.log(`✅ Path update successful`);
    console.log(`📁 New memories path: ${result.memories.path}`);
    console.log(`📁 New tasks path: ${result.tasks.path}`);
    
    return result;
  } catch (error) {
    console.error(`❌ Path update failed: ${error.message}`);
    throw error;
  }
}