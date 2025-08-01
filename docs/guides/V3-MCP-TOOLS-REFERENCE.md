# V3 Hierarchical MCP Tools Reference

## Overview
The V3 MCP tools provide hierarchical task management with a 4-level structure:
- **Master** (Projects) → **Epic** (Stages) → **Task** → **Subtask**

## Available Tools

### 1. create_project
Start a new project or major initiative.

**Example:**
```javascript
create_project({
  title: "Website Redesign",
  description: "Complete overhaul of company website",
  priority: "high",
  due_date: "2025-12-31",
  tags: ["web", "design", "2025"]
})
```

### 2. create_stage
Add a major stage or phase to an existing project.

**Example:**
```javascript
create_stage({
  project_id: "project-uuid-here",
  title: "Stage 1: Research & Planning",
  description: "User research and design planning phase",
  estimated_hours: 40,
  tags: ["research", "planning"]
})
```

### 3. create_hierarchical_task
Create a task at the appropriate level based on its parent.

**Example:**
```javascript
create_hierarchical_task({
  title: "Conduct user interviews",
  description: "Interview 10 users about current website",
  parent_id: "stage-uuid-here",  // Optional
  project: "website-redesign",    // Required
  priority: "high",
  estimated_hours: 16,
  assignee: "john.doe",
  tags: ["user-research", "interviews"]
})
```

### 4. create_subtask
Break down a task into smaller pieces.

**Example:**
```javascript
create_subtask({
  parent_task_id: "task-uuid-here",
  title: "Create interview questions",
  description: "Draft 20 questions for user interviews",
  estimated_hours: 2
})
```

### 5. move_task
Reorganize tasks by moving them to a different parent.

**Example:**
```javascript
move_task({
  task_id: "task-to-move-uuid",
  new_parent_id: "new-parent-uuid"
})
```

### 6. view_project
View the complete project hierarchy.

**Example:**
```javascript
// View specific project
view_project({
  project_id: "project-uuid",
  include_completed: true,
  max_depth: 4
})

// View all projects
view_project({})
```

## Output Format Example
```
⭕ 📁 PROJECT: Website Redesign [40h]
   ID: abc123 | Path: 001
  ⭕ 📂 STAGE: Stage 1: Research & Planning [16h]
     ID: def456 | Path: 001.001
    🔄 📄 TASK: Conduct user interviews [16h] (25%)
       ID: ghi789 | Path: 001.001.001
      ✅ 📝 SUBTASK: Create interview questions [2h] (100%)
         ID: jkl012 | Path: 001.001.001.001
```

## Status Indicators
- ⭕ = Todo
- 🔄 = In Progress
- ✅ = Done
- 🚫 = Blocked

## Level Indicators
- 📁 = PROJECT (Master)
- 📂 = STAGE (Epic)
- 📄 = TASK
- 📝 = SUBTASK

## Error Handling
The tools include validation to prevent:
- Creating tasks beyond maximum depth (4 levels)
- Moving tasks that would create cycles
- Creating stages under non-projects
- Creating subtasks under subtasks

## Usage in Claude Code
After restarting Claude Code, these tools will be available through the MCP interface.
Simply use the tool name and provide the required parameters.