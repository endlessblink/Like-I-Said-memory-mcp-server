# MCP Hierarchy Best Practices Guide

## Overview

This guide provides comprehensive best practices for creating MCP hierarchical tasks and projects without encountering common errors like "Parent not found" and "Project not found".

## 🚨 Common Errors and Prevention

### Error 1: "Parent with ID [UUID] not found"

**Cause**: Trying to create a hierarchical task under a parent that doesn't exist in the system.

**Prevention**:
- Always validate parent existence before creating child tasks
- Use `view_project` to see current hierarchy structure
- Use `validate_hierarchy` before attempting operations

### Error 2: "No project found with ID or name [name]"

**Cause**: Referencing a project that hasn't been properly created or established in the MCP system.

**Prevention**:
- Use `find_or_create_project` instead of assuming projects exist
- Always establish project foundation before creating tasks
- Use project names consistently (avoid typos)

## 📋 Safe Workflow Patterns

### Pattern 1: The Foundation-First Approach

```bash
# Step 1: Always ensure project exists
mcp__like-i-said__find_or_create_project --title "MyProject" --description "Project description"

# Step 2: Validate before creating
mcp__like-i-said__validate_hierarchy --operation "create_task" --project_name "MyProject"

# Step 3: Create safely
mcp__like-i-said__create_hierarchical_task --title "Task Title" --project "MyProject"
```

### Pattern 2: The Validation-Heavy Approach

```bash
# Always validate before each operation
mcp__like-i-said__validate_hierarchy --operation "create_subtask" --parent_id "parent-uuid"

# Only proceed if validation passes
mcp__like-i-said__create_subtask --parent_task_id "parent-uuid" --title "Subtask Title"
```

### Pattern 3: The Structure-First Approach

```bash
# See what exists before adding
mcp__like-i-said__view_project --project_id "MyProject"

# Use the actual UUIDs from the structure view
mcp__like-i-said__create_hierarchical_task --parent_id "actual-uuid-from-structure" --title "New Task"
```

## 🏗️ Hierarchy Building Strategies

### Strategy 1: Top-Down Construction

**Build hierarchy levels in order:**

1. **Project** (Master level)
   ```bash
   mcp__like-i-said__create_project --title "Video Processing App" --description "Complete video app"
   ```

2. **Stages** (Major phases)
   ```bash
   mcp__like-i-said__create_stage --project_id "project-uuid" --title "Development Phase"
   ```

3. **Tasks** (Work items)
   ```bash
   mcp__like-i-said__create_hierarchical_task --parent_id "stage-uuid" --title "Build UI Components"
   ```

4. **Subtasks** (Granular work)
   ```bash
   mcp__like-i-said__create_subtask --parent_task_id "task-uuid" --title "Create Button Component"
   ```

### Strategy 2: Bulk Setup with Scripts

Use the provided setup scripts for consistent project creation:

```bash
# Create project with standard stages
node scripts/setup-project-hierarchy.js --setup-full --project "My Video App"

# Create project with custom stages
node scripts/setup-project-hierarchy.js --setup-stages --project "My App" --stages "Design,Development,Testing"
```

## 🔍 Validation Checklist

### Before Creating Any Hierarchical Task:

- [ ] **Project exists**: Use `find_or_create_project` first
- [ ] **Parent exists**: Check with `view_project` if using parent_id
- [ ] **Valid UUID**: Ensure parent_id is actual UUID from system, not project name
- [ ] **Hierarchy valid**: Use `validate_hierarchy` to confirm operation will succeed
- [ ] **Proper naming**: Use consistent project names (avoid typos)

### Error Prevention Questions:

1. **"Does my project exist?"**
   - Run: `mcp__like-i-said__find_project --search_term "ProjectName"`
   - If not found, create it first

2. **"Is my parent ID correct?"**
   - Run: `mcp__like-i-said__view_project --project_id "ProjectName"`
   - Copy actual UUIDs from the structure

3. **"Will this operation succeed?"**
   - Run: `mcp__like-i-said__validate_hierarchy --operation "create_task" --parent_id "uuid"`
   - Only proceed if validation passes

## 🛠️ Practical Tools and Scripts

### Quick Project Setup

```bash
# Basic project
node scripts/setup-project-hierarchy.js --setup-basic --project "MyProject"

# Full project with stages
node scripts/setup-project-hierarchy.js --setup-full --project "MyProject"

# Custom stages
node scripts/setup-project-hierarchy.js --setup-stages --project "MyProject" --stages "Stage1,Stage2,Stage3"
```

### Safe Task Creation

```bash
# Validate before creating
node scripts/safe-mcp-workflow.js validate "MyProject"

# Create task safely
node scripts/safe-mcp-workflow.js create-task "MyProject" "Task Title" "Description"

# Create complete hierarchy
node scripts/safe-mcp-workflow.js create-hierarchy "Project" "Stage" "Task" "Subtask"
```

### Structure Inspection

```bash
# View project structure
mcp__like-i-said__view_project --project_id "MyProject"

# List all projects
node scripts/setup-project-hierarchy.js --list

# Show detailed structure
node scripts/setup-project-hierarchy.js --structure --project "MyProject"
```

## 🚫 Anti-Patterns to Avoid

### ❌ DON'T: Create tasks without project validation

```bash
# BAD - assumes project exists
mcp__like-i-said__create_hierarchical_task --title "Task" --project "UnknownProject"
```

### ❌ DON'T: Use random UUIDs as parent_id

```bash
# BAD - parent probably doesn't exist
mcp__like-i-said__create_hierarchical_task --parent_id "random-uuid-123" --title "Task"
```

### ❌ DON'T: Skip validation steps

```bash
# BAD - no validation before creation
mcp__like-i-said__create_subtask --parent_task_id "unverified-uuid" --title "Subtask"
```

### ❌ DON'T: Mix project names and UUIDs

```bash
# BAD - parent_id should be UUID, not project name
mcp__like-i-said__create_hierarchical_task --parent_id "ProjectName" --title "Task"
```

## ✅ Best Practices Summary

### 🏆 Golden Rules

1. **Foundation First**: Always ensure project exists before creating tasks
2. **Validate Everything**: Use validation tools before every operation
3. **Structure First**: View current structure before adding items
4. **UUID Precision**: Use actual UUIDs from system, never guess or assume
5. **Consistent Naming**: Use exact project names (case-sensitive)
6. **Error Prevention**: Better to over-validate than to encounter errors

### 🎯 Success Patterns

**For Simple Tasks:**
```bash
Project → Task (no parent_id needed)
```

**For Complex Workflows:**
```bash
Project → Stage → Task → Subtask (full hierarchy)
```

**For Rapid Development:**
```bash
Use setup scripts → View structure → Create with actual UUIDs
```

### 📊 Workflow Templates

#### Template 1: New Project Setup

```bash
# 1. Create project
mcp__like-i-said__find_or_create_project --title "NewProject" --description "Description"

# 2. Add stages (optional)
mcp__like-i-said__create_stage --project_id "project-uuid" --title "Stage1"

# 3. View structure to get UUIDs
mcp__like-i-said__view_project --project_id "NewProject"

# 4. Create tasks using actual UUIDs
mcp__like-i-said__create_hierarchical_task --parent_id "actual-stage-uuid" --title "Task1"
```

#### Template 2: Adding to Existing Project

```bash
# 1. Check current structure
mcp__like-i-said__view_project --project_id "ExistingProject"

# 2. Validate operation
mcp__like-i-said__validate_hierarchy --operation "create_task" --parent_id "parent-uuid"

# 3. Create safely
mcp__like-i-said__create_hierarchical_task --parent_id "validated-parent-uuid" --title "NewTask"
```

#### Template 3: Emergency Fix for Broken Hierarchy

```bash
# 1. List all projects to find correct names
node scripts/setup-project-hierarchy.js --list

# 2. Recreate project if missing
mcp__like-i-said__find_or_create_project --title "CorrectProjectName"

# 3. Rebuild structure step by step
# (Use setup scripts for efficiency)
```

## 🔧 Troubleshooting Guide

### Issue: "Cannot find project"
- **Solution**: Use `find_project` to search, then `find_or_create_project`
- **Prevention**: Use setup scripts for consistent project creation

### Issue: "Parent not found"
- **Solution**: Use `view_project` to get actual parent UUIDs
- **Prevention**: Always validate parent existence before creating children

### Issue: "Hierarchy validation failed"
- **Solution**: Check that you're using correct operation type and valid parent_id
- **Prevention**: Use `validate_hierarchy` before every operation

### Issue: "Inconsistent project state"
- **Solution**: Use setup scripts to rebuild project structure cleanly
- **Prevention**: Always use proper creation order (project → stage → task → subtask)

## 📚 Additional Resources

- **Scripts**: Located in `scripts/` directory
  - `safe-mcp-workflow.js` - Safe task creation with validation
  - `setup-project-hierarchy.js` - Project structure management

- **Tools**: MCP tools for hierarchy management
  - `find_or_create_project` - Safe project creation
  - `validate_hierarchy` - Operation validation
  - `view_project` - Structure inspection

- **Documentation**: 
  - Main `CLAUDE.md` - Project overview and MCP integration
  - API documentation - Detailed tool parameters and usage

By following these best practices and using the provided tools, you can eliminate MCP hierarchy errors and maintain clean, consistent project structures.