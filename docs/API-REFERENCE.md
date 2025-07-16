# API Reference

The Like-I-Said Dashboard API provides REST endpoints for managing memories and tasks.

## Base URL
```
http://localhost:3001/api
```

## Authentication
By default, authentication is disabled. When enabled, use JWT tokens in the Authorization header:
```
Authorization: Bearer <token>
```

## Memory Endpoints

### GET /api/memories
List all memories with optional filtering.

**Query Parameters:**
- `project` (string) - Filter by project name
- `category` (string) - Filter by category
- `limit` (number) - Maximum results to return
- `offset` (number) - Pagination offset

**Response:**
```json
{
  "memories": [{
    "id": "string",
    "timestamp": "ISO-8601",
    "content": "string",
    "project": "string",
    "category": "string",
    "tags": ["string"],
    "priority": "low|medium|high",
    "complexity": 1-4,
    "metadata": {}
  }],
  "total": 100
}
```

### GET /api/memories/:id
Get a specific memory by ID.

**Response:**
```json
{
  "id": "string",
  "timestamp": "ISO-8601",
  "content": "string",
  "project": "string",
  "category": "string",
  "tags": ["string"],
  "priority": "low|medium|high",
  "complexity": 1-4,
  "metadata": {},
  "relatedMemories": ["id1", "id2"]
}
```

### POST /api/memories
Create a new memory.

**Request Body:**
```json
{
  "content": "string (required)",
  "project": "string",
  "category": "string",
  "tags": ["string"],
  "priority": "low|medium|high"
}
```

**Response:**
```json
{
  "id": "string",
  "message": "Memory created successfully"
}
```

### PUT /api/memories/:id
Update an existing memory.

**Request Body:**
```json
{
  "content": "string",
  "tags": ["string"],
  "priority": "low|medium|high",
  "category": "string"
}
```

### DELETE /api/memories/:id
Delete a memory.

**Response:**
```json
{
  "message": "Memory deleted successfully"
}
```

### POST /api/memories/search
Search memories with full-text search.

**Request Body:**
```json
{
  "query": "string",
  "project": "string",
  "filters": {
    "category": "string",
    "tags": ["string"],
    "dateRange": {
      "start": "ISO-8601",
      "end": "ISO-8601"
    }
  }
}
```

## Task Endpoints

### GET /api/tasks
List all tasks with filtering.

**Query Parameters:**
- `project` (string) - Filter by project
- `status` (string) - Filter by status (todo|in_progress|done|blocked)
- `category` (string) - Filter by category

**Response:**
```json
{
  "tasks": [{
    "id": "string",
    "serial": "LIK-XXXXX",
    "title": "string",
    "description": "string",
    "project": "string",
    "status": "todo|in_progress|done|blocked",
    "priority": "low|medium|high|urgent",
    "memoryConnections": [],
    "subtasks": []
  }]
}
```

### GET /api/tasks/:id
Get a specific task with full context.

**Response:**
```json
{
  "task": {
    "id": "string",
    "serial": "LIK-XXXXX",
    "title": "string",
    "description": "string",
    "project": "string",
    "status": "todo|in_progress|done|blocked",
    "priority": "low|medium|high|urgent",
    "memoryConnections": [{
      "memoryId": "string",
      "relevance": 0.0-1.0,
      "snippet": "string"
    }],
    "subtasks": ["id1", "id2"],
    "parentTask": "string"
  }
}
```

### POST /api/tasks
Create a new task.

**Request Body:**
```json
{
  "title": "string (required)",
  "project": "string (required)",
  "description": "string",
  "category": "string",
  "priority": "low|medium|high|urgent",
  "parentTask": "string"
}
```

### PUT /api/tasks/:id
Update task status or details.

**Request Body:**
```json
{
  "status": "todo|in_progress|done|blocked",
  "title": "string",
  "description": "string",
  "priority": "low|medium|high|urgent"
}
```

### DELETE /api/tasks/:id
Delete a task and its subtasks.

## Enhancement Endpoints

### POST /api/enhance/memory/:id
Enhance a memory with AI-generated title and summary.

**Request Body:**
```json
{
  "model": "string (optional)",
  "regenerate": false
}
```

### POST /api/enhance/batch
Batch enhance multiple memories.

**Request Body:**
```json
{
  "limit": 50,
  "project": "string",
  "skipExisting": true
}
```

## Settings Endpoints

### GET /api/settings
Get current server settings.

### PUT /api/settings
Update server settings.

**Request Body:**
```json
{
  "authentication": {
    "enabled": false,
    "requireAuth": false
  },
  "features": {
    "autoBackup": true,
    "enableOllama": true
  }
}
```

## WebSocket Events

Connect to WebSocket at `ws://localhost:3001` for real-time updates.

### Events from Server
- `memory:created` - New memory created
- `memory:updated` - Memory updated
- `memory:deleted` - Memory deleted
- `task:created` - New task created
- `task:updated` - Task updated
- `task:deleted` - Task deleted
- `file:changed` - File system change detected

### Events to Server
- `subscribe` - Subscribe to updates
- `unsubscribe` - Unsubscribe from updates

## Error Responses

All endpoints return standard error responses:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "status": 400
}
```

Common status codes:
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `500` - Internal Server Error

## Rate Limiting

No rate limiting is implemented by default. This can be configured through environment variables or settings.