import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Folder, FolderOpen, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { useApiHelpers } from '@/hooks/useApiHelpers';

interface PathInfo {
  path: string;
  exists: boolean;
  isDirectory: boolean;
  absolute: string;
  fromEnv: boolean;
}

interface PathSuggestion {
  name: string;
  memories: string;
  tasks: string;
  discovered?: boolean;
  lastModified?: string;
  stats?: {
    memoryCount: number;
    taskCount: number;
    projectCount: number;
  };
}

export function PathConfiguration() {
  const [memoryPath, setMemoryPath] = useState('');
  const [taskPath, setTaskPath] = useState('');
  const [currentPaths, setCurrentPaths] = useState<{
    memories: PathInfo;
    tasks: PathInfo;
    suggestions: PathSuggestion[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const { apiGet, apiPost } = useApiHelpers();

  useEffect(() => {
    fetchCurrentPaths();
  }, []);

  const fetchCurrentPaths = async () => {
    try {
      const response = await apiGet('/api/paths');
      if (!response.ok) throw new Error('Failed to fetch paths');
      const data = await response.json();
      setCurrentPaths(data);
      setMemoryPath(data.memories.path);
      setTaskPath(data.tasks.path);
    } catch (err) {
      setError('Failed to load current paths');
      console.error('Error fetching paths:', err);
    }
  };

  const handleUpdatePaths = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await apiPost('/api/paths', {
        memoryPath,
        taskPath,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update paths');
      }

      setSuccess('Paths updated successfully! The dashboard will now use the new locations.');
      await fetchCurrentPaths();
    } catch (err: any) {
      setError(err.message || 'Failed to update paths');
    } finally {
      setLoading(false);
    }
  };

  const applySuggestion = (suggestion: PathSuggestion) => {
    setMemoryPath(suggestion.memories);
    setTaskPath(suggestion.tasks);
  };

  if (!currentPaths) {
    return <div>Loading path configuration...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Path Configuration</CardTitle>
          <CardDescription>
            Configure where Like-I-Said stores memories and tasks. This should match your Claude Desktop configuration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Memory Directory</label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={memoryPath}
                  onChange={(e) => setMemoryPath(e.target.value)}
                  placeholder="C:\Users\YourName\like-i-said-mcp\memories"
                />
                <div className={`flex items-center ${currentPaths.memories.exists ? 'text-green-600' : 'text-red-600'}`}>
                  {currentPaths.memories.exists ? <FolderOpen className="h-5 w-5" /> : <Folder className="h-5 w-5" />}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Current: {currentPaths.memories.absolute} {currentPaths.memories.exists ? '(exists)' : '(not found)'}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Task Directory</label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={taskPath}
                  onChange={(e) => setTaskPath(e.target.value)}
                  placeholder="C:\Users\YourName\like-i-said-mcp\tasks"
                />
                <div className={`flex items-center ${currentPaths.tasks.exists ? 'text-green-600' : 'text-red-600'}`}>
                  {currentPaths.tasks.exists ? <FolderOpen className="h-5 w-5" /> : <Folder className="h-5 w-5" />}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Current: {currentPaths.tasks.absolute} {currentPaths.tasks.exists ? '(exists)' : '(not found)'}
              </p>
            </div>
          </div>

          <div className="flex justify-between">
            <Button
              onClick={handleUpdatePaths}
              disabled={loading || (!memoryPath || !taskPath)}
            >
              {loading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Paths'
              )}
            </Button>
            <Button variant="outline" onClick={fetchCurrentPaths}>
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Path Suggestions</CardTitle>
          <CardDescription>
            {currentPaths.suggestions.some(s => s.discovered) ? 
              '🔍 Auto-discovered existing installations and common paths' : 
              'Common locations where memories might be stored'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {/* Show discovered folders first */}
            {currentPaths.suggestions.filter(s => s.discovered).length > 0 && (
              <>
                <div className="text-sm font-semibold text-green-600 mb-2">
                  ✨ Discovered Installations
                </div>
                {currentPaths.suggestions.filter(s => s.discovered).map((suggestion, index) => (
                  <Button
                    key={`discovered-${index}`}
                    variant="outline"
                    className="w-full justify-start text-left border-green-200 hover:border-green-400 h-auto py-3"
                    onClick={() => applySuggestion(suggestion)}
                  >
                    <div className="w-full">
                      <div className="font-medium flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        {suggestion.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Memories: {suggestion.memories}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Tasks: {suggestion.tasks}
                      </div>
                    </div>
                  </Button>
                ))}
                <div className="border-t my-3"></div>
              </>
            )}
            
            {/* Show standard suggestions */}
            <div className="text-sm font-semibold text-muted-foreground mb-2">
              📍 Standard Locations
            </div>
            {currentPaths.suggestions.filter(s => !s.discovered).map((suggestion, index) => (
              <Button
                key={`standard-${index}`}
                variant="outline"
                className="w-full justify-start text-left h-auto py-3"
                onClick={() => applySuggestion(suggestion)}
              >
                <div>
                  <div className="font-medium">{suggestion.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Memories: {suggestion.memories}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Tasks: {suggestion.tasks}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Spacer to ensure content is not hidden behind Windows taskbar */}
      <div style={{ height: '80px', minHeight: '80px' }} aria-hidden="true" />
    </div>
  );
}