import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sanitizeUnicode } from '../../memory-sanitizer.js'

describe('Memory Sanitizer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('sanitizeUnicode', () => {
    it('should return non-string values unchanged', () => {
      expect(sanitizeUnicode(null)).toBe(null)
      expect(sanitizeUnicode(undefined)).toBe(undefined)
      expect(sanitizeUnicode(123)).toBe(123)
      expect(sanitizeUnicode({})).toEqual({})
    })

    it('should handle valid UTF-8 strings', () => {
      const validString = 'Hello World! 🌍'
      expect(sanitizeUnicode(validString)).toBe(validString)
    })

    it('should handle empty strings', () => {
      expect(sanitizeUnicode('')).toBe('')
    })

    it('should handle Unicode characters', () => {
      const unicodeString = 'שלום עולם! Hello 世界!'
      expect(sanitizeUnicode(unicodeString)).toBe(unicodeString)
    })

    it('should handle special characters', () => {
      const specialChars = '!@#$%^&*()[]{}|;:,.<>?'
      expect(sanitizeUnicode(specialChars)).toBe(specialChars)
    })
  })
})