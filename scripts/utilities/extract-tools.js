#!/usr/bin/env node

import fs from 'fs';

const content = fs.readFileSync('server-markdown.js', 'utf8');

// Extract all tool definitions
const toolMatches = content.match(/name:\s*'([^']+)'/g) || [];
const toolNames = toolMatches
  .map(match => match.match(/name:\s*'([^']+)'/)[1])
  .filter(name => name && !['like-i-said-memory-v2', 'default', 'active', 'medium', 'none', 'text', '✅', '❌', 'Never', 'Yes', 'No'].includes(name))
  .filter((name, index, arr) => arr.indexOf(name) === index)
  .sort();

console.log('=== ALL TOOLS FROM OLD SERVER ===');
console.log('Total tools found:', toolNames.length);
console.log();
toolNames.forEach((name, i) => {
  console.log(`${(i+1).toString().padStart(2, ' ')}. ${name}`);
});

console.log('\n=== TOOLS BY CATEGORY ===');

const coreTools = [
  'add_memory', 'get_memory', 'list_memories', 'search_memories', 'delete_memory',
  'create_task', 'update_task', 'list_tasks', 'get_task_context', 'delete_task',
  'test_tool'
];

const aiTools = [
  'enhance_memory_ollama', 'batch_enhance_memories_ollama', 'batch_enhance_tasks_ollama',
  'check_ollama_status', 'generate_dropoff', 'analyze_performance'
];

const advancedTools = [
  'deduplicate_memories', 'batch_enhance_memories', 'enhance_memory_metadata',
  'smart_status_update', 'validate_task_workflow', 'get_task_status_analytics',
  'work_detector_control', 'suggest_improvements', 'get_automation_suggestions',
  'enforce_proactive_memory', 'update_strategies', 'get_current_paths',
  'set_memory_path', 'set_task_path'
];

console.log('\nCORE TOOLS (Essential):');
coreTools.forEach(tool => {
  if (toolNames.includes(tool)) {
    console.log(`  ✅ ${tool}`);
  } else {
    console.log(`  ❌ ${tool} (missing)`);
  }
});

console.log('\nAI TOOLS (Ollama/Enhanced):');
aiTools.forEach(tool => {
  if (toolNames.includes(tool)) {
    console.log(`  ✅ ${tool}`);
  } else {
    console.log(`  ❌ ${tool} (missing)`);
  }
});

console.log('\nADVANCED TOOLS (Optional):');
advancedTools.forEach(tool => {
  if (toolNames.includes(tool)) {
    console.log(`  ✅ ${tool}`);
  } else {
    console.log(`  ❌ ${tool} (missing)`);
  }
});

console.log('\nOTHER TOOLS:');
const categorized = [...coreTools, ...aiTools, ...advancedTools];
const otherTools = toolNames.filter(tool => !categorized.includes(tool));
otherTools.forEach(tool => {
  console.log(`  ? ${tool}`);
});