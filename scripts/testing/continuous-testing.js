#!/usr/bin/env node

/**
 * Continuous Testing Script for Like-I-Said MCP Server v2
 * 
 * Watches for file changes and automatically runs appropriate tests
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const chokidar = require('chokidar');

class ContinuousTesting {
  constructor() {
    this.isRunning = false;
    this.testQueue = new Set();
    this.debounceTimer = null;
    this.lastTestResult = null;
  }

  start() {
    console.log('🔄 Starting continuous testing...');
    console.log('📁 Watching files for changes...');
    
    // Watch patterns
    const watchPatterns = [
      'src/**/*.{ts,tsx,js,jsx}',
      'lib/**/*.js',
      'server-markdown.js',
      'dashboard-server-bridge.js',
      'tests/**/*.test.js'
    ];

    // Initialize file watcher
    const watcher = chokidar.watch(watchPatterns, {
      ignored: ['node_modules/**', 'dist/**', '.git/**'],
      persistent: true,
      ignoreInitial: true
    });

    watcher.on('change', (filePath) => {
      this.handleFileChange(filePath);
    });

    watcher.on('add', (filePath) => {
      this.handleFileChange(filePath);
    });

    // Initial test run
    console.log('🧪 Running initial test suite...');
    this.runTests(['quick']);

    console.log('');
    console.log('📋 Commands:');
    console.log('  r + Enter: Run regression tests');
    console.log('  q + Enter: Quit');
    console.log('  i + Enter: Run import tests only');
    console.log('  m + Enter: Run MCP tests only');
    console.log('');

    // Handle user input
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (key) => {
      this.handleUserInput(key.toString());
    });
  }

  handleFileChange(filePath) {
    console.log(`📝 File changed: ${path.relative(process.cwd(), filePath)}`);
    
    // Determine which tests to run based on file type
    const testType = this.determineTestType(filePath);
    this.queueTest(testType);
    
    // Debounce test execution
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.runQueuedTests();
    }, 1000);
  }

  determineTestType(filePath) {
    const relativePath = path.relative(process.cwd(), filePath);
    
    if (relativePath.startsWith('src/')) {
      return 'imports';
    } else if (relativePath.includes('server-markdown.js') || relativePath.startsWith('lib/')) {
      return 'mcp-regression';
    } else if (relativePath.startsWith('tests/')) {
      return 'regression';
    } else {
      return 'quick';
    }
  }

  queueTest(testType) {
    this.testQueue.add(testType);
  }

  runQueuedTests() {
    if (this.isRunning || this.testQueue.size === 0) return;
    
    const tests = Array.from(this.testQueue);
    this.testQueue.clear();
    
    // Optimize test execution
    let testsToRun;
    if (tests.includes('regression')) {
      testsToRun = ['regression'];
    } else if (tests.includes('quick')) {
      testsToRun = ['quick'];
    } else {
      testsToRun = [...new Set(tests)];
    }
    
    this.runTests(testsToRun);
  }

  runTests(testTypes) {
    if (this.isRunning) return;
    
    this.isRunning = true;
    const startTime = Date.now();
    
    console.log(`🧪 Running tests: ${testTypes.join(', ')}`);
    
    // Convert test types to npm scripts
    const commands = testTypes.map(type => {
      switch (type) {
        case 'imports': return 'npm run test:imports --silent';
        case 'mcp-regression': return 'npm run test:mcp-regression --silent';
        case 'regression': return 'npm run test:regression --silent';
        case 'quick': return 'npm run test:quick --silent';
        default: return 'npm run test:quick --silent';
      }
    });

    // Run tests sequentially
    this.runCommandSequence(commands, (success) => {
      const duration = Date.now() - startTime;
      const durationStr = `${(duration / 1000).toFixed(1)}s`;
      
      if (success) {
        console.log(`✅ All tests passed (${durationStr})`);
        this.lastTestResult = 'passed';
      } else {
        console.log(`❌ Tests failed (${durationStr})`);
        this.lastTestResult = 'failed';
      }
      
      this.isRunning = false;
      console.log('📁 Watching for changes...');
    });
  }

  runCommandSequence(commands, callback) {
    let index = 0;
    
    const runNext = () => {
      if (index >= commands.length) {
        callback(true);
        return;
      }
      
      const [cmd, ...args] = commands[index].split(' ');
      const proc = spawn(cmd, args, { 
        stdio: ['inherit', 'pipe', 'pipe'],
        shell: true 
      });
      
      let output = '';
      proc.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      proc.stderr.on('data', (data) => {
        output += data.toString();
      });
      
      proc.on('close', (code) => {
        if (code !== 0) {
          console.log(`❌ Command failed: ${commands[index]}`);
          if (output) console.log(output);
          callback(false);
          return;
        }
        
        index++;
        runNext();
      });
    };
    
    runNext();
  }

  handleUserInput(key) {
    switch (key.toLowerCase()) {
      case 'r':
        console.log('🔄 Running regression tests...');
        this.runTests(['regression']);
        break;
      case 'i':
        console.log('🔄 Running import tests...');
        this.runTests(['imports']);
        break;
      case 'm':
        console.log('🔄 Running MCP tests...');
        this.runTests(['mcp-regression']);
        break;
      case 'q':
      case '\u0003': // Ctrl+C
        console.log('👋 Goodbye!');
        process.exit(0);
        break;
      case '\r':
      case '\n':
        // Ignore Enter key
        break;
      default:
        // Ignore other keys
        break;
    }
  }
}

// Start continuous testing
const continuousTesting = new ContinuousTesting();
continuousTesting.start();