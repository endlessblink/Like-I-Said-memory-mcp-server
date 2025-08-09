import React, { useCallback, useEffect, useRef } from 'react'
import { VirtualizedMemoryList } from './VirtualizedMemoryList'
import { useOptimizedMemories } from '../hooks/useOptimizedMemories'
import { MemoryCardsGridSkeleton, RefreshSpinner } from './LoadingStates'
import { Memory, AdvancedFilters, SortOptions } from '../types'
import { Button } from './ui/button'

interface InfiniteScrollMemoriesProps {
  searchFilters?: AdvancedFilters
  sortOptions?: SortOptions
  project?: string
  selectedMemories: Set<string>
  onSelect: (memoryId: string) => void
  onEdit: (memoryId: string) => void
  onDelete: (memoryId: string) => void
  isDeleting: Set<string>
  containerHeight?: number
  enableVirtualization?: boolean
}

export const InfiniteScrollMemories: React.FC<InfiniteScrollMemoriesProps> = ({
  searchFilters = {},
  sortOptions = { field: 'timestamp', order: 'desc' },
  project = 'all',
  selectedMemories,
  onSelect,
  onEdit,
  onDelete,
  isDeleting,
  containerHeight = 600,
  enableVirtualization = true
}) => {
  const scrollElementRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef<HTMLDivElement>(null)

  const {
    memories,
    isLoading,
    isLoadingMore,
    error,
    hasNextPage,
    totalCount,
    stats,
    loadMore,
    refresh,
    isInitialLoad
  } = useOptimizedMemories({
    pageSize: 50,
    enableVirtualization,
    searchFilters,
    sortOptions,
    project
  })

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!loadingRef.current || !enableVirtualization) return

    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0]
        if (target.isIntersecting && hasNextPage && !isLoadingMore && !isLoading) {
          loadMore()
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px' // Start loading when 100px away from the trigger
      }
    )

    observer.observe(loadingRef.current)

    return () => {
      observer.disconnect()
    }
  }, [hasNextPage, isLoadingMore, isLoading, loadMore, enableVirtualization])

  // Handle scroll to top
  const scrollToTop = useCallback(() => {
    if (scrollElementRef.current) {
      scrollElementRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [])

  // Error state
  if (error && !memories.length) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="text-red-500 mb-4">⚠️ Error loading memories</div>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={refresh} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  // Loading state for initial load
  if (isInitialLoad && isLoading) {
    return (
      <div className="p-6">
        <MemoryCardsGridSkeleton count={6} />
      </div>
    )
  }

  return (
    <div className="relative flex flex-col h-full">
      {/* Stats Header */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="text-sm text-muted-foreground">
          Showing {memories.length} of {totalCount} memories
          {stats.hasMore && (
            <span className="ml-2">• Page {stats.currentPage}</span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Performance indicator */}
          {enableVirtualization && (
            <div className="text-xs text-muted-foreground bg-green-500/10 text-green-500 px-2 py-1 rounded">
              Virtualized
            </div>
          )}
          
          <Button
            onClick={refresh}
            variant="ghost"
            size="sm"
            disabled={isLoading}
            className="text-muted-foreground hover:text-violet-400"
          >
            {isLoading ? <RefreshSpinner className="h-4 w-4" /> : "🔄"}
          </Button>
        </div>
      </div>

      {/* Memory List */}
      <div 
        ref={scrollElementRef}
        className="flex-1 overflow-hidden"
        style={{ height: containerHeight }}
      >
        {enableVirtualization ? (
          <VirtualizedMemoryList
            memories={memories}
            selectedMemories={selectedMemories}
            onSelect={onSelect}
            onEdit={onEdit}
            onDelete={onDelete}
            isDeleting={isDeleting}
            containerHeight={containerHeight}
          />
        ) : (
          // Fallback to standard grid for non-virtualized view
          <div className="overflow-auto h-full">
            <div className="grid-responsive p-6">
              {memories.map((memory, index) => (
                <div 
                  key={`memory-${memory.id}-${index}`}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 0.02}s` }}
                >
                  {/* Standard MemoryCard would go here - keeping simple for demo */}
                  <div className="bg-card border border-border rounded-lg p-4">
                    <div className="text-sm text-muted-foreground">
                      Memory #{index + 1}: {memory.id?.substring(0, 8)}...
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Loading More Indicator */}
      {enableVirtualization && (
        <div 
          ref={loadingRef}
          className="flex items-center justify-center py-4"
        >
          {isLoadingMore && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <RefreshSpinner className="h-4 w-4" />
              <span>Loading more memories...</span>
            </div>
          )}
          {!hasNextPage && memories.length > 0 && (
            <div className="text-sm text-muted-foreground">
              All memories loaded • {totalCount} total
            </div>
          )}
        </div>
      )}

      {/* Scroll to top button */}
      <button
        onClick={scrollToTop}
        className="fixed bottom-8 right-8 w-12 h-12 bg-violet-600 hover:bg-violet-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 z-50"
        aria-label="Scroll to top"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      </button>
    </div>
  )
}

export default InfiniteScrollMemories