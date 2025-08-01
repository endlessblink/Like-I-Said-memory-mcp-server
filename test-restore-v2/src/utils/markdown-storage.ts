import fs from 'fs'
import path from 'path'
import { Memory } from '../types'

export interface MarkdownMemory extends Omit<Memory, 'metadata'> {
  filename: string
  filepath: string
  metadata?: Memory['metadata']
}

export interface StorageConfig {
  baseDir: string
  defaultProject: string
}

export class MarkdownStorage {
  private config: StorageConfig

  constructor(config: StorageConfig) {
    this.config = config
    this.ensureDirectories()
  }

  private ensureDirectories(): void {
    // Create base directory
    if (!fs.existsSync(this.config.baseDir)) {
      fs.mkdirSync(this.config.baseDir, { recursive: true })
    }

    // Create default project directory
    const defaultProjectDir = path.join(this.config.baseDir, this.config.defaultProject)
    if (!fs.existsSync(defaultProjectDir)) {
      fs.mkdirSync(defaultProjectDir, { recursive: true })
    }
  }

  private generateFilename(memory: Partial<Memory>): string {
    const date = new Date(memory.timestamp || Date.now())
    const dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD
    
    // Create a slug from content (first few words)
    const content = memory.content || 'memory'
    const slug = content
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special chars
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .slice(0, 50) // Limit length
      .replace(/-+$/, '') // Remove trailing hyphens
    
    const timestamp = Date.now().toString().slice(-6) // Last 6 digits for uniqueness
    return `${dateStr}-${slug}-${timestamp}.md`
  }

  private getProjectDir(project?: string): string {
    const projectName = project || this.config.defaultProject
    const projectDir = path.join(this.config.baseDir, projectName)
    
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true })
    }
    
    return projectDir
  }

  private parseMarkdownFile(filepath: string): MarkdownMemory | null {
    try {
      const content = fs.readFileSync(filepath, 'utf8')
      const parsed = this.parseMarkdownContent(content)
      
      if (!parsed) return null

      const filename = path.basename(filepath)
      const projectName = path.basename(path.dirname(filepath))
      
      return {
        ...parsed,
        filename,
        filepath,
        project: projectName === this.config.defaultProject ? undefined : projectName
      }
    } catch (error) {
      console.error(`Error reading markdown file ${filepath}:`, error)
      return null
    }
  }

  private parseMarkdownContent(content: string): Partial<Memory> | null {
    // Parse frontmatter and content
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/
    const match = content.match(frontmatterRegex)
    
    if (!match) {
      // No frontmatter, treat entire content as memory content
      return {
        id: Date.now().toString(),
        content: content.trim(),
        timestamp: new Date().toISOString(),
        tags: []
      }
    }

    const [, frontmatter, bodyContent] = match
    const memory: Partial<Memory> = {
      content: bodyContent.trim()
    }

    // Parse YAML-like frontmatter
    frontmatter.split('\n').forEach(line => {
      const colonIndex = line.indexOf(':')
      if (colonIndex === -1) return

      const key = line.slice(0, colonIndex).trim()
      const value = line.slice(colonIndex + 1).trim()

      switch (key) {
        case 'id':
          memory.id = value
          break
        case 'timestamp':
        case 'created':
          memory.timestamp = value
          break
        case 'category':
          memory.category = value as any
          break
        case 'tags':
          // Parse array format: [tag1, tag2] or comma-separated
          if (value.startsWith('[') && value.endsWith(']')) {
            memory.tags = value.slice(1, -1).split(',').map(t => t.trim().replace(/['"]/g, ''))
          } else {
            memory.tags = value.split(',').map(t => t.trim()).filter(Boolean)
          }
          break
        case 'project':
          memory.project = value
          break
      }
    })

    return memory
  }

  private generateMarkdownContent(memory: Memory): string {
    const frontmatter = [
      '---',
      `id: ${memory.id}`,
      `timestamp: ${memory.timestamp}`,
      memory.category ? `category: ${memory.category}` : null,
      memory.project ? `project: ${memory.project}` : null,
      memory.tags && memory.tags.length > 0 ? `tags: [${memory.tags.map(t => `"${t}"`).join(', ')}]` : null,
      '---',
      ''
    ].filter(Boolean).join('\n')

    return frontmatter + memory.content
  }

  async saveMemory(memory: Memory): Promise<string> {
    const projectDir = this.getProjectDir(memory.project)
    const filename = this.generateFilename(memory)
    const filepath = path.join(projectDir, filename)
    
    const markdownContent = this.generateMarkdownContent(memory)
    
    fs.writeFileSync(filepath, markdownContent, 'utf8')
    
    return filepath
  }

  async getMemory(id: string): Promise<MarkdownMemory | null> {
    // Search across all project directories
    const memories = await this.listMemories()
    return memories.find(m => m.id === id) || null
  }

  async listMemories(project?: string): Promise<MarkdownMemory[]> {
    const memories: MarkdownMemory[] = []
    
    if (project) {
      // List memories for specific project
      const projectDir = this.getProjectDir(project)
      const files = fs.readdirSync(projectDir).filter(f => f.endsWith('.md'))
      
      for (const file of files) {
        const filepath = path.join(projectDir, file)
        const memory = this.parseMarkdownFile(filepath)
        if (memory) memories.push(memory)
      }
    } else {
      // List memories from all projects
      const projectDirs = fs.readdirSync(this.config.baseDir).filter(dir => {
        const dirPath = path.join(this.config.baseDir, dir)
        return fs.statSync(dirPath).isDirectory()
      })

      for (const projectDir of projectDirs) {
        const projectPath = path.join(this.config.baseDir, projectDir)
        const files = fs.readdirSync(projectPath).filter(f => f.endsWith('.md'))
        
        for (const file of files) {
          const filepath = path.join(projectPath, file)
          const memory = this.parseMarkdownFile(filepath)
          if (memory) memories.push(memory)
        }
      }
    }

    // Sort by timestamp (newest first)
    return memories.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }

  async updateMemory(id: string, updates: Partial<Memory>): Promise<boolean> {
    const existingMemory = await this.getMemory(id)
    if (!existingMemory) return false

    // Delete old file
    fs.unlinkSync(existingMemory.filepath)

    // Create updated memory
    const updatedMemory: Memory = {
      ...existingMemory,
      ...updates,
      id: existingMemory.id, // Keep original ID
      timestamp: existingMemory.timestamp // Keep original timestamp unless explicitly updated
    }

    await this.saveMemory(updatedMemory)
    return true
  }

  async deleteMemory(id: string): Promise<boolean> {
    const memory = await this.getMemory(id)
    if (!memory) return false

    fs.unlinkSync(memory.filepath)
    return true
  }

  async searchMemories(query: string, project?: string): Promise<MarkdownMemory[]> {
    const memories = await this.listMemories(project)
    const lowerQuery = query.toLowerCase()

    return memories.filter(memory => 
      memory.content.toLowerCase().includes(lowerQuery) ||
      memory.tags?.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
      memory.category?.toLowerCase().includes(lowerQuery)
    )
  }

  async listProjects(): Promise<string[]> {
    const projectDirs = fs.readdirSync(this.config.baseDir).filter(dir => {
      const dirPath = path.join(this.config.baseDir, dir)
      return fs.statSync(dirPath).isDirectory()
    })

    return projectDirs.filter(dir => dir !== this.config.defaultProject)
  }

  async createProject(projectName: string): Promise<string> {
    const projectDir = path.join(this.config.baseDir, projectName)
    
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true })
    }
    
    return projectDir
  }

  async deleteProject(projectName: string): Promise<boolean> {
    if (projectName === this.config.defaultProject) {
      throw new Error('Cannot delete default project')
    }

    const projectDir = path.join(this.config.baseDir, projectName)
    
    if (!fs.existsSync(projectDir)) return false

    // Move all memories to default project
    const memories = await this.listMemories(projectName)
    for (const memory of memories) {
      const updatedMemory: Memory = {
        ...memory,
        project: undefined // Move to default project
      }
      await this.saveMemory(updatedMemory)
      fs.unlinkSync(memory.filepath)
    }

    // Remove empty directory
    fs.rmdirSync(projectDir)
    return true
  }

  // Migration utility from JSON to markdown
  async migrateFromJSON(jsonFilePath: string): Promise<number> {
    if (!fs.existsSync(jsonFilePath)) {
      return 0
    }

    const jsonContent = fs.readFileSync(jsonFilePath, 'utf8')
    const memories: Memory[] = JSON.parse(jsonContent)

    let migrated = 0
    for (const memory of memories) {
      try {
        await this.saveMemory(memory)
        migrated++
      } catch (error) {
        console.error(`Failed to migrate memory ${memory.id}:`, error)
      }
    }

    // Backup original JSON file
    const backupPath = jsonFilePath + '.backup'
    fs.copyFileSync(jsonFilePath, backupPath)

    return migrated
  }
}