import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { MemoryNodeData } from '@/types/graph';

interface MemoryNodeProps {
  data: MemoryNodeData;
  selected?: boolean;
}

const MemoryNodeComponent = memo(({ data, selected }: MemoryNodeProps) => {
  const title = data.title || data.content.substring(0, 40) + (data.content.length > 40 ? '...' : '');
  
  return (
    <div 
      className={`
        px-3 py-2 shadow-lg rounded-lg border-2 bg-white
        min-w-[180px] max-w-[200px]
        ${selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300'}
        hover:shadow-xl transition-all duration-200
      `}
      style={{
        backgroundColor: data.color || '#f3f4f6',
      }}
    >
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-3 h-3 bg-gray-400 border-2 border-white"
      />
      
      <div className="space-y-1">
        {/* Title */}
        <div className="font-semibold text-sm text-gray-800 leading-tight">
          {title}
        </div>
        
        {/* Category badge */}
        {data.category && (
          <div className="text-xs px-2 py-0.5 bg-gray-600 text-white rounded-full inline-block">
            {data.category}
          </div>
        )}
        
        {/* Tags */}
        {data.tags && data.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {data.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded border"
              >
                {tag}
              </span>
            ))}
            {data.tags.length > 3 && (
              <span className="text-xs text-gray-500">
                +{data.tags.length - 3}
              </span>
            )}
          </div>
        )}
        
        {/* Connection count */}
        {data.connectionCount > 0 && (
          <div className="text-xs text-gray-600 flex items-center gap-1">
            <span className="w-2 h-2 bg-green-400 rounded-full"></span>
            {data.connectionCount} connections
          </div>
        )}
      </div>
      
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-3 h-3 bg-gray-400 border-2 border-white"
      />
    </div>
  );
});

MemoryNodeComponent.displayName = 'MemoryNode';

export default MemoryNodeComponent;