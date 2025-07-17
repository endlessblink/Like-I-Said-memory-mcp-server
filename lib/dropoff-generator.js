import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { MemoryFormat } from './memory-format.js';

export class DropoffGenerator {
  constructor(baseDir = null, packageJsonPath = 'package.json') {
    this.baseDir = baseDir || process.env.MEMORY_DIR || 'memories';
    this.packageJsonPath = packageJsonPath;
    this.memoryFormat = new MemoryFormat();
  }

  /**
   * Generate a comprehensive session dropoff document
   * @param {Object} options - Configuration options
   * @param {string} options.sessionSummary - Brief summary of work done
   * @param {boolean} options.includeRecentMemories - Include recent memories (default: true)
   * @param {boolean} options.includeGitStatus - Include git status (default: true)
   * @param {number} options.recentMemoryCount - Number of recent memories to include (default: 5)
   * @param {string} options.outputFormat - Output format: 'markdown' or 'json' (default: 'markdown')
   * @returns {string} Generated dropoff content
   */
  async generateDropoff(options = {}) {
    const config = {
      sessionSummary: options.sessionSummary || 'Session work completed',
      includeRecentMemories: options.includeRecentMemories !== false,
      includeGitStatus: options.includeGitStatus !== false,
      recentMemoryCount: options.recentMemoryCount || 5,
      outputFormat: options.outputFormat || 'markdown',
      ...options
    };

    try {
      const contextData = await this.collectContextData(config);
      
      if (config.outputFormat === 'json') {
        return JSON.stringify(contextData, null, 2);
      }
      
      return this.generateMarkdownDropoff(contextData, config);
    } catch (error) {
      console.error('Error generating dropoff:', error);
      throw error;
    }
  }

  /**
   * Collect all context data for the dropoff
   */
  async collectContextData(config) {
    const contextData = {
      timestamp: new Date().toISOString(),
      sessionSummary: config.sessionSummary,
      projectInfo: await this.getProjectInfo(),
      gitStatus: config.includeGitStatus ? await this.getGitStatus() : null,
      recentMemories: config.includeRecentMemories ? await this.getRecentMemories(config.recentMemoryCount) : [],
      systemStatus: await this.getSystemStatus(),
      nextSteps: await this.detectNextSteps()
    };

    return contextData;
  }

  /**
   * Get project information from package.json
   */
  async getProjectInfo() {
    try {
      if (!fs.existsSync(this.packageJsonPath)) {
        return { error: 'package.json not found' };
      }

      const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
      const currentDir = process.cwd();
      
      return {
        name: packageJson.name,
        version: packageJson.version,
        description: packageJson.description,
        location: currentDir,
        repository: packageJson.repository?.url || 'Not specified',
        scripts: Object.keys(packageJson.scripts || {})
      };
    } catch (error) {
      return { error: `Failed to read project info: ${error.message}` };
    }
  }

  /**
   * Get git status information
   */
  async getGitStatus() {
    try {
      const status = {
        currentBranch: this.runGitCommand('git branch --show-current').trim(),
        hasChanges: false,
        unstagedFiles: [],
        stagedFiles: [],
        untrackedFiles: [],
        recentCommits: []
      };

      // Check for changes
      const gitStatus = this.runGitCommand('git status --porcelain');
      if (gitStatus) {
        status.hasChanges = true;
        const lines = gitStatus.split('\n').filter(line => line.trim());
        
        lines.forEach(line => {
          const statusCode = line.substring(0, 2);
          const filePath = line.substring(3);
          
          if (statusCode.includes('??')) {
            status.untrackedFiles.push(filePath);
          } else if (statusCode[0] !== ' ') {
            status.stagedFiles.push(filePath);
          } else if (statusCode[1] !== ' ') {
            status.unstagedFiles.push(filePath);
          }
        });
      }

      // Get recent commits
      const recentCommits = this.runGitCommand('git log --oneline -5');
      status.recentCommits = recentCommits.split('\n').filter(line => line.trim());

      return status;
    } catch (error) {
      return { error: `Git not available or not a git repository: ${error.message}` };
    }
  }

  /**
   * Get recent memories
   */
  async getRecentMemories(count = 5) {
    try {
      const memories = [];
      const categories = await this.getMemoryCategories();
      
      // Collect all memory files with timestamps
      const allMemories = [];
      
      for (const category of categories) {
        const categoryPath = path.join(this.baseDir, category);
        if (fs.existsSync(categoryPath)) {
          const files = fs.readdirSync(categoryPath).filter(file => file.endsWith('.md'));
          
          for (const file of files) {
            const filePath = path.join(categoryPath, file);
            const stats = fs.statSync(filePath);
            
            try {
              const content = fs.readFileSync(filePath, 'utf8');
              const parsed = this.memoryFormat.parseMemory(content);
              
              allMemories.push({
                file: file,
                category: category,
                title: parsed.metadata.title || file.replace('.md', ''),
                timestamp: parsed.metadata.timestamp || stats.mtime.toISOString(),
                tags: parsed.metadata.tags || [],
                priority: parsed.metadata.priority || 'medium',
                mtime: stats.mtime
              });
            } catch (parseError) {
              // If parsing fails, include basic file info
              allMemories.push({
                file: file,
                category: category,
                title: file.replace('.md', ''),
                timestamp: stats.mtime.toISOString(),
                tags: [],
                priority: 'medium',
                mtime: stats.mtime,
                parseError: true
              });
            }
          }
        }
      }
      
      // Sort by modification time (most recent first) and take top N
      allMemories.sort((a, b) => b.mtime - a.mtime);
      return allMemories.slice(0, count);
      
    } catch (error) {
      return [{ error: `Failed to get recent memories: ${error.message}` }];
    }
  }

  /**
   * Get memory categories
   */
  async getMemoryCategories() {
    try {
      if (!fs.existsSync(this.baseDir)) {
        return [];
      }
      
      return fs.readdirSync(this.baseDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
    } catch (error) {
      return [];
    }
  }

  /**
   * Get system status information
   */
  async getSystemStatus() {
    try {
      const status = {
        nodeVersion: process.version,
        platform: process.platform,
        workingDirectory: process.cwd(),
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
        ports: {
          dashboard: 5173,  // Vite default
          api: 3001        // Express API
        }
      };

      // Check if processes are running (simplified check)
      try {
        const netstat = this.runCommand('netstat -an');
        status.ports.dashboardRunning = netstat.includes(':5173');
        status.ports.apiRunning = netstat.includes(':3001');
      } catch (error) {
        status.ports.checkError = 'Could not check port status';
      }

      return status;
    } catch (error) {
      return { error: `Failed to get system status: ${error.message}` };
    }
  }

  /**
   * Detect suggested next steps based on recent activity
   */
  async detectNextSteps() {
    const suggestions = [];
    
    try {
      // Check if there are uncommitted changes
      const gitStatus = await this.getGitStatus();
      if (gitStatus && !gitStatus.error && gitStatus.hasChanges) {
        suggestions.push('Review and commit pending changes');
      }

      // Check recent memories for patterns
      const recentMemories = await this.getRecentMemories(3);
      if (recentMemories.length > 0) {
        const recentTags = recentMemories.flatMap(m => m.tags || []);
        const commonTags = this.findMostFrequent(recentTags, 2);
        
        if (commonTags.length > 0) {
          suggestions.push(`Continue work on: ${commonTags.join(', ')}`);
        }
      }

      // Standard suggestions
      suggestions.push('Test the WebSocket updates with actual MCP memory creation');
      suggestions.push('Verify dashboard shows real-time updates');
      suggestions.push('Run npm run migrate if needed for memory format consistency');

      return suggestions;
    } catch (error) {
      return ['Review project status and continue development'];
    }
  }

  /**
   * Generate markdown formatted dropoff document
   */
  generateMarkdownDropoff(contextData, config) {
    const { projectInfo, gitStatus, recentMemories, systemStatus, nextSteps } = contextData;
    
    let markdown = `# ${projectInfo.name || 'Project'} - Session Drop-off\n\n`;
    markdown += `## Quick Copy-Paste Prompt for New Session\n\n`;
    markdown += '```\n';
    markdown += `Continue working on ${projectInfo.name || 'the project'} from where we left off.\n\n`;
    markdown += `Project location: ${projectInfo.location}\n`;
    markdown += `Current version: ${projectInfo.version}\n\n`;
    
    // Session summary
    markdown += `Session Summary: ${contextData.sessionSummary}\n\n`;
    
    // Recent memories section
    if (recentMemories && recentMemories.length > 0) {
      markdown += 'Recent work:\n';
      recentMemories.slice(0, 3).forEach((memory, index) => {
        markdown += `${index + 1}. ${memory.title} (${memory.category})\n`;
      });
      markdown += '\n';
    }

    // Git status
    if (gitStatus && !gitStatus.error) {
      markdown += `Current branch: ${gitStatus.currentBranch}\n`;
      if (gitStatus.hasChanges) {
        markdown += 'Status: Has uncommitted changes\n';
      } else {
        markdown += 'Status: Clean working directory\n';
      }
      markdown += '\n';
    }

    // Next steps
    if (nextSteps && nextSteps.length > 0) {
      markdown += 'Next priorities:\n';
      nextSteps.slice(0, 4).forEach((step, index) => {
        markdown += `${index + 1}. ${step}\n`;
      });
      markdown += '\n';
    }

    markdown += 'Quick verification:\n';
    markdown += `cd ${projectInfo.location}\n`;
    if (projectInfo.scripts && projectInfo.scripts.includes('dev:full')) {
      markdown += 'npm run dev:full\n';
    } else if (projectInfo.scripts && projectInfo.scripts.includes('dev')) {
      markdown += 'npm run dev\n';
    }
    markdown += '```\n\n';

    // Detailed sections
    markdown += '## Detailed Context\n\n';
    
    // Project info
    markdown += '### Project Information\n\n';
    markdown += `- **Name**: ${projectInfo.name}\n`;
    markdown += `- **Version**: ${projectInfo.version}\n`;
    markdown += `- **Description**: ${projectInfo.description}\n`;
    markdown += `- **Location**: ${projectInfo.location}\n`;
    if (projectInfo.repository && !projectInfo.repository.includes('Not specified')) {
      markdown += `- **Repository**: ${projectInfo.repository}\n`;
    }
    markdown += '\n';

    // Git status details
    if (gitStatus && !gitStatus.error) {
      markdown += '### Git Status\n\n';
      markdown += `- **Branch**: ${gitStatus.currentBranch}\n`;
      markdown += `- **Has Changes**: ${gitStatus.hasChanges ? 'Yes' : 'No'}\n`;
      
      if (gitStatus.unstagedFiles.length > 0) {
        markdown += `- **Modified Files**: ${gitStatus.unstagedFiles.join(', ')}\n`;
      }
      if (gitStatus.stagedFiles.length > 0) {
        markdown += `- **Staged Files**: ${gitStatus.stagedFiles.join(', ')}\n`;
      }
      if (gitStatus.untrackedFiles.length > 0) {
        markdown += `- **Untracked Files**: ${gitStatus.untrackedFiles.join(', ')}\n`;
      }
      
      if (gitStatus.recentCommits.length > 0) {
        markdown += '\n**Recent Commits**:\n';
        gitStatus.recentCommits.forEach(commit => {
          markdown += `- ${commit}\n`;
        });
      }
      markdown += '\n';
    }

    // Recent memories details
    if (recentMemories && recentMemories.length > 0) {
      markdown += '### Recent Memories\n\n';
      recentMemories.forEach((memory, index) => {
        markdown += `${index + 1}. **${memory.title}** (${memory.category})\n`;
        markdown += `   - File: ${memory.file}\n`;
        markdown += `   - Timestamp: ${memory.timestamp}\n`;
        if (memory.tags && memory.tags.length > 0) {
          markdown += `   - Tags: ${memory.tags.join(', ')}\n`;
        }
        markdown += `   - Priority: ${memory.priority}\n`;
        if (memory.parseError) {
          markdown += `   - Note: Parse error, showing basic info\n`;
        }
        markdown += '\n';
      });
    }

    // System status
    if (systemStatus && !systemStatus.error) {
      markdown += '### System Status\n\n';
      markdown += `- **Node Version**: ${systemStatus.nodeVersion}\n`;
      markdown += `- **Platform**: ${systemStatus.platform}\n`;
      markdown += `- **Working Directory**: ${systemStatus.workingDirectory}\n`;
      if (systemStatus.ports) {
        markdown += `- **Dashboard Port**: ${systemStatus.ports.dashboard}\n`;
        markdown += `- **API Port**: ${systemStatus.ports.api}\n`;
      }
      markdown += '\n';
    }

    markdown += `---\n\n`;
    markdown += `*Generated on ${new Date(contextData.timestamp).toLocaleString()}*\n`;

    return markdown;
  }

  /**
   * Run git command safely
   */
  runGitCommand(command) {
    try {
      return execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Run system command safely
   */
  runCommand(command) {
    try {
      return execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find most frequent items in array
   */
  findMostFrequent(arr, count = 3) {
    const frequency = {};
    arr.forEach(item => {
      frequency[item] = (frequency[item] || 0) + 1;
    });
    
    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(entry => entry[0]);
  }
}