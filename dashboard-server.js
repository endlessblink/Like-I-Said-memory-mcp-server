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

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
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

    // Return empty array if no JSON memories found
    res.json([]);
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
    
    // Fallback: return error for old format
    throw new Error('Legacy memory format not supported');
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/memories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { content, tags } = req.body;
    
    const memories = loadMemoriesFromJSON();
    const memoryIndex = memories.findIndex(m => m.id === id);
    
    if (memoryIndex === -1) {
      return res.status(404).json({ success: false, error: 'Memory not found' });
    }
    
    memories[memoryIndex] = {
      ...memories[memoryIndex],
      content: content || memories[memoryIndex].content,
      tags: tags || memories[memoryIndex].tags,
      timestamp: new Date().toISOString()
    };
    
    if (saveMemoriesToJSON(memories)) {
      res.json({ success: true, memory: memories[memoryIndex] });
    } else {
      throw new Error('Failed to update memory');
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/memories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const memories = loadMemoriesFromJSON();
    const memoryIndex = memories.findIndex(m => m.id === id);
    
    if (memoryIndex === -1) {
      return res.status(404).json({ success: false, error: 'Memory not found' });
    }
    
    memories.splice(memoryIndex, 1);
    
    if (saveMemoriesToJSON(memories)) {
      res.json({ success: true });
    } else {
      throw new Error('Failed to delete memory');
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Enhanced endpoints (simplified)
app.get('/api/memories/graph', (req, res) => {
  try {
    const memories = loadMemoriesFromJSON();
    const graph = {
      nodes: memories.map(m => ({ id: m.id, content: m.content.substring(0, 50) + '...' })),
      links: []
    };
    res.json(graph);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/projects/:project/switch', (req, res) => {
  try {
    const { project } = req.params;
    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Projects endpoint (simple version)
app.get('/api/projects', (req, res) => {
  res.json({ 
    projects: ['default'], 
    current: 'default' 
  });
});

app.listen(PORT, () => {
  console.log(`Dashboard server running at http://localhost:${PORT}`);
});
