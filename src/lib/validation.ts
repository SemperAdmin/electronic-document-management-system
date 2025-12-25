import { z } from 'zod'

// ============================================================================
// File Upload Validation
// ============================================================================

/** Allowed file types for document uploads */
export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const

/** Human-readable file type names */
export const FILE_TYPE_LABELS: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/msword': 'Word Document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
  'application/vnd.ms-excel': 'Excel Spreadsheet',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel Spreadsheet',
  'application/vnd.ms-powerpoint': 'PowerPoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint',
  'text/plain': 'Text File',
  'text/csv': 'CSV File',
  'image/jpeg': 'JPEG Image',
  'image/png': 'PNG Image',
  'image/gif': 'GIF Image',
  'image/webp': 'WebP Image',
}

/** Maximum file size in bytes (25 MB) */
export const MAX_FILE_SIZE = 25 * 1024 * 1024

/** Maximum number of files per upload */
export const MAX_FILES_PER_UPLOAD = 10

/** File validation result */
export interface FileValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Validates a single file for upload
 */
export function validateFile(file: File): FileValidationResult {
  const errors: string[] = []

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2)
    const maxMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)
    errors.push(`File "${file.name}" is too large (${sizeMB} MB). Maximum size is ${maxMB} MB.`)
  }

  // Check file size is not zero
  if (file.size === 0) {
    errors.push(`File "${file.name}" is empty.`)
  }

  // Check file type
  if (!ALLOWED_FILE_TYPES.includes(file.type as typeof ALLOWED_FILE_TYPES[number])) {
    const allowedLabels = [...new Set(Object.values(FILE_TYPE_LABELS))]
    errors.push(`File "${file.name}" has an unsupported type. Allowed types: ${allowedLabels.join(', ')}.`)
  }

  // Check filename for potentially dangerous patterns
  const dangerousPatterns = [
    /\.\./,           // Path traversal
    /[<>:"|?*]/,      // Invalid Windows characters
    /[\x00-\x1f]/,    // Control characters
  ]
  for (const pattern of dangerousPatterns) {
    if (pattern.test(file.name)) {
      errors.push(`File "${file.name}" has an invalid filename.`)
      break
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validates multiple files for upload
 */
export function validateFiles(files: File[]): FileValidationResult {
  const errors: string[] = []

  // Check file count
  if (files.length === 0) {
    errors.push('No files selected.')
    return { valid: false, errors }
  }

  if (files.length > MAX_FILES_PER_UPLOAD) {
    errors.push(`Too many files. Maximum ${MAX_FILES_PER_UPLOAD} files per upload.`)
  }

  // Validate each file
  for (const file of files) {
    const result = validateFile(file)
    errors.push(...result.errors)
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Sanitizes a filename for safe storage
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^A-Za-z0-9._-]/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 255) // Limit length
}

// ============================================================================
// Form Input Validation Schemas
// ============================================================================

/** EDIPI validation (10-digit DoD ID number) */
export const edipiSchema = z
  .string()
  .regex(/^\d{10}$/, 'EDIPI must be a 10-digit number')
  .optional()
  .or(z.literal(''))

/** Email validation */
export const emailSchema = z
  .string()
  .email('Invalid email address')
  .max(255, 'Email is too long')

/** Name field validation */
export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name is too long')
  .regex(/^[A-Za-z\s'-]+$/, 'Name contains invalid characters')

/** Subject field validation */
export const subjectSchema = z
  .string()
  .min(1, 'Subject is required')
  .max(500, 'Subject is too long')

/** Notes field validation */
export const notesSchema = z
  .string()
  .max(5000, 'Notes are too long')
  .optional()

/** Request form validation schema */
export const requestFormSchema = z.object({
  subject: subjectSchema,
  dueDate: z.string().optional(),
  notes: notesSchema,
})

/** User profile form validation schema */
export const userProfileSchema = z.object({
  email: emailSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  mi: z.string().max(1, 'Middle initial should be one character').optional(),
  rank: z.string().min(1, 'Rank is required'),
  service: z.string().min(1, 'Service is required'),
  edipi: edipiSchema,
})

// ============================================================================
// Validation Helper Functions
// ============================================================================

export type ValidationErrors<T> = Partial<Record<keyof T, string>>

/**
 * Validates data against a Zod schema and returns field-level errors
 */
export function validateWithSchema<T extends z.ZodType>(
  schema: T,
  data: unknown
): { success: boolean; data?: z.infer<T>; errors?: ValidationErrors<z.infer<T>> } {
  const result = schema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data }
  }

  const errors: ValidationErrors<z.infer<T>> = {}
  for (const issue of result.error.issues) {
    const path = issue.path[0] as keyof z.infer<T>
    if (!errors[path]) {
      errors[path] = issue.message
    }
  }

  return { success: false, errors }
}

/**
 * Simple string sanitization to prevent XSS
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

/**
 * Validates that a string doesn't contain SQL injection patterns
 * Note: This is a defense-in-depth measure; always use parameterized queries
 */
export function containsSqlInjection(input: string): boolean {
  const patterns = [
    /('|")\s*(or|and)\s*('|")\s*=\s*('|")/i,
    /;\s*(drop|delete|update|insert|alter)\s+/i,
    /union\s+select/i,
    /--\s*$/,
  ]
  return patterns.some(pattern => pattern.test(input))
}
