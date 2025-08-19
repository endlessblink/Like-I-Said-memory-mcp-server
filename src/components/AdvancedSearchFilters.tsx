import React, { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Search, 
  Filter, 
  X, 
  Plus, 
  Calendar, 
  Tag, 
  User, 
  Star, 
  Clock, 
  Target,
  Save,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { Memory } from '@/types';
import { PriorityFactors, DEFAULT_PRIORITY_WEIGHTS } from '@/utils/contentPrioritization';

export interface SearchFilter {
  id: string;
  type: 'text' | 'tag' | 'project' | 'date' | 'priority' | 'category';
  operator: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'before' | 'after' | 'between' | 'greaterThan' | 'lessThan';
  value: string | string[] | number | Date | { from: Date; to: Date };
  label: string;
}

export interface SavedSearchView {
  id: string;
  name: string;
  filters: SearchFilter[];
  sortBy: string;
  groupBy: string;
  priorityWeights: PriorityFactors;
  isDefault?: boolean;
}

interface AdvancedSearchFiltersProps {
  memories: Memory[];
  onFiltersChange: (filters: SearchFilter[]) => void;
  onSearchQueryChange: (query: string) => void;
  onPriorityWeightsChange: (weights: PriorityFactors) => void;
  onSortChange: (sortBy: string) => void;
  onGroupChange: (groupBy: string) => void;
  searchQuery: string;
  activeFilters: SearchFilter[];
  priorityWeights: PriorityFactors;
  sortBy: string;
  groupBy: string;
}

export const AdvancedSearchFilters: React.FC<AdvancedSearchFiltersProps> = ({
  memories,
  onFiltersChange,
  onSearchQueryChange,
  onPriorityWeightsChange,
  onSortChange,
  onGroupChange,
  searchQuery,
  activeFilters,
  priorityWeights,
  sortBy,
  groupBy
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPriorityWeights, setShowPriorityWeights] = useState(false);
  const [savedViews, setSavedViews] = useState<SavedSearchView[]>([]);
  const [newFilterType, setNewFilterType] = useState<SearchFilter['type']>('text');

  // Extract available options from memories
  const availableOptions = useMemo(() => {
    const projects = new Set<string>();
    const tags = new Set<string>();
    const categories = new Set<string>();
    
    memories.forEach(memory => {
      if (memory.project) projects.add(memory.project);
      if (memory.category) categories.add(memory.category);
      if (memory.tags) {
        memory.tags.forEach(tag => {
          if (!tag.startsWith('title:') && !tag.startsWith('summary:')) {
            tags.add(tag);
          }
        });
      }
    });

    return {
      projects: Array.from(projects).sort(),
      tags: Array.from(tags).sort(),
      categories: Array.from(categories).sort()
    };
  }, [memories]);

  const addFilter = (type: SearchFilter['type']) => {
    const newFilter: SearchFilter = {
      id: `filter-${Date.now()}`,
      type,
      operator: type === 'date' ? 'after' : 'contains',
      value: '',
      label: `${type} filter`
    };

    onFiltersChange([...activeFilters, newFilter]);
  };

  const updateFilter = (filterId: string, updates: Partial<SearchFilter>) => {
    const updatedFilters = activeFilters.map(filter =>
      filter.id === filterId ? { ...filter, ...updates } : filter
    );
    onFiltersChange(updatedFilters);
  };

  const removeFilter = (filterId: string) => {
    onFiltersChange(activeFilters.filter(filter => filter.id !== filterId));
  };

  const clearAllFilters = () => {
    onFiltersChange([]);
    onSearchQueryChange('');
    onPriorityWeightsChange(DEFAULT_PRIORITY_WEIGHTS);
    onSortChange('priority');
    onGroupChange('none');
  };

  const saveCurrentView = () => {
    const name = prompt('Enter a name for this search view:');
    if (!name) return;

    const newView: SavedSearchView = {
      id: `view-${Date.now()}`,
      name,
      filters: activeFilters,
      sortBy,
      groupBy,
      priorityWeights
    };

    setSavedViews(prev => [...prev, newView]);
    
    // Save to localStorage
    const savedViewsStorage = JSON.parse(localStorage.getItem('savedSearchViews') || '[]');
    savedViewsStorage.push(newView);
    localStorage.setItem('savedSearchViews', JSON.stringify(savedViewsStorage));
  };

  const loadView = (view: SavedSearchView) => {
    onFiltersChange(view.filters);
    onSortChange(view.sortBy);
    onGroupChange(view.groupBy);
    onPriorityWeightsChange(view.priorityWeights);
  };

  const deleteView = (viewId: string) => {
    setSavedViews(prev => prev.filter(view => view.id !== viewId));
    
    // Update localStorage
    const savedViewsStorage = JSON.parse(localStorage.getItem('savedSearchViews') || '[]');
    const updatedViews = savedViewsStorage.filter((view: SavedSearchView) => view.id !== viewId);
    localStorage.setItem('savedSearchViews', JSON.stringify(updatedViews));
  };

  const renderFilterInput = (filter: SearchFilter) => {
    switch (filter.type) {
      case 'project':
        return (
          <Select
            value={filter.value as string}
            onValueChange={(value) => updateFilter(filter.id, { value })}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {availableOptions.projects.map(project => (
                <SelectItem key={project} value={project}>{project}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'tag':
        return (
          <Select
            value={filter.value as string}
            onValueChange={(value) => updateFilter(filter.id, { value })}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select tag" />
            </SelectTrigger>
            <SelectContent>
              {availableOptions.tags.map(tag => (
                <SelectItem key={tag} value={tag}>{tag}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'category':
        return (
          <Select
            value={filter.value as string}
            onValueChange={(value) => updateFilter(filter.id, { value })}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {availableOptions.categories.map(category => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'priority':
        return (
          <Select
            value={filter.value as string}
            onValueChange={(value) => updateFilter(filter.id, { value })}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        );

      case 'date':
        return (
          <Input
            type="date"
            value={filter.value as string}
            onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
            className="w-40"
          />
        );

      default:
        return (
          <Input
            value={filter.value as string}
            onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
            placeholder="Enter value..."
            className="w-40"
          />
        );
    }
  };

  return (
    <div className="space-y-4 p-4 bg-card/30 backdrop-blur-sm border border-border/30 rounded-lg">
      {/* Main Search Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search memories... (supports natural language queries)"
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2"
        >
          <Filter size={16} />
          Filters
          {activeFilters.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {activeFilters.length}
            </Badge>
          )}
        </Button>
      </div>

      {/* Active Filter Chips */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map(filter => (
            <Badge
              key={filter.id}
              variant="secondary"
              className="flex items-center gap-2 px-3 py-1"
            >
              <span className="capitalize">{filter.type}</span>
              <span className="text-muted-foreground">{filter.operator}</span>
              <span className="font-medium">{String(filter.value)}</span>
              <button
                onClick={() => removeFilter(filter.id)}
                className="hover:text-destructive"
              >
                <X size={12} />
              </button>
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            <RotateCcw size={12} className="mr-1" />
            Clear all
          </Button>
        </div>
      )}

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="space-y-4 pt-4 border-t border-border/20">
          {/* Add New Filter */}
          <div className="flex items-center gap-2">
            <Select
              value={newFilterType}
              onValueChange={(value) => setNewFilterType(value as SearchFilter['type'])}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="tag">Tag</SelectItem>
                <SelectItem value="project">Project</SelectItem>
                <SelectItem value="category">Category</SelectItem>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => addFilter(newFilterType)}
              variant="outline"
              size="sm"
            >
              <Plus size={16} className="mr-1" />
              Add Filter
            </Button>
          </div>

          {/* Active Filters Configuration */}
          {activeFilters.map(filter => (
            <div key={filter.id} className="flex items-center gap-2 p-3 bg-background/50 rounded-md">
              <span className="capitalize font-medium w-20">{filter.type}</span>
              
              <Select
                value={filter.operator}
                onValueChange={(value) => updateFilter(filter.id, { operator: value as SearchFilter['operator'] })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {filter.type === 'date' ? (
                    <>
                      <SelectItem value="before">Before</SelectItem>
                      <SelectItem value="after">After</SelectItem>
                      <SelectItem value="between">Between</SelectItem>
                    </>
                  ) : filter.type === 'priority' ? (
                    <>
                      <SelectItem value="equals">Equals</SelectItem>
                      <SelectItem value="greaterThan">Higher than</SelectItem>
                      <SelectItem value="lessThan">Lower than</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="contains">Contains</SelectItem>
                      <SelectItem value="equals">Equals</SelectItem>
                      <SelectItem value="startsWith">Starts with</SelectItem>
                      <SelectItem value="endsWith">Ends with</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>

              {renderFilterInput(filter)}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFilter(filter.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 size={16} />
              </Button>
            </div>
          ))}

          <Separator />

          {/* Sort and Group Controls */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Sort by</label>
              <Select value={sortBy} onValueChange={onSortChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="priority">Priority Score</SelectItem>
                  <SelectItem value="date">Date Created</SelectItem>
                  <SelectItem value="modified">Last Modified</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="relevance">Relevance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Group by</label>
              <Select value={groupBy} onValueChange={onGroupChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No grouping</SelectItem>
                  <SelectItem value="priority">Priority Level</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="date">Date Range</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Priority Weights */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Priority Algorithm Weights</label>
              <Switch
                checked={showPriorityWeights}
                onCheckedChange={setShowPriorityWeights}
              />
            </div>
            
            {showPriorityWeights && (
              <div className="grid grid-cols-4 gap-4 p-3 bg-background/50 rounded-md">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Recency</label>
                  <Input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={priorityWeights.recencyWeight}
                    onChange={(e) => onPriorityWeightsChange({
                      ...priorityWeights,
                      recencyWeight: parseFloat(e.target.value)
                    })}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Relevance</label>
                  <Input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={priorityWeights.relevanceWeight}
                    onChange={(e) => onPriorityWeightsChange({
                      ...priorityWeights,
                      relevanceWeight: parseFloat(e.target.value)
                    })}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Interaction</label>
                  <Input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={priorityWeights.interactionWeight}
                    onChange={(e) => onPriorityWeightsChange({
                      ...priorityWeights,
                      interactionWeight: parseFloat(e.target.value)
                    })}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Importance</label>
                  <Input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={priorityWeights.importanceWeight}
                    onChange={(e) => onPriorityWeightsChange({
                      ...priorityWeights,
                      importanceWeight: parseFloat(e.target.value)
                    })}
                    className="text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Saved Views */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Saved Search Views</label>
              <Button onClick={saveCurrentView} variant="outline" size="sm">
                <Save size={16} className="mr-1" />
                Save Current View
              </Button>
            </div>
            
            {savedViews.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {savedViews.map(view => (
                  <div key={view.id} className="flex items-center gap-1">
                    <Button
                      onClick={() => loadView(view)}
                      variant="secondary"
                      size="sm"
                    >
                      {view.name}
                    </Button>
                    <Button
                      onClick={() => deleteView(view.id)}
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive p-1"
                    >
                      <X size={12} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};