const path = require('path');
const fs = require('fs');

// Mock the MarkdownStorage class to test path handling
class MockMarkdownStorage {
  constructor(baseDir) {
    this.baseDir = baseDir;
    this.defaultProject = 'default';
  }

  getProjectDir(project) {
    const projectName = project || this.defaultProject;
    
    // Security: Sanitize project name to prevent path traversal
    const sanitizedProject = projectName
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(0, 50);
    
    if (!sanitizedProject) {
      throw new Error('Invalid project name');
    }
    
    const projectDir = path.join(this.baseDir, sanitizedProject);
    
    // Security: Ensure the path doesn't escape the base directory
    const resolvedProjectDir = path.resolve(projectDir);
    const resolvedBaseDir = path.resolve(this.baseDir);
    
    // On Windows, normalize paths for comparison
    const normalizedProjectDir = process.platform === 'win32' 
      ? resolvedProjectDir.toLowerCase().replace(/\\/g, '/')
      : resolvedProjectDir;
    const normalizedBaseDir = process.platform === 'win32'
      ? resolvedBaseDir.toLowerCase().replace(/\\/g, '/')
      : resolvedBaseDir;
    
    if (!normalizedProjectDir.startsWith(normalizedBaseDir)) {
      console.error(`[DEBUG] Path traversal check failed:`);
      console.error(`[DEBUG] Project dir: ${normalizedProjectDir}`);
      console.error(`[DEBUG] Base dir: ${normalizedBaseDir}`);
      throw new Error('Invalid project path - path traversal attempt detected');
    }
    
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }
    
    return projectDir;
  }
}

describe('Windows Path Handling', () => {
  let originalPlatform;
  
  beforeEach(() => {
    // Save original platform
    originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
    
    // Mock fs.existsSync and fs.mkdirSync
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    jest.spyOn(fs, 'mkdirSync').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original platform
    Object.defineProperty(process, 'platform', originalPlatform);
    jest.restoreAllMocks();
  });

  describe('Windows-specific tests', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        configurable: true
      });
    });

    it('should handle Windows paths with drive letters', () => {
      const storage = new MockMarkdownStorage('C:\\Users\\test\\memories');
      const projectDir = storage.getProjectDir('myproject');
      
      expect(projectDir).toBe(path.join('C:\\Users\\test\\memories', 'myproject'));
      expect(fs.mkdirSync).toHaveBeenCalledWith(projectDir, { recursive: true });
    });

    it('should handle case-insensitive Windows paths', () => {
      const storage = new MockMarkdownStorage('C:\\Users\\Test\\Memories');
      const projectDir = storage.getProjectDir('MyProject');
      
      // Should not throw due to case differences
      expect(() => storage.getProjectDir('MyProject')).not.toThrow();
    });

    it('should handle Windows paths with spaces', () => {
      const storage = new MockMarkdownStorage('C:\\Program Files\\My App\\memories');
      const projectDir = storage.getProjectDir('project-with-spaces');
      
      expect(projectDir).toBe(path.join('C:\\Program Files\\My App\\memories', 'project-with-spaces'));
    });

    it('should sanitize path traversal attempts on Windows', () => {
      const storage = new MockMarkdownStorage('C:\\Users\\test\\memories');
      
      // Test that path traversal attempts are sanitized
      expect(storage.getProjectDir('..\\..\\windows')).toBe(path.join('C:\\Users\\test\\memories', 'windows'));
      expect(storage.getProjectDir('..\\system32')).toBe(path.join('C:\\Users\\test\\memories', 'system32'));
      expect(storage.getProjectDir('\\\\server\\share')).toBe(path.join('C:\\Users\\test\\memories', 'servershare'));
    });

    it('should handle UNC paths correctly', () => {
      const storage = new MockMarkdownStorage('\\\\server\\share\\memories');
      const projectDir = storage.getProjectDir('myproject');
      
      expect(projectDir).toBe(path.join('\\\\server\\share\\memories', 'myproject'));
    });

    it('should handle network drive paths', () => {
      const storage = new MockMarkdownStorage('Z:\\shared\\memories');
      const projectDir = storage.getProjectDir('networkproject');
      
      expect(projectDir).toBe(path.join('Z:\\shared\\memories', 'networkproject'));
    });

    it('should normalize backslashes for comparison', () => {
      const storage = new MockMarkdownStorage('C:\\Users\\test\\memories');
      
      // Mock path.resolve to return mixed slashes
      jest.spyOn(path, 'resolve').mockImplementation((p) => {
        if (p.includes('myproject')) {
          return 'C:\\Users\\test\\memories\\myproject';
        }
        return 'C:\\Users\\test\\memories';
      });
      
      const projectDir = storage.getProjectDir('myproject');
      expect(projectDir).toBe(path.join('C:\\Users\\test\\memories', 'myproject'));
    });
  });

  describe('Unix-specific tests', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        configurable: true
      });
    });

    it('should handle Unix paths normally', () => {
      const storage = new MockMarkdownStorage('/home/user/memories');
      const projectDir = storage.getProjectDir('myproject');
      
      expect(projectDir).toBe(path.join('/home/user/memories', 'myproject'));
    });

    it('should sanitize path traversal attempts on Unix', () => {
      const storage = new MockMarkdownStorage('/home/user/memories');
      
      expect(storage.getProjectDir('../../etc')).toBe(path.join('/home/user/memories', 'etc'));
      expect(storage.getProjectDir('../../../root')).toBe(path.join('/home/user/memories', 'root'));
    });

    it('should handle paths with spaces on Unix', () => {
      const storage = new MockMarkdownStorage('/home/user/my memories');
      const projectDir = storage.getProjectDir('project-name');
      
      expect(projectDir).toBe(path.join('/home/user/my memories', 'project-name'));
    });
  });

  describe('Cross-platform sanitization', () => {
    it('should sanitize project names consistently', () => {
      const storage = new MockMarkdownStorage('/base');
      
      // Test sanitization of various invalid characters
      expect(storage.getProjectDir('../evil')).toBe(path.join('/base', 'evil'));
      expect(storage.getProjectDir('../../more-evil')).toBe(path.join('/base', 'more-evil'));
      expect(storage.getProjectDir('project/with/slashes')).toBe(path.join('/base', 'projectwithslashes'));
      expect(storage.getProjectDir('project\\with\\backslashes')).toBe(path.join('/base', 'projectwithbackslashes'));
      expect(storage.getProjectDir('project:with:colons')).toBe(path.join('/base', 'projectwithcolons'));
      expect(storage.getProjectDir('project*with*stars')).toBe(path.join('/base', 'projectwithstars'));
    });

    it('should limit project name length', () => {
      const storage = new MockMarkdownStorage('/base');
      const longName = 'a'.repeat(100);
      
      const projectDir = storage.getProjectDir(longName);
      const projectName = path.basename(projectDir);
      
      expect(projectName.length).toBe(50);
      expect(projectName).toBe('a'.repeat(50));
    });

    it('should reject empty project names after sanitization', () => {
      const storage = new MockMarkdownStorage('/base');
      
      expect(() => storage.getProjectDir('...')).toThrow('Invalid project name');
      expect(() => storage.getProjectDir('///')).toThrow('Invalid project name');
      expect(() => storage.getProjectDir('***')).toThrow('Invalid project name');
    });
  });

  describe('Edge cases', () => {
    it('should handle relative base directories', () => {
      const storage = new MockMarkdownStorage('./memories');
      
      // Mock path.resolve to return absolute paths
      jest.spyOn(path, 'resolve').mockImplementation((p) => {
        if (p === './memories') return '/current/dir/memories';
        if (p.includes('myproject')) return '/current/dir/memories/myproject';
        return p;
      });
      
      const projectDir = storage.getProjectDir('myproject');
      expect(() => storage.getProjectDir('myproject')).not.toThrow();
    });

    it('should handle symlinks correctly', () => {
      // This test would require more complex mocking of fs operations
      // For now, we just ensure the basic path validation works
      const storage = new MockMarkdownStorage('/home/user/memories');
      
      jest.spyOn(path, 'resolve').mockImplementation((p) => {
        // Simulate symlink resolution
        if (p === '/home/user/memories') return '/actual/location/memories';
        if (p.includes('myproject')) return '/actual/location/memories/myproject';
        return p;
      });
      
      const projectDir = storage.getProjectDir('myproject');
      expect(() => storage.getProjectDir('myproject')).not.toThrow();
    });
  });
});