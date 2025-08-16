/**
 * Pattern Learning System
 * Learns from successful work detection patterns, identifies recurring behaviors,
 * builds confidence scores for automation strategies
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class PatternLearner {
  constructor(options = {}) {
    this.patternsPath = options.patternsPath || path.join(__dirname, '..', 'data', 'reflection', 'learned-patterns.json');
    this.learningRate = options.learningRate || 0.1; // How fast to adapt
    this.confidenceThreshold = options.confidenceThreshold || 0.7; // Min confidence to apply pattern
    this.minObservations = options.minObservations || 5; // Min observations before learning
    this.patterns = this.loadPatterns();
    this.observationBuffer = [];
    this.patternHistory = [];
  }

  /**
   * Load existing patterns or initialize new ones
   */
  loadPatterns() {
    try {
      if (fs.existsSync(this.patternsPath)) {
        const data = fs.readFileSync(this.patternsPath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading patterns:', error);
    }
    
    return this.initializePatterns();
  }

  /**
   * Initialize default patterns structure
   */
  initializePatterns() {
    return {
      metadata: {
        version: "1.0.0",
        created: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        totalPatterns: 0
      },
      patterns: [],
      thresholds: {
        problemSolving: { current: 2, baseline: 2, adjustmentHistory: [] },
        implementation: { current: 1, baseline: 1, adjustmentHistory: [] },
        configuration: { current: 1, baseline: 1, adjustmentHistory: [] },
        research: { current: 3, baseline: 3, adjustmentHistory: [] },
        workflow: { current: 1, baseline: 1, adjustmentHistory: [] }
      },
      confidence: {
        overall: 0.5,
        byCategory: {},
        recentTrend: "stable"
      },
      adaptations: []
    };
  }

  /**
   * Learn from work detection event
   */
  learnFromDetection(pattern, indicators, success, userFeedback = null) {
    const observation = {
      pattern,
      indicators,
      success,
      userFeedback,
      timestamp: Date.now(),
      confidence: this.calculateConfidence(pattern, indicators)
    };
    
    this.observationBuffer.push(observation);
    
    // Process if we have enough observations
    if (this.observationBuffer.length >= this.minObservations) {
      this.processObservations();
    }
    
    // Update pattern-specific learning
    this.updatePatternLearning(pattern, success, userFeedback);
    
    return observation.confidence;
  }

  /**
   * Calculate confidence score for a pattern
   */
  calculateConfidence(pattern, indicators) {
    const categoryConfidence = this.patterns.confidence.byCategory[pattern] || 0.5;
    const overallConfidence = this.patterns.confidence.overall;
    
    // Find similar successful patterns
    const similarPatterns = this.findSimilarPatterns(pattern, indicators);
    const historicalSuccess = this.calculateHistoricalSuccess(pattern);
    
    // Weighted confidence calculation
    const confidence = (
      categoryConfidence * 0.4 +
      overallConfidence * 0.2 +
      similarPatterns.confidence * 0.2 +
      historicalSuccess * 0.2
    );
    
    return Math.min(Math.max(confidence, 0), 1); // Clamp between 0 and 1
  }

  /**
   * Find similar patterns in history
   */
  findSimilarPatterns(pattern, indicators) {
    const similar = this.patterns.patterns.filter(p => {
      if (p.category !== pattern) return false;
      
      // Calculate similarity based on indicators
      const commonIndicators = p.indicators.filter(ind => 
        indicators.includes(ind)
      );
      
      const similarity = commonIndicators.length / 
        Math.max(p.indicators.length, indicators.length);
      
      return similarity > 0.5;
    });
    
    if (similar.length === 0) {
      return { confidence: 0.5, count: 0 };
    }
    
    const avgConfidence = similar.reduce((sum, p) => sum + p.confidence, 0) / similar.length;
    
    return {
      confidence: avgConfidence,
      count: similar.length
    };
  }

  /**
   * Calculate historical success rate for a pattern
   */
  calculateHistoricalSuccess(pattern) {
    const patternData = this.patterns.patterns.filter(p => p.category === pattern);
    
    if (patternData.length === 0) return 0.5;
    
    const successCount = patternData.filter(p => p.successful).length;
    return successCount / patternData.length;
  }

  /**
   * Process observation buffer and learn patterns
   */
  processObservations() {
    const observations = [...this.observationBuffer];
    this.observationBuffer = [];
    
    // Group by pattern type
    const grouped = observations.reduce((acc, obs) => {
      if (!acc[obs.pattern]) acc[obs.pattern] = [];
      acc[obs.pattern].push(obs);
      return acc;
    }, {});
    
    // Learn from each group
    Object.entries(grouped).forEach(([pattern, obs]) => {
      this.learnPatternGroup(pattern, obs);
    });
    
    // Update overall confidence
    this.updateOverallConfidence();
    
    // Save updated patterns
    this.savePatterns();
  }

  /**
   * Learn from a group of similar pattern observations
   */
  learnPatternGroup(pattern, observations) {
    const successRate = observations.filter(o => o.success).length / observations.length;
    const avgConfidence = observations.reduce((sum, o) => sum + o.confidence, 0) / observations.length;
    
    // Extract common indicators
    const indicatorFrequency = {};
    observations.forEach(obs => {
      obs.indicators.forEach(ind => {
        indicatorFrequency[ind] = (indicatorFrequency[ind] || 0) + 1;
      });
    });
    
    const commonIndicators = Object.entries(indicatorFrequency)
      .filter(([, freq]) => freq > observations.length * 0.5)
      .map(([ind]) => ind);
    
    // Create or update pattern
    const newPattern = {
      id: `pattern-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      category: pattern,
      indicators: commonIndicators,
      observations: observations.length,
      successRate,
      confidence: avgConfidence,
      successful: successRate > 0.7,
      createdAt: Date.now(),
      lastUsed: Date.now()
    };
    
    // Add to patterns
    this.patterns.patterns.push(newPattern);
    this.patterns.metadata.totalPatterns++;
    
    // Adjust thresholds if needed
    this.adjustThresholds(pattern, successRate);
  }

  /**
   * Update pattern-specific learning
   */
  updatePatternLearning(pattern, success, userFeedback) {
    // Update category confidence
    if (!this.patterns.confidence.byCategory[pattern]) {
      this.patterns.confidence.byCategory[pattern] = 0.5;
    }
    
    const currentConfidence = this.patterns.confidence.byCategory[pattern];
    const adjustment = success ? this.learningRate : -this.learningRate;
    
    // Apply user feedback weight
    const feedbackMultiplier = userFeedback === 'positive' ? 1.5 : 
                              userFeedback === 'negative' ? 0.5 : 1;
    
    this.patterns.confidence.byCategory[pattern] = Math.min(
      Math.max(currentConfidence + (adjustment * feedbackMultiplier), 0.1),
      0.95
    );
  }

  /**
   * Adjust detection thresholds based on performance
   */
  adjustThresholds(pattern, successRate) {
    if (!this.patterns.thresholds[pattern]) return;
    
    const threshold = this.patterns.thresholds[pattern];
    const currentThreshold = threshold.current;
    
    // Adjust based on success rate
    let newThreshold = currentThreshold;
    
    if (successRate < 0.5 && currentThreshold > threshold.baseline * 0.5) {
      // Too many false positives, increase threshold
      newThreshold = Math.min(currentThreshold + 1, threshold.baseline * 2);
    } else if (successRate > 0.9 && currentThreshold > 1) {
      // Very successful, can be more sensitive
      newThreshold = Math.max(currentThreshold - 0.5, 1);
    }
    
    if (newThreshold !== currentThreshold) {
      threshold.adjustmentHistory.push({
        from: currentThreshold,
        to: newThreshold,
        reason: successRate < 0.5 ? 'high_false_positives' : 'high_success_rate',
        timestamp: Date.now()
      });
      
      threshold.current = newThreshold;
      
      // Record adaptation
      this.patterns.adaptations.push({
        type: 'threshold',
        pattern,
        change: newThreshold - currentThreshold,
        reason: `Success rate: ${(successRate * 100).toFixed(2)}%`,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Update overall confidence based on recent performance
   */
  updateOverallConfidence() {
    const categoryConfidences = Object.values(this.patterns.confidence.byCategory);
    
    if (categoryConfidences.length === 0) return;
    
    const avgConfidence = categoryConfidences.reduce((sum, c) => sum + c, 0) / 
                         categoryConfidences.length;
    
    const oldConfidence = this.patterns.confidence.overall;
    this.patterns.confidence.overall = avgConfidence;
    
    // Determine trend
    if (avgConfidence > oldConfidence + 0.05) {
      this.patterns.confidence.recentTrend = "improving";
    } else if (avgConfidence < oldConfidence - 0.05) {
      this.patterns.confidence.recentTrend = "declining";
    } else {
      this.patterns.confidence.recentTrend = "stable";
    }
  }

  /**
   * Get recommended patterns for current context
   */
  getRecommendedPatterns(context) {
    const relevant = this.patterns.patterns.filter(p => {
      // Filter by recency
      const ageInDays = (Date.now() - p.lastUsed) / (1000 * 60 * 60 * 24);
      if (ageInDays > 30) return false; // Ignore patterns older than 30 days
      
      // Filter by confidence
      if (p.confidence < this.confidenceThreshold) return false;
      
      // Filter by success rate
      if (p.successRate < 0.6) return false;
      
      // Check context relevance if provided
      if (context && context.category && p.category !== context.category) return false;
      
      return true;
    });
    
    // Sort by confidence and success rate
    relevant.sort((a, b) => {
      const scoreA = a.confidence * a.successRate;
      const scoreB = b.confidence * b.successRate;
      return scoreB - scoreA;
    });
    
    return relevant.slice(0, 5); // Return top 5
  }

  /**
   * Get current thresholds with confidence
   */
  getThresholds() {
    const thresholds = {};
    
    Object.entries(this.patterns.thresholds).forEach(([pattern, data]) => {
      thresholds[pattern] = {
        value: data.current,
        confidence: this.patterns.confidence.byCategory[pattern] || 0.5,
        adjustable: data.adjustmentHistory.length > 0
      };
    });
    
    return thresholds;
  }

  /**
   * Apply learned patterns to improve detection
   */
  applyLearnedPatterns(detectionConfig) {
    const improvements = [];
    
    // Get current thresholds
    const thresholds = this.getThresholds();
    
    Object.entries(thresholds).forEach(([pattern, data]) => {
      if (data.confidence > this.confidenceThreshold) {
        improvements.push({
          pattern,
          action: 'updateThreshold',
          newValue: data.value,
          confidence: data.confidence,
          reason: 'Learned from usage patterns'
        });
      }
    });
    
    // Get recommended patterns
    const recommended = this.getRecommendedPatterns();
    recommended.forEach(pattern => {
      improvements.push({
        pattern: pattern.category,
        action: 'addIndicators',
        indicators: pattern.indicators,
        confidence: pattern.confidence,
        reason: `High success rate: ${(pattern.successRate * 100).toFixed(2)}%`
      });
    });
    
    return improvements;
  }

  /**
   * Record user feedback on a detection
   */
  recordFeedback(patternId, feedback) {
    const pattern = this.patterns.patterns.find(p => p.id === patternId);
    
    if (pattern) {
      pattern.feedback = pattern.feedback || { positive: 0, negative: 0 };
      
      if (feedback === 'positive') {
        pattern.feedback.positive++;
        pattern.confidence = Math.min(pattern.confidence * 1.1, 0.95);
      } else if (feedback === 'negative') {
        pattern.feedback.negative++;
        pattern.confidence = Math.max(pattern.confidence * 0.9, 0.1);
      }
      
      this.savePatterns();
    }
  }

  /**
   * Get learning statistics
   */
  getStatistics() {
    const stats = {
      totalPatterns: this.patterns.metadata.totalPatterns,
      activePatterns: this.patterns.patterns.filter(p => p.confidence > 0.5).length,
      overallConfidence: this.patterns.confidence.overall,
      trend: this.patterns.confidence.recentTrend,
      adaptations: this.patterns.adaptations.length,
      categoryBreakdown: {}
    };
    
    // Calculate category statistics
    Object.entries(this.patterns.confidence.byCategory).forEach(([category, confidence]) => {
      const categoryPatterns = this.patterns.patterns.filter(p => p.category === category);
      stats.categoryBreakdown[category] = {
        confidence,
        patterns: categoryPatterns.length,
        avgSuccessRate: categoryPatterns.length > 0 ?
          categoryPatterns.reduce((sum, p) => sum + p.successRate, 0) / categoryPatterns.length : 0
      };
    });
    
    return stats;
  }

  /**
   * Save patterns to disk
   */
  savePatterns() {
    try {
      this.patterns.metadata.lastUpdated = new Date().toISOString();
      
      // Keep only recent patterns (last 1000)
      if (this.patterns.patterns.length > 1000) {
        this.patterns.patterns = this.patterns.patterns
          .sort((a, b) => b.lastUsed - a.lastUsed)
          .slice(0, 1000);
      }
      
      fs.writeFileSync(this.patternsPath, JSON.stringify(this.patterns, null, 2));
    } catch (error) {
      console.error('Error saving patterns:', error);
    }
  }

  /**
   * Export patterns for analysis
   */
  exportPatterns() {
    return {
      patterns: this.patterns.patterns,
      thresholds: this.patterns.thresholds,
      confidence: this.patterns.confidence,
      adaptations: this.patterns.adaptations
    };
  }

  /**
   * Reset learning (with optional category filter)
   */
  resetLearning(category = null) {
    if (category) {
      // Reset specific category
      this.patterns.patterns = this.patterns.patterns.filter(p => p.category !== category);
      this.patterns.confidence.byCategory[category] = 0.5;
      if (this.patterns.thresholds[category]) {
        this.patterns.thresholds[category].current = this.patterns.thresholds[category].baseline;
        this.patterns.thresholds[category].adjustmentHistory = [];
      }
    } else {
      // Reset all
      this.patterns = this.initializePatterns();
    }
    
    this.savePatterns();
  }
}

// Export singleton instance
export default new PatternLearner();