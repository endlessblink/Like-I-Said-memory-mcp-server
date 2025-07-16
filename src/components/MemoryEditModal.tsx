import React, { useState, useEffect } from 'react';
import { Memory, MemoryCategory } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  X, 
  Save, 
  Eye, 
  EyeOff, 
  Plus,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface MemoryEditModalProps {
  memory: Memory | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedMemory: Memory) => void;
  isLoading?: boolean;
}

const MEMORY_CATEGORIES: MemoryCategory[] = [
  'personal',
  'work', 
  'code',
  'research',
  'conversations',
  'preferences'
];

export function MemoryEditModal({ 
  memory, 
  isOpen, 
  onClose, 
  onSave, 
  isLoading = false 
}: MemoryEditModalProps) {
  const [editedMemory, setEditedMemory] = useState<Memory | null>(null);
  const [newTag, setNewTag] = useState('');
  const [showFullContent, setShowFullContent] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize edited memory when modal opens
  useEffect(() => {
    if (memory && isOpen) {
      setEditedMemory({ ...memory });
      setHasChanges(false);
      setShowFullContent(false);
    }
  }, [memory, isOpen]);

  // Track changes
  useEffect(() => {
    if (memory && editedMemory) {
      const hasChanged = (
        memory.content !== editedMemory.content ||
        memory.category !== editedMemory.category ||
        memory.priority !== editedMemory.priority ||
        JSON.stringify(memory.tags) !== JSON.stringify(editedMemory.tags)
      );
      setHasChanges(hasChanged);
    }
  }, [memory, editedMemory]);

  const handleSave = () => {
    if (editedMemory && hasChanges) {
      onSave(editedMemory);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (!confirmed) return;
    }
    onClose();
  };

  const addTag = () => {
    if (newTag.trim() && editedMemory) {
      const currentTags = editedMemory.tags || [];
      if (!currentTags.includes(newTag.trim())) {
        setEditedMemory({
          ...editedMemory,
          tags: [...currentTags, newTag.trim()]
        });
      }
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    if (editedMemory) {
      setEditedMemory({
        ...editedMemory,
        tags: (editedMemory.tags || []).filter(tag => tag !== tagToRemove)
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addTag();
    }
  };

  if (!editedMemory) return null;

  const previewContent = editedMemory.content.length > 300 
    ? editedMemory.content.substring(0, 300) + '...'
    : editedMemory.content;

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Edit Memory
            {hasChanges && (
              <Badge variant="outline" className="text-orange-400 border-orange-500/30">
                Unsaved Changes
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Edit memory content, category, priority, and tags.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Category and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Category
              </label>
              <Select
                value={editedMemory.category}
                onValueChange={(value: MemoryCategory) => 
                  setEditedMemory({ ...editedMemory, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEMORY_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      <span className="capitalize">{category}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Priority
              </label>
              <Select
                value={editedMemory.priority}
                onValueChange={(value: 'low' | 'medium' | 'high') => 
                  setEditedMemory({ ...editedMemory, priority: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">
              Tags
            </label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Add a tag..."
                  className="flex-1"
                />
                <Button
                  onClick={addTag}
                  disabled={!newTag.trim()}
                  size="sm"
                  className="px-3"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              
              {editedMemory.tags && editedMemory.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {editedMemory.tags.map((tag, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="flex items-center gap-1 text-xs"
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:bg-gray-600 rounded p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-300">
                Content
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFullContent(!showFullContent)}
                className="flex items-center gap-2 text-xs"
              >
                {showFullContent ? (
                  <>
                    <EyeOff className="w-3 h-3" />
                    Collapse
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3" />
                    Expand
                  </>
                )}
              </Button>
            </div>
            
            {showFullContent ? (
              <Textarea
                value={editedMemory.content}
                onChange={(e) => 
                  setEditedMemory({ ...editedMemory, content: e.target.value })
                }
                className="min-h-[400px] font-mono text-sm"
                placeholder="Memory content..."
              />
            ) : (
              <div className="space-y-2">
                <div className="p-3 bg-gray-800/50 rounded border border-gray-700">
                  <div className="text-sm text-gray-400 mb-2">Preview:</div>
                  <div className="text-sm text-gray-300 whitespace-pre-wrap">
                    {previewContent}
                  </div>
                  {editedMemory.content.length > 300 && (
                    <div className="text-xs text-gray-500 mt-2">
                      Showing first 300 characters. Click "Expand" to edit full content.
                    </div>
                  )}
                </div>
                {editedMemory.content.length <= 300 && (
                  <Textarea
                    value={editedMemory.content}
                    onChange={(e) => 
                      setEditedMemory({ ...editedMemory, content: e.target.value })
                    }
                    className="min-h-[150px] font-mono text-sm"
                    placeholder="Memory content..."
                  />
                )}
              </div>
            )}
          </div>

          {/* Memory Info */}
          <div className="p-3 bg-gray-800/30 rounded border border-gray-700">
            <div className="text-xs text-gray-400 space-y-1">
              <div>ID: {editedMemory.id}</div>
              <div>Created: {new Date(editedMemory.timestamp).toLocaleString()}</div>
              <div>Project: {editedMemory.project || 'default'}</div>
              <div>Content Length: {editedMemory.content.length} characters</div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {hasChanges && (
              <div className="flex items-center gap-1 text-sm text-orange-400">
                <AlertCircle className="w-4 h-4" />
                Unsaved changes
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!hasChanges || isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}