import chalk from 'chalk';
import figures from 'figures';

/**
 * Simple, clean formatter optimized for live monitoring
 * Prioritizes readability over fancy tables
 */

// Enhanced status icons and colors for maximum readability
const STATUS_DISPLAY = {
  todo: { icon: '●', color: chalk.white.bold, label: 'TODO', bg: chalk.bgGray },
  in_progress: { icon: '▶', color: chalk.cyan.bold, label: 'ACTIVE', bg: chalk.bgBlue },
  done: { icon: '✓', color: chalk.green.bold, label: 'DONE', bg: chalk.bgGreen },
  blocked: { icon: '⚠', color: chalk.red.bold, label: 'BLOCKED', bg: chalk.bgRed }
};

const PRIORITY_DISPLAY = {
  urgent: { color: chalk.red.bold.inverse, label: ' 🔥 URGENT ', bg: chalk.bgRed.white.bold },
  high: { color: chalk.yellow.bold.inverse, label: ' ⚡ HIGH ', bg: chalk.bgYellow.black.bold },
  medium: { color: chalk.blue.bold, label: ' MED ', bg: chalk.bgBlue.white },
  low: { color: chalk.gray.dim, label: ' low ', bg: chalk.gray }
};

/**
 * Format tasks for clean live monitoring display
 */
export function formatTasksForLiveMonitor(tasks, options = {}) {
  const { filter = null, project = null } = options;
  
  // Filter tasks
  let filteredTasks = tasks;
  if (filter === 'active') {
    filteredTasks = tasks.filter(task => ['todo', 'in_progress'].includes(task.status));
  } else if (filter) {
    filteredTasks = tasks.filter(task => task.status === filter);
  }
  
  if (filteredTasks.length === 0) {
    return chalk.green('✨ No active tasks! You\'re all caught up.');
  }
  
  // Create header
  let output = chalk.bold.blue(`📋 ${project} Tasks`) + chalk.gray(` (${filteredTasks.length} active)`);
  output += '\n' + '─'.repeat(Math.min(process.stdout.columns || 120, 120)) + '\n\n';
  
  // Format each task as a clean line
  filteredTasks.forEach((task, index) => {
    const status = STATUS_DISPLAY[task.status] || STATUS_DISPLAY.todo;
    const priority = PRIORITY_DISPLAY[task.priority || 'medium'] || PRIORITY_DISPLAY.medium;
    
    // Task line format: [ICON] ID | PRIORITY | TITLE
    const taskLine = [
      status.color(`${status.icon} ${status.label.padEnd(8)}`),
      priority.color(priority.label.padEnd(8)),
      chalk.blue.dim(task.id || 'NO-ID'),
      chalk.white.bold(task.title || 'Untitled Task')
    ].join(' │ ');
    
    output += taskLine + '\n';
    
    // Add description if it exists (indented)
    if (task.description && task.description.length > 0) {
      const desc = task.description.slice(0, 100) + (task.description.length > 100 ? '...' : '');
      output += chalk.gray('    ' + desc) + '\n';
    }
    
    // Add spacing between tasks
    if (index < filteredTasks.length - 1) {
      output += '\n';
    }
  });
  
  return output;
}

export default {
  formatTasksForLiveMonitor
};