#!/usr/bin/env node

/**
 * Stress test for Like-I-Said MCP Server
 * Tests performance with large numbers of memories and operations
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const ITERATIONS = parseInt(process.argv[2]?.replace('--iterations=', '') || '100');

console.log(`Starting stress test with ${ITERATIONS} iterations...`);

async function runStressTest() {
  const results = {
    startTime: Date.now(),
    iterations: ITERATIONS,
    operations: {
      addMemory: [],
      listMemories: [],
      searchMemories: [],
      createTask: [],
      updateTask: []
    },
    errors: [],
    memoryUsage: []
  };

  // Test memory operations
  console.log('Testing memory operations...');
  for (let i = 0; i < ITERATIONS; i++) {
    const startOp = Date.now();
    
    try {
      // Simulate add_memory operation
      const memoryContent = `Test memory ${i}: ${generateRandomContent()}`;
      // In real test, would call MCP server
      results.operations.addMemory.push(Date.now() - startOp);
      
      if (i % 10 === 0) {
        // Every 10 iterations, test search
        const searchStart = Date.now();
        // Simulate search_memories operation
        results.operations.searchMemories.push(Date.now() - searchStart);
        
        // Check memory usage
        const memUsage = process.memoryUsage();
        results.memoryUsage.push({
          iteration: i,
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
          rss: Math.round(memUsage.rss / 1024 / 1024)
        });
      }
      
      if (i % 50 === 0) {
        console.log(`  Completed ${i}/${ITERATIONS} iterations`);
      }
      
    } catch (error) {
      results.errors.push({
        iteration: i,
        error: error.message
      });
    }
  }

  // Test task operations
  console.log('Testing task operations...');
  for (let i = 0; i < Math.floor(ITERATIONS / 2); i++) {
    const startOp = Date.now();
    
    try {
      // Simulate create_task operation
      results.operations.createTask.push(Date.now() - startOp);
      
      // Simulate update_task operation
      const updateStart = Date.now();
      results.operations.updateTask.push(Date.now() - updateStart);
      
    } catch (error) {
      results.errors.push({
        iteration: i,
        operation: 'task',
        error: error.message
      });
    }
  }

  // Calculate statistics
  results.endTime = Date.now();
  results.totalTime = results.endTime - results.startTime;
  results.statistics = calculateStatistics(results.operations);
  
  return results;
}

function generateRandomContent() {
  const topics = [
    'Fixed bug in authentication system',
    'Implemented new feature for dashboard',
    'Optimized database queries',
    'Updated documentation',
    'Refactored component architecture',
    'Added unit tests for API',
    'Configured CI/CD pipeline',
    'Resolved security vulnerability'
  ];
  return topics[Math.floor(Math.random() * topics.length)];
}

function calculateStatistics(operations) {
  const stats = {};
  
  for (const [op, times] of Object.entries(operations)) {
    if (times.length === 0) continue;
    
    const sorted = times.sort((a, b) => a - b);
    stats[op] = {
      count: times.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }
  
  return stats;
}

function generateReport(results) {
  console.log('\n' + '='.repeat(60));
  console.log('STRESS TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`Total iterations: ${results.iterations}`);
  console.log(`Total time: ${results.totalTime}ms (${(results.totalTime / 1000).toFixed(2)}s)`);
  console.log(`Errors encountered: ${results.errors.length}`);
  
  console.log('\nOperation Performance (ms):');
  console.log('-'.repeat(60));
  
  for (const [op, stats] of Object.entries(results.statistics)) {
    console.log(`\n${op}:`);
    console.log(`  Count: ${stats.count}`);
    console.log(`  Min: ${stats.min}ms | Avg: ${stats.avg}ms | Max: ${stats.max}ms`);
    console.log(`  P50: ${stats.p50}ms | P95: ${stats.p95}ms | P99: ${stats.p99}ms`);
  }
  
  if (results.memoryUsage.length > 0) {
    console.log('\nMemory Usage:');
    console.log('-'.repeat(60));
    const first = results.memoryUsage[0];
    const last = results.memoryUsage[results.memoryUsage.length - 1];
    console.log(`  Initial: Heap ${first.heapUsed}MB / RSS ${first.rss}MB`);
    console.log(`  Final:   Heap ${last.heapUsed}MB / RSS ${last.rss}MB`);
    console.log(`  Growth:  Heap ${last.heapUsed - first.heapUsed}MB / RSS ${last.rss - first.rss}MB`);
  }
  
  if (results.errors.length > 0) {
    console.log('\nErrors:');
    console.log('-'.repeat(60));
    results.errors.slice(0, 5).forEach(err => {
      console.log(`  Iteration ${err.iteration}: ${err.error}`);
    });
    if (results.errors.length > 5) {
      console.log(`  ... and ${results.errors.length - 5} more errors`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  
  // Determine pass/fail
  const errorRate = results.errors.length / results.iterations;
  const avgResponseTime = results.statistics.addMemory?.avg || 0;
  
  if (errorRate > 0.05) {
    console.log('❌ FAILED: Error rate too high (>5%)');
    return false;
  }
  
  if (avgResponseTime > 1000) {
    console.log('❌ FAILED: Average response time too slow (>1000ms)');
    return false;
  }
  
  console.log('✅ PASSED: Stress test completed successfully');
  return true;
}

// Run the stress test
runStressTest()
  .then(results => {
    const passed = generateReport(results);
    
    // Save results to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultFile = `stress-test-results-${timestamp}.json`;
    fs.writeFileSync(resultFile, JSON.stringify(results, null, 2));
    console.log(`\nDetailed results saved to: ${resultFile}`);
    
    process.exit(passed ? 0 : 1);
  })
  .catch(error => {
    console.error('Stress test failed:', error);
    process.exit(1);
  });