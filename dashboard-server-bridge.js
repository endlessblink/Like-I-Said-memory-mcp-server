#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar';
import { WebSocketServer } from 'ws';
import http from 'http';
import { MemoryFormat } from './lib/memory-format.js';

// Enhanced dashboard server with real-time MCP bridge
class DashboardBridge {
  constructor(port = 3001) {
    this.port = port;
    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });
    this.clients = new Set();
    this.memoriesDir = 'memories';
    this.setupExpress();
    this.setupWebSocket();
    this.setupFileWatcher();
  }

  setupExpress() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static('dist'));

    // API Routes
    this.app.get('/api/memories', this.getMemories.bind(this));
    this.app.get('/api/memories/:id', this.getMemory.bind(this));
    this.app.post('/api/memories', this.createMemory.bind(this));
    this.app.put('/api/memories/:id', this.updateMemory.bind(this));
    this.app.delete('/api/memories/:id', this.deleteMemory.bind(this));
    this.app.get('/api/projects', this.getProjects.bind(this));
    this.app.get('/api/status', this.getStatus.bind(this));

    // Serve React app for non-API routes
    this.app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  setupWebSocket() {
    this.wss.on('connection', (ws) => {
      console.log('📡 Dashboard client connected');
      this.clients.add(ws);
      
      // Send current status
      ws.send(JSON.stringify({
        type: 'status',
        data: { connected: true, memories: this.countMemories() }
      }));

      ws.on('close', () => {
        console.log('📡 Dashboard client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });
    });
  }

  setupFileWatcher() {
    if (!fs.existsSync(this.memoriesDir)) {
      fs.mkdirSync(this.memoriesDir, { recursive: true });
    }

    // Watch for markdown file changes
    this.watcher = chokidar.watch(`${this.memoriesDir}/**/*.md`, {
      ignored: /[\/\\]\./,
      persistent: true,
      ignoreInitial: false
    });

    this.watcher
      .on('add', (filePath) => {
        console.log('📄 Memory file added:', path.basename(filePath));
        this.broadcastChange('add', filePath);
      })
      .on('change', (filePath) => {
        console.log('📝 Memory file changed:', path.basename(filePath));
        this.broadcastChange('change', filePath);
      })
      .on('unlink', (filePath) => {
        console.log('🗑️ Memory file deleted:', path.basename(filePath));
        this.broadcastChange('delete', filePath);
      });

    console.log('👀 File watcher started for memories directory');
  }

  broadcastChange(type, filePath) {
    const message = {
      type: 'file_change',
      data: {
        action: type,
        file: path.basename(filePath),
        project: path.basename(path.dirname(filePath)),
        timestamp: new Date().toISOString()
      }
    };

    // Broadcast to all connected WebSocket clients
    this.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(JSON.stringify(message));
      }
    });
  }

  countMemories() {
    let count = 0;
    if (fs.existsSync(this.memoriesDir)) {
      const projects = fs.readdirSync(this.memoriesDir);
      for (const project of projects) {
        const projectPath = path.join(this.memoriesDir, project);
        if (fs.statSync(projectPath).isDirectory()) {
          const files = fs.readdirSync(projectPath).filter(f => f.endsWith('.md'));
          count += files.length;
        }
      }
    }
    return count;
  }

  parseMarkdownFile(filePath) {
    // Use the shared memory format parser
    return MemoryFormat.parseMemoryFile(filePath);
  }

  async getMemories(req, res) {
    try {
      const memories = [];
      const { project } = req.query;
      
      if (!fs.existsSync(this.memoriesDir)) {
        return res.json([]);
      }

      const projects = fs.readdirSync(this.memoriesDir).filter(dir => {
        const dirPath = path.join(this.memoriesDir, dir);
        return fs.statSync(dirPath).isDirectory();
      });

      for (const proj of projects) {
        if (project && proj !== project) continue;
        
        const projectPath = path.join(this.memoriesDir, proj);
        const files = fs.readdirSync(projectPath).filter(f => f.endsWith('.md'));
        
        for (const file of files) {
          const filePath = path.join(projectPath, file);
          const memory = this.parseMarkdownFile(filePath);
          if (memory) {
            memory.project = proj === 'default' ? undefined : proj;
            memories.push(memory);
          }
        }
      }

      // Sort by timestamp (newest first)
      memories.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      res.json(memories);
    } catch (error) {
      console.error('Error getting memories:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getMemory(req, res) {
    try {
      const { id } = req.params;
      const memories = await this.getAllMemories();
      const memory = memories.find(m => m.id === id);
      
      if (!memory) {
        return res.status(404).json({ error: 'Memory not found' });
      }
      
      res.json(memory);
    } catch (error) {
      console.error('Error getting memory:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getAllMemories() {
    const memories = [];
    
    if (!fs.existsSync(this.memoriesDir)) {
      return memories;
    }

    const projects = fs.readdirSync(this.memoriesDir).filter(dir => {
      const dirPath = path.join(this.memoriesDir, dir);
      return fs.statSync(dirPath).isDirectory();
    });

    for (const project of projects) {
      const projectPath = path.join(this.memoriesDir, project);
      const files = fs.readdirSync(projectPath).filter(f => f.endsWith('.md'));
      
      for (const file of files) {
        const filePath = path.join(projectPath, file);
        const memory = this.parseMarkdownFile(filePath);
        if (memory) {
          memory.project = project === 'default' ? undefined : project;
          memories.push(memory);
        }
      }
    }
    
    return memories;
  }

  async createMemory(req, res) {
    try {
      const { content, tags = [], category, project } = req.body;
      
      if (!content || !content.trim()) {
        return res.status(400).json({ error: 'Content is required' });
      }

      // Generate unique ID
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 15);
      const id = `${timestamp}${randomStr}`;
      
      // Create filename
      const titleSlug = content.trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 40);
      const shortId = timestamp.toString().slice(-6);
      const filename = `${new Date().toISOString().split('T')[0]}-${titleSlug}-${shortId}.md`;
      
      // Determine project directory
      const projectDir = project || 'default';
      const projectPath = path.join(this.memoriesDir, projectDir);
      
      // Ensure project directory exists
      if (!fs.existsSync(projectPath)) {
        fs.mkdirSync(projectPath, { recursive: true });
      }
      
      // Create memory object
      const memory = {
        id,
        content: content.trim(),
        timestamp: new Date().toISOString(),
        complexity: 1,
        category: category || undefined,
        project: project && project !== 'default' ? project : undefined,
        tags: tags || [],
        priority: 'medium',
        status: 'active',
        access_count: 0,
        last_accessed: new Date().toISOString(),
        metadata: {
          content_type: 'text',
          size: content.length,
          mermaid_diagram: false
        }
      };
      
      // Generate standardized markdown content
      const fileContent = MemoryFormat.generateMarkdownContent(memory);
      
      // Write markdown file
      const filePath = path.join(projectPath, filename);
      fs.writeFileSync(filePath, fileContent, 'utf8');
      
      // Return created memory
      const createdMemory = this.parseMarkdownFile(filePath);
      res.status(201).json(createdMemory);
      
    } catch (error) {
      console.error('Error creating memory:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async updateMemory(req, res) {
    try {
      const { id } = req.params;
      const { content, tags = [] } = req.body;
      
      if (!content || !content.trim()) {
        return res.status(400).json({ error: 'Content is required' });
      }
      
      // Find the memory file
      const memories = await this.getAllMemories();
      const memory = memories.find(m => m.id === id);
      
      if (!memory) {
        return res.status(404).json({ error: 'Memory not found' });
      }
      
      // Update memory object with new content
      memory.content = content.trim();
      memory.tags = tags || [];
      memory.timestamp = new Date().toISOString();
      memory.last_accessed = new Date().toISOString();
      memory.metadata.size = content.length;
      
      // Generate standardized markdown content
      const fileContent = MemoryFormat.generateMarkdownContent(memory);
      
      // Write updated file
      fs.writeFileSync(memory.filepath, fileContent, 'utf8');
      
      // Return updated memory
      const updatedMemory = this.parseMarkdownFile(memory.filepath);
      res.json(updatedMemory);
      
    } catch (error) {
      console.error('Error updating memory:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async deleteMemory(req, res) {
    try {
      const { id } = req.params;
      const memories = await this.getAllMemories();
      const memory = memories.find(m => m.id === id);
      
      if (!memory) {
        return res.status(404).json({ error: 'Memory not found' });
      }
      
      // Delete the markdown file
      fs.unlinkSync(memory.filepath);
      
      res.json({ success: true, message: 'Memory deleted successfully' });
    } catch (error) {
      console.error('Error deleting memory:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getProjects(req, res) {
    try {
      const projects = [];
      
      if (fs.existsSync(this.memoriesDir)) {
        const dirs = fs.readdirSync(this.memoriesDir).filter(dir => {
          const dirPath = path.join(this.memoriesDir, dir);
          return fs.statSync(dirPath).isDirectory();
        });
        
        for (const dir of dirs) {
          const projectPath = path.join(this.memoriesDir, dir);
          const files = fs.readdirSync(projectPath).filter(f => f.endsWith('.md'));
          
          projects.push({
            name: dir === 'default' ? 'Default' : dir,
            id: dir,
            count: files.length
          });
        }
      }
      
      res.json(projects);
    } catch (error) {
      console.error('Error getting projects:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async getStatus(req, res) {
    try {
      const status = {
        server: 'Dashboard Bridge',
        version: '2.0.3',
        storage: 'markdown',
        memories: this.countMemories(),
        projects: fs.existsSync(this.memoriesDir) ? fs.readdirSync(this.memoriesDir).length : 0,
        websocket_clients: this.clients.size,
        file_watcher: !!this.watcher
      };
      
      res.json(status);
    } catch (error) {
      console.error('Error getting status:', error);
      res.status(500).json({ error: error.message });
    }
  }

  start() {
    this.server.listen(this.port, () => {
      console.log(`🌉 Dashboard Bridge Server running on port ${this.port}`);
      console.log(`📊 Dashboard: http://localhost:${this.port}`);
      console.log(`🔌 WebSocket: ws://localhost:${this.port}`);
      console.log(`📁 Watching: ${path.resolve(this.memoriesDir)}`);
    });
  }

  stop() {
    if (this.watcher) {
      this.watcher.close();
    }
    this.wss.close();
    this.server.close();
  }
}

// Start the bridge server
const bridge = new DashboardBridge(3001);
bridge.start();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Dashboard Bridge...');
  bridge.stop();
  process.exit(0);
});

export default DashboardBridge;