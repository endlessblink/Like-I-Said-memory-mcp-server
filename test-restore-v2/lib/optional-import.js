/**
 * Optional Import Utility
 * 
 * Provides safe dynamic imports for optional dependencies with platform checks
 * and graceful fallback behavior. This prevents crashes on systems where
 * certain dependencies cannot be installed or loaded.
 */

import { platform } from 'os';
import { settingsManager } from './settings-manager.js';

/**
 * Cache for loaded modules to avoid repeated import attempts
 */
const moduleCache = new Map();

/**
 * Cache for failed imports to avoid repeated attempts
 */
const failedImports = new Set();

/**
 * Get platform-specific blocklist based on settings
 */
function getPlatformBlocklist() {
  const blockOnWindows = settingsManager.getSetting('features.blockXenovaOnWindows') || 
                        process.env.BLOCK_XENOVA_ON_WINDOWS === 'true';
  
  return {
    '@xenova/transformers': {
      // Known to cause crashes on some Windows systems
      blockedPlatforms: blockOnWindows ? ['win32'] : [],
      fallbackMessage: 'Semantic search disabled - @xenova/transformers not available on this platform'
    }
  };
}

/**
 * Check if a module is blocked on the current platform
 * @param {string} moduleName - Name of the module to check
 * @returns {boolean} True if blocked on current platform
 */
function isBlockedOnPlatform(moduleName) {
  const blocklist = getPlatformBlocklist();
  const blockConfig = blocklist[moduleName];
  if (!blockConfig) return false;
  
  const currentPlatform = platform();
  return blockConfig.blockedPlatforms.includes(currentPlatform);
}

/**
 * Safely import an optional dependency with fallback behavior
 * @param {string} moduleName - Name of the module to import
 * @param {Object} options - Import options
 * @param {boolean} options.required - Whether to throw if import fails
 * @param {any} options.fallback - Fallback value if import fails
 * @param {Function} options.onError - Callback for import errors
 * @returns {Promise<any>} The imported module or fallback value
 */
export async function optionalImport(moduleName, options = {}) {
  const {
    required = false,
    fallback = null,
    onError = null
  } = options;

  // Check cache first
  if (moduleCache.has(moduleName)) {
    return moduleCache.get(moduleName);
  }

  // Check if previously failed
  if (failedImports.has(moduleName)) {
    if (required) {
      throw new Error(`Required module ${moduleName} is not available`);
    }
    return fallback;
  }

  // Check platform blocklist
  if (isBlockedOnPlatform(moduleName)) {
    console.error(`[OptionalImport] ${moduleName} is blocked on platform ${platform()}`);
    const blocklist = getPlatformBlocklist();
    const blockConfig = blocklist[moduleName];
    if (blockConfig && blockConfig.fallbackMessage) {
      console.error(`[OptionalImport] ${blockConfig.fallbackMessage}`);
    }
    failedImports.add(moduleName);
    if (required) {
      throw new Error(`Module ${moduleName} is blocked on this platform`);
    }
    return fallback;
  }

  try {
    // Attempt dynamic import
    const module = await import(moduleName);
    moduleCache.set(moduleName, module);
    console.error(`[OptionalImport] Successfully loaded ${moduleName}`);
    return module;
  } catch (error) {
    failedImports.add(moduleName);
    
    // Log the error
    console.error(`[OptionalImport] Failed to load ${moduleName}:`, error.message);
    
    // Call error handler if provided
    if (onError) {
      onError(error, moduleName);
    }

    // Handle based on required flag
    if (required) {
      throw new Error(`Failed to load required module ${moduleName}: ${error.message}`);
    }

    return fallback;
  }
}

/**
 * Check if a module is available for import
 * @param {string} moduleName - Name of the module to check
 * @returns {Promise<boolean>} True if module can be imported
 */
export async function isModuleAvailable(moduleName) {
  if (moduleCache.has(moduleName)) {
    return true;
  }

  if (failedImports.has(moduleName) || isBlockedOnPlatform(moduleName)) {
    return false;
  }

  try {
    await optionalImport(moduleName);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create a lazy-loaded module wrapper
 * @param {string} moduleName - Name of the module to wrap
 * @param {Object} fallbackImplementation - Fallback implementation
 * @returns {Proxy} Proxy that lazy-loads the module on first access
 */
export function createLazyModule(moduleName, fallbackImplementation = {}) {
  let module = null;
  let loadAttempted = false;

  return new Proxy({}, {
    get(target, prop) {
      if (!loadAttempted) {
        loadAttempted = true;
        // Attempt to load module synchronously for proxy
        optionalImport(moduleName).then(m => {
          module = m;
        }).catch(() => {
          module = fallbackImplementation;
        });
      }

      if (module) {
        return module[prop];
      }

      // Return fallback implementation property if available
      return fallbackImplementation[prop];
    }
  });
}

/**
 * Clear all caches (useful for testing)
 */
export function clearCaches() {
  moduleCache.clear();
  failedImports.clear();
}

/**
 * Get import statistics (useful for debugging)
 */
export function getImportStats() {
  return {
    loaded: Array.from(moduleCache.keys()),
    failed: Array.from(failedImports),
    platform: platform(),
    blocklist: getPlatformBlocklist()
  };
}