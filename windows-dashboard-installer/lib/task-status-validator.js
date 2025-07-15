/**
 * Enhanced Task Status Validation and Intelligent Workflow Suggestions
 * Provides comprehensive validation and smart recommendations for status changes
 */

import { TaskNLPProcessor } from './task-nlp-processor.js';
import { TaskAutomation } from './task-automation.js';

export class TaskStatusValidator {
  
  /**
   * Comprehensive validation of status changes with intelligent suggestions
   * @param {Object} task - Current task object
   * @param {string} newStatus - Proposed new status
   * @param {Object} context - Additional context for validation
   * @param {Object} taskStorage - Task storage instance
   * @returns {Object} Validation result with suggestions
   */
  static async validateStatusChange(task, newStatus, context = {}, taskStorage = null) {
    const validation = {
      valid: true,
      confidence: 1.0,
      warnings: [],
      suggestions: [],
      blocking_issues: [],
      recommended_actions: [],
      workflow_analysis: null
    };

    try {
      // Core transition validation
      const transitionValidation = this.validateTransition(task.status, newStatus);
      if (!transitionValidation.valid) {
        validation.valid = false;
        validation.blocking_issues.push(transitionValidation.reason);
        return validation;
      }

      // Run all validation rules
      const validationRules = [
        this.validateSubtaskDependencies,
        this.validateWorkflowLogic,
        this.validateBusinessRules,
        this.validateTimeConstraints,
        this.validatePriorityAlignment,
        this.validateResourceAvailability
      ];

      for (const rule of validationRules) {
        try {
          const ruleResult = await rule(task, newStatus, context, taskStorage);
          if (ruleResult) {
            this.mergeValidationResult(validation, ruleResult);
          }
        } catch (error) {
          console.error(`Validation rule ${rule.name} failed:`, error);
          validation.warnings.push(`Validation rule error: ${rule.name}`);
        }
      }

      // Generate workflow analysis
      validation.workflow_analysis = await this.analyzeWorkflow(task, newStatus, context, taskStorage);

      // Calculate overall confidence
      validation.confidence = this.calculateValidationConfidence(validation);

    } catch (error) {
      console.error('Error in status validation:', error);
      validation.valid = false;
      validation.blocking_issues.push('Validation system error');
    }

    return validation;
  }

  /**
   * Validate basic status transitions
   */
  static validateTransition(fromStatus, toStatus) {
    const validTransitions = {
      'todo': ['in_progress', 'blocked', 'done'], // Allow direct todo->done for simple tasks
      'in_progress': ['done', 'blocked', 'todo'],
      'blocked': ['todo', 'in_progress', 'done'],
      'done': ['in_progress', 'todo'] // Allow reopening
    };

    if (fromStatus === toStatus) {
      return { valid: false, reason: 'Task is already in the requested status' };
    }

    if (!validTransitions[fromStatus]?.includes(toStatus)) {
      return { 
        valid: false, 
        reason: `Invalid transition: ${fromStatus} → ${toStatus}. Valid transitions from ${fromStatus}: ${validTransitions[fromStatus]?.join(', ') || 'none'}` 
      };
    }

    return { valid: true };
  }

  /**
   * Validate subtask dependencies
   */
  static async validateSubtaskDependencies(task, newStatus, context, taskStorage) {
    const result = {
      warnings: [],
      suggestions: [],
      blocking_issues: []
    };

    if (!taskStorage) return result;

    try {
      // Check parent-child relationships
      if (task.subtasks && task.subtasks.length > 0) {
        const subtasks = await Promise.all(
          task.subtasks.map(id => taskStorage.getTask(id))
        );
        
        const validSubtasks = subtasks.filter(st => st !== null);
        const incompleteSubtasks = validSubtasks.filter(st => st.status !== 'done');
        
        if (newStatus === 'done' && incompleteSubtasks.length > 0) {
          if (context.force_complete) {
            result.warnings.push(`Completing task with ${incompleteSubtasks.length} incomplete subtasks (forced)`);
          } else {
            result.blocking_issues.push(
              `Cannot complete task: ${incompleteSubtasks.length} subtasks still incomplete (${incompleteSubtasks.map(st => st.serial).join(', ')})`
            );
            result.suggestions.push({
              type: 'complete_subtasks',
              message: 'Complete all subtasks first, or use force_complete flag if intentional',
              action: 'review_subtasks',
              subtasks: incompleteSubtasks.map(st => ({ id: st.id, serial: st.serial, status: st.status }))
            });
          }
        }
      }

      // Check if this task is blocking parent tasks
      if (task.parent_task) {
        const parentTask = await taskStorage.getTask(task.parent_task);
        if (parentTask) {
          if (newStatus === 'done' && parentTask.status === 'blocked') {
            result.suggestions.push({
              type: 'unblock_parent',
              message: `Completing this subtask may unblock parent task: ${parentTask.serial}`,
              action: 'check_parent_task',
              parent_task: { id: parentTask.id, serial: parentTask.serial }
            });
          }
        }
      }

    } catch (error) {
      console.error('Error validating subtask dependencies:', error);
      result.warnings.push('Could not fully validate subtask dependencies');
    }

    return result;
  }

  /**
   * Validate workflow logic and patterns
   */
  static async validateWorkflowLogic(task, newStatus, context, taskStorage) {
    const result = {
      warnings: [],
      suggestions: [],
      blocking_issues: []
    };

    // Development workflow validation
    if (task.category === 'code') {
      if (newStatus === 'done' && task.status === 'in_progress') {
        const taskText = `${task.title} ${task.description || ''}`.toLowerCase();
        
        // Check for testing indicators
        const hasTestingMention = /test|spec|unit|integration|e2e/.test(taskText);
        const hasReviewMention = /review|pr|pull request|code review/.test(taskText);
        
        if (!hasTestingMention && !context.skip_testing) {
          result.warnings.push('No testing mentioned - consider adding tests before completion');
          result.suggestions.push({
            type: 'add_testing',
            message: 'Consider adding unit tests or integration tests',
            action: 'add_testing_subtask'
          });
        }
        
        if (!hasReviewMention && !context.skip_review) {
          result.warnings.push('No code review mentioned - consider peer review');
          result.suggestions.push({
            type: 'add_review',
            message: 'Consider creating a pull request for code review',
            action: 'create_pr'
          });
        }
      }
    }

    // Research workflow validation
    if (task.category === 'research') {
      if (newStatus === 'done' && task.status === 'in_progress') {
        const taskText = `${task.title} ${task.description || ''}`.toLowerCase();
        
        if (!/finding|result|conclusion|analysis|summary/.test(taskText)) {
          result.suggestions.push({
            type: 'document_findings',
            message: 'Consider documenting research findings before completion',
            action: 'add_findings_memory'
          });
        }
      }
    }

    return result;
  }

  /**
   * Validate business rules and constraints
   */
  static async validateBusinessRules(task, newStatus, context, taskStorage) {
    const result = {
      warnings: [],
      suggestions: [],
      blocking_issues: []
    };

    // Priority-based validation
    if (task.priority === 'urgent') {
      if (newStatus === 'todo' && task.status === 'in_progress') {
        result.warnings.push('Moving urgent task back to todo - verify this is intentional');
        result.suggestions.push({
          type: 'urgent_task_review',
          message: 'Urgent tasks should generally move forward in workflow',
          action: 'review_priority'
        });
      }
      
      if (newStatus === 'blocked') {
        result.suggestions.push({
          type: 'urgent_blocking',
          message: 'Urgent task being blocked - consider escalation or alternative approaches',
          action: 'escalate_blocking'
        });
      }
    }

    // Project deadline validation (would need project metadata)
    if (task.project && newStatus === 'blocked') {
      result.suggestions.push({
        type: 'project_impact',
        message: 'Task blocking may impact project timeline',
        action: 'assess_project_impact'
      });
    }

    return result;
  }

  /**
   * Validate time-based constraints
   */
  static async validateTimeConstraints(task, newStatus, context, taskStorage) {
    const result = {
      warnings: [],
      suggestions: [],
      blocking_issues: []
    };

    const now = new Date();
    const taskCreated = new Date(task.created);
    const taskUpdated = new Date(task.updated);
    
    const daysSinceCreated = (now - taskCreated) / (1000 * 60 * 60 * 24);
    const daysSinceUpdated = (now - taskUpdated) / (1000 * 60 * 60 * 24);

    // Quick completion validation
    if (newStatus === 'done' && daysSinceCreated < 1/24) { // Less than 1 hour
      if (task.priority !== 'low') {
        result.warnings.push('Task completed very quickly - verify all requirements met');
      }
    }

    // Stale task validation
    if (daysSinceUpdated > 7 && newStatus !== 'done') {
      result.warnings.push(`Task hasn't been updated in ${Math.floor(daysSinceUpdated)} days`);
      result.suggestions.push({
        type: 'stale_task',
        message: 'Consider reviewing task relevance and current status',
        action: 'review_task_status'
      });
    }

    // Long in-progress validation
    if (task.status === 'in_progress' && daysSinceUpdated > 3 && newStatus !== 'done') {
      result.suggestions.push({
        type: 'long_progress',
        message: 'Task has been in progress for several days - consider breaking into subtasks',
        action: 'create_subtasks'
      });
    }

    return result;
  }

  /**
   * Validate priority alignment
   */
  static async validatePriorityAlignment(task, newStatus, context, taskStorage) {
    const result = {
      warnings: [],
      suggestions: [],
      blocking_issues: []
    };

    // High priority tasks should move through workflow efficiently
    if (task.priority === 'high' || task.priority === 'urgent') {
      if (newStatus === 'blocked' && !context.blocking_reason) {
        result.suggestions.push({
          type: 'high_priority_blocking',
          message: 'High priority task blocked - provide blocking reason for tracking',
          action: 'add_blocking_reason'
        });
      }
    }

    // Low priority tasks being rushed
    if (task.priority === 'low' && newStatus === 'done') {
      const taskCreated = new Date(task.created);
      const hoursToComplete = (Date.now() - taskCreated.getTime()) / (1000 * 60 * 60);
      
      if (hoursToComplete < 2) {
        result.suggestions.push({
          type: 'quick_low_priority',
          message: 'Low priority task completed quickly - consider if priority was accurate',
          action: 'review_priority_accuracy'
        });
      }
    }

    return result;
  }

  /**
   * Validate resource availability and constraints
   */
  static async validateResourceAvailability(task, newStatus, context, taskStorage) {
    const result = {
      warnings: [],
      suggestions: [],
      blocking_issues: []
    };

    // Check for resource-related keywords in task
    const taskText = `${task.title} ${task.description || ''}`.toLowerCase();
    
    if (newStatus === 'in_progress') {
      // Check for resource requirements
      if (/database|db|server|api|external/.test(taskText)) {
        result.suggestions.push({
          type: 'resource_check',
          message: 'Task involves external resources - verify availability',
          action: 'check_resource_status'
        });
      }
      
      if (/review|approval|sign.*off/.test(taskText)) {
        result.suggestions.push({
          type: 'approval_required',
          message: 'Task requires review/approval - ensure reviewers are available',
          action: 'confirm_reviewer_availability'
        });
      }
    }

    return result;
  }

  /**
   * Analyze overall workflow state and provide recommendations
   */
  static async analyzeWorkflow(task, newStatus, context, taskStorage) {
    const analysis = {
      workflow_stage: null,
      completion_percentage: 0,
      next_suggested_actions: [],
      potential_blockers: [],
      optimization_opportunities: []
    };

    try {
      // Determine workflow stage
      analysis.workflow_stage = this.determineWorkflowStage(task, newStatus);
      
      // Calculate completion percentage
      analysis.completion_percentage = this.calculateCompletionPercentage(task, newStatus);
      
      // Get automation suggestions
      if (taskStorage) {
        const automationSuggestions = await TaskAutomation.getAutomationSuggestions(task.id, taskStorage);
        if (automationSuggestions.has_suggestions) {
          analysis.optimization_opportunities.push({
            type: 'automation_available',
            message: 'Automation opportunities detected',
            details: automationSuggestions
          });
        }
      }

      // Suggest next actions based on new status
      analysis.next_suggested_actions = this.suggestNextActions(task, newStatus, context);
      
      // Identify potential blockers
      analysis.potential_blockers = this.identifyPotentialBlockers(task, newStatus);

    } catch (error) {
      console.error('Error in workflow analysis:', error);
    }

    return analysis;
  }

  /**
   * Determine the current workflow stage
   */
  static determineWorkflowStage(task, newStatus) {
    const stages = {
      'todo': 'planning',
      'in_progress': 'execution',
      'blocked': 'resolution_needed',
      'done': 'completed'
    };

    return stages[newStatus] || 'unknown';
  }

  /**
   * Calculate task completion percentage
   */
  static calculateCompletionPercentage(task, newStatus) {
    const statusWeights = {
      'todo': 0,
      'in_progress': 50,
      'blocked': 25, // Some progress made but halted
      'done': 100
    };

    let basePercentage = statusWeights[newStatus] || 0;

    // Adjust based on subtasks if available
    if (task.subtasks && task.subtasks.length > 0) {
      // This would need actual subtask status data
      // For now, just return base percentage
    }

    return basePercentage;
  }

  /**
   * Suggest next actions based on status
   */
  static suggestNextActions(task, newStatus, context) {
    const actions = [];

    switch (newStatus) {
      case 'in_progress':
        actions.push('Break down task into specific implementation steps');
        actions.push('Set up progress tracking and checkpoints');
        if (task.category === 'code') {
          actions.push('Create feature branch and initial implementation');
        }
        break;
        
      case 'done':
        actions.push('Update any dependent tasks or notify stakeholders');
        actions.push('Document lessons learned or implementation notes');
        if (task.subtasks && task.subtasks.length > 0) {
          actions.push('Review and potentially close related subtasks');
        }
        break;
        
      case 'blocked':
        actions.push('Document specific blocking reason and required resolution');
        actions.push('Identify alternative approaches or workarounds');
        actions.push('Set up notifications for when blocker is resolved');
        break;
        
      case 'todo':
        actions.push('Review task requirements and acceptance criteria');
        actions.push('Estimate effort and identify any dependencies');
        break;
    }

    return actions;
  }

  /**
   * Identify potential future blockers
   */
  static identifyPotentialBlockers(task, newStatus) {
    const blockers = [];
    const taskText = `${task.title} ${task.description || ''}`.toLowerCase();

    // Common blocking patterns
    if (/external|third.?party|api|integration/.test(taskText)) {
      blockers.push({
        type: 'external_dependency',
        description: 'Task involves external dependencies that may cause delays',
        mitigation: 'Have backup plans and early communication with external parties'
      });
    }

    if (/review|approval|sign.?off/.test(taskText)) {
      blockers.push({
        type: 'approval_bottleneck',
        description: 'Task requires approvals which may create bottlenecks',
        mitigation: 'Schedule review time in advance and prepare materials early'
      });
    }

    if (/database|migration|schema/.test(taskText)) {
      blockers.push({
        type: 'data_complexity',
        description: 'Database changes can have unexpected complications',
        mitigation: 'Plan for rollback scenarios and test thoroughly in staging'
      });
    }

    return blockers;
  }

  /**
   * Merge validation results from multiple rules
   */
  static mergeValidationResult(mainResult, ruleResult) {
    if (ruleResult.warnings) {
      mainResult.warnings.push(...ruleResult.warnings);
    }
    if (ruleResult.suggestions) {
      mainResult.suggestions.push(...ruleResult.suggestions);
    }
    if (ruleResult.blocking_issues) {
      mainResult.blocking_issues.push(...ruleResult.blocking_issues);
      if (ruleResult.blocking_issues.length > 0) {
        mainResult.valid = false;
      }
    }
    if (ruleResult.recommended_actions) {
      mainResult.recommended_actions.push(...ruleResult.recommended_actions);
    }
  }

  /**
   * Calculate overall validation confidence
   */
  static calculateValidationConfidence(validation) {
    let confidence = 1.0;

    // Reduce confidence for warnings
    confidence -= validation.warnings.length * 0.1;
    
    // Reduce confidence for blocking issues
    confidence -= validation.blocking_issues.length * 0.3;
    
    // Reduce confidence if there are many suggestions (indicates complexity)
    if (validation.suggestions.length > 3) {
      confidence -= 0.1;
    }

    return Math.max(confidence, 0.0);
  }

  /**
   * Generate a comprehensive validation report
   */
  static generateValidationReport(validation, task, newStatus) {
    const report = {
      summary: validation.valid ? 'Status change validated' : 'Status change has issues',
      confidence: validation.confidence,
      transition: `${task.status} → ${newStatus}`,
      issues_count: validation.blocking_issues.length,
      warnings_count: validation.warnings.length,
      suggestions_count: validation.suggestions.length,
      detailed_analysis: {
        blocking_issues: validation.blocking_issues,
        warnings: validation.warnings,
        suggestions: validation.suggestions,
        workflow_analysis: validation.workflow_analysis
      }
    };

    return report;
  }
}