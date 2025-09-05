import chalk from 'chalk';
import Table from 'cli-table3';
import figures from 'figures';

/**
 * Terminal formatting utilities for task display
 * Provides color schemes, status icons, and table layouts
 */

// Status icons using cross-platform symbols
const STATUS_ICONS = {
  todo: figures.circle,
  in_progress: figures.play,
  done: figures.tick,
  blocked: figures.warning
};

// Status colors - enhanced for better visibility
const STATUS_COLORS = {
  todo: chalk.white.bold,           // Bright white instead of gray
  in_progress: chalk.cyan.bold,     // Bright cyan instead of blue
  done: chalk.green.bold,           // Bright green
  blocked: chalk.red.bold           // Bright red
};

// Priority colors - more vibrant and distinct
const PRIORITY_COLORS = {
  urgent: chalk.red.bold.inverse,   // Bright red with background
  high: chalk.yellow.bold,          // Bright yellow
  medium: chalk.cyan.bold,          // Bright cyan
  low: chalk.white.dim              // Dimmed white instead of gray
};

/**
 * Format a single task status with icon and color
 */
function formatStatus(status) {
  const icon = STATUS_ICONS[status] || figures.circle;
  const color = STATUS_COLORS[status] || chalk.white;
  return color(`${icon} ${status.replace('_', ' ')}`);
}

/**
 * Format priority with appropriate color
 */
function formatPriority(priority) {
  if (!priority) return chalk.gray('medium');
  const color = PRIORITY_COLORS[priority] || chalk.white;
  return color(priority);
}

/**
 * Truncate text to fit within specified width - enhanced for live monitoring
 */
function truncateText(text, maxWidth, liveMode = false) {
  if (!text) return '';
  if (text.length <= maxWidth) return text;
  
  // In live mode, be more conservative with truncation
  if (liveMode && text.length <= maxWidth + 5) {
    return text; // Show full text if only slightly over
  }
  
  return text.slice(0, maxWidth - 3) + '...';
}

/**
 * Get terminal width, with fallback
 */
function getTerminalWidth() {
  return process.stdout.columns || 80;
}

/**
 * Create a formatted table for tasks
 */
function createTaskTable(tasks, options = {}) {
  const terminalWidth = getTerminalWidth();
  const {
    showProject = true,
    showId = true,
    maxTitleWidth = null, // Let it be calculated automatically
    liveMonitorMode = false // Special mode for live monitoring
  } = options;

  // Calculate responsive column widths based on terminal size
  let statusWidth, priorityWidth, idWidth, titleWidth, projectWidth;
  
  if (liveMonitorMode) {
    // Live monitor mode: force wide columns for maximum readability
    statusWidth = 18; // Much wider for "in_progress" 
    priorityWidth = 12;
    idWidth = showId ? 18 : 0; // Much wider to show full TASK-RME-001
    
    if (showProject) {
      // Force generous fixed widths for live monitoring
      projectWidth = 40; // Force wide enough for "roughcut-mcp-enhancement"
      titleWidth = maxTitleWidth || 70; // Force wide title column
    } else {
      titleWidth = maxTitleWidth || 100;
      projectWidth = 0;
    }
  } else {
    // Original responsive calculation for regular usage
    statusWidth = 14;
    priorityWidth = 10;
    idWidth = 12;
    
    let remainingWidth = terminalWidth - statusWidth - priorityWidth;
    if (showId) remainingWidth -= idWidth;
    remainingWidth -= 10; // Account for borders and padding
    
    if (showProject) {
      projectWidth = Math.max(20, Math.min(25, Math.floor(remainingWidth * 0.3)));
      titleWidth = remainingWidth - projectWidth;
    } else {
      titleWidth = remainingWidth;
      projectWidth = 0;
    }
    
    // Ensure minimum widths
    titleWidth = Math.max(30, titleWidth);
    if (showProject) projectWidth = Math.max(20, projectWidth);
  }

  // Define table columns based on options
  const head = ['Status', 'Priority'];
  const colWidths = [statusWidth, priorityWidth];

  if (showId) {
    head.push('ID');
    colWidths.push(idWidth);
  }

  head.push('Title');
  colWidths.push(titleWidth);

  if (showProject) {
    head.push('Project');
    colWidths.push(projectWidth);
  }

  const table = new Table({
    head: head.map(h => chalk.bold.white(h)),
    colWidths,
    style: {
      head: [],
      border: ['gray'],
      compact: true
    },
    chars: {
      'top': '─',
      'top-mid': '┬',
      'top-left': '┌',
      'top-right': '┐',
      'bottom': '─',
      'bottom-mid': '┴',
      'bottom-left': '└',
      'bottom-right': '┘',
      'left': '│',
      'left-mid': '├',
      'mid': '─',
      'mid-mid': '┼',
      'right': '│',
      'right-mid': '┤',
      'middle': '│'
    }
  });

  // Add tasks to table
  tasks.forEach(task => {
    const row = [
      formatStatus(task.status || 'todo'),
      formatPriority(task.priority || 'medium')
    ];

    if (showId) {
      row.push(chalk.dim(task.serial || task.id || 'N/A'));
    }

    row.push(truncateText(task.title || 'Untitled', titleWidth - 2, liveMonitorMode));

    if (showProject) {
      row.push(chalk.blue.bold(truncateText(task.project || 'default', projectWidth - 2, liveMonitorMode)));
    }

    table.push(row);
  });

  return table;
}

/**
 * Format task summary header
 */
function formatSummaryHeader(tasks, filterStatus = null) {
  const total = tasks.length;
  const statusCounts = tasks.reduce((acc, task) => {
    const status = task.status || 'todo';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  let header = chalk.bold.white(`\n📋 Task List`);
  
  if (filterStatus) {
    header += chalk.gray(` (${filterStatus} only)`);
  }
  
  header += ` - ${total} task${total !== 1 ? 's' : ''}`;

  if (!filterStatus && total > 0) {
    const statusParts = Object.entries(statusCounts)
      .map(([status, count]) => {
        const color = STATUS_COLORS[status] || chalk.white;
        return color(`${count} ${status.replace('_', ' ')}`);
      });
    header += ` (${statusParts.join(', ')})`;
  }

  return header + '\n';
}

/**
 * Main function to format tasks for terminal display
 */
export function formatTasksForTerminal(tasks, options = {}) {
  const {
    filter = null, // 'active', 'todo', 'in_progress', etc.
    showProject = true,
    showId = true,
    showSummary = true
  } = options;

  // Filter tasks if requested
  let filteredTasks = tasks;
  if (filter === 'active') {
    filteredTasks = tasks.filter(task => 
      ['todo', 'in_progress'].includes(task.status)
    );
  } else if (filter) {
    filteredTasks = tasks.filter(task => task.status === filter);
  }

  // Handle empty results
  if (filteredTasks.length === 0) {
    let message = '✨ No tasks found';
    if (filter === 'active') {
      message = '✨ No active tasks! You\'re all caught up.';
    } else if (filter) {
      message = `✨ No tasks with status '${filter}'`;
    }
    return chalk.green(message);
  }

  // Build output
  let output = '';
  
  if (showSummary) {
    output += formatSummaryHeader(filteredTasks, filter);
  }

  // Create and add table
  const table = createTaskTable(filteredTasks, { showProject, showId });
  output += table.toString();

  // Add footer with helpful info
  output += '\n' + chalk.dim('💡 Tip: Use different filters to see all tasks, or focus on specific statuses');

  return output;
}

/**
 * Quick format for single task display
 */
export function formatSingleTask(task) {
  const status = formatStatus(task.status || 'todo');
  const priority = formatPriority(task.priority || 'medium');
  const title = chalk.white.bold(task.title || 'Untitled');
  const id = chalk.dim(`[${task.serial || task.id || 'N/A'}]`);
  
  let output = `${status} ${priority} ${title} ${id}`;
  
  if (task.project) {
    output += ` ${chalk.cyan(`(${task.project})`)}`;
  }
  
  if (task.description) {
    output += `\n  ${chalk.gray(truncateText(task.description, getTerminalWidth() - 4))}`;
  }
  
  return output;
}

export default {
  formatTasksForTerminal,
  formatSingleTask,
  STATUS_ICONS,
  STATUS_COLORS,
  PRIORITY_COLORS
};