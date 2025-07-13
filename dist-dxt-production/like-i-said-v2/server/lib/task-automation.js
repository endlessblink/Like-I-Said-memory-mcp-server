/**
 * Smart Task Automation System
 * Provides intelligent automated status transitions based on context analysis
 */

import { TaskNLPProcessor } from './task-nlp-processor.js';

export class TaskAutomation {
  
  /**
   * Check if a task should be automatically updated based on various context signals
   * @param {string} taskId - Task ID to check
   * @param {Object} taskStorage - Task storage instance
   * @param {Object} memoryStorage - Memory storage instance
   * @returns {Object|null} Automation recommendation or null
   */
  static async checkForAutomatedUpdates(taskId, taskStorage, memoryStorage = null) {
    const task = await taskStorage.getTask(taskId);
    if (!task) return null;

    const automationRules = [
      this.checkSubtaskCompletion,
      this.checkMemoryEvidence,
      this.checkTimeBasedRules,
      this.checkDependencyResolution,
      this.checkWorkflowPatterns
    ];

    for (const rule of automationRules) {
      try {
        const result = await rule(task, taskStorage, memoryStorage);
        if (result && result.shouldUpdate) {
          result.automation_type = rule.name;
          result.timestamp = new Date().toISOString();
          return result;
        }
      } catch (error) {
        console.error(`Automation rule ${rule.name} failed:`, error);
      }
    }

    return null;
  }

  /**
   * Check if all subtasks are complete to auto-complete parent
   */
  static async checkSubtaskCompletion(task, taskStorage) {
    if (!task.subtasks || task.subtasks.length === 0) {
      return { shouldUpdate: false };
    }

    try {
      const subtasks = await Promise.all(
        task.subtasks.map(id => taskStorage.getTask(id))
      );
      
      const validSubtasks = subtasks.filter(st => st !== null);
      const completedSubtasks = validSubtasks.filter(st => st.status === 'done');
      const blockedSubtasks = validSubtasks.filter(st => st.status === 'blocked');
      
      // All subtasks completed -> auto-complete parent
      if (validSubtasks.length > 0 && completedSubtasks.length === validSubtasks.length && task.status !== 'done') {
        return {
          shouldUpdate: true,
          newStatus: 'done',
          reason: `All ${validSubtasks.length} subtasks completed`,
          confidence: 0.95,
          automation_details: {
            completed_subtasks: completedSubtasks.length,
            total_subtasks: validSubtasks.length,
            subtask_serials: completedSubtasks.map(st => st.serial).join(', ')
          }
        };
      }
      
      // Any subtask blocked -> suggest parent blocked
      if (blockedSubtasks.length > 0 && task.status === 'in_progress') {
        return {
          shouldUpdate: true,
          newStatus: 'blocked',
          reason: `${blockedSubtasks.length} subtask(s) blocked`,
          confidence: 0.7,
          automation_details: {
            blocked_subtasks: blockedSubtasks.length,
            blocked_serials: blockedSubtasks.map(st => st.serial).join(', ')
          }
        };
      }

    } catch (error) {
      console.error('Error checking subtask completion:', error);
    }

    return { shouldUpdate: false };
  }

  /**
   * Check memory connections for completion evidence
   */
  static async checkMemoryEvidence(task, taskStorage, memoryStorage) {
    if (!memoryStorage || !task.memory_connections || task.memory_connections.length === 0) {
      return { shouldUpdate: false };
    }

    try {
      // Get recent memories connected to this task
      const recentMemories = [];
      for (const conn of task.memory_connections) {
        try {
          const memory = await memoryStorage.getMemory(conn.memory_id);
          if (memory) {
            const memoryAge = Date.now() - new Date(memory.timestamp).getTime();
            if (memoryAge < 24 * 60 * 60 * 1000) { // Last 24 hours
              recentMemories.push(memory);
            }
          }
        } catch (error) {
          console.error(`Error fetching memory ${conn.memory_id}:`, error);
        }
      }

      if (recentMemories.length === 0) {
        return { shouldUpdate: false };
      }

      // Analyze memory content for completion signals
      const completionSignals = [];
      const blockingSignals = [];

      for (const memory of recentMemories) {
        const nlpResult = TaskNLPProcessor.parseStatusIntent(memory.content, {
          current_status: task.status
        });

        if (nlpResult.confidence > 0.6) {
          if (nlpResult.suggested_status === 'done') {
            completionSignals.push({
              memory_id: memory.id,
              confidence: nlpResult.confidence,
              evidence: nlpResult.matched_phrase
            });
          } else if (nlpResult.suggested_status === 'blocked') {
            blockingSignals.push({
              memory_id: memory.id,
              confidence: nlpResult.confidence,
              evidence: nlpResult.matched_phrase
            });
          }
        }
      }

      // Strong completion evidence
      if (completionSignals.length > 0 && task.status === 'in_progress') {
        const avgConfidence = completionSignals.reduce((sum, sig) => sum + sig.confidence, 0) / completionSignals.length;
        
        if (avgConfidence > 0.7) {
          return {
            shouldUpdate: true,
            newStatus: 'done',
            reason: 'Completion evidence found in recent memories',
            confidence: avgConfidence,
            automation_details: {
              evidence_count: completionSignals.length,
              evidence_sources: completionSignals.map(sig => sig.evidence).join('; '),
              memory_ids: completionSignals.map(sig => sig.memory_id)
            }
          };
        }
      }

      // Strong blocking evidence
      if (blockingSignals.length > 0 && task.status === 'in_progress') {
        const avgConfidence = blockingSignals.reduce((sum, sig) => sum + sig.confidence, 0) / blockingSignals.length;
        
        if (avgConfidence > 0.7) {
          return {
            shouldUpdate: true,
            newStatus: 'blocked',
            reason: 'Blocking evidence found in recent memories',
            confidence: avgConfidence,
            automation_details: {
              evidence_count: blockingSignals.length,
              evidence_sources: blockingSignals.map(sig => sig.evidence).join('; '),
              memory_ids: blockingSignals.map(sig => sig.memory_id)
            }
          };
        }
      }

    } catch (error) {
      console.error('Error checking memory evidence:', error);
    }

    return { shouldUpdate: false };
  }

  /**
   * Check time-based rules for status transitions
   */
  static async checkTimeBasedRules(task, taskStorage) {
    const now = new Date();
    const taskCreated = new Date(task.created);
    const taskUpdated = new Date(task.updated);
    
    const daysSinceCreated = (now - taskCreated) / (1000 * 60 * 60 * 24);
    const daysSinceUpdated = (now - taskUpdated) / (1000 * 60 * 60 * 24);

    // Stale in_progress tasks (>7 days without update)
    if (task.status === 'in_progress' && daysSinceUpdated > 7) {
      return {
        shouldUpdate: false, // Don't auto-change, just suggest
        suggestion: {
          type: 'stale_task',
          message: `Task has been in progress for ${Math.floor(daysSinceUpdated)} days without updates`,
          suggested_action: 'Review task status and progress',
          confidence: 0.6
        }
      };
    }

    // High priority tasks stuck in todo (>3 days)
    if (task.status === 'todo' && task.priority === 'urgent' && daysSinceCreated > 3) {
      return {
        shouldUpdate: false, // Don't auto-change, just suggest
        suggestion: {
          type: 'urgent_task_delay',
          message: `Urgent task has been in todo for ${Math.floor(daysSinceCreated)} days`,
          suggested_action: 'Consider prioritizing or reassessing urgency',
          confidence: 0.7
        }
      };
    }

    return { shouldUpdate: false };
  }

  /**
   * Check for dependency resolution patterns
   */
  static async checkDependencyResolution(task, taskStorage) {
    if (task.status !== 'blocked') {
      return { shouldUpdate: false };
    }

    try {
      // Look for parent task completion if this is a subtask
      if (task.parent_task) {
        const parentTask = await taskStorage.getTask(task.parent_task);
        if (parentTask && parentTask.status === 'in_progress') {
          return {
            shouldUpdate: true,
            newStatus: 'todo',
            reason: 'Parent task is now in progress, unblocking subtask',
            confidence: 0.8,
            automation_details: {
              parent_task: parentTask.serial,
              parent_status: parentTask.status
            }
          };
        }
      }

      // Check if blocking conditions mentioned in task description are resolved
      const blockingKeywords = ['waiting for', 'depends on', 'blocked by', 'need'];
      const taskText = `${task.title} ${task.description || ''}`.toLowerCase();
      
      let hasBlockingKeywords = false;
      for (const keyword of blockingKeywords) {
        if (taskText.includes(keyword)) {
          hasBlockingKeywords = true;
          break;
        }
      }

      // If task has been blocked for >5 days without blocking keywords, suggest review
      if (!hasBlockingKeywords) {
        const taskUpdated = new Date(task.updated);
        const daysSinceUpdated = (Date.now() - taskUpdated.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceUpdated > 5) {
          return {
            shouldUpdate: false,
            suggestion: {
              type: 'long_blocked_task',
              message: `Task has been blocked for ${Math.floor(daysSinceUpdated)} days without clear blocking reason`,
              suggested_action: 'Review blocking conditions or consider unblocking',
              confidence: 0.6
            }
          };
        }
      }

    } catch (error) {
      console.error('Error checking dependency resolution:', error);
    }

    return { shouldUpdate: false };
  }

  /**
   * Check for common workflow patterns
   */
  static async checkWorkflowPatterns(task, taskStorage) {
    try {
      // Pattern 1: Development workflow (code -> test -> review -> deploy)
      if (task.category === 'code' && task.status === 'in_progress') {
        const taskText = `${task.title} ${task.description || ''}`.toLowerCase();
        
        // Check for testing completion indicators
        const testingComplete = /test.*pass|test.*complete|all tests|testing done/i.test(taskText);
        const reviewComplete = /review.*complete|code review|pr.*approve|merge.*ready/i.test(taskText);
        
        if (testingComplete && reviewComplete) {
          return {
            shouldUpdate: true,
            newStatus: 'done',
            reason: 'Development workflow completed (testing and review done)',
            confidence: 0.8,
            automation_details: {
              workflow_type: 'development',
              completed_stages: ['testing', 'review']
            }
          };
        }
      }

      // Pattern 2: Research tasks with findings
      if (task.category === 'research' && task.status === 'in_progress') {
        const taskText = `${task.title} ${task.description || ''}`.toLowerCase();
        
        const researchComplete = /research.*complete|findings|conclusion|result|analysis.*done/i.test(taskText);
        
        if (researchComplete) {
          return {
            shouldUpdate: true,
            newStatus: 'done',
            reason: 'Research workflow completed (findings documented)',
            confidence: 0.75,
            automation_details: {
              workflow_type: 'research',
              completion_indicator: 'findings_documented'
            }
          };
        }
      }

    } catch (error) {
      console.error('Error checking workflow patterns:', error);
    }

    return { shouldUpdate: false };
  }

  /**
   * Apply automated status change with full validation and history tracking
   */
  static async applyAutomatedUpdate(taskId, automationResult, taskStorage) {
    if (!automationResult || !automationResult.shouldUpdate) {
      return false;
    }

    try {
      const task = await taskStorage.getTask(taskId);
      if (!task) {
        console.error(`Task ${taskId} not found for automation update`);
        return false;
      }

      // Validate the transition is still valid
      const currentTime = new Date().toISOString();
      const timeSinceAutomation = new Date(currentTime) - new Date(automationResult.timestamp);
      
      // Don't apply automation if too much time has passed (>1 hour)
      if (timeSinceAutomation > 60 * 60 * 1000) {
        console.log(`Automation result too old for task ${taskId}, skipping`);
        return false;
      }

      // Apply the update with automation metadata
      const updates = {
        status: automationResult.newStatus,
        reason: automationResult.reason,
        automation_applied: {
          type: automationResult.automation_type,
          confidence: automationResult.confidence,
          timestamp: currentTime,
          details: automationResult.automation_details
        }
      };

      const updatedTask = await taskStorage.updateTask(taskId, updates);
      
      console.log(`✅ Automated status change applied: ${task.serial} → ${automationResult.newStatus} (${automationResult.reason})`);
      
      return updatedTask;

    } catch (error) {
      console.error(`Error applying automated update for task ${taskId}:`, error);
      return false;
    }
  }

  /**
   * Get automation suggestions for a task without applying them
   */
  static async getAutomationSuggestions(taskId, taskStorage, memoryStorage = null) {
    const automationResult = await this.checkForAutomatedUpdates(taskId, taskStorage, memoryStorage);
    
    if (automationResult) {
      return {
        has_suggestions: true,
        automation_available: automationResult.shouldUpdate,
        suggestion: automationResult.suggestion || null,
        recommended_status: automationResult.newStatus || null,
        confidence: automationResult.confidence || 0,
        reasoning: automationResult.reason || 'Automation analysis completed',
        details: automationResult.automation_details || {}
      };
    }

    return {
      has_suggestions: false,
      automation_available: false,
      message: 'No automation opportunities detected'
    };
  }
}