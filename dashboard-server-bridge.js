#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar';
import { WebSocketServer } from 'ws';
import http from 'http';

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
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      // Handle both Unix (\n) and Windows (\r\n) line endings
      const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---([\s\S]*)$/;
      const match = content.match(frontmatterRegex);
      
      if (!match) {
        return null;
      }

      const [, frontmatter, bodyContent] = match;
      const memory = { content: bodyContent.trim(), metadata: {} };

      const lines = frontmatter.split(/\r?\n/);
      let inMetadata = false;

      lines.forEach(line => {
        if (line.trim() === 'metadata:') {
          inMetadata = true;
          return;
        }
        
        if (inMetadata && line.startsWith('  ')) {
          const metaLine = line.slice(2);
          const colonIndex = metaLine.indexOf(':');
          if (colonIndex === -1) return;
          
          const key = metaLine.slice(0, colonIndex).trim();
          const value = metaLine.slice(colonIndex + 1).trim();
          
          switch (key) {
            case 'content_type':
              memory.metadata.content_type = value;
              break;
            case 'language':
              memory.metadata.language = value;
              break;
            case 'size':
              memory.metadata.size = parseInt(value) || 0;
              break;
            case 'mermaid_diagram':
              memory.metadata.mermaid_diagram = value === 'true';
              break;
          }
          return;
        }
        
        inMetadata = false;
        
        const colonIndex = line.indexOf(':');
        if (colonIndex === -1) return;

        const key = line.slice(0, colonIndex).trim();
        const value = line.slice(colonIndex + 1).trim();

        switch (key) {
          case 'id':
            memory.id = value;
            break;
          case 'timestamp':
            memory.timestamp = value;
            break;
          case 'complexity':
            memory.complexity = parseInt(value) || 1;
            break;
          case 'category':
            memory.category = value;
            break;
          case 'priority':
            memory.priority = value;
            break;
          case 'status':
            memory.status = value;
            break;
          case 'access_count':
            memory.access_count = parseInt(value) || 0;
            break;
          case 'last_accessed':
            memory.last_accessed = value;
            break;
          case 'tags':
            if (value.startsWith('[') && value.endsWith(']')) {
              memory.tags = value.slice(1, -1).split(',').map(t => t.trim().replace(/['"]/g, ''));
            } else {
              memory.tags = value.split(',').map(t => t.trim()).filter(Boolean);
            }
            break;
          case 'related_memories':
            if (value.startsWith('[') && value.endsWith(']')) {
              memory.related_memories = value.slice(1, -1).split(',').map(t => t.trim().replace(/['"]/g, ''));
            } else {
              memory.related_memories = value.split(',').map(t => t.trim()).filter(Boolean);
            }
            break;
          case 'project':
            memory.project = value;
            break;
        }
      });

      // Add filename and filepath
      memory.filename = path.basename(filePath);
      memory.filepath = filePath;
      
      // Ensure metadata has required fields for frontend
      if (!memory.metadata) memory.metadata = {};
      if (!memory.metadata.clients) memory.metadata.clients = [];
      if (!memory.metadata.accessCount) memory.metadata.accessCount = memory.access_count || 0;
      if (!memory.metadata.created) memory.metadata.created = memory.timestamp;
      if (!memory.metadata.modified) memory.metadata.modified = memory.timestamp;
      if (!memory.metadata.lastAccessed) memory.metadata.lastAccessed = memory.last_accessed || memory.timestamp;
      if (!memory.metadata.contentType) memory.metadata.contentType = 'text';
      if (!memory.metadata.size) memory.metadata.size = memory.content.length;
      
      return memory;
    } catch (error) {
      console.error(`Error parsing ${filePath}:`, error);
      return null;
    }
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
    // For now, return method not supported since MCP server handles creation
    res.status(501).json({ 
      error: 'Memory creation handled by MCP server. Use MCP tools to create memories.',
      suggestion: 'Use the add_memory MCP tool from your AI client'
    });
  }

  async updateMemory(req, res) {
    // For now, return method not supported since MCP server handles updates
    res.status(501).json({ 
      error: 'Memory updates handled by MCP server. Use MCP tools to update memories.',
      suggestion: 'Delete and recreate the memory using MCP tools'
    });
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