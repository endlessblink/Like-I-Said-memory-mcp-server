#!/usr/bin/env node

/**
 * Project Hierarchy Setup Script
 * 
 * Ensures proper MCP project setup before task creation
 * Prevents "parent not found" and "project not found" errors
 * 
 * Usage:
 *   node scripts/setup-project-hierarchy.js --project "My Project" --setup-basic
 *   node scripts/setup-project-hierarchy.js --project "My Project" --stages "Stage 1,Stage 2"
 *   node scripts/setup-project-hierarchy.js --project "My Project" --full-setup
 */

import fs from 'fs';
import path from 'path';

class ProjectHierarchySetup {
    constructor() {
        this.verbose = process.argv.includes('--verbose');
        this.projectsFile = path.join(process.cwd(), 'data', 'projects-registry.json');
        this.ensureDataDirectory();
    }

    log(message) {
        if (this.verbose) {
            console.log(`🔍 ${message}`);
        }
    }

    success(message) {
        console.log(`✅ ${message}`);
    }

    error(message) {
        console.error(`❌ ${message}`);
    }

    warning(message) {
        console.warn(`⚠️  ${message}`);
    }

    ensureDataDirectory() {
        const dataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
            this.log(`Created data directory: ${dataDir}`);
        }
    }

    /**
     * Load existing projects registry
     */
    loadProjectsRegistry() {
        if (fs.existsSync(this.projectsFile)) {
            try {
                const content = fs.readFileSync(this.projectsFile, 'utf8');
                return JSON.parse(content);
            } catch (error) {
                this.warning(`Failed to parse projects registry: ${error.message}`);
                return { projects: {}, lastUpdate: new Date().toISOString() };
            }
        }
        return { projects: {}, lastUpdate: new Date().toISOString() };
    }

    /**
     * Save projects registry
     */
    saveProjectsRegistry(registry) {
        try {
            registry.lastUpdate = new Date().toISOString();
            fs.writeFileSync(this.projectsFile, JSON.stringify(registry, null, 2));
            this.log(`Saved projects registry to: ${this.projectsFile}`);
        } catch (error) {
            this.error(`Failed to save projects registry: ${error.message}`);
            throw error;
        }
    }

    /**
     * Generate a UUID-like ID
     */
    generateId() {
        return 'proj-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Check if project exists in registry
     */
    projectExists(projectName) {
        const registry = this.loadProjectsRegistry();
        const projectKey = projectName.toLowerCase().replace(/\s+/g, '-');
        return registry.projects[projectKey] !== undefined;
    }

    /**
     * Get project info from registry
     */
    getProjectInfo(projectName) {
        const registry = this.loadProjectsRegistry();
        const projectKey = projectName.toLowerCase().replace(/\s+/g, '-');
        return registry.projects[projectKey] || null;
    }

    /**
     * Validate project structure requirements
     */
    validateProjectRequirements(projectName, options = {}) {
        this.log(`Validating project requirements for: ${projectName}`);

        const errors = [];
        const warnings = [];

        // Check project name
        if (!projectName || projectName.trim().length === 0) {
            errors.push('Project name cannot be empty');
        }

        if (projectName.length > 100) {
            warnings.push('Project name is very long (>100 chars)');
        }

        // Check for invalid characters
        const invalidChars = /[<>:"|?*]/;
        if (invalidChars.test(projectName)) {
            errors.push('Project name contains invalid characters: < > : " | ? *');
        }

        // Check stages if provided
        if (options.stages) {
            if (!Array.isArray(options.stages) && typeof options.stages === 'string') {
                options.stages = options.stages.split(',').map(s => s.trim());
            }

            if (options.stages.length > 20) {
                warnings.push('Large number of stages (>20) may impact performance');
            }
        }

        return { errors, warnings, isValid: errors.length === 0 };
    }

    /**
     * Create project registry entry
     */
    createProjectEntry(projectName, options = {}) {
        this.log(`Creating project entry for: ${projectName}`);

        const validation = this.validateProjectRequirements(projectName, options);
        if (!validation.isValid) {
            throw new Error(`Project validation failed: ${validation.errors.join(', ')}`);
        }

        // Log warnings
        validation.warnings.forEach(warning => this.warning(warning));

        const registry = this.loadProjectsRegistry();
        const projectKey = projectName.toLowerCase().replace(/\s+/g, '-');
        const projectId = this.generateId();

        const projectEntry = {
            id: projectId,
            name: projectName,
            key: projectKey,
            description: options.description || `Project: ${projectName}`,
            priority: options.priority || 'medium',
            status: 'active',
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            stages: {},
            tasks: {},
            hierarchy: {
                type: 'project',
                children: []
            },
            metadata: {
                createdBy: 'setup-script',
                version: '1.0',
                setupType: options.setupType || 'basic'
            }
        };

        // Add stages if provided
        if (options.stages) {
            const stages = Array.isArray(options.stages) ? options.stages : 
                          options.stages.split(',').map(s => s.trim());
            
            stages.forEach((stageName, index) => {
                const stageId = `stage-${projectId}-${index + 1}`;
                projectEntry.stages[stageId] = {
                    id: stageId,
                    name: stageName.trim(),
                    description: `Stage: ${stageName.trim()}`,
                    order: index + 1,
                    status: 'active',
                    tasks: {},
                    created: new Date().toISOString()
                };
                projectEntry.hierarchy.children.push({
                    type: 'stage',
                    id: stageId,
                    name: stageName.trim(),
                    children: []
                });
            });
        }

        registry.projects[projectKey] = projectEntry;
        this.saveProjectsRegistry(registry);

        this.success(`Created project entry: ${projectName} (ID: ${projectId})`);
        return projectEntry;
    }

    /**
     * Setup basic project (project only, no stages)
     */
    setupBasicProject(projectName, description = null) {
        this.log(`Setting up basic project: ${projectName}`);

        if (this.projectExists(projectName)) {
            const existing = this.getProjectInfo(projectName);
            this.warning(`Project already exists: ${projectName} (ID: ${existing.id})`);
            return existing;
        }

        return this.createProjectEntry(projectName, {
            description: description,
            setupType: 'basic'
        });
    }

    /**
     * Setup project with stages
     */
    setupProjectWithStages(projectName, stages, description = null) {
        this.log(`Setting up project with stages: ${projectName}`);

        if (this.projectExists(projectName)) {
            const existing = this.getProjectInfo(projectName);
            this.warning(`Project already exists: ${projectName}. Adding stages if missing.`);
            
            // Add missing stages to existing project
            return this.addStagesToProject(projectName, stages);
        }

        return this.createProjectEntry(projectName, {
            description: description,
            stages: stages,
            setupType: 'with-stages'
        });
    }

    /**
     * Add stages to existing project
     */
    addStagesToProject(projectName, newStages) {
        this.log(`Adding stages to existing project: ${projectName}`);

        const registry = this.loadProjectsRegistry();
        const projectKey = projectName.toLowerCase().replace(/\s+/g, '-');
        const project = registry.projects[projectKey];

        if (!project) {
            throw new Error(`Project not found: ${projectName}`);
        }

        const stages = Array.isArray(newStages) ? newStages : 
                      newStages.split(',').map(s => s.trim());

        let addedCount = 0;
        stages.forEach((stageName, index) => {
            const existingStage = Object.values(project.stages)
                .find(stage => stage.name.toLowerCase() === stageName.toLowerCase());

            if (!existingStage) {
                const stageId = `stage-${project.id}-${Object.keys(project.stages).length + 1}`;
                project.stages[stageId] = {
                    id: stageId,
                    name: stageName.trim(),
                    description: `Stage: ${stageName.trim()}`,
                    order: Object.keys(project.stages).length + 1,
                    status: 'active',
                    tasks: {},
                    created: new Date().toISOString()
                };
                project.hierarchy.children.push({
                    type: 'stage',
                    id: stageId,
                    name: stageName.trim(),
                    children: []
                });
                addedCount++;
            }
        });

        project.updated = new Date().toISOString();
        this.saveProjectsRegistry(registry);

        this.success(`Added ${addedCount} new stages to project: ${projectName}`);
        return project;
    }

    /**
     * Setup complete project hierarchy
     */
    setupFullProject(projectName, options = {}) {
        this.log(`Setting up full project hierarchy: ${projectName}`);

        const defaultStages = [
            'Planning & Analysis',
            'Development',
            'Testing & QA', 
            'Documentation',
            'Deployment'
        ];

        const stages = options.stages || defaultStages;
        const description = options.description || `Complete project setup for ${projectName}`;

        return this.setupProjectWithStages(projectName, stages, description);
    }

    /**
     * List all projects
     */
    listProjects() {
        const registry = this.loadProjectsRegistry();
        const projects = Object.values(registry.projects);

        if (projects.length === 0) {
            this.warning('No projects found in registry');
            return;
        }

        console.log('\n📋 Project Registry:');
        console.log('='.repeat(50));

        projects.forEach(project => {
            const stageCount = Object.keys(project.stages).length;
            const taskCount = Object.keys(project.tasks).length;
            
            console.log(`📁 ${project.name}`);
            console.log(`   ID: ${project.id}`);
            console.log(`   Status: ${project.status}`);
            console.log(`   Stages: ${stageCount}, Tasks: ${taskCount}`);
            console.log(`   Created: ${new Date(project.created).toLocaleDateString()}`);
            
            if (stageCount > 0) {
                const stageNames = Object.values(project.stages).map(s => s.name).join(', ');
                console.log(`   Stages: ${stageNames}`);
            }
            console.log('');
        });
    }

    /**
     * Show project structure
     */
    showProjectStructure(projectName) {
        const project = this.getProjectInfo(projectName);
        if (!project) {
            this.error(`Project not found: ${projectName}`);
            return;
        }

        console.log(`\n📁 Project: ${project.name}`);
        console.log(`   ID: ${project.id}`);
        console.log(`   Status: ${project.status}`);
        console.log(`   Created: ${new Date(project.created).toLocaleDateString()}`);
        
        const stages = Object.values(project.stages);
        if (stages.length > 0) {
            console.log('\n📂 Stages:');
            stages.forEach(stage => {
                const taskCount = Object.keys(stage.tasks).length;
                console.log(`   └── ${stage.name} (${stage.id}) - ${taskCount} tasks`);
            });
        } else {
            console.log('   No stages defined');
        }

        console.log(`\n📊 Summary:`);
        console.log(`   Total Stages: ${stages.length}`);
        console.log(`   Total Tasks: ${Object.keys(project.tasks).length}`);
    }

    /**
     * Show usage information
     */
    showUsage() {
        console.log(`
Project Hierarchy Setup - MCP Error Prevention Tool

Usage:
  node scripts/setup-project-hierarchy.js <command> [options]

Commands:
  --setup-basic --project "Project Name"
    Create basic project entry (no stages)

  --setup-stages --project "Project Name" --stages "Stage 1,Stage 2,Stage 3"
    Create project with specified stages

  --setup-full --project "Project Name" [--description "Description"]
    Create project with default development stages

  --add-stages --project "Project Name" --stages "New Stage 1,New Stage 2"
    Add stages to existing project

  --list
    List all projects in registry

  --structure --project "Project Name"
    Show detailed project structure

Options:
  --project "Name"     Project name (required for most commands)
  --stages "S1,S2,S3"  Comma-separated stage names
  --description "Text" Project description
  --verbose            Show detailed logging
  --help               Show this help message

Examples:
  # Create basic project
  node scripts/setup-project-hierarchy.js --setup-basic --project "My Video App"

  # Create project with custom stages
  node scripts/setup-project-hierarchy.js --setup-stages --project "My Video App" --stages "UI Design,Backend API,Testing"

  # Create full project with default stages
  node scripts/setup-project-hierarchy.js --setup-full --project "My Video App" --description "Video processing application"

  # List all projects
  node scripts/setup-project-hierarchy.js --list

  # Show project structure
  node scripts/setup-project-hierarchy.js --structure --project "My Video App"
        `);
    }
}

// Command line interface
async function main() {
    const setup = new ProjectHierarchySetup();
    const args = process.argv.slice(2);

    if (args.length === 0 || args.includes('--help')) {
        setup.showUsage();
        return;
    }

    try {
        // Parse arguments
        const getArgValue = (flag) => {
            const index = args.indexOf(flag);
            return index !== -1 && index + 1 < args.length ? args[index + 1] : null;
        };

        const projectName = getArgValue('--project');
        const stages = getArgValue('--stages');
        const description = getArgValue('--description');

        // Execute commands
        if (args.includes('--list')) {
            setup.listProjects();
        }
        else if (args.includes('--structure')) {
            if (!projectName) {
                setup.error('--structure requires --project "Project Name"');
                return;
            }
            setup.showProjectStructure(projectName);
        }
        else if (args.includes('--setup-basic')) {
            if (!projectName) {
                setup.error('--setup-basic requires --project "Project Name"');
                return;
            }
            setup.setupBasicProject(projectName, description);
        }
        else if (args.includes('--setup-stages')) {
            if (!projectName || !stages) {
                setup.error('--setup-stages requires --project "Project Name" --stages "Stage1,Stage2"');
                return;
            }
            setup.setupProjectWithStages(projectName, stages, description);
        }
        else if (args.includes('--setup-full')) {
            if (!projectName) {
                setup.error('--setup-full requires --project "Project Name"');
                return;
            }
            setup.setupFullProject(projectName, { description });
        }
        else if (args.includes('--add-stages')) {
            if (!projectName || !stages) {
                setup.error('--add-stages requires --project "Project Name" --stages "Stage1,Stage2"');
                return;
            }
            setup.addStagesToProject(projectName, stages);
        }
        else {
            setup.error('Unknown command. Use --help to see available commands.');
            setup.showUsage();
        }

    } catch (error) {
        setup.error(`Command failed: ${error.message}`);
        process.exit(1);
    }
}

// Export for testing
export default ProjectHierarchySetup;

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}