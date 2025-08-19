/**
 * ProjectsView - Combined view for master projects and their stages
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useV3Tasks } from '@/hooks/useV3Tasks';
import { 
  FolderOpen,
  Plus,
  Calendar,
  CheckCircle2,
  Circle,
  AlertCircle,
  Clock,
  ChevronRight,
  ChevronDown,
  Layers,
  Target,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ProjectWithStats {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  path: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
  stats: {
    total: number;
    completed: number;
    inProgress: number;
    completionRate: number;
    stageCount: number;
  };
  stages: any[];
  isExpanded?: boolean;
}

export const ProjectsView: React.FC = () => {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [selectedView, setSelectedView] = useState<'grid' | 'list'>('grid');
  
  const {
    tasks,
    loading,
    error,
    refreshTasks,
    updateTask
  } = useV3Tasks({
    autoRefresh: true
  });
  
  // Process projects and their stages
  const projectsWithStages = useMemo(() => {
    const projects = tasks.filter(task => task.level === 'master');
    
    return projects.map(project => {
      // Get all tasks under this project
      const projectTasks = tasks.filter(t => t.path.startsWith(project.path) && t.id !== project.id);
      
      // Get immediate stages
      const stages = tasks
        .filter(t => t.parent_id === project.id && t.level === 'epic')
        .map(stage => {
          // Get tasks under this stage
          const stageTasks = tasks.filter(t => t.path.startsWith(stage.path) && t.id !== stage.id);
          const completed = stageTasks.filter(t => t.status === 'done').length;
          const total = stageTasks.length;
          
          return {
            ...stage,
            taskCount: total,
            completedCount: completed,
            completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
          };
        });
      
      // Calculate project stats
      const completed = projectTasks.filter(t => t.status === 'done').length;
      const inProgress = projectTasks.filter(t => t.status === 'in_progress').length;
      const total = projectTasks.length;
      
      return {
        ...project,
        stats: {
          total,
          completed,
          inProgress,
          completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
          stageCount: stages.length
        },
        stages,
        isExpanded: expandedProjects.has(project.id)
      } as ProjectWithStats;
    });
  }, [tasks, expandedProjects]);
  
  // Group projects by status
  const projectsByStatus = useMemo(() => {
    return {
      active: projectsWithStages.filter(p => p.status === 'in_progress'),
      planned: projectsWithStages.filter(p => p.status === 'todo'),
      completed: projectsWithStages.filter(p => p.status === 'done'),
      blocked: projectsWithStages.filter(p => p.status === 'blocked')
    };
  }, [projectsWithStages]);
  
  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done': return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'in_progress': return <Circle className="w-4 h-4 text-blue-600" />;
      case 'blocked': return <AlertCircle className="w-4 h-4 text-red-600" />;
      default: return <Circle className="w-4 h-4 text-gray-400" />;
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
  
  const ProjectCard = ({ project }: { project: ProjectWithStats }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader 
        className="cursor-pointer"
        onClick={() => toggleProject(project.id)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <button className="p-0">
                {project.isExpanded ? 
                  <ChevronDown className="w-4 h-4" /> : 
                  <ChevronRight className="w-4 h-4" />
                }
              </button>
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
        {project.description && !project.isExpanded && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {project.description}
          </p>
        )}
        
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Overall Progress</span>
              <span className="font-medium">{project.stats.completionRate}%</span>
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
        
        {/* Expanded Stages */}
        {project.isExpanded && project.stages.length > 0 && (
          <div className="mt-4 pt-4 border-t space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Layers className="w-4 h-4" />
              Stages / Epics
            </div>
            {project.stages.map(stage => (
              <div 
                key={stage.id}
                className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(stage.status)}
                    <span className="font-medium text-sm">{stage.title}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {stage.taskCount} tasks
                  </Badge>
                </div>
                
                {stage.description && (
                  <p className="text-xs text-gray-600 line-clamp-2">
                    {stage.description}
                  </p>
                )}
                
                <div>
                  <Progress 
                    value={stage.completionRate} 
                    className="h-1.5" 
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{stage.completedCount} done</span>
                    <span>{stage.completionRate}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
  
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
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-gray-600">Manage your projects and their stages</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>
      </div>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Active</p>
                <p className="text-xl font-bold">{projectsByStatus.active.length}</p>
              </div>
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Planned</p>
                <p className="text-xl font-bold">{projectsByStatus.planned.length}</p>
              </div>
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Completed</p>
                <p className="text-xl font-bold">{projectsByStatus.completed.length}</p>
              </div>
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total</p>
                <p className="text-xl font-bold">{projectsWithStages.length}</p>
              </div>
              <FolderOpen className="w-6 h-6 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Projects by Status */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">
            Active ({projectsByStatus.active.length})
          </TabsTrigger>
          <TabsTrigger value="planned">
            Planned ({projectsByStatus.planned.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({projectsByStatus.completed.length})
          </TabsTrigger>
          {projectsByStatus.blocked.length > 0 && (
            <TabsTrigger value="blocked">
              Blocked ({projectsByStatus.blocked.length})
            </TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="active" className="space-y-4">
          {projectsByStatus.active.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-gray-500">No active projects</p>
                <Button className="mt-4" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Start a Project
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {projectsByStatus.active.map(project => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="planned" className="space-y-4">
          {projectsByStatus.planned.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-gray-500">No planned projects</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {projectsByStatus.planned.map(project => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="completed" className="space-y-4">
          {projectsByStatus.completed.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-gray-500">No completed projects yet</p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {projectsByStatus.completed.map(project => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
        
        {projectsByStatus.blocked.length > 0 && (
          <TabsContent value="blocked" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {projectsByStatus.blocked.map(project => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default ProjectsView;