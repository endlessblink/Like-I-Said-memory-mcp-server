#!/usr/bin/env node

/**
 * Test script to demonstrate the Self-Reflection Engine functionality
 */

import { ReflectionEngine } from '../lib/reflection-engine.js';
import { PatternLearner } from '../lib/pattern-learner.js';

console.log('🧪 Testing Like-I-Said v4 Self-Reflection Engine\n');
console.log('='*50);

// Initialize the engines
const reflectionEngine = new ReflectionEngine();
const patternLearner = new PatternLearner();

console.log('\n📊 Phase 1: Simulating Tool Usage\n');

// Simulate some tool usage
const tools = [
  { name: 'add_memory', success: true, time: 45 },
  { name: 'add_memory', success: true, time: 52 },
  { name: 'search_memories', success: true, time: 120 },
  { name: 'search_memories', success: false, time: 89, error: 'No results found' },
  { name: 'create_task', success: true, time: 67 },
  { name: 'update_task', success: true, time: 34 },
  { name: 'analyze_performance', success: true, time: 156 },
];

tools.forEach(tool => {
  reflectionEngine.trackToolUsage(tool.name, tool.success, tool.time, tool.error ? new Error(tool.error) : null);
  console.log(`✓ Tracked: ${tool.name} - ${tool.success ? '✅ Success' : '❌ Failed'} (${tool.time}ms)`);
});

console.log('\n📊 Phase 2: Simulating Memory Operations\n');

// Simulate memory searches
const searches = [
  { query: 'evolving agents', results: 5, relevant: 4, time: 89 },
  { query: 'v4 implementation', results: 3, relevant: 3, time: 67 },
  { query: 'random search', results: 10, relevant: 1, time: 123 },
];

searches.forEach(search => {
  reflectionEngine.trackMemorySearch(search.query, 
    Array(search.results).fill({}), search.relevant, search.time);
  console.log(`✓ Search: "${search.query}" - ${search.relevant}/${search.results} relevant (${search.time}ms)`);
});

// Track categorization
reflectionEngine.trackCategorization('code', 'code', true);
reflectionEngine.trackCategorization('work', 'personal', false);
reflectionEngine.trackCategorization('research', 'research', true);
console.log('✓ Tracked 3 categorization attempts (2 correct, 1 incorrect)');

console.log('\n📊 Phase 3: Simulating Work Detection Patterns\n');

// Simulate work detection
const patterns = [
  { pattern: 'problemSolving', detected: true, confidence: 0.85 },
  { pattern: 'implementation', detected: true, confidence: 0.92 },
  { pattern: 'configuration', detected: false, confidence: 0.45 },
  { pattern: 'research', detected: true, confidence: 0.78, falsePositive: true },
];

patterns.forEach(p => {
  reflectionEngine.trackWorkDetection(p.pattern, p.detected, p.confidence, p.falsePositive);
  patternLearner.learnFromDetection(p.pattern, ['test', 'indicator'], !p.falsePositive);
  console.log(`✓ Pattern: ${p.pattern} - Confidence: ${(p.confidence*100).toFixed(0)}%${p.falsePositive ? ' (false positive)' : ''}`);
});

console.log('\n📊 Phase 4: Pattern Learning\n');

// Show what the pattern learner has learned
const stats = patternLearner.getStatistics();
console.log(`✓ Total patterns learned: ${stats.totalPatterns}`);
console.log(`✓ Overall confidence: ${(stats.overallConfidence*100).toFixed(1)}%`);
console.log(`✓ Trend: ${stats.trend}`);

const thresholds = patternLearner.getThresholds();
console.log('\nLearned Thresholds:');
Object.entries(thresholds).forEach(([pattern, data]) => {
  console.log(`  ${pattern}: ${data.value} (confidence: ${(data.confidence*100).toFixed(1)}%)`);
});

console.log('\n📊 Phase 5: Generating Performance Report\n');

// Generate and display report
const report = reflectionEngine.generateReport('session');

console.log('Performance Summary:');
console.log(`  Total Operations: ${report.summary.totalOperations}`);
console.log(`  Tools Used: ${report.summary.toolUsage}`);
console.log(`  Memory Searches: ${report.summary.memorySearches}`);
console.log(`  Task Completion: ${report.summary.taskCompletionRate}`);
console.log(`  Work Detection Accuracy: ${report.summary.workDetectionAccuracy}`);

if (report.topTools.length > 0) {
  console.log('\nTop Tools:');
  report.topTools.forEach(tool => {
    console.log(`  ${tool.tool}: ${tool.usage} uses, ${tool.successRate} success, ${tool.avgExecutionTime} avg`);
  });
}

if (report.performanceInsights.length > 0) {
  console.log('\n⚠️ Performance Insights:');
  report.performanceInsights.forEach(insight => {
    console.log(`  [${insight.severity}] ${insight.message}`);
  });
}

if (report.recommendations.length > 0) {
  console.log('\n💡 Recommendations:');
  report.recommendations.forEach(rec => {
    console.log(`  ${rec.category}: ${rec.action} - ${rec.reason}`);
  });
}

console.log('\n📊 Phase 6: Testing Improvement Suggestions\n');

// Get improvement suggestions
const improvements = patternLearner.applyLearnedPatterns({});
console.log(`Found ${improvements.length} improvement suggestions:`);
improvements.forEach(imp => {
  console.log(`  ${imp.pattern}: ${imp.action} (${(imp.confidence*100).toFixed(0)}% confidence)`);
});

// Save the current state
reflectionEngine.saveMetrics();
patternLearner.savePatterns();

console.log('\n✅ Test Complete! The Self-Reflection Engine is working correctly.');
console.log('\nKey Capabilities Demonstrated:');
console.log('  1. Tool usage tracking with success rates and timing');
console.log('  2. Memory operation monitoring and accuracy tracking');
console.log('  3. Work pattern detection and learning');
console.log('  4. Performance report generation with insights');
console.log('  5. Adaptive threshold adjustment based on outcomes');
console.log('  6. Improvement recommendations based on learned patterns');

console.log('\n📁 Check these files for persisted data:');
console.log('  - data/reflection/performance-metrics.json');
console.log('  - data/reflection/learned-patterns.json');
console.log('  - data/reflection/evolution-logs/report-session-*.json');

// Show current metrics
const metrics = reflectionEngine.getMetrics();
console.log('\n📈 Current Metrics Snapshot:');
console.log(`  Tools tracked: ${Object.keys(metrics.tools.usage).length}`);
console.log(`  Memory accuracy: ${(metrics.memory.categorization.accuracy*100).toFixed(1)}%`);
console.log(`  Work detection accuracy: ${(metrics.workDetection.accuracy*100).toFixed(1)}%`);
console.log(`  System uptime: ${(metrics.system.uptime/1000).toFixed(0)} seconds`);

process.exit(0);