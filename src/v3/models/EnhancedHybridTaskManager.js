import { HybridTaskManager } from './HybridTaskManager.js';
import { sqliteManager } from '../../../lib/sqlite-manager.js';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

/**
 * Enhanced HybridTaskManager with richer task creation and management
 * Extends the base HybridTaskManager with additional fields and functionality
 */
export class EnhancedHybridTaskManager extends HybridTaskManager {
  constructor(tasksDir = null, options = {}) {
    super(tasksDir, options);
  }

  /**
   * Initialize with enhanced schema
   */
  async initialize() {
    await super.initialize();
    
    // Apply enhanced schema migration
    try {
      this.applyEnhancedSchema();
      console.log('[EnhancedHybridTaskManager] Enhanced schema applied');
    } catch (error) {
      console.error('[EnhancedHybridTaskManager] Schema enhancement failed:', error);
    }
    
    return true;
  }

  /**
   * Apply enhanced schema changes
   */
  applyEnhancedSchema() {
    const db = this.db.db;
    
    // Check if columns already exist before adding
    const tableInfo = db.prepare("PRAGMA table_info(tasks)").all();
    const existingColumns = new Set(tableInfo.map(col => col.name));
    
    const newColumns = [
      { name: 'due_date', type: 'DATETIME' },
      { name: 'estimated_hours', type: 'REAL DEFAULT 0' },
      { name: 'actual_hours', type: 'REAL DEFAULT 0' },
      { name: 'completion_percentage', type: 'INTEGER DEFAULT 0 CHECK(completion_percentage >= 0 AND completion_percentage <= 100)' },
      { name: 'assignee', type: 'TEXT' },
      { name: 'tags', type: 'TEXT' }
    ];
    
    for (const col of newColumns) {
      if (!existingColumns.has(col.name)) {
        db.prepare(`ALTER TABLE tasks ADD COLUMN ${col.name} ${col.type}`).run();
      }
    }
    
    // Create additional tables if they don't exist
    db.exec(`
      -- Task dependencies table
      CREATE TABLE IF NOT EXISTS task_dependencies (
        task_id TEXT NOT NULL,
        depends_on_task_id TEXT NOT NULL,
        dependency_type TEXT DEFAULT 'finish_to_start',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (task_id, depends_on_task_id),
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id) ON DELETE CASCADE
      );

      -- Task activity log
      CREATE TABLE IF NOT EXISTS task_activity (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id TEXT NOT NULL,
        action TEXT NOT NULL,
        action_data JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      );

      -- Subtask checklist items
      CREATE TABLE IF NOT EXISTS task_checklist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id TEXT NOT NULL,
        item_text TEXT NOT NULL,
        is_completed BOOLEAN DEFAULT FALSE,
        position INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      );

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
      CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee);
      CREATE INDEX IF NOT EXISTS idx_task_activity_task_id ON task_activity(task_id);
      CREATE INDEX IF NOT EXISTS idx_task_checklist_task_id ON task_checklist(task_id);
    `);
  }

  /**
   * Create an enhanced task with rich content
   */
  async createTask(taskData) {
    // Extract enhanced fields
    const {
      // Basic fields (handled by parent)
      title,
      description,
      level,
      parent_id,
      status,
      project,
      priority,
      
      // New enhanced fields
      due_date,
      estimated_hours,
      assignee,
      tags,
      dependencies,
      checklist,
      memory_connections,
      context,
      acceptance_criteria,
      technical_requirements,
      ...metadata
    } = taskData;
    
    // Create base task using parent method
    const baseTaskData = {
      title,
      description: description || '',
      level,
      parent_id,
      status,
      project,
      priority,
      metadata: {
        ...metadata,
        context,
        acceptance_criteria,
        technical_requirements,
        memory_connections
      }
    };
    
    const task = await super.createTask(baseTaskData);
    
    // Update with enhanced fields
    const updateStmt = this.db.db.prepare(`
      UPDATE tasks SET
        due_date = @due_date,
        estimated_hours = @estimated_hours,
        assignee = @assignee,
        tags = @tags,
        completion_percentage = @completion_percentage
      WHERE id = @id
    `);
    
    updateStmt.run({
      id: task.id,
      due_date: due_date || null,
      estimated_hours: estimated_hours || 0,
      assignee: assignee || null,
      tags: tags ? JSON.stringify(tags) : null,
      completion_percentage: this.calculateInitialCompletion(status)
    });
    
    // Add dependencies
    if (dependencies && dependencies.length > 0) {
      await this.addDependencies(task.id, dependencies);
    }
    
    // Add checklist items
    if (checklist && checklist.length > 0) {
      await this.addChecklistItems(task.id, checklist);
    }
    
    // Log activity
    await this.logActivity(task.id, 'created', {
      initial_status: status,
      with_dependencies: dependencies?.length || 0,
      with_checklist: checklist?.length || 0
    });
    
    // Save enhanced task to file
    await this.saveEnhancedTaskToFile({
      ...task,
      due_date,
      estimated_hours,
      assignee,
      tags,
      dependencies,
      checklist,
      memory_connections,
      context,
      acceptance_criteria,
      technical_requirements
    });
    
    return task;
  }

  /**
   * Calculate initial completion percentage based on status
   */
  calculateInitialCompletion(status) {
    switch (status) {
      case 'done': return 100;
      case 'in_progress': return 25;
      case 'blocked': return 0;
      default: return 0;
    }
  }

  /**
   * Add task dependencies
   */
  async addDependencies(taskId, dependencyIds) {
    const stmt = this.db.db.prepare(`
      INSERT INTO task_dependencies (task_id, depends_on_task_id)
      VALUES (?, ?)
    `);
    
    for (const depId of dependencyIds) {
      try {
        stmt.run(taskId, depId);
      } catch (error) {
        console.error(`Failed to add dependency ${depId} to task ${taskId}:`, error);
      }
    }
  }

  /**
   * Add checklist items
   */
  async addChecklistItems(taskId, items) {
    const stmt = this.db.db.prepare(`
      INSERT INTO task_checklist (task_id, item_text, is_completed, position)
      VALUES (?, ?, ?, ?)
    `);
    
    items.forEach((item, index) => {
      const isCompleted = typeof item === 'object' ? item.completed : false;
      const text = typeof item === 'object' ? item.text : item;
      
      stmt.run(taskId, text, isCompleted ? 1 : 0, index);
    });
  }

  /**
   * Log task activity
   */
  async logActivity(taskId, action, data = {}, createdBy = 'system') {
    const stmt = this.db.db.prepare(`
      INSERT INTO task_activity (task_id, action, action_data, created_by)
      VALUES (?, ?, ?, ?)
    `);
    
    stmt.run(taskId, action, JSON.stringify(data), createdBy);
  }

  /**
   * Save enhanced task to file with rich content
   */
  async saveEnhancedTaskToFile(task) {
    const projectDir = path.join(this.tasksDir, task.project);
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }
    
    const filepath = path.join(projectDir, `task-${task.id}.md`);
    
    // Prepare frontmatter with all fields
    const frontmatter = {
      id: task.id,
      title: task.title,
      level: task.level,
      parent_id: task.parent_id,
      path: task.path,
      path_order: task.path_order,
      status: task.status,
      project: task.project,
      priority: task.priority,
      created: task.created_at,
      updated: task.updated_at,
      due_date: task.due_date,
      estimated_hours: task.estimated_hours,
      assignee: task.assignee,
      tags: task.tags,
      dependencies: task.dependencies,
      memory_connections: task.memory_connections,
      metadata: task.metadata || {}
    };
    
    // Build rich content body
    let content = `---\n${yaml.dump(frontmatter)}---\n\n`;
    
    // Add main description
    if (task.description) {
      content += `${task.description}\n\n`;
    }
    
    // Add acceptance criteria
    if (task.acceptance_criteria && task.acceptance_criteria.length > 0) {
      content += `## Acceptance Criteria\n`;
      task.acceptance_criteria.forEach(criteria => {
        content += `- [ ] ${criteria}\n`;
      });
      content += '\n';
    }
    
    // Add technical requirements
    if (task.technical_requirements && task.technical_requirements.length > 0) {
      content += `## Technical Requirements\n`;
      task.technical_requirements.forEach(req => {
        content += `- ${req}\n`;
      });
      content += '\n';
    }
    
    // Add checklist
    if (task.checklist && task.checklist.length > 0) {
      content += `## Checklist\n`;
      task.checklist.forEach(item => {
        const checked = typeof item === 'object' && item.completed ? 'x' : ' ';
        const text = typeof item === 'object' ? item.text : item;
        content += `- [${checked}] ${text}\n`;
      });
      content += '\n';
    }
    
    // Add context section
    if (task.context) {
      content += `## Context\n`;
      if (task.context.related_files) {
        content += `### Related Files\n`;
        task.context.related_files.forEach(file => {
          content += `- \`${file}\`\n`;
        });
      }
      if (task.context.documentation) {
        content += `\n### Documentation\n- ${task.context.documentation}\n`;
      }
      content += '\n';
    }
    
    fs.writeFileSync(filepath, content, 'utf8');
  }

  /**
   * Update task with enhanced fields
   */
  async updateTask(taskId, updates) {
    const {
      estimated_hours,
      actual_hours,
      completion_percentage,
      assignee,
      tags,
      due_date,
      ...baseUpdates
    } = updates;
    
    // Update base fields
    if (Object.keys(baseUpdates).length > 0) {
      // TODO: Implement base update in parent class
    }
    
    // Update enhanced fields
    const enhancedFields = [];
    const params = { id: taskId };
    
    if (estimated_hours !== undefined) {
      enhancedFields.push('estimated_hours = @estimated_hours');
      params.estimated_hours = estimated_hours;
    }
    
    if (actual_hours !== undefined) {
      enhancedFields.push('actual_hours = @actual_hours');
      params.actual_hours = actual_hours;
    }
    
    if (completion_percentage !== undefined) {
      enhancedFields.push('completion_percentage = @completion_percentage');
      params.completion_percentage = completion_percentage;
    }
    
    if (assignee !== undefined) {
      enhancedFields.push('assignee = @assignee');
      params.assignee = assignee;
    }
    
    if (tags !== undefined) {
      enhancedFields.push('tags = @tags');
      params.tags = JSON.stringify(tags);
    }
    
    if (due_date !== undefined) {
      enhancedFields.push('due_date = @due_date');
      params.due_date = due_date;
    }
    
    if (enhancedFields.length > 0) {
      const stmt = this.db.db.prepare(`
        UPDATE tasks SET ${enhancedFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = @id
      `);
      stmt.run(params);
      
      // Log activity
      await this.logActivity(taskId, 'updated', updates);
    }
  }

  /**
   * Get enhanced task with all related data
   */
  async getEnhancedTask(taskId) {
    const task = await this.getTask(taskId);
    if (!task) return null;
    
    // Parse JSON fields
    if (task.tags) task.tags = JSON.parse(task.tags);
    if (task.metadata) task.metadata = JSON.parse(task.metadata);
    
    // Get dependencies
    task.dependencies = this.db.all(`
      SELECT depends_on_task_id as id, t.title
      FROM task_dependencies td
      JOIN tasks t ON td.depends_on_task_id = t.id
      WHERE td.task_id = ?
    `, [taskId]);
    
    // Get checklist
    task.checklist = this.db.all(`
      SELECT item_text as text, is_completed as completed
      FROM task_checklist
      WHERE task_id = ?
      ORDER BY position
    `, [taskId]);
    
    // Get recent activity
    task.recent_activity = this.db.all(`
      SELECT action, action_data, created_at, created_by
      FROM task_activity
      WHERE task_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `, [taskId]);
    
    // Get memory connections from metadata
    task.memory_connections = task.metadata?.memory_connections || [];
    
    return task;
  }

  /**
   * Search tasks with enhanced filters
   */
  async searchTasks(filters) {
    let query = 'SELECT * FROM tasks WHERE 1=1';
    const params = {};
    
    if (filters.assignee) {
      query += ' AND assignee = @assignee';
      params.assignee = filters.assignee;
    }
    
    if (filters.tags && filters.tags.length > 0) {
      // Simple tag search (contains any of the tags)
      query += ' AND (';
      const tagConditions = filters.tags.map((tag, i) => {
        params[`tag${i}`] = `%"${tag}"%`;
        return `tags LIKE @tag${i}`;
      });
      query += tagConditions.join(' OR ') + ')';
    }
    
    if (filters.dueBefore) {
      query += ' AND due_date <= @dueBefore';
      params.dueBefore = filters.dueBefore;
    }
    
    if (filters.minCompletion !== undefined) {
      query += ' AND completion_percentage >= @minCompletion';
      params.minCompletion = filters.minCompletion;
    }
    
    return this.db.all(query, params);
  }

  /**
   * Get task hierarchy information for display
   * @param {string} taskId - Task ID to get hierarchy for
   * @returns {Promise<Object|null>} Hierarchy information
   */
  async getTaskHierarchy(taskId) {
    try {
      const task = await this.getTask(taskId);
      if (!task) return null;

      const hierarchy = {};

      // Get the task itself
      hierarchy.task = {
        id: task.id,
        title: task.title,
        type: task.type || 'task',
        status: task.status,
        parent_id: task.parent_id
      };

      // If task has a parent, get the parent chain
      if (task.parent_id) {
        const parent = await this.getTask(task.parent_id);
        if (parent) {
          // Check if parent is a stage
          if (parent.type === 'stage') {
            hierarchy.stage = {
              id: parent.id,
              title: parent.title,
              type: parent.type,
              parent_id: parent.parent_id
            };
            
            // If stage has a parent, it should be a project
            if (parent.parent_id) {
              const project = await this.getTask(parent.parent_id);
              if (project && project.type === 'project') {
                hierarchy.project = {
                  id: project.id,
                  title: project.title,
                  type: project.type
                };
              }
            }
          } else if (parent.type === 'project') {
            // Task directly under project
            hierarchy.project = {
              id: parent.id,
              title: parent.title,
              type: parent.type
            };
          } else if (parent.type === 'task') {
            // This is a subtask, parent is another task
            hierarchy.parent_task = {
              id: parent.id,
              title: parent.title,
              type: parent.type,
              parent_id: parent.parent_id
            };
            
            // Try to get the grandparent (could be stage or project)
            if (parent.parent_id) {
              const grandparent = await this.getTask(parent.parent_id);
              if (grandparent) {
                if (grandparent.type === 'stage') {
                  hierarchy.stage = {
                    id: grandparent.id,
                    title: grandparent.title,
                    type: grandparent.type,
                    parent_id: grandparent.parent_id
                  };
                  
                  // Get project if stage has parent
                  if (grandparent.parent_id) {
                    const project = await this.getTask(grandparent.parent_id);
                    if (project && project.type === 'project') {
                      hierarchy.project = {
                        id: project.id,
                        title: project.title,
                        type: project.type
                      };
                    }
                  }
                } else if (grandparent.type === 'project') {
                  hierarchy.project = {
                    id: grandparent.id,
                    title: grandparent.title,
                    type: grandparent.type
                  };
                }
              }
            }
          }
        }
      }

      // Get subtasks if any
      const subtasks = await this.getTaskChildren(taskId);
      if (subtasks && subtasks.length > 0) {
        hierarchy.subtasks = subtasks.map(subtask => ({
          id: subtask.id,
          title: subtask.title,
          type: subtask.type || 'subtask',
          status: subtask.status
        }));
      }

      return hierarchy;
    } catch (error) {
      console.error('[EnhancedHybridTaskManager] Error getting task hierarchy:', error);
      return null;
    }
  }

  /**
   * Get children of a task
   * @param {string} parentId - Parent task ID
   * @returns {Promise<Array>} Array of child tasks
   */
  async getTaskChildren(parentId) {
    try {
      const children = this.db.all(`
        SELECT id, title, type, status, parent_id
        FROM tasks 
        WHERE parent_id = ? 
        ORDER BY created_at ASC
      `, [parentId]);

      return children || [];
    } catch (error) {
      console.error('[EnhancedHybridTaskManager] Error getting task children:', error);
      return [];
    }
  }

  /**
   * Find existing project by name or title
   * Safe, non-breaking search method for deduplication
   * @param {string} searchTerm - Project name or title to search for
   * @returns {Promise<Array>} Array of matching master-level tasks
   */
  async findExistingProject(searchTerm) {
    if (!searchTerm) return [];
    
    try {
      // Normalize the search term for project slug comparison
      const normalized = searchTerm.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      
      // Search for master-level tasks that match:
      // 1. Exact project slug match
      // 2. Case-insensitive title match
      // 3. Normalized title match (spaces/underscores to hyphens)
      const results = this.db.all(`
        SELECT * FROM tasks 
        WHERE level = 'master' 
        AND (
          project = ? OR 
          LOWER(title) = LOWER(?) OR
          LOWER(REPLACE(REPLACE(title, ' ', '-'), '_', '-')) = ?
        )
        ORDER BY created_at ASC
      `, [normalized, searchTerm, normalized]);
      
      return results || [];
    } catch (error) {
      console.error('[EnhancedHybridTaskManager] Error finding existing project:', error);
      return []; // Safe fallback - return empty array on error
    }
  }

  /**
   * Get all master-level projects
   * @returns {Promise<Array>} Array of all master-level tasks
   */
  async getAllProjects() {
    try {
      const projects = this.db.all(`
        SELECT * FROM tasks 
        WHERE level = 'master' 
        ORDER BY created_at DESC
      `);
      
      return projects || [];
    } catch (error) {
      console.error('[EnhancedHybridTaskManager] Error getting all projects:', error);
      return [];
    }
  }
}

// Export singleton instance
export const enhancedTaskManager = new EnhancedHybridTaskManager();