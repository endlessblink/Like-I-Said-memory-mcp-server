/**
 * useV3Tasks - Hook for managing V3 hierarchical tasks
 * Handles fetching, updating, and real-time sync of tasks
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from './useWebSocket';

interface V3Task {
  id: string;
  title: string;
  description?: string;
  level: 'master' | 'epic' | 'task' | 'subtask';
  parent_id: string | null;
  path: string;
  path_order: number;
  status: 'todo' | 'in_progress' | 'done' | 'blocked';
  project: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  semantic_path?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
  
  // Enhanced fields
  due_date?: string;
  estimated_hours?: number;
  actual_hours?: number;
  assignee?: string;
  tags?: string[];
  dependencies?: string[];
  checklist?: Array<{ id: string; text: string; completed: boolean }>;
  completion_percentage?: number;
  
  // Computed fields
  children?: V3Task[];
}

interface UseV3TasksOptions {
  project?: string;
  autoRefresh?: boolean;
  includeCompleted?: boolean;
}

interface UseV3TasksReturn {
  tasks: V3Task[];
  loading: boolean;
  error: string | null;
  refreshTasks: () => Promise<void>;
  createTask: (task: Partial<V3Task>) => Promise<V3Task>;
  updateTask: (taskId: string, updates: Partial<V3Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  moveTask: (taskId: string, newParentId: string) => Promise<void>;
  searchTasks: (query: string) => V3Task[];
  getTaskById: (taskId: string) => V3Task | undefined;
  getTaskTree: () => V3Task[];
}

export const useV3Tasks = (options: UseV3TasksOptions = {}): UseV3TasksReturn => {
  const { project, autoRefresh = true, includeCompleted = true } = options;
  
  const [tasks, setTasks] = useState<V3Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const tasksMap = useRef<Map<string, V3Task>>(new Map());
  
  // Handle task updates from WebSocket
  const handleTaskUpdate = useCallback((data: any) => {
    if (data.type === 'task_created' || data.type === 'task_updated') {
      // Update or add task
      const updatedTask = data.task;
      setTasks(prev => {
        const exists = prev.some(t => t.id === updatedTask.id);
        if (exists) {
          return prev.map(t => t.id === updatedTask.id ? updatedTask : t);
        } else {
          return [...prev, updatedTask];
        }
      });
      tasksMap.current.set(updatedTask.id, updatedTask);
    } else if (data.type === 'task_deleted') {
      // Remove task
      const { taskId } = data;
      setTasks(prev => prev.filter(t => t.id !== taskId));
      tasksMap.current.delete(taskId);
    }
  }, []);
  
  // WebSocket for real-time updates
  const { isConnected, sendMessage } = useWebSocket({
    onMessage: (data) => {
      if (data.type === 'v3_task_update' && autoRefresh) {
        handleTaskUpdate(data);
      }
    }
  });
  
  // Fetch tasks from API
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (project) params.append('project', project);
      if (!includeCompleted) params.append('status', 'active');
      
      const response = await fetch(`/api/v3/tasks?${params}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.statusText}`);
      }
      
      const data = await response.json();
      setTasks(data.tasks || []);
      
      // Update tasks map
      tasksMap.current.clear();
      data.tasks?.forEach((task: V3Task) => {
        tasksMap.current.set(task.id, task);
      });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
      console.error('Error fetching V3 tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [project, includeCompleted]);
  
  // Create a new task
  const createTask = useCallback(async (taskData: Partial<V3Task>): Promise<V3Task> => {
    const response = await fetch('/api/v3/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(taskData),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create task: ${response.statusText}`);
    }
    
    const newTask = await response.json();
    
    // Optimistically update local state
    setTasks(prev => [...prev, newTask]);
    tasksMap.current.set(newTask.id, newTask);
    
    return newTask;
  }, []);
  
  // Update a task
  const updateTask = useCallback(async (taskId: string, updates: Partial<V3Task>) => {
    const response = await fetch(`/api/v3/tasks/${taskId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update task: ${response.statusText}`);
    }
    
    const updatedTask = await response.json();
    
    // Update local state
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, ...updatedTask } : task
    ));
    
    if (tasksMap.current.has(taskId)) {
      tasksMap.current.set(taskId, { ...tasksMap.current.get(taskId)!, ...updatedTask });
    }
  }, []);
  
  // Delete a task
  const deleteTask = useCallback(async (taskId: string) => {
    const response = await fetch(`/api/v3/tasks/${taskId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete task: ${response.statusText}`);
    }
    
    // Remove from local state
    setTasks(prev => prev.filter(task => task.id !== taskId));
    tasksMap.current.delete(taskId);
  }, []);
  
  // Move a task to a new parent
  const moveTask = useCallback(async (taskId: string, newParentId: string) => {
    const response = await fetch(`/api/v3/tasks/${taskId}/move`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ newParentId }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to move task: ${response.statusText}`);
    }
    
    // Refresh tasks to get updated hierarchy
    await fetchTasks();
  }, [fetchTasks]);
  
  // Search tasks
  const searchTasks = useCallback((query: string): V3Task[] => {
    if (!query) return tasks;
    
    const lowerQuery = query.toLowerCase();
    return tasks.filter(task => 
      task.title.toLowerCase().includes(lowerQuery) ||
      task.description?.toLowerCase().includes(lowerQuery) ||
      task.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }, [tasks]);
  
  // Get task by ID
  const getTaskById = useCallback((taskId: string): V3Task | undefined => {
    return tasksMap.current.get(taskId);
  }, []);
  
  // Build hierarchical tree from flat list
  const getTaskTree = useCallback((): V3Task[] => {
    const tasksCopy = tasks.map(t => ({ ...t, children: [] as V3Task[] }));
    const taskMap = new Map(tasksCopy.map(t => [t.id, t]));
    const roots: V3Task[] = [];
    
    tasksCopy.forEach(task => {
      if (task.parent_id && taskMap.has(task.parent_id)) {
        const parent = taskMap.get(task.parent_id)!;
        parent.children = parent.children || [];
        parent.children.push(task);
      } else if (!task.parent_id) {
        roots.push(task);
      }
    });
    
    // Sort children by path_order
    const sortChildren = (tasks: V3Task[]) => {
      tasks.sort((a, b) => a.path_order - b.path_order);
      tasks.forEach(task => {
        if (task.children?.length) {
          sortChildren(task.children);
        }
      });
    };
    
    sortChildren(roots);
    return roots;
  }, [tasks]);
  
  
  // Initial fetch
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);
  
  return {
    tasks,
    loading,
    error,
    refreshTasks: fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    searchTasks,
    getTaskById,
    getTaskTree,
  };
};

export default useV3Tasks;