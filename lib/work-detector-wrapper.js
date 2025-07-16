/**
 * Safe Integration Wrapper for Universal Work Detector
 * Provides gradual integration without breaking existing functionality
 */

// Universal work detector import removed - fallback implementation

export class WorkDetectorWrapper {
  constructor(options = {}) {
    this.enabled = options.enabled || false;
    this.debugMode = options.debugMode || true;
    this.safeMode = options.safeMode !== false; // Safe mode on by default
    
    // Initialize detector only if enabled - fallback disabled
    this.detector = null; // Disabled until universal-work-detector.js is available
    
    // Track activity for debugging/monitoring
    this.activityLog = [];
    this.maxLogSize = 100;
    
    // Integration stats
    this.stats = {
      totalActivities: 0,
      patternsDetected: 0,
      memoriesCreated: 0,
      errors: 0
    };
  }
  
  /**
   * Safely track activity with error handling
   */
  trackActivity(toolName, args, result) {
    if (!this.enabled) {
      return null;
    }
    
    try {
      this.stats.totalActivities++;
      
      // Create activity object
      const activity = {
        tool: toolName,
        args: this.safeMode ? this.sanitizeArgs(args) : args,
        result: this.safeMode ? this.sanitizeResult(result) : result,
        timestamp: Date.now(),
        success: !result?.error
      };
      
      // Log activity for debugging
      this.logActivity(activity);
      
      // Process with detector if available
      if (this.detector) {
        const memory = this.detector.detectWorkPattern(activity);
        
        if (memory) {
          this.stats.memoriesCreated++;
          this.stats.patternsDetected++;
          
          if (this.debugMode) {
            console.error('[WorkDetector] Pattern detected:', {
              tool: toolName,
              pattern: memory.metadata?.workType,
              domain: memory.metadata?.domain
            });
          }
          
          return memory;
        }
      }
      
      return null;
      
    } catch (error) {
      this.stats.errors++;
      
      if (this.debugMode) {
        console.error('[WorkDetector] Error tracking activity:', error);
      }
      
      // In safe mode, errors don't break the system
      if (this.safeMode) {
        return null;
      } else {
        throw error;
      }
    }
  }
  
  /**
   * Log activity for debugging and monitoring
   */
  logActivity(activity) {
    this.activityLog.push({
      tool: activity.tool,
      timestamp: activity.timestamp,
      success: activity.success
    });
    
    // Keep log size manageable
    if (this.activityLog.length > this.maxLogSize) {
      this.activityLog.shift();
    }
  }
  
  /**
   * Sanitize arguments to remove sensitive data
   */
  sanitizeArgs(args) {
    if (!args || typeof args !== 'object') {
      return args;
    }
    
    const sanitized = { ...args };
    
    // Remove potentially sensitive fields
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.secret;
    delete sanitized.apiKey;
    delete sanitized.privateKey;
    
    return sanitized;
  }
  
  /**
   * Sanitize result to remove sensitive data
   */
  sanitizeResult(result) {
    if (!result || typeof result !== 'object') {
      return result;
    }
    
    const sanitized = { ...result };
    
    // Remove potentially sensitive fields
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.secret;
    
    return sanitized;
  }
  
  /**
   * Enable the detector
   */
  enable() {
    this.enabled = true;
    // Detector disabled - universal-work-detector.js not available
    this.detector = null;
    
    if (this.debugMode) {
      console.error('[WorkDetector] Enabled');
    }
  }
  
  /**
   * Disable the detector
   */
  disable() {
    this.enabled = false;
    
    if (this.debugMode) {
      console.error('[WorkDetector] Disabled');
    }
  }
  
  /**
   * Get current statistics
   */
  getStats() {
    return {
      ...this.stats,
      enabled: this.enabled,
      recentActivities: this.activityLog.slice(-10)
    };
  }
  
  /**
   * Get recent activity log
   */
  getActivityLog() {
    return this.activityLog;
  }
  
  /**
   * Clear activity log
   */
  clearActivityLog() {
    this.activityLog = [];
  }
  
  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalActivities: 0,
      patternsDetected: 0,
      memoriesCreated: 0,
      errors: 0
    };
  }
  
  /**
   * Check if detector is healthy
   */
  isHealthy() {
    if (!this.enabled) {
      return { healthy: true, reason: 'Disabled' };
    }
    
    const errorRate = this.stats.errors / Math.max(this.stats.totalActivities, 1);
    
    if (errorRate > 0.1) {
      return { healthy: false, reason: 'High error rate', errorRate };
    }
    
    return { healthy: true, reason: 'Operating normally' };
  }
}

export default WorkDetectorWrapper;