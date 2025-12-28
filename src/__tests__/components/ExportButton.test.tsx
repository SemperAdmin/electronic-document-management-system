import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  ExportButton,
  generateCsv,
  generateJson,
  dateFormatter,
  dateTimeFormatter,
  booleanFormatter,
  arrayFormatter,
} from '../../components/common/ExportButton'
import type { ExportColumn } from '../../components/common/ExportButton'

// ============================================================================
// Utility Function Tests
// ============================================================================

describe('generateCsv', () => {
  interface TestItem {
    id: string
    name: string
    count: number
    active: boolean
  }

  const testItems: TestItem[] = [
    { id: '1', name: 'Item A', count: 10, active: true },
    { id: '2', name: 'Item B', count: 20, active: false },
    { id: '3', name: 'Item C', count: 30, active: true },
  ]

  const columns: ExportColumn<TestItem>[] = [
    { header: 'ID', getValue: (item) => item.id },
    { header: 'Name', getValue: (item) => item.name },
    { header: 'Count', getValue: (item) => item.count },
    { header: 'Active', getValue: (item) => item.active, format: booleanFormatter },
  ]

  it('should generate CSV with headers', () => {
    const csv = generateCsv(testItems, columns)
    const lines = csv.split('\r\n')
    // Headers are not quoted unless they contain special chars
    expect(lines[0]).toBe('ID,Name,Count,Active')
  })

  it('should generate CSV with data rows', () => {
    const csv = generateCsv(testItems, columns)
    const lines = csv.split('\r\n')
    expect(lines[1]).toBe('1,Item A,10,Yes')
    expect(lines[2]).toBe('2,Item B,20,No')
    expect(lines[3]).toBe('3,Item C,30,Yes')
  })

  it('should escape quotes in values', () => {
    const itemsWithQuotes: TestItem[] = [
      { id: '1', name: 'Item "Special"', count: 10, active: true },
    ]
    const csv = generateCsv(itemsWithQuotes, columns)
    expect(csv).toContain('"Item ""Special"""')
  })

  it('should handle empty items array', () => {
    const csv = generateCsv([], columns)
    const lines = csv.split('\r\n').filter(l => l)
    expect(lines).toHaveLength(1) // Just headers
    expect(lines[0]).toBe('ID,Name,Count,Active')
  })

  it('should handle null and undefined values', () => {
    const columnsWithNull: ExportColumn<TestItem>[] = [
      { header: 'ID', getValue: () => null },
      { header: 'Name', getValue: () => undefined },
    ]
    const csv = generateCsv(testItems.slice(0, 1), columnsWithNull)
    const lines = csv.split('\r\n')
    expect(lines[1]).toBe(',')
  })

  it('should apply custom formatters', () => {
    const columnsWithFormat: ExportColumn<TestItem>[] = [
      { header: 'ID', getValue: (item) => item.id },
      { header: 'Count', getValue: (item) => item.count, format: (v) => `#${v}` },
    ]
    const csv = generateCsv(testItems.slice(0, 1), columnsWithFormat)
    expect(csv).toContain('#10')
  })
})

describe('generateJson', () => {
  interface TestItem {
    id: string
    name: string
    value: number
  }

  const testItems: TestItem[] = [
    { id: '1', name: 'Item A', value: 100 },
    { id: '2', name: 'Item B', value: 200 },
  ]

  const columns: ExportColumn<TestItem>[] = [
    { header: 'ID', getValue: (item) => item.id },
    { header: 'Name', getValue: (item) => item.name },
    { header: 'Value', getValue: (item) => item.value },
  ]

  it('should generate valid JSON', () => {
    const json = generateJson(testItems, columns)
    expect(() => JSON.parse(json)).not.toThrow()
  })

  it('should use column headers as keys', () => {
    const json = generateJson(testItems, columns)
    const parsed = JSON.parse(json)
    expect(parsed[0]).toHaveProperty('ID')
    expect(parsed[0]).toHaveProperty('Name')
    expect(parsed[0]).toHaveProperty('Value')
  })

  it('should include all items', () => {
    const json = generateJson(testItems, columns)
    const parsed = JSON.parse(json)
    expect(parsed).toHaveLength(2)
  })

  it('should apply formatters to values', () => {
    const columnsWithFormat: ExportColumn<TestItem>[] = [
      { header: 'ID', getValue: (item) => item.id },
      { header: 'Value', getValue: (item) => item.value, format: (v) => `$${v}` },
    ]
    const json = generateJson(testItems.slice(0, 1), columnsWithFormat)
    const parsed = JSON.parse(json)
    expect(parsed[0].Value).toBe('$100')
  })

  it('should handle empty items array', () => {
    const json = generateJson([], columns)
    const parsed = JSON.parse(json)
    expect(parsed).toEqual([])
  })

  it('should be formatted with indentation', () => {
    const json = generateJson(testItems, columns)
    expect(json).toContain('\n')
    expect(json).toContain('  ')
  })
})

// ============================================================================
// Formatter Tests
// ============================================================================

describe('Formatters', () => {
  describe('dateFormatter', () => {
    it('should format ISO date string', () => {
      const result = dateFormatter('2024-06-15T12:30:00Z')
      // Should include date part
      expect(result).toMatch(/2024|6|15/)
    })

    it('should format Date object', () => {
      const date = new Date('2024-06-15')
      const result = dateFormatter(date)
      expect(result).toMatch(/2024|6|15/)
    })

    it('should return empty string for null', () => {
      expect(dateFormatter(null)).toBe('')
    })

    it('should return empty string for undefined', () => {
      expect(dateFormatter(undefined)).toBe('')
    })

    it('should return empty string for empty string', () => {
      expect(dateFormatter('')).toBe('')
    })

    it('should return empty string for invalid date', () => {
      expect(dateFormatter('not-a-date')).toBe('')
    })
  })

  describe('dateTimeFormatter', () => {
    it('should format ISO date string with time', () => {
      const result = dateTimeFormatter('2024-06-15T14:30:00Z')
      expect(result).toMatch(/2024|6|15/)
    })

    it('should return empty string for invalid values', () => {
      expect(dateTimeFormatter(null)).toBe('')
      expect(dateTimeFormatter(undefined)).toBe('')
      expect(dateTimeFormatter('')).toBe('')
    })
  })

  describe('booleanFormatter', () => {
    it('should return "Yes" for true', () => {
      expect(booleanFormatter(true)).toBe('Yes')
    })

    it('should return "No" for false', () => {
      expect(booleanFormatter(false)).toBe('No')
    })

    it('should return "No" for falsy values', () => {
      expect(booleanFormatter(null)).toBe('No')
      expect(booleanFormatter(undefined)).toBe('No')
      expect(booleanFormatter(0)).toBe('No')
      expect(booleanFormatter('')).toBe('No')
    })

    it('should return "Yes" for truthy values', () => {
      expect(booleanFormatter(1)).toBe('Yes')
      expect(booleanFormatter('true')).toBe('Yes')
      expect(booleanFormatter({})).toBe('Yes')
    })
  })

  describe('arrayFormatter', () => {
    it('should join array with commas', () => {
      expect(arrayFormatter(['a', 'b', 'c'])).toBe('a, b, c')
    })

    it('should handle single item array', () => {
      expect(arrayFormatter(['only'])).toBe('only')
    })

    it('should handle empty array', () => {
      expect(arrayFormatter([])).toBe('')
    })

    it('should return empty string for non-array', () => {
      expect(arrayFormatter(null)).toBe('')
      expect(arrayFormatter(undefined)).toBe('')
      expect(arrayFormatter('string' as any)).toBe('')
    })

    it('should include all values with simple join', () => {
      // The actual implementation uses simple join
      expect(arrayFormatter(['a', '', 'b'])).toBe('a, , b')
    })
  })
})

// ============================================================================
// ExportButton Component Tests
// ============================================================================

describe('ExportButton', () => {
  interface TestItem {
    id: string
    name: string
  }

  const testItems: TestItem[] = [
    { id: '1', name: 'Item A' },
    { id: '2', name: 'Item B' },
  ]

  const columns: ExportColumn<TestItem>[] = [
    { header: 'ID', getValue: (item) => item.id },
    { header: 'Name', getValue: (item) => item.name },
  ]

  const defaultProps = {
    items: testItems,
    columns,
    filename: 'export',
  }

  let createObjectURLSpy: ReturnType<typeof vi.spyOn>
  let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  })

  afterEach(() => {
    createObjectURLSpy.mockRestore()
    revokeObjectURLSpy.mockRestore()
  })

  describe('Rendering', () => {
    it('should render export button', () => {
      render(<ExportButton {...defaultProps} />)
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('should display default label', () => {
      render(<ExportButton {...defaultProps} />)
      expect(screen.getByText('Export')).toBeInTheDocument()
    })

    it('should display custom label', () => {
      render(<ExportButton {...defaultProps} label="Download Data" />)
      expect(screen.getByText('Download Data')).toBeInTheDocument()
    })

    it('should show item count when showCount is true', () => {
      render(<ExportButton {...defaultProps} />)
      // The count is shown in parentheses
      expect(screen.getByText('(2)')).toBeInTheDocument()
    })

    it('should show singular count for one item', () => {
      render(<ExportButton {...defaultProps} items={[testItems[0]]} />)
      expect(screen.getByText('(1)')).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      const { container } = render(<ExportButton {...defaultProps} className="custom-class" />)
      expect(container.querySelector('.custom-class')).toBeInTheDocument()
    })

    it('should be disabled when no items', () => {
      render(<ExportButton {...defaultProps} items={[]} />)
      expect(screen.getByRole('button')).toBeDisabled()
    })

    it('should be disabled when disabled prop is true', () => {
      render(<ExportButton {...defaultProps} disabled />)
      expect(screen.getByRole('button')).toBeDisabled()
    })
  })

  describe('Single Format (default CSV)', () => {
    it('should trigger download on click with single format', async () => {
      const user = userEvent.setup()
      render(<ExportButton {...defaultProps} />)

      await user.click(screen.getByRole('button'))

      // Wait for the async export
      await vi.waitFor(() => {
        expect(createObjectURLSpy).toHaveBeenCalled()
      }, { timeout: 500 })
    })
  })

  describe('Multiple Formats', () => {
    it('should show dropdown with multiple formats', async () => {
      const user = userEvent.setup()
      render(<ExportButton {...defaultProps} formats={['csv', 'json']} />)

      await user.click(screen.getByRole('button'))

      expect(screen.getByText('Export as CSV')).toBeInTheDocument()
      expect(screen.getByText('Export as JSON')).toBeInTheDocument()
    })

    it('should trigger CSV download from dropdown', async () => {
      const user = userEvent.setup()
      render(<ExportButton {...defaultProps} formats={['csv', 'json']} />)

      await user.click(screen.getByRole('button'))
      await user.click(screen.getByText('Export as CSV'))

      await vi.waitFor(() => {
        expect(createObjectURLSpy).toHaveBeenCalled()
      }, { timeout: 500 })
    })

    it('should trigger JSON download from dropdown', async () => {
      const user = userEvent.setup()
      render(<ExportButton {...defaultProps} formats={['csv', 'json']} />)

      await user.click(screen.getByRole('button'))
      await user.click(screen.getByText('Export as JSON'))

      await vi.waitFor(() => {
        expect(createObjectURLSpy).toHaveBeenCalled()
      }, { timeout: 500 })
    })
  })
})
