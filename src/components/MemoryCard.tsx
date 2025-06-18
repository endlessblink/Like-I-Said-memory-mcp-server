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
  personal: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  work: "bg-green-500/20 text-green-300 border-green-500/30", 
  code: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  research: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  conversations: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  preferences: "bg-gray-500/20 text-gray-300 border-gray-500/30"
}

const contentTypeIcons = {
  text: FileText,
  code: FileText, // TODO: Add code icon
  structured: FileText // TODO: Add structured data icon
}

function truncateContent(content: string, maxLength: number = 300): string {
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
      relative group card-modern space-card animate-fade-in
      ${selected ? 'ring-2 ring-violet-500 border-violet-400' : ''}
      min-h-[320px] flex flex-col
    `}>
      {/* Selection Checkbox */}
      {onSelect && (
        <div className="absolute top-4 left-4 z-10">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onSelect(memory.id)}
            className="w-4 h-4 text-violet-600 bg-gray-800 border-gray-600 rounded focus-ring focus:ring-violet-500"
          />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3 flex-1">
          <ContentIcon className="h-5 w-5 text-violet-400" />
          
          {/* Category Badge */}
          {memory.category && (
            <Badge className={`text-xs font-semibold px-3 py-1 rounded-full ${categoryColors[memory.category]}`}>
              {memory.category}
            </Badge>
          )}
          
          {/* Project Tag */}
          {memory.project && (
            <Badge variant="outline" className="text-xs border-violet-500/30 text-violet-300 bg-violet-500/10 px-3 py-1 rounded-full">
              {memory.project}
            </Badge>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
          {onView && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onView(memory)}
              className="h-8 w-8 p-0 hover:bg-violet-500/20 hover:text-violet-300 transition-colors"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(memory)}
            className="h-8 w-8 p-0 hover:bg-blue-500/20 hover:text-blue-300 transition-colors"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(memory.id)}
            className="h-8 w-8 p-0 hover:bg-red-500/20 hover:text-red-300 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content Preview */}
      <div className="mb-6 flex-1">
        <div className="text-body text-gray-200 leading-relaxed">
          {truncateContent(memory.content, 250)}
        </div>
      </div>

      {/* Tags */}
      {memory.tags && memory.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {memory.tags.slice(0, 4).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs bg-gray-700/50 text-gray-300 border-gray-600/50 px-2 py-1 rounded-md">
              #{tag}
            </Badge>
          ))}
          {memory.tags.length > 4 && (
            <Badge variant="secondary" className="text-xs bg-gray-700/30 text-gray-400 border-gray-600/30 px-2 py-1 rounded-md">
              +{memory.tags.length - 4}
            </Badge>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-body-sm text-gray-500 mt-auto pt-4 border-t border-gray-700/50">
        <div className="flex items-center gap-4">
          {/* Last Modified */}
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-gray-400" />
            <span className="font-medium">{formatDistanceToNow(metadata.modified)}</span>
          </div>
          
          {/* Access Count */}
          {metadata.accessCount > 0 && (
            <div className="flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5 text-blue-400" />
              <span>{metadata.accessCount}</span>
            </div>
          )}
          
          {/* Client Access */}
          {metadata.clients && metadata.clients.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-green-400" />
              <span>{metadata.clients.length}</span>
            </div>
          )}
        </div>

        {/* Size */}
        <div className="px-2 py-1 bg-gray-700/30 rounded-md">
          <span className="font-medium">{(metadata.size / 1024).toFixed(1)}KB</span>
        </div>
      </div>
    </div>
  )
}