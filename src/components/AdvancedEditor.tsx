import React, { useState, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AdvancedEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  placeholder?: string;
  height?: string;
  autoSave?: boolean;
  onSave?: (value: string) => void;
  className?: string;
}

export const AdvancedEditor: React.FC<AdvancedEditorProps> = ({
  value,
  onChange,
  language = 'markdown',
  placeholder = 'Start typing...',
  height = '400px',
  autoSave = false,
  onSave,
  className = '',
}) => {
  const [editorValue, setEditorValue] = useState(value);
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('edit');
  const [isModified, setIsModified] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Auto-save functionality
  useEffect(() => {
    if (autoSave && isModified && onSave) {
      const timeout = setTimeout(() => {
        onSave(editorValue);
        setLastSaved(new Date());
        setIsModified(false);
      }, 2000); // Auto-save after 2 seconds of inactivity

      return () => clearTimeout(timeout);
    }
  }, [editorValue, autoSave, isModified, onSave]);

  // Update editor when external value changes
  useEffect(() => {
    if (value !== editorValue) {
      setEditorValue(value);
      setIsModified(false);
    }
  }, [value]);

  const handleEditorChange = useCallback((newValue: string | undefined) => {
    if (newValue !== undefined) {
      setEditorValue(newValue);
      onChange(newValue);
      setIsModified(true);
    }
  }, [onChange]);

  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(editorValue);
      setLastSaved(new Date());
      setIsModified(false);
    }
  }, [editorValue, onSave]);

  const detectLanguage = (content: string): string => {
    // Simple language detection based on content patterns
    if (content.includes('```javascript') || content.includes('```js')) return 'javascript';
    if (content.includes('```typescript') || content.includes('```ts')) return 'typescript';
    if (content.includes('```python') || content.includes('```py')) return 'python';
    if (content.includes('```json')) return 'json';
    if (content.includes('```yaml') || content.includes('```yml')) return 'yaml';
    if (content.includes('```css')) return 'css';
    if (content.includes('```html')) return 'html';
    if (content.includes('```sql')) return 'sql';
    if (content.includes('```bash') || content.includes('```sh')) return 'shell';
    
    // Check for common programming patterns
    if (/function\s+\w+\s*\(/.test(content) || /const\s+\w+\s*=/.test(content)) return 'javascript';
    if (/def\s+\w+\s*\(/.test(content) || /import\s+\w+/.test(content)) return 'python';
    if (/\{[\s\S]*"[\w]+"\s*:/.test(content)) return 'json';
    
    return 'markdown';
  };

  const renderPreview = () => {
    // Simple markdown-like preview (in a real app, use a proper markdown library)
    return (
      <div className="prose prose-invert max-w-none p-4 h-full overflow-auto bg-gray-900 border border-gray-700 rounded-lg">
        <pre className="whitespace-pre-wrap text-gray-300 font-mono text-sm leading-relaxed">
          {editorValue || placeholder}
        </pre>
      </div>
    );
  };

  const editorOptions = {
    minimap: { enabled: false },
    fontSize: 14,
    lineHeight: 1.6,
    wordWrap: 'on' as const,
    theme: 'vs-dark',
    automaticLayout: true,
    scrollBeyondLastLine: false,
    folding: true,
    lineNumbers: 'on' as const,
    renderWhitespace: 'selection' as const,
    bracketPairColorization: { enabled: true },
    suggest: {
      showKeywords: true,
      showSnippets: true,
    },
  };

  return (
    <div className={`advanced-editor ${className}`}>
      {/* Editor Header */}
      <div className="flex items-center justify-between p-3 bg-gray-800 border border-gray-700 rounded-t-lg">
        <div className="flex items-center gap-4">
          {/* View Mode Tabs */}
          <Tabs value={viewMode} onValueChange={(mode) => setViewMode(mode as any)} className="w-auto">
            <TabsList className="grid w-full grid-cols-3 bg-gray-700">
              <TabsTrigger value="edit" className="text-xs">Edit</TabsTrigger>
              <TabsTrigger value="preview" className="text-xs">Preview</TabsTrigger>
              <TabsTrigger value="split" className="text-xs">Split</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Language Detection */}
          <div className="text-xs text-gray-400 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
            <span className="capitalize">{detectLanguage(editorValue)}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Save Status */}
          {isModified && (
            <span className="text-xs text-yellow-400 flex items-center gap-1">
              <span className="w-1 h-1 bg-yellow-400 rounded-full animate-pulse"></span>
              Unsaved changes
            </span>
          )}
          
          {lastSaved && !isModified && (
            <span className="text-xs text-gray-400">
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}

          {/* Manual Save Button */}
          {onSave && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSave}
              disabled={!isModified}
              className="text-xs h-7 px-2"
            >
              {isModified ? '💾 Save' : '✓ Saved'}
            </Button>
          )}
        </div>
      </div>

      {/* Editor Content */}
      <div className="border border-t-0 border-gray-700 rounded-b-lg overflow-hidden" style={{ height }}>
        {viewMode === 'edit' && (
          <Editor
            value={editorValue}
            onChange={handleEditorChange}
            language={detectLanguage(editorValue)}
            options={editorOptions}
            theme="vs-dark"
          />
        )}
        
        {viewMode === 'preview' && renderPreview()}
        
        {viewMode === 'split' && (
          <div className="flex h-full">
            <div className="flex-1 border-r border-gray-700">
              <Editor
                value={editorValue}
                onChange={handleEditorChange}
                language={detectLanguage(editorValue)}
                options={{
                  ...editorOptions,
                  minimap: { enabled: false },
                }}
                theme="vs-dark"
              />
            </div>
            <div className="flex-1">
              {renderPreview()}
            </div>
          </div>
        )}
      </div>

      {/* Editor Footer */}
      <div className="flex items-center justify-between p-2 bg-gray-800/50 text-xs text-gray-400 border border-t-0 border-gray-700 rounded-b-lg">
        <div className="flex items-center gap-4">
          <span>Lines: {editorValue.split('\n').length}</span>
          <span>Characters: {editorValue.length}</span>
          <span>Words: {editorValue.split(/\s+/).filter(Boolean).length}</span>
        </div>
        
        <div className="flex items-center gap-2">
          {autoSave && (
            <span className="flex items-center gap-1">
              <span className="w-1 h-1 bg-green-400 rounded-full animate-pulse"></span>
              Auto-save enabled
            </span>
          )}
          
          <span>Ctrl+S to save</span>
        </div>
      </div>
    </div>
  );
};

export default AdvancedEditor;