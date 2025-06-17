import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Memory, MemoryCategory } from "@/types"
import { formatDistanceToNow } from "@/utils/helpers"
import { Edit, Trash2, Eye, Clock, Users, FileText } from "lucide-react"

interface MemoryCardProps {
  memory: Memory
  selected?: boolean
  onSelect?: (id: string) => void
  onEdit: (memory: Memory) => void
  onDelete: (id: string) => void
  onView?: (memory: Memory) => void
}

const categoryColors: Record<MemoryCategory, string> = {
  personal: "bg-blue-100 text-blue-800 border-blue-200",
  work: "bg-green-100 text-green-800 border-green-200", 
  code: "bg-purple-100 text-purple-800 border-purple-200",
  research: "bg-orange-100 text-orange-800 border-orange-200",
  conversations: "bg-pink-100 text-pink-800 border-pink-200",
  preferences: "bg-gray-100 text-gray-800 border-gray-200"
}

const contentTypeIcons = {
  text: FileText,
  code: FileText, // TODO: Add code icon
  structured: FileText // TODO: Add structured data icon
}

function truncateContent(content: string, maxLength: number = 150): string {
  if (content.length <= maxLength) return content
  return content.substring(0, maxLength) + "..."
}

export function MemoryCard({ 
  memory, 
  selected = false, 
  onSelect, 
  onEdit, 
  onDelete, 
  onView 
}: MemoryCardProps) {
  // Ensure backward compatibility with existing memory format
  const metadata = memory.metadata || {
    created: memory.timestamp,
    modified: memory.timestamp,
    lastAccessed: memory.timestamp,
    accessCount: 0,
    clients: [],
    contentType: 'text' as const,
    size: new Blob([memory.content]).size
  }
  
  const ContentIcon = contentTypeIcons[metadata.contentType]
  
  return (
    <div className={`
      relative group p-4 bg-white rounded-lg border shadow-sm transition-all duration-200
      hover:shadow-md hover:border-gray-300
      ${selected ? 'ring-2 ring-blue-500 border-blue-200' : 'border-gray-200'}
    `}>
      {/* Selection Checkbox */}
      {onSelect && (
        <div className="absolute top-3 left-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onSelect(memory.id)}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
          />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1">
          <ContentIcon className="h-4 w-4 text-gray-500" />
          
          {/* Category Badge */}
          {memory.category && (
            <Badge className={`text-xs ${categoryColors[memory.category]}`}>
              {memory.category}
            </Badge>
          )}
          
          {/* Project Tag */}
          {memory.project && (
            <Badge variant="outline" className="text-xs">
              {memory.project}
            </Badge>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onView && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onView(memory)}
              className="h-8 w-8 p-0"
            >
              <Eye className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(memory)}
            className="h-8 w-8 p-0"
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(memory.id)}
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Content Preview */}
      <div className="mb-3">
        <p className="text-sm text-gray-700 leading-relaxed">
          {truncateContent(memory.content)}
        </p>
      </div>

      {/* Tags */}
      {memory.tags && memory.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {memory.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {memory.tags.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{memory.tags.length - 3} more
            </Badge>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-3">
          {/* Last Modified */}
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{formatDistanceToNow(metadata.modified)}</span>
          </div>
          
          {/* Access Count */}
          {metadata.accessCount > 0 && (
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              <span>{metadata.accessCount}</span>
            </div>
          )}
          
          {/* Client Access */}
          {metadata.clients.length > 0 && (
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{metadata.clients.length} client{metadata.clients.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {/* Size */}
        <span>{(metadata.size / 1024).toFixed(1)}KB</span>
      </div>
    </div>
  )
}