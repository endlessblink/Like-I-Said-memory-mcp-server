/**
 * Task ID validation and format handling
 * Provides flexible task ID format support with validation and suggestions
 */

export class TaskIdValidator {
  /**
   * Known task ID patterns
   * Add new patterns here as they're discovered
   */
  static PATTERNS = {
    // Standard format: PROJECT-CXXXX (e.g., PAL-C0001)
    STANDARD: /^([A-Z]+)-C(\d{4})$/,
    // Alternative format: PROJECT-GXXXX (e.g., PAL-G0023)
    ALTERNATIVE: /^([A-Z]+)-G(\d{4})$/,
    // Legacy format: PROJECT-XXXX (e.g., PAL-0001)
    LEGACY: /^([A-Z]+)-(\d{4})$/,
    // UUID format
    UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    // Simple format: TASK-XXXXX
    SIMPLE: /^TASK-(\d{5})$/
  };

  /**
   * Validate if a task ID matches any known pattern
   */
  static isValidFormat(taskId) {
    if (!taskId || typeof taskId !== 'string') return false;
    
    return Object.values(this.PATTERNS).some(pattern => pattern.test(taskId));
  }

  /**
   * Extract project prefix from task ID
   */
  static extractProject(taskId) {
    // Check standard patterns first
    const standardMatch = taskId.match(this.PATTERNS.STANDARD);
    if (standardMatch) return standardMatch[1];
    
    const altMatch = taskId.match(this.PATTERNS.ALTERNATIVE);
    if (altMatch) return altMatch[1];
    
    const legacyMatch = taskId.match(this.PATTERNS.LEGACY);
    if (legacyMatch) return legacyMatch[1];
    
    // TASK-XXXXX and UUID formats don't have project prefixes
    if (this.PATTERNS.SIMPLE.test(taskId) || this.PATTERNS.UUID.test(taskId)) {
      return null;
    }
    
    return null;
  }

  /**
   * Convert alternative formats to standard format
   * e.g., PAL-G0023 -> PAL-C0023
   */
  static toStandardFormat(taskId) {
    // Try alternative format first
    const altMatch = taskId.match(this.PATTERNS.ALTERNATIVE);
    if (altMatch) {
      return `${altMatch[1]}-C${altMatch[2]}`;
    }

    // Try legacy format
    const legacyMatch = taskId.match(this.PATTERNS.LEGACY);
    if (legacyMatch && !taskId.includes('-C')) {
      return `${legacyMatch[1]}-C${legacyMatch[2]}`;
    }

    // Already standard or other format
    return taskId;
  }

  /**
   * Find similar task IDs from a list
   * Useful for suggesting corrections
   */
  static findSimilar(taskId, existingIds) {
    const project = this.extractProject(taskId);
    if (!project) return [];

    const similar = existingIds.filter(id => {
      // Same project
      if (this.extractProject(id) === project) return true;
      
      // Similar ID structure
      const idNumber = taskId.match(/\d+/);
      if (idNumber && id.includes(idNumber[0])) return true;
      
      return false;
    });

    return similar.slice(0, 5); // Return top 5 suggestions
  }

  /**
   * Generate helpful error message for invalid task ID
   */
  static getErrorMessage(taskId, existingIds = []) {
    if (!this.isValidFormat(taskId)) {
      return `Invalid task ID format: ${taskId}. Expected formats: PROJECT-CXXXX (e.g., PAL-C0001), TASK-XXXXX, or UUID.`;
    }

    // Try to convert to standard format
    const standardId = this.toStandardFormat(taskId);
    if (standardId !== taskId && existingIds.includes(standardId)) {
      return `Task ID ${taskId} not found. Did you mean ${standardId}?`;
    }

    // Find similar IDs
    const similar = this.findSimilar(taskId, existingIds);
    if (similar.length > 0) {
      return `Task with ID ${taskId} not found. Similar task IDs: ${similar.join(', ')}`;
    }

    return `Task with ID ${taskId} not found`;
  }

  /**
   * Validate and normalize task ID
   * Returns { valid: boolean, normalized: string, error?: string }
   */
  static validate(taskId, existingIds = []) {
    if (!taskId) {
      return { valid: false, error: 'Task ID is required' };
    }

    if (!this.isValidFormat(taskId)) {
      return { 
        valid: false, 
        error: this.getErrorMessage(taskId, existingIds)
      };
    }

    const normalized = this.toStandardFormat(taskId);
    
    return { 
      valid: true, 
      normalized,
      original: taskId,
      wasConverted: normalized !== taskId
    };
  }
}

export default TaskIdValidator;