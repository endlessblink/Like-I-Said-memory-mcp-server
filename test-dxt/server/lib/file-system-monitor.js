import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';
import { TaskAutomation } from './task-automation.js';
import { AutomationConfig } from './automation-config.js';

/**
 * File System Monitor for Task Management
 * Monitors file system changes and updates dashboard automatically
 * Enhanced with proactive task automation triggers
 */
export class FileSystemMonitor {
  constructor(taskStorage, dashboardBridge, automationConfig = null) {
    this.taskStorage = taskStorage;
    this.dashboardBridge = dashboardBridge;
    this.tasksDir = 'tasks';
    this.watcher = null;
    this.isWatching = false;
    this.changeQueue = new Map(); // Debounce rapid changes
    this.changeTimeout = 500; // 500ms debounce
    
    // Automation components
    this.automationConfig = automationConfig || new AutomationConfig();
    this.taskAutomation = new TaskAutomation(taskStorage);
    this.automationDebounce = new Map(); // Prevent automation loops
  }

  /**
   * Start monitoring the file system
   */
  startMonitoring() {
    if (this.isWatching) {
      console.log('📡 File system monitor already running');
      return;
    }

    if (!fs.existsSync(this.tasksDir)) {
      fs.mkdirSync(this.tasksDir, { recursive: true });
    }

    this.watcher = chokidar.watch(`${this.tasksDir}/**/*.md`, {
      persistent: true,
      ignoreInitial: true,
      followSymlinks: false,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100
      }
    });

    // File added
    this.watcher.on('add', (filePath) => {
      this.debounceChange(filePath, 'add');
    });

    // File changed
    this.watcher.on('change', (filePath) => {
      this.debounceChange(filePath, 'change');
    });

    // File removed
    this.watcher.on('unlink', (filePath) => {
      this.debounceChange(filePath, 'unlink');
    });

    // Directory added
    this.watcher.on('addDir', (dirPath) => {
      console.log(`📁 Directory added: ${path.basename(dirPath)}`);
      this.broadcastDirectoryChange('add', dirPath);
    });

    // Directory removed
    this.watcher.on('unlinkDir', (dirPath) => {
      console.log(`📁 Directory removed: ${path.basename(dirPath)}`);
      this.broadcastDirectoryChange('remove', dirPath);
    });

    // Error handling
    this.watcher.on('error', (error) => {
      console.error('📡 File system monitor error:', error);
    });

    this.isWatching = true;
    console.log('📡 File system monitor started for tasks directory');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    this.isWatching = false;
    console.log('📡 File system monitor stopped');
  }

  /**
   * Debounce rapid file changes
   */
  debounceChange(filePath, changeType) {
    const key = `${filePath}:${changeType}`;
    
    // Clear existing timeout
    if (this.changeQueue.has(key)) {
      clearTimeout(this.changeQueue.get(key));
    }
    
    // Set new timeout
    const timeout = setTimeout(() => {
      this.handleFileChange(filePath, changeType);
      this.changeQueue.delete(key);
    }, this.changeTimeout);
    
    this.changeQueue.set(key, timeout);
  }

  /**
   * Handle file system changes
   */
  async handleFileChange(filePath, changeType) {
    const relativePath = path.relative(this.tasksDir, filePath);
    const fileName = path.basename(filePath);
    
    console.log(`📄 File ${changeType}: ${fileName}`);
    
    try {
      switch (changeType) {
        case 'add':
          await this.handleFileAdded(filePath);
          break;
        case 'change':
          await this.handleFileChanged(filePath);
          break;
        case 'unlink':
          await this.handleFileRemoved(filePath);
          break;
      }
    } catch (error) {
      console.error(`❌ Error handling ${changeType} for ${fileName}:`, error);
    }
  }

  /**
   * Handle file added
   */
  async handleFileAdded(filePath) {
    try {
      // Reload task index to include new file
      this.taskStorage.reload();
      
      // Get the newly added task
      const tasks = this.taskStorage.getAllTasks();
      const newTask = tasks.find(task => task.filepath === filePath);
      
      if (newTask) {
        console.log(`✅ Task added: ${newTask.title}`);
        
        // Broadcast to dashboard clients
        this.broadcastTaskChange('taskAdded', newTask);
      }
    } catch (error) {
      console.error('Error handling file added:', error);
    }
  }

  /**
   * Handle file changed
   */
  async handleFileChanged(filePath) {
    try {
      // Reload task index to get updated data
      this.taskStorage.reload();
      
      // Get the updated task
      const tasks = this.taskStorage.getAllTasks();
      const updatedTask = tasks.find(task => task.filepath === filePath);
      
      if (updatedTask) {
        console.log(`✅ Task updated: ${updatedTask.title}`);
        
        // Broadcast to dashboard clients
        this.broadcastTaskChange('taskUpdated', updatedTask);
        
        // Trigger automation check if enabled
        if (this.automationConfig.get('enableFileChangeAutomation')) {
          await this.triggerAutomationCheck(updatedTask, 'fileChange');
        }
      }
    } catch (error) {
      console.error('Error handling file changed:', error);
    }
  }

  /**
   * Handle file removed
   */
  async handleFileRemoved(filePath) {
    try {
      // Extract task ID from file path
      const fileName = path.basename(filePath, '.md');
      const taskId = fileName; // Assuming filename is the task ID
      
      console.log(`✅ Task removed: ${taskId}`);
      
      // Reload task index to remove deleted task
      this.taskStorage.reload();
      
      // Broadcast to dashboard clients
      this.broadcastTaskChange('taskDeleted', { id: taskId, filepath: filePath });
    } catch (error) {
      console.error('Error handling file removed:', error);
    }
  }

  /**
   * Broadcast task changes to dashboard clients
   */
  broadcastTaskChange(eventType, task) {
    if (this.dashboardBridge && this.dashboardBridge.broadcastToClients) {
      this.dashboardBridge.broadcastToClients({
        type: eventType,
        task: task,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Broadcast directory changes to dashboard clients
   */
  broadcastDirectoryChange(changeType, dirPath) {
    const project = path.basename(dirPath);
    
    if (this.dashboardBridge && this.dashboardBridge.broadcastToClients) {
      this.dashboardBridge.broadcastToClients({
        type: 'projectChange',
        changeType: changeType,
        project: project,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get monitoring status
   */
  getStatus() {
    return {
      isWatching: this.isWatching,
      watchedPath: this.tasksDir,
      queuedChanges: this.changeQueue.size,
      uptime: this.isWatching ? Date.now() - this.startTime : 0
    };
  }

  /**
   * Force reload of all tasks
   */
  async forceReload() {
    console.log('🔄 Force reloading all tasks...');
    
    try {
      this.taskStorage.reload();
      
      // Broadcast full reload to clients
      if (this.dashboardBridge && this.dashboardBridge.broadcastToClients) {
        this.dashboardBridge.broadcastToClients({
          type: 'tasksReloaded',
          timestamp: new Date().toISOString()
        });
      }
      
      console.log('✅ Tasks reloaded successfully');
    } catch (error) {
      console.error('❌ Error during force reload:', error);
    }
  }

  /**
   * Get file system statistics
   */
  async getFileSystemStats() {
    const stats = {
      totalFiles: 0,
      projects: [],
      lastModified: null
    };
    
    if (!fs.existsSync(this.tasksDir)) {
      return stats;
    }
    
    const projects = fs.readdirSync(this.tasksDir, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);
    
    for (const project of projects) {
      const projectPath = path.join(this.tasksDir, project);
      const statuses = fs.readdirSync(projectPath, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
      
      let projectFileCount = 0;
      let projectLastModified = null;
      
      for (const status of statuses) {
        const statusPath = path.join(projectPath, status);
        const files = fs.readdirSync(statusPath)
          .filter(file => file.endsWith('.md'));
        
        projectFileCount += files.length;
        
        // Get last modified time
        for (const file of files) {
          const filePath = path.join(statusPath, file);
          const stat = fs.statSync(filePath);
          if (!projectLastModified || stat.mtime > projectLastModified) {
            projectLastModified = stat.mtime;
          }
        }
      }
      
      stats.projects.push({
        name: project,
        fileCount: projectFileCount,
        statuses: statuses,
        lastModified: projectLastModified
      });
      
      stats.totalFiles += projectFileCount;
      
      if (!stats.lastModified || (projectLastModified && projectLastModified > stats.lastModified)) {
        stats.lastModified = projectLastModified;
      }
    }
    
    return stats;
  }
  
  /**
   * Trigger automation check for a task
   * Safely checks and applies automation suggestions
   */
  async triggerAutomationCheck(task, triggerType = 'manual') {
    // Check if automation is enabled for this project
    if (!this.automationConfig.isProjectEnabled(task.project)) {
      return;
    }
    
    // Check rate limiting
    if (!this.automationConfig.checkRateLimit()) {
      console.log('⚠️ Automation rate limit reached, skipping automation check');
      return;
    }
    
    // Debounce to prevent automation loops
    const debounceKey = `${task.id}-${triggerType}`;
    if (this.automationDebounce.has(debounceKey)) {
      const lastCheck = this.automationDebounce.get(debounceKey);
      const timeSinceLastCheck = Date.now() - lastCheck;
      const debounceTime = this.automationConfig.get('fileChangeDebounce');
      
      if (timeSinceLastCheck < debounceTime) {
        return; // Skip this check
      }
    }
    
    this.automationDebounce.set(debounceKey, Date.now());
    
    try {
      console.log(`🤖 Checking automation opportunities for task: ${task.title}`);
      
      // Get automation suggestions
      const suggestions = await this.taskAutomation.getAutomationSuggestions(task.id);
      
      if (!suggestions || !suggestions.hasOpportunities) {
        return;
      }
      
      // Apply automations based on confidence and settings
      await this.applyAutomationSuggestions(task, suggestions, triggerType);
      
    } catch (error) {
      console.error('❌ Error in automation check:', error);
    }
  }
  
  /**
   * Apply automation suggestions based on configuration
   */
  async applyAutomationSuggestions(task, suggestions, triggerType) {
    const confidenceThreshold = this.automationConfig.get('confidenceThreshold');
    const requireHighConfidence = this.automationConfig.get('requireHighConfidence');
    const dryRunMode = this.automationConfig.get('dryRunMode');
    
    // Process status change suggestions
    if (suggestions.statusChange && suggestions.statusChange.confidence >= confidenceThreshold) {
      const { suggestedStatus, confidence, reason } = suggestions.statusChange;
      
      // Special handling for file change triggers
      if (triggerType === 'fileChange' && 
          this.automationConfig.get('autoProgressOnFileChange') &&
          task.status === 'todo' && 
          suggestedStatus === 'in_progress') {
        
        console.log(`🤖 Auto-marking task as in_progress due to file change`);
        
        if (!dryRunMode) {
          await this.applyStatusChange(task, suggestedStatus, reason);
        } else {
          console.log(`🏃 DRY RUN: Would change status from ${task.status} to ${suggestedStatus}`);
        }
      } else if (!requireHighConfidence || confidence >= 0.85) {
        console.log(`🤖 Suggesting status change: ${task.status} → ${suggestedStatus} (${Math.round(confidence * 100)}% confidence)`);
        
        if (!dryRunMode) {
          await this.applyStatusChange(task, suggestedStatus, reason);
        } else {
          console.log(`🏃 DRY RUN: Would change status from ${task.status} to ${suggestedStatus}`);
        }
      }
    }
    
    // Process other automation opportunities
    if (suggestions.opportunities) {
      for (const [type, opportunity] of Object.entries(suggestions.opportunities)) {
        if (opportunity.shouldApply && opportunity.confidence >= confidenceThreshold) {
          console.log(`🤖 Automation opportunity: ${type} (${Math.round(opportunity.confidence * 100)}% confidence)`);
          
          if (!dryRunMode && this.shouldApplyAutomationType(type)) {
            // Apply specific automation based on type
            await this.applyAutomationType(task, type, opportunity);
          }
        }
      }
    }
  }
  
  /**
   * Apply a status change to a task
   */
  async applyStatusChange(task, newStatus, reason) {
    try {
      // Update task status
      await this.taskStorage.updateTask(task.id, { status: newStatus });
      
      // Record automation
      this.automationConfig.recordAutomation('statusChange', task.id, {
        oldStatus: task.status,
        newStatus: newStatus,
        reason: reason
      });
      
      // Broadcast automation event
      this.broadcastAutomationEvent('statusChanged', {
        taskId: task.id,
        taskTitle: task.title,
        oldStatus: task.status,
        newStatus: newStatus,
        reason: reason
      });
      
      console.log(`✅ Task status updated: ${task.status} → ${newStatus}`);
    } catch (error) {
      console.error('❌ Error applying status change:', error);
    }
  }
  
  /**
   * Check if a specific automation type should be applied
   */
  shouldApplyAutomationType(type) {
    const typeSettings = {
      'subtask_completion': this.automationConfig.get('autoCompleteSubtasks'),
      'memory_evidence': true, // Always allow memory-based automation
      'dependency_resolution': true,
      'stale_detection': this.automationConfig.get('autoDetectStale'),
      'blocked_detection': this.automationConfig.get('autoDetectBlocked')
    };
    
    return typeSettings[type] !== false;
  }
  
  /**
   * Apply a specific type of automation
   */
  async applyAutomationType(task, type, opportunity) {
    // Implementation depends on automation type
    console.log(`🤖 Applying ${type} automation for task ${task.id}`);
    
    this.automationConfig.recordAutomation(type, task.id, opportunity);
    
    this.broadcastAutomationEvent('automationApplied', {
      taskId: task.id,
      taskTitle: task.title,
      type: type,
      details: opportunity
    });
  }
  
  /**
   * Broadcast automation events to dashboard
   */
  broadcastAutomationEvent(eventType, data) {
    if (this.dashboardBridge && 
        this.dashboardBridge.broadcastToClients &&
        this.automationConfig.get('notifyOnAutomation')) {
      
      this.dashboardBridge.broadcastToClients({
        type: 'automation',
        event: eventType,
        data: data,
        timestamp: new Date().toISOString()
      });
    }
  }
}

export default FileSystemMonitor;