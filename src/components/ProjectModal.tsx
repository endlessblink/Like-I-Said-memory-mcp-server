import React, { useState } from 'react';
import { Modal } from './Modal';
import { useModal } from '../contexts/ModalContext';

interface ProjectFormData {
  name: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string;
  category: string;
  tags: string;
}

export const ProjectModal: React.FC = () => {
  const { isProjectModalOpen, closeProjectModal } = useModal();
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    description: '',
    priority: 'medium',
    dueDate: '',
    category: 'work',
    tags: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create project using the existing project creation logic
    const newProject = {
      id: `project-${Date.now()}`,
      name: formData.name,
      description: formData.description,
      priority: formData.priority,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dueDate: formData.dueDate || null,
      category: formData.category,
      tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : [],
      tasksCount: 0,
      completedTasks: 0,
    };

    // Save to localStorage (matching existing pattern)
    const existingProjects = JSON.parse(localStorage.getItem('projects') || '[]');
    existingProjects.push(newProject);
    localStorage.setItem('projects', JSON.stringify(existingProjects));

    // Reset form and close modal
    setFormData({
      name: '',
      description: '',
      priority: 'medium',
      dueDate: '',
      category: 'work',
      tags: '',
    });
    
    closeProjectModal();

    // Refresh the page to show the new project
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
      isOpen={isProjectModalOpen}
      onClose={closeProjectModal}
      title="Create New Project"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
            Project Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 bg-background/80 border border-border/30 rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent"
            placeholder="Enter project name..."
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
            placeholder="Describe the project goals and objectives..."
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
              Target Completion
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
            <label htmlFor="tags" className="block text-sm font-medium text-foreground mb-2">
              Tags (Optional)
            </label>
            <input
              type="text"
              id="tags"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-background/80 border border-border/30 rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent"
              placeholder="frontend, backend, ui..."
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-4">
          <button
            type="button"
            onClick={closeProjectModal}
            className="px-6 py-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!formData.name.trim()}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Create Project
          </button>
        </div>
      </form>
    </Modal>
  );
};