/**
 * Automation Configuration Module
 * Provides safe, configurable settings for task automation system
 */

export class AutomationConfig {
  constructor() {
    this.settings = {
      // Core automation settings
      enableFileChangeAutomation: true,      // Enable automation on file changes
      enableScheduledAutomation: false,      // Start with scheduled automation disabled for safety
      enableGitIntegration: true,            // Enable git status monitoring
      
      // Timing settings
      automationInterval: 300000,            // 5 minutes for scheduled checks
      fileChangeDebounce: 2000,              // 2 seconds debounce for file changes
      
      // Confidence and safety thresholds
      confidenceThreshold: 0.9,              // Increased: Minimum confidence for auto-status updates
      maxAutomationsPerHour: 20,             // Rate limiting for safety
      requireHighConfidence: true,           // Only apply high-confidence automations
      
      // Automation rules
      autoProgressOnFileChange: false,       // DISABLED: Let LLMs manage state transitions explicitly
      autoCompleteSubtasks: true,            // Auto-complete parent when subtasks done
      autoDetectBlocked: true,               // Auto-detect blocked tasks
      autoDetectStale: true,                 // Auto-detect stale tasks
      
      // User preferences
      notifyOnAutomation: true,              // Notify dashboard on automation actions
      logAutomationActions: true,            // Log all automation actions
      allowManualOverride: true,             // Allow users to override automation
      
      // Safety settings
      dryRunMode: false,                     // Run in dry-run mode (no actual changes)
      requireUserApproval: false,            // Require approval for automations
      blacklistProjects: [],                 // Projects to exclude from automation
      whitelistProjects: [],                 // If set, only these projects get automation
      
      // Advanced settings
      gitCommitPatterns: {
        complete: ['fix:', 'feat:', 'complete:', 'done:', 'finish:'],
        inProgress: ['wip:', 'working on:', 'implementing:'],
        blocked: ['blocked:', 'stuck:', 'waiting:']
      }
    };
    
    // Automation statistics
    this.stats = {
      totalAutomations: 0,
      recentAutomations: [],
      lastAutomationTime: null,
      automationsByType: {}
    };
  }
  
  /**
   * Get a setting value
   */
  get(key) {
    return this.settings[key];
  }
  
  /**
   * Update a setting value
   */
  set(key, value) {
    if (key in this.settings) {
      this.settings[key] = value;
      console.error(`📋 Automation setting updated: ${key} = ${value}`);
    }
  }
  
  /**
   * Check if automation is enabled for a project
   */
  isProjectEnabled(projectName) {
    // Check blacklist
    if (this.settings.blacklistProjects.includes(projectName)) {
      return false;
    }
    
    // Check whitelist (if set)
    if (this.settings.whitelistProjects.length > 0) {
      return this.settings.whitelistProjects.includes(projectName);
    }
    
    return true;
  }
  
  /**
   * Check if automation rate limit is exceeded
   */
  checkRateLimit() {
    const oneHourAgo = Date.now() - 3600000;
    const recentCount = this.stats.recentAutomations.filter(
      auto => auto.timestamp > oneHourAgo
    ).length;
    
    return recentCount < this.settings.maxAutomationsPerHour;
  }
  
  /**
   * Record an automation action
   */
  recordAutomation(type, taskId, details) {
    const automation = {
      type,
      taskId,
      timestamp: Date.now(),
      details
    };
    
    this.stats.totalAutomations++;
    this.stats.recentAutomations.push(automation);
    this.stats.lastAutomationTime = automation.timestamp;
    
    // Update type statistics
    if (!this.stats.automationsByType[type]) {
      this.stats.automationsByType[type] = 0;
    }
    this.stats.automationsByType[type]++;
    
    // Keep only recent automations (last 24 hours)
    const oneDayAgo = Date.now() - 86400000;
    this.stats.recentAutomations = this.stats.recentAutomations.filter(
      auto => auto.timestamp > oneDayAgo
    );
    
    if (this.settings.logAutomationActions) {
      console.error(`🤖 Automation recorded: ${type} for task ${taskId}`);
    }
  }
  
  /**
   * Get automation statistics
   */
  getStats() {
    return {
      ...this.stats,
      recentCount: this.stats.recentAutomations.length,
      isRateLimited: !this.checkRateLimit()
    };
  }
  
  /**
   * Reset automation statistics
   */
  resetStats() {
    this.stats = {
      totalAutomations: 0,
      recentAutomations: [],
      lastAutomationTime: null,
      automationsByType: {}
    };
  }
  
  /**
   * Export configuration for persistence
   */
  export() {
    return {
      settings: this.settings,
      stats: this.stats
    };
  }
  
  /**
   * Import configuration from persistence
   */
  import(config) {
    if (config.settings) {
      this.settings = { ...this.settings, ...config.settings };
    }
    if (config.stats) {
      this.stats = { ...this.stats, ...config.stats };
    }
  }
}

export default AutomationConfig;