/**
 * V3 Hierarchical MCP Tools
 * User-friendly tools for 4-level task hierarchy management
 */

import { z } from 'zod';
import { EnhancedHybridTaskManager } from '../src/v3/models/EnhancedHybridTaskManager.js';

// Initialize the task manager
let taskManager = null;

export async function getTaskManager() {
  if (!taskManager) {
    taskManager = new EnhancedHybridTaskManager();
    await taskManager.initialize();
  }
  return taskManager;
}

// Tool definitions with user-friendly names
export const v3Tools = [
  {
    name: 'create_project',
    description: 'Start a new project or major initiative. This creates a top-level container for organizing related work.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Project name (e.g., "Website Redesign", "Q1 Marketing Campaign")'
        },
        description: {
          type: 'string',
          description: 'What this project aims to achieve'
        },
        due_date: {
          type: 'string',
          description: 'Target completion date (YYYY-MM-DD format)'
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'Project priority level'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Labels for categorizing the project'
        },
        check_existing: {
          type: 'boolean',
          description: 'Check for existing projects with similar names (default: false)',
          default: false
        },
        use_existing_if_found: {
          type: 'boolean',
          description: 'Use existing project instead of creating duplicate if found (default: false)',
          default: false
        }
      },
      required: ['title', 'description']
    }
  },
  
  {
    name: 'create_stage',
    description: 'Add a major stage or phase to an existing project. Stages represent significant milestones or phases of work.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'ID of the parent project'
        },
        title: {
          type: 'string',
          description: 'Stage name (e.g., "Stage 1: Research", "Stage 2: Implementation")'
        },
        description: {
          type: 'string',
          description: 'What will be accomplished in this stage'
        },
        estimated_hours: {
          type: 'number',
          description: 'Estimated hours to complete this stage'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Labels for this stage'
        }
      },
      required: ['project_id', 'title', 'description']
    }
  },
  
  {
    name: 'create_hierarchical_task',
    description: 'Create a task within the V3 hierarchy. Can be at any level based on parent.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Task title'
        },
        description: {
          type: 'string',
          description: 'Task details and requirements'
        },
        parent_id: {
          type: 'string',
          description: 'ID of parent stage or project (optional for standalone tasks)'
        },
        project: {
          type: 'string',
          description: 'Project context (required)'
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'urgent'],
          description: 'Task priority'
        },
        estimated_hours: {
          type: 'number',
          description: 'Estimated hours to complete'
        },
        assignee: {
          type: 'string',
          description: 'Who will work on this task'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Task labels'
        }
      },
      required: ['title', 'project']
    }
  },
  
  {
    name: 'create_subtask',
    description: 'Break down a task into smaller, manageable pieces. Subtasks are the most granular level of work.',
    inputSchema: {
      type: 'object',
      properties: {
        parent_task_id: {
          type: 'string',
          description: 'ID of the parent task'
        },
        title: {
          type: 'string',
          description: 'Subtask title'
        },
        description: {
          type: 'string',
          description: 'Specific work to be done'
        },
        estimated_hours: {
          type: 'number',
          description: 'Hours to complete this subtask'
        }
      },
      required: ['parent_task_id', 'title']
    }
  },
  
  {
    name: 'move_task',
    description: 'Reorganize tasks by moving them to a different parent. Automatically prevents invalid moves that would break the hierarchy.',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: {
          type: 'string',
          description: 'ID of the task to move'
        },
        new_parent_id: {
          type: 'string',
          description: 'ID of the new parent (project, stage, or task)'
        }
      },
      required: ['task_id', 'new_parent_id']
    }
  },
  
  {
    name: 'view_project',
    description: 'View the complete structure of a project including all stages, tasks, and subtasks with their current status.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID (UUID) or project name (e.g., "palladio-gen") to view. Optional - shows all projects if omitted'
        },
        include_completed: {
          type: 'boolean',
          description: 'Include completed tasks in the view',
          default: true
        },
        max_depth: {
          type: 'number',
          description: 'Maximum levels to display (1-4)',
          default: 4
        }
      }
    }
  },
  
  {
    name: 'find_project',
    description: 'Search for existing projects before creating new ones. Helps avoid duplicates by finding master-level tasks.',
    inputSchema: {
      type: 'object',
      properties: {
        search_term: {
          type: 'string',
          description: 'Project name or keyword to search for (e.g., "palladio", "website", "api")'
        },
        show_all: {
          type: 'boolean',
          description: 'Show all master projects if search_term is empty',
          default: false
        }
      }
    }
  },
  
  {
    name: 'update_hierarchical_task',
    description: 'Update a task in the V3 hierarchical system. Works with UUID-format task IDs.',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: {
          type: 'string',
          description: 'UUID of the task to update'
        },
        title: {
          type: 'string',
          description: 'New title for the task'
        },
        description: {
          type: 'string',
          description: 'New description for the task'
        },
        status: {
          type: 'string',
          enum: ['todo', 'in_progress', 'done', 'blocked'],
          description: 'New status for the task'
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'urgent'],
          description: 'New priority level'
        },
        due_date: {
          type: 'string',
          description: 'New due date (YYYY-MM-DD format)'
        },
        estimated_hours: {
          type: 'number',
          description: 'Estimated hours to complete'
        },
        actual_hours: {
          type: 'number',
          description: 'Actual hours spent'
        },
        completion_percentage: {
          type: 'number',
          description: 'Completion percentage (0-100)'
        },
        assignee: {
          type: 'string',
          description: 'Person assigned to the task'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Task tags/labels'
        }
      },
      required: ['task_id']
    }
  }
];

// Tool handlers
export async function handleV3Tool(toolName, args) {
  const manager = await getTaskManager();
  
  switch (toolName) {
    case 'create_project': {
      const projectSlug = args.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      
      // Only check for existing if explicitly requested (default: false for backward compatibility)
      if (args.check_existing || args.use_existing_if_found) {
        try {
          const existing = await manager.findExistingProject(args.title);
          
          if (existing && existing.length > 0) {
            const existingProject = existing[0];
            
            // If configured to use existing, return it instead of creating
            if (args.use_existing_if_found) {
              return {
                content: [{
                  type: 'text',
                  text: `✅ Using existing project: ${existingProject.title}\n` +
                        `ID: ${existingProject.id}\n` +
                        `Project: ${existingProject.project}\n` +
                        `Created: ${new Date(existingProject.created_at).toLocaleDateString()}\n` +
                        `Path: ${existingProject.path}\n\n` +
                        `ℹ️ Found existing project instead of creating duplicate`
                }],
                isError: false
              };
            }
            
            // Otherwise just warn but continue with creation
            console.warn(`Warning: Similar project exists: ${existingProject.title} (${existingProject.id})`);
          }
        } catch (error) {
          // If search fails, log but continue with normal creation
          console.error('Project search failed, continuing with creation:', error);
        }
      }
      
      // Continue with normal creation (existing behavior preserved)
      const task = await manager.createTask({
        title: args.title,
        description: args.description,
        level: 'master',
        project: projectSlug,
        priority: args.priority || 'medium',
        status: 'todo',
        due_date: args.due_date,
        tags: args.tags || [],
        metadata: {
          created_via: 'mcp_create_project'
        }
      });
      
      // Add warning if duplicate check was enabled and found something
      let warningText = '';
      if (args.check_existing) {
        try {
          const existing = await manager.findExistingProject(args.title);
          if (existing && existing.length > 0) {
            warningText = `\n\n⚠️ Note: Similar project(s) already exist:\n`;
            for (const proj of existing.slice(0, 3)) { // Show max 3 similar projects
              warningText += `  - ${proj.title} (${proj.project})\n`;
            }
            warningText += `\nConsider using view_project to see them or set use_existing_if_found: true`;
          }
        } catch (error) {
          // Ignore search errors in warning
        }
      }
      
      return {
        content: [{
          type: 'text',
          text: `✅ Created project: ${task.title}\n` +
                `ID: ${task.id}\n` +
                `Path: ${task.path}${warningText}`
        }],
        isError: false
      };
    }
    
    case 'create_stage': {
      // Verify parent is a project (master level)
      const parent = await manager.getTask(args.project_id);
      if (!parent) {
        return {
          content: [{
            type: 'text',
            text: `❌ Error: Project with ID ${args.project_id} not found`
          }],
          isError: true
        };
      }
      
      if (parent.level !== 'master') {
        return {
          content: [{
            type: 'text',
            text: `❌ Error: Parent must be a project (master level). The specified task is a ${parent.level}.`
          }],
          isError: true
        };
      }
      
      const task = await manager.createTask({
        title: args.title,
        description: args.description,
        level: 'epic',
        parent_id: args.project_id,
        project: parent.project,
        priority: parent.priority,
        status: 'todo',
        estimated_hours: args.estimated_hours,
        tags: args.tags || [],
        metadata: {
          created_via: 'mcp_create_stage'
        }
      });
      
      return {
        content: [{
          type: 'text',
          text: `✅ Created stage: ${task.title}\nID: ${task.id}\nPath: ${task.path}\nUnder project: ${parent.title}`
        }],
        isError: false
      };
    }
    
    case 'create_hierarchical_task': {
      let level = 'task';
      let parentProject = args.project;
      
      if (args.parent_id) {
        const parent = await manager.getTask(args.parent_id);
        if (!parent) {
          return {
            content: [{
              type: 'text',
              text: `❌ Error: Parent with ID ${args.parent_id} not found`
            }],
            isError: true
          };
        }
        
        // Determine level based on parent
        if (parent.level === 'master') level = 'epic';
        else if (parent.level === 'epic') level = 'task';
        else if (parent.level === 'task') level = 'subtask';
        else {
          return {
            content: [{
              type: 'text',
              text: `❌ Error: Cannot create task under a subtask. Maximum depth reached.`
            }],
            isError: true
          };
        }
        
        parentProject = parent.project;
      }
      
      const task = await manager.createTask({
        title: args.title,
        description: args.description || '',
        level: level,
        parent_id: args.parent_id,
        project: parentProject,
        priority: args.priority || 'medium',
        status: 'todo',
        estimated_hours: args.estimated_hours,
        assignee: args.assignee,
        tags: args.tags || [],
        metadata: {
          created_via: 'mcp_create_task'
        }
      });
      
      return {
        content: [{
          type: 'text',
          text: `✅ Created ${level}: ${task.title}\nID: ${task.id}\nPath: ${task.path}\nProject: ${task.project}`
        }],
        isError: false
      };
    }
    
    case 'create_subtask': {
      const parent = await manager.getTask(args.parent_task_id);
      if (!parent) {
        return {
          content: [{
            type: 'text',
            text: `❌ Error: Parent task with ID ${args.parent_task_id} not found`
          }],
          isError: true
        };
      }
      
      if (parent.level === 'subtask') {
        return {
          content: [{
            type: 'text',
            text: `❌ Error: Cannot create subtask under another subtask. Maximum depth reached.`
          }],
          isError: true
        };
      }
      
      const task = await manager.createTask({
        title: args.title,
        description: args.description || '',
        level: 'subtask',
        parent_id: args.parent_task_id,
        project: parent.project,
        priority: parent.priority,
        status: 'todo',
        estimated_hours: args.estimated_hours,
        metadata: {
          created_via: 'mcp_create_subtask'
        }
      });
      
      return {
        content: [{
          type: 'text',
          text: `✅ Created subtask: ${task.title}\nID: ${task.id}\nPath: ${task.path}\nUnder: ${parent.title}`
        }],
        isError: false
      };
    }
    
    case 'move_task': {
      try {
        const result = await manager.moveTask(args.task_id, args.new_parent_id);
        
        const task = await manager.getTask(args.task_id);
        const newParent = await manager.getTask(args.new_parent_id);
        
        return {
          content: [{
            type: 'text',
            text: `✅ Moved task: ${task.title}\nNew path: ${task.path}\nNew parent: ${newParent.title}`
          }],
          isError: false
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Error moving task: ${error.message}`
          }],
          isError: true
        };
      }
    }
    
    case 'find_project': {
      try {
        let projects = [];
        
        if (args.search_term) {
          // Search for specific projects
          projects = await manager.findExistingProject(args.search_term);
        } else if (args.show_all) {
          // Show all projects
          projects = await manager.getAllProjects();
        } else {
          return {
            content: [{
              type: 'text',
              text: '❌ Please provide a search_term or set show_all to true'
            }],
            isError: true
          };
        }
        
        if (projects.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `No projects found${args.search_term ? ` matching "${args.search_term}"` : ''}`
            }],
            isError: false
          };
        }
        
        // Format the results
        let output = `📁 Found ${projects.length} project${projects.length !== 1 ? 's' : ''}:\n\n`;
        
        for (const project of projects) {
          const status = project.status === 'done' ? '✅' : 
                        project.status === 'in_progress' ? '🔄' : 
                        project.status === 'blocked' ? '🚫' : '⭕';
          
          output += `${status} ${project.title}\n`;
          output += `   ID: ${project.id}\n`;
          output += `   Project: ${project.project}\n`;
          output += `   Created: ${new Date(project.created_at).toLocaleDateString()}\n`;
          output += `   Priority: ${project.priority || 'medium'}\n`;
          
          if (project.tags && Array.isArray(project.tags)) {
            const tags = JSON.parse(project.tags);
            if (tags.length > 0) {
              output += `   Tags: ${tags.join(', ')}\n`;
            }
          }
          
          output += '\n';
        }
        
        output += `💡 Tip: Use view_project with the ID or project name to see the full hierarchy`;
        
        return {
          content: [{
            type: 'text',
            text: output
          }],
          isError: false
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Error searching for projects: ${error.message}`
          }],
          isError: true
        };
      }
    }
    
    case 'view_project': {
      let tree;
      
      if (args.project_id) {
        // Try as direct ID first (existing behavior)
        let project = await manager.getTask(args.project_id);
        
        // If not found, try to find by project name
        if (!project) {
          // Look for master-level task with this project name
          const projectByName = manager.db.db.prepare(
            "SELECT * FROM tasks WHERE project = ? AND level = 'master' LIMIT 1"
          ).get(args.project_id);
          
          if (projectByName) {
            project = projectByName;
          } else {
            // No master found, check if any tasks exist with this project name
            const tasksInProject = manager.db.db.prepare(
              'SELECT * FROM tasks WHERE project = ? ORDER BY path'
            ).all(args.project_id);
            
            if (tasksInProject.length > 0) {
              // Show all tasks in this project context
              tree = buildProjectTree(tasksInProject);
              const output = formatTaskTree(tree, args.include_completed !== false, args.max_depth || 4);
              
              // Add a header to clarify this is a project context view
              const taskCount = tasksInProject.length;
              const header = `📂 Project Context: "${args.project_id}" (${taskCount} task${taskCount !== 1 ? 's' : ''})\n` +
                            `ℹ️  No master project container found. Showing all tasks with project="${args.project_id}"\n\n`;
              
              return {
                content: [{
                  type: 'text',
                  text: header + output
                }],
                isError: false
              };
            }
            
            // Nothing found at all
            return {
              content: [{
                type: 'text',
                text: `❌ Error: No project found with ID or name "${args.project_id}"\n\n` +
                      `Searched for:\n` +
                      `1. Task with ID: ${args.project_id}\n` +
                      `2. Master-level task with project name: ${args.project_id}\n` +
                      `3. Any tasks with project context: ${args.project_id}`
              }],
              isError: true
            };
          }
        }
        
        // Found a project (either by ID or by name), get its full tree
        if (project) {
          // Get all tasks under this project
          const allProjectTasks = manager.db.db.prepare(`
            SELECT * FROM tasks 
            WHERE project = ? OR path LIKE ?
            ORDER BY path
          `).all(project.project, project.path + '.%');
          
          // Build tree structure manually
          tree = [project];
          tree[0].children = buildChildrenForTask(project, allProjectTasks);
        } else {
          tree = [];
        }
      } else {
        // Get all projects
        tree = await manager.getTaskTree();
      }
      
      // Format the tree for display
      const output = formatTaskTree(tree, args.include_completed !== false, args.max_depth || 4);
      
      return {
        content: [{
          type: 'text',
          text: output
        }],
        isError: false
      };
    }
    
    case 'update_hierarchical_task': {
      try {
        const { task_id, ...updates } = args;
        
        // Get the existing task first
        const existingTask = await manager.getTask(task_id);
        if (!existingTask) {
          return {
            content: [{
              type: 'text',
              text: `❌ Task with ID ${task_id} not found in V3 system`
            }],
            isError: true
          };
        }
        
        // Prepare updates object for the manager
        const taskUpdates = {};
        
        // Base fields that are stored in SQLite directly
        if (updates.title !== undefined) taskUpdates.title = updates.title;
        if (updates.description !== undefined) taskUpdates.description = updates.description;
        if (updates.status !== undefined) taskUpdates.status = updates.status;
        if (updates.priority !== undefined) taskUpdates.priority = updates.priority;
        
        // Enhanced fields supported by EnhancedHybridTaskManager
        if (updates.due_date !== undefined) taskUpdates.due_date = updates.due_date;
        if (updates.estimated_hours !== undefined) taskUpdates.estimated_hours = updates.estimated_hours;
        if (updates.actual_hours !== undefined) taskUpdates.actual_hours = updates.actual_hours;
        if (updates.completion_percentage !== undefined) taskUpdates.completion_percentage = updates.completion_percentage;
        if (updates.assignee !== undefined) taskUpdates.assignee = updates.assignee;
        if (updates.tags !== undefined) taskUpdates.tags = updates.tags;
        
        // Update the task
        await manager.updateTask(task_id, taskUpdates);
        
        // Get the updated task to show the result
        const updatedTask = await manager.getTask(task_id);
        
        // Format status indicator
        const statusIndicator = updatedTask.status === 'done' ? '✅' : 
                              updatedTask.status === 'in_progress' ? '🔄' : 
                              updatedTask.status === 'blocked' ? '🚫' : '⭕';
        
        return {
          content: [{
            type: 'text',
            text: `✅ Task updated successfully!\n\n` +
                  `${statusIndicator} ${updatedTask.title}\n` +
                  `ID: ${updatedTask.id}\n` +
                  `Status: ${updatedTask.status}\n` +
                  `Priority: ${updatedTask.priority || 'medium'}\n` +
                  `Level: ${updatedTask.level}\n` +
                  `Project: ${updatedTask.project}\n` +
                  (updatedTask.due_date ? `Due Date: ${updatedTask.due_date}\n` : '') +
                  (updatedTask.estimated_hours ? `Estimated Hours: ${updatedTask.estimated_hours}\n` : '') +
                  (updatedTask.assignee ? `Assignee: ${updatedTask.assignee}\n` : '') +
                  (updatedTask.tags && updatedTask.tags.length > 0 ? `Tags: ${JSON.stringify(updatedTask.tags)}\n` : '') +
                  `\nUpdated: ${new Date(updatedTask.updated_at).toLocaleString()}`
          }],
          isError: false
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Error updating task: ${error.message}`
          }],
          isError: true
        };
      }
    }
    
    default:
      return {
        content: [{
          type: 'text',
          text: `❌ Unknown V3 tool: ${toolName}`
        }],
        isError: true
      };
  }
}

// Helper function to build children for a task
function buildChildrenForTask(parent, allTasks) {
  const children = allTasks.filter(task => task.parent_id === parent.id);
  return children.map(child => ({
    ...child,
    children: buildChildrenForTask(child, allTasks)
  }));
}

// Helper function to build a tree from a flat list of tasks
function buildProjectTree(tasks) {
  // Create a map for quick lookup
  const taskMap = new Map();
  tasks.forEach(task => {
    taskMap.set(task.id, { ...task, children: [] });
  });
  
  // Build the tree structure
  const roots = [];
  
  for (const task of taskMap.values()) {
    if (task.parent_id && taskMap.has(task.parent_id)) {
      // Add as child to parent
      taskMap.get(task.parent_id).children.push(task);
    } else if (!task.parent_id) {
      // No parent, add as root
      roots.push(task);
    } else {
      // Parent not in this set, treat as root
      roots.push(task);
    }
  }
  
  // Sort roots by path for consistent ordering
  roots.sort((a, b) => (a.path || '').localeCompare(b.path || ''));
  
  return roots;
}

// Helper function to format task tree
function formatTaskTree(nodes, includeCompleted = true, maxDepth = 4, currentDepth = 0) {
  if (currentDepth >= maxDepth) return '';
  
  let output = '';
  const indent = '  '.repeat(currentDepth);
  
  for (const node of nodes) {
    // Skip completed tasks if not included
    if (!includeCompleted && node.status === 'done') continue;
    
    // Format node
    const status = node.status === 'done' ? '✅' : 
                   node.status === 'in_progress' ? '🔄' : 
                   node.status === 'blocked' ? '🚫' : '⭕';
    
    const hours = node.estimated_hours ? ` [${node.estimated_hours}h]` : '';
    const completion = node.completion_percentage ? ` (${node.completion_percentage}%)` : '';
    
    const levelIndicator = 
      node.level === 'master' ? '📁 PROJECT' :
      node.level === 'epic' ? '📂 STAGE' :
      node.level === 'task' ? '📄 TASK' :
      '📝 SUBTASK';
    
    output += `${indent}${status} ${levelIndicator}: ${node.title}${hours}${completion}\n`;
    output += `${indent}   ID: ${node.id} | Path: ${node.path}\n`;
    
    // Add children
    if (node.children && node.children.length > 0) {
      output += formatTaskTree(node.children, includeCompleted, maxDepth, currentDepth + 1);
    }
  }
  
  return output;
}

// Export individual components for testing
export { getTaskManager, formatTaskTree };