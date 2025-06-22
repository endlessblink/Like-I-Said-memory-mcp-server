import { useState } from 'react';

export default function MinimalApp() {
  const [memories, setMemories] = useState<any[]>([]);
  const [activeView, setActiveView] = useState('memories');

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">L</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">LIKE I SAID</h1>
                  <div className="text-sm text-gray-500 dark:text-gray-400">MEMORY</div>
                </div>
              </div>
            </div>
            
            <nav className="flex space-x-4">
              <button 
                onClick={() => setActiveView('dashboard')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  activeView === 'dashboard' 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
                }`}
              >
                📊 Dashboard
              </button>
              <button 
                onClick={() => setActiveView('memories')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  activeView === 'memories' 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
                }`}
              >
                🧠 Memories
              </button>
              <button 
                onClick={() => setActiveView('relationships')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  activeView === 'relationships' 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
                }`}
              >
                🔗 Relationships
              </button>
            </nav>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-semibold text-lg">{memories.length}</span> memories
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeView === 'dashboard' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">📊 Dashboard</h2>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <p className="text-gray-600 dark:text-gray-300">Dashboard content will be displayed here.</p>
            </div>
          </div>
        )}
        
        {activeView === 'memories' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">🧠 Memories</h2>
              <button 
                onClick={() => setMemories([...memories, { id: Date.now(), content: 'New memory', tags: [] }])}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add Memory
              </button>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              {memories.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-6xl mb-4">🧠</div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No memories yet</h3>
                  <p className="text-gray-500 dark:text-gray-400">Add your first memory to get started.</p>
                </div>
              ) : (
                <div className="p-6">
                  <div className="space-y-4">
                    {memories.map((memory) => (
                      <div key={memory.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <p className="text-gray-900 dark:text-white">{memory.content}</p>
                        <div className="mt-2 flex justify-between items-center">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {memory.tags.length} tags
                          </span>
                          <button 
                            onClick={() => setMemories(memories.filter(m => m.id !== memory.id))}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {activeView === 'relationships' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">🔗 Relationships</h2>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
              <p className="text-gray-600 dark:text-gray-300">
                Memory relationship graph will be displayed here when React Flow is working.
              </p>
              {memories.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Found {memories.length} memories to visualize.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}