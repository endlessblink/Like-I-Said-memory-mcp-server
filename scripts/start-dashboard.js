#!/usr/bin/env node

import { spawn } from 'child_process';
import chalk from 'chalk';

console.log(chalk.blue.bold('\n🚀 Starting Like-I-Said Dashboard...\n'));

// Start the dashboard server
const dashboard = spawn('npm', ['run', 'start:dashboard'], {
  stdio: 'inherit',
  shell: true
});

// Wait a moment for the server to start, then show the correct URL
setTimeout(() => {
  console.log(chalk.green.bold('\n✨ Dashboard is ready! ✨\n'));
  console.log(chalk.yellow('Access the dashboard at:'));
  console.log(chalk.cyan.bold('  ➜  http://localhost:3002\n'));
  console.log(chalk.gray('Press Ctrl+C to stop the server\n'));
}, 3000);

// Handle exit
dashboard.on('exit', (code) => {
  console.log(chalk.red(`\nDashboard stopped with code ${code}`));
  process.exit(code);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log(chalk.yellow('\nStopping dashboard...'));
  dashboard.kill('SIGINT');
});