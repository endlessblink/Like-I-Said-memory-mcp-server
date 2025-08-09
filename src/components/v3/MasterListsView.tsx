/**
 * MasterListsView - Shows all master-level projects in a clean, organized view
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useV3Tasks } from '@/hooks/useV3Tasks';
import { 
  FolderOpen, 
  Plus, 
  Calendar, 
  CheckCircle2, 
  Circle, 
  AlertCircle,
  Clock,
  Users,
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';

export const MasterListsView: React.FC = () => {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  
  const {
    tasks,
    loading,
    error,
    refreshTasks,
    updateTask
  } = useV3Tasks({
    autoRefresh: true
  });
  
  // Get only master-level tasks (projects)
  const projects = useMemo(() => {
    return tasks.filter(task => task.level === 'master').map(project => {
      // Calculate project stats
      const allTasks = tasks.filter(t => t.path.startsWith(project.path) && t.id !== project.id);
      const completed = allTasks.filter(t => t.status === 'done').length;
      const inProgress = allTasks.filter(t => t.status === 'in_progress').length;
      const total = allTasks.length;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
      
      // Get immediate children (stages/epics)
      const stages = tasks.filter(t => t.parent_id === project.id && t.level === 'epic');
      
      return {
        ...project,
        stats: {
          total,
          completed,
          inProgress,
          completionRate,
          stageCount: stages.length
        },
        stages
      };
    });
  }, [tasks]);
  
  // Group projects by status
  const projectsByStatus = useMemo(() => {
    return {
      active: projects.filter(p => p.status === 'in_progress'),
      planned: projects.filter(p => p.status === 'todo'),
      completed: projects.filter(p => p.status === 'done'),
      blocked: projects.filter(p => p.status === 'blocked')
    };
  }, [projects]);
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done': return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'in_progress': return <Circle className="w-5 h-5 text-blue-600" />;
      case 'blocked': return <AlertCircle className="w-5 h-5 text-red-600" />;
      default: return <Circle className="w-5 h-5 text-gray-400" />;
    }
  };
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-center text-red-600 p-8">
        Error loading projects: {error}
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Master Lists</h1>
          <p className="text-gray-600">Manage your top-level projects and initiatives</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Projects</p>
                <p className="text-2xl font-bold">{projectsByStatus.active.length}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Planned</p>
                <p className="text-2xl font-bold">{projectsByStatus.planned.length}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold">{projectsByStatus.completed.length}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Projects</p>
                <p className="text-2xl font-bold">{projects.length}</p>
              </div>
              <FolderOpen className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Active Projects */}
      {projectsByStatus.active.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Active Projects</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projectsByStatus.active.map(project => (
              <Card 
                key={project.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedProjectId(project.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {getStatusIcon(project.status)}
                        {project.title}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {project.stats.stageCount} stages • {project.stats.total} tasks
                      </CardDescription>
                    </div>
                    <Badge variant={getPriorityColor(project.priority)}>
                      {project.priority}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {project.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {project.description}
                    </p>
                  )}
                  
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Progress</span>
                        <span>{project.stats.completionRate}%</span>
                      </div>
                      <Progress value={project.stats.completionRate} className="h-2" />
                    </div>
                    
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>{project.stats.completed} completed</span>
                      <span>{project.stats.inProgress} in progress</span>
                    </div>
                    
                    {project.due_date && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        Due {format(new Date(project.due_date), 'MMM d, yyyy')}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
      
      {/* Planned Projects */}
      {projectsByStatus.planned.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Planned Projects</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projectsByStatus.planned.map(project => (
              <Card 
                key={project.id} 
                className="opacity-75 hover:opacity-100 hover:shadow-lg transition-all cursor-pointer"
                onClick={() => setSelectedProjectId(project.id)}
              >
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {getStatusIcon(project.status)}
                    {project.title}
                  </CardTitle>
                  <CardDescription>
                    Not started • {project.stats.total} tasks planned
                  </CardDescription>
                </CardHeader>
                {project.description && (
                  <CardContent>
                    <p className="text-sm text-gray-600 line-clamp-3">
                      {project.description}
                    </p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
      
      {/* Completed Projects */}
      {projectsByStatus.completed.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Completed Projects</h2>
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {projectsByStatus.completed.map(project => (
                <Card 
                  key={project.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => setSelectedProjectId(project.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(project.status)}
                        <div>
                          <p className="font-medium">{project.title}</p>
                          <p className="text-sm text-gray-600">
                            Completed {format(new Date(project.updated_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{project.stats.total} tasks</p>
                        <p className="text-xs text-gray-600">{project.stats.stageCount} stages</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default MasterListsView;