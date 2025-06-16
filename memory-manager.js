// Simple memory manager for compatibility
export default class MemoryManager {
  constructor(options = {}) {
    this.baseDir = options.baseDir || './memories';
    this.currentProject = options.project || 'default';
    this.sandboxed = options.sandboxed !== false;
  }
}