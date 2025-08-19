/**
 * Proactive Configuration Manager
 * Manages and applies proactive MCP tool usage settings
 */

import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';

export class ProactiveConfigManager extends EventEmitter {
  constructor(dataPath = 'data') {
    super();
    this.dataPath = dataPath;
    this.configFile = path.join(dataPath, 'proactive-config.json');
    this.config = this.loadConfig();
    this.metrics = {
      memoriesAutoCreated: 0,
      tasksAutoCreated: 0,
      triggersDetected: 0,
      lastAction: null
    };
    
    // Watch for config changes
    this.watchConfig();
  }
  
  /**
   * Load configuration from file
   */
  loadConfig() {
    try {
      if (fs.existsSync(this.configFile)) {
        const config = JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
        this.emit('config-loaded', config);
        return config;
      }
    } catch (error) {
      console.error('Error loading proactive config:', error);
    }
    
    // Return default config if file doesn't exist
    return this.getDefaultConfig();
  }
  
  /**
   * Get default configuration
   */
  getDefaultConfig() {
    return {
      enabled: true,
      aggressiveness: 'medium',
      auto_triggers: {
        file_operations: { enabled: true, priority: 'high' },
        solutions: { enabled: true, priority: 'high' },
        errors: { enabled: true, priority: 'high' },
        multi_step_work: { enabled: true, priority: 'medium' },
        session_summaries: { enabled: true, priority: 'medium' }
      },
      thresholds: {
        search_repetition: 2,
        file_access_frequency: 3,
        tool_sequence_length: 3,
        session_duration: 1800000,
        error_resolution_time: 600000
      }
    };
  }
  
  /**
   * Save configuration to file
   */
  saveConfig(config = null) {
    try {
      const configToSave = config || this.config;
      if (!fs.existsSync(this.dataPath)) {
        fs.mkdirSync(this.dataPath, { recursive: true });
      }
      fs.writeFileSync(this.configFile, JSON.stringify(configToSave, null, 2));
      this.config = configToSave;
      this.emit('config-saved', configToSave);
      return true;
    } catch (error) {
      console.error('Error saving proactive config:', error);
      return false;
    }
  }
  
  /**
   * Watch configuration file for changes
   */
  watchConfig() {
    if (fs.existsSync(this.configFile)) {
      fs.watchFile(this.configFile, { interval: 5000 }, () => {
        const newConfig = this.loadConfig();
        if (JSON.stringify(newConfig) !== JSON.stringify(this.config)) {
          this.config = newConfig;
          this.emit('config-changed', newConfig);
        }
      });
    }
  }
  
  /**
   * Check if proactive mode is enabled
   */
  isEnabled() {
    return this.config.enabled === true;
  }
  
  /**
   * Get current aggressiveness level
   */
  getAggressiveness() {
    return this.config.aggressiveness || 'medium';
  }
  
  /**
   * Check if a specific trigger is enabled
   */
  isTriggerEnabled(triggerType) {
    if (!this.isEnabled()) return false;
    
    const trigger = this.config.auto_triggers[triggerType];
    return trigger && trigger.enabled === true;
  }
  
  /**
   * Get threshold value
   */
  getThreshold(thresholdName) {
    return this.config.thresholds[thresholdName] || this.getDefaultConfig().thresholds[thresholdName];
  }
  
  /**
   * Update configuration
   */
  updateConfig(updates) {
    this.config = { ...this.config, ...updates };
    return this.saveConfig();
  }
  
  /**
   * Update specific trigger setting
   */
  updateTrigger(triggerType, settings) {
    if (!this.config.auto_triggers[triggerType]) {
      this.config.auto_triggers[triggerType] = {};
    }
    this.config.auto_triggers[triggerType] = {
      ...this.config.auto_triggers[triggerType],
      ...settings
    };
    return this.saveConfig();
  }
  
  /**
   * Update threshold
   */
  updateThreshold(thresholdName, value) {
    this.config.thresholds[thresholdName] = value;
    return this.saveConfig();
  }
  
  /**
   * Set aggressiveness level
   */
  setAggressiveness(level) {
    if (!['low', 'medium', 'high'].includes(level)) {
      throw new Error('Invalid aggressiveness level. Must be: low, medium, or high');
    }
    
    this.config.aggressiveness = level;
    
    // Adjust thresholds based on aggressiveness
    if (level === 'high') {
      this.config.thresholds.search_repetition = 1;
      this.config.thresholds.file_access_frequency = 2;
      this.config.thresholds.tool_sequence_length = 2;
      this.config.thresholds.session_duration = 900000; // 15 minutes
    } else if (level === 'low') {
      this.config.thresholds.search_repetition = 5;
      this.config.thresholds.file_access_frequency = 10;
      this.config.thresholds.tool_sequence_length = 5;
      this.config.thresholds.session_duration = 3600000; // 60 minutes
    } else { // medium
      this.config.thresholds.search_repetition = 3;
      this.config.thresholds.file_access_frequency = 5;
      this.config.thresholds.tool_sequence_length = 3;
      this.config.thresholds.session_duration = 1800000; // 30 minutes
    }
    
    return this.saveConfig();
  }
  
  /**
   * Apply configuration to behavioral analyzer
   */
  applyToBehavioralAnalyzer(analyzer) {
    if (!analyzer) return;
    
    // Apply thresholds
    analyzer.thresholds.searchRepetition = this.getThreshold('search_repetition');
    analyzer.thresholds.fileAccessFrequency = this.getThreshold('file_access_frequency');
    analyzer.thresholds.toolSequenceLength = this.getThreshold('tool_sequence_length');
    analyzer.thresholds.sessionDuration = this.getThreshold('session_duration');
    analyzer.thresholds.errorResolutionTime = this.getThreshold('error_resolution_time');
    
    this.emit('config-applied', { component: 'behavioral-analyzer', config: this.config });
  }
  
  /**
   * Apply configuration to universal work detector
   */
  applyToWorkDetector(detector) {
    if (!detector) return;
    
    // Adjust pattern thresholds based on aggressiveness
    const multiplier = this.getAggressiveness() === 'high' ? 0.5 : 
                      this.getAggressiveness() === 'low' ? 2 : 1;
    
    Object.keys(detector.universalPatterns).forEach(pattern => {
      const originalThreshold = detector.universalPatterns[pattern].threshold;
      detector.universalPatterns[pattern].threshold = Math.max(1, Math.floor(originalThreshold * multiplier));
    });
    
    this.emit('config-applied', { component: 'work-detector', config: this.config });
  }
  
  /**
   * Check if an action should trigger memory creation
   */
  shouldTriggerMemory(context) {
    if (!this.isEnabled()) return false;
    
    // File operations always trigger in high aggressiveness
    if (context.tool === 'Write' || context.tool === 'Edit' || context.tool === 'MultiEdit') {
      return this.isTriggerEnabled('file_operations') && this.getAggressiveness() !== 'low';
    }
    
    // Check pattern matches
    if (context.pattern && this.config.capture_patterns) {
      const patterns = this.config.capture_patterns.instant_triggers || [];
      if (patterns.some(p => context.text && context.text.includes(p))) {
        return true;
      }
    }
    
    // Check solution indicators
    if (context.text && this.config.capture_patterns && this.config.capture_patterns.solution_indicators) {
      const indicators = this.config.capture_patterns.solution_indicators;
      if (indicators.some(ind => context.text.toLowerCase().includes(ind))) {
        return this.isTriggerEnabled('solutions');
      }
    }
    
    return false;
  }
  
  /**
   * Record metric
   */
  recordMetric(type, data = {}) {
    switch(type) {
      case 'memory_created':
        this.metrics.memoriesAutoCreated++;
        break;
      case 'task_created':
        this.metrics.tasksAutoCreated++;
        break;
      case 'trigger_detected':
        this.metrics.triggersDetected++;
        break;
    }
    
    this.metrics.lastAction = {
      type,
      data,
      timestamp: Date.now()
    };
    
    this.emit('metric-recorded', { type, data, metrics: this.metrics });
  }
  
  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      config: {
        enabled: this.isEnabled(),
        aggressiveness: this.getAggressiveness(),
        triggers: Object.keys(this.config.auto_triggers).filter(t => this.isTriggerEnabled(t))
      }
    };
  }
  
  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      memoriesAutoCreated: 0,
      tasksAutoCreated: 0,
      triggersDetected: 0,
      lastAction: null
    };
    this.emit('metrics-reset');
  }
  
  /**
   * Get status report
   */
  getStatus() {
    return {
      enabled: this.isEnabled(),
      aggressiveness: this.getAggressiveness(),
      enforcement_level: this.config.enforcement_level || 'normal',
      active_triggers: Object.entries(this.config.auto_triggers)
        .filter(([_, settings]) => settings.enabled)
        .map(([name, settings]) => ({ name, ...settings })),
      thresholds: this.config.thresholds,
      metrics: this.getMetrics()
    };
  }
}

export default ProactiveConfigManager;