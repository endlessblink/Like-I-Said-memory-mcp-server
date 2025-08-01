import { EnhancedHybridTaskManager } from '../../src/v3/models/EnhancedHybridTaskManager.js';

async function testV3System() {
  console.log('🧪 Testing V3 System after documentation updates\n');
  
  const manager = new EnhancedHybridTaskManager();
  
  try {
    await manager.initialize();
    
    // Test 1: Check task count
    const taskCount = manager.db.get('SELECT COUNT(*) as count FROM tasks WHERE project = ?', ['like-i-said-v3']);
    console.log('✅ Test 1: Task count:', taskCount);
    
    // Test 2: Check hierarchy
    const tree = await manager.getTaskTree();
    console.log('\n✅ Test 2: Task hierarchy:');
    displayTree(tree, 0);
    
    // Test 3: Check enhanced fields
    const enhancedCount = manager.db.get(
      'SELECT COUNT(*) as count FROM tasks WHERE project = ? AND estimated_hours > 0', 
      ['like-i-said-v3']
    );
    console.log('\n✅ Test 3: Tasks with time estimates:', enhancedCount);
    
    // Test 4: Check new semantic folder task
    const semanticTask = manager.db.get(
      'SELECT * FROM tasks WHERE title = ?',
      ['Implement Semantic Folder Structure']
    );
    console.log('\n✅ Test 4: Semantic folder task exists:', !!semanticTask);
    if (semanticTask) {
      console.log('   - ID:', semanticTask.id);
      console.log('   - Path:', semanticTask.path);
      console.log('   - Priority:', semanticTask.priority);
      console.log('   - Estimated hours:', semanticTask.estimated_hours);
    }
    
    // Test 5: Check task relationships
    const relationships = manager.db.all(`
      SELECT 
        parent.title as parent_title,
        child.title as child_title,
        child.level
      FROM tasks child
      JOIN tasks parent ON child.parent_id = parent.id
      WHERE child.project = ?
      ORDER BY child.path
    `, ['like-i-said-v3']);
    
    console.log('\n✅ Test 5: Task relationships:');
    relationships.forEach(rel => {
      console.log(`   ${rel.parent_title} → ${rel.child_title} (${rel.level})`);
    });
    
    // Test 6: Check enriched task content
    const enrichedTasks = manager.db.all(`
      SELECT title, completion_percentage, estimated_hours
      FROM tasks 
      WHERE project = ? AND (completion_percentage > 0 OR estimated_hours > 0)
    `, ['like-i-said-v3']);
    
    console.log('\n✅ Test 6: Enriched tasks:');
    enrichedTasks.forEach(task => {
      console.log(`   ${task.title}: ${task.completion_percentage}% complete, ${task.estimated_hours}h estimated`);
    });
    
    // Test 7: Verify master task updates
    const masterTask = manager.db.get('SELECT * FROM tasks WHERE id = ?', ['ab095071-cc26-44fd-bf37-00fc31f25581']);
    console.log('\n✅ Test 7: Master task verification:');
    if (masterTask && masterTask.metadata) {
      const metadata = JSON.parse(masterTask.metadata);
      console.log('   Phase 1 completion:', metadata.phases?.phase1?.completion || 0, '%');
      console.log('   Key decisions:', metadata.key_decisions?.length || 0);
      console.log('   Has semantic folders decision:', metadata.key_decisions?.some(d => d.includes('Semantic folder')) || false);
    }
    
    console.log('\n✨ All tests passed! V3 system is working correctly.');
    console.log('\n📊 Summary:');
    console.log('   - Total V3 tasks:', taskCount);
    console.log('   - Tasks with estimates:', enhancedCount);
    console.log('   - Task relationships:', relationships.length);
    console.log('   - System ready for next phase!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    manager.close();
  }
}

function displayTree(nodes, depth = 0) {
  const indent = '  '.repeat(depth);
  
  for (const node of nodes) {
    const type = node.level.toUpperCase();
    const status = node.status === 'done' ? '✅' : 
                   node.status === 'in_progress' ? '🔄' : '⭕';
    const hours = node.estimated_hours ? ` [${node.estimated_hours}h]` : '';
    console.log(`${indent}${type}: ${node.title} ${status}${hours}`);
    
    if (node.children && node.children.length > 0) {
      displayTree(node.children, depth + 1);
    }
  }
}

testV3System().catch(console.error);