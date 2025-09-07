#!/usr/bin/env node

/**
 * Unified Storage Adapter for MCP Tools
 * 
 * Integrates UnifiedStorage with existing MCP tool implementations
 * while maintaining backward compatibility and enabling cross-platform access.
 */

import UnifiedStorage from './unified-storage.js';
import fs from 'fs-extra';
import path from 'path';

class UnifiedMemoryStorage {
  constructor(baseDir = 'memories') {
    this.legacyStorage = new LegacyMemoryStorage(baseDir);
    this.unifiedStorage = new UnifiedStorage({
      appName: 'like-i-said-mcp',
      enableMigration: true,
      createBackups: true
    });
    this.initialized = false;
  }

  async initialize() {
    if (!this.initialized) {
      await this.unifiedStorage.initialize();
      this.initialized = true;
    }
  }

  async addMemory(content, project = 'default', category, tags, priority) {
    await this.initialize();
    
    const memory = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      content,
      project,
      category: category || 'personal',
      tags: tags || [],
      priority: priority || 'medium',
      complexity: this.detectComplexity(content)
    };

    // Save to unified storage
    const filename = `memories/${project}/${memory.id}.md`;
    const markdownContent = this.generateMarkdownContent(memory);
    
    await this.unifiedStorage.writeFile(filename, markdownContent);
    
    // UNIFIED STORAGE ONLY - No legacy fallback to prevent fragmentation
    console.log(`📁 [UNIFIED] Memory saved to: ${this.unifiedStorage.unifiedPath}/${filename}`);
    
    return {
      id: memory.id,
      message: `✅ Memory saved to ${project}`,
      filepath: `${this.unifiedStorage.unifiedPath}/${filename}`
    };
  }

  async listMemories(filters = {}) {
    await this.initialize();
    
    const memoriesPath = this.unifiedStorage.join(this.unifiedStorage.unifiedPath, 'memories');
    const memories = [];

    try {
      if (await this.unifiedStorage.exists('memories')) {
        const projects = await fs.readdir(memoriesPath);
        
        for (const project of projects) {
          const projectPath = this.unifiedStorage.join(memoriesPath, project);
          const stat = await fs.stat(projectPath);
          
          if (stat.isDirectory()) {
            const files = await fs.readdir(projectPath);
            
            for (const file of files) {
              if (file.endsWith('.md')) {
                const filePath = this.unifiedStorage.join(projectPath, file);
                const content = await fs.readFile(filePath, 'utf8');
                const memory = this.parseMarkdownMemory(content, filePath);
                
                if (memory && this.matchesFilters(memory, filters)) {
                  memories.push(memory);
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error listing memories:', error);
      // Fallback to legacy storage
      return this.legacyStorage.listMemories(filters);
    }

    return memories.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  async searchMemories(query) {
    const allMemories = await this.listMemories();
    return allMemories.filter(memory =>
      memory.content.toLowerCase().includes(query.toLowerCase()) ||
      (memory.tags && memory.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase())))
    );
  }

  async getMemory(id) {
    const memories = await this.listMemories();
    return memories.find(m => m.id === id);
  }

  async deleteMemory(id) {
    await this.initialize();
    
    try {
      const memory = await this.getMemory(id);
      if (memory && memory.filepath) {
        // Delete from unified storage
        const relativePath = path.relative(this.unifiedStorage.unifiedPath, memory.filepath);
        if (await this.unifiedStorage.exists(relativePath)) {
          await fs.remove(memory.filepath);
          
          // Also delete from legacy storage for consistency
          await this.legacyStorage.deleteMemory(id);
          
          return true;
        }
      }
    } catch (error) {
      console.error('Error deleting memory:', error);
    }
    
    return false;
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  detectComplexity(content) {
    if (content.length > 2000) return '4';
    if (content.length > 800) return '3';  
    if (content.length > 200) return '2';
    return '1';
  }

  generateMarkdownContent(memory) {
    const frontmatter = [
      '---',
      `id: ${memory.id}`,
      `timestamp: ${memory.timestamp}`,
      `complexity: ${memory.complexity}`,
      `category: ${memory.category}`,
      `project: ${memory.project}`,
      memory.tags && memory.tags.length > 0 ? `tags: [${memory.tags.map(t => `"${t}"`).join(', ')}]` : '',
      memory.priority ? `priority: ${memory.priority}` : '',
      '---'
    ].filter(line => line !== '').join('\n');

    return `${frontmatter}\n${memory.content}`;
  }

  parseMarkdownMemory(content, filepath) {
    try {
      const [frontmatterSection, ...contentParts] = content.split('---').slice(1);
      if (!frontmatterSection) return null;

      const memory = { filepath };
      const lines = frontmatterSection.trim().split('\n');
      
      for (const line of lines) {
        const [key, ...valueParts] = line.split(':');
        if (!key || !valueParts.length) continue;
        
        const value = valueParts.join(':').trim();
        
        switch (key.trim()) {
          case 'id':
            memory.id = value;
            break;
          case 'timestamp':
            memory.timestamp = value;
            break;
          case 'complexity':
            memory.complexity = value;
            break;
          case 'category':
            memory.category = value;
            break;
          case 'project':
            memory.project = value;
            break;
          case 'priority':
            memory.priority = value;
            break;
          case 'tags':
            memory.tags = this.parseTags(value);
            break;
        }
      }
      
      memory.content = contentParts.join('---').trim();
      return memory;
    } catch (error) {
      console.error('Error parsing memory:', error);
      return null;
    }
  }

  parseTags(tagString) {
    try {
      if (tagString.startsWith('[') && tagString.endsWith(']')) {
        return tagString.slice(1, -1)
          .split(',')
          .map(t => t.trim().replace(/^"|"$/g, ''))
          .filter(t => t.length > 0);
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  matchesFilters(memory, filters) {
    if (filters.project && memory.project !== filters.project) return false;
    if (filters.category && memory.category !== filters.category) return false;
    if (filters.minComplexity && parseInt(memory.complexity || '1') < filters.minComplexity) return false;
    return true;
  }
}

class UnifiedTaskStorage {
  constructor(baseDir = 'tasks') {
    this.legacyStorage = new LegacyTaskStorage(baseDir);
    this.unifiedStorage = new UnifiedStorage({
      appName: 'like-i-said-mcp',
      enableMigration: true,
      createBackups: true
    });
    this.initialized = false;
  }

  async initialize() {
    if (!this.initialized) {
      await this.unifiedStorage.initialize();
      this.initialized = true;
    }
  }

  async createTask(data) {
    await this.initialize();
    
    const task = {
      id: this.generateTaskId(),
      title: data.title,
      description: data.description || '',
      status: data.status || 'todo',
      priority: data.priority || 'medium',
      project: data.project || 'default',
      created: new Date().toISOString(),
      ...data
    };

    // Save to unified storage
    const filename = `tasks/${task.project}/tasks.json`;
    
    // Read existing tasks
    let tasks = [];
    if (await this.unifiedStorage.exists(filename)) {
      const existingContent = await this.unifiedStorage.readFile(filename);
      tasks = JSON.parse(existingContent);
    }
    
    // Add new task
    tasks.push(task);
    await this.unifiedStorage.writeFile(filename, JSON.stringify(tasks, null, 2));
    
    // UNIFIED STORAGE ONLY - No legacy fallback to prevent fragmentation
    console.log(`📁 [UNIFIED] Task saved to: ${this.unifiedStorage.unifiedPath}/${filename}`);
    
    return {
      id: task.id,
      message: `✅ Task created: ${task.title}`,
      task
    };
  }

  async listTasks(filters = {}) {
    await this.initialize();
    
    const allTasks = [];
    const tasksPath = this.unifiedStorage.join(this.unifiedStorage.unifiedPath, 'tasks');

    try {
      if (await this.unifiedStorage.exists('tasks')) {
        const projects = filters.project 
          ? [filters.project] 
          : await fs.readdir(tasksPath);

        for (const project of projects) {
          const projectPath = this.unifiedStorage.join(tasksPath, project);
          const tasksFile = this.unifiedStorage.join(projectPath, 'tasks.json');
          
          if (await fs.pathExists(tasksFile)) {
            const tasks = JSON.parse(await fs.readFile(tasksFile, 'utf8'));
            allTasks.push(...tasks.filter(task => {
              if (filters.status && task.status !== filters.status) return false;
              if (filters.priority && task.priority !== filters.priority) return false;
              return true;
            }));
          }
        }
      }
    } catch (error) {
      console.error('Error listing tasks:', error);
      // Fallback to legacy storage
      return this.legacyStorage.listTasks(filters);
    }

    return allTasks.sort((a, b) => new Date(b.created) - new Date(a.created));
  }

  async updateTask(id, updates) {
    await this.initialize();
    
    try {
      // Find the task across all projects
      const allTasks = await this.listTasks();
      const task = allTasks.find(t => t.id === id);
      
      if (!task) {
        throw new Error(`Task ${id} not found`);
      }

      // Update the task
      const updatedTask = { ...task, ...updates, updated: new Date().toISOString() };
      
      // Save back to unified storage
      const filename = `tasks/${task.project}/tasks.json`;
      const existingContent = await this.unifiedStorage.readFile(filename);
      const tasks = JSON.parse(existingContent);
      
      const taskIndex = tasks.findIndex(t => t.id === id);
      if (taskIndex >= 0) {
        tasks[taskIndex] = updatedTask;
        await this.unifiedStorage.writeFile(filename, JSON.stringify(tasks, null, 2));
      }

      // Also update legacy storage
      await this.legacyStorage.updateTask(id, updates);

      return {
        success: true,
        message: `✅ Task updated: ${updatedTask.title}`,
        task: updatedTask
      };
    } catch (error) {
      console.error('Error updating task:', error);
      return {
        success: false,
        message: `❌ Failed to update task: ${error.message}`
      };
    }
  }

  generateTaskId() {
    const serial = Math.floor(Math.random() * 90000) + 10000;
    return `TASK-${serial}`;
  }
}

// Legacy storage compatibility shim
class LegacyMemoryStorage {
  constructor(baseDir) {
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

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }
  
  detectComplexity(content) {
    if (content.length > 2000) return '4';
    if (content.length > 800) return '3';  
    if (content.length > 200) return '2';
    return '1';
  }

  generateMarkdownContent(memory) {
    const frontmatter = [
      '---',
      `id: ${memory.id}`,
      `timestamp: ${memory.timestamp}`,
      `complexity: ${memory.complexity}`,
      `category: ${memory.category}`,
      `project: ${memory.project}`,
      memory.tags && memory.tags.length > 0 ? `tags: [${memory.tags.map(t => `"${t}"`).join(', ')}]` : '',
      '---'
    ].filter(line => line !== '').join('\n');

    return `${frontmatter}\n${memory.content}`;
  }

  async addMemory(content, project = 'default', category, tags, priority) {
    const memory = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      content,
      project,
      category: category || 'personal',
      tags: tags || [],
      priority: priority || 'medium',
      complexity: this.detectComplexity(content)
    };

    const projectDir = path.join(this.baseDir, project);
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    const filename = `${memory.id}.md`;
    const filePath = path.join(projectDir, filename);
    const markdownContent = this.generateMarkdownContent(memory);
    
    fs.writeFileSync(filePath, markdownContent, 'utf8');
    
    return {
      id: memory.id,
      message: `✅ Memory saved to ${project}`,
      filepath: filePath
    };
  }
  
  async listMemories(filters = {}) {
    const memories = [];
    
    try {
      if (!fs.existsSync(this.baseDir)) return memories;
      
      const projects = filters.project 
        ? [filters.project] 
        : fs.readdirSync(this.baseDir).filter(p => 
            fs.statSync(path.join(this.baseDir, p)).isDirectory()
          );

      for (const project of projects) {
        const projectPath = path.join(this.baseDir, project);
        if (!fs.existsSync(projectPath)) continue;

        const files = fs.readdirSync(projectPath);
        for (const file of files) {
          if (file.endsWith('.md')) {
            const filePath = path.join(projectPath, file);
            const content = fs.readFileSync(filePath, 'utf8');
            const memory = this.parseMarkdownMemory(content, filePath);
            if (memory && this.matchesFilters(memory, filters)) {
              memories.push(memory);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error listing memories:', error);
    }

    return memories.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  parseMarkdownMemory(content, filepath) {
    try {
      const [frontmatterSection, ...contentParts] = content.split('---').slice(1);
      if (!frontmatterSection) return null;

      const memory = { filepath };
      const lines = frontmatterSection.trim().split('\n');
      
      for (const line of lines) {
        const [key, ...valueParts] = line.split(':');
        if (!key || !valueParts.length) continue;
        
        const value = valueParts.join(':').trim();
        
        switch (key.trim()) {
          case 'id': memory.id = value; break;
          case 'timestamp': memory.timestamp = value; break;
          case 'complexity': memory.complexity = value; break;
          case 'category': memory.category = value; break;
          case 'project': memory.project = value; break;
          case 'priority': memory.priority = value; break;
          case 'tags': memory.tags = this.parseTags(value); break;
        }
      }
      
      memory.content = contentParts.join('---').trim();
      return memory;
    } catch (error) {
      return null;
    }
  }

  parseTags(tagString) {
    try {
      if (tagString.startsWith('[') && tagString.endsWith(']')) {
        return tagString.slice(1, -1)
          .split(',')
          .map(t => t.trim().replace(/^"|"$/g, ''))
          .filter(t => t.length > 0);
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  matchesFilters(memory, filters) {
    if (filters.project && memory.project !== filters.project) return false;
    if (filters.category && memory.category !== filters.category) return false;
    if (filters.minComplexity && parseInt(memory.complexity || '1') < filters.minComplexity) return false;
    return true;
  }
  
  async deleteMemory(id) {
    const memory = await this.getMemory(id);
    if (memory && memory.filepath) {
      fs.unlinkSync(memory.filepath);
      return true;
    }
    return false;
  }

  async getMemory(id) {
    const memories = await this.listMemories();
    return memories.find(m => m.id === id);
  }

  async searchMemories(query) {
    const allMemories = await this.listMemories();
    return allMemories.filter(memory =>
      memory.content.toLowerCase().includes(query.toLowerCase()) ||
      (memory.tags && memory.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase())))
    );
  }
}

class LegacyTaskStorage {
  constructor(baseDir) {
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
      ...data
    };

    const projectDir = path.join(this.baseDir, task.project);
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    const tasksFile = path.join(projectDir, 'tasks.json');
    let tasks = [];
    
    if (fs.existsSync(tasksFile)) {
      tasks = JSON.parse(fs.readFileSync(tasksFile, 'utf8'));
    }
    
    tasks.push(task);
    fs.writeFileSync(tasksFile, JSON.stringify(tasks, null, 2), 'utf8');
    
    return {
      id: task.id,
      message: `✅ Task created: ${task.title}`,
      task
    };
  }
  
  async listTasks(filters = {}) {
    const allTasks = [];
    
    try {
      const projects = filters.project 
        ? [filters.project] 
        : fs.readdirSync(this.baseDir).filter(p => 
            fs.statSync(path.join(this.baseDir, p)).isDirectory()
          );

      for (const project of projects) {
        const tasksFile = path.join(this.baseDir, project, 'tasks.json');
        if (fs.existsSync(tasksFile)) {
          const tasks = JSON.parse(fs.readFileSync(tasksFile, 'utf8'));
          allTasks.push(...tasks.filter(task => {
            if (filters.status && task.status !== filters.status) return false;
            if (filters.priority && task.priority !== filters.priority) return false;
            return true;
          }));
        }
      }
    } catch (error) {
      console.error('Error listing tasks:', error);
    }

    return allTasks.sort((a, b) => new Date(b.created) - new Date(a.created));
  }
  
  async updateTask(id, updates) {
    return { success: false, message: 'Legacy update not implemented' };
  }
}

export { UnifiedMemoryStorage, UnifiedTaskStorage };