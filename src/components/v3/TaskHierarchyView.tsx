/**
 * TaskHierarchyView - React component for displaying V3 task hierarchy
 * Uses react-window for virtualization to handle large task trees efficiently
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { VariableSizeList as List } from 'react-window';
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileText, Hash, CheckCircle2, Circle, AlertCircle, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';

// Task types matching V3 structure
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
  children?: V3Task[];
  
  // UI state
  isExpanded?: boolean;
  depth?: number;
}

interface TaskHierarchyViewProps {
  tasks: V3Task[];
  onTaskSelect?: (task: V3Task) => void;
  onTaskUpdate?: (taskId: string, updates: Partial<V3Task>) => void;
  onTaskMove?: (taskId: string, newParentId: string) => void;
  selectedTaskId?: string;
  className?: string;
}

export const TaskHierarchyView: React.FC<TaskHierarchyViewProps> = ({
  tasks,
  onTaskSelect,
  onTaskUpdate,
  onTaskMove,
  selectedTaskId,
  className
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const listRef = useRef<List>(null);
  const itemHeights = useRef<{ [key: string]: number }>({});
  
  // Flatten tasks for virtualization while preserving hierarchy
  const flattenedTasks = useMemo(() => {
    const result: (V3Task & { depth: number })[] = [];
    
    const addTask = (task: V3Task, depth: number) => {
      result.push({ ...task, depth });
      
      if (task.children && expandedIds.has(task.id)) {
        task.children.forEach(child => addTask(child, depth + 1));
      }
    };
    
    tasks.forEach(task => addTask(task, 0));
    return result;
  }, [tasks, expandedIds]);
  
  // Toggle task expansion
  const toggleExpanded = useCallback((taskId: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);
  
  // Get item height for virtualization
  const getItemSize = useCallback((index: number) => {
    const task = flattenedTasks[index];
    return itemHeights.current[task.id] || 48; // Default height
  }, [flattenedTasks]);
  
  // Measure and store item height
  const setItemHeight = useCallback((taskId: string, height: number) => {
    if (itemHeights.current[taskId] !== height) {
      itemHeights.current[taskId] = height;
      listRef.current?.resetAfterIndex(0);
    }
  }, []);
  
  // Get icon for task level
  const getLevelIcon = (task: V3Task, isExpanded: boolean) => {
    switch (task.level) {
      case 'master':
        return isExpanded ? 
          <FolderOpen className="w-4 h-4 text-blue-600" /> : 
          <Folder className="w-4 h-4 text-blue-600" />;
      case 'epic':
        return isExpanded ? 
          <FolderOpen className="w-4 h-4 text-purple-600" /> : 
          <Folder className="w-4 h-4 text-purple-600" />;
      case 'task':
        return <FileText className="w-4 h-4 text-green-600" />;
      case 'subtask':
        return <Hash className="w-4 h-4 text-gray-600" />;
    }
  };
  
  // Get status icon
  const getStatusIcon = (status: V3Task['status']) => {
    switch (status) {
      case 'done':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'in_progress':
        return <Circle className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'blocked':
        return <Ban className="w-4 h-4 text-red-500" />;
      default:
        return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };
  
  // Handle drag and drop
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  
  const handleDrop = (e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    
    if (draggedTaskId && draggedTaskId !== targetTaskId && onTaskMove) {
      onTaskMove(draggedTaskId, targetTaskId);
    }
    
    setDraggedTaskId(null);
  };
  
  // Row renderer for virtualization
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const task = flattenedTasks[index];
    const hasChildren = task.children && task.children.length > 0;
    const isExpanded = expandedIds.has(task.id);
    const isSelected = task.id === selectedTaskId;
    const depth = task.depth || 0;
    
    return (
      <div
        ref={(el) => {
          if (el) {
            setItemHeight(task.id, el.getBoundingClientRect().height);
          }
        }}
        style={style}
        className={cn(
          "flex items-center px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors",
          isSelected && "bg-blue-50 dark:bg-blue-900/20",
          draggedTaskId === task.id && "opacity-50"
        )}
        onClick={() => onTaskSelect?.(task)}
        draggable={task.level !== 'master'}
        onDragStart={(e) => handleDragStart(e, task.id)}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, task.id)}
      >
        {/* Indentation */}
        <div style={{ width: depth * 24 }} />
        
        {/* Expand/Collapse button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleExpanded(task.id);
          }}
          className={cn(
            "p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors",
            !hasChildren && "invisible"
          )}
        >
          {isExpanded ? 
            <ChevronDown className="w-3 h-3" /> : 
            <ChevronRight className="w-3 h-3" />
          }
        </button>
        
        {/* Level icon */}
        <div className="mx-2">
          {getLevelIcon(task, isExpanded)}
        </div>
        
        {/* Task title */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <span className={cn(
            "truncate",
            task.level === 'master' && "font-bold text-lg",
            task.level === 'epic' && "font-semibold",
            task.status === 'done' && "line-through text-gray-500"
          )}>
            {task.title}
          </span>
          
          {/* Priority badge */}
          {task.priority === 'urgent' && (
            <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 rounded">
              Urgent
            </span>
          )}
          
          {task.priority === 'high' && (
            <span className="px-1.5 py-0.5 text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 rounded">
              High
            </span>
          )}
        </div>
        
        {/* Path info */}
        <span className="text-xs text-gray-500 dark:text-gray-400 mx-2 font-mono">
          {task.path}
        </span>
        
        {/* Status icon */}
        <div className="mx-2">
          {getStatusIcon(task.status)}
        </div>
      </div>
    );
  };
  
  // Auto-expand to show selected task
  useEffect(() => {
    if (selectedTaskId) {
      const expandToTask = (taskId: string) => {
        const findPath = (tasks: V3Task[], targetId: string, path: string[] = []): string[] | null => {
          for (const task of tasks) {
            if (task.id === targetId) {
              return path;
            }
            if (task.children) {
              const childPath = findPath(task.children, targetId, [...path, task.id]);
              if (childPath) {
                return childPath;
              }
            }
          }
          return null;
        };
        
        const path = findPath(tasks, taskId);
        if (path) {
          setExpandedIds(prev => new Set([...prev, ...path]));
        }
      };
      
      expandToTask(selectedTaskId);
    }
  }, [selectedTaskId, tasks]);
  
  return (
    <div className={cn("h-full flex flex-col", className)}>
      {/* Header */}
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
          Task Hierarchy
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {flattenedTasks.length} tasks
        </p>
      </div>
      
      {/* Virtualized list */}
      <div className="flex-1">
        <List
          ref={listRef}
          height={600} // This should be dynamic based on container
          itemCount={flattenedTasks.length}
          itemSize={getItemSize}
          width="100%"
          overscanCount={5}
        >
          {Row}
        </List>
      </div>
    </div>
  );
};

export default TaskHierarchyView;