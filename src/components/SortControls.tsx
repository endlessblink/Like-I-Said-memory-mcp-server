import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { SortField, SortDirection, SortOptions } from "@/types"
import { getSortFieldInfo } from "@/utils/helpers"

interface SortControlsProps {
  sortOptions: SortOptions
  onSortChange: (options: SortOptions) => void
  className?: string
}

const sortFields: SortField[] = ['date', 'title', 'length', 'tags', 'project', 'category']

export function SortControls({ sortOptions, onSortChange, className = "" }: SortControlsProps) {
  const handleFieldChange = (field: SortField) => {
    onSortChange({ ...sortOptions, field })
  }

  const handleDirectionToggle = () => {
    onSortChange({
      ...sortOptions,
      direction: sortOptions.direction === 'asc' ? 'desc' : 'asc'
    })
  }

  const currentFieldInfo = getSortFieldInfo(sortOptions.field)
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Sort Field Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400 hidden sm:inline">Sort by:</span>
        <Select value={sortOptions.field} onValueChange={handleFieldChange}>
          <SelectTrigger className="w-[140px] sm:w-[160px] bg-gray-700 border-gray-600 text-white text-sm">
            <SelectValue>
              <div className="flex items-center gap-2">
                <span className="text-sm">{currentFieldInfo.icon}</span>
                <span className="hidden sm:inline">{currentFieldInfo.label}</span>
                <span className="sm:hidden">{currentFieldInfo.label.split(' ')[0]}</span>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-gray-700 border-gray-600">
            {sortFields.map((field) => {
              const fieldInfo = getSortFieldInfo(field)
              return (
                <SelectItem 
                  key={field} 
                  value={field}
                  className="text-white hover:bg-gray-600 focus:bg-gray-600"
                >
                  <div className="flex items-center gap-2">
                    <span>{fieldInfo.icon}</span>
                    <span>{fieldInfo.label}</span>
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Sort Direction Toggle */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleDirectionToggle}
        className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600 hover:text-white px-3"
        title={`Sort ${sortOptions.direction === 'asc' ? 'ascending' : 'descending'} - Click to ${sortOptions.direction === 'asc' ? 'descend' : 'ascend'}`}
      >
        {sortOptions.direction === 'asc' ? (
          <ArrowUp className="h-4 w-4" />
        ) : (
          <ArrowDown className="h-4 w-4" />
        )}
        <span className="ml-1 hidden sm:inline text-xs">
          {sortOptions.direction === 'asc' ? 'A→Z' : 'Z→A'}
        </span>
      </Button>

      {/* Sort Indicator (for mobile) */}
      <div className="flex sm:hidden items-center text-xs text-gray-500">
        {sortOptions.direction === 'asc' ? '↑' : '↓'}
      </div>
    </div>
  )
}