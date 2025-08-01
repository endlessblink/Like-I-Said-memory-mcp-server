import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { TaskFormat } from './task-format.js';
import { TaskMemoryLinker } from './task-memory-linker.js';
import { TaskNameGenerator } from './task-name-generator.js';
import { TaskIdValidator } from './task-id-validator.js';

export class TaskStorage {
  constructor(baseDir = null, memoryStorage = null) {
    this.baseDir = baseDir || process.env.TASK_DIR || 'tasks';
    this.memoryStorage = memoryStorage;
    this.taskIndex = new Map(); // In-memory index for quick lookups
    this.taskMemoryLinker = memoryStorage ? new TaskMemoryLinker(memoryStorage, this) : null;
    this.ensureDirectories();
    this.loadTaskIndex();
  }

  ensureDirectories() {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  /**
   * Ensure project directory exists and return project file path
   */
  getProjectFilePath(projectName) {
    const projectDir = path.join(this.baseDir, projectName || 'default');
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }
    return path.join(projectDir, 'tasks.md');
  }

  /**
   * Add or update task in project file
   */
  addTaskToProject(projectName, task) {
    const filePath = this.getProjectFilePath(projectName);
    
    if (!fs.existsSync(filePath)) {
      // Create new file with project header
      const projectHeader = `---\nproject: ${projectName}\ntags: []\nupdated: '${new Date().toISOString()}'\nmanual_memories: []\nmemory_connections: []\n---\n# ${projectName} Tasks\n\n`;
      fs.writeFileSync(filePath, projectHeader);
    }
    
    // Read existing content
    const content = fs.readFileSync(filePath, 'utf8');
    const existingTasks = TaskFormat.parseMultiple(content);
    
    // Check if task already exists
    const existingIndex = existingTasks.findIndex(t => t.id === task.id);
    
    if (existingIndex >= 0) {
      // Update existing task
      existingTasks[existingIndex] = task;
    } else {
      // Add new task
      existingTasks.push(task);
    }
    
    // Rebuild file content
    const projectHeader = content.match(/^---\n[\s\S]*?\n---\n.*$/m)?.[0] || 
      `---\nproject: ${projectName}\ntags: []\nupdated: '${new Date().toISOString()}'\nmanual_memories: []\nmemory_connections: []\n---\n# ${projectName} Tasks\n\n`;
    
    let newContent = projectHeader;
    for (const t of existingTasks) {
      newContent += '\n\n' + TaskFormat.toMarkdown(t);
    }
    
    // Write the updated content
    fs.writeFileSync(filePath, newContent);
    
    return task;
  }

  /**
   * Load all tasks from all project directories on disk
   */
  loadAllTasksFromDisk() {
    const tasks = [];
    
    if (process.env.DEBUG_MCP) console.error(`DEBUG: loadAllTasksFromDisk called, baseDir: ${this.baseDir}`);
    
    if (!fs.existsSync(this.baseDir)) {
      if (process.env.DEBUG_MCP) console.error(`DEBUG: baseDir does not exist: ${this.baseDir}`);
      return tasks;
    }
    
    const projects = fs.readdirSync(this.baseDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    if (process.env.DEBUG_MCP) console.error(`DEBUG: Found ${projects.length} project directories:`, projects);
    
    for (const project of projects) {
      const projectPath = path.join(this.baseDir, project, 'tasks.md');
      if (process.env.DEBUG_MCP) console.error(`DEBUG: Checking project path: ${projectPath}`);
      
      if (fs.existsSync(projectPath)) {
        if (process.env.DEBUG_MCP) console.error(`DEBUG: Found tasks.md in project: ${project}`);
        try {
          const content = fs.readFileSync(projectPath, 'utf8');
          if (process.env.DEBUG_MCP) console.error(`DEBUG: File content length: ${content.length}`);
          const projectTasks = TaskFormat.parseMultiple(content);
          if (process.env.DEBUG_MCP) console.error(`DEBUG: Parsed ${projectTasks.length} tasks from ${project}`);
          tasks.push(...projectTasks);
        } catch (error) {
          console.error(`Error parsing tasks from ${projectPath}:`, error);
        }
      } else {
        if (process.env.DEBUG_MCP) console.error(`DEBUG: No tasks.md found in project: ${project}`);
      }
    }
    
    if (process.env.DEBUG_MCP) console.error(`DEBUG: Total tasks loaded: ${tasks.length}`);
    return tasks;
  }

  /**
   * Update task in project file
   */
  updateTaskInProject(projectName, taskId, updates) {
    const filePath = this.getProjectFilePath(projectName);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Project file not found: ${filePath}`);
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const tasks = TaskFormat.parseMultiple(content);
    
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      throw new Error(`Task ${taskId} not found in project ${projectName}`);
    }
    
    // Update the task with proper timestamp
    tasks[taskIndex] = { 
      ...tasks[taskIndex], 
      ...updates,
      updated: new Date().toISOString()
    };
    
    // Preserve project header and rebuild file
    const projectHeader = content.match(/^---\n[\s\S]*?\n---\n.*$/m)?.[0] || 
      `---\nproject: ${projectName}\ntags: []\nupdated: '${new Date().toISOString()}'\nmanual_memories: []\nmemory_connections: []\n---\n# ${projectName} Tasks\n\n`;
    
    let newContent = projectHeader;
    for (const task of tasks) {
      newContent += '\n\n' + TaskFormat.toMarkdown(task);
    }
    
    fs.writeFileSync(filePath, newContent);
    
    return tasks[taskIndex];
  }

  /**
   * Delete task from project file
   */
  deleteTaskFromProject(projectName, taskId) {
    const filePath = this.getProjectFilePath(projectName);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Project file not found: ${filePath}`);
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const tasks = TaskFormat.parseMultiple(content);
    
    const filteredTasks = tasks.filter(t => t.id !== taskId);
    
    if (filteredTasks.length === tasks.length) {
      throw new Error(`Task ${taskId} not found in project ${projectName}`);
    }
    
    // Preserve project header and rebuild file
    const projectHeader = content.match(/^---\n[\s\S]*?\n---\n.*$/m)?.[0] || 
      `---\nproject: ${projectName}\ntags: []\nupdated: '${new Date().toISOString()}'\nmanual_memories: []\nmemory_connections: []\n---\n# ${projectName} Tasks\n\n`;
    
    let newContent = projectHeader;
    for (const task of filteredTasks) {
      newContent += '\n\n' + TaskFormat.toMarkdown(task);
    }
    
    fs.writeFileSync(filePath, newContent);
  }

  generateTaskId() {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0];
    const random = crypto.randomBytes(4).toString('hex');
    return `task-${dateStr}-${random}`;
  }

  generateSerial(project, category) {
    // Use enhanced serial generation from TaskNameGenerator
    const count = this.getProjectTaskCount(project);
    return TaskNameGenerator.generateSerial(project, count, category);
  }

  getProjectTaskCount(project) {
    let count = 0;
    for (const [_, task] of this.taskIndex) {
      if (task.project === project) count++;
    }
    return count;
  }

  /**
   * Load task index from project-based markdown files
   */
  loadTaskIndex() {
    if (process.env.DEBUG_MCP) console.error('📋 Loading tasks from project-based markdown files...');
    this.taskIndex.clear();
    
    try {
      const allTasks = this.loadAllTasksFromDisk();
      for (const task of allTasks) {
        this.taskIndex.set(task.id, task);
      }
      if (process.env.DEBUG_MCP) console.error(`✅ Loaded ${allTasks.length} tasks from project-based structure`);
    } catch (error) {
      console.error('❌ Error loading tasks:', error);
      // Fallback to old loading method
      this.loadTaskIndexLegacy();
    }
  }

  /**
   * Legacy loading method for backward compatibility
   */
  loadTaskIndexLegacy() {
    if (process.env.DEBUG_MCP) console.error('📋 Falling back to legacy task loading...');
    this.taskIndex.clear();
    
    try {
      const tasks = TaskFormat.loadAllTasks();
      
      for (const task of tasks) {
        this.taskIndex.set(task.id, task);
      }
      
      if (process.env.DEBUG_MCP) console.error(`✅ Loaded ${tasks.length} tasks from markdown files`);
    } catch (error) {
      console.error('❌ Error loading task index:', error);
    }
  }

  /**
   * Save task to markdown file and update index
   */
  async saveTask(task) {
    // Safeguard: Validate against mock data patterns
    if (!task.title || typeof task.title !== 'string' || task.title.trim().length === 0) {
      throw new Error('Invalid task: Title is required and must be a non-empty string');
    }
    
    // Safeguard: Reject mock data indicators (more specific patterns to avoid false positives)
    const mockDataPatterns = [
      /mock-\d+/i,
      /^test\s+task$/i,               // Only match exact "test task"
      /\btest\s+task\b/i,             // Match "test task" as whole words
      /sample.*task/i,
      /lorem ipsum/i,
      /fake.*task/i,
      /placeholder.*task/i,           // More specific placeholder pattern
      /dummy.*task/i,                 // Add dummy task pattern
      /todo.*test.*task/i             // More specific todo test pattern
    ];
    
    const containsMockPattern = mockDataPatterns.some(pattern => 
      pattern.test(task.title) || 
      (typeof task.description === 'string' && pattern.test(task.description)) ||
      (typeof task.project === 'string' && pattern.test(task.project)) ||
      (Array.isArray(task.tags) && task.tags.some(tag => pattern.test(tag)))
    );
    
    if (containsMockPattern) {
      throw new Error('Invalid task: Mock data patterns detected. Only real tasks are allowed.');
    }
    
    // Safeguard: Validate real task requirements
    if (task.title.trim().length < 5) {
      throw new Error('Invalid task: Title must be at least 5 characters long for real tasks');
    }
    
    // Ensure required fields
    task.id = task.id || this.generateTaskId();
    task.created = task.created || new Date().toISOString();
    task.updated = new Date().toISOString();
    task.status = task.status || 'todo';
    task.priority = task.priority || 'medium';
    task.project = task.project || 'default';
    task.tags = task.tags || [];
    task.manual_memories = task.manual_memories || [];
    task.memory_connections = task.memory_connections || [];
    
    // Generate intelligent task name only if title needs enhancement
    if (!task.title || task.title.length < 10 || TaskNameGenerator.isGenericTitle(task.title)) {
      task.title = TaskNameGenerator.generateTaskName(task);
    } else {
      // Just enhance the existing title
      task.title = TaskNameGenerator.enhanceTitle(task.title, task.category, task.priority);
    }
    
    // Generate enhanced serial after name generation (category might be detected)
    task.serial = task.serial || this.generateSerial(task.project, task.category);

    // Auto-link memories using advanced TaskMemoryLinker if available
    if (this.taskMemoryLinker && (!task.memory_connections || task.memory_connections.length === 0)) {
      try {
        task.memory_connections = await this.taskMemoryLinker.autoLinkMemories(task);
        if (task.memory_connections.length > 0) {
          if (process.env.DEBUG_MCP) console.error(`🧠 Linked ${task.memory_connections.length} memories to "${task.title.substring(0, 40)}..."`);
        }
      } catch (error) {
        console.error(`❌ Error linking memories for task ${task.id}:`, error.message);
        // Fallback to simple search
        task.memory_connections = await this.findMemoryConnections(task);
      }
    }

    // Save to project-based structure
    const savedTask = this.addTaskToProject(task.project, task);
    
    // Update in-memory index
    this.taskIndex.set(savedTask.id, savedTask);
    
    if (process.env.DEBUG_MCP) console.error(`✅ Saved task: ${savedTask.id} → ${savedTask.project} project`);
    return savedTask;
  }

  /**
   * Get task by ID with flexible format support
   */
  getTask(id) {
    // Direct lookup first
    let task = this.taskIndex.get(id);
    if (task) return task;

    // Try ID validation and normalization
    const validation = TaskIdValidator.validate(id, Array.from(this.taskIndex.keys()));
    
    if (validation.valid && validation.wasConverted) {
      // Try with normalized ID
      task = this.taskIndex.get(validation.normalized);
      if (task) return task;
    }

    // No task found
    return null;
  }

  /**
   * Get task by ID with detailed error message
   */
  getTaskWithError(id) {
    const task = this.getTask(id);
    if (task) return { task, error: null };

    // Generate helpful error message
    const existingIds = Array.from(this.taskIndex.keys());
    const error = TaskIdValidator.getErrorMessage(id, existingIds);
    
    return { task: null, error };
  }

  /**
   * Get all tasks
   */
  getAllTasks() {
    if (process.env.DEBUG_MCP) console.error(`DEBUG: getAllTasks (index) called, taskIndex size: ${this.taskIndex.size}`);
    const tasks = Array.from(this.taskIndex.values());
    if (process.env.DEBUG_MCP) console.error(`DEBUG: Returning ${tasks.length} tasks from index`);
    return tasks;
  }

  /**
   * Get tasks by project
   */
  getTasksByProject(project) {
    return this.getAllTasks().filter(task => task.project === project);
  }

  /**
   * Get tasks by status
   */
  getTasksByStatus(status) {
    return this.getAllTasks().filter(task => task.status === status);
  }

  /**
   * List tasks with filters
   */
  async listTasks(filters = {}) {
    let tasks = this.getAllTasks();
    
    // Apply filters
    if (filters.project) {
      tasks = tasks.filter(task => task.project === filters.project);
    }
    if (filters.status) {
      tasks = tasks.filter(task => task.status === filters.status);
    }
    if (filters.category) {
      tasks = tasks.filter(task => task.category === filters.category);
    }
    if (filters.has_memory) {
      tasks = tasks.filter(task => 
        task.memory_connections && task.memory_connections.some(conn => 
          conn.memory_id === filters.has_memory
        )
      );
    }
    
    // Apply limit
    if (filters.limit) {
      tasks = tasks.slice(0, filters.limit);
    }
    
    return tasks;
  }

  /**
   * Update task
   */
  async updateTask(id, updates) {
    const { task, error } = this.getTaskWithError(id);
    if (!task) {
      throw new Error(error || `Task not found: ${id}`);
    }

    // Use project manager to update task
    const updatedTask = this.updateTaskInProject(task.project, id, updates);
    
    // Update in-memory index
    this.taskIndex.set(id, updatedTask);
    
    if (process.env.DEBUG_MCP) console.error(`✅ Updated task: ${id} in project ${updatedTask.project}`);
    return updatedTask;
  }

  /**
   * Delete task
   */
  deleteTask(id) {
    const { task, error } = this.getTaskWithError(id);
    if (!task) {
      throw new Error(error || `Task not found: ${id}`);
    }

    // Use project manager to delete task
    this.deleteTaskFromProject(task.project, id);

    // Remove from in-memory index
    this.taskIndex.delete(id);
    
    if (process.env.DEBUG_MCP) console.error(`✅ Deleted task: ${id} from project ${task.project}`);
    return true;
  }

  /**
   * Find memory connections for a task (simple fallback method)
   */
  async findMemoryConnections(task) {
    if (!this.memoryStorage) return [];

    const connections = [];
    const searchTerms = [
      task.title,
      task.description,
      task.project,
      ...task.tags
    ].filter(Boolean);

    try {
      // Search for relevant memories
      const memories = await this.memoryStorage.searchMemories(searchTerms.join(' '));
      
      for (const memory of memories.slice(0, 5)) { // Limit to top 5 connections
        connections.push({
          memory_id: memory.id,
          memory_serial: memory.serial || `MEM-${memory.id.substring(0, 6)}`,
          connection_type: 'research',
          relevance: 0.8, // Default relevance
          matched_terms: searchTerms,
          created: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error finding memory connections:', error);
    }

    return connections;
  }

  /**
   * Add memory connection to task
   */
  async addMemoryConnection(taskId, memoryId, connectionType = 'research') {
    const { task, error } = this.getTaskWithError(taskId);
    if (!task) {
      throw new Error(error || `Task not found: ${taskId}`);
    }

    // Check if connection already exists
    const existingConnection = task.memory_connections.find(conn => conn.memory_id === memoryId);
    if (existingConnection) {
      return task;
    }

    // Add new connection
    const connection = {
      memory_id: memoryId,
      memory_serial: `MEM-${memoryId.substring(0, 6)}`,
      connection_type: connectionType,
      relevance: 0.9,
      matched_terms: [task.title, task.project],
      created: new Date().toISOString()
    };

    task.memory_connections.push(connection);
    
    // Update task
    return await this.updateTask(taskId, { memory_connections: task.memory_connections });
  }

  /**
   * Remove memory connection from task
   */
  async removeMemoryConnection(taskId, memoryId) {
    const { task, error } = this.getTaskWithError(taskId);
    if (!task) {
      throw new Error(error || `Task not found: ${taskId}`);
    }

    // Remove connection
    task.memory_connections = task.memory_connections.filter(conn => conn.memory_id !== memoryId);
    
    // Update task
    return await this.updateTask(taskId, { memory_connections: task.memory_connections });
  }

  /**
   * Get task statistics
   */
  getTaskStats() {
    const allTasks = this.getAllTasks();
    const stats = {
      total: allTasks.length,
      by_status: {},
      by_project: {},
      by_priority: {}
    };

    for (const task of allTasks) {
      // Count by status
      stats.by_status[task.status] = (stats.by_status[task.status] || 0) + 1;
      
      // Count by project
      stats.by_project[task.project] = (stats.by_project[task.project] || 0) + 1;
      
      // Count by priority
      stats.by_priority[task.priority] = (stats.by_priority[task.priority] || 0) + 1;
    }

    return stats;
  }

  /**
   * Search tasks
   */
  searchTasks(query) {
    const results = [];
    const searchTerms = query.toLowerCase().split(' ');

    for (const task of this.getAllTasks()) {
      const searchableText = [
        task.title,
        task.description,
        task.project,
        ...(Array.isArray(task.tags) ? task.tags : [])
      ].join(' ').toLowerCase();

      const matches = searchTerms.filter(term => searchableText.includes(term));
      
      if (matches.length > 0) {
        results.push({
          ...task,
          relevance: matches.length / searchTerms.length
        });
      }
    }

    return results.sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * Reload tasks from filesystem
   */
  reload() {
    this.loadTaskIndex();
  }
}