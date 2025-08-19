/**
 * Safe Integration Wrapper for Universal Work Detector
 * Provides gradual integration without breaking existing functionality
 */

import { UniversalWorkDetector } from './universal-work-detector.js';

export class WorkDetectorWrapper {
  constructor(options = {}) {
    this.enabled = options.enabled || false;
    this.debugMode = options.debugMode || true;
    this.safeMode = options.safeMode !== false; // Safe mode on by default
    
    // Initialize detector only if enabled
    this.detector = this.enabled ? new UniversalWorkDetector() : null;
    
    // Track activity for debugging/monitoring
    this.activityLog = [];
    this.maxLogSize = 100;
    
    // Integration stats (ENHANCED: including task tracking)
    this.stats = {
      totalActivities: 0,
      patternsDetected: 0,
      memoriesCreated: 0,
      tasksCreated: 0, // NEW: track task creation
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
        const detection = this.detector.detectWorkPattern(activity);
        
        if (detection) {
          // Handle new enhanced detection format
          const result = {};
          
          if (detection.memory) {
            this.stats.memoriesCreated++;
            this.stats.patternsDetected++;
            result.memory = detection.memory;
            
            if (this.debugMode) {
              console.error('[WorkDetector] Memory pattern detected:', {
                tool: toolName,
                pattern: detection.memory.metadata?.workType,
                domain: detection.memory.metadata?.domain
              });
            }
          }
          
          if (detection.task) {
            this.stats.tasksCreated = (this.stats.tasksCreated || 0) + 1;
            this.stats.patternsDetected++;
            result.task = detection.task;
            
            if (this.debugMode) {
              console.error('[WorkDetector] Task pattern detected:', {
                tool: toolName,
                taskTitle: detection.task.title,
                complexity: detection.task.metadata?.complexity,
                reason: detection.task.metadata?.detectionReason
              });
            }
          }
          
          // Return memory for backward compatibility, but include task info
          if (result.memory) {
            result.memory._taskInfo = result.task; // Include task info in memory
            return result.memory;
          } else if (result.task) {
            // Return task wrapped as memory-compatible object for backward compatibility
            return {
              ...result.task,
              _isTask: true,
              content: result.task.description,
              category: result.task.category || 'work'
            };
          }
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
    // Initialize detector when enabled
    if (!this.detector) {
      this.detector = new UniversalWorkDetector();
    }
    
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
      tasksCreated: 0, // ENHANCED: include task tracking
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