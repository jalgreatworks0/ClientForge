/**
 * Input Sanitization Security Tests
 * Tests for input sanitization utilities
 */

import {
  sanitizeHtml,
  sanitizePlainText,
  sanitizeEmail,
  sanitizePhone,
  sanitizeUrl,
  sanitizeFilename,
  sanitizeSqlLikePattern,
  sanitizeInteger,
  sanitizeFloat,
  sanitizeBoolean,
  sanitizeStringArray,
  sanitizeIdentifier,
  removeNullBytes,
} from '../../../backend/utils/sanitization/input-sanitizer'

describe('Input Sanitizer', () => {
  describe('sanitizeHtml', () => {
    it('should allow safe HTML tags', () => {
      const input = '<p>Hello <strong>world</strong>!</p>'
      const result = sanitizeHtml(input)
      expect(result).toContain('<p>')
      expect(result).toContain('<strong>')
    })

    it('should remove script tags', () => {
      const input = '<p>Hello</p><script>alert("XSS")</script>'
      const result = sanitizeHtml(input)
      expect(result).not.toContain('<script>')
      expect(result).not.toContain('alert')
    })

    it('should remove event handlers', () => {
      const input = '<p onclick="alert(1)">Click me</p>'
      const result = sanitizeHtml(input)
      expect(result).not.toContain('onclick')
    })

    it('should remove javascript: URLs', () => {
      const input = '<a href="javascript:alert(1)">Link</a>'
      const result = sanitizeHtml(input)
      expect(result).not.toContain('javascript:')
    })

    it('should handle empty input', () => {
      expect(sanitizeHtml('')).toBe('')
      expect(sanitizeHtml(null as any)).toBe('')
      expect(sanitizeHtml(undefined as any)).toBe('')
    })
  })

  describe('sanitizePlainText', () => {
    it('should strip all HTML tags', () => {
      const input = '<p>Hello <strong>world</strong>!</p>'
      const result = sanitizePlainText(input)
      expect(result).toBe('Hello world!')
      expect(result).not.toContain('<')
      expect(result).not.toContain('>')
    })

    it('should remove script content', () => {
      const input = '<script>alert("XSS")</script>Hello'
      const result = sanitizePlainText(input)
      expect(result).not.toContain('script')
      expect(result).not.toContain('alert')
    })
  })

  describe('sanitizeEmail', () => {
    it('should sanitize valid email addresses', () => {
      expect(sanitizeEmail('test@example.com')).toBe('test@example.com')
      expect(sanitizeEmail(' Test@Example.COM ')).toBe('test@example.com')
    })

    it('should reject invalid email formats', () => {
      expect(sanitizeEmail('not-an-email')).toBe('')
      expect(sanitizeEmail('test@')).toBe('')
      expect(sanitizeEmail('@example.com')).toBe('')
    })

    it('should remove dangerous characters', () => {
      const input = 'test<script>@example.com'
      const result = sanitizeEmail(input)
      expect(result).not.toContain('<')
      expect(result).not.toContain('>')
      expect(result).not.toContain('script')
    })

    it('should handle empty input', () => {
      expect(sanitizeEmail('')).toBe('')
      expect(sanitizeEmail(null as any)).toBe('')
    })
  })

  describe('sanitizePhone', () => {
    it('should allow valid phone characters', () => {
      expect(sanitizePhone('+1-234-567-8900')).toBe('+1-234-567-8900')
      expect(sanitizePhone('(555) 123-4567')).toBe('(555) 123-4567')
    })

    it('should remove letters and special characters', () => {
      const input = '+1abc-234-567-8900<script>'
      const result = sanitizePhone(input)
      expect(result).not.toContain('abc')
      expect(result).not.toContain('<')
      expect(result).not.toContain('script')
    })
  })

  describe('sanitizeUrl', () => {
    it('should allow valid HTTP/HTTPS URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com/')
      expect(sanitizeUrl('http://example.com/path')).toBe('http://example.com/path')
    })

    it('should block javascript: URLs', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe('')
    })

    it('should block data: URLs', () => {
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('')
    })

    it('should reject invalid URLs', () => {
      expect(sanitizeUrl('not a url')).toBe('')
      expect(sanitizeUrl('htp://broken')).toBe('')
    })

    it('should respect allowed protocols', () => {
      const result = sanitizeUrl('ftp://example.com', ['ftp'])
      expect(result).toBe('ftp://example.com/')
    })
  })

  describe('sanitizeFilename', () => {
    it('should allow safe filenames', () => {
      expect(sanitizeFilename('document.pdf')).toBe('document.pdf')
      expect(sanitizeFilename('my-file_2024.txt')).toBe('my-file_2024.txt')
    })

    it('should prevent directory traversal', () => {
      expect(sanitizeFilename('../../../etc/passwd')).not.toContain('..')
      expect(sanitizeFilename('/etc/passwd')).not.toContain('/')
      expect(sanitizeFilename('..\\windows\\system32')).not.toContain('\\')
    })

    it('should replace path separators', () => {
      const result = sanitizeFilename('path/to/file.txt')
      expect(result).not.toContain('/')
      expect(result).toBe('path_to_file.txt')
    })

    it('should handle empty or dangerous filenames', () => {
      expect(sanitizeFilename('')).toBe('file')
      expect(sanitizeFilename('.')).toBe('file')
      expect(sanitizeFilename('..')).toBe('file')
    })

    it('should limit filename length', () => {
      const longName = 'a'.repeat(300) + '.txt'
      const result = sanitizeFilename(longName)
      expect(result.length).toBeLessThanOrEqual(255)
      expect(result).toMatch(/\.txt$/)
    })
  })

  describe('sanitizeSqlLikePattern', () => {
    it('should escape SQL LIKE wildcards', () => {
      expect(sanitizeSqlLikePattern('test%')).toBe('test\\%')
      expect(sanitizeSqlLikePattern('test_value')).toBe('test\\_value')
      expect(sanitizeSqlLikePattern('100%_complete')).toBe('100\\%\\_complete')
    })

    it('should escape backslashes', () => {
      expect(sanitizeSqlLikePattern('test\\value')).toBe('test\\\\value')
    })
  })

  describe('sanitizeInteger', () => {
    it('should parse valid integers', () => {
      expect(sanitizeInteger('42')).toBe(42)
      expect(sanitizeInteger(42)).toBe(42)
      expect(sanitizeInteger('  123  ')).toBe(123)
    })

    it('should return default for invalid input', () => {
      expect(sanitizeInteger('abc', 0)).toBe(0)
      expect(sanitizeInteger('', 99)).toBe(99)
      expect(sanitizeInteger(null, -1)).toBe(-1)
    })

    it('should parse negative integers', () => {
      expect(sanitizeInteger('-42')).toBe(-42)
    })
  })

  describe('sanitizeFloat', () => {
    it('should parse valid floats', () => {
      expect(sanitizeFloat('42.5')).toBe(42.5)
      expect(sanitizeFloat(3.14)).toBe(3.14)
      expect(sanitizeFloat('  1.23  ')).toBe(1.23)
    })

    it('should return default for invalid input', () => {
      expect(sanitizeFloat('abc', 0.0)).toBe(0.0)
      expect(sanitizeFloat('', 1.5)).toBe(1.5)
    })
  })

  describe('sanitizeBoolean', () => {
    it('should parse boolean values', () => {
      expect(sanitizeBoolean(true)).toBe(true)
      expect(sanitizeBoolean(false)).toBe(false)
    })

    it('should parse string representations', () => {
      expect(sanitizeBoolean('true')).toBe(true)
      expect(sanitizeBoolean('TRUE')).toBe(true)
      expect(sanitizeBoolean('1')).toBe(true)
      expect(sanitizeBoolean('yes')).toBe(true)

      expect(sanitizeBoolean('false')).toBe(false)
      expect(sanitizeBoolean('FALSE')).toBe(false)
      expect(sanitizeBoolean('0')).toBe(false)
      expect(sanitizeBoolean('no')).toBe(false)
    })

    it('should parse numbers', () => {
      expect(sanitizeBoolean(1)).toBe(true)
      expect(sanitizeBoolean(0)).toBe(false)
      expect(sanitizeBoolean(42)).toBe(true)
    })

    it('should return default for invalid input', () => {
      expect(sanitizeBoolean('invalid', false)).toBe(false)
      expect(sanitizeBoolean('invalid', true)).toBe(true)
      expect(sanitizeBoolean(null, true)).toBe(true)
    })
  })

  describe('sanitizeStringArray', () => {
    it('should sanitize array of strings', () => {
      const input = ['<p>test</p>', '<script>alert(1)</script>', 'safe']
      const result = sanitizeStringArray(input)

      expect(result).toHaveLength(3)
      expect(result[0]).not.toContain('<p>')
      expect(result[1]).not.toContain('<script>')
      expect(result[2]).toBe('safe')
    })

    it('should filter out non-string values', () => {
      const input = ['test', 42, null, undefined, 'valid'] as any
      const result = sanitizeStringArray(input)

      expect(result).toHaveLength(2)
      expect(result).toEqual(['test', 'valid'])
    })

    it('should return empty array for invalid input', () => {
      expect(sanitizeStringArray(null as any)).toEqual([])
      expect(sanitizeStringArray('not an array' as any)).toEqual([])
    })
  })

  describe('sanitizeIdentifier', () => {
    it('should allow valid SQL identifiers', () => {
      expect(sanitizeIdentifier('table_name')).toBe('table_name')
      expect(sanitizeIdentifier('columnName123')).toBe('columnName123')
      expect(sanitizeIdentifier('_private')).toBe('_private')
    })

    it('should remove invalid characters', () => {
      expect(sanitizeIdentifier('table-name')).toBe('tablename')
      expect(sanitizeIdentifier('column.name')).toBe('columnname')
      expect(sanitizeIdentifier('table name')).toBe('tablename')
    })

    it('should reject identifiers starting with numbers', () => {
      expect(sanitizeIdentifier('123table')).toBe('')
    })

    it('should reject SQL injection attempts', () => {
      expect(sanitizeIdentifier('table; DROP TABLE users--')).toBe('tableDROPTABLEusers')
    })
  })

  describe('removeNullBytes', () => {
    it('should remove null bytes', () => {
      const input = 'test\0value'
      const result = removeNullBytes(input)
      expect(result).toBe('testvalue')
      expect(result).not.toContain('\0')
    })

    it('should handle multiple null bytes', () => {
      const input = 'a\0b\0c\0d'
      const result = removeNullBytes(input)
      expect(result).toBe('abcd')
    })

    it('should handle strings without null bytes', () => {
      expect(removeNullBytes('normal string')).toBe('normal string')
    })
  })
})
