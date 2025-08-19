import { HybridTaskManager } from '../../src/v3/models/HybridTaskManager.js';
import { SQLiteManager } from '../../lib/sqlite-manager.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use the actual tasks directory
const tasksDir = path.join(__dirname, '..', '..', 'tasks');

async function manualTest() {
  console.log('🚀 V3 Manual Test - Creating Sample Hierarchy\n');
  
  const manager = new HybridTaskManager(tasksDir);
  
  try {
    // Initialize
    console.log('Initializing HybridTaskManager...');
    await manager.initialize();
    console.log('✅ Initialized successfully\n');
    
    // Create a master task for v3 development
    console.log('Creating V3 Development Master Task...');
    const masterTask = await manager.createTask({
      title: 'Like-I-Said V3 Development',
      description: 'Master task for tracking all V3 development work',
      level: 'master',
      project: 'like-i-said-v3'
    });
    console.log(`✅ Created: ${masterTask.title} (ID: ${masterTask.id})`);
    console.log(`   Path: ${masterTask.path}\n`);
    
    // Create Phase 1 Epic
    console.log('Creating Phase 1 Epic...');
    const phase1Epic = await manager.createTask({
      title: 'Phase 1: Core Hierarchy System',
      description: 'Basic hierarchical task management with SQLite integration',
      level: 'epic',
      parent_id: masterTask.id,
      project: 'like-i-said-v3'
    });
    console.log(`✅ Created: ${phase1Epic.title}`);
    console.log(`   Path: ${phase1Epic.path}\n`);
    
    // Create tasks under Phase 1
    const tasks = [
      {
        title: 'SQLite Integration',
        description: 'Set up Better-SQLite3 with WAL mode',
        status: 'done'
      },
      {
        title: 'Data Model & Storage',
        description: 'Implement HybridTaskManager class',
        status: 'done'
      },
      {
        title: 'MCP Tools',
        description: 'Create hierarchical MCP tools',
        status: 'in_progress'
      },
      {
        title: 'Basic UI',
        description: 'Build hierarchy view with React',
        status: 'todo'
      }
    ];
    
    console.log('Creating tasks under Phase 1...');
    for (const taskData of tasks) {
      const task = await manager.createTask({
        ...taskData,
        level: 'task',
        parent_id: phase1Epic.id,
        project: 'like-i-said-v3'
      });
      console.log(`✅ ${task.title} - Status: ${task.status}`);
    }
    
    // Get and display the task tree
    console.log('\n📊 Current Task Hierarchy:');
    console.log('==========================');
    
    const tree = await manager.getTaskTree();
    displayTree(tree, 0);
    
    // Show database stats
    const stats = manager.db.getStats();
    console.log('\n📈 Database Statistics:');
    console.log(`Total Tasks: ${stats.totalTasks}`);
    console.log(`Masters: ${stats.levelCounts.master || 0}`);
    console.log(`Epics: ${stats.levelCounts.epic || 0}`);
    console.log(`Tasks: ${stats.levelCounts.task || 0}`);
    console.log(`Subtasks: ${stats.levelCounts.subtask || 0}`);
    console.log(`DB Size: ${(stats.dbSize / 1024).toFixed(2)} KB`);
    
    console.log('\n✨ V3 is ready for manual testing!');
    console.log('\nYou can now:');
    console.log('1. Check the tasks/ directory to see the created files');
    console.log('2. Use the MCP tools (once created) to interact with the hierarchy');
    console.log('3. Build the React UI to visualize the task tree');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    manager.close();
  }
}

function displayTree(nodes, depth = 0) {
  const indent = '  '.repeat(depth);
  const levelIcons = {
    master: '📋',
    epic: '📁',
    task: '📄',
    subtask: '📝'
  };
  
  for (const node of nodes) {
    const icon = levelIcons[node.level] || '•';
    const status = node.status === 'done' ? '✅' : 
                   node.status === 'in_progress' ? '🔄' : 
                   node.status === 'blocked' ? '🚫' : '⭕';
    
    console.log(`${indent}${icon} ${node.title} ${status}`);
    console.log(`${indent}   └─ Path: ${node.path} | Project: ${node.project}`);
    
    if (node.children && node.children.length > 0) {
      displayTree(node.children, depth + 1);
    }
  }
}

// Run the manual test
manualTest().catch(console.error);