import React, { useState, useMemo, useCallback } from 'react';
import { useVirtualMemoryList } from '@/components/VirtualizedMemoryList';
import { AdvancedSearchFilters, SearchFilter } from '@/components/AdvancedSearchFilters';
import { ContentGrouper, ContentGroup } from '@/components/ContentGrouper';
import { PriorityIndicator } from '@/components/PriorityIndicator';
import { MemoryCard } from '@/components/MemoryCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  LayoutGrid, 
  List, 
  BarChart3, 
  Settings, 
  Eye,
  TrendingUp,
  Zap
} from 'lucide-react';
import { Memory } from '@/types';
import { 
  calculatePriorityScore, 
  sortMemoriesByPriority, 
  PriorityFactors, 
  DEFAULT_PRIORITY_WEIGHTS 
} from '@/utils/contentPrioritization';

interface EnterpriseMemoryDashboardProps {
  memories: Memory[];
  onMemoryUpdate?: (memory: Memory) => void;
  onMemoryDelete?: (memoryId: string) => void;
  initialView?: 'cards' | 'list' | 'groups';
}

export const EnterpriseMemoryDashboard: React.FC<EnterpriseMemoryDashboardProps> = ({
  memories,
  onMemoryUpdate,
  onMemoryDelete,
  initialView = 'cards'
}) => {
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<SearchFilter[]>([]);
  const [priorityWeights, setPriorityWeights] = useState<PriorityFactors>(DEFAULT_PRIORITY_WEIGHTS);
  
  // View and grouping state
  const [viewMode, setViewMode] = useState<'cards' | 'compact' | 'detailed'>('cards');
  const [currentView, setCurrentView] = useState<'cards' | 'list' | 'groups'>(initialView);
  const [groupBy, setGroupBy] = useState<'none' | 'priority' | 'project' | 'date' | 'semantic' | 'tags'>('none');
  const [sortBy, setSortBy] = useState('priority');
  
  // Feature toggles
  const [showPriority, setShowPriority] = useState(true);
  const [enableSmartGrouping, setEnableSmartGrouping] = useState(true);
  const [useVirtualScrolling, setUseVirtualScrolling] = useState(true);

  // Performance settings
  const [performanceMode, setPerformanceMode] = useState<'auto' | 'high' | 'balanced'>('auto');

  // Apply filters to memories
  const filteredMemories = useMemo(() => {
    let result = memories;

    // Apply text search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(memory => 
        memory.content.toLowerCase().includes(query) ||
        memory.title?.toLowerCase().includes(query) ||
        memory.tags?.some(tag => tag.toLowerCase().includes(query)) ||
        memory.project?.toLowerCase().includes(query)
      );
    }

    // Apply advanced filters
    activeFilters.forEach(filter => {
      result = result.filter(memory => {
        switch (filter.type) {
          case 'project':
            return filter.operator === 'equals' 
              ? memory.project === filter.value
              : memory.project?.includes(filter.value as string);
          
          case 'tag':
            return memory.tags?.some(tag => {
              switch (filter.operator) {
                case 'equals': return tag === filter.value;
                case 'contains': return tag.includes(filter.value as string);
                default: return tag.includes(filter.value as string);
              }
            });
          
          case 'category':
            return filter.operator === 'equals'
              ? memory.category === filter.value
              : memory.category?.includes(filter.value as string);
          
          case 'priority':
            const score = calculatePriorityScore(memory, priorityWeights, searchQuery);
            const level = score.total >= 0.8 ? 'critical' : 
                         score.total >= 0.6 ? 'high' : 
                         score.total >= 0.4 ? 'medium' : 'low';
            return level === filter.value;
          
          case 'date':
            const memoryDate = new Date(memory.timestamp);
            const filterDate = new Date(filter.value as string);
            switch (filter.operator) {
              case 'after': return memoryDate > filterDate;
              case 'before': return memoryDate < filterDate;
              case 'equals': return memoryDate.toDateString() === filterDate.toDateString();
              default: return true;
            }
          
          case 'text':
            const content = memory.content.toLowerCase();
            const searchValue = (filter.value as string).toLowerCase();
            switch (filter.operator) {
              case 'contains': return content.includes(searchValue);
              case 'equals': return content === searchValue;
              case 'startsWith': return content.startsWith(searchValue);
              case 'endsWith': return content.endsWith(searchValue);
              default: return content.includes(searchValue);
            }
          
          default:
            return true;
        }
      });
    });

    return result;
  }, [memories, searchQuery, activeFilters, priorityWeights]);

  // Sort memories
  const sortedMemories = useMemo(() => {
    let result = [...filteredMemories];

    switch (sortBy) {
      case 'priority':
        result = sortMemoriesByPriority(result, priorityWeights, searchQuery);
        break;
      case 'date':
        result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        break;
      case 'modified':
        result.sort((a, b) => {
          const aModified = a.last_accessed ? new Date(a.last_accessed).getTime() : new Date(a.timestamp).getTime();
          const bModified = b.last_accessed ? new Date(b.last_accessed).getTime() : new Date(b.timestamp).getTime();
          return bModified - aModified;
        });
        break;
      case 'title':
        result.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        break;
      case 'relevance':
        if (searchQuery.trim()) {
          result.sort((a, b) => {
            const aScore = calculatePriorityScore(a, priorityWeights, searchQuery);
            const bScore = calculatePriorityScore(b, priorityWeights, searchQuery);
            return bScore.relevance - aScore.relevance;
          });
        }
        break;
    }

    return result;
  }, [filteredMemories, sortBy, priorityWeights, searchQuery]);

  // Performance metrics
  const performanceMetrics = useMemo(() => {
    const totalMemories = memories.length;
    const filteredCount = filteredMemories.length;
    const avgPriority = sortedMemories.length > 0 ? 
      sortedMemories.reduce((sum, memory) => {
        const score = calculatePriorityScore(memory, priorityWeights, searchQuery);
        return sum + score.total;
      }, 0) / sortedMemories.length : 0;

    return {
      totalMemories,
      filteredCount,
      filterEfficiency: totalMemories > 0 ? filteredCount / totalMemories : 0,
      avgPriority,
      hasActiveFilters: activeFilters.length > 0 || searchQuery.trim().length > 0
    };
  }, [memories, filteredMemories, sortedMemories, activeFilters, searchQuery, priorityWeights]);

  // Render memory with priority indicator
  const renderMemoryWithPriority = useCallback((memory: Memory, index: number) => {
    const priorityScore = showPriority 
      ? calculatePriorityScore(memory, priorityWeights, searchQuery)
      : undefined;

    return (
      <div key={memory.id} className="relative">
        {showPriority && priorityScore && (
          <div className="absolute top-2 right-2 z-10">
            <PriorityIndicator 
              score={priorityScore} 
              size={viewMode === 'compact' ? 'sm' : 'md'}
              showDetails={viewMode === 'detailed'}
            />
          </div>
        )}
        
        <MemoryCard
          memory={memory}
          viewMode={viewMode}
          onUpdate={onMemoryUpdate}
          onDelete={onMemoryDelete}
          showPriority={false} // We handle priority display above
        />
      </div>
    );
  }, [viewMode, showPriority, priorityWeights, searchQuery, onMemoryUpdate, onMemoryDelete]);

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Advanced Search and Filters */}
      <AdvancedSearchFilters
        memories={memories}
        onFiltersChange={setActiveFilters}
        onSearchQueryChange={setSearchQuery}
        onPriorityWeightsChange={setPriorityWeights}
        onSortChange={setSortBy}
        onGroupChange={setGroupBy}
        searchQuery={searchQuery}
        activeFilters={activeFilters}
        priorityWeights={priorityWeights}
        sortBy={sortBy}
        groupBy={groupBy}
      />

      {/* Performance Dashboard */}
      <div className="flex items-center justify-between p-3 bg-card/20 backdrop-blur-sm border border-border/30 rounded-lg">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-muted-foreground" />
            <span className="text-sm font-medium">
              {performanceMetrics.filteredCount.toLocaleString()} of {performanceMetrics.totalMemories.toLocaleString()} memories
            </span>
          </div>
          
          {performanceMetrics.hasActiveFilters && (
            <Badge variant="outline" className="text-xs">
              {Math.round(performanceMetrics.filterEfficiency * 100)}% match rate
            </Badge>
          )}
          
          <Badge variant="outline" className="text-xs">
            Avg Priority: {Math.round(performanceMetrics.avgPriority * 100)}%
          </Badge>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Priority Indicators</label>
            <Switch checked={showPriority} onCheckedChange={setShowPriority} />
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Virtual Scrolling</label>
            <Switch checked={useVirtualScrolling} onCheckedChange={setUseVirtualScrolling} />
          </div>
        </div>
      </div>

      {/* View Controls */}
      <div className="flex items-center justify-between">
        <Tabs value={currentView} onValueChange={(value) => setCurrentView(value as any)}>
          <TabsList className="grid w-fit grid-cols-3">
            <TabsTrigger value="cards" className="flex items-center gap-2">
              <LayoutGrid size={16} />
              Cards
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List size={16} />
              List
            </TabsTrigger>
            <TabsTrigger value="groups" className="flex items-center gap-2">
              <TrendingUp size={16} />
              Groups
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          {currentView !== 'groups' && (
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'compact' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('compact')}
              >
                Compact
              </Button>
              <Button
                variant={viewMode === 'cards' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('cards')}
              >
                Cards
              </Button>
              <Button
                variant={viewMode === 'detailed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('detailed')}
              >
                Detailed
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={currentView} onValueChange={(value) => setCurrentView(value as any)}>
          <TabsContent value="cards" className="h-full mt-0">
            <div className="h-full">
              {useVirtualScrolling ? (
                <div className="grid gap-4 p-4 h-full overflow-auto">
                  {sortedMemories.map((memory, index) => renderMemoryWithPriority(memory, index))}
                </div>
              ) : (
                <div className="grid gap-4 p-4 h-full overflow-auto">
                  {sortedMemories.map((memory, index) => renderMemoryWithPriority(memory, index))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="list" className="h-full mt-0">
            <div className="h-full overflow-auto">
              <div className="space-y-2 p-4">
                {sortedMemories.map((memory, index) => (
                  <div key={memory.id} className="p-3 bg-card/30 backdrop-blur-sm border border-border/30 rounded-lg">
                    {renderMemoryWithPriority(memory, index)}
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="groups" className="h-full mt-0">
            <div className="h-full overflow-auto">
              <ContentGrouper
                memories={sortedMemories}
                groupingType={groupBy}
                priorityWeights={priorityWeights}
                searchQuery={searchQuery}
                onGroupingChange={setGroupBy}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Performance Footer */}
      {sortedMemories.length === 0 && (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <div className="text-center">
            <div className="text-lg font-medium mb-2">No memories found</div>
            <div className="text-sm">
              {performanceMetrics.hasActiveFilters 
                ? 'Try adjusting your search or filters'
                : 'Create your first memory to get started'
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
};