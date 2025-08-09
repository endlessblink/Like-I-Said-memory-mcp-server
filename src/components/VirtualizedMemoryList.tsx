import React, { useMemo, useCallback, useState } from 'react'
import { FixedSizeList as List } from 'react-window'
import { MemoryCard } from './MemoryCard'
import { Memory } from '../types'
import { EmptyState } from './LoadingStates'

interface VirtualizedMemoryListProps {
  memories: Memory[]
  selectedMemories: Set<string>
  onSelect: (memoryId: string) => void
  onEdit: (memoryId: string) => void
  onDelete: (memoryId: string) => void
  isDeleting: Set<string>
  containerHeight?: number
  itemHeight?: number
  containerWidth?: string
}

const CARD_HEIGHT = 280 // Approximate height of a memory card
const GRID_GAP = 24 // Gap between cards
const MIN_CARD_WIDTH = 320 // Minimum card width

export const VirtualizedMemoryList: React.FC<VirtualizedMemoryListProps> = ({
  memories,
  selectedMemories,
  onSelect,
  onEdit,
  onDelete,
  isDeleting,
  containerHeight = 600,
  itemHeight = CARD_HEIGHT + GRID_GAP,
  containerWidth = '100%'
}) => {
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null)

  // Calculate how many cards can fit per row based on container width
  const cardsPerRow = useMemo(() => {
    if (!containerRef) return 1
    
    const containerWidthPx = containerRef.offsetWidth
    const availableWidth = containerWidthPx - 48 // Account for padding
    const cardsPerRow = Math.max(1, Math.floor(availableWidth / (MIN_CARD_WIDTH + GRID_GAP)))
    
    return cardsPerRow
  }, [containerRef])

  // Group memories into rows for virtualization
  const memoryRows = useMemo(() => {
    const rows: Memory[][] = []
    for (let i = 0; i < memories.length; i += cardsPerRow) {
      rows.push(memories.slice(i, i + cardsPerRow))
    }
    return rows
  }, [memories, cardsPerRow])

  // Render a single row of memory cards
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const rowMemories = memoryRows[index]
    if (!rowMemories || rowMemories.length === 0) return null

    return (
      <div style={style}>
        <div 
          className="grid gap-6 px-6"
          style={{
            gridTemplateColumns: `repeat(${cardsPerRow}, 1fr)`,
            minHeight: CARD_HEIGHT
          }}
        >
          {rowMemories.map((memory, cardIndex) => (
            <div 
              key={`${memory.id}-${index}-${cardIndex}`}
              className="animate-fade-in"
              style={{ 
                animationDelay: `${(index * cardsPerRow + cardIndex) * 0.02}s`,
                minHeight: CARD_HEIGHT
              }}
            >
              <MemoryCard
                memory={memory}
                selected={selectedMemories.has(memory.id)}
                onSelect={onSelect}
                onEdit={() => onEdit(memory.id)}
                onDelete={() => onDelete(memory.id)}
                isDeleting={isDeleting.has(memory.id)}
              />
            </div>
          ))}
        </div>
      </div>
    )
  }, [memoryRows, cardsPerRow, selectedMemories, onSelect, onEdit, onDelete, isDeleting])

  if (memories.length === 0) {
    return (
      <EmptyState 
        title="No memories found"
        description="Try adjusting your search or filters, or create your first memory to get started"
        icon="🧠"
      />
    )
  }

  return (
    <div 
      ref={setContainerRef}
      className="w-full"
      style={{ width: containerWidth }}
    >
      <List
        height={containerHeight}
        itemCount={memoryRows.length}
        itemSize={itemHeight}
        overscanCount={2} // Render 2 extra rows for smooth scrolling
        width="100%"
      >
        {Row}
      </List>
    </div>
  )
}

export default VirtualizedMemoryList