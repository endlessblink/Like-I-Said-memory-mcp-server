import React from 'react';

interface GraphTestProps {
  memories: any[];
}

export function GraphTest({ memories }: GraphTestProps) {
  return (
    <div className="w-full h-full p-4 bg-gray-100">
      <h2 className="text-xl font-bold mb-4">Graph Test Component</h2>
      <div className="space-y-2">
        <p>Memories loaded: {memories?.length || 0}</p>
        <p>Component mounted successfully!</p>
        {memories && memories.length > 0 && (
          <div className="mt-4">
            <h3 className="font-semibold">First few memories:</h3>
            <ul className="list-disc list-inside">
              {memories.slice(0, 3).map((memory, index) => (
                <li key={index} className="text-sm">
                  ID: {memory.id} - {memory.content?.substring(0, 50)}...
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}