import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, FileText, FolderPlus, Download, Upload, X, Brain } from 'lucide-react';

interface FABAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}

interface FABMenuProps {
  onCreateMemory?: () => void;
  onCreateTask: () => void;
  onCreateProject: () => void;
  onImportMemories: () => void;
  onExportData: () => void;
}

export const FABMenu: React.FC<FABMenuProps> = ({
  onCreateMemory,
  onCreateTask,
  onCreateProject,
  onImportMemories,
  onExportData,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);

  const actions: FABAction[] = [
    ...(onCreateMemory ? [{
      id: 'create-memory',
      label: 'Create Memory',
      icon: <Brain size={20} />,
      onClick: onCreateMemory,
    }] : []),
    {
      id: 'create-task',
      label: 'Create Task',
      icon: <FileText size={20} />,
      onClick: onCreateTask,
    },
    {
      id: 'new-project',
      label: 'New Project',
      icon: <FolderPlus size={20} />,
      onClick: onCreateProject,
    },
    {
      id: 'import-memories',
      label: 'Import Memories',
      icon: <Upload size={20} />,
      onClick: onImportMemories,
    },
    {
      id: 'export-data',
      label: 'Export Data',
      icon: <Download size={20} />,
      onClick: onExportData,
    },
  ];

  const handleActionClick = (action: FABAction) => {
    action.onClick();
    setIsOpen(false);
  };

  // Close FAB when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Animation variants for staggered entrance
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      scale: 0.8,
      x: 20,
    },
    visible: {
      opacity: 1,
      scale: 1,
      x: 0,
      transition: {
        type: 'spring',
        stiffness: 260,
        damping: 20,
      },
    },
  };

  return (
    <div
      ref={fabRef}
      className="fixed bottom-6 right-6 z-40 flex flex-col-reverse items-end gap-3"
    >
      {/* Action Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="flex flex-col-reverse gap-3 mb-2"
          >
            {actions.map((action) => (
              <motion.div
                key={action.id}
                variants={itemVariants}
                className="flex items-center gap-3"
              >
                {/* Action Label */}
                <motion.div
                  className="bg-card/90 backdrop-blur-md border border-border/30 rounded-lg px-3 py-2 text-sm font-medium text-foreground shadow-lg whitespace-nowrap"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                >
                  {action.label}
                </motion.div>
                
                {/* Action Button */}
                <motion.button
                  onClick={() => handleActionClick(action)}
                  className="w-12 h-12 bg-card/40 backdrop-blur-md border border-border/30 rounded-full shadow-xl hover:bg-card/60 hover:scale-105 transition-all duration-200 flex items-center justify-center text-primary hover:text-primary/80 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {action.icon}
                </motion.button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-card/40 backdrop-blur-md border border-border/30 rounded-full shadow-xl hover:bg-card/60 hover:scale-105 transition-all duration-200 flex items-center justify-center text-primary hover:text-primary/80 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={{ rotate: isOpen ? 45 : 0 }}
        transition={{ duration: 0.2 }}
      >
        {isOpen ? (
          <X size={24} />
        ) : (
          <Plus size={24} />
        )}
      </motion.button>
    </div>
  );
};

export default FABMenu;