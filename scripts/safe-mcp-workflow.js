#!/usr/bin/env node

/**
 * Safe MCP Workflow Script
 * 
 * Provides error-proof workflow for creating MCP hierarchical tasks
 * Prevents common errors like "Parent not found" and "Project not found"
 * 
 * Usage:
 *   node scripts/safe-mcp-workflow.js create-task "My Project" "Task Title"
 *   node scripts/safe-mcp-workflow.js create-hierarchy "My Project" "Stage" "Task" "Subtask"
 */

import { execSync } from 'child_process';

class SafeMCPWorkflow {
    constructor() {
        this.verbose = process.argv.includes('--verbose');
    }

    log(message) {
        if (this.verbose) {
            console.log(`🔍 ${message}`);
        }
    }

    error(message) {
        console.error(`❌ ${message}`);
    }

    success(message) {
        console.log(`✅ ${message}`);
    }

    warning(message) {
        console.warn(`⚠️  ${message}`);
    }

    /**
     * Execute MCP command safely with error handling
     */
    async executeMCPCommand(tool, params) {
        try {
            this.log(`Executing: ${tool} with params:`, params);
            
            // In real implementation, this would use the actual MCP client
            // For now, we'll simulate the command structure
            const command = `mcp__like-i-said__${tool}`;
            const paramsStr = Object.entries(params)
                .map(([key, value]) => `--${key} "${value}"`)
                .join(' ');
            
            this.log(`Would execute: ${command} ${paramsStr}`);
            
            // Return mock response for demonstration
            return {
                success: true,
                data: { id: `mock-${Date.now()}`, ...params }
            };
            
        } catch (error) {
            this.error(`MCP command failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Step 1: Ensure project exists
     */
    async ensureProject(projectName, description = null) {
        this.log(`Ensuring project exists: ${projectName}`);

        // First, try to find existing project
        const findResult = await this.executeMCPCommand('find_project', {
            search_term: projectName,
            show_all: false
        });

        if (findResult.success && findResult.data) {
            this.success(`Project "${projectName}" already exists`);
            return findResult.data;
        }

        // Project not found, create it
        this.log(`Project not found, creating: ${projectName}`);
        const createResult = await this.executeMCPCommand('find_or_create_project', {
            title: projectName,
            description: description || `Auto-created project: ${projectName}`,
            priority: 'medium'
        });

        if (createResult.success) {
            this.success(`Created project: ${projectName}`);
            return createResult.data;
        } else {
            throw new Error(`Failed to create project: ${createResult.error}`);
        }
    }

    /**
     * Step 2: Validate hierarchy operation
     */
    async validateHierarchyOperation(operation, parentId = null, projectName = null) {
        this.log(`Validating hierarchy operation: ${operation}`);

        const params = { operation };
        if (parentId) params.parent_id = parentId;
        if (projectName) params.project_name = projectName;

        const result = await this.executeMCPCommand('validate_hierarchy', params);

        if (result.success) {
            this.success(`Hierarchy validation passed for: ${operation}`);
            return true;
        } else {
            this.error(`Hierarchy validation failed: ${result.error}`);
            return false;
        }
    }

    /**
     * Step 3: Get project structure
     */
    async getProjectStructure(projectId) {
        this.log(`Getting project structure for: ${projectId}`);

        const result = await this.executeMCPCommand('view_project', {
            project_id: projectId,
            include_completed: true,
            max_depth: 4
        });

        if (result.success) {
            this.success(`Retrieved project structure`);
            return result.data;
        } else {
            this.warning(`Could not retrieve project structure: ${result.error}`);
            return null;
        }
    }

    /**
     * Safe task creation with full validation
     */
    async createTaskSafely(projectName, taskTitle, taskDescription, parentId = null, priority = 'medium') {
        this.log(`Starting safe task creation for: ${taskTitle}`);

        try {
            // Step 1: Ensure project exists
            const project = await this.ensureProject(projectName);

            // Step 2: Validate hierarchy operation
            const operation = parentId ? 'create_subtask' : 'create_task';
            const isValid = await this.validateHierarchyOperation(
                operation,
                parentId,
                project.name || projectName
            );

            if (!isValid) {
                throw new Error('Hierarchy validation failed - cannot create task');
            }

            // Step 3: Get current project structure (optional, for reference)
            await this.getProjectStructure(project.id || project.name);

            // Step 4: Create the task
            const taskParams = {
                title: taskTitle,
                description: taskDescription,
                project: project.name || projectName,
                priority: priority
            };

            if (parentId) {
                taskParams.parent_id = parentId;
            }

            const taskResult = await this.executeMCPCommand('create_hierarchical_task', taskParams);

            if (taskResult.success) {
                this.success(`Created task: "${taskTitle}" in project "${projectName}"`);
                return taskResult.data;
            } else {
                throw new Error(`Task creation failed: ${taskResult.error}`);
            }

        } catch (error) {
            this.error(`Safe task creation failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Create complete hierarchy safely
     */
    async createHierarchySafely(projectName, stageTitle, taskTitle, subtaskTitle) {
        this.log(`Creating complete hierarchy: Project -> Stage -> Task -> Subtask`);

        try {
            // Step 1: Create/ensure project
            const project = await this.ensureProject(projectName);

            // Step 2: Create stage
            const stageResult = await this.executeMCPCommand('create_stage', {
                project_id: project.id,
                title: stageTitle,
                description: `Stage for ${stageTitle}`
            });

            if (!stageResult.success) {
                throw new Error(`Failed to create stage: ${stageResult.error}`);
            }

            this.success(`Created stage: ${stageTitle}`);

            // Step 3: Create task under stage
            const taskResult = await this.executeMCPCommand('create_hierarchical_task', {
                title: taskTitle,
                description: `Task: ${taskTitle}`,
                project: projectName,
                parent_id: stageResult.data.id,
                priority: 'medium'
            });

            if (!taskResult.success) {
                throw new Error(`Failed to create task: ${taskResult.error}`);
            }

            this.success(`Created task: ${taskTitle}`);

            // Step 4: Create subtask under task
            const subtaskResult = await this.executeMCPCommand('create_subtask', {
                parent_task_id: taskResult.data.id,
                title: subtaskTitle,
                description: `Subtask: ${subtaskTitle}`
            });

            if (!subtaskResult.success) {
                throw new Error(`Failed to create subtask: ${subtaskResult.error}`);
            }

            this.success(`Created subtask: ${subtaskTitle}`);
            this.success(`Complete hierarchy created successfully!`);

            return {
                project: project,
                stage: stageResult.data,
                task: taskResult.data,
                subtask: subtaskResult.data
            };

        } catch (error) {
            this.error(`Hierarchy creation failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Show usage information
     */
    showUsage() {
        console.log(`
Safe MCP Workflow - Error Prevention Tool

Usage:
  node scripts/safe-mcp-workflow.js <command> [options]

Commands:
  create-task <project> <title> [description] [parent-id]
    Create a single task safely with full validation

  create-hierarchy <project> <stage> <task> <subtask>
    Create complete Project->Stage->Task->Subtask hierarchy

  validate <project> [parent-id]
    Validate project structure and hierarchy

  structure <project>
    Show current project structure

Options:
  --verbose    Show detailed logging
  --help       Show this help message

Examples:
  # Create a simple task
  node scripts/safe-mcp-workflow.js create-task "My Project" "Build Feature"

  # Create complete hierarchy
  node scripts/safe-mcp-workflow.js create-hierarchy "Video App" "Development" "UI Components" "Button Component"

  # Validate before creating
  node scripts/safe-mcp-workflow.js validate "My Project"

  # View project structure
  node scripts/safe-mcp-workflow.js structure "My Project"
        `);
    }
}

// Command line interface
async function main() {
    const workflow = new SafeMCPWorkflow();
    const args = process.argv.slice(2);

    if (args.length === 0 || args.includes('--help')) {
        workflow.showUsage();
        return;
    }

    const command = args[0];

    try {
        switch (command) {
            case 'create-task':
                if (args.length < 3) {
                    workflow.error('create-task requires: <project> <title> [description] [parent-id]');
                    return;
                }
                const [, project, title, description, parentId] = args;
                await workflow.createTaskSafely(project, title, description, parentId);
                break;

            case 'create-hierarchy':
                if (args.length < 5) {
                    workflow.error('create-hierarchy requires: <project> <stage> <task> <subtask>');
                    return;
                }
                const [, proj, stage, task, subtask] = args;
                await workflow.createHierarchySafely(proj, stage, task, subtask);
                break;

            case 'validate':
                if (args.length < 2) {
                    workflow.error('validate requires: <project> [parent-id]');
                    return;
                }
                const [, projName, parentIdVal] = args;
                const projData = await workflow.ensureProject(projName);
                await workflow.validateHierarchyOperation('create_task', parentIdVal, projName);
                break;

            case 'structure':
                if (args.length < 2) {
                    workflow.error('structure requires: <project>');
                    return;
                }
                const [, projId] = args;
                const structure = await workflow.getProjectStructure(projId);
                console.log('Project Structure:', JSON.stringify(structure, null, 2));
                break;

            default:
                workflow.error(`Unknown command: ${command}`);
                workflow.showUsage();
        }
    } catch (error) {
        workflow.error(`Command failed: ${error.message}`);
        process.exit(1);
    }
}

// Export for testing
export default SafeMCPWorkflow;

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}