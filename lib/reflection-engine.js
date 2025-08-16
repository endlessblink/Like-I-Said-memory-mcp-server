/**
 * Performance Reflection Module
 * Tracks tool usage effectiveness, analyzes memory search accuracy,
 * monitors task completion workflows, and generates performance reports
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ReflectionEngine {
  constructor(options = {}) {
    this.metricsPath = options.metricsPath || path.join(__dirname, '..', 'data', 'reflection', 'performance-metrics.json');
    this.evolutionLogsPath = options.evolutionLogsPath || path.join(__dirname, '..', 'data', 'reflection', 'evolution-logs');
    this.updateInterval = options.updateInterval || 60000; // 1 minute default
    this.metrics = this.loadMetrics();
    this.sessionStartTime = Date.now();
    this.operationBuffer = [];
    this.updateTimer = null;
    
    // Start periodic metrics save
    this.startPeriodicSave();
  }

  /**
   * Load existing metrics or initialize new ones
   */
  loadMetrics() {
    try {
      if (fs.existsSync(this.metricsPath)) {
        const data = fs.readFileSync(this.metricsPath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading metrics:', error);
    }
    
    return this.initializeMetrics();
  }

  /**
   * Initialize default metrics structure
   */
  initializeMetrics() {
    return {
      metadata: {
        version: "1.0.0",
        created: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      },
      tools: {
        usage: {},
        successRates: {},
        avgExecutionTime: {},
        errorCounts: {}
      },
      memory: {
        searchAccuracy: 0,
        searchCount: 0,
        hitRate: 0,
        avgSearchTime: 0,
        categorization: {
          correct: 0,
          incorrect: 0,
          accuracy: 0
        }
      },
      tasks: {
        completionRate: 0,
        avgTimeToComplete: 0,
        statusTransitions: {},
        automationSuccessRate: 0
      },
      workDetection: {
        patternsDetected: 0,
        falsePositives: 0,
        missedDetections: 0,
        accuracy: 0,
        patternBreakdown: {}
      },
      system: {
        uptime: 0,
        totalOperations: 0,
        cpuUsage: [],
        memoryUsage: []
      }
    };
  }

  /**
   * Track tool usage and performance
   */
  trackToolUsage(toolName, success, executionTime, error = null) {
    // Update usage count
    if (!this.metrics.tools.usage[toolName]) {
      this.metrics.tools.usage[toolName] = 0;
      this.metrics.tools.successRates[toolName] = { success: 0, total: 0 };
      this.metrics.tools.avgExecutionTime[toolName] = [];
      this.metrics.tools.errorCounts[toolName] = 0;
    }
    
    this.metrics.tools.usage[toolName]++;
    this.metrics.tools.successRates[toolName].total++;
    
    if (success) {
      this.metrics.tools.successRates[toolName].success++;
    } else {
      this.metrics.tools.errorCounts[toolName]++;
    }
    
    // Track execution time
    this.metrics.tools.avgExecutionTime[toolName].push(executionTime);
    if (this.metrics.tools.avgExecutionTime[toolName].length > 100) {
      // Keep only last 100 measurements
      this.metrics.tools.avgExecutionTime[toolName].shift();
    }
    
    // Buffer the operation for batch processing
    this.operationBuffer.push({
      type: 'tool',
      tool: toolName,
      success,
      executionTime,
      timestamp: Date.now(),
      error: error ? error.message : null
    });
    
    this.metrics.system.totalOperations++;
  }

  /**
   * Track memory search performance
   */
  trackMemorySearch(query, results, relevantCount, searchTime) {
    this.metrics.memory.searchCount++;
    
    const hitRate = results.length > 0 ? relevantCount / results.length : 0;
    this.metrics.memory.hitRate = 
      (this.metrics.memory.hitRate * (this.metrics.memory.searchCount - 1) + hitRate) / 
      this.metrics.memory.searchCount;
    
    // Update average search time
    this.metrics.memory.avgSearchTime = 
      (this.metrics.memory.avgSearchTime * (this.metrics.memory.searchCount - 1) + searchTime) / 
      this.metrics.memory.searchCount;
    
    this.operationBuffer.push({
      type: 'memorySearch',
      query,
      resultCount: results.length,
      relevantCount,
      searchTime,
      timestamp: Date.now()
    });
  }

  /**
   * Track task completion patterns
   */
  trackTaskTransition(taskId, fromStatus, toStatus, timeInStatus) {
    const transition = `${fromStatus}->${toStatus}`;
    
    if (!this.metrics.tasks.statusTransitions[transition]) {
      this.metrics.tasks.statusTransitions[transition] = {
        count: 0,
        avgTime: 0
      };
    }
    
    const trans = this.metrics.tasks.statusTransitions[transition];
    trans.avgTime = (trans.avgTime * trans.count + timeInStatus) / (trans.count + 1);
    trans.count++;
    
    // Update completion rate if task is done
    if (toStatus === 'done' || toStatus === 'completed') {
      const totalTasks = Object.values(this.metrics.tasks.statusTransitions)
        .reduce((sum, t) => sum + t.count, 0);
      const completedTasks = Object.entries(this.metrics.tasks.statusTransitions)
        .filter(([key]) => key.endsWith('->done') || key.endsWith('->completed'))
        .reduce((sum, [, value]) => sum + value.count, 0);
      
      this.metrics.tasks.completionRate = completedTasks / totalTasks;
    }
    
    this.operationBuffer.push({
      type: 'taskTransition',
      taskId,
      fromStatus,
      toStatus,
      timeInStatus,
      timestamp: Date.now()
    });
  }

  /**
   * Track work detection patterns
   */
  trackWorkDetection(pattern, detected, confidence, falsePositive = false) {
    this.metrics.workDetection.patternsDetected++;
    
    if (!this.metrics.workDetection.patternBreakdown[pattern]) {
      this.metrics.workDetection.patternBreakdown[pattern] = {
        detected: 0,
        falsePositives: 0,
        confidence: []
      };
    }
    
    const patternStats = this.metrics.workDetection.patternBreakdown[pattern];
    
    if (detected) {
      patternStats.detected++;
    }
    
    if (falsePositive) {
      this.metrics.workDetection.falsePositives++;
      patternStats.falsePositives++;
    }
    
    patternStats.confidence.push(confidence);
    if (patternStats.confidence.length > 100) {
      patternStats.confidence.shift();
    }
    
    // Calculate overall accuracy
    const total = this.metrics.workDetection.patternsDetected;
    const correct = total - this.metrics.workDetection.falsePositives - this.metrics.workDetection.missedDetections;
    this.metrics.workDetection.accuracy = total > 0 ? correct / total : 0;
    
    this.operationBuffer.push({
      type: 'workDetection',
      pattern,
      detected,
      confidence,
      falsePositive,
      timestamp: Date.now()
    });
  }

  /**
   * Track memory categorization accuracy
   */
  trackCategorization(predicted, actual, correct) {
    if (correct) {
      this.metrics.memory.categorization.correct++;
    } else {
      this.metrics.memory.categorization.incorrect++;
    }
    
    const total = this.metrics.memory.categorization.correct + this.metrics.memory.categorization.incorrect;
    this.metrics.memory.categorization.accuracy = 
      total > 0 ? this.metrics.memory.categorization.correct / total : 0;
    
    this.operationBuffer.push({
      type: 'categorization',
      predicted,
      actual,
      correct,
      timestamp: Date.now()
    });
  }

  /**
   * Generate performance report
   */
  generateReport(period = 'daily') {
    const report = {
      period,
      generatedAt: new Date().toISOString(),
      uptime: Date.now() - this.sessionStartTime,
      summary: {
        totalOperations: this.metrics.system.totalOperations,
        toolUsage: Object.keys(this.metrics.tools.usage).length,
        memorySearches: this.metrics.memory.searchCount,
        taskCompletionRate: (this.metrics.tasks.completionRate * 100).toFixed(2) + '%',
        workDetectionAccuracy: (this.metrics.workDetection.accuracy * 100).toFixed(2) + '%'
      },
      topTools: this.getTopTools(),
      performanceInsights: this.generateInsights(),
      recommendations: this.generateRecommendations()
    };
    
    // Save report to evolution logs
    const reportPath = path.join(
      this.evolutionLogsPath,
      `report-${period}-${Date.now()}.json`
    );
    
    try {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    } catch (error) {
      console.error('Error saving report:', error);
    }
    
    return report;
  }

  /**
   * Get most used tools
   */
  getTopTools(limit = 5) {
    return Object.entries(this.metrics.tools.usage)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([tool, count]) => {
        const successRate = this.metrics.tools.successRates[tool];
        const avgTime = this.calculateAverage(this.metrics.tools.avgExecutionTime[tool] || []);
        
        return {
          tool,
          usage: count,
          successRate: successRate.total > 0 ? 
            (successRate.success / successRate.total * 100).toFixed(2) + '%' : 'N/A',
          avgExecutionTime: avgTime.toFixed(2) + 'ms'
        };
      });
  }

  /**
   * Generate performance insights
   */
  generateInsights() {
    const insights = [];
    
    // Tool performance insights
    Object.entries(this.metrics.tools.successRates).forEach(([tool, rates]) => {
      const successRate = rates.total > 0 ? rates.success / rates.total : 0;
      if (successRate < 0.8 && rates.total > 10) {
        insights.push({
          type: 'warning',
          category: 'tool',
          message: `Tool ${tool} has low success rate: ${(successRate * 100).toFixed(2)}%`,
          severity: 'medium'
        });
      }
    });
    
    // Memory search insights
    if (this.metrics.memory.hitRate < 0.5 && this.metrics.memory.searchCount > 20) {
      insights.push({
        type: 'improvement',
        category: 'memory',
        message: `Memory search relevance is low: ${(this.metrics.memory.hitRate * 100).toFixed(2)}%`,
        severity: 'high'
      });
    }
    
    // Work detection insights
    if (this.metrics.workDetection.accuracy < 0.7 && this.metrics.workDetection.patternsDetected > 10) {
      insights.push({
        type: 'improvement',
        category: 'workDetection',
        message: `Work detection needs tuning: ${(this.metrics.workDetection.accuracy * 100).toFixed(2)}% accuracy`,
        severity: 'medium'
      });
    }
    
    return insights;
  }

  /**
   * Generate improvement recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    
    // Based on work detection patterns
    Object.entries(this.metrics.workDetection.patternBreakdown).forEach(([pattern, stats]) => {
      const falsePositiveRate = stats.detected > 0 ? stats.falsePositives / stats.detected : 0;
      if (falsePositiveRate > 0.3) {
        recommendations.push({
          category: 'workDetection',
          pattern,
          action: 'increaseThreshold',
          reason: `High false positive rate: ${(falsePositiveRate * 100).toFixed(2)}%`,
          confidence: 0.8
        });
      }
    });
    
    // Based on tool usage patterns
    const underusedTools = Object.entries(this.metrics.tools.usage)
      .filter(([, count]) => count < 5)
      .map(([tool]) => tool);
    
    if (underusedTools.length > 0) {
      recommendations.push({
        category: 'tools',
        action: 'promoteUsage',
        tools: underusedTools,
        reason: 'These tools are underutilized and might provide value',
        confidence: 0.6
      });
    }
    
    return recommendations;
  }

  /**
   * Calculate average of array
   */
  calculateAverage(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  }

  /**
   * Save metrics to disk
   */
  saveMetrics() {
    try {
      this.metrics.metadata.lastUpdated = new Date().toISOString();
      this.metrics.system.uptime = Date.now() - this.sessionStartTime;
      
      fs.writeFileSync(this.metricsPath, JSON.stringify(this.metrics, null, 2));
    } catch (error) {
      console.error('Error saving metrics:', error);
    }
  }

  /**
   * Start periodic metrics save
   */
  startPeriodicSave() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }
    
    this.updateTimer = setInterval(() => {
      this.saveMetrics();
      
      // Process operation buffer for pattern learning
      if (this.operationBuffer.length > 100) {
        this.processOperationBuffer();
      }
    }, this.updateInterval);
  }

  /**
   * Process buffered operations for pattern detection
   */
  processOperationBuffer() {
    // This will be used by pattern-learner.js
    const bufferCopy = [...this.operationBuffer];
    this.operationBuffer = this.operationBuffer.slice(-50); // Keep last 50 for context
    return bufferCopy;
  }

  /**
   * Get current performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      sessionUptime: Date.now() - this.sessionStartTime,
      bufferSize: this.operationBuffer.length
    };
  }

  /**
   * Clean up and save on shutdown
   */
  shutdown() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }
    this.saveMetrics();
    this.generateReport('session');
  }
}

// Export singleton instance
export default new ReflectionEngine();