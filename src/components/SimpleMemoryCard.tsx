import React from 'react'

interface SimpleMemoryCardProps {
  memory: {
    id: string
    title?: string
    content: string
  }
  onEdit: () => void
  onDelete: (id: string) => void
  isDeleting?: boolean
}

export function SimpleMemoryCard({ 
  memory, 
  onEdit, 
  onDelete,
  isDeleting = false
}: SimpleMemoryCardProps) {
  return (
    <div style={{ 
      padding: '16px', 
      border: '1px solid #666', 
      borderRadius: '8px',
      backgroundColor: '#333',
      marginBottom: '16px'
    }}>
      <h3 style={{ color: 'white', marginBottom: '8px' }}>
        {memory.title || 'Untitled Memory'}
      </h3>
      <p style={{ color: '#ccc', fontSize: '14px', marginBottom: '16px' }}>
        {memory.content.substring(0, 100)}...
      </p>
      
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={onEdit}
          style={{
            padding: '4px 12px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(memory.id)}
          disabled={isDeleting}
          style={{
            padding: '4px 12px',
            backgroundColor: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isDeleting ? 'not-allowed' : 'pointer',
            opacity: isDeleting ? 0.5 : 1
          }}
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  )
}