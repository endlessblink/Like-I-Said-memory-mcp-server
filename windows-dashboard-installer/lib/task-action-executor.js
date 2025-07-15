/**
 * TaskActionExecutor - Executes task actions based on memory analysis
 * 
 * This module handles:
 * - Creating new tasks from memories
 * - Updating existing tasks based on memory content
 * - Completing tasks when memories indicate completion
 * - Blocking tasks when memories indicate blockers
 * - Linking memories to tasks bidirectionally
 */

import { TaskMemoryLinker } from './task-memory-linker.js';

class TaskActionExecutor {
  constructor(memoryStorage, taskStorage) {
    this.memoryStorage = memoryStorage;
    this.taskStorage = taskStorage;
    this.taskMemoryLinker = new TaskMemoryLinker(memoryStorage, taskStorage);
  }

  /**
   * Execute the determined action based on memory analysis
   * @param {Object} action - Action object from MemoryTaskAnalyzer
   * @param {Object} memory - Memory object that triggered the action
   * @param {Array} relevantTasks - Array of relevant tasks from TaskDiscovery
   * @returns {Object} Result of the action execution
   */
  async execute(action, memory, relevantTasks = []) {
    console.error(`[TaskActionExecutor] Executing action: ${action.action} with confidence ${action.confidence}`);
    
    try {
      switch (action.action) {
        case 'create':
          return await this.createTaskFromMemory(memory, action.extractedData);
        
        case 'update':
          return await this.updateTaskFromMemory(
            this.selectBestTask(relevantTasks, 'update'),
            memory,
            action.extractedData
          );
        
        case 'complete':
          return await this.completeTaskFromMemory(
            this.selectBestTask(relevantTasks, 'complete'),
            memory,
            action.extractedData
          );
        
        case 'block':
          return await this.blockTaskFromMemory(
            this.selectBestTask(relevantTasks, 'block'),
            memory,
            action.extractedData
          );
        
        default:
          console.error(`[TaskActionExecutor] Unknown action: ${action.action}`);
          return { success: false, error: `Unknown action: ${action.action}` };
      }
    } catch (error) {
      console.error(`[TaskActionExecutor] Error executing action ${action.action}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a new task from memory content
   * @param {Object} memory - Memory object
   * @param {Object} extractedData - Data extracted from memory analysis
   * @returns {Object} Execution result
   */
  async createTaskFromMemory(memory, extractedData) {
    console.error(`[TaskActionExecutor] Creating task from memory: ${memory.id}`);
    
    // Check if similar task already exists
    const existingTasks = await this.taskStorage.searchTasks(extractedData.title);
    const similarTask = existingTasks.find(task => 
      task.title && extractedData.title &&
      task.title.toLowerCase() === extractedData.title.toLowerCase() &&
      task.project === memory.project &&
      task.status !== 'done'
    );
    
    if (similarTask) {
      console.error(`[TaskActionExecutor] Similar task already exists: ${similarTask.id}`);
      // Instead of creating, link to existing task
      return await this.linkMemoryToTask(memory, similarTask, 'existing_task');
    }
    
    // Generate task ID and serial
    const taskId = this.generateTaskId();
    const taskSerial = await this.generateTaskSerial();
    
    // Create task object
    const newTask = {
      id: taskId,
      serial: taskSerial,
      title: extractedData.title,
      description: extractedData.description || extractedData.title,
      project: memory.project || 'default',
      category: extractedData.category || memory.category || 'general',
      priority: extractedData.priority || 'medium',
      status: extractedData.status || 'todo',
      tags: this.mergeTaskTags(memory.tags || [], extractedData.tags || []),
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      memory_connections: [{
        memory_id: memory.id,
        memory_serial: memory.serial || `MEM-${memory.id.substring(0, 6)}`,
        connection_type: 'creation_trigger',
        relevance: 1.0,
        created: new Date().toISOString(),
        notes: 'Task created from memory content'
      }],
      automated_creation: {
        source: 'memory',
        memory_id: memory.id,
        confidence: extractedData.confidence || 0.8,
        timestamp: new Date().toISOString()
      }
    };
    
    // Add deadline if extracted
    if (extractedData.deadline) {
      newTask.deadline = extractedData.deadline;
    }
    
    // Save the task
    await this.taskStorage.saveTask(newTask);
    
    // Link memory to task
    await this.linkMemoryToTask(memory, newTask, 'task_creation');
    
    console.error(`[TaskActionExecutor] Created task: ${taskSerial} - ${newTask.title}`);
    
    return {
      success: true,
      action: 'create',
      task: newTask,
      message: `Created task: ${taskSerial} - ${newTask.title}`
    };
  }

  /**
   * Update an existing task based on memory content
   * @param {Object} task - Task to update
   * @param {Object} memory - Memory object
   * @param {Object} extractedData - Data extracted from memory analysis
   * @returns {Object} Execution result
   */
  async updateTaskFromMemory(task, memory, extractedData) {
    if (!task) {
      console.error(`[TaskActionExecutor] No task provided for update`);
      return { success: false, error: 'No task provided for update' };
    }
    
    console.error(`[TaskActionExecutor] Updating task: ${task.serial} - ${task.title}`);
    
    // Check if task is already completed
    if (task.status === 'done') {
      console.error(`[TaskActionExecutor] Task already completed: ${task.serial}`);
      return { success: false, error: 'Task already completed' };
    }
    
    // Update task properties
    const updates = {
      updated: new Date().toISOString()
    };
    
    // Update status if provided
    if (extractedData.status && extractedData.status !== task.status) {
      updates.status = extractedData.status;
    }
    
    // Add progress note if provided
    if (extractedData.progressNote) {
      if (!task.progress_notes) {
        task.progress_notes = [];
      }
      task.progress_notes.push({
        note: extractedData.progressNote,
        timestamp: new Date().toISOString(),
        source: 'memory',
        memory_id: memory.id
      });
    }
    
    // Update memory connections
    if (!task.memory_connections) {
      task.memory_connections = [];
    }
    
    // Check if memory is already connected
    const existingConnection = task.memory_connections.find(conn => conn.memory_id === memory.id);
    if (!existingConnection) {
      task.memory_connections.push({
        memory_id: memory.id,
        memory_serial: memory.serial || `MEM-${memory.id.substring(0, 6)}`,
        connection_type: 'progress_update',
        relevance: 0.9,
        created: new Date().toISOString(),
        notes: 'Memory provided progress update'
      });
    }
    
    // Apply updates
    Object.assign(task, updates);
    
    // Save updated task
    await this.taskStorage.saveTask(task);
    
    // Link memory to task
    await this.linkMemoryToTask(memory, task, 'task_update');
    
    console.error(`[TaskActionExecutor] Updated task: ${task.serial} - status: ${task.status}`);
    
    return {
      success: true,
      action: 'update',
      task: task,
      message: `Updated task: ${task.serial} - status: ${task.status}`
    };
  }

  /**
   * Complete a task based on memory content
   * @param {Object} task - Task to complete
   * @param {Object} memory - Memory object
   * @param {Object} extractedData - Data extracted from memory analysis
   * @returns {Object} Execution result
   */
  async completeTaskFromMemory(task, memory, extractedData) {
    if (!task) {
      console.error(`[TaskActionExecutor] No task provided for completion`);
      return { success: false, error: 'No task provided for completion' };
    }
    
    console.error(`[TaskActionExecutor] Completing task: ${task.serial} - ${task.title}`);
    
    // Check if task is already completed
    if (task.status === 'done') {
      console.error(`[TaskActionExecutor] Task already completed: ${task.serial}`);
      return { success: false, error: 'Task already completed' };
    }
    
    // Update task to completed
    const updates = {
      status: 'done',
      completed: new Date().toISOString(),
      updated: new Date().toISOString()
    };
    
    // Add completion note if provided
    if (extractedData.completionNote) {
      if (!task.completion_notes) {
        task.completion_notes = [];
      }
      task.completion_notes.push({
        note: extractedData.completionNote,
        timestamp: new Date().toISOString(),
        source: 'memory',
        memory_id: memory.id
      });
    }
    
    // Update memory connections
    if (!task.memory_connections) {
      task.memory_connections = [];
    }
    
    // Add completion memory connection
    task.memory_connections.push({
      memory_id: memory.id,
      memory_serial: memory.serial || `MEM-${memory.id.substring(0, 6)}`,
      connection_type: 'completion_evidence',
      relevance: 1.0,
      created: new Date().toISOString(),
      notes: 'Memory provided completion evidence'
    });
    
    // Apply updates
    Object.assign(task, updates);
    
    // Save updated task
    await this.taskStorage.saveTask(task);
    
    // Link memory to task
    await this.linkMemoryToTask(memory, task, 'task_completion');
    
    // Create completion memory using TaskMemoryLinker
    try {
      await this.taskMemoryLinker.createTaskCompletionMemory(task);
    } catch (error) {
      console.error(`[TaskActionExecutor] Error creating completion memory:`, error);
    }
    
    console.error(`[TaskActionExecutor] Completed task: ${task.serial} - ${task.title}`);
    
    return {
      success: true,
      action: 'complete',
      task: task,
      message: `Completed task: ${task.serial} - ${task.title}`
    };
  }

  /**
   * Block a task based on memory content
   * @param {Object} task - Task to block
   * @param {Object} memory - Memory object
   * @param {Object} extractedData - Data extracted from memory analysis
   * @returns {Object} Execution result
   */
  async blockTaskFromMemory(task, memory, extractedData) {
    if (!task) {
      console.error(`[TaskActionExecutor] No task provided for blocking`);
      return { success: false, error: 'No task provided for blocking' };
    }
    
    console.error(`[TaskActionExecutor] Blocking task: ${task.serial} - ${task.title}`);
    
    // Check if task is already completed
    if (task.status === 'done') {
      console.error(`[TaskActionExecutor] Cannot block completed task: ${task.serial}`);
      return { success: false, error: 'Cannot block completed task' };
    }
    
    // Update task to blocked
    const updates = {
      status: 'blocked',
      updated: new Date().toISOString()
    };
    
    // Add blocking reason
    if (extractedData.blockingReason) {
      if (!task.blocking_notes) {
        task.blocking_notes = [];
      }
      task.blocking_notes.push({
        reason: extractedData.blockingReason,
        timestamp: new Date().toISOString(),
        source: 'memory',
        memory_id: memory.id
      });
    }
    
    // Update memory connections
    if (!task.memory_connections) {
      task.memory_connections = [];
    }
    
    // Add blocking memory connection
    task.memory_connections.push({
      memory_id: memory.id,
      memory_serial: memory.serial || `MEM-${memory.id.substring(0, 6)}`,
      connection_type: 'blocking_reason',
      relevance: 0.9,
      created: new Date().toISOString(),
      notes: 'Memory provided blocking reason'
    });
    
    // Apply updates
    Object.assign(task, updates);
    
    // Save updated task
    await this.taskStorage.saveTask(task);
    
    // Link memory to task
    await this.linkMemoryToTask(memory, task, 'task_blocking');
    
    console.error(`[TaskActionExecutor] Blocked task: ${task.serial} - reason: ${extractedData.blockingReason}`);
    
    return {
      success: true,
      action: 'block',
      task: task,
      message: `Blocked task: ${task.serial} - reason: ${extractedData.blockingReason}`
    };
  }

  /**
   * Link memory to task bidirectionally
   * @param {Object} memory - Memory object
   * @param {Object} task - Task object
   * @param {string} connectionType - Type of connection
   * @returns {Promise<void>}
   */
  async linkMemoryToTask(memory, task, connectionType) {
    // Add task connection to memory
    await this.taskMemoryLinker.updateMemoryWithTaskConnection(memory.id, {
      task_id: task.id,
      task_serial: task.serial,
      connection_type: connectionType,
      relevance: 1.0,
      created: new Date().toISOString(),
      notes: `Memory linked to task via ${connectionType}`
    });
  }

  /**
   * Select the best task from relevant tasks for the given action
   * @param {Array} relevantTasks - Array of relevant tasks
   * @param {string} actionType - Type of action
   * @returns {Object|null} Best task for the action
   */
  selectBestTask(relevantTasks, actionType) {
    if (!relevantTasks || relevantTasks.length === 0) {
      return null;
    }
    
    // Filter tasks based on action type
    const actionFilters = {
      update: (task) => task.status === 'todo' || task.status === 'in_progress',
      complete: (task) => task.status === 'in_progress' || task.status === 'todo',
      block: (task) => task.status === 'todo' || task.status === 'in_progress'
    };
    
    const filter = actionFilters[actionType];
    if (!filter) {
      return relevantTasks[0];
    }
    
    const filteredTasks = relevantTasks.filter(filter);
    return filteredTasks.length > 0 ? filteredTasks[0] : null;
  }

  /**
   * Generate a unique task ID
   * @returns {string} Unique task ID
   */
  generateTaskId() {
    return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate a task serial number
   * @returns {Promise<string>} Task serial number
   */
  async generateTaskSerial() {
    // Get all tasks to find the next serial number
    const tasks = await this.taskStorage.listTasks();
    const serials = tasks
      .map(task => task.serial)
      .filter(serial => serial && serial.startsWith('TASK-'))
      .map(serial => parseInt(serial.split('-')[1]))
      .filter(num => !isNaN(num));
    
    const nextNumber = serials.length > 0 ? Math.max(...serials) + 1 : 1;
    return `TASK-${nextNumber.toString().padStart(5, '0')}`;
  }

  /**
   * Merge task tags from memory and extracted data
   * @param {Array} memoryTags - Tags from memory
   * @param {Array} extractedTags - Tags from extracted data
   * @returns {Array} Merged and deduplicated tags
   */
  mergeTaskTags(memoryTags, extractedTags) {
    const memoryTagsArray = Array.isArray(memoryTags) ? memoryTags : [];
    const extractedTagsArray = Array.isArray(extractedTags) ? extractedTags : [];
    const allTags = [...memoryTagsArray, ...extractedTagsArray];
    return [...new Set(allTags)].filter(tag => tag && tag.length > 0);
  }

  /**
   * Check if action should be executed based on confidence and safety rules
   * @param {Object} action - Action object
   * @param {Object} memory - Memory object
   * @param {Object} config - Configuration object
   * @returns {boolean} True if action should be executed
   */
  shouldExecuteAction(action, memory, config = {}) {
    const minConfidence = config.minConfidence || 0.5;
    const autoExecuteThreshold = config.autoExecuteThreshold || 0.8;
    
    // Check minimum confidence
    if (action.confidence < minConfidence) {
      console.error(`[TaskActionExecutor] Action confidence ${action.confidence} below threshold ${minConfidence}`);
      return false;
    }
    
    // Check for destructive actions
    if (action.action === 'delete' || action.action === 'archive') {
      console.error(`[TaskActionExecutor] Destructive action ${action.action} not allowed`);
      return false;
    }
    
    // Check for high-confidence auto-execution
    if (action.confidence >= autoExecuteThreshold) {
      return true;
    }
    
    // For medium confidence, check additional safety rules
    if (action.action === 'create' && memory.content.length < 20) {
      console.error(`[TaskActionExecutor] Memory too short for task creation`);
      return false;
    }
    
    return true;
  }
}

export { TaskActionExecutor };