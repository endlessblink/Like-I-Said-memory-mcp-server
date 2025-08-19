import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Memory, AdvancedFilters, SortOptions } from '../types'
import { useApiHelpers } from './useApiHelpers'

interface PaginatedResponse {
  data: Memory[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

interface UseOptimizedMemoriesOptions {
  pageSize?: number
  enableVirtualization?: boolean
  searchFilters?: AdvancedFilters
  sortOptions?: SortOptions
  project?: string
}

export const useOptimizedMemories = (options: UseOptimizedMemoriesOptions = {}) => {
  const {
    pageSize = 50,
    enableVirtualization = true,
    searchFilters = {},
    sortOptions = { field: 'timestamp', order: 'desc' },
    project = 'all'
  } = options

  const { apiGet } = useApiHelpers()
  
  // State management
  const [memories, setMemories] = useState<Memory[]>([])
  const [allMemories, setAllMemories] = useState<Memory[]>([]) // For client-side operations
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // Cache for performance
  const cacheRef = useRef<Map<string, PaginatedResponse>>(new Map())
  const abortControllerRef = useRef<AbortController | null>(null)

  // Create cache key for memoization
  const getCacheKey = useCallback((
    page: number, 
    limit: number, 
    filters: AdvancedFilters, 
    sort: SortOptions, 
    proj: string
  ) => {
    return `${page}-${limit}-${JSON.stringify(filters)}-${JSON.stringify(sort)}-${proj}`
  }, [])

  // Load memories with optimization
  const loadMemories = useCallback(async (
    page = 1, 
    isRefresh = false, 
    appendToExisting = false
  ) => {
    try {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      abortControllerRef.current = new AbortController()

      const isFirstLoad = page === 1 && !appendToExisting
      if (isFirstLoad && !isRefresh) {
        setIsLoading(true)
      } else if (!isFirstLoad) {
        setIsLoadingMore(true)
      }
      
      setError(null)

      // Check cache first
      const cacheKey = getCacheKey(page, pageSize, searchFilters, sortOptions, project)
      if (cacheRef.current.has(cacheKey) && !isRefresh) {
        const cached = cacheRef.current.get(cacheKey)!
        if (appendToExisting && page > 1) {
          setMemories(prev => [...prev, ...cached.data])
        } else {
          setMemories(cached.data)
        }
        setTotalCount(cached.pagination.total)
        setHasNextPage(cached.pagination.hasNext)
        setCurrentPage(page)
        return cached.data
      }

      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        sort: sortOptions.field,
        order: sortOptions.order
      })

      // Add project filter
      if (project && project !== 'all') {
        params.append('project', project)
      }

      // Add search filters (server-side filtering for better performance)
      Object.entries(searchFilters).forEach(([key, value]) => {
        if (value && value.length > 0) {
          params.append(`filter_${key}`, Array.isArray(value) ? value.join(',') : value)
        }
      })

      const response = await apiGet(`/api/memories?${params.toString()}`, {
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result: PaginatedResponse = await response.json()

      // Cache the result
      cacheRef.current.set(cacheKey, result)
      
      // Manage cache size (keep last 50 entries)
      if (cacheRef.current.size > 50) {
        const keys = Array.from(cacheRef.current.keys())
        const oldestKey = keys[0]
        cacheRef.current.delete(oldestKey)
      }

      // Update state
      if (appendToExisting && page > 1) {
        setMemories(prev => [...prev, ...result.data])
        setAllMemories(prev => [...prev, ...result.data])
      } else {
        setMemories(result.data)
        setAllMemories(result.data)
      }

      setTotalCount(result.pagination.total)
      setHasNextPage(result.pagination.hasNext)
      setCurrentPage(page)

      return result.data

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return // Request was cancelled
      }
      console.error('Failed to load memories:', error)
      setError(error instanceof Error ? error.message : 'Failed to load memories')
      return []
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
      setIsInitialLoad(false)
    }
  }, [apiGet, pageSize, searchFilters, sortOptions, project, getCacheKey])

  // Load initial memories
  useEffect(() => {
    loadMemories(1, false, false)
  }, [searchFilters, sortOptions, project]) // Reload when filters change

  // Load more memories for infinite scroll
  const loadMore = useCallback(() => {
    if (!hasNextPage || isLoadingMore || isLoading) return
    loadMemories(currentPage + 1, false, true)
  }, [hasNextPage, isLoadingMore, isLoading, currentPage, loadMemories])

  // Refresh memories
  const refresh = useCallback(() => {
    cacheRef.current.clear() // Clear cache on refresh
    setCurrentPage(1)
    return loadMemories(1, true, false)
  }, [loadMemories])

  // Optimized filtering for client-side operations
  const filteredMemories = useMemo(() => {
    if (enableVirtualization) {
      // For virtualization, use server-filtered results
      return memories
    }
    
    // For non-virtualized views, apply client-side filtering
    return allMemories.filter(memory => {
      // Apply search filters
      if (searchFilters.search) {
        const searchTerm = searchFilters.search.toLowerCase()
        if (!memory.content.toLowerCase().includes(searchTerm)) {
          return false
        }
      }

      if (searchFilters.tags && searchFilters.tags.length > 0) {
        const memoryTags = memory.tags || []
        if (!searchFilters.tags.some(tag => memoryTags.includes(tag))) {
          return false
        }
      }

      if (searchFilters.categories && searchFilters.categories.length > 0) {
        if (!memory.category || !searchFilters.categories.includes(memory.category)) {
          return false
        }
      }

      return true
    })
  }, [memories, allMemories, searchFilters, enableVirtualization])

  // Memory stats
  const stats = useMemo(() => ({
    total: totalCount,
    loaded: memories.length,
    hasMore: hasNextPage,
    currentPage,
    cacheSize: cacheRef.current.size
  }), [totalCount, memories.length, hasNextPage, currentPage])

  // Cleanup
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    memories: filteredMemories,
    isLoading,
    isLoadingMore,
    error,
    hasNextPage,
    currentPage,
    totalCount,
    stats,
    loadMore,
    refresh,
    isInitialLoad
  }
}

export default useOptimizedMemories