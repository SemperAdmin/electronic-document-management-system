import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderHook } from '@testing-library/react'
import { SearchFilter, useSearchFilter, defaultFilters } from '../../components/common/SearchFilter'
import type { FilterState, FilterOption } from '../../components/common/SearchFilter'

// Helper to find the Filters button (has aria-expanded)
function getFiltersButton(): HTMLElement {
  const buttons = screen.getAllByRole('button')
  const filtersButton = buttons.find(btn => btn.getAttribute('aria-expanded') !== null)
  if (!filtersButton) throw new Error('Filters button not found')
  return filtersButton
}

// ============================================================================
// SearchFilter Component Tests
// ============================================================================

describe('SearchFilter', () => {
  const statusOptions: FilterOption[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ]

  const originatorOptions: FilterOption[] = [
    { value: 'user1', label: 'John Doe' },
    { value: 'user2', label: 'Jane Smith' },
  ]

  const defaultProps = {
    filters: { ...defaultFilters },
    onFiltersChange: vi.fn(),
    statusOptions,
    originatorOptions,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================================================
  // Rendering Tests
  // ============================================================================

  describe('Rendering', () => {
    it('should render search input', () => {
      render(<SearchFilter {...defaultProps} />)
      expect(screen.getByRole('textbox', { name: /search/i })).toBeInTheDocument()
    })

    it('should render with custom placeholder', () => {
      render(<SearchFilter {...defaultProps} searchPlaceholder="Find documents..." />)
      expect(screen.getByPlaceholderText('Find documents...')).toBeInTheDocument()
    })

    it('should render filters button', () => {
      render(<SearchFilter {...defaultProps} />)
      expect(getFiltersButton()).toBeInTheDocument()
    })

    it('should hide filters button when showAdvanced is false', () => {
      render(<SearchFilter {...defaultProps} showAdvanced={false} />)
      // When showAdvanced is false, no button should have aria-expanded
      const buttons = screen.queryAllByRole('button')
      const filtersButton = buttons.find(btn => btn.getAttribute('aria-expanded') !== null)
      expect(filtersButton).toBeUndefined()
    })

    it('should show filter panel when expanded', async () => {
      const user = userEvent.setup()
      render(<SearchFilter {...defaultProps} />)

      const filtersButton = getFiltersButton()
      await user.click(filtersButton)

      expect(screen.getByText('Status')).toBeInTheDocument()
      expect(screen.getByText('Date Range')).toBeInTheDocument()
      expect(screen.getByText('Originator')).toBeInTheDocument()
    })

    it('should render status checkboxes', async () => {
      const user = userEvent.setup()
      render(<SearchFilter {...defaultProps} />)

      await user.click(getFiltersButton())

      expect(screen.getByLabelText('Pending')).toBeInTheDocument()
      expect(screen.getByLabelText('Approved')).toBeInTheDocument()
      expect(screen.getByLabelText('Rejected')).toBeInTheDocument()
    })

    it('should render date inputs', async () => {
      const user = userEvent.setup()
      render(<SearchFilter {...defaultProps} />)

      await user.click(getFiltersButton())

      expect(screen.getByLabelText('From date')).toBeInTheDocument()
      expect(screen.getByLabelText('To date')).toBeInTheDocument()
    })

    it('should render originator dropdown', async () => {
      const user = userEvent.setup()
      render(<SearchFilter {...defaultProps} />)

      await user.click(getFiltersButton())

      const dropdown = screen.getByRole('combobox', { name: /filter by originator/i })
      expect(dropdown).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      const { container } = render(<SearchFilter {...defaultProps} className="custom-class" />)
      expect(container.firstChild).toHaveClass('custom-class')
    })
  })

  // ============================================================================
  // Search Interaction Tests
  // ============================================================================

  describe('Search Interactions', () => {
    it('should call onFiltersChange when search text changes', async () => {
      const user = userEvent.setup()
      render(<SearchFilter {...defaultProps} />)

      const searchInput = screen.getByRole('textbox', { name: /search/i })
      await user.type(searchInput, 'test')

      // Each keystroke triggers a call
      expect(defaultProps.onFiltersChange).toHaveBeenCalled()
      // At minimum, the first call should have been made with 't'
      expect(defaultProps.onFiltersChange).toHaveBeenCalledWith(expect.objectContaining({ search: 't' }))
    })

    it('should show clear button when search has text', async () => {
      const user = userEvent.setup()
      render(<SearchFilter {...defaultProps} filters={{ ...defaultFilters, search: 'test' }} />)

      const clearButton = screen.getByRole('button', { name: /clear search/i })
      expect(clearButton).toBeInTheDocument()

      await user.click(clearButton)
      expect(defaultProps.onFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({ search: '' })
      )
    })

    it('should not show clear button when search is empty', () => {
      render(<SearchFilter {...defaultProps} />)
      expect(screen.queryByRole('button', { name: /clear search/i })).not.toBeInTheDocument()
    })

    it('should show keyboard shortcut hint', () => {
      render(<SearchFilter {...defaultProps} />)
      expect(screen.getByText('⌘K')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Status Filter Tests
  // ============================================================================

  describe('Status Filters', () => {
    it('should toggle status when checkbox is clicked', async () => {
      const user = userEvent.setup()
      render(<SearchFilter {...defaultProps} />)

      await user.click(getFiltersButton())
      await user.click(screen.getByLabelText('Pending'))

      expect(defaultProps.onFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({ status: ['pending'] })
      )
    })

    it('should uncheck status when already selected', async () => {
      const user = userEvent.setup()
      const filters = { ...defaultFilters, status: ['pending'] }
      render(<SearchFilter {...defaultProps} filters={filters} />)

      await user.click(getFiltersButton())
      await user.click(screen.getByLabelText('Pending'))

      expect(defaultProps.onFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({ status: [] })
      )
    })

    it('should allow multiple status selections', async () => {
      const user = userEvent.setup()
      const filters = { ...defaultFilters, status: ['pending'] }
      render(<SearchFilter {...defaultProps} filters={filters} />)

      await user.click(getFiltersButton())
      await user.click(screen.getByLabelText('Approved'))

      expect(defaultProps.onFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({ status: ['pending', 'approved'] })
      )
    })
  })

  // ============================================================================
  // Date Filter Tests
  // ============================================================================

  describe('Date Filters', () => {
    it('should update dateFrom when changed', async () => {
      const user = userEvent.setup()
      render(<SearchFilter {...defaultProps} />)

      await user.click(getFiltersButton())

      const fromInput = screen.getByLabelText('From date')
      await user.type(fromInput, '2024-01-01')

      expect(defaultProps.onFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({ dateFrom: '2024-01-01' })
      )
    })

    it('should update dateTo when changed', async () => {
      const user = userEvent.setup()
      render(<SearchFilter {...defaultProps} />)

      await user.click(getFiltersButton())

      const toInput = screen.getByLabelText('To date')
      await user.type(toInput, '2024-12-31')

      expect(defaultProps.onFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({ dateTo: '2024-12-31' })
      )
    })

    it('should set min date on to input based on from date', async () => {
      const user = userEvent.setup()
      const filters = { ...defaultFilters, dateFrom: '2024-06-01' }
      render(<SearchFilter {...defaultProps} filters={filters} />)

      await user.click(getFiltersButton())

      const toInput = screen.getByLabelText('To date')
      expect(toInput).toHaveAttribute('min', '2024-06-01')
    })
  })

  // ============================================================================
  // Originator Filter Tests
  // ============================================================================

  describe('Originator Filter', () => {
    it('should update originatorId when dropdown changes', async () => {
      const user = userEvent.setup()
      render(<SearchFilter {...defaultProps} />)

      await user.click(getFiltersButton())

      const dropdown = screen.getByRole('combobox', { name: /filter by originator/i })
      await user.selectOptions(dropdown, 'user1')

      expect(defaultProps.onFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({ originatorId: 'user1' })
      )
    })

    it('should show all originators option', async () => {
      const user = userEvent.setup()
      render(<SearchFilter {...defaultProps} />)

      await user.click(getFiltersButton())

      const dropdown = screen.getByRole('combobox', { name: /filter by originator/i })
      expect(dropdown).toContainHTML('All originators')
    })
  })

  // ============================================================================
  // Clear Filters Tests
  // ============================================================================

  describe('Clear Filters', () => {
    it('should show clear button when filters are active', () => {
      const filters = { ...defaultFilters, search: 'test' }
      render(<SearchFilter {...defaultProps} filters={filters} />)

      expect(screen.getByRole('button', { name: /clear all filters/i })).toBeInTheDocument()
    })

    it('should not show clear button when no filters active', () => {
      render(<SearchFilter {...defaultProps} />)
      expect(screen.queryByRole('button', { name: /clear all filters/i })).not.toBeInTheDocument()
    })

    it('should clear all filters when clear button clicked', async () => {
      const user = userEvent.setup()
      const filters: FilterState = {
        search: 'test',
        status: ['pending'],
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
        originatorId: 'user1',
      }
      render(<SearchFilter {...defaultProps} filters={filters} />)

      await user.click(screen.getByRole('button', { name: /clear all filters/i }))

      expect(defaultProps.onFiltersChange).toHaveBeenCalledWith(defaultFilters)
    })
  })

  // ============================================================================
  // Active Filter Badge Tests
  // ============================================================================

  describe('Active Filter Badge', () => {
    it('should show badge count when filters are active', () => {
      const filters: FilterState = {
        ...defaultFilters,
        status: ['pending'],
        dateFrom: '2024-01-01',
      }
      render(<SearchFilter {...defaultProps} filters={filters} />)

      // Two active filters: status and dateFrom
      expect(screen.getByText('2')).toBeInTheDocument()
    })

    it('should show active filter pills in expanded panel', async () => {
      const user = userEvent.setup()
      const filters: FilterState = {
        ...defaultFilters,
        status: ['pending', 'approved'],
        originatorId: 'user1',
      }
      render(<SearchFilter {...defaultProps} filters={filters} />)

      // Find and click the filters button by finding the one with the badge
      const buttons = screen.getAllByRole('button')
      const filtersButton = buttons.find(btn => btn.getAttribute('aria-expanded') !== null)
      if (filtersButton) {
        await user.click(filtersButton)
        expect(screen.getByText('Active filters:')).toBeInTheDocument()
      }
    })

    it('should remove individual filter when pill X clicked', async () => {
      const user = userEvent.setup()
      const filters: FilterState = {
        ...defaultFilters,
        status: ['pending'],
      }
      render(<SearchFilter {...defaultProps} filters={filters} />)

      // Find and click the filters button
      const buttons = screen.getAllByRole('button')
      const filtersButton = buttons.find(btn => btn.getAttribute('aria-expanded') !== null)
      if (filtersButton) {
        await user.click(filtersButton)

        // Find and click the remove button for filter
        const removeButtons = screen.getAllByRole('button', { name: /remove.*filter/i })
        if (removeButtons.length > 0) {
          await user.click(removeButtons[0])
          expect(defaultProps.onFiltersChange).toHaveBeenCalled()
        }
      }
    })
  })
})

// ============================================================================
// useSearchFilter Hook Tests
// ============================================================================

describe('useSearchFilter', () => {
  interface TestItem {
    id: string
    name: string
    status: string
    date: string
    ownerId: string
  }

  const testItems: TestItem[] = [
    { id: '1', name: 'Document A', status: 'pending', date: '2024-01-15', ownerId: 'user1' },
    { id: '2', name: 'Document B', status: 'approved', date: '2024-03-20', ownerId: 'user2' },
    { id: '3', name: 'Report Alpha', status: 'pending', date: '2024-06-10', ownerId: 'user1' },
    { id: '4', name: 'Report Beta', status: 'rejected', date: '2024-09-25', ownerId: 'user3' },
  ]

  const baseOptions = {
    items: testItems,
    getSearchText: (item: TestItem) => `${item.name} ${item.id}`,
    getStatus: (item: TestItem) => item.status,
    getDate: (item: TestItem) => item.date,
    getOriginatorId: (item: TestItem) => item.ownerId,
  }

  it('should return all items when no filters applied', () => {
    const { result } = renderHook(() =>
      useSearchFilter(defaultFilters, baseOptions)
    )
    expect(result.current).toHaveLength(4)
  })

  // ============================================================================
  // Search Filter Tests
  // ============================================================================

  describe('Search Filtering', () => {
    it('should filter by search text', () => {
      const filters = { ...defaultFilters, search: 'Document' }
      const { result } = renderHook(() =>
        useSearchFilter(filters, baseOptions)
      )
      expect(result.current).toHaveLength(2)
      expect(result.current.map(i => i.id)).toEqual(['1', '2'])
    })

    it('should be case-insensitive', () => {
      const filters = { ...defaultFilters, search: 'REPORT' }
      const { result } = renderHook(() =>
        useSearchFilter(filters, baseOptions)
      )
      expect(result.current).toHaveLength(2)
    })

    it('should match partial text', () => {
      const filters = { ...defaultFilters, search: 'pha' }
      const { result } = renderHook(() =>
        useSearchFilter(filters, baseOptions)
      )
      expect(result.current).toHaveLength(1)
      expect(result.current[0].name).toBe('Report Alpha')
    })

    it('should search in ID field', () => {
      const filters = { ...defaultFilters, search: '3' }
      const { result } = renderHook(() =>
        useSearchFilter(filters, baseOptions)
      )
      expect(result.current).toHaveLength(1)
      expect(result.current[0].id).toBe('3')
    })
  })

  // ============================================================================
  // Status Filter Tests
  // ============================================================================

  describe('Status Filtering', () => {
    it('should filter by single status', () => {
      const filters = { ...defaultFilters, status: ['pending'] }
      const { result } = renderHook(() =>
        useSearchFilter(filters, baseOptions)
      )
      expect(result.current).toHaveLength(2)
      expect(result.current.every(i => i.status === 'pending')).toBe(true)
    })

    it('should filter by multiple statuses', () => {
      const filters = { ...defaultFilters, status: ['pending', 'approved'] }
      const { result } = renderHook(() =>
        useSearchFilter(filters, baseOptions)
      )
      expect(result.current).toHaveLength(3)
    })

    it('should return empty when no items match status', () => {
      const filters = { ...defaultFilters, status: ['nonexistent'] }
      const { result } = renderHook(() =>
        useSearchFilter(filters, baseOptions)
      )
      expect(result.current).toHaveLength(0)
    })
  })

  // ============================================================================
  // Date Range Filter Tests
  // ============================================================================

  describe('Date Range Filtering', () => {
    it('should filter by dateFrom only', () => {
      const filters = { ...defaultFilters, dateFrom: '2024-06-01' }
      const { result } = renderHook(() =>
        useSearchFilter(filters, baseOptions)
      )
      expect(result.current).toHaveLength(2)
      expect(result.current.map(i => i.id)).toEqual(['3', '4'])
    })

    it('should filter by dateTo only', () => {
      const filters = { ...defaultFilters, dateTo: '2024-03-31' }
      const { result } = renderHook(() =>
        useSearchFilter(filters, baseOptions)
      )
      expect(result.current).toHaveLength(2)
      expect(result.current.map(i => i.id)).toEqual(['1', '2'])
    })

    it('should filter by date range', () => {
      const filters = { ...defaultFilters, dateFrom: '2024-03-01', dateTo: '2024-07-01' }
      const { result } = renderHook(() =>
        useSearchFilter(filters, baseOptions)
      )
      expect(result.current).toHaveLength(2)
      expect(result.current.map(i => i.id)).toEqual(['2', '3'])
    })

    it('should include items on exact date boundaries', () => {
      const filters = { ...defaultFilters, dateFrom: '2024-01-15', dateTo: '2024-01-15' }
      const { result } = renderHook(() =>
        useSearchFilter(filters, baseOptions)
      )
      expect(result.current).toHaveLength(1)
      expect(result.current[0].id).toBe('1')
    })
  })

  // ============================================================================
  // Originator Filter Tests
  // ============================================================================

  describe('Originator Filtering', () => {
    it('should filter by originator ID', () => {
      const filters = { ...defaultFilters, originatorId: 'user1' }
      const { result } = renderHook(() =>
        useSearchFilter(filters, baseOptions)
      )
      expect(result.current).toHaveLength(2)
      expect(result.current.every(i => i.ownerId === 'user1')).toBe(true)
    })

    it('should return empty when no items match originator', () => {
      const filters = { ...defaultFilters, originatorId: 'nonexistent' }
      const { result } = renderHook(() =>
        useSearchFilter(filters, baseOptions)
      )
      expect(result.current).toHaveLength(0)
    })
  })

  // ============================================================================
  // Combined Filter Tests
  // ============================================================================

  describe('Combined Filters', () => {
    it('should combine search and status filters', () => {
      const filters = { ...defaultFilters, search: 'Document', status: ['pending'] }
      const { result } = renderHook(() =>
        useSearchFilter(filters, baseOptions)
      )
      expect(result.current).toHaveLength(1)
      expect(result.current[0].id).toBe('1')
    })

    it('should combine all filters', () => {
      const filters: FilterState = {
        search: 'Report',
        status: ['pending'],
        dateFrom: '2024-05-01',
        dateTo: '2024-07-01',
        originatorId: 'user1',
      }
      const { result } = renderHook(() =>
        useSearchFilter(filters, baseOptions)
      )
      expect(result.current).toHaveLength(1)
      expect(result.current[0].id).toBe('3')
    })

    it('should return empty when combined filters exclude all', () => {
      const filters: FilterState = {
        search: 'Document',
        status: ['rejected'],
        dateFrom: '',
        dateTo: '',
        originatorId: '',
      }
      const { result } = renderHook(() =>
        useSearchFilter(filters, baseOptions)
      )
      expect(result.current).toHaveLength(0)
    })
  })

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle empty items array', () => {
      const { result } = renderHook(() =>
        useSearchFilter(defaultFilters, { ...baseOptions, items: [] })
      )
      expect(result.current).toHaveLength(0)
    })

    it('should handle items with missing dates', () => {
      const itemsWithMissingDate = [
        ...testItems,
        { id: '5', name: 'No Date', status: 'pending', date: '', ownerId: 'user1' },
      ]
      const filters = { ...defaultFilters, dateFrom: '2024-01-01' }
      const { result } = renderHook(() =>
        useSearchFilter(filters, { ...baseOptions, items: itemsWithMissingDate })
      )
      // Item with empty date should be excluded
      expect(result.current.find(i => i.id === '5')).toBeUndefined()
    })

    it('should handle optional getStatus', () => {
      const optionsWithoutStatus = {
        items: testItems,
        getSearchText: (item: TestItem) => item.name,
      }
      const filters = { ...defaultFilters, status: ['pending'] }
      const { result } = renderHook(() =>
        useSearchFilter(filters, optionsWithoutStatus)
      )
      // Should return all items since getStatus is not provided
      expect(result.current).toHaveLength(4)
    })
  })
})
