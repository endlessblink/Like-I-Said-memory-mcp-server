# V3 Semantic Folders Integration Guide

## Overview
The V3 semantic folder system provides human-readable, hierarchical file organization for tasks. Instead of flat directories, tasks are organized in a semantic structure that mirrors the task hierarchy.

## Enabling Semantic Folders

### Option 1: Enable Globally (Recommended for New Projects)
```javascript
// In lib/v3-mcp-tools.js, modify getTaskManager():
async function getTaskManager() {
  if (!taskManager) {
    taskManager = new SemanticHybridTaskManager({
      useSemanticPaths: true  // Enable semantic folders
    });
    await taskManager.initialize();
  }
  return taskManager;
}
```

### Option 2: Enable Per Instance
```javascript
const manager = new SemanticHybridTaskManager({
  useSemanticPaths: true,
  dataDir: './my-tasks'
});
await manager.initialize();
```

## Folder Structure Examples

### Before (Flat Structure)
```
tasks/
├── project-name/
│   ├── task-abc123.md
│   ├── task-def456.md
│   ├── task-ghi789.md
│   └── task-jkl012.md
```

### After (Semantic Structure)
```
tasks/
└── 001-PROJECT-website-redesign-abc123/
    ├── abc123.md                          # Project file
    ├── 001-STAGE-research-def456/
    │   ├── def456.md                      # Stage file
    │   ├── 001-TASK-user-interviews-ghi789/
    │   │   ├── ghi789.md                  # Task file
    │   │   └── 001-SUB-questions-jkl012/
    │   │       └── jkl012.md              # Subtask file
    │   └── 002-TASK-competitor-analysis-mno345/
    │       └── mno345.md
    └── 002-STAGE-implementation-pqr678/
        └── pqr678.md
```

## Path Components

Each path component follows this pattern:
```
{ORDER}-{LEVEL}-{SLUG}-{SHORT_ID}
```

- **ORDER**: 3-digit number (001, 002, etc.) for sorting
- **LEVEL**: PROJECT, STAGE, TASK, or SUB
- **SLUG**: URL-safe version of the title
- **SHORT_ID**: First 8 characters of the task ID

## Migration Guide

### Migrate Existing Tasks
```javascript
// One-time migration from flat to semantic
const manager = new SemanticHybridTaskManager({
  useSemanticPaths: false  // Start with existing structure
});
await manager.initialize();

// Run migration
const result = await manager.migrateToSemanticFolders({
  skipBackup: false,      // Create backup (recommended)
  keepEmptyDirs: false,   // Clean up empty directories
  ignoreErrors: false     // Stop on errors
});

console.log(`Migrated ${result.summary.moved} files`);
console.log(`Backup at: ${result.backupPath}`);
```

### Check Migration Status
```javascript
const status = await manager.getMigrationStatus();
console.log(`Progress: ${status.percentComplete}%`);
console.log(`${status.migratedTasks}/${status.totalTasks} tasks migrated`);
```

### Rollback if Needed
```javascript
// If something goes wrong, rollback using backup path
await manager.rollbackMigration(result.backupPath);
```

## Platform Considerations

### Path Length Limits
- **Windows**: 200 characters (conservative)
- **macOS**: 900 characters  
- **Linux**: 200 characters (conservative)

The system automatically truncates paths that exceed limits while maintaining readability.

### Reserved Characters
The following characters are automatically removed from paths:
- `/` `\` `:` `*` `?` `"` `<` `>` `|` (all platforms)
- Control characters (Windows)

## API Changes

### Finding Tasks by Path
```javascript
// Find by exact semantic path
const task = await manager.getTaskBySemanticPath(
  '001-PROJECT-website/002-STAGE-design/001-TASK-mockups'
);

// Search by path pattern
const designTasks = await manager.searchByPath('design');
const stageTasks = await manager.searchByPath('STAGE');
```

### File Locations
```javascript
// Get the file path for a task
const filePath = manager.getTaskFilePath(task);
// Returns: tasks/001-PROJECT-name/002-STAGE-name/taskId.md
```

## Benefits

1. **Visual Hierarchy** - See task relationships in file explorer
2. **Better Organization** - Related tasks grouped in folders
3. **Easier Navigation** - Browse tasks without opening files
4. **Git-Friendly** - Clear diffs show organizational changes
5. **Search-Friendly** - Find tasks by path patterns

## Troubleshooting

### "Path exceeds platform limit"
- Task titles are too long for nested structure
- Solution: Shorten titles or reduce nesting depth

### "Path contains reserved character"  
- Title has characters not allowed in file paths
- Solution: Characters are automatically removed/replaced

### "Foreign key constraint failed"
- Child tasks syncing before parents during migration
- Solution: These are warnings only, migration will succeed

### Mixed State Warning
- Some tasks migrated, others not
- Solution: Complete migration or rollback fully

## Best Practices

1. **Enable for New Projects** - Start with semantic folders from beginning
2. **Migrate During Downtime** - Migration moves files, plan accordingly
3. **Test First** - Try migration on test data before production
4. **Keep Backups** - Always backup before migration
5. **Monitor Performance** - Very deep hierarchies may impact performance

## Configuration Options

```javascript
new SemanticHybridTaskManager({
  useSemanticPaths: true,        // Enable semantic folders
  migrationBatchSize: 100,       // Files per batch during migration
  customDb: true,                // Use separate database
  dataDir: './tasks'            // Task storage directory
});
```