/**
 * Task sorting utilities for optimal productivity viewing
 */

// Sort tasks for optimal productivity viewing
export function sortTasks(tasks, sortType = 'priority') {
  const sorted = [...tasks];
  
  return sorted.sort((a, b) => {
    switch (sortType) {
      case 'priority':
        const aPriority = a.priority || 'medium';
        const bPriority = b.priority || 'medium';
        
        // URGENT always wins (explicit comparison)
        if (aPriority === 'urgent' && bPriority !== 'urgent') return -1;
        if (bPriority === 'urgent' && aPriority !== 'urgent') return 1;
        
        // Within same priority, in_progress before todo
        if (aPriority === bPriority) {
          if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
          if (b.status === 'in_progress' && a.status !== 'in_progress') return 1;
        }
        
        // Standard priority order for non-urgent
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        const priorityDiff = (priorityOrder[aPriority] || 2) - (priorityOrder[bPriority] || 2);
        if (priorityDiff !== 0) return priorityDiff;
        
        // Alphabetical within same priority/status
        return (a.title || '').localeCompare(b.title || '');
        
      case 'status':
        // Sort by status only, then alphabetical
        const statusOrder = { in_progress: 0, todo: 1, blocked: 2 };
        const statusDiff2 = (statusOrder[a.status] || 1) - (statusOrder[b.status] || 1);
        if (statusDiff2 !== 0) return statusDiff2;
        return (a.title || '').localeCompare(b.title || '');
        
      case 'created':
        // Sort by creation date (newest first)
        const dateA = new Date(a.created || 0);
        const dateB = new Date(b.created || 0);
        return dateB - dateA;
        
      case 'alpha':
        // Sort alphabetically by title
        return (a.title || '').localeCompare(b.title || '');
        
      default:
        return 0; // No sorting - preserve original order
    }
  });
}

export default { sortTasks };