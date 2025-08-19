import React, { useState, useRef } from 'react';
import { Modal } from './Modal';
import { useModal } from '../contexts/ModalContext';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';

interface ImportProgress {
  status: 'idle' | 'parsing' | 'importing' | 'success' | 'error';
  message: string;
  details?: {
    memories: number;
    tasks: number;
    projects: number;
  };
}

export const ImportModal: React.FC = () => {
  const { isImportModalOpen, closeImportModal } = useModal();
  const [importProgress, setImportProgress] = useState<ImportProgress>({
    status: 'idle',
    message: '',
  });
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    if (!file) return;

    if (file.type !== 'application/json') {
      setImportProgress({
        status: 'error',
        message: 'Please select a valid JSON file.',
      });
      return;
    }

    setImportProgress({ status: 'parsing', message: 'Reading file...' });

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        processImportData(data);
      } catch (error) {
        setImportProgress({
          status: 'error',
          message: 'Invalid JSON file format.',
        });
      }
    };
    reader.readAsText(file);
  };

  const processImportData = (data: any) => {
    setImportProgress({ status: 'importing', message: 'Processing data...' });

    try {
      // Validate data structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid data structure');
      }

      let importedCount = { memories: 0, tasks: 0, projects: 0 };

      // Import memories
      if (data.memories && Array.isArray(data.memories)) {
        const existingMemories = JSON.parse(localStorage.getItem('memories') || '[]');
        const newMemories = data.memories.filter((memory: any) => 
          memory && memory.id && !existingMemories.some((existing: any) => existing.id === memory.id)
        );
        
        if (newMemories.length > 0) {
          localStorage.setItem('memories', JSON.stringify([...existingMemories, ...newMemories]));
          importedCount.memories = newMemories.length;
        }
      }

      // Import tasks
      if (data.tasks && Array.isArray(data.tasks)) {
        const existingTasks = JSON.parse(localStorage.getItem('tasks') || '[]');
        const newTasks = data.tasks.filter((task: any) => 
          task && task.id && !existingTasks.some((existing: any) => existing.id === task.id)
        );
        
        if (newTasks.length > 0) {
          localStorage.setItem('tasks', JSON.stringify([...existingTasks, ...newTasks]));
          importedCount.tasks = newTasks.length;
        }
      }

      // Import projects
      if (data.projects && Array.isArray(data.projects)) {
        const existingProjects = JSON.parse(localStorage.getItem('projects') || '[]');
        const newProjects = data.projects.filter((project: any) => 
          project && project.id && !existingProjects.some((existing: any) => existing.id === project.id)
        );
        
        if (newProjects.length > 0) {
          localStorage.setItem('projects', JSON.stringify([...existingProjects, ...newProjects]));
          importedCount.projects = newProjects.length;
        }
      }

      const totalImported = importedCount.memories + importedCount.tasks + importedCount.projects;

      if (totalImported === 0) {
        setImportProgress({
          status: 'error',
          message: 'No new items found to import. All items may already exist.',
        });
      } else {
        setImportProgress({
          status: 'success',
          message: `Successfully imported ${totalImported} items!`,
          details: importedCount,
        });

        // Auto-close and refresh after 2 seconds
        setTimeout(() => {
          closeImportModal();
          window.location.reload();
        }, 2000);
      }
    } catch (error) {
      setImportProgress({
        status: 'error',
        message: 'Failed to import data. Please check the file format.',
      });
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const resetImport = () => {
    setImportProgress({ status: 'idle', message: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getStatusIcon = () => {
    switch (importProgress.status) {
      case 'parsing':
      case 'importing':
        return <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />;
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-6 h-6 text-red-500" />;
      default:
        return <Upload className="w-8 h-8 text-muted-foreground" />;
    }
  };

  return (
    <Modal
      isOpen={isImportModalOpen}
      onClose={closeImportModal}
      title="Import Data"
      size="md"
    >
      <div className="space-y-6">
        {importProgress.status === 'idle' && (
          <>
            <div className="text-sm text-muted-foreground mb-4">
              Import memories, tasks, and projects from a previously exported JSON file.
            </div>

            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-border/30 hover:border-primary/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-foreground mb-2">
                Drop your JSON file here
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                or click to browse files
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 transition-colors"
              >
                Choose File
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          </>
        )}

        {importProgress.status !== 'idle' && (
          <div className="text-center py-8">
            <div className="flex justify-center mb-4">
              {getStatusIcon()}
            </div>
            <p className="text-lg font-medium text-foreground mb-2">
              {importProgress.message}
            </p>

            {importProgress.details && (
              <div className="bg-background/50 rounded-lg p-4 mt-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Memories</div>
                    <div className="font-medium">{importProgress.details.memories}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Tasks</div>
                    <div className="font-medium">{importProgress.details.tasks}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Projects</div>
                    <div className="font-medium">{importProgress.details.projects}</div>
                  </div>
                </div>
              </div>
            )}

            {importProgress.status === 'error' && (
              <button
                onClick={resetImport}
                className="mt-4 px-4 py-2 bg-background border border-border/30 text-foreground rounded-md hover:bg-accent transition-colors"
              >
                Try Again
              </button>
            )}
          </div>
        )}

        <div className="flex gap-3 justify-end pt-4">
          <button
            type="button"
            onClick={closeImportModal}
            className="px-6 py-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {importProgress.status === 'success' ? 'Close' : 'Cancel'}
          </button>
        </div>
      </div>
    </Modal>
  );
};