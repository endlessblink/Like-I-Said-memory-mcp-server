import fs from 'fs';
import path from 'path';
import { TaskFormat } from './task-format.js';

/**
 * Manages tasks organized by project in markdown files
 */
export class ProjectTaskManager {
  constructor(baseDir = null) {
    this.baseDir = baseDir || process.env.TASK_DIR || 'tasks';
    this.ensureDirectories();
  }

  ensureDirectories() {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  getProjectDir(project) {
    const projectName = project || 'default';
    const projectDir = path.join(this.baseDir, projectName);
    
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }
    
    return projectDir;
  }

  /**
   * Get all tasks from all projects
   */
  getAllTasks() {
    const tasks = [];
    
    try {
      const projects = fs.readdirSync(this.baseDir).filter(dir => {
        const dirPath = path.join(this.baseDir, dir);
        return fs.statSync(dirPath).isDirectory();
      });

      for (const project of projects) {
        const projectTasks = this.getProjectTasks(project);
        tasks.push(...projectTasks);
      }
    } catch (error) {
      console.error('Error getting all tasks:', error);
    }

    return tasks;
  }

  /**
   * Get tasks for a specific project
   */
  getProjectTasks(project) {
    const tasks = [];
    const projectDir = path.join(this.baseDir, project);
    
    if (!fs.existsSync(projectDir)) {
      return tasks;
    }

    try {
      // Check if it's using the new project-based format (tasks.md file)
      const tasksFile = path.join(projectDir, 'tasks.md');
      if (fs.existsSync(tasksFile)) {
        // Parse project-based tasks file
        const content = fs.readFileSync(tasksFile, 'utf-8');
        const projectTasks = this.parseProjectTasksFile(content, project);
        tasks.push(...projectTasks);
      } else {
        // Fallback to individual task files
        const files = fs.readdirSync(projectDir).filter(f => f.endsWith('.md'));
        for (const file of files) {
          try {
            const filePath = path.join(projectDir, file);
            const task = TaskFormat.parseTaskFile(filePath);
            if (task) {
              task.project = project;
              tasks.push(task);
            }
          } catch (error) {
            console.error(`Error parsing task file ${file}:`, error);
          }
        }
      }
    } catch (error) {
      console.error(`Error getting tasks for project ${project}:`, error);
    }

    return tasks;
  }

  /**
   * Parse project-based tasks.md file
   */
  parseProjectTasksFile(content, project) {
    const tasks = [];
    const lines = content.split('\n');
    let inTaskList = false;
    
    for (const line of lines) {
      if (line.startsWith('# ') && line.includes('Tasks')) {
        inTaskList = true;
        continue;
      }
      
      if (inTaskList && line.startsWith('- [')) {
        const task = this.parseTaskLine(line, project);
        if (task) {
          tasks.push(task);
        }
      }
    }
    
    return tasks;
  }

  /**
   * Parse a single task line from markdown
   */
  parseTaskLine(line, project) {
    try {
      // Parse format: - [ ] Title [PRIORITY] #tag1,tag2
      const statusMatch = line.match(/- \[([ x])\]/);
      const status = statusMatch && statusMatch[1] === 'x' ? 'done' : 'todo';
      
      const titlePart = line.substring(line.indexOf(']') + 1).trim();
      const priorityMatch = titlePart.match(/\[([A-Z]+)\]/);
      const priority = priorityMatch ? priorityMatch[1].toLowerCase() : 'medium';
      
      let title = titlePart;
      if (priorityMatch) {
        title = title.replace(priorityMatch[0], '').trim();
      }
      
      const tagMatch = title.match(/#([a-zA-Z0-9,_-]+)$/);
      const tags = tagMatch ? tagMatch[1].split(',') : [];
      if (tagMatch) {
        title = title.replace(tagMatch[0], '').trim();
      }
      
      return {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        title,
        status,
        priority,
        tags,
        project,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        memory_connections: []
      };
    } catch (error) {
      console.error('Error parsing task line:', line, error);
      return null;
    }
  }

  /**
   * Add task to project
   */
  addTaskToProject(project, task) {
    // For now, just return the task with project assigned
    task.project = project || 'default';
    task.id = task.id || Date.now().toString() + Math.random().toString(36).substr(2, 5);
    task.created = task.created || new Date().toISOString();
    task.updated = new Date().toISOString();
    
    return task;
  }

  /**
   * Update task in project
   */
  updateTaskInProject(project, taskId, updates) {
    // Simple implementation - return updated task
    const updatedTask = { 
      ...updates, 
      id: taskId, 
      project: project || 'default',
      updated: new Date().toISOString()
    };
    
    return updatedTask;
  }

  /**
   * Delete task from project
   */
  deleteTaskFromProject(project, taskId) {
    // Simple implementation - just return success
    console.error(`Deleting task ${taskId} from project ${project}`);
    return true;
  }
}