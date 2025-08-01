import { EnhancedHybridTaskManager } from '../src/v3/models/EnhancedHybridTaskManager.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Task enrichment data
const taskEnrichments = {
  'SQLite Integration': {
    description: `## Objective
Set up Better-SQLite3 with proper configuration for V3 hierarchical task management

## What Was Implemented
- Better-SQLite3 v11.7.2 installation with locked version
- WAL mode configuration for concurrent access
- Database schema with materialized paths
- Performance optimizations (cache, temp_store)`,
    
    acceptance_criteria: [
      'Better-SQLite3 installed and working',
      'WAL mode enabled and verified',
      'Schema supports 4-level hierarchy',
      'Materialized paths working correctly',
      'Performance optimizations applied'
    ],
    
    technical_requirements: [
      'Use Better-SQLite3 v11.7.2 (locked version)',
      'Enable WAL mode immediately on connection',
      'Create indexes for all query fields',
      'Support 10,000+ tasks efficiently'
    ],
    
    estimated_hours: 4,
    actual_hours: 3,
    completion_percentage: 100,
    tags: ['backend', 'database', 'sqlite', 'infrastructure'],
    
    metadata: {
      tech_specs: {
        library: 'better-sqlite3',
        version: '11.7.2',
        wal_mode: true,
        performance_settings: {
          cache_size: 1000000,
          temp_store: 'memory',
          synchronous: 'NORMAL'
        }
      }
    }
  },
  
  'Data Model & Storage': {
    description: `## Objective
Implement hybrid file-database storage system for hierarchical tasks

## What Was Implemented
- HybridTaskManager class with file-database sync
- Debounced file watching (250ms)
- Materialized path calculations
- Cycle detection for move operations
- Transaction-based sync operations`,
    
    acceptance_criteria: [
      'Files remain source of truth',
      'SQLite provides fast querying',
      'File changes sync to database automatically',
      'Database changes persist to files',
      'No data loss during sync operations'
    ],
    
    technical_requirements: [
      'Use chokidar for file watching',
      'Implement debounced sync queue',
      'All multi-operations in transactions',
      'Support concurrent file access',
      'Handle sync conflicts gracefully'
    ],
    
    estimated_hours: 6,
    actual_hours: 5,
    completion_percentage: 100,
    tags: ['backend', 'storage', 'sync', 'architecture'],
    
    metadata: {
      key_files: [
        'src/v3/models/HybridTaskManager.js',
        'lib/sqlite-manager.js'
      ],
      patterns: ['event-driven', 'transaction-safe', 'debounced-sync']
    }
  },
  
  'MCP Tools': {
    description: `## Objective
Create Model Context Protocol tools to expose V3 hierarchical task management

## Tools to Implement
1. **create_master_task** - Create top-level master tasks
2. **create_epic** - Create epics under masters  
3. **create_hierarchical_task** - Create task with parent reference
4. **move_task_hierarchy** - Move tasks between parents with cycle detection
5. **get_task_tree** - Retrieve hierarchical structure
6. **update_task_status** - Update with status propagation to parents

## Integration Requirements
- Maintain full backward compatibility with V2 tools
- Use EnhancedHybridTaskManager for all operations
- Return hierarchical structure in responses where appropriate`,
    
    acceptance_criteria: [
      'All 6 hierarchical tools implemented',
      'Tools appear in MCP tool list',
      'Cycle detection prevents invalid moves',
      'Status propagation works correctly',
      'Backward compatible with V2',
      'Comprehensive error handling'
    ],
    
    technical_requirements: [
      'Follow MCP tool patterns from V2',
      'Use Zod for input validation',
      'Implement proper error codes',
      'Include tool descriptions and examples',
      'Test with actual MCP client'
    ],
    
    estimated_hours: 6,
    actual_hours: 0,
    completion_percentage: 0,
    tags: ['mcp', 'api', 'tools', 'integration'],
    dependencies: ['cde87c6c-2014-402e-b0a0-68b350cfcdef'], // Data Model task
    
    checklist: [
      'Create tool definitions',
      'Implement tool handlers',
      'Add input validation',
      'Write tool tests',
      'Update server-markdown.js',
      'Test with MCP client'
    ],
    
    metadata: {
      error_codes: {
        HIERARCHY_CYCLE_DETECTED: 'Operation would create cycle',
        INVALID_PARENT_LEVEL: 'Parent-child level mismatch',
        MAX_DEPTH_EXCEEDED: 'Maximum 4-level depth exceeded',
        TASK_NOT_FOUND: 'Task ID not found'
      }
    }
  },
  
  'Basic UI': {
    description: `## Objective
Build a performant hierarchical task view for the React dashboard

## UI Requirements
- Display 4-level task hierarchy with proper indentation
- Virtual scrolling for 10,000+ tasks
- Expand/collapse at each level with state persistence
- Visual status indicators and progress bars
- Keyboard navigation support
- Future: Drag-and-drop capability

## Technical Approach
- Use react-window for virtualization
- Implement custom tree walker for flat list conversion
- Cache expanded states in localStorage
- Lazy load children for performance`,
    
    acceptance_criteria: [
      'Renders 10,000+ tasks smoothly',
      'Expand/collapse works at all levels',
      'Status icons show correctly',
      'Keyboard navigation implemented',
      'Responsive design for mobile',
      'Integrates with existing dashboard'
    ],
    
    technical_requirements: [
      'Use react-window FixedSizeList',
      'Implement dynamic height calculation',
      'Support real-time updates via WebSocket',
      'Follow existing UI patterns',
      'TypeScript with proper types',
      'Performance budget: <200ms render'
    ],
    
    estimated_hours: 8,
    actual_hours: 0,
    completion_percentage: 0,
    tags: ['frontend', 'react', 'ui', 'virtualization'],
    dependencies: ['a6adcdbd-7b64-4e27-a410-31ab04276336'], // MCP Tools
    
    checklist: [
      'Set up component structure',
      'Implement tree data structure',
      'Add virtualization',
      'Create tree node component',
      'Add expand/collapse logic',
      'Implement keyboard navigation',
      'Add status indicators',
      'Style with Tailwind',
      'Add to dashboard router',
      'Write component tests'
    ],
    
    context: {
      related_files: [
        'src/components/VirtualizedTaskTree.tsx',
        'src/components/TaskNode.tsx',
        'src/hooks/useTaskTree.ts'
      ],
      documentation: '/docs/v3/ui-design.md',
      design_references: [
        'Linear.app hierarchy',
        'VS Code file explorer',
        'Notion page tree'
      ]
    },
    
    metadata: {
      component: 'VirtualizedTaskTree',
      library: 'react-window',
      performance_target: '< 200ms for 10k tasks',
      icons: {
        master: '📋',
        epic: '📁', 
        task: '📄',
        subtask: '📝'
      }
    }
  }
};

async function enrichTasks() {
  console.log('🚀 Enriching V3 Tasks with Detailed Content\n');
  
  const manager = new EnhancedHybridTaskManager();
  
  try {
    await manager.initialize();
    console.log('✅ Enhanced manager initialized\n');
    
    // Get all V3 tasks
    const v3Tasks = manager.db.all(`
      SELECT * FROM tasks 
      WHERE project = 'like-i-said-v3'
      ORDER BY path
    `);
    
    console.log(`Found ${v3Tasks.length} V3 tasks to enrich:\n`);
    
    for (const task of v3Tasks) {
      const enrichment = taskEnrichments[task.title];
      
      if (enrichment) {
        console.log(`📝 Enriching: ${task.title}`);
        
        // Update task with enriched data
        await manager.updateTask(task.id, {
          estimated_hours: enrichment.estimated_hours,
          actual_hours: enrichment.actual_hours,
          completion_percentage: enrichment.completion_percentage,
          tags: enrichment.tags,
          due_date: enrichment.due_date,
          assignee: enrichment.assignee
        });
        
        // Add dependencies if any
        if (enrichment.dependencies) {
          await manager.addDependencies(task.id, enrichment.dependencies);
        }
        
        // Add checklist items if any
        if (enrichment.checklist) {
          await manager.addChecklistItems(task.id, enrichment.checklist);
        }
        
        // Update the file with rich content
        const enrichedTask = {
          ...task,
          description: enrichment.description,
          acceptance_criteria: enrichment.acceptance_criteria,
          technical_requirements: enrichment.technical_requirements,
          checklist: enrichment.checklist,
          context: enrichment.context,
          metadata: { ...JSON.parse(task.metadata || '{}'), ...enrichment.metadata },
          tags: enrichment.tags,
          estimated_hours: enrichment.estimated_hours,
          dependencies: enrichment.dependencies
        };
        
        await manager.saveEnhancedTaskToFile(enrichedTask);
        
        // Log enrichment activity
        await manager.logActivity(task.id, 'enriched', {
          added_fields: Object.keys(enrichment).length,
          has_checklist: !!enrichment.checklist,
          has_dependencies: !!enrichment.dependencies
        });
        
        console.log(`   ✅ Added ${enrichment.acceptance_criteria?.length || 0} acceptance criteria`);
        console.log(`   ✅ Added ${enrichment.technical_requirements?.length || 0} technical requirements`);
        console.log(`   ✅ Set completion: ${enrichment.completion_percentage}%`);
        console.log(`   ✅ Estimated hours: ${enrichment.estimated_hours}`);
        if (enrichment.checklist) {
          console.log(`   ✅ Added ${enrichment.checklist.length} checklist items`);
        }
        console.log('');
      } else {
        console.log(`⏭️  Skipping: ${task.title} (no enrichment data)\n`);
      }
    }
    
    // Display enhanced task tree
    console.log('\n📊 Enhanced Task Hierarchy:');
    console.log('==========================\n');
    
    const tree = await manager.getTaskTree();
    displayEnhancedTree(tree, 0);
    
    // Show enrichment summary
    const enrichedTasks = manager.db.all(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN estimated_hours > 0 THEN 1 ELSE 0 END) as with_estimates,
        SUM(CASE WHEN completion_percentage = 100 THEN 1 ELSE 0 END) as completed,
        SUM(estimated_hours) as total_estimated_hours,
        SUM(actual_hours) as total_actual_hours
      FROM tasks 
      WHERE project = 'like-i-said-v3'
    `)[0];
    
    console.log('\n📈 Enrichment Summary:');
    console.log(`Total V3 Tasks: ${enrichedTasks.total}`);
    console.log(`Tasks with estimates: ${enrichedTasks.with_estimates}`);
    console.log(`Completed tasks: ${enrichedTasks.completed}`);
    console.log(`Total estimated hours: ${enrichedTasks.total_estimated_hours}`);
    console.log(`Total actual hours: ${enrichedTasks.total_actual_hours}`);
    
    console.log('\n✨ Task enrichment complete!');
    console.log('\nEnriched tasks now have:');
    console.log('- Detailed descriptions with objectives');
    console.log('- Acceptance criteria checklists');
    console.log('- Technical requirements');
    console.log('- Time estimates and tracking');
    console.log('- Dependencies and tags');
    console.log('- Rich context and metadata');
    
  } catch (error) {
    console.error('❌ Enrichment failed:', error);
  } finally {
    manager.close();
  }
}

function displayEnhancedTree(nodes, depth = 0) {
  const indent = '  '.repeat(depth);
  
  for (const node of nodes) {
    const status = node.completion_percentage === 100 ? '✅' : 
                   node.completion_percentage > 0 ? `📊 ${node.completion_percentage}%` : 
                   node.status === 'in_progress' ? '🔄' : '⭕';
    
    const hours = node.estimated_hours ? ` [${node.estimated_hours}h]` : '';
    const tags = node.tags ? ` {${JSON.parse(node.tags).join(', ')}}` : '';
    
    console.log(`${indent}${node.title} ${status}${hours}${tags}`);
    
    if (node.children && node.children.length > 0) {
      displayEnhancedTree(node.children, depth + 1);
    }
  }
}

// Run the enrichment
enrichTasks().catch(console.error);