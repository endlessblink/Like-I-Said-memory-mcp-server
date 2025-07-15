# Memory Tools Implementation

This document describes the Python implementation of the 6 core memory tools for Like-I-Said MCP Server v2.

## Overview

The memory tools provide persistent storage for AI conversations and important information using a file-based system compatible with the Node.js implementation.

## Implemented Tools

### 1. add_memory
**Purpose**: Store new memories with automatic categorization and metadata
**Parameters**:
- `content` (required): The memory content to store
- `tags` (optional): List of tags for organization
- `category` (optional): Memory category (personal, work, code, research, conversations, preferences)
- `project` (optional): Project name for organization
- `priority` (optional): Priority level (low, medium, high)
- `status` (optional): Memory status (active, archived, reference)
- `related_memories` (optional): IDs of related memories
- `language` (optional): Programming language for code content

**Returns**: Success status and memory ID

### 2. get_memory
**Purpose**: Retrieve a specific memory by ID
**Parameters**:
- `id` (required): The memory ID to retrieve

**Returns**: Memory object with metadata and content

### 3. list_memories
**Purpose**: List stored memories with optional filtering
**Parameters**:
- `limit` (optional): Maximum number of memories to return
- `project` (optional): Filter by project name

**Returns**: List of memories with metadata

### 4. delete_memory
**Purpose**: Delete a memory by ID
**Parameters**:
- `id` (required): The memory ID to delete

**Returns**: Success status

### 5. search_memories
**Purpose**: Search memories by content, tags, category, and project
**Parameters**:
- `query` (required): Search query string
- `project` (optional): Limit search to specific project

**Returns**: List of matching memories

### 6. test_tool
**Purpose**: Simple connectivity test for MCP server
**Parameters**:
- `message` (required): Test message

**Returns**: Test response with timestamp

## File Format

Memories are stored as Markdown files with YAML frontmatter:

```yaml
---
id: uuid
timestamp: ISO-string
complexity: 1-4
category: personal|work|code|research|conversations|preferences
project: project-name
tags: [tag1, tag2]
priority: low|medium|high
status: active|archived|reference
related_memories: [id1, id2]
access_count: number
last_accessed: ISO-string
metadata:
  content_type: text|code|structured
  language: programming-language
  size: number
  mermaid_diagram: boolean
---

Memory content goes here...
```

## Storage Organization

- **Base Directory**: `memories/` (configurable)
- **Project Directories**: `memories/{project}/`
- **Default Project**: `memories/default/`
- **File Naming**: `YYYY-MM-DD-{id_prefix}.md`

## Features

### Content Type Detection
Automatically detects:
- **text**: Plain text content
- **code**: Programming code (based on patterns and syntax)
- **structured**: JSON, YAML, or other structured data

### Project Organization
- Memories organized by project in separate directories
- Cross-project search and listing capabilities
- Automatic project directory creation

### Access Tracking
- Tracks access count for each memory
- Records last accessed timestamp
- Updates on each retrieval

### Compatibility
- 100% compatible with Node.js memory format
- Supports migration between implementations
- Maintains all metadata fields

## Usage Example

```python
from memory_tools import *

# Add a memory
result = add_memory(
    content="Important project insight",
    tags=["insight", "project"],
    category="work",
    project="my-project",
    priority="high"
)
print(f"Memory ID: {result['memory_id']}")

# Search memories
results = search_memories("insight", project="my-project")
print(f"Found {results['count']} memories")

# Get specific memory
memory = get_memory(result['memory_id'])
print(f"Content: {memory['memory']['content']}")
```

## Testing

Comprehensive test suite available in `test_memory_tools_comprehensive.py`:

```bash
python test_memory_tools_comprehensive.py
```

Tests cover:
- Basic functionality for all 6 tools
- Content type detection
- Project organization
- File format compatibility
- Error handling
- Edge cases (empty content, Unicode, large content)

## Dependencies

- Python 3.7+
- PyYAML for YAML parsing
- uuid for ID generation
- pathlib for file operations
- datetime for timestamps

## Error Handling

- Graceful handling of missing files
- Validation of memory IDs
- Content type detection fallbacks
- Project directory auto-creation
- Comprehensive logging

## Performance

- Efficient file-based storage
- Lazy loading of memory content
- Project-based organization for scalability
- Optimized search across content and metadata