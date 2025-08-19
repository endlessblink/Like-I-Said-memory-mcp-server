/**
 * TaskHierarchyDemo - Demo page for V3 hierarchical task management
 * Shows the TaskHierarchyView with sample data and interactions
 */

import React, { useState, useMemo } from 'react';
import { TaskHierarchyView } from './TaskHierarchyView';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { useV3Tasks } from '../../hooks/useV3Tasks';
import { RefreshCw, Plus, Search, Filter } from 'lucide-react';
import { Input } from '../ui/input';

export const TaskHierarchyDemo: React.FC = () => {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Use the V3 tasks hook
  const {
    tasks,
    loading,
    error,
    refreshTasks,
    updateTask,
    moveTask,
    getTaskTree,
    searchTasks,
    getTaskById
  } = useV3Tasks({
    autoRefresh: true,
    includeCompleted: true
  });
  
  // Get hierarchical tree
  const taskTree = useMemo(() => getTaskTree(), [getTaskTree]);
  
  // Filter tasks
  const filteredTasks = useMemo(() => {
    let filtered = searchQuery ? searchTasks(searchQuery) : tasks;
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(task => task.status === filterStatus);
    }
    
    // Rebuild tree from filtered tasks
    const taskIds = new Set(filtered.map(t => t.id));
    const filterTree = (tasks: any[]): any[] => {
      return tasks
        .filter(t => taskIds.has(t.id))
        .map(t => ({
          ...t,
          children: t.children ? filterTree(t.children) : []
        }));
    };
    
    return filterTree(taskTree);
  }, [taskTree, searchQuery, filterStatus, searchTasks, tasks]);
  
  // Get selected task details
  const selectedTask = selectedTaskId ? getTaskById(selectedTaskId) : null;
  
  // Handle task selection
  const handleTaskSelect = (task: any) => {
    setSelectedTaskId(task.id);
  };
  
  // Handle task status update
  const handleStatusUpdate = async (status: string) => {
    if (selectedTask) {
      await updateTask(selectedTask.id, { status });
    }
  };
  
  // Sample data generator for demo
  const generateSampleData = () => {
    // This would normally create sample tasks via API
    console.log('Generate sample data - implement with API calls');
  };
  
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">V3 Task Hierarchy</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Hierarchical task management with 4-level structure
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={generateSampleData} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Sample Data
            </Button>
            <Button onClick={refreshTasks} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
        
        {/* Search and Filter */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filterStatus === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus('all')}
                >
                  All
                </Button>
                <Button
                  variant={filterStatus === 'todo' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus('todo')}
                >
                  Todo
                </Button>
                <Button
                  variant={filterStatus === 'in_progress' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus('in_progress')}
                >
                  In Progress
                </Button>
                <Button
                  variant={filterStatus === 'done' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus('done')}
                >
                  Done
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Task Hierarchy */}
          <Card className="lg:col-span-2">
            <CardContent className="p-0">
              {error ? (
                <div className="p-8 text-center text-red-600">
                  Error: {error}
                </div>
              ) : loading ? (
                <div className="p-8 text-center">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
                  Loading tasks...
                </div>
              ) : (
                <TaskHierarchyView
                  tasks={filteredTasks}
                  selectedTaskId={selectedTaskId || undefined}
                  onTaskSelect={handleTaskSelect}
                  onTaskUpdate={updateTask}
                  onTaskMove={moveTask}
                  className="h-[600px]"
                />
              )}
            </CardContent>
          </Card>
          
          {/* Task Details */}
          <Card>
            <CardHeader>
              <CardTitle>Task Details</CardTitle>
              <CardDescription>
                {selectedTask ? 'View and edit task information' : 'Select a task to view details'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedTask ? (
                <div className="space-y-4">
                  {/* Task Info */}
                  <div>
                    <h3 className="font-semibold text-lg">{selectedTask.title}</h3>
                    <div className="flex gap-2 mt-2">
                      <Badge variant={selectedTask.level === 'master' ? 'default' : 'secondary'}>
                        {selectedTask.level}
                      </Badge>
                      <Badge variant={
                        selectedTask.priority === 'urgent' ? 'destructive' :
                        selectedTask.priority === 'high' ? 'default' :
                        'secondary'
                      }>
                        {selectedTask.priority}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Description */}
                  {selectedTask.description && (
                    <div>
                      <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Description
                      </h4>
                      <p className="text-sm">{selectedTask.description}</p>
                    </div>
                  )}
                  
                  {/* Path Info */}
                  <div>
                    <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Path
                    </h4>
                    <code className="text-xs bg-gray-100 dark:bg-gray-800 p-1 rounded">
                      {selectedTask.path}
                    </code>
                  </div>
                  
                  {selectedTask.semantic_path && (
                    <div>
                      <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Semantic Path
                      </h4>
                      <code className="text-xs bg-gray-100 dark:bg-gray-800 p-1 rounded break-all">
                        {selectedTask.semantic_path}
                      </code>
                    </div>
                  )}
                  
                  {/* Status Actions */}
                  <div>
                    <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Status
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant={selectedTask.status === 'todo' ? 'default' : 'outline'}
                        onClick={() => handleStatusUpdate('todo')}
                      >
                        Todo
                      </Button>
                      <Button
                        size="sm"
                        variant={selectedTask.status === 'in_progress' ? 'default' : 'outline'}
                        onClick={() => handleStatusUpdate('in_progress')}
                      >
                        In Progress
                      </Button>
                      <Button
                        size="sm"
                        variant={selectedTask.status === 'done' ? 'default' : 'outline'}
                        onClick={() => handleStatusUpdate('done')}
                      >
                        Done
                      </Button>
                      <Button
                        size="sm"
                        variant={selectedTask.status === 'blocked' ? 'default' : 'outline'}
                        onClick={() => handleStatusUpdate('blocked')}
                      >
                        Blocked
                      </Button>
                    </div>
                  </div>
                  
                  {/* Metadata */}
                  <Tabs defaultValue="metadata" className="mt-4">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="metadata">Metadata</TabsTrigger>
                      <TabsTrigger value="raw">Raw Data</TabsTrigger>
                    </TabsList>
                    <TabsContent value="metadata">
                      <ScrollArea className="h-48">
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium">Created:</span>{' '}
                            {new Date(selectedTask.created_at).toLocaleString()}
                          </div>
                          <div>
                            <span className="font-medium">Updated:</span>{' '}
                            {new Date(selectedTask.updated_at).toLocaleString()}
                          </div>
                          {selectedTask.estimated_hours && (
                            <div>
                              <span className="font-medium">Estimated:</span>{' '}
                              {selectedTask.estimated_hours}h
                            </div>
                          )}
                          {selectedTask.tags && selectedTask.tags.length > 0 && (
                            <div>
                              <span className="font-medium">Tags:</span>{' '}
                              {selectedTask.tags.join(', ')}
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                    <TabsContent value="raw">
                      <ScrollArea className="h-48">
                        <pre className="text-xs">
                          {JSON.stringify(selectedTask, null, 2)}
                        </pre>
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  Select a task to view details
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {tasks.filter(t => t.level === 'master').length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Projects</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {tasks.filter(t => t.level === 'epic').length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Stages</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {tasks.filter(t => t.level === 'task').length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Tasks</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {tasks.filter(t => t.level === 'subtask').length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Subtasks</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TaskHierarchyDemo;