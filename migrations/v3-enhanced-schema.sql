-- V3 Enhanced Schema Migration
-- Adds new fields for richer task management

-- Add new columns to tasks table
ALTER TABLE tasks ADD COLUMN due_date DATETIME;
ALTER TABLE tasks ADD COLUMN estimated_hours REAL DEFAULT 0;
ALTER TABLE tasks ADD COLUMN actual_hours REAL DEFAULT 0;
ALTER TABLE tasks ADD COLUMN completion_percentage INTEGER DEFAULT 0 CHECK(completion_percentage >= 0 AND completion_percentage <= 100);
ALTER TABLE tasks ADD COLUMN assignee TEXT;
ALTER TABLE tasks ADD COLUMN tags TEXT; -- JSON array as text

-- Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee);

-- Task dependencies table
CREATE TABLE IF NOT EXISTS task_dependencies (
  task_id TEXT NOT NULL,
  depends_on_task_id TEXT NOT NULL,
  dependency_type TEXT DEFAULT 'finish_to_start',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (task_id, depends_on_task_id),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- Task activity log
CREATE TABLE IF NOT EXISTS task_activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL,
  action TEXT NOT NULL,
  action_data JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- Subtask checklist items
CREATE TABLE IF NOT EXISTS task_checklist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL,
  item_text TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  position INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_task_activity_task_id ON task_activity(task_id);
CREATE INDEX IF NOT EXISTS idx_task_checklist_task_id ON task_checklist(task_id);