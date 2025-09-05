/**
 * Minimal Task Storage Service
 * Lightweight task storage without heavy dependencies
 */

import fs from 'fs';
import path from 'path';

export class MinimalTaskStorage {
  constructor(baseDir = 'tasks') {
    this.baseDir = baseDir;
    this.ensureDirectories();
  }

  ensureDirectories() {
    try {
      if (!fs.existsSync(this.baseDir)) {
        fs.mkdirSync(this.baseDir, { recursive: true });
      }
    } catch (error) {
      console.error(`Directory creation issue: ${error.message}`);
    }
  }

  generateTaskId() {
    const serial = Math.floor(Math.random() * 90000) + 10000;
    return `TASK-${serial}`;
  }

  async createTask(data) {
    const task = {
      id: this.generateTaskId(),
      title: data.title,
      description: data.description || '',
      status: data.status || 'todo',
      priority: data.priority || 'medium',
      project: data.project || 'default',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      tags: data.tags || [],
      parent_id: data.parent_id || null,
      subtasks: data.subtasks || [],
      memory_connections: data.memory_connections || [],
      ...data
    };

    await this.saveTasksForProject(task.project, task);
    return task;
  }

  async saveTasksForProject(project, newTask) {
    const projectDir = path.join(this.baseDir, project);
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    const tasksFile = path.join(projectDir, 'tasks.json');
    let tasks = [];
    
    if (fs.existsSync(tasksFile)) {
      try {
        const content = fs.readFileSync(tasksFile, 'utf8');
        tasks = JSON.parse(content);
        if (!Array.isArray(tasks)) {
          tasks = [];
        }
      } catch (error) {
        console.error(`Error reading tasks file: ${error.message}`);
        tasks = [];
      }
    }

    // Update or add task
    const existingIndex = tasks.findIndex(t => t.id === newTask.id);
    if (existingIndex >= 0) {
      tasks[existingIndex] = newTask;
    } else {
      tasks.push(newTask);
    }

    fs.writeFileSync(tasksFile, JSON.stringify(tasks, null, 2), 'utf8');
  }

  async updateTask(id, updates) {
    const task = await this.getTask(id);
    if (!task) return null;

    const updatedTask = {
      ...task,
      ...updates,
      id: task.id, // Ensure ID doesn't change
      created: task.created, // Preserve creation date
      updated: new Date().toISOString()
    };

    // Get all tasks for the project
    const projectTasks = await this.getProjectTasks(updatedTask.project);
    const taskIndex = projectTasks.findIndex(t => t.id === id);
    
    if (taskIndex >= 0) {
      projectTasks[taskIndex] = updatedTask;
      
      // Save back to file
      const projectDir = path.join(this.baseDir, updatedTask.project);
      const tasksFile = path.join(projectDir, 'tasks.json');
      fs.writeFileSync(tasksFile, JSON.stringify(projectTasks, null, 2), 'utf8');
    }

    return updatedTask;
  }

  async getProjectTasks(project) {
    const tasksFile = path.join(this.baseDir, project, 'tasks.json');
    if (!fs.existsSync(tasksFile)) {
      return [];
    }

    try {
      const content = fs.readFileSync(tasksFile, 'utf8');
      const tasks = JSON.parse(content);
      return Array.isArray(tasks) ? tasks : [];
    } catch (error) {
      console.error(`Error reading project tasks: ${error.message}`);
      return [];
    }
  }

  async getTask(id) {
    const allTasks = await this.listTasks();
    return allTasks.find(t => t.id === id);
  }

  async listTasks(filters = {}) {
    const allTasks = [];
    
    const scanDir = (dir) => {
      if (!fs.existsSync(dir)) return;
      
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const tasksFile = path.join(dir, entry.name, 'tasks.json');
          if (fs.existsSync(tasksFile)) {
            try {
              const content = fs.readFileSync(tasksFile, 'utf8');
              const tasks = JSON.parse(content);
              if (Array.isArray(tasks)) {
                allTasks.push(...tasks);
              }
            } catch (error) {
              console.error(`Error reading ${tasksFile}: ${error.message}`);
            }
          }
        }
      }
    };

    scanDir(this.baseDir);
    
    // Apply filters
    return allTasks.filter(task => {
      if (filters.status && task.status !== filters.status) return false;
      if (filters.project && task.project !== filters.project) return false;
      if (filters.priority && task.priority !== filters.priority) return false;
      if (filters.parent_id !== undefined) {
        if (filters.parent_id === null && task.parent_id !== null) return false;
        if (filters.parent_id !== null && task.parent_id !== filters.parent_id) return false;
      }
      return true;
    }).sort((a, b) => {
      // Sort by creation date, newest first
      return new Date(b.created).getTime() - new Date(a.created).getTime();
    });
  }

  async deleteTask(id) {
    const task = await this.getTask(id);
    if (!task) return false;

    const projectTasks = await this.getProjectTasks(task.project);
    const filteredTasks = projectTasks.filter(t => t.id !== id);
    
    const projectDir = path.join(this.baseDir, task.project);
    const tasksFile = path.join(projectDir, 'tasks.json');
    
    fs.writeFileSync(tasksFile, JSON.stringify(filteredTasks, null, 2), 'utf8');
    return true;
  }

  async getTaskContext(id) {
    const task = await this.getTask(id);
    if (!task) return null;

    const context = {
      task,
      parent: null,
      subtasks: [],
      siblings: [],
      project_tasks: []
    };

    // Get parent task if exists
    if (task.parent_id) {
      context.parent = await this.getTask(task.parent_id);
    }

    // Get subtasks
    const allTasks = await this.listTasks();
    context.subtasks = allTasks.filter(t => t.parent_id === id);

    // Get siblings (same parent)
    if (task.parent_id) {
      context.siblings = allTasks.filter(
        t => t.parent_id === task.parent_id && t.id !== id
      );
    }

    // Get other tasks in same project
    context.project_tasks = allTasks.filter(
      t => t.project === task.project && t.id !== id
    ).slice(0, 10); // Limit to 10 for performance

    return context;
  }

  async generateDropoff() {
    const tasks = await this.listTasks();
    const tasksByStatus = {
      todo: [],
      in_progress: [],
      done: [],
      blocked: []
    };

    tasks.forEach(task => {
      const status = task.status || 'todo';
      if (tasksByStatus[status]) {
        tasksByStatus[status].push(task);
      }
    });

    const summary = {
      timestamp: new Date().toISOString(),
      total_tasks: tasks.length,
      by_status: {
        todo: tasksByStatus.todo.length,
        in_progress: tasksByStatus.in_progress.length,
        done: tasksByStatus.done.length,
        blocked: tasksByStatus.blocked.length
      },
      tasks: tasksByStatus
    };

    return summary;
  }
}