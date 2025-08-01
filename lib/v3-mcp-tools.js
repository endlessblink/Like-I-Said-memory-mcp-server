/**
 * V3 Hierarchical MCP Tools
 * User-friendly tools for 4-level task hierarchy management
 */

import { z } from 'zod';
import { EnhancedHybridTaskManager } from '../src/v3/models/EnhancedHybridTaskManager.js';

// Initialize the task manager
let taskManager = null;

async function getTaskManager() {
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
          description: 'Project ID to view (optional - shows all projects if omitted)'
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
  }
];

// Tool handlers
export async function handleV3Tool(toolName, args) {
  const manager = await getTaskManager();
  
  switch (toolName) {
    case 'create_project': {
      const task = await manager.createTask({
        title: args.title,
        description: args.description,
        level: 'master',
        project: args.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        priority: args.priority || 'medium',
        status: 'todo',
        due_date: args.due_date,
        tags: args.tags || [],
        metadata: {
          created_via: 'mcp_create_project'
        }
      });
      
      return {
        content: [{
          type: 'text',
          text: `✅ Created project: ${task.title}\nID: ${task.id}\nPath: ${task.path}`
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
    
    case 'view_project': {
      let tree;
      
      if (args.project_id) {
        // Get specific project tree
        const project = await manager.getTask(args.project_id);
        if (!project) {
          return {
            content: [{
              type: 'text',
              text: `❌ Error: Project with ID ${args.project_id} not found`
            }],
            isError: true
          };
        }
        
        // Get the project and its children
        const projectWithChildren = await manager.getTask(args.project_id);
        if (projectWithChildren) {
          // Get all tasks under this project
          const allProjectTasks = manager.db.db.prepare(`
            SELECT * FROM tasks 
            WHERE project = ? OR path LIKE ?
            ORDER BY path
          `).all(projectWithChildren.project, projectWithChildren.path + '.%');
          
          // Build tree structure manually
          tree = [projectWithChildren];
          tree[0].children = buildChildrenForTask(projectWithChildren, allProjectTasks);
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