import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface Memory {
  value: string
  context: Record<string, any>
  timestamp: string
}

interface MemoriesTableProps {
  memories: Record<string, Memory>
  onEdit: (key: string) => void
  onDelete: (key: string) => void
}

function extractTags(memory: Memory) {
  const tags: string[] = []
  if (memory.context) {
    if (memory.context.tags && Array.isArray(memory.context.tags)) {
      tags.push(...memory.context.tags)
    }
    if (memory.context.category) tags.push(memory.context.category)
    if (memory.context.type) tags.push(memory.context.type)
    Object.entries(memory.context).forEach(([key, value]) => {
      if (key.toLowerCase().includes('tag') && typeof value === 'string' && !tags.includes(value)) {
        tags.push(value)
      }
    })
  }
  return tags
}

function tagColor(tag: string) {
  const colors = {
    education: "bg-blue-600",
    health: "bg-green-600", 
    preference: "bg-purple-600",
    relationship: "bg-red-600",
    food: "bg-orange-600",
    work: "bg-teal-600",
    personal: "bg-pink-600",
    default: "bg-gray-600"
  }
  return colors[tag.toLowerCase() as keyof typeof colors] || colors.default
}

export function MemoriesTable({ memories, onEdit, onDelete }: MemoriesTableProps) {
  return (
    <div className="bg-[#232329] rounded-xl shadow-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-[#35353b]">
            <TableHead className="text-gray-400 font-semibold p-4">Key</TableHead>
            <TableHead className="text-gray-400 font-semibold p-4">Value</TableHead>
            <TableHead className="text-gray-400 font-semibold p-4">Tags</TableHead>
            <TableHead className="text-gray-400 font-semibold p-4">Timestamp</TableHead>
            <TableHead className="text-gray-400 font-semibold p-4">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(memories).map(([key, memory]) => (
            <TableRow key={key} className="border-b border-[#2a2a30] hover:bg-[#2a2a30] transition-colors">
              <TableCell className="p-4 font-mono text-blue-400">{key}</TableCell>
              <TableCell className="p-4 max-w-lg">
                <div className="truncate text-gray-200">{memory.value}</div>
              </TableCell>
              <TableCell className="p-4">
                <div className="flex gap-1 flex-wrap">
                  {extractTags(memory).map((tag, i) => (
                    <Badge key={`${tag}-${i}`} className={`${tagColor(tag)} text-white text-xs px-2 py-1`}>
                      {tag}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell className="p-4 text-gray-400 text-sm">
                {new Date(memory.timestamp).toLocaleDateString()}
              </TableCell>
              <TableCell className="p-4">
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(key)}
                    className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                  >
                    ✏️
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(key)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                  >
                    🗑️
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
