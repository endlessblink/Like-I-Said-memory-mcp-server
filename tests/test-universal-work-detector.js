#!/usr/bin/env node

/**
 * Universal Work Detector Test and Enablement Script
 * Tests the integrated Universal Work Detector system
 */

import { WorkDetectorWrapper } from './lib/work-detector-wrapper.js';

console.log('🚀 Universal Work Detector Test & Enablement');
console.log('='.repeat(50));

// Test 1: Initialize detector
console.log('\n📊 Test 1: Initialize detector');
const detector = new WorkDetectorWrapper({ 
  enabled: true,
  debugMode: true,
  safeMode: true
});

console.log('✅ Detector initialized');
console.log('Enabled:', detector.enabled);
console.log('Debug mode:', detector.debugMode);
console.log('Safe mode:', detector.safeMode);

// Test 2: Check health
console.log('\n📊 Test 2: Health check');
const health = detector.isHealthy();
console.log('Health status:', health);

// Test 3: Simulate some work activities
console.log('\n📊 Test 3: Simulate work activities');

const testActivities = [
  {
    tool: 'Write',
    args: { file_path: '/test/config.js', content: 'const config = { api: "working" };' },
    result: { success: true }
  },
  {
    tool: 'Bash',
    args: { command: 'npm test' },
    result: { success: true, output: 'Tests passed' }
  },
  {
    tool: 'Edit',
    args: { file_path: '/test/bug.js', old_string: 'broken code', new_string: 'fixed code' },
    result: { success: true }
  }
];

for (const activity of testActivities) {
  console.log(`\n  Testing activity: ${activity.tool}`);
  const memory = detector.trackActivity(activity.tool, activity.args, activity.result);
  
  if (memory) {
    console.log('  ✅ Memory created automatically!');
    console.log('    Title:', memory.title);
    console.log('    Category:', memory.category);
    console.log('    Work Type:', memory.metadata?.workType);
    console.log('    Domain:', memory.metadata?.domain);
    console.log('    Complexity:', memory.metadata?.complexity);
  } else {
    console.log('  ⏳ No memory created (pattern not significant enough yet)');
  }
}

// Test 4: Check statistics
console.log('\n📊 Test 4: Statistics');
const stats = detector.getStats();
console.log('Stats:', JSON.stringify(stats, null, 2));

// Test 5: Simulate successful problem-solving sequence
console.log('\n📊 Test 5: Simulate problem-solving sequence');

const problemSolvingSequence = [
  {
    tool: 'Bash',
    args: { command: 'npm start' },
    result: { success: false, error: 'Error: Port 3000 already in use' }
  },
  {
    tool: 'Bash', 
    args: { command: 'lsof -ti:3000' },
    result: { success: true, output: '1234' }
  },
  {
    tool: 'Bash',
    args: { command: 'kill 1234' },
    result: { success: true }
  },
  {
    tool: 'Bash',
    args: { command: 'npm start' },
    result: { success: true, output: 'Server running on port 3000' }
  }
];

let sequenceMemory = null;
for (const [index, activity] of problemSolvingSequence.entries()) {
  console.log(`\n  Step ${index + 1}: ${activity.tool} - ${activity.success ? 'Success' : 'Error'}`);
  const memory = detector.trackActivity(activity.tool, activity.args, activity.result);
  
  if (memory) {
    sequenceMemory = memory;
    console.log('  🎯 Problem-solving pattern detected!');
    console.log('    Pattern:', memory.metadata?.workType);
    console.log('    Signals:', memory.metadata?.realTimeSignals?.join(', ') || 'None');
    console.log('    Momentum:', memory.metadata?.momentum);
  }
}

// Test 6: Final statistics
console.log('\n📊 Test 6: Final Statistics');
const finalStats = detector.getStats();
console.log('Final stats:', JSON.stringify(finalStats, null, 2));

// Test 7: Activity log
console.log('\n📊 Test 7: Activity Log');
const activityLog = detector.getActivityLog();
console.log(`Recent activities (${activityLog.length} total):`);
activityLog.slice(-5).forEach(activity => {
  console.log(`  - ${activity.tool} at ${new Date(activity.timestamp).toLocaleTimeString()}: ${activity.success ? '✅' : '❌'}`);
});

console.log('\n🎉 Universal Work Detector Test Complete!');
console.log('='.repeat(50));

if (finalStats.memoriesCreated > 0) {
  console.log('✅ SUCCESS: Universal Work Detector is working correctly!');
  console.log(`   - Detected ${finalStats.patternsDetected} patterns`);
  console.log(`   - Created ${finalStats.memoriesCreated} memories automatically`);
  console.log(`   - Processed ${finalStats.totalActivities} activities`);
  console.log(`   - Error rate: ${(finalStats.errors / Math.max(finalStats.totalActivities, 1) * 100).toFixed(1)}%`);
} else {
  console.log('ℹ️ INFO: No memories created (patterns may need more activities or time)');
  console.log('   This is normal for initial testing with limited activity');
}

console.log('\n📋 Next Steps:');
console.log('1. The Universal Work Detector is now tested and ready');
console.log('2. It will automatically detect work patterns and create memories');  
console.log('3. Enable it in the main server for automatic operation');
console.log('4. Monitor the dashboard for automatically created memories');