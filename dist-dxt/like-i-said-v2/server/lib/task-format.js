import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

/**
 * Task Format Handler - Manages markdown task files with YAML frontmatter
 * Similar to MemoryFormat but for task management
 */
export class TaskFormat {
  // Regex patterns for different task formats
  static FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
  
  /**
   * Parse task content from markdown with YAML frontmatter
   */
  static parseTaskContent(content) {
    if (!content || typeof content !== 'string') return null;

    // Try YAML frontmatter format
    const frontmatterMatch = content.match(this.FRONTMATTER_REGEX);
    if (frontmatterMatch) {
      return this.parseFrontmatter(frontmatterMatch[1], frontmatterMatch[2]);
    }

    // No valid format found
    return null;
  }

  /**
   * Parse YAML frontmatter format
   */
  static parseFrontmatter(frontmatter, bodyContent) {
    const task = { 
      description: bodyContent.trim(), 
      format: 'yaml'
    };

    try {
      // Parse YAML frontmatter
      const yamlData = yaml.load(frontmatter);
      
      // Merge YAML data into task object
      Object.assign(task, yamlData);
      
      return task;
    } catch (error) {
      console.error('Error parsing task YAML frontmatter:', error);
      return null;
    }
  }

  /**
   * Generate markdown content with YAML frontmatter
   */
  /**
   * Alias for generateMarkdownContent
   */
  static toMarkdown(task) {
    return this.generateMarkdownContent(task);
  }

  static generateMarkdownContent(task) {
    const frontmatter = {
      id: task.id,
      title: task.title,
      serial: task.serial,
      status: task.status,
      priority: task.priority,
      category: task.category,
      project: task.project,
      tags: task.tags || [],
      created: task.created,
      updated: task.updated,
      manual_memories: task.manual_memories || [],
      memory_connections: task.memory_connections || []
    };

    // Remove undefined values
    Object.keys(frontmatter).forEach(key => {
      if (frontmatter[key] === undefined) {
        delete frontmatter[key];
      }
    });

    const yamlString = yaml.dump(frontmatter, {
      lineWidth: -1,
      noRefs: true,
      sortKeys: false
    });

    return `---\n${yamlString}---\n${task.description || ''}\n`;
  }

  /**
   * Parse multiple tasks from content (for project-based files)
   */
  static parseMultiple(content) {
    const tasks = [];
    
    // Split content by task boundaries (frontmatter sections)
    const sections = content.split(/^---$/m);
    if (process.env.DEBUG_MCP) console.error(`DEBUG: Found ${sections.length} sections in content`);
    
    for (let i = 1; i < sections.length; i += 2) {
      if (i + 1 < sections.length) {
        const frontmatterContent = sections[i];
        const bodyContent = sections[i + 1];
        const taskContent = `---\n${frontmatterContent}---${bodyContent}`;
        
        if (process.env.DEBUG_MCP) console.error(`DEBUG: Processing task section ${i}, frontmatter length: ${frontmatterContent.length}`);
        
        const task = this.parseTaskContent(taskContent);
        if (task && task.id) {  // Only add tasks with valid IDs
          if (process.env.DEBUG_MCP) console.error(`DEBUG: Successfully parsed task: ${task.id}`);
          tasks.push(task);
        } else {
          if (task && !task.id) {
            if (process.env.DEBUG_MCP) console.error(`DEBUG: Skipping section ${i} - no task ID found`);
          } else {
            if (process.env.DEBUG_MCP) console.error(`DEBUG: Failed to parse task from section ${i}`);
          }
        }
      }
    }
    
    if (process.env.DEBUG_MCP) console.error(`DEBUG: Total tasks parsed: ${tasks.length}`);
    return tasks;
  }

  /**
   * Parse task file from filesystem
   */
  static parseTaskFile(filepath) {
    try {
      const content = fs.readFileSync(filepath, 'utf8');
      const task = this.parseTaskContent(content);
      
      if (!task) return null;

      // Add file metadata
      task.filename = path.basename(filepath);
      task.filepath = filepath;
      
      // Extract project from directory structure (skip status directory)
      const statusDir = path.basename(path.dirname(filepath));
      const projectName = path.basename(path.dirname(path.dirname(filepath)));
      if (projectName !== 'default' && projectName !== 'tasks') {
        task.project = projectName;
      }

      // Ensure all required fields exist
      this.ensureRequiredFields(task);
      
      return task;
    } catch (error) {
      console.error(`Error parsing task file ${filepath}:`, error);
      return null;
    }
  }

  /**
   * Ensure task has all required fields
   */
  static ensureRequiredFields(task) {
    // Core fields
    if (!task.id) task.id = path.basename(task.filename || '', '.md');
    if (!task.created) task.created = new Date().toISOString();
    if (!task.updated) task.updated = new Date().toISOString();
    if (!task.status) task.status = 'todo';
    if (!task.priority) task.priority = 'medium';
    if (!task.tags) task.tags = [];
    if (!task.manual_memories) task.manual_memories = [];
    if (!task.memory_connections) task.memory_connections = [];
    
    // Metadata
    if (!task.metadata) task.metadata = {};
    if (!task.metadata.content_type) task.metadata.content_type = 'task';
    if (!task.metadata.size) task.metadata.size = (task.description || '').length;
  }

  /**
   * Generate filename for task
   */
  static generateTaskFilename(task) {
    const id = task.id || task.serial || 'unknown';
    return `${id}.md`;
  }

  /**
   * Get task directory path for project
   */
  static getTaskDirectoryPath(project, status = 'active') {
    const baseDir = 'tasks';
    const projectDir = project || 'default';
    
    // Map status to directory names
    const statusMap = {
      'todo': 'todo',
      'active': 'active', 
      'in_progress': 'active',
      'completed': 'completed',
      'done': 'completed',
      'blocked': 'blocked'
    };
    
    const statusDir = statusMap[status] || 'active';
    
    return path.join(baseDir, projectDir, statusDir);
  }

  /**
   * Save task to markdown file
   */
  static saveTaskToFile(task, basePath = 'tasks') {
    const content = this.generateMarkdownContent(task);
    const projectDir = this.getTaskDirectoryPath(task.project, task.status);
    const filename = this.generateTaskFilename(task);
    const filepath = path.join(projectDir, filename);

    // Ensure directory exists
    fs.mkdirSync(projectDir, { recursive: true });

    // Write file
    fs.writeFileSync(filepath, content, 'utf8');
    
    return filepath;
  }

  /**
   * Get all task files in a project
   */
  static getTaskFiles(project, status = null) {
    const files = [];
    const projectDir = project || 'default';
    const basePath = path.join('tasks', projectDir);
    
    if (!fs.existsSync(basePath)) {
      return files;
    }

    const statusDirs = status ? [status] : ['todo', 'active', 'completed', 'blocked'];
    
    for (const statusDir of statusDirs) {
      const statusPath = path.join(basePath, statusDir);
      if (fs.existsSync(statusPath)) {
        const taskFiles = fs.readdirSync(statusPath)
          .filter(file => file.endsWith('.md'))
          .map(file => path.join(statusPath, file));
        files.push(...taskFiles);
      }
    }
    
    return files;
  }

  /**
   * Load all tasks from markdown files
   */
  static loadAllTasks(project = null) {
    const tasks = [];
    const projectsDir = 'tasks';
    
    if (!fs.existsSync(projectsDir)) {
      return tasks;
    }

    const projects = project ? [project] : fs.readdirSync(projectsDir)
      .filter(dir => fs.statSync(path.join(projectsDir, dir)).isDirectory());

    for (const proj of projects) {
      const taskFiles = this.getTaskFiles(proj);
      
      for (const filepath of taskFiles) {
        const task = this.parseTaskFile(filepath);
        if (task) {
          tasks.push(task);
        }
      }
    }

    return tasks;
  }
}