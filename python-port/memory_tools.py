#!/usr/bin/env python3
"""
Memory Tools Module for Like-I-Said MCP Server v2 Python Port

This module implements the 6 core memory tools:
1. add_memory
2. get_memory
3. list_memories
4. delete_memory
5. search_memories
6. test_tool

Compatible with the Node.js memory format (YAML frontmatter markdown files).
"""

import os
import re
import json
import uuid
import yaml
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any, Union
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MemoryStorage:
    """File-based memory storage compatible with Node.js implementation"""
    
    def __init__(self, base_dir: str = "memories"):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(exist_ok=True)
        
        # Default project directory
        self.default_dir = self.base_dir / "default"
        self.default_dir.mkdir(exist_ok=True)
    
    def get_project_dir(self, project: Optional[str] = None) -> Path:
        """Get directory for a specific project"""
        if not project or project == "default":
            return self.default_dir
        
        project_dir = self.base_dir / project
        project_dir.mkdir(exist_ok=True)
        return project_dir
    
    def parse_memory_file(self, filepath: Path) -> Optional[Dict[str, Any]]:
        """Parse a memory file from disk, compatible with Node.js format"""
        try:
            content = filepath.read_text(encoding='utf-8')
            return self.parse_memory_content(content, filepath)
        except Exception as e:
            logger.error(f"Error parsing memory file {filepath}: {e}")
            return None
    
    def parse_memory_content(self, content: str, filepath: Optional[Path] = None) -> Optional[Dict[str, Any]]:
        """Parse memory content from YAML frontmatter format"""
        if not content or not isinstance(content, str):
            return None
        
        # Match YAML frontmatter
        frontmatter_pattern = r'^---\r?\n(.*?)\r?\n---(.*?)$'
        match = re.match(frontmatter_pattern, content, re.DOTALL)
        
        if not match:
            return None
        
        try:
            # Parse YAML frontmatter
            frontmatter_str = match.group(1)
            body_content = match.group(2).strip()
            
            frontmatter = yaml.safe_load(frontmatter_str) or {}
            
            # Build memory object compatible with Node.js format
            memory = {
                'content': body_content,
                'metadata': {},
                'format': 'yaml'
            }
            
            # Core fields from frontmatter
            memory['id'] = frontmatter.get('id', '')
            memory['timestamp'] = frontmatter.get('timestamp', '')
            memory['complexity'] = frontmatter.get('complexity', 1)
            memory['category'] = frontmatter.get('category', '')
            memory['project'] = frontmatter.get('project', '')
            memory['tags'] = frontmatter.get('tags', [])
            memory['priority'] = frontmatter.get('priority', 'medium')
            memory['status'] = frontmatter.get('status', 'active')
            memory['related_memories'] = frontmatter.get('related_memories', [])
            memory['access_count'] = frontmatter.get('access_count', 0)
            memory['last_accessed'] = frontmatter.get('last_accessed', memory['timestamp'])
            
            # Metadata fields
            metadata = frontmatter.get('metadata', {})
            memory['metadata'].update({
                'content_type': metadata.get('content_type', 'text'),
                'language': metadata.get('language'),
                'size': metadata.get('size', len(body_content)),
                'mermaid_diagram': metadata.get('mermaid_diagram', False)
            })
            
            # File metadata if filepath provided
            if filepath:
                memory['filename'] = filepath.name
                memory['filepath'] = str(filepath)
                
                # Extract project from directory structure
                project_name = filepath.parent.name
                if project_name not in ['default', 'memories']:
                    memory['project'] = project_name
            
            # Ensure all required fields
            self.ensure_required_fields(memory)
            
            return memory
            
        except Exception as e:
            logger.error(f"Error parsing YAML frontmatter: {e}")
            return None
    
    def ensure_required_fields(self, memory: Dict[str, Any]) -> Dict[str, Any]:
        """Ensure memory has all required fields for compatibility"""
        # Core fields
        if not memory.get('id'):
            memory['id'] = str(uuid.uuid4())
        if not memory.get('timestamp'):
            memory['timestamp'] = datetime.now().isoformat()
        if not memory.get('complexity'):
            memory['complexity'] = 1
        if not memory.get('priority'):
            memory['priority'] = 'medium'
        if not memory.get('status'):
            memory['status'] = 'active'
        if not memory.get('access_count'):
            memory['access_count'] = 0
        if not memory.get('last_accessed'):
            memory['last_accessed'] = memory['timestamp']
        if not memory.get('tags'):
            memory['tags'] = []
        
        # Metadata fields
        if not memory.get('metadata'):
            memory['metadata'] = {}
        if not memory['metadata'].get('content_type'):
            memory['metadata']['content_type'] = self.detect_content_type(memory.get('content', ''))
        if not memory['metadata'].get('size'):
            memory['metadata']['size'] = len(memory.get('content', ''))
        if memory['metadata'].get('mermaid_diagram') is None:
            memory['metadata']['mermaid_diagram'] = False
        
        return memory
    
    def detect_content_type(self, content: str) -> str:
        """Detect content type based on content analysis"""
        if not content:
            return 'text'
        
        # Check for code patterns
        code_patterns = [
            r'```\w+',  # Code blocks with language
            r'function\s+\w+\s*\(',  # Function definitions
            r'class\s+\w+',  # Class definitions
            r'import\s+\w+',  # Import statements
            r'def\s+\w+\s*\(',  # Python functions
            r'const\s+\w+\s*=',  # JavaScript constants
        ]
        
        for pattern in code_patterns:
            if re.search(pattern, content):
                return 'code'
        
        # Check for structured data
        try:
            json.loads(content)
            return 'structured'
        except:
            pass
        
        # Check for YAML
        try:
            yaml.safe_load(content)
            if ':' in content and '\n' in content:
                return 'structured'
        except:
            pass
        
        return 'text'
    
    def generate_markdown_content(self, memory: Dict[str, Any]) -> str:
        """Generate standardized YAML frontmatter format"""
        frontmatter = {
            'id': memory['id'],
            'timestamp': memory['timestamp'],
            'complexity': memory.get('complexity', 1),
        }
        
        # Optional fields
        if memory.get('category'):
            frontmatter['category'] = memory['category']
        if memory.get('project'):
            frontmatter['project'] = memory['project']
        if memory.get('tags'):
            frontmatter['tags'] = memory['tags']
        
        frontmatter.update({
            'priority': memory.get('priority', 'medium'),
            'status': memory.get('status', 'active'),
        })
        
        if memory.get('related_memories'):
            frontmatter['related_memories'] = memory['related_memories']
        
        frontmatter.update({
            'access_count': memory.get('access_count', 0),
            'last_accessed': memory.get('last_accessed', memory['timestamp']),
        })
        
        # Metadata section
        metadata = memory.get('metadata', {})
        if metadata:
            frontmatter['metadata'] = {
                'content_type': metadata.get('content_type', 'text'),
                'size': metadata.get('size', len(memory.get('content', ''))),
                'mermaid_diagram': metadata.get('mermaid_diagram', False)
            }
            if metadata.get('language'):
                frontmatter['metadata']['language'] = metadata['language']
        
        # Generate YAML frontmatter
        yaml_content = yaml.dump(frontmatter, default_flow_style=False, allow_unicode=True)
        
        return f"---\n{yaml_content}---\n\n{memory.get('content', '')}"
    
    def save_memory(self, memory: Dict[str, Any]) -> bool:
        """Save memory to file"""
        try:
            project_dir = self.get_project_dir(memory.get('project'))
            
            # Generate filename from timestamp and ID
            timestamp_part = memory['timestamp'][:10]  # YYYY-MM-DD
            id_part = memory['id'][:8]  # First 8 chars of ID
            filename = f"{timestamp_part}-{id_part}.md"
            
            filepath = project_dir / filename
            content = self.generate_markdown_content(memory)
            
            filepath.write_text(content, encoding='utf-8')
            logger.info(f"Saved memory to {filepath}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving memory: {e}")
            return False
    
    def load_memory(self, memory_id: str) -> Optional[Dict[str, Any]]:
        """Load a specific memory by ID"""
        for project_dir in self.base_dir.iterdir():
            if not project_dir.is_dir():
                continue
            
            for filepath in project_dir.glob("*.md"):
                memory = self.parse_memory_file(filepath)
                if memory and memory.get('id') == memory_id:
                    return memory
        
        return None
    
    def list_memories(self, project: Optional[str] = None, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """List memories with optional project filter and limit"""
        memories = []
        
        if project:
            project_dirs = [self.get_project_dir(project)]
        else:
            project_dirs = [d for d in self.base_dir.iterdir() if d.is_dir()]
        
        for project_dir in project_dirs:
            for filepath in project_dir.glob("*.md"):
                memory = self.parse_memory_file(filepath)
                if memory:
                    memories.append(memory)
        
        # Sort by timestamp (newest first) - handle both string and datetime objects
        def get_timestamp_key(memory):
            timestamp = memory.get('timestamp', '')
            if isinstance(timestamp, str):
                try:
                    return datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                except:
                    return datetime.min
            return timestamp if isinstance(timestamp, datetime) else datetime.min
        
        memories.sort(key=get_timestamp_key, reverse=True)
        
        if limit:
            memories = memories[:limit]
        
        return memories
    
    def search_memories(self, query: str, project: Optional[str] = None) -> List[Dict[str, Any]]:
        """Search memories by content and metadata"""
        all_memories = self.list_memories(project=project)
        matching_memories = []
        
        query_lower = query.lower()
        
        for memory in all_memories:
            # Search in content
            content_match = query_lower in memory.get('content', '').lower()
            
            # Search in tags
            tags_match = any(query_lower in tag.lower() for tag in memory.get('tags', []))
            
            # Search in category
            category_match = query_lower in memory.get('category', '').lower()
            
            # Search in project
            project_match = query_lower in memory.get('project', '').lower()
            
            if content_match or tags_match or category_match or project_match:
                matching_memories.append(memory)
        
        return matching_memories
    
    def delete_memory(self, memory_id: str) -> bool:
        """Delete a memory by ID"""
        for project_dir in self.base_dir.iterdir():
            if not project_dir.is_dir():
                continue
            
            for filepath in project_dir.glob("*.md"):
                memory = self.parse_memory_file(filepath)
                if memory and memory.get('id') == memory_id:
                    try:
                        filepath.unlink()
                        logger.info(f"Deleted memory {memory_id}")
                        return True
                    except Exception as e:
                        logger.error(f"Error deleting memory file {filepath}: {e}")
                        return False
        
        logger.warning(f"Memory {memory_id} not found")
        return False


# Global storage instance
storage = MemoryStorage()

def set_storage(new_storage):
    """Set the global storage instance (for testing)"""
    global storage
    storage = new_storage


def add_memory(
    content: str,
    tags: Optional[List[str]] = None,
    category: Optional[str] = None,
    project: Optional[str] = None,
    priority: Optional[str] = None,
    status: Optional[str] = None,
    related_memories: Optional[List[str]] = None,
    language: Optional[str] = None
) -> Dict[str, Any]:
    """
    Store information with auto-categorization and linking.
    
    Args:
        content: The memory content to store
        tags: Optional tags for the memory
        category: Memory category (personal, work, code, research, conversations, preferences)
        project: Project name to organize memory files
        priority: Priority level (low, medium, high)
        status: Memory status (active, archived, reference)
        related_memories: IDs of related memories for cross-referencing
        language: Programming language for code content
    
    Returns:
        Dict containing memory ID and success status
    """
    try:
        # Create memory object
        memory = {
            'id': str(uuid.uuid4()),
            'timestamp': datetime.now().isoformat(),
            'content': content,
            'tags': tags or [],
            'category': category or 'conversations',
            'project': project or 'default',
            'priority': priority or 'medium',
            'status': status or 'active',
            'related_memories': related_memories or [],
            'access_count': 0,
            'metadata': {}
        }
        
        # Set language in metadata if provided
        if language:
            memory['metadata']['language'] = language
        
        # Ensure required fields and detect content type
        storage.ensure_required_fields(memory)
        
        # Save memory
        if storage.save_memory(memory):
            return {
                'success': True,
                'memory_id': memory['id'],
                'message': f"Memory stored successfully with ID: {memory['id']}"
            }
        else:
            return {
                'success': False,
                'error': 'Failed to save memory'
            }
            
    except Exception as e:
        logger.error(f"Error in add_memory: {e}")
        return {
            'success': False,
            'error': str(e)
        }


def get_memory(memory_id: str) -> Dict[str, Any]:
    """
    Retrieve a memory by ID.
    
    Args:
        memory_id: The memory ID to retrieve
    
    Returns:
        Dict containing memory data or error
    """
    try:
        memory = storage.load_memory(memory_id)
        
        if memory:
            # Update access count and last accessed
            memory['access_count'] = memory.get('access_count', 0) + 1
            memory['last_accessed'] = datetime.now().isoformat()
            
            # Save updated memory
            storage.save_memory(memory)
            
            return {
                'success': True,
                'memory': memory
            }
        else:
            return {
                'success': False,
                'error': f'Memory not found: {memory_id}'
            }
            
    except Exception as e:
        logger.error(f"Error in get_memory: {e}")
        return {
            'success': False,
            'error': str(e)
        }


def list_memories(limit: Optional[int] = None, project: Optional[str] = None) -> Dict[str, Any]:
    """
    List all stored memories or memories from a specific project.
    
    Args:
        limit: Maximum number of memories to return
        project: Filter by project name
    
    Returns:
        Dict containing list of memories
    """
    try:
        memories = storage.list_memories(project=project, limit=limit)
        
        return {
            'success': True,
            'memories': memories,
            'count': len(memories)
        }
        
    except Exception as e:
        logger.error(f"Error in list_memories: {e}")
        return {
            'success': False,
            'error': str(e)
        }


def delete_memory(memory_id: str) -> Dict[str, Any]:
    """
    Delete a memory by ID.
    
    Args:
        memory_id: The memory ID to delete
    
    Returns:
        Dict containing success status
    """
    try:
        if storage.delete_memory(memory_id):
            return {
                'success': True,
                'message': f'Memory {memory_id} deleted successfully'
            }
        else:
            return {
                'success': False,
                'error': f'Memory not found: {memory_id}'
            }
            
    except Exception as e:
        logger.error(f"Error in delete_memory: {e}")
        return {
            'success': False,
            'error': str(e)
        }


def search_memories(query: str, project: Optional[str] = None) -> Dict[str, Any]:
    """
    Search memories by content and metadata.
    
    Args:
        query: Search query
        project: Limit search to specific project
    
    Returns:
        Dict containing matching memories
    """
    try:
        memories = storage.search_memories(query, project=project)
        
        return {
            'success': True,
            'memories': memories,
            'count': len(memories),
            'query': query
        }
        
    except Exception as e:
        logger.error(f"Error in search_memories: {e}")
        return {
            'success': False,
            'error': str(e)
        }


def test_tool(message: str) -> Dict[str, Any]:
    """
    Simple test tool to verify MCP is working.
    
    Args:
        message: Test message
    
    Returns:
        Dict containing test response
    """
    return {
        'success': True,
        'message': f'Test successful! Received: {message}',
        'timestamp': datetime.now().isoformat(),
        'server': 'like-i-said-v2-python'
    }


# Tool registry for MCP server
MEMORY_TOOLS = {
    'add_memory': add_memory,
    'get_memory': get_memory,
    'list_memories': list_memories,
    'delete_memory': delete_memory,
    'search_memories': search_memories,
    'test_tool': test_tool
}


def test_memory_tools():
    """Test all memory tools"""
    print("Testing memory tools...")
    
    # Test 1: test_tool
    print("\n1. Testing test_tool:")
    result = test_tool("Hello MCP!")
    print(json.dumps(result, indent=2))
    
    # Test 2: add_memory
    print("\n2. Testing add_memory:")
    result = add_memory(
        content="This is a test memory for Python implementation",
        tags=["test", "python", "mcp"],
        category="code",
        project="test-project",
        priority="high"
    )
    print(json.dumps(result, indent=2))
    memory_id = result.get('memory_id')
    
    # Test 3: get_memory
    print("\n3. Testing get_memory:")
    if memory_id:
        result = get_memory(memory_id)
        print(json.dumps(result, indent=2, default=str))
    
    # Test 4: list_memories
    print("\n4. Testing list_memories:")
    result = list_memories(limit=5)
    print(f"Found {result.get('count', 0)} memories")
    
    # Test 5: search_memories
    print("\n5. Testing search_memories:")
    result = search_memories("test")
    print(f"Found {result.get('count', 0)} memories matching 'test'")
    
    # Test 6: delete_memory
    print("\n6. Testing delete_memory:")
    if memory_id:
        result = delete_memory(memory_id)
        print(json.dumps(result, indent=2))
    
    print("\nAll tests completed!")


if __name__ == "__main__":
    test_memory_tools()