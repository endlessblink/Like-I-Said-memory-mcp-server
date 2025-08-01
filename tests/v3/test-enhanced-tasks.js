import { EnhancedHybridTaskManager } from '../../src/v3/models/EnhancedHybridTaskManager.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test data directory
const testTasksDir = path.join(__dirname, 'enhanced-test-tasks');

async function testEnhancedTasks() {
  console.log('🚀 Testing Enhanced Task Structure\n');
  
  // Clean up and create test directory
  if (fs.existsSync(testTasksDir)) {
    fs.rmSync(testTasksDir, { recursive: true });
  }
  fs.mkdirSync(testTasksDir, { recursive: true });
  
  const manager = new EnhancedHybridTaskManager(testTasksDir);
  
  try {
    await manager.initialize();
    console.log('✅ Enhanced manager initialized\n');
    
    // Create a rich master task
    console.log('Creating enhanced master task...');
    const masterTask = await manager.createTask({
      title: 'Like-I-Said V3 Development',
      description: `## Project Overview
The V3 release introduces hierarchical task management with a 4-level structure (Master → Epic → Task → Subtask) to better organize and track development work.

## Key Objectives
1. Implement hierarchical task structure with materialized paths
2. Create hybrid file-database storage for performance
3. Build intuitive UI for task hierarchy visualization
4. Maintain backward compatibility with V2`,
      
      level: 'master',
      project: 'like-i-said-v3',
      priority: 'high',
      status: 'in_progress',
      
      estimated_hours: 40,
      assignee: 'endlessblink',
      tags: ['v3', 'major-release', 'architecture'],
      
      acceptance_criteria: [
        'All V2 features remain functional',
        '4-level hierarchy fully implemented',
        'Performance handles 10,000+ tasks',
        'UI provides smooth navigation'
      ],
      
      technical_requirements: [
        'SQLite with WAL mode for performance',
        'React with virtualization for large lists',
        'MCP tools for hierarchical operations',
        'Comprehensive test coverage'
      ]
    });
    
    console.log(`✅ Created: ${masterTask.title}\n`);
    
    // Create an epic with rich content
    console.log('Creating enhanced epic...');
    const epicTask = await manager.createTask({
      title: 'Phase 1: Core Hierarchy System',
      description: `## Objective
Build the foundational infrastructure for hierarchical task management including storage, data model, and basic operations.

## Deliverables
- SQLite integration with performance optimizations
- Hybrid file-database synchronization
- Core MCP tools for hierarchy management
- Basic UI for visualization`,
      
      level: 'epic',
      parent_id: masterTask.id,
      project: 'like-i-said-v3',
      priority: 'high',
      status: 'in_progress',
      
      estimated_hours: 20,
      completion_percentage: 50,
      tags: ['phase-1', 'infrastructure', 'backend'],
      
      context: {
        documentation: '/docs/v3/architecture.md',
        related_files: [
          'lib/sqlite-manager.js',
          'src/v3/models/HybridTaskManager.js'
        ]
      }
    });
    
    console.log(`✅ Created: ${epicTask.title}\n`);
    
    // Create a detailed task
    console.log('Creating enhanced task with checklist...');
    const mcpTask = await manager.createTask({
      title: 'Implement Hierarchical MCP Tools',
      description: `## Overview
Create Model Context Protocol tools to expose V3 hierarchical task management functionality to AI assistants.

## Implementation Plan
We need to create 6 core tools that maintain backward compatibility while adding new hierarchical capabilities.`,
      
      level: 'task',
      parent_id: epicTask.id,
      project: 'like-i-said-v3',
      priority: 'high',
      status: 'todo',
      
      estimated_hours: 6,
      tags: ['mcp', 'api', 'tools'],
      dependencies: [], // Would normally reference other task IDs
      
      checklist: [
        'Design tool interfaces',
        'Implement create_master_task tool',
        'Implement create_epic tool',
        'Implement move_task_hierarchy with cycle detection',
        'Implement get_task_tree tool',
        'Add comprehensive error handling',
        'Write integration tests',
        'Update documentation'
      ],
      
      acceptance_criteria: [
        'All tools appear in MCP tool list',
        'Cycle detection prevents invalid moves',
        'Tools handle 4-level hierarchy correctly',
        'Error messages are clear and actionable'
      ],
      
      technical_requirements: [
        'Use Zod for input validation',
        'Follow existing MCP patterns',
        'Implement proper error codes',
        'Include usage examples in descriptions'
      ],
      
      metadata: {
        estimated_complexity: 'medium',
        requires_review: true,
        breaking_changes: false
      }
    });
    
    console.log(`✅ Created: ${mcpTask.title}\n`);
    
    // Display the created task files
    console.log('📁 Created Task Files:\n');
    
    const files = fs.readdirSync(path.join(testTasksDir, 'like-i-said-v3'));
    for (const file of files) {
      const filepath = path.join(testTasksDir, 'like-i-said-v3', file);
      const content = fs.readFileSync(filepath, 'utf8');
      
      console.log(`=== ${file} ===`);
      console.log(content);
      console.log('');
    }
    
    // Get enhanced task with all data
    console.log('📊 Enhanced Task Data:\n');
    const enhancedTask = await manager.getEnhancedTask(mcpTask.id);
    
    console.log('Task:', enhancedTask.title);
    console.log('Status:', enhancedTask.status);
    console.log('Estimated Hours:', enhancedTask.estimated_hours);
    console.log('Tags:', enhancedTask.tags);
    console.log('Checklist Items:', enhancedTask.checklist.length);
    console.log('Recent Activity:', enhancedTask.recent_activity.map(a => `${a.action} at ${a.created_at}`));
    
    console.log('\n✨ Enhanced task structure demonstration complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    manager.close();
    // Clean up
    if (fs.existsSync(testTasksDir)) {
      fs.rmSync(testTasksDir, { recursive: true });
    }
  }
}

// Run the test
testEnhancedTasks().catch(console.error);