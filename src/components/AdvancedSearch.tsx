import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AdvancedFilters, MemoryCategory, ContentType } from "@/types"
import { Search, Filter, X, ChevronDown, ChevronUp, Plus, Minus } from "lucide-react"
import { FilterPresets } from "@/components/FilterPresets"

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
  const [showLogicalOperators, setShowLogicalOperators] = useState(false)

  const hasActiveFilters = Boolean(
    filters.tags?.length ||
    filters.project ||
    filters.category ||
    filters.contentType ||
    filters.dateRange ||
    filters.AND?.length ||
    filters.OR?.length ||
    filters.NOT
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

  const addLogicalGroup = (operator: 'AND' | 'OR') => {
    const newGroup: AdvancedFilters = {}
    onFiltersChange({
      ...filters,
      [operator]: [...(filters[operator] || []), newGroup]
    })
  }

  const updateLogicalGroup = (operator: 'AND' | 'OR', index: number, groupFilters: AdvancedFilters) => {
    const groups = [...(filters[operator] || [])]
    groups[index] = groupFilters
    onFiltersChange({
      ...filters,
      [operator]: groups
    })
  }

  const removeLogicalGroup = (operator: 'AND' | 'OR', index: number) => {
    const groups = [...(filters[operator] || [])]
    groups.splice(index, 1)
    onFiltersChange({
      ...filters,
      [operator]: groups.length > 0 ? groups : undefined
    })
  }

  const setNotFilter = (notFilters?: AdvancedFilters) => {
    onFiltersChange({
      ...filters,
      NOT: notFilters
    })
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Search Bar with Presets */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search memories..."
            className="pl-10 pr-4"
          />
        </div>
        
        {/* Filter Presets Component */}
        <FilterPresets
          currentFilters={filters}
          onApplyPreset={(presetFilters) => {
            onFiltersChange({ ...filters, ...presetFilters });
          }}
          onFiltersChange={onFiltersChange}
          className="flex-shrink-0"
        />
        
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
                filters.dateRange ? 1 : 0,
                filters.AND?.length || 0,
                filters.OR?.length || 0,
                filters.NOT ? 1 : 0
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
            className="flex items-center gap-2 text-gray-400 hover:text-gray-200"
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

          {filters.AND?.map((_, index) => (
            <Badge key={`and-${index}`} variant="outline" className="flex items-center gap-1 bg-green-950 border-green-400 text-green-300">
              AND Group {index + 1}
              <X 
                className="h-3 w-3 cursor-pointer hover:text-red-500" 
                onClick={() => removeLogicalGroup('AND', index)}
              />
            </Badge>
          ))}

          {filters.OR?.map((_, index) => (
            <Badge key={`or-${index}`} variant="outline" className="flex items-center gap-1 bg-blue-950 border-blue-400 text-blue-300">
              OR Group {index + 1}
              <X 
                className="h-3 w-3 cursor-pointer hover:text-red-500" 
                onClick={() => removeLogicalGroup('OR', index)}
              />
            </Badge>
          ))}

          {filters.NOT && (
            <Badge variant="outline" className="flex items-center gap-1 bg-red-950 border-red-400 text-red-300">
              NOT Filter
              <X 
                className="h-3 w-3 cursor-pointer hover:text-red-500" 
                onClick={() => setNotFilter(undefined)}
              />
            </Badge>
          )}
        </div>
      )}

      {/* Expanded Filters Panel */}
      {showFilters && (
        <div className="border rounded-lg p-4 bg-gray-800 border-gray-700 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Category Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Category</label>
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
              <label className="text-sm font-medium text-gray-300">Project</label>
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
                  {availableProjects.filter(p => p && p.trim() !== "").map((project) => (
                    <SelectItem key={project} value={project}>
                      {project}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Content Type Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Content Type</label>
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
            <label className="text-sm font-medium text-gray-300">Tags</label>
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
                <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">Quick add:</span>
                {availableTags.slice(0, 10).map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 text-xs"
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
            <label className="text-sm font-medium text-gray-300">Date Range</label>
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

          {/* Logical Operators Section */}
          <div className="space-y-4 border-t border-gray-600 pt-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-300">Advanced Logic</label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLogicalOperators(!showLogicalOperators)}
                className="text-blue-400 hover:text-blue-300"
              >
                {showLogicalOperators ? 'Hide' : 'Show'} Logic Operators
                {showLogicalOperators ? (
                  <ChevronUp className="h-4 w-4 ml-1" />
                ) : (
                  <ChevronDown className="h-4 w-4 ml-1" />
                )}
              </Button>
            </div>

            {showLogicalOperators && (
              <div className="space-y-4 bg-gray-900 p-4 rounded-lg border border-gray-600">
                {/* AND Groups */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-green-400">AND Groups (All conditions must match)</label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addLogicalGroup('AND')}
                      className="text-green-400 border-green-400 hover:bg-green-400 hover:text-black"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add AND Group
                    </Button>
                  </div>
                  {filters.AND?.map((group, index) => (
                    <div key={index} className="border border-green-400 rounded p-3 bg-green-950 bg-opacity-20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-green-300">AND Group {index + 1}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLogicalGroup('AND', index)}
                          className="text-red-400 hover:text-red-300 h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <LogicalGroupEditor
                        filters={group}
                        onFiltersChange={(groupFilters) => updateLogicalGroup('AND', index, groupFilters)}
                        availableTags={availableTags}
                        availableProjects={availableProjects}
                      />
                    </div>
                  ))}
                </div>

                {/* OR Groups */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-blue-400">OR Groups (Any condition can match)</label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addLogicalGroup('OR')}
                      className="text-blue-400 border-blue-400 hover:bg-blue-400 hover:text-black"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add OR Group
                    </Button>
                  </div>
                  {filters.OR?.map((group, index) => (
                    <div key={index} className="border border-blue-400 rounded p-3 bg-blue-950 bg-opacity-20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-blue-300">OR Group {index + 1}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLogicalGroup('OR', index)}
                          className="text-red-400 hover:text-red-300 h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <LogicalGroupEditor
                        filters={group}
                        onFiltersChange={(groupFilters) => updateLogicalGroup('OR', index, groupFilters)}
                        availableTags={availableTags}
                        availableProjects={availableProjects}
                      />
                    </div>
                  ))}
                </div>

                {/* NOT Filter */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-red-400">NOT Filter (Exclude matching items)</label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNotFilter(filters.NOT ? undefined : {})}
                      className={`${filters.NOT ? 'text-red-400 border-red-400' : 'text-gray-400'} hover:bg-red-400 hover:text-black`}
                    >
                      {filters.NOT ? (
                        <>
                          <Minus className="h-3 w-3 mr-1" />
                          Remove NOT
                        </>
                      ) : (
                        <>
                          <Plus className="h-3 w-3 mr-1" />
                          Add NOT Filter
                        </>
                      )}
                    </Button>
                  </div>
                  {filters.NOT && (
                    <div className="border border-red-400 rounded p-3 bg-red-950 bg-opacity-20">
                      <LogicalGroupEditor
                        filters={filters.NOT}
                        onFiltersChange={setNotFilter}
                        availableTags={availableTags}
                        availableProjects={availableProjects}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Logical Group Editor Component
interface LogicalGroupEditorProps {
  filters: AdvancedFilters
  onFiltersChange: (filters: AdvancedFilters) => void
  availableTags: string[]
  availableProjects: string[]
}

function LogicalGroupEditor({
  filters,
  onFiltersChange,
  availableTags,
  availableProjects
}: LogicalGroupEditorProps) {
  const [tagInput, setTagInput] = useState("")

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

  return (
    <div className="space-y-3">
      {/* Mini filters for logical groups */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {/* Category */}
        <Select
          value={filters.category || "any"}
          onValueChange={(value) => 
            onFiltersChange({ 
              ...filters, 
              category: value === "any" ? undefined : value as MemoryCategory 
            })
          }
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Category" />
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

        {/* Project */}
        <Select
          value={filters.project || "any"}
          onValueChange={(value) => 
            onFiltersChange({ 
              ...filters, 
              project: value === "any" ? undefined : value 
            })
          }
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any project</SelectItem>
            {availableProjects.filter(p => p && p.trim() !== "").map((project) => (
              <SelectItem key={project} value={project}>
                {project}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tags */}
      <div className="space-y-2">
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
            className="flex-1 h-8 text-xs"
          />
          <Button 
            onClick={() => handleAddTag(tagInput)}
            disabled={!tagInput.trim()}
            size="sm"
            className="h-8 px-2 text-xs"
          >
            Add
          </Button>
        </div>
        
        {/* Current Tags */}
        {filters.tags && filters.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {filters.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="flex items-center gap-1 text-xs h-6">
                #{tag}
                <X 
                  className="h-2 w-2 cursor-pointer hover:text-red-500" 
                  onClick={() => handleRemoveTag(tag)}
                />
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Text Search */}
      <Input
        value={filters.text || ""}
        onChange={(e) => onFiltersChange({ ...filters, text: e.target.value })}
        placeholder="Search text..."
        className="h-8 text-xs"
      />
    </div>
  )
}