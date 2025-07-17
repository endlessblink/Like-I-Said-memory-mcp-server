/**
 * Natural Language Processing for Task Status Management
 * Provides intelligent parsing of natural language to determine task status changes
 */

export class TaskNLPProcessor {
  
  /**
   * Parse natural language input to determine intended status change
   * @param {string} naturalLanguageInput - User's natural language description
   * @param {Object} taskContext - Current task context for better parsing
   * @returns {Object} Parsed intent with suggested status and confidence
   */
  static parseStatusIntent(naturalLanguageInput, taskContext = {}) {
    const input = naturalLanguageInput.toLowerCase().trim();
    
    // Advanced pattern matching for status detection
    const statusPatterns = {
      'done': {
        patterns: [
          /(?:complet|finish|done|close|resolv|achiev|accomplish)/i,
          /(?:ready|ship|deploy|deliver|submit)/i,
          /(?:fixed|solved|handled|wrapped up)/i,
          /(?:merged|pushed|committed|released)/i
        ],
        indicators: [
          'completed', 'finished', 'done', 'closed', 'resolved',
          'achieved', 'accomplished', 'ready', 'shipped', 'deployed',
          'delivered', 'submitted', 'fixed', 'solved', 'handled',
          'wrapped up', 'merged', 'pushed', 'committed', 'released'
        ],
        confidence_boost: 0.1
      },
      
      'in_progress': {
        patterns: [
          /(?:start|begin|work|doing|progress|ongoing)/i,
          /(?:implement|develop|build|creat|writ)/i,
          /(?:working on|in progress|currently)/i,
          /(?:coding|debugging|testing|review)/i
        ],
        indicators: [
          'started', 'beginning', 'working', 'doing', 'progressing',
          'implementing', 'developing', 'building', 'creating', 'writing',
          'coding', 'debugging', 'testing', 'reviewing', 'ongoing'
        ],
        confidence_boost: 0.1
      },
      
      'blocked': {
        patterns: [
          /(?:block|stuck|wait|depend|halt|stop)/i,
          /(?:can't|cannot|unable|need help|need|require)/i,
          /(?:waiting for|pending|on hold|paused)/i,
          /(?:issue|problem|error|bug|broken)/i
        ],
        indicators: [
          'blocked', 'stuck', 'waiting', 'dependent', 'halted',
          'stopped', 'cant', 'cannot', 'unable', 'need help',
          'waiting for', 'pending', 'on hold', 'paused',
          'issue', 'problem', 'error', 'bug', 'broken'
        ],
        confidence_boost: 0.15
      },
      
      'todo': {
        patterns: [
          /(?:todo|pending|queue|later|backlog|plan)/i,
          /(?:need to|should|will|going to|next)/i,
          /(?:schedule|defer|postpone|delay)/i
        ],
        indicators: [
          'todo', 'pending', 'queued', 'later', 'backlog',
          'planned', 'need to', 'should', 'will', 'going to',
          'next', 'scheduled', 'deferred', 'postponed', 'delayed'
        ],
        confidence_boost: 0.05
      }
    };

    let bestMatch = {
      suggested_status: null,
      confidence: 0,
      matched_phrase: null,
      reasoning: 'No clear status intent detected'
    };

    // Check each status pattern
    for (const [status, config] of Object.entries(statusPatterns)) {
      let statusConfidence = 0;
      let matchedPhrases = [];

      // Pattern matching (increased scoring for stronger patterns)
      for (const pattern of config.patterns) {
        const match = input.match(pattern);
        if (match) {
          statusConfidence += 0.4; // Increased from 0.3
          matchedPhrases.push(match[0]);
        }
      }

      // Keyword matching (increased scoring for direct matches)
      for (const indicator of config.indicators) {
        if (input.includes(indicator)) {
          statusConfidence += 0.25; // Increased from 0.2
          matchedPhrases.push(indicator);
        }
      }

      // Context-based confidence boost
      if (taskContext.current_status) {
        statusConfidence += this.getTransitionConfidenceBoost(
          taskContext.current_status, 
          status
        );
      }

      // Apply status-specific confidence boost
      statusConfidence += config.confidence_boost;

      // Cap confidence at 1.0
      statusConfidence = Math.min(statusConfidence, 1.0);

      if (statusConfidence > bestMatch.confidence) {
        bestMatch = {
          suggested_status: status,
          confidence: statusConfidence,
          matched_phrase: matchedPhrases.join(', '),
          reasoning: this.generateReasoning(status, matchedPhrases, taskContext)
        };
      }
    }

    // Add contextual analysis
    if (bestMatch.confidence > 0.4) {
      bestMatch.contextual_analysis = this.analyzeContext(input, taskContext);
    }

    return bestMatch;
  }

  /**
   * Get confidence boost for valid status transitions
   */
  static getTransitionConfidenceBoost(fromStatus, toStatus) {
    const validTransitions = {
      'todo': ['in_progress', 'blocked'],
      'in_progress': ['done', 'blocked', 'todo'], 
      'blocked': ['todo', 'in_progress'],
      'done': ['in_progress'] // Allow reopening
    };

    if (validTransitions[fromStatus]?.includes(toStatus)) {
      return 0.1; // Boost for valid transitions
    }
    
    if (fromStatus === toStatus) {
      return -0.2; // Penalty for same status
    }
    
    return 0; // No boost for invalid transitions
  }

  /**
   * Generate human-readable reasoning for the status suggestion
   */
  static generateReasoning(status, matchedPhrases, taskContext) {
    const reasoningTemplates = {
      'done': [
        `Detected completion indicators: ${matchedPhrases.join(', ')}`,
        'Language suggests task has been finished or accomplished',
        'Completion-related keywords found in description'
      ],
      'in_progress': [
        `Detected active work indicators: ${matchedPhrases.join(', ')}`,
        'Language suggests task is currently being worked on',
        'Work-in-progress keywords found in description'
      ],
      'blocked': [
        `Detected blocking indicators: ${matchedPhrases.join(', ')}`,
        'Language suggests task is encountering obstacles',
        'Blocking or dependency keywords found in description'
      ],
      'todo': [
        `Detected planning indicators: ${matchedPhrases.join(', ')}`,
        'Language suggests task is planned but not yet started',
        'Future-tense or planning keywords found in description'
      ]
    };

    const templates = reasoningTemplates[status] || ['Status detected based on keyword analysis'];
    return templates[0] || `Suggested based on: ${matchedPhrases.join(', ')}`;
  }

  /**
   * Analyze additional context clues
   */
  static analyzeContext(input, taskContext) {
    const analysis = {
      urgency_indicators: [],
      completion_evidence: [],
      blocking_factors: [],
      time_references: []
    };

    // Urgency detection
    const urgencyPatterns = [
      /urgent|asap|immediately|critical|emergency/i,
      /deadline|due|overdue/i,
      /priority|important|crucial/i
    ];

    urgencyPatterns.forEach(pattern => {
      const match = input.match(pattern);
      if (match) {
        analysis.urgency_indicators.push(match[0]);
      }
    });

    // Completion evidence
    const completionPatterns = [
      /test|spec|review|approve/i,
      /deploy|ship|release|publish/i,
      /merge|commit|push/i
    ];

    completionPatterns.forEach(pattern => {
      const match = input.match(pattern);
      if (match) {
        analysis.completion_evidence.push(match[0]);
      }
    });

    // Blocking factors
    const blockingPatterns = [
      /waiting for|depends on|need|require/i,
      /broken|error|issue|problem/i,
      /missing|lack|without/i
    ];

    blockingPatterns.forEach(pattern => {
      const match = input.match(pattern);
      if (match) {
        analysis.blocking_factors.push(match[0]);
      }
    });

    // Time references
    const timePatterns = [
      /today|tomorrow|yesterday|now/i,
      /this week|next week|last week/i,
      /monday|tuesday|wednesday|thursday|friday|saturday|sunday/i
    ];

    timePatterns.forEach(pattern => {
      const match = input.match(pattern);
      if (match) {
        analysis.time_references.push(match[0]);
      }
    });

    return analysis;
  }

  /**
   * Generate a natural language reason for status change
   */
  static generateStatusReason(fromStatus, toStatus, context = {}) {
    const { naturalLanguageInput, taskTitle, matchedPhrases } = context;

    const reasonTemplates = {
      'todo_to_in_progress': [
        `Started working on: ${taskTitle}`,
        `Beginning implementation based on: "${naturalLanguageInput}"`,
        'Task moved to active development'
      ],
      'in_progress_to_done': [
        `Completed: ${taskTitle}`,
        `Task finished based on: "${naturalLanguageInput}"`,
        'Implementation completed successfully'
      ],
      'in_progress_to_blocked': [
        `Blocked on: ${taskTitle}`,
        `Encountered obstacle: "${naturalLanguageInput}"`,
        'Task blocked pending resolution'
      ],
      'blocked_to_in_progress': [
        `Resumed work on: ${taskTitle}`,
        `Blocking issue resolved: "${naturalLanguageInput}"`,
        'Task unblocked and active again'
      ],
      'done_to_in_progress': [
        `Reopened: ${taskTitle}`,
        `Additional work needed: "${naturalLanguageInput}"`,
        'Task reopened for further development'
      ]
    };

    const key = `${fromStatus}_to_${toStatus}`;
    const templates = reasonTemplates[key];
    
    if (templates) {
      // Choose template based on available context
      if (naturalLanguageInput && templates[1]) {
        return templates[1];
      } else if (taskTitle && templates[0]) {
        return templates[0];
      } else {
        return templates[2] || templates[0];
      }
    }

    // Fallback reason
    return `Status changed from ${fromStatus} to ${toStatus}${naturalLanguageInput ? ` based on: "${naturalLanguageInput}"` : ''}`;
  }

  /**
   * Extract task identifiers from natural language
   */
  static extractTaskIdentifiers(input) {
    const identifiers = [];

    // Task serial patterns (TASK-XXX, TASK-001-PRJ, etc.)
    const serialPattern = /TASK-\d+(?:-[A-Z]+)?/gi;
    const serialMatches = input.match(serialPattern);
    if (serialMatches) {
      identifiers.push(...serialMatches.map(match => ({
        type: 'serial',
        value: match,
        confidence: 0.9
      })));
    }

    // Task ID patterns (task-YYYY-MM-DD-XXXX)
    const idPattern = /task-\d{4}-\d{2}-\d{2}-[a-f0-9]+/gi;
    const idMatches = input.match(idPattern);
    if (idMatches) {
      identifiers.push(...idMatches.map(match => ({
        type: 'id',
        value: match,
        confidence: 0.95
      })));
    }

    // Project/module references
    const modulePattern = /(?:the\s+)?([a-zA-Z]+(?:\s+[a-zA-Z]+)*)\s+(?:module|component|feature|system|auth|api|ui|database)/gi;
    const moduleMatches = [...input.matchAll(modulePattern)];
    if (moduleMatches.length > 0) {
      identifiers.push(...moduleMatches.map(match => ({
        type: 'module_reference',
        value: match[1].trim(),
        confidence: 0.7
      })));
    }

    return identifiers;
  }

  /**
   * Validate status change based on business rules
   */
  static validateStatusChange(currentTask, proposedStatus, context = {}) {
    const validation = {
      valid: true,
      warnings: [],
      suggestions: []
    };

    // Rule 1: Cannot complete task with incomplete subtasks
    if (proposedStatus === 'done' && currentTask.subtasks?.length > 0) {
      // This would need to check actual subtask statuses
      validation.warnings.push('Task has subtasks - verify all are complete before marking done');
    }

    // Rule 2: Moving from done to other status
    if (currentTask.status === 'done' && proposedStatus !== 'done') {
      validation.warnings.push('Reopening a completed task - consider if this creates new work or is a bug fix');
    }

    // Rule 3: Blocking without reason
    if (proposedStatus === 'blocked' && !context.blocking_reason) {
      validation.suggestions.push('Consider adding a reason for blocking (e.g., waiting for dependencies, blockers)');
    }

    // Rule 4: High priority tasks
    if (currentTask.priority === 'urgent' && proposedStatus === 'todo') {
      validation.warnings.push('Moving urgent task back to todo - verify this is intentional');
    }

    return validation;
  }
}