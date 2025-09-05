# Terminal Task List Feature

A beautiful, color-coded terminal display for your task management in Claude Code.

## Quick Start

The easiest way to use this feature is through Claude Code MCP tools:

```
list_tasks format=terminal filter=active
```

This shows all active tasks (todo + in_progress) in a nice terminal table with colors and icons.

## Usage Examples

### Show Active Tasks (Recommended)
```
list_tasks format=terminal filter=active
```
Shows only tasks that need attention (todo and in_progress status).

### Show All Tasks  
```
list_tasks format=terminal
```
Displays all tasks with status summary.

### Filter by Status
```
list_tasks format=terminal filter=todo
list_tasks format=terminal filter=in_progress  
list_tasks format=terminal filter=blocked
list_tasks format=terminal filter=done
```

### Default JSON Format (for API/scripting)
```
list_tasks
list_tasks format=json
```

## Display Features

### 🎨 Color Coding
- **Status Colors**: 
  - 🔵 Blue: in_progress
  - ⚪ Gray: todo
  - 🟢 Green: done  
  - 🔴 Red: blocked

- **Priority Colors**:
  - 🔴 **Red Bold**: urgent
  - 🟡 Yellow: high
  - 🔵 Blue: medium
  - ⚪ Gray: low

### 📊 Smart Layout
- **Responsive**: Adapts to terminal width
- **Truncation**: Long titles show with "..." 
- **Icons**: Cross-platform status symbols (○ ▶ ✓ ⚠)
- **Summary**: Shows task counts by status

### 📋 Table Columns
- **Status**: Icon + status name
- **Priority**: Color-coded priority level
- **ID**: Task serial number (TASK-XXXXX)
- **Title**: Task name (truncated if too long)
- **Project**: Project context

## Implementation Details

### Files Modified
- `server-unified.js`: Enhanced `list_tasks` tool with `format` parameter
- `lib/terminal-formatter.js`: New formatting module with colors/tables
- `package.json`: Added dependencies (chalk, cli-table3, figures)

### Dependencies Added
- **chalk**: Terminal colors
- **cli-table3**: Professional table formatting  
- **figures**: Cross-platform unicode symbols

### Backwards Compatibility
- Default format remains JSON for existing integrations
- All existing parameters (status, project, priority) still work
- New parameters are optional

## Configuration Options

When calling the formatter programmatically:

```javascript
import { formatTasksForTerminal } from './lib/terminal-formatter.js';

const options = {
  filter: 'active',        // 'active', 'todo', 'in_progress', etc.
  showProject: true,       // Show project column
  showId: true,           // Show ID column  
  showSummary: true,      // Show header with counts
  maxTitleWidth: 30       // Max title column width
};

const output = formatTasksForTerminal(tasks, options);
console.log(output);
```

## Sample Output

```
📋 Task List (active only) - 2 tasks
┌────────────┬──────────┬────────────┬──────────────────────────────────┬───────────────┐
│ Status     │ Priority │ ID         │ Title                          │ Project       │
├────────────┼──────────┼────────────┼──────────────────────────────────┼───────────────┤
│ ◯ todo     │ medium   │ TASK-66820 │ Document refactored architect… │ like-i-said   │
│ ▶ in prog… │ high     │ TASK-71376 │ Test terminal task list funct… │ like-i-said   │
└────────────┴──────────┴────────────┴──────────────────────────────────┴───────────────┘
💡 Tip: Use different filters to see all tasks, or focus on specific statuses
```

## Benefits

✅ **Clear Visual Hierarchy**: Colors and icons make status immediately obvious  
✅ **Space Efficient**: Table format shows more info in less space  
✅ **Professional Look**: Clean, modern terminal styling  
✅ **Cross-Platform**: Works on Windows, macOS, Linux terminals  
✅ **Responsive**: Adapts to different terminal sizes  
✅ **Backwards Compatible**: Doesn't break existing JSON usage  

## Complexity Assessment: ✅ LOW-MEDIUM

- **Time to implement**: 4-6 hours
- **Dependencies**: 3 lightweight, well-maintained packages
- **Risk**: Low (pure presentation layer)
- **Maintenance**: Minimal (stable dependencies, no complex logic)

This feature transforms task management from plain text into a professional, visually appealing interface that makes it easier to quickly scan and understand your project status.