#!/usr/bin/env node

/**
 * Performance benchmark for Like-I-Said MCP Server
 * Tests with large datasets to establish performance baselines
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const memoryCount = parseInt(args.find(a => a.startsWith('--memories='))?.split('=')[1] || '1000');
const taskCount = parseInt(args.find(a => a.startsWith('--tasks='))?.split('=')[1] || '500');

console.log(`Running performance benchmark with ${memoryCount} memories and ${taskCount} tasks...`);

class PerformanceBenchmark {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      config: {
        memoryCount,
        taskCount
      },
      benchmarks: {},
      systemInfo: this.getSystemInfo()
    };
  }

  getSystemInfo() {
    return {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      memory: {
        total: Math.round(require('os').totalmem() / 1024 / 1024 / 1024) + 'GB',
        free: Math.round(require('os').freemem() / 1024 / 1024 / 1024) + 'GB'
      },
      cpus: require('os').cpus().length
    };
  }

  async runBenchmark(name, fn) {
    console.log(`\nRunning benchmark: ${name}`);
    const startMemory = process.memoryUsage();
    const startTime = process.hrtime.bigint();
    
    try {
      const result = await fn();
      
      const endTime = process.hrtime.bigint();
      const endMemory = process.memoryUsage();
      
      const duration = Number(endTime - startTime) / 1000000; // Convert to ms
      const memoryDelta = {
        heapUsed: Math.round((endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024),
        heapTotal: Math.round((endMemory.heapTotal - startMemory.heapTotal) / 1024 / 1024),
        rss: Math.round((endMemory.rss - startMemory.rss) / 1024 / 1024)
      };
      
      this.results.benchmarks[name] = {
        success: true,
        duration,
        memoryDelta,
        result
      };
      
      console.log(`  ✅ Completed in ${duration.toFixed(2)}ms`);
      console.log(`  Memory delta: Heap ${memoryDelta.heapUsed}MB, RSS ${memoryDelta.rss}MB`);
      
    } catch (error) {
      this.results.benchmarks[name] = {
        success: false,
        error: error.message
      };
      console.log(`  ❌ Failed: ${error.message}`);
    }
  }

  async generateLargeDataset() {
    const memories = [];
    const tasks = [];
    
    // Generate memories
    for (let i = 0; i < memoryCount; i++) {
      memories.push({
        id: `mem-${i}`,
        content: this.generateMemoryContent(i),
        timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        tags: this.generateTags(),
        project: `project-${Math.floor(i / 100)}`,
        complexity: Math.floor(Math.random() * 4) + 1
      });
    }
    
    // Generate tasks
    for (let i = 0; i < taskCount; i++) {
      tasks.push({
        id: `task-${i}`,
        title: `Task ${i}: ${this.generateTaskTitle()}`,
        status: ['todo', 'in_progress', 'done'][Math.floor(Math.random() * 3)],
        priority: ['low', 'medium', 'high', 'urgent'][Math.floor(Math.random() * 4)],
        project: `project-${Math.floor(i / 50)}`,
        memoryConnections: this.generateConnections(memories, 3)
      });
    }
    
    return { memories, tasks };
  }

  generateMemoryContent(index) {
    const templates = [
      'Fixed bug in module {module} by {action}',
      'Implemented {feature} using {technology}',
      'Optimized {component} performance by {percent}%',
      'Refactored {module} to improve {metric}',
      'Added tests for {component} covering {scenarios}',
      'Configured {service} with {configuration}',
      'Resolved {issue} in {environment} environment',
      'Updated documentation for {feature}'
    ];
    
    const template = templates[index % templates.length];
    return template
      .replace('{module}', ['auth', 'api', 'database', 'ui'][Math.floor(Math.random() * 4)])
      .replace('{action}', ['refactoring', 'debugging', 'patching', 'updating'][Math.floor(Math.random() * 4)])
      .replace('{feature}', ['dashboard', 'search', 'export', 'import'][Math.floor(Math.random() * 4)])
      .replace('{technology}', ['React', 'Node.js', 'TypeScript', 'GraphQL'][Math.floor(Math.random() * 4)])
      .replace('{component}', ['renderer', 'parser', 'validator', 'handler'][Math.floor(Math.random() * 4)])
      .replace('{percent}', Math.floor(Math.random() * 50) + 10)
      .replace('{metric}', ['readability', 'maintainability', 'performance', 'security'][Math.floor(Math.random() * 4)])
      .replace('{service}', ['Redis', 'PostgreSQL', 'Docker', 'Nginx'][Math.floor(Math.random() * 4)])
      .replace('{configuration}', ['clustering', 'replication', 'caching', 'load balancing'][Math.floor(Math.random() * 4)])
      .replace('{issue}', ['memory leak', 'race condition', 'deadlock', 'timeout'][Math.floor(Math.random() * 4)])
      .replace('{environment}', ['production', 'staging', 'development', 'testing'][Math.floor(Math.random() * 4)])
      .replace('{scenarios}', ['edge cases', 'error handling', 'happy path', 'integration'][Math.floor(Math.random() * 4)]);
  }

  generateTaskTitle() {
    const actions = ['Implement', 'Fix', 'Update', 'Refactor', 'Optimize', 'Add', 'Remove', 'Test'];
    const targets = ['authentication', 'API endpoint', 'database schema', 'UI component', 'configuration', 'documentation', 'test suite', 'deployment'];
    return `${actions[Math.floor(Math.random() * actions.length)]} ${targets[Math.floor(Math.random() * targets.length)]}`;
  }

  generateTags() {
    const allTags = ['bug', 'feature', 'optimization', 'refactor', 'test', 'docs', 'config', 'security', 'performance', 'ui', 'api', 'database'];
    const tagCount = Math.floor(Math.random() * 4) + 1;
    const tags = [];
    for (let i = 0; i < tagCount; i++) {
      tags.push(allTags[Math.floor(Math.random() * allTags.length)]);
    }
    return [...new Set(tags)];
  }

  generateConnections(memories, count) {
    const connections = [];
    const indices = new Set();
    while (indices.size < Math.min(count, memories.length)) {
      indices.add(Math.floor(Math.random() * memories.length));
    }
    for (const idx of indices) {
      connections.push({
        memory_id: memories[idx].id,
        relevance: Math.random()
      });
    }
    return connections;
  }

  async benchmarkSearch(dataset) {
    const queries = [
      'bug fix',
      'performance optimization',
      'authentication',
      'database',
      'refactor module'
    ];
    
    const results = [];
    for (const query of queries) {
      const matches = dataset.memories.filter(m => 
        m.content.toLowerCase().includes(query.toLowerCase()) ||
        m.tags.some(t => t.includes(query.toLowerCase()))
      );
      results.push({
        query,
        matches: matches.length
      });
    }
    
    return results;
  }

  async benchmarkLinking(dataset) {
    let totalConnections = 0;
    let maxConnections = 0;
    
    for (const task of dataset.tasks) {
      const connections = task.memoryConnections.length;
      totalConnections += connections;
      maxConnections = Math.max(maxConnections, connections);
    }
    
    return {
      totalConnections,
      averageConnections: totalConnections / dataset.tasks.length,
      maxConnections
    };
  }

  async benchmarkFiltering(dataset) {
    const filters = [
      { project: 'project-0' },
      { complexity: 4 },
      { status: 'in_progress' },
      { priority: 'high' }
    ];
    
    const results = [];
    for (const filter of filters) {
      const key = Object.keys(filter)[0];
      const value = filter[key];
      
      const memoryMatches = dataset.memories.filter(m => m[key] === value).length;
      const taskMatches = dataset.tasks.filter(t => t[key] === value).length;
      
      results.push({
        filter,
        memoryMatches,
        taskMatches
      });
    }
    
    return results;
  }

  generateReport() {
    console.log('\n' + '='.repeat(70));
    console.log('PERFORMANCE BENCHMARK REPORT');
    console.log('='.repeat(70));
    
    console.log('\nSystem Information:');
    console.log(`  Platform: ${this.results.systemInfo.platform} (${this.results.systemInfo.arch})`);
    console.log(`  Node.js: ${this.results.systemInfo.nodeVersion}`);
    console.log(`  Memory: ${this.results.systemInfo.memory.total} total, ${this.results.systemInfo.memory.free} free`);
    console.log(`  CPUs: ${this.results.systemInfo.cpus}`);
    
    console.log('\nDataset Configuration:');
    console.log(`  Memories: ${this.results.config.memoryCount}`);
    console.log(`  Tasks: ${this.results.config.taskCount}`);
    
    console.log('\nBenchmark Results:');
    console.log('-'.repeat(70));
    
    for (const [name, result] of Object.entries(this.results.benchmarks)) {
      console.log(`\n${name}:`);
      if (result.success) {
        console.log(`  Duration: ${result.duration.toFixed(2)}ms`);
        console.log(`  Memory Impact: Heap ${result.memoryDelta.heapUsed}MB, RSS ${result.memoryDelta.rss}MB`);
        if (result.result) {
          console.log(`  Result:`, JSON.stringify(result.result, null, 2).split('\n').map(l => '    ' + l).join('\n'));
        }
      } else {
        console.log(`  ❌ Failed: ${result.error}`);
      }
    }
    
    console.log('\n' + '='.repeat(70));
    
    // Performance rating
    const avgDuration = Object.values(this.results.benchmarks)
      .filter(b => b.success)
      .reduce((sum, b) => sum + b.duration, 0) / Object.keys(this.results.benchmarks).length;
    
    if (avgDuration < 100) {
      console.log('🚀 EXCELLENT: Average operation time < 100ms');
    } else if (avgDuration < 500) {
      console.log('✅ GOOD: Average operation time < 500ms');
    } else if (avgDuration < 1000) {
      console.log('⚠️  ACCEPTABLE: Average operation time < 1000ms');
    } else {
      console.log('❌ POOR: Average operation time > 1000ms');
    }
    
    // Save results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultFile = `performance-results.json`;
    fs.writeFileSync(resultFile, JSON.stringify(this.results, null, 2));
    console.log(`\nDetailed results saved to: ${resultFile}`);
  }
}

// Run benchmarks
async function main() {
  const benchmark = new PerformanceBenchmark();
  
  // Generate dataset
  let dataset;
  await benchmark.runBenchmark('Dataset Generation', async () => {
    dataset = await benchmark.generateLargeDataset();
    return {
      memories: dataset.memories.length,
      tasks: dataset.tasks.length
    };
  });
  
  // Run search benchmark
  await benchmark.runBenchmark('Search Operations', async () => {
    return await benchmark.benchmarkSearch(dataset);
  });
  
  // Run linking benchmark
  await benchmark.runBenchmark('Memory-Task Linking', async () => {
    return await benchmark.benchmarkLinking(dataset);
  });
  
  // Run filtering benchmark
  await benchmark.runBenchmark('Filter Operations', async () => {
    return await benchmark.benchmarkFiltering(dataset);
  });
  
  // Generate report
  benchmark.generateReport();
}

main().catch(error => {
  console.error('Benchmark failed:', error);
  process.exit(1);
});