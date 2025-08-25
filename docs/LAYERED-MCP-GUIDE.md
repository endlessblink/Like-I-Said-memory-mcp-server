# Layered MCP System Guide

The Like-I-Said MCP server now features a layered architecture that dynamically provides tools based on context and user needs, reducing cognitive load and improving performance.

## Overview

Instead of showing all 42 tools at once, the system organizes tools into 5 logical layers:

- **🔧 Core** (8 tools) - Essential memory and task operations
- **🏗️ Project** (11 tools) - Hierarchical project management  
- **🧠 Memory** (8 tools) - Advanced memory analysis and enhancement
- **⚙️ Admin** (8 tools) - System configuration and performance
- **🤖 AI** (7 tools) - AI-powered content enhancement

## Configuration Options

### Environment Variables

Control the system behavior with these environment variables:

```bash
# Default layers to activate on startup
export MCP_DEFAULT_LAYERS="core,project"

# Enable/disable smart layer suggestions  
export MCP_SMART_SUGGESTIONS="true"

# Maximum number of concurrent tools
export MCP_MAX_TOOLS="15"
```

### Usage Examples

**Minimal Setup (Core only):**
```bash
export MCP_DEFAULT_LAYERS="core"
# Shows only 8 essential tools
```

**Developer Setup:**
```bash
export MCP_DEFAULT_LAYERS="core,project,memory"
# Shows 27 tools for development work
```

**AI Enhancement Setup:**
```bash
export MCP_DEFAULT_LAYERS="core,ai,memory"  
export MCP_SMART_SUGGESTIONS="true"
# Shows AI and memory tools with smart suggestions
```

## Layer Management Tools

### 1. `list_available_layers`
View all available layers and their status:

```json
{
  "show_tools": true,        // Include tool lists (optional)
  "only_inactive": false     // Show only inactive layers (optional)  
}
```

### 2. `activate_layer`  
Activate one or more layers:

```json
{
  "layer_id": "project"                    // Single layer
  // OR
  "multiple_layers": ["memory", "admin"]   // Multiple layers
}
```

### 3. `deactivate_layer`
Deactivate layers (cannot deactivate core):

```json
{
  "layer_id": "ai"                        // Single layer
  // OR  
  "multiple_layers": ["memory", "admin"]  // Multiple layers
}
```

### 4. `get_layer_suggestions`
Get intelligent layer suggestions:

```json
{
  "query_context": "I need to enhance memories with AI",  // Optional context
  "include_stats": true                                   // Include usage stats
}
```

## Smart Context Detection

The system automatically analyzes your queries and suggests relevant layers:

- **"project"** queries → suggests Project Management layer
- **"enhance"** or **"AI"** → suggests AI Enhancement layer  
- **"performance"** or **"configure"** → suggests System Administration layer
- **"analyze"** or **"metadata"** → suggests Advanced Memory layer

## Layer Details

### 🔧 Core Layer (Always Active)
Essential tools for basic functionality:
- `add_memory`, `search_memories`, `get_memory`
- `create_task`, `list_tasks`, `get_task_context`  
- `test_tool`, `generate_dropoff`

### 🏗️ Project Management Layer
Hierarchical project organization:
- `create_project`, `create_stage`, `create_hierarchical_task`
- `create_subtask`, `move_task`, `view_project`
- `setup_project_structure`, `validate_hierarchy`

### 🧠 Advanced Memory Layer  
Enhanced memory management:
- `enhance_memory_metadata`, `batch_enhance_memories`
- `smart_status_update`, `get_task_status_analytics`
- `validate_task_workflow`, `get_automation_suggestions`

### ⚙️ System Administration Layer
Configuration and performance:
- `set_memory_path`, `set_task_path`, `get_current_paths`
- `analyze_performance`, `suggest_improvements`
- `work_detector_control`, `deduplicate_memories`

### 🤖 AI Enhancement Layer
AI-powered features:
- `batch_enhance_memories_ollama`, `enhance_memory_ollama`
- `check_ollama_status`, `batch_enhance_tasks_ollama`
- `update_task`, `delete_task`, `enforce_proactive_memory`

## Benefits

### For Users
✅ **Reduced Cognitive Load** - See 8-15 relevant tools instead of 42
✅ **Better Performance** - Faster tool discovery and selection  
✅ **Context Awareness** - System suggests tools based on your needs
✅ **Flexible Control** - Activate layers as needed
✅ **Learning System** - Gets better with usage patterns

### For System
✅ **Scalability** - Easy to add tools to appropriate layers
✅ **Maintainability** - Organized, logical tool grouping
✅ **Performance** - Reduced memory and processing overhead
✅ **Analytics** - Track layer usage patterns

## Workflow Examples

### Starting a New Project
```
1. Start with core tools active (default)
2. Use: list_available_layers 
3. See suggestion for project management
4. Use: activate_layer {"layer_id": "project"}
5. Now have project creation and management tools
```

### AI Enhancement Workflow  
```
1. Working with memories 
2. System detects "enhance" in your queries
3. Use: get_layer_suggestions
4. See AI enhancement layer suggested
5. Use: activate_layer {"layer_id": "ai"}  
6. Access AI-powered enhancement tools
```

### Performance Optimization
```
1. Notice slow performance
2. Use: get_layer_suggestions {"query_context": "performance issues"}
3. See admin layer suggested
4. Use: activate_layer {"layer_id": "admin"}
5. Access performance analysis tools
```

## Testing

Run the layered system tests:

```bash
node scripts/test-layered-mcp.js
```

This will verify:
- Default tool loading (core layer)
- Layer activation/deactivation
- Smart suggestions
- Configuration system
- Performance metrics

## Migration from Full System

If you're used to having all 42 tools available:

```bash
# Activate all layers for full compatibility
export MCP_DEFAULT_LAYERS="core,project,memory,admin,ai"
```

Or activate them on-demand:
```json
// Use this tool call to get everything
{
  "name": "activate_layer", 
  "arguments": {
    "multiple_layers": ["project", "memory", "admin", "ai"]
  }
}
```

The layered system maintains full backward compatibility while providing a more focused, efficient user experience.