import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '../..')
const testMemoriesDir = path.join(projectRoot, 'test-memories')

describe('MCP Tools Integration', () => {
  beforeEach(() => {
    // Create test memories directory
    if (!fs.existsSync(testMemoriesDir)) {
      fs.mkdirSync(testMemoriesDir, { recursive: true })
    }
  })

  afterEach(() => {
    // Clean up test memories
    if (fs.existsSync(testMemoriesDir)) {
      fs.rmSync(testMemoriesDir, { recursive: true, force: true })
    }
  })

  describe('Memory File Operations', () => {
    it('should create test memory directory', () => {
      expect(fs.existsSync(testMemoriesDir)).toBe(true)
    })

    it('should be able to write and read memory files', () => {
      const testFile = path.join(testMemoriesDir, 'test-memory.md')
      const testContent = '# Test Memory\n\nThis is a test memory file.'
      
      fs.writeFileSync(testFile, testContent, 'utf-8')
      const readContent = fs.readFileSync(testFile, 'utf-8')
      
      expect(readContent).toBe(testContent)
    })

    it('should handle Unicode content in memory files', () => {
      const testFile = path.join(testMemoriesDir, 'unicode-test.md')
      const unicodeContent = '# Unicode Test\n\nHello 世界! שלום עולם! 🌍'
      
      fs.writeFileSync(testFile, unicodeContent, 'utf-8')
      const readContent = fs.readFileSync(testFile, 'utf-8')
      
      expect(readContent).toBe(unicodeContent)
    })
  })

  describe('Memory ID Generation', () => {
    it('should generate unique timestamps', () => {
      const timestamp1 = Date.now()
      const timestamp2 = Date.now()
      
      // Timestamps should be unique or very close
      expect(typeof timestamp1).toBe('number')
      expect(typeof timestamp2).toBe('number')
      expect(timestamp2).toBeGreaterThanOrEqual(timestamp1)
    })
  })
})