import React, { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  FolderOpen, 
  Calendar, 
  Tag, 
  Target, 
  Code, 
  Users, 
  TrendingUp,
  ChevronDown,
  ChevronRight,
  BarChart3,
  Clock
} from 'lucide-react';
import { Memory } from '@/types';
import { calculatePriorityScore, PriorityFactors } from '@/utils/contentPrioritization';

export interface ContentGroup {
  id: string;
  title: string;
  description?: string;
  count: number;
  memories: Memory[];
  subGroups?: ContentGroup[];
  metadata?: {
    averagePriority?: number;
    dateRange?: { from: Date; to: Date };
    topTags?: string[];
    keyProjects?: string[];
  };
}

export interface GroupingRule {
  id: string;
  name: string;
  type: 'semantic' | 'temporal' | 'categorical' | 'priority' | 'custom';
  config: any;
  isActive: boolean;
}

interface ContentGrouperProps {
  memories: Memory[];
  groupingType: 'priority' | 'project' | 'date' | 'semantic' | 'tags' | 'custom';
  priorityWeights?: PriorityFactors;
  searchQuery?: string;
  onGroupingChange?: (groupingType: string) => void;
  customRules?: GroupingRule[];
  onRuleChange?: (rules: GroupingRule[]) => void;
}

export const ContentGrouper: React.FC<ContentGrouperProps> = ({
  memories,
  groupingType,
  priorityWeights,
  searchQuery,
  onGroupingChange,
  customRules = [],
  onRuleChange
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showGroupDetails, setShowGroupDetails] = useState(true);

  // Semantic clustering using content similarity
  const clusterBySemantic = (memories: Memory[]): ContentGroup[] => {
    const clusters: { [key: string]: Memory[] } = {
      'Code & Development': [],
      'Research & Learning': [],
      'Project Management': [],
      'Documentation': [],
      'Ideas & Brainstorming': [],
      'Personal Notes': [],
      'Other': []
    };

    memories.forEach(memory => {
      const content = memory.content.toLowerCase();
      const tags = memory.tags || [];
      
      // Code-related patterns
      if (content.includes('```') || 
          tags.some(tag => ['code', 'programming', 'dev', 'javascript', 'typescript', 'python', 'react'].includes(tag.toLowerCase())) ||
          content.includes('function') || content.includes('npm ') || content.includes('git ')) {
        clusters['Code & Development'].push(memory);
      }
      // Research patterns
      else if (tags.some(tag => ['research', 'learning', 'study', 'analysis'].includes(tag.toLowerCase())) ||
               content.includes('research') || content.includes('analysis') || content.includes('study')) {
        clusters['Research & Learning'].push(memory);
      }
      // Project management patterns
      else if (tags.some(tag => ['project', 'task', 'milestone', 'deadline'].includes(tag.toLowerCase())) ||
               content.includes('project') || content.includes('milestone') || content.includes('deadline')) {
        clusters['Project Management'].push(memory);
      }
      // Documentation patterns
      else if (tags.some(tag => ['docs', 'documentation', 'guide', 'tutorial'].includes(tag.toLowerCase())) ||
               content.includes('guide') || content.includes('tutorial') || content.includes('documentation')) {
        clusters['Documentation'].push(memory);
      }
      // Ideas and brainstorming
      else if (tags.some(tag => ['idea', 'brainstorm', 'concept', 'inspiration'].includes(tag.toLowerCase())) ||
               content.includes('idea') || content.includes('concept') || content.includes('brainstorm')) {
        clusters['Ideas & Brainstorming'].push(memory);
      }
      // Personal notes
      else if (tags.some(tag => ['personal', 'private', 'note', 'reminder'].includes(tag.toLowerCase())) ||
               content.includes('personal') || content.includes('reminder')) {
        clusters['Personal Notes'].push(memory);
      }
      else {
        clusters['Other'].push(memory);
      }
    });

    return Object.entries(clusters)
      .filter(([_, memories]) => memories.length > 0)
      .map(([title, memories]) => ({
        id: `semantic-${title.toLowerCase().replace(/\s+/g, '-')}`,
        title,
        count: memories.length,
        memories,
        metadata: {
          averagePriority: memories.reduce((sum, m) => {
            const score = calculatePriorityScore(m, priorityWeights, searchQuery);
            return sum + score.total;
          }, 0) / memories.length,
          topTags: getTopTags(memories, 3)
        }
      }));
  };

  // Timeline-based grouping with smart date ranges
  const groupByTimeline = (memories: Memory[]): ContentGroup[] => {
    const now = new Date();
    const groups: { [key: string]: Memory[] } = {
      'Today': [],
      'Yesterday': [],
      'This Week': [],
      'Last Week': [],
      'This Month': [],
      'Last Month': [],
      'Last 3 Months': [],
      'Last 6 Months': [],
      'This Year': [],
      'Last Year': [],
      'Older': []
    };

    memories.forEach(memory => {
      const date = new Date(memory.timestamp);
      const diffTime = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const diffWeeks = Math.floor(diffDays / 7);
      const diffMonths = Math.floor(diffDays / 30);
      
      if (diffDays === 0) groups['Today'].push(memory);
      else if (diffDays === 1) groups['Yesterday'].push(memory);
      else if (diffDays <= 7) groups['This Week'].push(memory);
      else if (diffDays <= 14) groups['Last Week'].push(memory);
      else if (diffDays <= 30) groups['This Month'].push(memory);
      else if (diffDays <= 60) groups['Last Month'].push(memory);
      else if (diffMonths <= 3) groups['Last 3 Months'].push(memory);
      else if (diffMonths <= 6) groups['Last 6 Months'].push(memory);
      else if (date.getFullYear() === now.getFullYear()) groups['This Year'].push(memory);
      else if (date.getFullYear() === now.getFullYear() - 1) groups['Last Year'].push(memory);
      else groups['Older'].push(memory);
    });

    return Object.entries(groups)
      .filter(([_, memories]) => memories.length > 0)
      .map(([title, memories]) => ({
        id: `timeline-${title.toLowerCase().replace(/\s+/g, '-')}`,
        title,
        count: memories.length,
        memories,
        metadata: {
          dateRange: {
            from: new Date(Math.min(...memories.map(m => new Date(m.timestamp).getTime()))),
            to: new Date(Math.max(...memories.map(m => new Date(m.timestamp).getTime())))
          },
          averagePriority: memories.reduce((sum, m) => {
            const score = calculatePriorityScore(m, priorityWeights, searchQuery);
            return sum + score.total;
          }, 0) / memories.length
        }
      }));
  };

  // Priority-based grouping
  const groupByPriority = (memories: Memory[]): ContentGroup[] => {
    const groups: { [key: string]: Memory[] } = {
      'Critical Priority (80%+)': [],
      'High Priority (60-80%)': [],
      'Medium Priority (40-60%)': [],
      'Low Priority (<40%)': []
    };

    memories.forEach(memory => {
      const score = calculatePriorityScore(memory, priorityWeights, searchQuery);
      
      if (score.total >= 0.8) groups['Critical Priority (80%+)'].push(memory);
      else if (score.total >= 0.6) groups['High Priority (60-80%)'].push(memory);
      else if (score.total >= 0.4) groups['Medium Priority (40-60%)'].push(memory);
      else groups['Low Priority (<40%)'].push(memory);
    });

    return Object.entries(groups)
      .filter(([_, memories]) => memories.length > 0)
      .map(([title, memories]) => ({
        id: `priority-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        title,
        count: memories.length,
        memories,
        metadata: {
          averagePriority: memories.reduce((sum, m) => {
            const score = calculatePriorityScore(m, priorityWeights, searchQuery);
            return sum + score.total;
          }, 0) / memories.length
        }
      }));
  };

  // Tag-based hierarchical grouping
  const groupByTags = (memories: Memory[]): ContentGroup[] => {
    const tagGroups: { [key: string]: Memory[] } = {};
    
    memories.forEach(memory => {
      const tags = memory.tags?.filter(tag => 
        !tag.startsWith('title:') && !tag.startsWith('summary:')
      ) || [];
      
      if (tags.length === 0) {
        if (!tagGroups['Untagged']) tagGroups['Untagged'] = [];
        tagGroups['Untagged'].push(memory);
      } else {
        tags.forEach(tag => {
          if (!tagGroups[tag]) tagGroups[tag] = [];
          tagGroups[tag].push(memory);
        });
      }
    });

    return Object.entries(tagGroups)
      .sort(([_, a], [__, b]) => b.length - a.length) // Sort by count
      .map(([tag, memories]) => ({
        id: `tag-${tag.toLowerCase().replace(/\s+/g, '-')}`,
        title: tag,
        count: memories.length,
        memories,
        metadata: {
          averagePriority: memories.reduce((sum, m) => {
            const score = calculatePriorityScore(m, priorityWeights, searchQuery);
            return sum + score.total;
          }, 0) / memories.length
        }
      }));
  };

  // Project-based grouping
  const groupByProject = (memories: Memory[]): ContentGroup[] => {
    const projectGroups: { [key: string]: Memory[] } = {};
    
    memories.forEach(memory => {
      const project = memory.project || 'No Project';
      if (!projectGroups[project]) projectGroups[project] = [];
      projectGroups[project].push(memory);
    });

    return Object.entries(projectGroups)
      .sort(([_, a], [__, b]) => b.length - a.length)
      .map(([project, memories]) => ({
        id: `project-${project.toLowerCase().replace(/\s+/g, '-')}`,
        title: project,
        count: memories.length,
        memories,
        metadata: {
          averagePriority: memories.reduce((sum, m) => {
            const score = calculatePriorityScore(m, priorityWeights, searchQuery);
            return sum + score.total;
          }, 0) / memories.length,
          topTags: getTopTags(memories, 5)
        }
      }));
  };

  // Helper function to get top tags
  const getTopTags = (memories: Memory[], limit: number): string[] => {
    const tagCounts: { [key: string]: number } = {};
    
    memories.forEach(memory => {
      const tags = memory.tags?.filter(tag => 
        !tag.startsWith('title:') && !tag.startsWith('summary:')
      ) || [];
      tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    return Object.entries(tagCounts)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, limit)
      .map(([tag, _]) => tag);
  };

  // Main grouping logic
  const contentGroups = useMemo((): ContentGroup[] => {
    switch (groupingType) {
      case 'semantic':
        return clusterBySemantic(memories);
      case 'date':
        return groupByTimeline(memories);
      case 'priority':
        return groupByPriority(memories);
      case 'tags':
        return groupByTags(memories);
      case 'project':
        return groupByProject(memories);
      default:
        return [{
          id: 'all',
          title: 'All Memories',
          count: memories.length,
          memories
        }];
    }
  }, [memories, groupingType, priorityWeights, searchQuery]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const getGroupIcon = (groupingType: string, groupTitle: string) => {
    switch (groupingType) {
      case 'semantic':
        if (groupTitle.includes('Code')) return <Code size={16} />;
        if (groupTitle.includes('Research')) return <BarChart3 size={16} />;
        if (groupTitle.includes('Project')) return <Target size={16} />;
        return <FolderOpen size={16} />;
      case 'date':
        return <Clock size={16} />;
      case 'priority':
        return <TrendingUp size={16} />;
      case 'tags':
        return <Tag size={16} />;
      case 'project':
        return <FolderOpen size={16} />;
      default:
        return <FolderOpen size={16} />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Grouping Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Group by:</label>
          <Select value={groupingType} onValueChange={onGroupingChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No grouping</SelectItem>
              <SelectItem value="semantic">Smart Clustering</SelectItem>
              <SelectItem value="priority">Priority Level</SelectItem>
              <SelectItem value="project">Project</SelectItem>
              <SelectItem value="date">Timeline</SelectItem>
              <SelectItem value="tags">Tags</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowGroupDetails(!showGroupDetails)}
          >
            {showGroupDetails ? 'Hide Details' : 'Show Details'}
          </Button>
        </div>
      </div>

      {/* Content Groups */}
      <div className="space-y-3">
        {contentGroups.map(group => (
          <div
            key={group.id}
            className="bg-card/20 backdrop-blur-sm border border-border/30 rounded-lg overflow-hidden"
          >
            {/* Group Header */}
            <div 
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => toggleGroup(group.id)}
            >
              <div className="flex items-center gap-3">
                {expandedGroups.has(group.id) ? (
                  <ChevronDown size={16} className="text-muted-foreground" />
                ) : (
                  <ChevronRight size={16} className="text-muted-foreground" />
                )}
                
                {getGroupIcon(groupingType, group.title)}
                
                <div>
                  <h3 className="font-medium text-foreground">{group.title}</h3>
                  {group.description && (
                    <p className="text-sm text-muted-foreground">{group.description}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {showGroupDetails && group.metadata && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {group.metadata.averagePriority && (
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant="outline" className="text-xs">
                            {Math.round(group.metadata.averagePriority * 100)}% avg
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>Average Priority Score</TooltipContent>
                      </Tooltip>
                    )}
                    
                    {group.metadata.topTags && (
                      <div className="flex gap-1">
                        {group.metadata.topTags.slice(0, 2).map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <Badge variant="outline">
                  {group.count} {group.count === 1 ? 'item' : 'items'}
                </Badge>
              </div>
            </div>

            {/* Group Content (when expanded) */}
            {expandedGroups.has(group.id) && (
              <div className="border-t border-border/20 p-4">
                <div className="text-sm text-muted-foreground mb-2">
                  Memories in this group will be displayed here by the parent component
                </div>
                
                {showGroupDetails && group.metadata && (
                  <div className="grid grid-cols-2 gap-4 mt-3 p-3 bg-background/30 rounded-md text-xs">
                    {group.metadata.averagePriority && (
                      <div>
                        <span className="text-muted-foreground">Avg Priority:</span>
                        <span className="ml-1 font-mono">
                          {Math.round(group.metadata.averagePriority * 100)}%
                        </span>
                      </div>
                    )}
                    
                    {group.metadata.dateRange && (
                      <div>
                        <span className="text-muted-foreground">Date Range:</span>
                        <span className="ml-1 font-mono">
                          {group.metadata.dateRange.from.toLocaleDateString()} - {group.metadata.dateRange.to.toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    
                    {group.metadata.topTags && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Top Tags:</span>
                        <div className="flex gap-1 mt-1">
                          {group.metadata.topTags.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {contentGroups.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <div className="text-lg font-medium mb-2">No groups to display</div>
          <div className="text-sm">Try a different grouping method or adjust your filters</div>
        </div>
      )}
    </div>
  );
};