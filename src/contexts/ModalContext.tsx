import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ModalContextType {
  isTaskModalOpen: boolean;
  isProjectModalOpen: boolean;
  isImportModalOpen: boolean;
  openTaskModal: () => void;
  closeTaskModal: () => void;
  openProjectModal: () => void;
  closeProjectModal: () => void;
  openImportModal: () => void;
  closeImportModal: () => void;
  exportData: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

interface ModalProviderProps {
  children: ReactNode;
}

export const ModalProvider: React.FC<ModalProviderProps> = ({ children }) => {
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const openTaskModal = () => setIsTaskModalOpen(true);
  const closeTaskModal = () => setIsTaskModalOpen(false);
  
  const openProjectModal = () => setIsProjectModalOpen(true);
  const closeProjectModal = () => setIsProjectModalOpen(false);
  
  const openImportModal = () => setIsImportModalOpen(true);
  const closeImportModal = () => setIsImportModalOpen(false);

  const exportData = () => {
    // Get current data from localStorage or your data source
    const dataToExport = {
      memories: JSON.parse(localStorage.getItem('memories') || '[]'),
      tasks: JSON.parse(localStorage.getItem('tasks') || '[]'),
      projects: JSON.parse(localStorage.getItem('projects') || '[]'),
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json',
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `like-i-said-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  };

  return (
    <ModalContext.Provider
      value={{
        isTaskModalOpen,
        isProjectModalOpen,
        isImportModalOpen,
        openTaskModal,
        closeTaskModal,
        openProjectModal,
        closeProjectModal,
        openImportModal,
        closeImportModal,
        exportData,
      }}
    >
      {children}
    </ModalContext.Provider>
  );
};