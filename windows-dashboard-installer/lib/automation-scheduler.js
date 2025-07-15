/**
 * Automation Scheduler for Background Task Processing
 * Provides scheduled automation checks for proactive task status updates
 */

import { TaskAutomation } from './task-automation.js';

export class AutomationScheduler {
  constructor(taskStorage, automationConfig, fileSystemMonitor = null) {
    this.taskStorage = taskStorage;
    this.automationConfig = automationConfig;
    this.fileSystemMonitor = fileSystemMonitor;
    this.taskAutomation = new TaskAutomation(taskStorage);
    
    // Scheduling state
    this.intervalId = null;
    this.isRunning = false;
    this.lastRunTime = null;
    this.runCount = 0;
    
    // Performance tracking
    this.performanceStats = {
      totalRuns: 0,
      totalDuration: 0,
      averageDuration: 0,
      lastDuration: 0,
      automationsApplied: 0
    };
  }
  
  /**
   * Start the automation scheduler
   */
  start() {
    if (this.isRunning) {
      console.log('⏰ Automation scheduler already running');
      return;
    }
    
    if (!this.automationConfig.get('enableScheduledAutomation')) {
      console.log('⏰ Scheduled automation is disabled in configuration');
      return;
    }
    
    const interval = this.automationConfig.get('automationInterval');
    console.log(`⏰ Starting automation scheduler (interval: ${interval}ms)`);
    
    // Run initial check
    this.runAutomationCheck();
    
    // Schedule periodic checks
    this.intervalId = setInterval(() => {
      this.runAutomationCheck();
    }, interval);
    
    this.isRunning = true;
  }
  
  /**
   * Stop the automation scheduler
   */
  stop() {
    if (!this.isRunning) {
      return;
    }
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.isRunning = false;
    console.log('⏰ Automation scheduler stopped');
  }
  
  /**
   * Run automation check for all tasks
   */
  async runAutomationCheck() {
    const startTime = Date.now();
    console.log(`⏰ Running scheduled automation check #${this.runCount + 1}`);
    
    try {
      // Check if scheduled automation is still enabled
      if (!this.automationConfig.get('enableScheduledAutomation')) {
        console.log('⏰ Scheduled automation disabled, skipping check');
        return;
      }
      
      // Get all tasks
      const tasks = this.taskStorage.getAllTasks();
      let automationsApplied = 0;
      
      // Process tasks in batches to avoid overwhelming the system
      const batchSize = 10;
      for (let i = 0; i < tasks.length; i += batchSize) {
        const batch = tasks.slice(i, i + batchSize);
        
        // Process batch in parallel
        const results = await Promise.all(
          batch.map(task => this.checkTaskForAutomation(task))
        );
        
        // Count successful automations
        automationsApplied += results.filter(r => r).length;
      }
      
      // Update statistics
      const duration = Date.now() - startTime;
      this.updatePerformanceStats(duration, automationsApplied);
      
      console.log(`⏰ Automation check completed in ${duration}ms (${automationsApplied} automations applied)`);
      
    } catch (error) {
      console.error('❌ Error in scheduled automation check:', error);
    } finally {
      this.lastRunTime = new Date();
      this.runCount++;
    }
  }
  
  /**
   * Check a single task for automation opportunities
   */
  async checkTaskForAutomation(task) {
    try {
      // Skip if project is not enabled for automation
      if (!this.automationConfig.isProjectEnabled(task.project)) {
        return false;
      }
      
      // Skip if task is already completed
      if (task.status === 'done') {
        return false;
      }
      
      // Get automation suggestions
      const suggestions = await this.taskAutomation.getAutomationSuggestions(task.id);
      
      if (!suggestions || !suggestions.hasOpportunities) {
        return false;
      }
      
      // Check for high-confidence automations
      const confidenceThreshold = this.automationConfig.get('confidenceThreshold');
      let applied = false;
      
      // Process status change suggestions
      if (suggestions.statusChange && 
          suggestions.statusChange.confidence >= confidenceThreshold) {
        
        // For scheduled automation, only apply very high confidence changes
        if (suggestions.statusChange.confidence >= 0.85) {
          console.log(`⏰ Applying scheduled automation for task: ${task.title}`);
          
          if (this.fileSystemMonitor) {
            await this.fileSystemMonitor.applyStatusChange(
              task,
              suggestions.statusChange.suggestedStatus,
              suggestions.statusChange.reason
            );
            applied = true;
          }
        }
      }
      
      // Process other high-confidence opportunities
      if (suggestions.opportunities) {
        for (const [type, opportunity] of Object.entries(suggestions.opportunities)) {
          if (opportunity.shouldApply && 
              opportunity.confidence >= 0.9 && // Higher threshold for scheduled
              this.shouldApplyScheduledAutomation(type)) {
            
            console.log(`⏰ Scheduled automation opportunity: ${type} for ${task.title}`);
            
            if (this.fileSystemMonitor) {
              await this.fileSystemMonitor.applyAutomationType(task, type, opportunity);
              applied = true;
            }
          }
        }
      }
      
      return applied;
      
    } catch (error) {
      console.error(`❌ Error checking automation for task ${task.id}:`, error);
      return false;
    }
  }
  
  /**
   * Check if a specific automation type should be applied in scheduled mode
   */
  shouldApplyScheduledAutomation(type) {
    // Only certain automation types are suitable for scheduled application
    const scheduledTypes = {
      'subtask_completion': true,      // Safe to apply automatically
      'memory_evidence': false,        // Requires more context
      'dependency_resolution': true,   // Safe when dependencies are clear
      'stale_detection': true,         // Good for scheduled checks
      'blocked_detection': true        // Good for scheduled checks
    };
    
    return scheduledTypes[type] === true;
  }
  
  /**
   * Update performance statistics
   */
  updatePerformanceStats(duration, automationsApplied) {
    this.performanceStats.totalRuns++;
    this.performanceStats.totalDuration += duration;
    this.performanceStats.averageDuration = 
      this.performanceStats.totalDuration / this.performanceStats.totalRuns;
    this.performanceStats.lastDuration = duration;
    this.performanceStats.automationsApplied += automationsApplied;
    
    // Record in automation config
    this.automationConfig.recordAutomation('scheduledCheck', 'scheduler', {
      duration,
      automationsApplied,
      tasksChecked: this.taskStorage.getAllTasks().length
    });
  }
  
  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRunTime: this.lastRunTime,
      runCount: this.runCount,
      nextRunTime: this.getNextRunTime(),
      performanceStats: this.performanceStats,
      config: {
        enabled: this.automationConfig.get('enableScheduledAutomation'),
        interval: this.automationConfig.get('automationInterval')
      }
    };
  }
  
  /**
   * Calculate next run time
   */
  getNextRunTime() {
    if (!this.isRunning || !this.lastRunTime) {
      return null;
    }
    
    const interval = this.automationConfig.get('automationInterval');
    return new Date(this.lastRunTime.getTime() + interval);
  }
  
  /**
   * Force an immediate automation check
   */
  async forceCheck() {
    console.log('⏰ Forcing immediate automation check');
    await this.runAutomationCheck();
  }
}

export default AutomationScheduler;