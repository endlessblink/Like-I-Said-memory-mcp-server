import chalk from 'chalk';
import figures from 'figures';

/**
 * Simple, clean formatter optimized for live monitoring
 * Prioritizes readability over fancy tables
 */

// Enhanced status icons and colors for maximum readability
const STATUS_DISPLAY = {
  todo: { icon: '●', color: chalk.white.bold, label: 'TODO' },
  in_progress: { icon: '▶▶', color: chalk.cyan.bold.inverse, label: ' ACTIVE ', prominent: true }, // Much more prominent
  done: { icon: '✓', color: chalk.green.bold, label: 'DONE' },
  blocked: { icon: '⚠', color: chalk.red.bold, label: 'BLOCKED' }
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
  
  // Group tasks by status for better visibility
  const activeTasks = filteredTasks.filter(task => task.status === 'in_progress');
  const todoTasks = filteredTasks.filter(task => task.status === 'todo');
  const blockedTasks = filteredTasks.filter(task => task.status === 'blocked');
  
  let output = '';
  
  // Header with better breakdown
  output += chalk.bold.blue(`📋 ${project} Tasks`) + chalk.gray(` (${filteredTasks.length} active)`);
  if (activeTasks.length > 0) {
    output += chalk.cyan.bold.inverse(` ${activeTasks.length} CURRENTLY ACTIVE `);
  }
  output += '\n' + '─'.repeat(Math.min(process.stdout.columns || 120, 120)) + '\n\n';
  
  // Show active tasks first with prominent styling
  if (activeTasks.length > 0) {
    output += chalk.cyan.bold.inverse(' 🔥 CURRENTLY ACTIVE ') + chalk.gray(` (${activeTasks.length})\n\n`);
    
    activeTasks.forEach(task => {
      const status = STATUS_DISPLAY.in_progress;
      const priority = PRIORITY_DISPLAY[task.priority || 'medium'] || PRIORITY_DISPLAY.medium;
      
      // Extra prominent format for active tasks with sub-project indicator
      const subProject = task.project ? task.project.replace(/^[^-]+-[^-]+-/, '') : '';
      const projectTag = subProject ? chalk.cyan.dim(`[${subProject}] `) : '';
      
      const taskLine = [
        status.color(`${status.icon} ${status.label}`),
        priority.color(priority.label),
        chalk.cyan.bold(task.id || 'NO-ID'),
        projectTag + chalk.white.bold(task.title || 'Untitled Task')
      ].join(' │ ');
      
      output += taskLine + '\n';
      
      if (task.description) {
        const desc = task.description.slice(0, 100) + (task.description.length > 100 ? '...' : '');
        output += chalk.cyan('    ➤ ' + desc) + '\n';
      }
      output += '\n';
    });
  }
  
  // Show todo tasks
  if (todoTasks.length > 0) {
    output += chalk.white.bold(' 📋 NEXT ACTIONS ') + chalk.gray(` (${todoTasks.length})\n\n`);
    
    todoTasks.forEach((task, index) => {
      const status = STATUS_DISPLAY.todo;
      const priority = PRIORITY_DISPLAY[task.priority || 'medium'] || PRIORITY_DISPLAY.medium;
      
      // Add sub-project indicator for todo tasks too
      const subProject = task.project ? task.project.replace(/^[^-]+-[^-]+-/, '') : '';
      const projectTag = subProject ? chalk.blue.dim(`[${subProject}] `) : '';
      
      const taskLine = [
        status.color(`${status.icon} ${status.label.padEnd(8)}`),
        priority.color(priority.label.padEnd(8)),
        chalk.blue.dim(task.id || 'NO-ID'),
        projectTag + chalk.white.bold(task.title || 'Untitled Task')
      ].join(' │ ');
      
      output += taskLine + '\n';
      
      if (task.description) {
        const desc = task.description.slice(0, 100) + (task.description.length > 100 ? '...' : '');
        output += chalk.gray('    ' + desc) + '\n';
      }
      
      // Add spacing between tasks (but less for todo to save space)
      if (index < todoTasks.length - 1) {
        output += '\n';
      }
    });
  }
  
  // Show blocked tasks if any
  if (blockedTasks.length > 0) {
    output += '\n\n' + chalk.red.bold(' ⚠ BLOCKED TASKS ') + chalk.gray(` (${blockedTasks.length})\n\n`);
    
    blockedTasks.forEach(task => {
      const status = STATUS_DISPLAY.blocked;
      const priority = PRIORITY_DISPLAY[task.priority || 'medium'] || PRIORITY_DISPLAY.medium;
      
      const taskLine = [
        status.color(`${status.icon} ${status.label.padEnd(8)}`),
        priority.color(priority.label.padEnd(8)),
        chalk.red.dim(task.id || 'NO-ID'),
        chalk.red(task.title || 'Untitled Task')
      ].join(' │ ');
      
      output += taskLine + '\n';
    });
  }
  
  return output;
}

export default {
  formatTasksForLiveMonitor
};