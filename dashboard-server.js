import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Simple memory configuration
const memoryConfig = {
  baseDir: process.env.MEMORY_DIR || path.join(process.cwd(), 'memories'),
  currentProject: process.env.PROJECT_NAME || 'default'
};

// ALWAYS use simple HTML dashboard (skip broken React build)
console.log('⚡ Using simple HTML dashboard (no build errors)');
app.get('/', (req, res) => {
  const simpleDashboard = path.join(__dirname, 'simple-dashboard.html');
  if (fs.existsSync(simpleDashboard)) {
    res.sendFile(simpleDashboard);
  } else {
    res.send(`
      <h1>Like-I-Said MCP v2 Dashboard</h1>
      <p>✅ Dashboard server is running!</p>
      <p>🔧 API available at: <a href="/api/memories">/api/memories</a></p>
      <p>📋 Available tools: add_memory, get_memory, list_memories, delete_memory, search_memories, test_tool</p>
      <style>body{font-family:system-ui;padding:20px;background:#1a1a1a;color:#fff;}</style>
    `);
  }
});

app.use(express.json());

console.log(`Dashboard API Server starting...`);
console.log(`Memory directory: ${memoryConfig.baseDir}`);
console.log(`Current project: ${memoryConfig.currentProject}`);

// Load memories from JSON file (same format as server.js)
function loadMemoriesFromJSON() {
  try {
    const memoriesFile = path.join(__dirname, 'memories.json');
    if (fs.existsSync(memoriesFile)) {
      const data = fs.readFileSync(memoriesFile, 'utf8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Error loading memories:', error);
    return [];
  }
}

function saveMemoriesToJSON(memories) {
  try {
    const memoriesFile = path.join(__dirname, 'memories.json');
    fs.writeFileSync(memoriesFile, JSON.stringify(memories, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving memories:', error);
    return false;
  }
}

// API Endpoints
app.get('/api/memories', async (req, res) => {
  try {
    // Try JSON format first (from server.js), fallback to memory manager
    const jsonMemories = loadMemoriesFromJSON();
    if (jsonMemories.length > 0) {
      res.json(jsonMemories);
      return;
    }

    // Fallback to memory manager
    const { scope = 'all', search } = req.query;
    if (search) {
      const results = await memoryManager.searchMemories(search, scope);
      res.json(results);
    } else {
      const memories = await memoryManager.listMemories('', scope);
      res.json(memories);
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/memories', async (req, res) => {
  try {
    const { content, tags, key, value, context } = req.body;
    
    // Handle new JSON format
    if (content) {
      const memories = loadMemoriesFromJSON();
      const newMemory = {
        id: Date.now().toString(),
        content: content,
        tags: tags || [],
        timestamp: new Date().toISOString()
      };
      memories.push(newMemory);
      
      if (saveMemoriesToJSON(memories)) {
        res.json({ success: true, memory: newMemory });
      } else {
        throw new Error('Failed to save memory');
      }
      return;
    }
    
    // Fallback to old format
    const memory = await memoryManager.addMemory(key, value, context);
    res.json({ success: true, memory });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/memories/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value, context } = req.body;
    
    // Delete existing and create new (for simplicity)
    const deleted = await memoryManager.deleteMemory(key, context?.scope);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Memory not found' });
    }
    
    const memory = await memoryManager.addMemory(key, value, context);
    res.json({ success: true, memory });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/memories/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { scope } = req.query;
    
    const deleted = await memoryManager.deleteMemory(key, scope);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Memory not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// New endpoints for enhanced functionality
app.get('/api/memories/graph', async (req, res) => {
  try {
    const graph = await memoryManager.getMemoryGraph();
    res.json(graph);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/projects', async (req, res) => {
  try {
    const projects = memoryManager.listProjects();
    res.json({ 
      projects, 
      current: memoryManager.currentProject 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/projects/:project/switch', async (req, res) => {
  try {
    const { project } = req.params;
    memoryManager.setProject(project);
    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Dashboard server running at http://localhost:${PORT}`);
});
