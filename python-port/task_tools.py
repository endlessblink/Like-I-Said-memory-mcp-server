#!/usr/bin/env python3
"""
Like-I-Said v2 - Python Task Management Tools
Implements 6 task management tools compatible with existing Like-I-Said task format.

Target Tools:
7. generate_dropoff - session handoff documents  
8. create_task - create tasks with auto-linking
9. update_task - update status, add memories/subtasks
10. list_tasks - filter and list tasks
11. get_task_context - full task context with relationships
12. delete_task - remove tasks and handle subtasks
"""

import os
import sys
import json
import uuid
import yaml
import subprocess
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any, Union

class TaskStorage:
    """
    Task storage system using markdown files with YAML frontmatter.
    Compatible with existing Like-I-Said task format.
    """
    
    def __init__(self, base_dir="tasks", memories_dir="memories"):
        self.base_dir = Path(base_dir)
        self.memories_dir = Path(memories_dir)
        self.task_index = {}  # In-memory index for quick lookups
        self.ensure_directories()
        self.load_task_index()
    
    def ensure_directories(self):
        """Create base directories if they don't exist"""
        self.base_dir.mkdir(exist_ok=True)
        self.memories_dir.mkdir(exist_ok=True)
        (self.memories_dir / "default").mkdir(exist_ok=True)
    
    def get_project_file_path(self, project_name: str) -> Path:
        """Get project file path, creating directory if needed"""
        project_name = project_name or "default"
        project_dir = self.base_dir / project_name
        project_dir.mkdir(parents=True, exist_ok=True)
        return project_dir / "tasks.md"
    
    def generate_task_id(self) -> str:
        """Generate unique task ID"""
        date = datetime.now()
        date_str = date.strftime("%Y-%m-%d")
        random_hex = uuid.uuid4().hex[:8]
        return f"task-{date_str}-{random_hex}"
    
    def generate_serial(self, project: str, category: str = None) -> str:
        """Generate task serial number in TASK-XXXXX format"""
        # Count existing tasks in project for serial numbering
        count = len([t for t in self.task_index.values() if t.get("project") == project])
        
        # Create project-based serial
        project_prefix = "".join([c.upper() for c in (project or "default")[:3] if c.isalnum()])
        if not project_prefix:
            project_prefix = "TSK"
        
        # Category prefix for better organization
        if category:
            cat_prefix = category[:1].upper()
            serial = f"{project_prefix}-{cat_prefix}{count + 1:04d}"
        else:
            serial = f"{project_prefix}-{count + 1:05d}"
        
        return serial
    
    def parse_task_file(self, file_path: Path) -> List[Dict[str, Any]]:
        """Parse multiple tasks from a project file"""
        if not file_path.exists():
            return []
        
        try:
            content = file_path.read_text(encoding="utf-8")
            tasks = []
            
            # Split content by task boundaries (frontmatter sections)
            sections = content.split("---")
            
            for i in range(1, len(sections), 2):
                if i + 1 < len(sections):
                    frontmatter_content = sections[i]
                    body_content = sections[i + 1] if i + 1 < len(sections) else ""
                    
                    try:
                        # Parse YAML frontmatter
                        task_data = yaml.safe_load(frontmatter_content)
                        if task_data and isinstance(task_data, dict) and task_data.get("id"):
                            task_data["description"] = body_content.strip()
                            task_data["format"] = "yaml"
                            self.ensure_required_fields(task_data)
                            tasks.append(task_data)
                    except yaml.YAMLError:
                        continue
            
            return tasks
        except Exception as e:
            print(f"Error parsing task file {file_path}: {e}", file=sys.stderr)
            return []
    
    def ensure_required_fields(self, task: Dict[str, Any]):
        """Ensure task has all required fields"""
        now = datetime.now().isoformat()
        
        if not task.get("created"):
            task["created"] = now
        if not task.get("updated"):
            task["updated"] = now
        if not task.get("status"):
            task["status"] = "todo"
        if not task.get("priority"):
            task["priority"] = "medium"
        if not task.get("project"):
            task["project"] = "default"
        if not task.get("tags"):
            task["tags"] = []
        if not task.get("manual_memories"):
            task["manual_memories"] = []
        if not task.get("memory_connections"):
            task["memory_connections"] = []
        if not task.get("category"):
            task["category"] = "general"
    
    def load_task_index(self):
        """Load all tasks into memory index"""
        self.task_index = {}
        
        try:
            # Find all project directories
            if self.base_dir.exists():
                for project_dir in self.base_dir.iterdir():
                    if project_dir.is_dir():
                        tasks_file = project_dir / "tasks.md"
                        if tasks_file.exists():
                            tasks = self.parse_task_file(tasks_file)
                            for task in tasks:
                                self.task_index[task["id"]] = task
            
            print(f"Loaded {len(self.task_index)} tasks from disk", file=sys.stderr)
        except Exception as e:
            print(f"Error loading task index: {e}", file=sys.stderr)
    
    def save_task_to_project(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Save task to project-based markdown file"""
        project_name = task.get("project", "default")
        file_path = self.get_project_file_path(project_name)
        
        # Read existing tasks
        existing_tasks = self.parse_task_file(file_path)
        
        # Update or add task
        task_found = False
        for i, existing_task in enumerate(existing_tasks):
            if existing_task.get("id") == task.get("id"):
                existing_tasks[i] = task
                task_found = True
                break
        
        if not task_found:
            existing_tasks.append(task)
        
        # Rebuild file content
        self.write_project_file(file_path, project_name, existing_tasks)
        
        # Update index
        self.task_index[task["id"]] = task
        
        return task
    
    def write_project_file(self, file_path: Path, project_name: str, tasks: List[Dict[str, Any]]):
        """Write tasks to project markdown file"""
        content = f"""---
project: {project_name}
tags: []
updated: '{datetime.now().isoformat()}'
manual_memories: []
memory_connections: []
---
# {project_name} Tasks

"""
        
        for task in tasks:
            # Create task frontmatter
            frontmatter = {
                "id": task["id"],
                "title": task["title"],
                "serial": task.get("serial"),
                "status": task["status"],
                "priority": task["priority"],
                "category": task.get("category"),
                "project": task["project"],
                "tags": task.get("tags", []),
                "created": task["created"],
                "updated": task["updated"],
                "manual_memories": task.get("manual_memories", []),
                "memory_connections": task.get("memory_connections", [])
            }
            
            # Remove None values
            frontmatter = {k: v for k, v in frontmatter.items() if v is not None}
            
            yaml_content = yaml.dump(frontmatter, default_flow_style=False, sort_keys=False)
            task_content = f"\n\n---\n{yaml_content}---\n{task.get('description', '')}\n"
            content += task_content
        
        file_path.write_text(content, encoding="utf-8")
    
    def find_memory_connections(self, task: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Find relevant memory connections for a task (simple implementation)"""
        connections = []
        
        if not self.memories_dir.exists():
            return connections
        
        search_terms = [
            task.get("title", ""),
            task.get("description", ""),
            task.get("project", ""),
        ] + task.get("tags", [])
        
        search_text = " ".join([term for term in search_terms if term]).lower()
        
        try:
            # Search through memory files
            for project_dir in self.memories_dir.iterdir():
                if not project_dir.is_dir():
                    continue
                    
                for memory_file in project_dir.glob("*.md"):
                    try:
                        content = memory_file.read_text(encoding="utf-8").lower()
                        
                        # Simple relevance scoring
                        relevance = 0
                        for term in search_terms:
                            if term and term.lower() in content:
                                relevance += 1
                        
                        if relevance > 0:
                            # Extract memory ID from filename or content
                            memory_id = memory_file.stem
                            
                            connection = {
                                "memory_id": memory_id,
                                "memory_serial": f"MEM-{memory_id[:6]}",
                                "connection_type": "research",
                                "relevance": min(relevance / len(search_terms), 1.0),
                                "matched_terms": [term for term in search_terms if term and term.lower() in content],
                                "created": datetime.now().isoformat()
                            }
                            connections.append(connection)
                            
                            if len(connections) >= 5:  # Limit connections
                                break
                    except Exception:
                        continue
                        
                if len(connections) >= 5:
                    break
        except Exception as e:
            print(f"Error finding memory connections: {e}", file=sys.stderr)
        
        # Sort by relevance
        connections.sort(key=lambda x: x["relevance"], reverse=True)
        return connections[:5]
    
    def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get task by ID"""
        return self.task_index.get(task_id)
    
    def list_tasks(self, filters: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """List tasks with filters"""
        filters = filters or {}
        tasks = list(self.task_index.values())
        
        # Apply filters
        if filters.get("project"):
            tasks = [t for t in tasks if t.get("project") == filters["project"]]
        
        if filters.get("status"):
            tasks = [t for t in tasks if t.get("status") == filters["status"]]
        
        if filters.get("category"):
            tasks = [t for t in tasks if t.get("category") == filters["category"]]
        
        if filters.get("has_memory"):
            tasks = [t for t in tasks if any(
                conn.get("memory_id") == filters["has_memory"] 
                for conn in t.get("memory_connections", [])
            )]
        
        # Apply limit
        limit = filters.get("limit", 20)
        tasks = tasks[:limit]
        
        return tasks
    
    def update_task(self, task_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update task with given changes"""
        task = self.get_task(task_id)
        if not task:
            raise ValueError(f"Task not found: {task_id}")
        
        # Apply updates
        task.update(updates)
        task["updated"] = datetime.now().isoformat()
        
        # Save to file
        return self.save_task_to_project(task)
    
    def delete_task(self, task_id: str) -> bool:
        """Delete task from storage"""
        task = self.get_task(task_id)
        if not task:
            raise ValueError(f"Task not found: {task_id}")
        
        project_name = task.get("project", "default")
        file_path = self.get_project_file_path(project_name)
        
        # Load existing tasks and filter out the one to delete
        existing_tasks = self.parse_task_file(file_path)
        filtered_tasks = [t for t in existing_tasks if t.get("id") != task_id]
        
        # Write back filtered tasks
        self.write_project_file(file_path, project_name, filtered_tasks)
        
        # Remove from index
        if task_id in self.task_index:
            del self.task_index[task_id]
        
        return True

class DropoffGenerator:
    """Generate session dropoff documents for context handoff"""
    
    def __init__(self, base_dir="memories", package_json_path="package.json"):
        self.base_dir = Path(base_dir)
        self.package_json_path = Path(package_json_path)
    
    def get_git_status(self) -> Dict[str, Any]:
        """Get git repository status"""
        try:
            # Get current branch
            current_branch = subprocess.run(
                ["git", "branch", "--show-current"],
                capture_output=True, text=True, check=True
            ).stdout.strip()
            
            # Get status
            status_output = subprocess.run(
                ["git", "status", "--porcelain"],
                capture_output=True, text=True, check=True
            ).stdout.strip()
            
            # Parse status
            untracked = []
            modified = []
            staged = []
            
            for line in status_output.split("\n"):
                if not line.strip():
                    continue
                    
                status_code = line[:2]
                file_path = line[3:]
                
                if "??" in status_code:
                    untracked.append(file_path)
                elif status_code[0] != " ":
                    staged.append(file_path)
                elif status_code[1] != " ":
                    modified.append(file_path)
            
            # Get recent commits
            commits_output = subprocess.run(
                ["git", "log", "--oneline", "-5"],
                capture_output=True, text=True, check=True
            ).stdout.strip()
            
            recent_commits = [line for line in commits_output.split("\n") if line.strip()]
            
            return {
                "current_branch": current_branch,
                "has_changes": bool(status_output),
                "untracked_files": untracked,
                "modified_files": modified,
                "staged_files": staged,
                "recent_commits": recent_commits
            }
            
        except subprocess.CalledProcessError:
            return {"error": "Git not available or not a git repository"}
    
    def get_project_info(self) -> Dict[str, Any]:
        """Get project information from package.json"""
        try:
            if self.package_json_path.exists():
                with open(self.package_json_path, 'r', encoding='utf-8') as f:
                    package_data = json.load(f)
                
                return {
                    "name": package_data.get("name"),
                    "version": package_data.get("version"),
                    "description": package_data.get("description"),
                    "location": str(Path.cwd()),
                    "repository": package_data.get("repository", {}).get("url", "Not specified"),
                    "scripts": list(package_data.get("scripts", {}).keys())
                }
            else:
                return {
                    "name": "Unknown Project",
                    "location": str(Path.cwd()),
                    "error": "package.json not found"
                }
        except Exception as e:
            return {"error": f"Failed to read project info: {e}"}
    
    def get_recent_memories(self, count: int = 5) -> List[Dict[str, Any]]:
        """Get recent memories from storage"""
        memories = []
        
        if not self.base_dir.exists():
            return memories
        
        try:
            # Collect all memory files with timestamps
            all_memories = []
            
            for project_dir in self.base_dir.iterdir():
                if not project_dir.is_dir():
                    continue
                    
                for mem_file in project_dir.glob("*.md"):
                    try:
                        content = mem_file.read_text(encoding="utf-8")
                        stat = mem_file.stat()
                        
                        # Try to parse metadata
                        if content.startswith("---"):
                            parts = content.split("---", 2)
                            if len(parts) >= 3:
                                try:
                                    metadata = yaml.safe_load(parts[1])
                                    body = parts[2].strip()
                                    
                                    memory_info = {
                                        "file": mem_file.name,
                                        "category": project_dir.name,
                                        "title": metadata.get("title", mem_file.stem),
                                        "timestamp": metadata.get("timestamp", datetime.fromtimestamp(stat.st_mtime).isoformat()),
                                        "tags": metadata.get("tags", []),
                                        "priority": metadata.get("priority", "medium"),
                                        "mtime": stat.st_mtime
                                    }
                                    all_memories.append(memory_info)
                                except yaml.YAMLError:
                                    # Fallback to basic info
                                    all_memories.append({
                                        "file": mem_file.name,
                                        "category": project_dir.name,
                                        "title": mem_file.stem,
                                        "timestamp": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                                        "tags": [],
                                        "priority": "medium",
                                        "mtime": stat.st_mtime
                                    })
                    except Exception:
                        continue
            
            # Sort by modification time and return top N
            all_memories.sort(key=lambda x: x["mtime"], reverse=True)
            return all_memories[:count]
            
        except Exception as e:
            return [{"error": f"Failed to get recent memories: {e}"}]
    
    def generate_dropoff_markdown(self, context_data: Dict[str, Any]) -> str:
        """Generate markdown dropoff document"""
        project_info = context_data.get("project_info", {})
        git_status = context_data.get("git_status", {})
        recent_memories = context_data.get("recent_memories", [])
        
        markdown = f"# {project_info.get('name', 'Project')} - Session Drop-off\n\n"
        
        # Quick copy-paste section
        markdown += "## Quick Copy-Paste Prompt for New Session\n\n"
        markdown += "```\n"
        markdown += f"Continue working on {project_info.get('name', 'the project')} from where we left off.\n\n"
        markdown += f"Project location: {project_info.get('location')}\n"
        markdown += f"Current version: {project_info.get('version')}\n\n"
        
        # Session summary
        markdown += f"Session Summary: {context_data.get('session_summary', 'Session work completed')}\n\n"
        
        # Recent memories
        if recent_memories and len(recent_memories) > 0:
            markdown += "Recent work:\n"
            for i, memory in enumerate(recent_memories[:3]):
                markdown += f"{i+1}. {memory.get('title', 'Unknown')} ({memory.get('category', 'general')})\n"
            markdown += "\n"
        
        # Git status
        if git_status and not git_status.get("error"):
            markdown += f"Current branch: {git_status.get('current_branch')}\n"
            if git_status.get("has_changes"):
                markdown += "Status: Has uncommitted changes\n"
            else:
                markdown += "Status: Clean working directory\n"
            markdown += "\n"
        
        markdown += "```\n\n"
        
        # Detailed sections
        markdown += "## Detailed Context\n\n"
        
        # Project info
        markdown += "### Project Information\n\n"
        markdown += f"- **Name**: {project_info.get('name')}\n"
        markdown += f"- **Version**: {project_info.get('version')}\n"
        markdown += f"- **Description**: {project_info.get('description')}\n"
        markdown += f"- **Location**: {project_info.get('location')}\n"
        
        if project_info.get("repository") and "Not specified" not in project_info.get("repository", ""):
            markdown += f"- **Repository**: {project_info.get('repository')}\n"
        markdown += "\n"
        
        # Git status details
        if git_status and not git_status.get("error"):
            markdown += "### Git Status\n\n"
            markdown += f"- **Branch**: {git_status.get('current_branch')}\n"
            markdown += f"- **Has Changes**: {'Yes' if git_status.get('has_changes') else 'No'}\n"
            
            if git_status.get("modified_files"):
                markdown += f"- **Modified Files**: {', '.join(git_status.get('modified_files'))}\n"
            if git_status.get("staged_files"):
                markdown += f"- **Staged Files**: {', '.join(git_status.get('staged_files'))}\n"
            if git_status.get("untracked_files"):
                markdown += f"- **Untracked Files**: {', '.join(git_status.get('untracked_files'))}\n"
            
            if git_status.get("recent_commits"):
                markdown += "\n**Recent Commits**:\n"
                for commit in git_status.get("recent_commits"):
                    markdown += f"- {commit}\n"
            markdown += "\n"
        
        # Recent memories details
        if recent_memories and len(recent_memories) > 0:
            markdown += "### Recent Memories\n\n"
            for i, memory in enumerate(recent_memories):
                markdown += f"{i+1}. **{memory.get('title')}** ({memory.get('category')})\n"
                markdown += f"   - File: {memory.get('file')}\n"
                markdown += f"   - Timestamp: {memory.get('timestamp')}\n"
                if memory.get("tags"):
                    markdown += f"   - Tags: {', '.join(memory.get('tags'))}\n"
                markdown += f"   - Priority: {memory.get('priority')}\n\n"
        
        markdown += "---\n\n"
        markdown += f"*Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*\n"
        
        return markdown

# Global storage instance
storage = TaskStorage()
dropoff_gen = DropoffGenerator()

# Task Management Tools Implementation

def generate_dropoff(
    session_summary: str = "Session work completed",
    include_recent_memories: bool = True,
    include_git_status: bool = True,
    recent_memory_count: int = 5,
    output_format: str = "markdown",
    output_path: Optional[str] = None
) -> Dict[str, Any]:
    """Generate conversation dropoff document for session handoff"""
    try:
        context_data = {
            "timestamp": datetime.now().isoformat(),
            "session_summary": session_summary,
            "project_info": dropoff_gen.get_project_info(),
            "git_status": dropoff_gen.get_git_status() if include_git_status else None,
            "recent_memories": dropoff_gen.get_recent_memories(recent_memory_count) if include_recent_memories else []
        }
        
        if output_format == "json":
            content = json.dumps(context_data, indent=2)
        else:
            content = dropoff_gen.generate_dropoff_markdown(context_data)
        
        # Save to file if output_path specified
        if output_path:
            output_file = Path(output_path)
            output_file.parent.mkdir(parents=True, exist_ok=True)
            output_file.write_text(content, encoding="utf-8")
            
            return {
                "success": True,
                "message": f"Dropoff document generated successfully",
                "output_path": str(output_file),
                "format": output_format,
                "session_summary": session_summary
            }
        else:
            return {
                "success": True,
                "message": "Dropoff document generated successfully",
                "content": content,
                "format": output_format,
                "session_summary": session_summary
            }
            
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to generate dropoff: {e}"
        }

def create_task(
    title: str,
    project: str,
    description: str = "",
    category: str = "general",
    priority: str = "medium",
    parent_task: Optional[str] = None,
    manual_memories: List[str] = None,
    tags: List[str] = None,
    auto_link: bool = True
) -> Dict[str, Any]:
    """Create a new task with intelligent memory linking"""
    try:
        # Validate inputs
        if not title or not project:
            return {
                "success": False,
                "error": "Title and project are required"
            }
        
        # Generate task data
        task_id = storage.generate_task_id()
        serial = storage.generate_serial(project, category)
        now = datetime.now().isoformat()
        
        task = {
            "id": task_id,
            "title": title,
            "serial": serial,
            "description": description,
            "project": project,
            "category": category,
            "priority": priority,
            "status": "todo",
            "parent_task": parent_task,
            "tags": tags or [],
            "manual_memories": manual_memories or [],
            "memory_connections": [],
            "created": now,
            "updated": now
        }
        
        # Auto-link memories if requested
        if auto_link:
            try:
                task["memory_connections"] = storage.find_memory_connections(task)
            except Exception as e:
                print(f"Warning: Could not auto-link memories: {e}", file=sys.stderr)
        
        # Save task
        saved_task = storage.save_task_to_project(task)
        
        return {
            "success": True,
            "message": f"Task created successfully",
            "task_id": task_id,
            "serial": serial,
            "project": project,
            "status": "todo",
            "memory_connections": len(task["memory_connections"])
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to create task: {e}"
        }

def update_task(
    task_id: str,
    status: Optional[str] = None,
    title: Optional[str] = None,
    description: Optional[str] = None,
    add_subtasks: List[str] = None,
    add_memories: List[str] = None,
    remove_memories: List[str] = None
) -> Dict[str, Any]:
    """Update task status and details"""
    try:
        task = storage.get_task(task_id)
        if not task:
            return {
                "success": False,
                "error": f"Task not found: {task_id}"
            }
        
        updates = {}
        
        # Update basic fields
        if status is not None:
            if status not in ["todo", "in_progress", "done", "blocked"]:
                return {
                    "success": False,
                    "error": f"Invalid status: {status}"
                }
            updates["status"] = status
        
        if title is not None:
            updates["title"] = title
        
        if description is not None:
            updates["description"] = description
        
        # Handle memory connections
        if add_memories or remove_memories:
            memory_connections = task.get("memory_connections", [])
            
            if remove_memories:
                memory_connections = [
                    conn for conn in memory_connections 
                    if conn.get("memory_id") not in remove_memories
                ]
            
            if add_memories:
                existing_ids = {conn.get("memory_id") for conn in memory_connections}
                for memory_id in add_memories:
                    if memory_id not in existing_ids:
                        connection = {
                            "memory_id": memory_id,
                            "memory_serial": f"MEM-{memory_id[:6]}",
                            "connection_type": "manual",
                            "relevance": 1.0,
                            "matched_terms": [],
                            "created": datetime.now().isoformat()
                        }
                        memory_connections.append(connection)
            
            updates["memory_connections"] = memory_connections
        
        # Handle subtasks
        if add_subtasks:
            subtasks_created = []
            for subtask_title in add_subtasks:
                try:
                    subtask_result = create_task(
                        title=subtask_title,
                        project=task["project"],
                        description=f"Subtask of: {task['title']}",
                        category=task.get("category", "general"),
                        priority=task.get("priority", "medium"),
                        parent_task=task_id,
                        auto_link=False
                    )
                    if subtask_result.get("success"):
                        subtasks_created.append(subtask_result["task_id"])
                except Exception as e:
                    print(f"Warning: Could not create subtask '{subtask_title}': {e}", file=sys.stderr)
            
            if subtasks_created:
                updates["subtasks_created"] = subtasks_created
        
        # Apply updates
        updated_task = storage.update_task(task_id, updates)
        
        return {
            "success": True,
            "message": f"Task updated successfully",
            "task_id": task_id,
            "status": updated_task["status"],
            "memory_connections": len(updated_task.get("memory_connections", [])),
            "updated_fields": list(updates.keys())
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to update task: {e}"
        }

def list_tasks(
    project: Optional[str] = None,
    status: Optional[str] = None,
    category: Optional[str] = None,
    has_memory: Optional[str] = None,
    include_subtasks: bool = True,
    limit: int = 20
) -> Dict[str, Any]:
    """List tasks with filtering options"""
    try:
        filters = {
            "project": project,
            "status": status,
            "category": category,
            "has_memory": has_memory,
            "limit": limit
        }
        
        # Remove None values
        filters = {k: v for k, v in filters.items() if v is not None}
        
        tasks = storage.list_tasks(filters)
        
        # Filter subtasks if requested
        if not include_subtasks:
            tasks = [t for t in tasks if not t.get("parent_task")]
        
        # Calculate statistics
        stats = {
            "total": len(tasks),
            "by_status": {},
            "by_project": {},
            "by_priority": {}
        }
        
        for task in tasks:
            # Count by status
            status_key = task.get("status", "unknown")
            stats["by_status"][status_key] = stats["by_status"].get(status_key, 0) + 1
            
            # Count by project
            project_key = task.get("project", "unknown")
            stats["by_project"][project_key] = stats["by_project"].get(project_key, 0) + 1
            
            # Count by priority
            priority_key = task.get("priority", "unknown")
            stats["by_priority"][priority_key] = stats["by_priority"].get(priority_key, 0) + 1
        
        # Prepare task summaries
        task_summaries = []
        for task in tasks:
            summary = {
                "id": task["id"],
                "title": task["title"],
                "serial": task.get("serial"),
                "status": task["status"],
                "priority": task["priority"],
                "project": task["project"],
                "category": task.get("category"),
                "created": task["created"],
                "updated": task["updated"],
                "memory_connections": len(task.get("memory_connections", [])),
                "has_parent": bool(task.get("parent_task")),
                "tags": task.get("tags", [])
            }
            task_summaries.append(summary)
        
        return {
            "success": True,
            "tasks": task_summaries,
            "stats": stats,
            "filters_applied": filters,
            "count": len(tasks)
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to list tasks: {e}"
        }

def get_task_context(
    task_id: str,
    depth: str = "direct"
) -> Dict[str, Any]:
    """Get detailed task information including status, relationships, and connected memories"""
    try:
        task = storage.get_task(task_id)
        if not task:
            return {
                "success": False,
                "error": f"Task not found: {task_id}"
            }
        
        context = {
            "task": task,
            "relationships": {
                "parent": None,
                "subtasks": [],
                "siblings": []
            },
            "connected_memories": [],
            "project_context": {}
        }
        
        # Find parent task
        if task.get("parent_task"):
            parent = storage.get_task(task["parent_task"])
            if parent:
                context["relationships"]["parent"] = {
                    "id": parent["id"],
                    "title": parent["title"],
                    "status": parent["status"]
                }
        
        # Find subtasks
        all_tasks = storage.list_tasks({"project": task["project"], "limit": 1000})
        subtasks = [t for t in all_tasks if t.get("parent_task") == task_id]
        context["relationships"]["subtasks"] = [
            {
                "id": t["id"],
                "title": t["title"],
                "status": t["status"],
                "priority": t["priority"]
            }
            for t in subtasks
        ]
        
        # Find sibling tasks (same parent)
        if task.get("parent_task"):
            siblings = [t for t in all_tasks if t.get("parent_task") == task["parent_task"] and t["id"] != task_id]
            context["relationships"]["siblings"] = [
                {
                    "id": t["id"],
                    "title": t["title"],
                    "status": t["status"]
                }
                for t in siblings
            ]
        
        # Process memory connections
        for connection in task.get("memory_connections", []):
            memory_info = {
                "memory_id": connection.get("memory_id"),
                "connection_type": connection.get("connection_type"),
                "relevance": connection.get("relevance"),
                "created": connection.get("created")
            }
            context["connected_memories"].append(memory_info)
        
        # Project context
        project_tasks = [t for t in all_tasks if t["project"] == task["project"]]
        context["project_context"] = {
            "project_name": task["project"],
            "total_tasks": len(project_tasks),
            "status_distribution": {}
        }
        
        for t in project_tasks:
            status = t.get("status", "unknown")
            context["project_context"]["status_distribution"][status] = (
                context["project_context"]["status_distribution"].get(status, 0) + 1
            )
        
        return {
            "success": True,
            "context": context,
            "depth": depth
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to get task context: {e}"
        }

def delete_task(task_id: str) -> Dict[str, Any]:
    """Delete a task and its subtasks"""
    try:
        task = storage.get_task(task_id)
        if not task:
            return {
                "success": False,
                "error": f"Task not found: {task_id}"
            }
        
        # Find subtasks
        all_tasks = storage.list_tasks({"project": task["project"], "limit": 1000})
        subtasks = [t for t in all_tasks if t.get("parent_task") == task_id]
        
        deleted_tasks = []
        
        # Delete subtasks first
        for subtask in subtasks:
            try:
                storage.delete_task(subtask["id"])
                deleted_tasks.append({
                    "id": subtask["id"],
                    "title": subtask["title"],
                    "type": "subtask"
                })
            except Exception as e:
                print(f"Warning: Could not delete subtask {subtask['id']}: {e}", file=sys.stderr)
        
        # Delete main task
        storage.delete_task(task_id)
        deleted_tasks.append({
            "id": task_id,
            "title": task["title"],
            "type": "main_task"
        })
        
        return {
            "success": True,
            "message": f"Task deleted successfully",
            "deleted_tasks": deleted_tasks,
            "total_deleted": len(deleted_tasks)
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to delete task: {e}"
        }

# Test function for debugging
def test_task_tools():
    """Test all task management tools"""
    print("Testing Python Task Management Tools", file=sys.stderr)
    
    # Test create_task
    print("1. Testing create_task...", file=sys.stderr)
    result = create_task(
        title="Test Python Task Implementation",
        project="python-port",
        description="Testing the Python task management tools implementation",
        category="code",
        priority="high",
        tags=["python", "testing", "mcp-tools"]
    )
    print(f"   Result: {result.get('success')} - {result.get('message')}", file=sys.stderr)
    test_task_id = result.get("task_id")
    
    # Test list_tasks
    print("2. Testing list_tasks...", file=sys.stderr)
    result = list_tasks(project="python-port", limit=10)
    print(f"   Result: {result.get('success')} - Found {result.get('count', 0)} tasks", file=sys.stderr)
    
    # Test update_task
    if test_task_id:
        print("3. Testing update_task...", file=sys.stderr)
        result = update_task(test_task_id, status="in_progress", add_subtasks=["Implement core functions"])
        print(f"   Result: {result.get('success')} - {result.get('message')}", file=sys.stderr)
    
    # Test get_task_context
    if test_task_id:
        print("4. Testing get_task_context...", file=sys.stderr)
        result = get_task_context(test_task_id)
        print(f"   Result: {result.get('success')} - Found {len(result.get('context', {}).get('connected_memories', []))} memory connections", file=sys.stderr)
    
    # Test generate_dropoff
    print("5. Testing generate_dropoff...", file=sys.stderr)
    result = generate_dropoff(
        session_summary="Completed Python task tools implementation",
        recent_memory_count=3
    )
    print(f"   Result: {result.get('success')} - {result.get('message')}", file=sys.stderr)
    
    # Test delete_task (cleanup)
    if test_task_id:
        print("6. Testing delete_task...", file=sys.stderr)
        result = delete_task(test_task_id)
        print(f"   Result: {result.get('success')} - Deleted {result.get('total_deleted', 0)} tasks", file=sys.stderr)
    
    print("Task tools testing completed!", file=sys.stderr)

if __name__ == "__main__":
    # Run tests if called directly
    test_task_tools()