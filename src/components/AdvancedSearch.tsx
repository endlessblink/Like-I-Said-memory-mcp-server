import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AdvancedFilters, MemoryCategory, ContentType } from "@/types"
import { Search, Filter, X, ChevronDown, ChevronUp } from "lucide-react"

interface AdvancedSearchProps {
  query: string
  filters: AdvancedFilters
  onQueryChange: (query: string) => void
  onFiltersChange: (filters: AdvancedFilters) => void
  availableTags: string[]
  availableProjects: string[]
  className?: string
}

const categories: { value: MemoryCategory; label: string }[] = [
  { value: 'personal', label: 'Personal' },
  { value: 'work', label: 'Work' },
  { value: 'code', label: 'Code' },
  { value: 'research', label: 'Research' },
  { value: 'conversations', label: 'Conversations' },
  { value: 'preferences', label: 'Preferences' }
]

const contentTypes: { value: ContentType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'code', label: 'Code' },
  { value: 'structured', label: 'Structured' }
]

export function AdvancedSearch({
  query,
  filters,
  onQueryChange,
  onFiltersChange,
  availableTags,
  availableProjects,
  className = ""
}: AdvancedSearchProps) {
  const [showFilters, setShowFilters] = useState(false)
  const [tagInput, setTagInput] = useState("")

  const hasActiveFilters = Boolean(
    filters.tags?.length ||
    filters.project ||
    filters.category ||
    filters.contentType ||
    filters.dateRange
  )

  const handleAddTag = (tag: string) => {
    if (!tag.trim() || filters.tags?.includes(tag)) return
    
    onFiltersChange({
      ...filters,
      tags: [...(filters.tags || []), tag]
    })
    setTagInput("")
  }

  const handleRemoveTag = (tagToRemove: string) => {
    onFiltersChange({
      ...filters,
      tags: filters.tags?.filter(tag => tag !== tagToRemove) || []
    })
  }

  const handleClearFilters = () => {
    onFiltersChange({})
  }

  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    onFiltersChange({
      ...filters,
      dateRange: {
        ...filters.dateRange,
        [field]: value
      }
    })
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search memories..."
            className="pl-10 pr-4"
          />
        </div>
        
        <Button
          variant={showFilters ? "default" : "outline"}
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
              {[
                filters.tags?.length || 0,
                filters.project ? 1 : 0,
                filters.category ? 1 : 0,
                filters.contentType ? 1 : 0,
                filters.dateRange ? 1 : 0
              ].reduce((a, b) => a + b, 0)}
            </Badge>
          )}
          {showFilters ? (
            <ChevronUp className="h-4 w-4 ml-1" />
          ) : (
            <ChevronDown className="h-4 w-4 ml-1" />
          )}
        </Button>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            onClick={handleClearFilters}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.tags?.map((tag) => (
            <Badge key={tag} variant="secondary" className="flex items-center gap-1">
              #{tag}
              <X 
                className="h-3 w-3 cursor-pointer hover:text-red-500" 
                onClick={() => handleRemoveTag(tag)}
              />
            </Badge>
          ))}
          
          {filters.project && (
            <Badge variant="outline" className="flex items-center gap-1">
              Project: {filters.project}
              <X 
                className="h-3 w-3 cursor-pointer hover:text-red-500" 
                onClick={() => onFiltersChange({ ...filters, project: undefined })}
              />
            </Badge>
          )}
          
          {filters.category && (
            <Badge variant="outline" className="flex items-center gap-1">
              Category: {filters.category}
              <X 
                className="h-3 w-3 cursor-pointer hover:text-red-500" 
                onClick={() => onFiltersChange({ ...filters, category: undefined })}
              />
            </Badge>
          )}
          
          {filters.contentType && (
            <Badge variant="outline" className="flex items-center gap-1">
              Type: {filters.contentType}
              <X 
                className="h-3 w-3 cursor-pointer hover:text-red-500" 
                onClick={() => onFiltersChange({ ...filters, contentType: undefined })}
              />
            </Badge>
          )}
          
          {filters.dateRange && (
            <Badge variant="outline" className="flex items-center gap-1">
              Date Range
              <X 
                className="h-3 w-3 cursor-pointer hover:text-red-500" 
                onClick={() => onFiltersChange({ ...filters, dateRange: undefined })}
              />
            </Badge>
          )}
        </div>
      )}

      {/* Expanded Filters Panel */}
      {showFilters && (
        <div className="border rounded-lg p-4 bg-gray-50 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Category Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select
                value={filters.category || "any"}
                onValueChange={(value) => 
                  onFiltersChange({ 
                    ...filters, 
                    category: value === "any" ? undefined : value as MemoryCategory 
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any category</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Project Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Project</label>
              <Select
                value={filters.project || "any"}
                onValueChange={(value) => 
                  onFiltersChange({ 
                    ...filters, 
                    project: value === "any" ? undefined : value 
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any project</SelectItem>
                  {availableProjects.map((project) => (
                    <SelectItem key={project} value={project}>
                      {project}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Content Type Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Content Type</label>
              <Select
                value={filters.contentType || "any"}
                onValueChange={(value) => 
                  onFiltersChange({ 
                    ...filters, 
                    contentType: value === "any" ? undefined : value as ContentType 
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any type</SelectItem>
                  {contentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tags Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Tags</label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add tag..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddTag(tagInput)
                  }
                }}
                className="flex-1"
              />
              <Button 
                onClick={() => handleAddTag(tagInput)}
                disabled={!tagInput.trim()}
              >
                Add
              </Button>
            </div>
            
            {/* Available Tags */}
            {availableTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                <span className="text-xs text-gray-500 mr-2">Quick add:</span>
                {availableTags.slice(0, 10).map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="cursor-pointer hover:bg-gray-200 text-xs"
                    onClick={() => handleAddTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Date Range Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Date Range</label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={filters.dateRange?.start || ""}
                onChange={(e) => handleDateRangeChange('start', e.target.value)}
                placeholder="Start date"
              />
              <Input
                type="date"
                value={filters.dateRange?.end || ""}
                onChange={(e) => handleDateRangeChange('end', e.target.value)}
                placeholder="End date"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}