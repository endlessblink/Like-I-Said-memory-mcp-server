import React from 'react';
import { Memory, MemoryCategory } from "@/types"
import { formatDistanceToNow } from "@/utils/helpers"
import { Edit, Trash2, Eye, Clock, Users, FileText, Loader2 } from "lucide-react"

// Simplified test version
export function TestMemoryCard() {
  const memory: Memory = {
    id: 'test',
    content: 'Test content',
    timestamp: new Date().toISOString(),
    metadata: {
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      lastAccessed: new Date().toISOString(),
      accessCount: 0,
      clients: [],
      contentType: 'text' as const,
      size: 100
    }
  };

  const categoryColors: Record<MemoryCategory, string> = {
    personal: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    work: "bg-green-500/20 text-green-300 border-green-500/30", 
    code: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    research: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    conversations: "bg-pink-500/20 text-pink-300 border-pink-500/30",
    preferences: "bg-gray-500/20 text-gray-300 border-gray-500/30"
  };

  const contentTypeIcons = {
    text: FileText,
    code: FileText,
    structured: FileText
  };

  const getContentIcon = (contentType: string) => {
    if (!contentType) return FileText;
    const Icon = contentTypeIcons[contentType as keyof typeof contentTypeIcons];
    return Icon || FileText;
  };

  const ContentIcon = getContentIcon(memory.metadata?.contentType || 'text');

  console.log('ContentIcon in render:', ContentIcon);

  return (
    <div className="p-4 border rounded">
      <div className="flex items-center gap-3">
        <ContentIcon className="h-5 w-5 text-violet-400" />
        <span>Test Memory Card</span>
      </div>
      <div className="mt-2">
        <Eye className="h-4 w-4 inline mr-2" />
        <Edit className="h-4 w-4 inline mr-2" />
        <Trash2 className="h-4 w-4 inline mr-2" />
        <Loader2 className="h-4 w-4 inline mr-2" />
        <Clock className="h-4 w-4 inline mr-2" />
        <Users className="h-4 w-4 inline mr-2" />
      </div>
      <div className="mt-2">
        {formatDistanceToNow(memory.metadata.modified)}
      </div>
    </div>
  );
}