import { describe, it, expect } from 'vitest'
import {
  validateFile,
  validateFiles,
  sanitizeFilename,
  MAX_FILE_SIZE,
  MAX_FILES_PER_UPLOAD,
  ALLOWED_FILE_TYPES,
  edipiSchema,
  emailSchema,
  nameSchema,
  subjectSchema,
  validateWithSchema,
  containsSqlInjection,
} from '../lib/validation'

// Helper to create a mock File object
function createMockFile(
  name: string,
  size: number,
  type: string
): File {
  const blob = new Blob(['x'.repeat(size)], { type })
  return new File([blob], name, { type })
}

describe('validateFile', () => {
  it('should accept valid PDF file', () => {
    const file = createMockFile('document.pdf', 1024, 'application/pdf')
    const result = validateFile(file)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should accept valid image file', () => {
    const file = createMockFile('image.png', 1024, 'image/png')
    const result = validateFile(file)
    expect(result.valid).toBe(true)
  })

  it('should reject file exceeding size limit', () => {
    const file = createMockFile('large.pdf', MAX_FILE_SIZE + 1, 'application/pdf')
    const result = validateFile(file)
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('too large')
  })

  it('should reject empty file', () => {
    const file = createMockFile('empty.pdf', 0, 'application/pdf')
    const result = validateFile(file)
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('empty')
  })

  it('should reject unsupported file type', () => {
    const file = createMockFile('script.exe', 1024, 'application/x-msdownload')
    const result = validateFile(file)
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('unsupported type')
  })

  it('should reject filename with path traversal', () => {
    const file = createMockFile('../../../etc/passwd', 1024, 'application/pdf')
    const result = validateFile(file)
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('invalid filename')
  })
})

describe('validateFiles', () => {
  it('should accept valid files within limit', () => {
    const files = [
      createMockFile('doc1.pdf', 1024, 'application/pdf'),
      createMockFile('doc2.pdf', 1024, 'application/pdf'),
    ]
    const result = validateFiles(files)
    expect(result.valid).toBe(true)
  })

  it('should reject empty file array', () => {
    const result = validateFiles([])
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('No files selected')
  })

  it('should reject too many files', () => {
    const files = Array.from({ length: MAX_FILES_PER_UPLOAD + 1 }, (_, i) =>
      createMockFile(`doc${i}.pdf`, 100, 'application/pdf')
    )
    const result = validateFiles(files)
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('Too many files')
  })

  it('should collect errors from multiple invalid files', () => {
    const files = [
      createMockFile('valid.pdf', 1024, 'application/pdf'),
      createMockFile('invalid.exe', 1024, 'application/x-msdownload'),
      createMockFile('empty.pdf', 0, 'application/pdf'),
    ]
    const result = validateFiles(files)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(1)
  })
})

describe('sanitizeFilename', () => {
  it('should keep valid characters', () => {
    expect(sanitizeFilename('document.pdf')).toBe('document.pdf')
    expect(sanitizeFilename('file-name_123.txt')).toBe('file-name_123.txt')
  })

  it('should replace spaces with hyphens', () => {
    expect(sanitizeFilename('my document.pdf')).toBe('my-document.pdf')
  })

  it('should replace special characters with hyphens', () => {
    expect(sanitizeFilename('file@#$%.pdf')).toBe('file-.pdf')
  })

  it('should collapse multiple hyphens', () => {
    expect(sanitizeFilename('file---name.pdf')).toBe('file-name.pdf')
  })

  it('should remove leading and trailing hyphens', () => {
    expect(sanitizeFilename('-file-.pdf')).toBe('file-.pdf')
  })

  it('should truncate long filenames', () => {
    const longName = 'a'.repeat(300) + '.pdf'
    const result = sanitizeFilename(longName)
    expect(result.length).toBeLessThanOrEqual(255)
  })
})

describe('edipiSchema', () => {
  it('should accept valid 10-digit EDIPI', () => {
    const result = edipiSchema.safeParse('1234567890')
    expect(result.success).toBe(true)
  })

  it('should accept empty string', () => {
    const result = edipiSchema.safeParse('')
    expect(result.success).toBe(true)
  })

  it('should reject non-numeric EDIPI', () => {
    const result = edipiSchema.safeParse('123456789a')
    expect(result.success).toBe(false)
  })

  it('should reject EDIPI with wrong length', () => {
    const result = edipiSchema.safeParse('123456789') // 9 digits
    expect(result.success).toBe(false)
  })
})

describe('emailSchema', () => {
  it('should accept valid email', () => {
    const result = emailSchema.safeParse('user@example.com')
    expect(result.success).toBe(true)
  })

  it('should accept military email', () => {
    const result = emailSchema.safeParse('john.doe@usmc.mil')
    expect(result.success).toBe(true)
  })

  it('should reject invalid email', () => {
    const result = emailSchema.safeParse('not-an-email')
    expect(result.success).toBe(false)
  })

  it('should reject email that is too long', () => {
    const result = emailSchema.safeParse('a'.repeat(250) + '@example.com')
    expect(result.success).toBe(false)
  })
})

describe('nameSchema', () => {
  it('should accept valid name', () => {
    const result = nameSchema.safeParse('John')
    expect(result.success).toBe(true)
  })

  it('should accept name with hyphen', () => {
    const result = nameSchema.safeParse("O'Brien-Smith")
    expect(result.success).toBe(true)
  })

  it('should reject empty name', () => {
    const result = nameSchema.safeParse('')
    expect(result.success).toBe(false)
  })

  it('should reject name with numbers', () => {
    const result = nameSchema.safeParse('John123')
    expect(result.success).toBe(false)
  })
})

describe('subjectSchema', () => {
  it('should accept valid subject', () => {
    const result = subjectSchema.safeParse('Request for Leave')
    expect(result.success).toBe(true)
  })

  it('should reject empty subject', () => {
    const result = subjectSchema.safeParse('')
    expect(result.success).toBe(false)
  })

  it('should reject subject that is too long', () => {
    const result = subjectSchema.safeParse('a'.repeat(501))
    expect(result.success).toBe(false)
  })
})

describe('validateWithSchema', () => {
  it('should return success with valid data', () => {
    const result = validateWithSchema(emailSchema, 'test@example.com')
    expect(result.success).toBe(true)
    expect(result.data).toBe('test@example.com')
  })

  it('should return errors with invalid data', () => {
    const result = validateWithSchema(emailSchema, 'not-valid')
    expect(result.success).toBe(false)
    expect(result.errors).toBeDefined()
  })
})

describe('containsSqlInjection', () => {
  it('should detect OR injection with quotes', () => {
    // Pattern: ('|")\s*(or|and)\s*('|")\s*=\s*('|")
    expect(containsSqlInjection("' or '=' ")).toBe(true)
    expect(containsSqlInjection('" and "="')).toBe(true)
  })

  it('should detect DROP TABLE', () => {
    expect(containsSqlInjection("; DROP TABLE users;")).toBe(true)
    expect(containsSqlInjection("; delete from users;")).toBe(true)
  })

  it('should detect UNION SELECT', () => {
    expect(containsSqlInjection("' UNION SELECT * FROM users")).toBe(true)
  })

  it('should detect comment termination', () => {
    expect(containsSqlInjection("admin'-- ")).toBe(true)
  })

  it('should allow normal text', () => {
    expect(containsSqlInjection("This is a normal request")).toBe(false)
  })

  it('should allow text with single quotes', () => {
    expect(containsSqlInjection("It's a valid request")).toBe(false)
  })
})
