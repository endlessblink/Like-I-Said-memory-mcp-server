import React, { useState } from 'react';
import { Modal } from './Modal';
import { useModal } from '../contexts/ModalContext';

interface TaskFormData {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string;
  project: string;
  category: string;
}

export const TaskModal: React.FC = () => {
  const { isTaskModalOpen, closeTaskModal } = useModal();
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
    project: '',
    category: 'work',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create task using the existing task creation logic
    const newTask = {
      id: `task-${Date.now()}`,
      title: formData.title,
      description: formData.description,
      priority: formData.priority,
      status: 'todo',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dueDate: formData.dueDate || null,
      project: formData.project || null,
      category: formData.category,
      tags: [],
    };

    // Save to localStorage (matching existing pattern)
    const existingTasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    existingTasks.push(newTask);
    localStorage.setItem('tasks', JSON.stringify(existingTasks));

    // Reset form and close modal
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      dueDate: '',
      project: '',
      category: 'work',
    });
    
    closeTaskModal();

    // Refresh the page to show the new task
    window.location.reload();
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <Modal
      isOpen={isTaskModalOpen}
      onClose={closeTaskModal}
      title="Create New Task"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-foreground mb-2">
            Task Title
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 bg-background/80 border border-border/30 rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent"
            placeholder="Enter task title..."
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-foreground mb-2">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            className="w-full px-3 py-2 bg-background/80 border border-border/30 rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent resize-none"
            placeholder="Describe the task..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-foreground mb-2">
              Priority
            </label>
            <select
              id="priority"
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-background/80 border border-border/30 rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-foreground mb-2">
              Category
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-background/80 border border-border/30 rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent"
            >
              <option value="work">Work</option>
              <option value="personal">Personal</option>
              <option value="code">Code</option>
              <option value="research">Research</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="dueDate" className="block text-sm font-medium text-foreground mb-2">
              Due Date
            </label>
            <input
              type="date"
              id="dueDate"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-background/80 border border-border/30 rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="project" className="block text-sm font-medium text-foreground mb-2">
              Project (Optional)
            </label>
            <input
              type="text"
              id="project"
              name="project"
              value={formData.project}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-background/80 border border-border/30 rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent"
              placeholder="Project name..."
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-4">
          <button
            type="button"
            onClick={closeTaskModal}
            className="px-6 py-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!formData.title.trim()}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Create Task
          </button>
        </div>
      </form>
    </Modal>
  );
};