import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePagination } from '../../hooks/usePagination'

describe('usePagination Hook', () => {
  // Sample data for testing
  const createTestData = (count: number) =>
    Array.from({ length: count }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }))

  // ============================================================================
  // Initialization Tests
  // ============================================================================

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const data = createTestData(100)
      const { result } = renderHook(() => usePagination(data))

      expect(result.current.currentPage).toBe(1)
      expect(result.current.pageSize).toBe(25)
      expect(result.current.totalItems).toBe(100)
      expect(result.current.totalPages).toBe(4)
    })

    it('should use custom initial page size', () => {
      const data = createTestData(100)
      const { result } = renderHook(() => usePagination(data, { pageSize: 10 }))

      expect(result.current.pageSize).toBe(10)
      expect(result.current.totalPages).toBe(10)
    })

    it('should use custom initial page', () => {
      const data = createTestData(100)
      const { result } = renderHook(() => usePagination(data, { initialPage: 3 }))

      expect(result.current.currentPage).toBe(3)
    })

    it('should handle empty data array', () => {
      const { result } = renderHook(() => usePagination([]))

      expect(result.current.totalItems).toBe(0)
      expect(result.current.totalPages).toBe(0)
      expect(result.current.currentData).toEqual([])
    })
  })

  // ============================================================================
  // Current Data Tests
  // ============================================================================

  describe('currentData', () => {
    it('should return correct slice for first page', () => {
      const data = createTestData(50)
      const { result } = renderHook(() => usePagination(data, { pageSize: 10 }))

      expect(result.current.currentData).toHaveLength(10)
      expect(result.current.currentData[0].id).toBe(1)
      expect(result.current.currentData[9].id).toBe(10)
    })

    it('should return correct slice for middle page', () => {
      const data = createTestData(50)
      const { result } = renderHook(() => usePagination(data, { pageSize: 10, initialPage: 3 }))

      expect(result.current.currentData).toHaveLength(10)
      expect(result.current.currentData[0].id).toBe(21)
      expect(result.current.currentData[9].id).toBe(30)
    })

    it('should return partial data on last page', () => {
      const data = createTestData(55)
      const { result } = renderHook(() => usePagination(data, { pageSize: 10, initialPage: 6 }))

      expect(result.current.currentData).toHaveLength(5)
      expect(result.current.currentData[0].id).toBe(51)
      expect(result.current.currentData[4].id).toBe(55)
    })

    it('should update when data changes', () => {
      const initialData = createTestData(50)
      const { result, rerender } = renderHook(
        ({ data }) => usePagination(data, { pageSize: 10 }),
        { initialProps: { data: initialData } }
      )

      expect(result.current.totalItems).toBe(50)

      const newData = createTestData(100)
      rerender({ data: newData })

      expect(result.current.totalItems).toBe(100)
      expect(result.current.totalPages).toBe(10)
    })
  })

  // ============================================================================
  // Navigation Tests
  // ============================================================================

  describe('navigation', () => {
    it('should go to next page', () => {
      const data = createTestData(50)
      const { result } = renderHook(() => usePagination(data, { pageSize: 10 }))

      act(() => {
        result.current.nextPage()
      })

      expect(result.current.currentPage).toBe(2)
    })

    it('should not exceed last page when going next', () => {
      const data = createTestData(50)
      const { result } = renderHook(() => usePagination(data, { pageSize: 10, initialPage: 5 }))

      act(() => {
        result.current.nextPage()
      })

      expect(result.current.currentPage).toBe(5)
    })

    it('should go to previous page', () => {
      const data = createTestData(50)
      const { result } = renderHook(() => usePagination(data, { pageSize: 10, initialPage: 3 }))

      act(() => {
        result.current.previousPage()
      })

      expect(result.current.currentPage).toBe(2)
    })

    it('should not go below first page when going previous', () => {
      const data = createTestData(50)
      const { result } = renderHook(() => usePagination(data, { pageSize: 10 }))

      act(() => {
        result.current.previousPage()
      })

      expect(result.current.currentPage).toBe(1)
    })

    it('should go to first page', () => {
      const data = createTestData(50)
      const { result } = renderHook(() => usePagination(data, { pageSize: 10, initialPage: 4 }))

      act(() => {
        result.current.goToFirstPage()
      })

      expect(result.current.currentPage).toBe(1)
    })

    it('should go to last page', () => {
      const data = createTestData(50)
      const { result } = renderHook(() => usePagination(data, { pageSize: 10 }))

      act(() => {
        result.current.goToLastPage()
      })

      expect(result.current.currentPage).toBe(5)
    })

    it('should go to specific page', () => {
      const data = createTestData(50)
      const { result } = renderHook(() => usePagination(data, { pageSize: 10 }))

      act(() => {
        result.current.goToPage(3)
      })

      expect(result.current.currentPage).toBe(3)
    })

    it('should clamp page to valid range when going to page', () => {
      const data = createTestData(50)
      const { result } = renderHook(() => usePagination(data, { pageSize: 10 }))

      act(() => {
        result.current.goToPage(100) // Beyond max
      })
      expect(result.current.currentPage).toBe(5)

      act(() => {
        result.current.goToPage(0) // Below min
      })
      expect(result.current.currentPage).toBe(1)

      act(() => {
        result.current.goToPage(-5) // Negative
      })
      expect(result.current.currentPage).toBe(1)
    })
  })

  // ============================================================================
  // Page Size Tests
  // ============================================================================

  describe('page size', () => {
    it('should change page size', () => {
      const data = createTestData(100)
      const { result } = renderHook(() => usePagination(data, { pageSize: 10 }))

      act(() => {
        result.current.setPageSize(25)
      })

      expect(result.current.pageSize).toBe(25)
      expect(result.current.totalPages).toBe(4)
    })

    it('should reset to first page when changing page size', () => {
      const data = createTestData(100)
      const { result } = renderHook(() => usePagination(data, { pageSize: 10, initialPage: 5 }))

      act(() => {
        result.current.setPageSize(25)
      })

      expect(result.current.currentPage).toBe(1)
    })

    it('should recalculate current data when page size changes', () => {
      const data = createTestData(100)
      const { result } = renderHook(() => usePagination(data, { pageSize: 10 }))

      expect(result.current.currentData).toHaveLength(10)

      act(() => {
        result.current.setPageSize(50)
      })

      expect(result.current.currentData).toHaveLength(50)
    })
  })

  // ============================================================================
  // Helper Properties Tests
  // ============================================================================

  describe('helper properties', () => {
    it('should correctly calculate canGoNext', () => {
      const data = createTestData(50)
      const { result } = renderHook(() => usePagination(data, { pageSize: 10 }))

      expect(result.current.canGoNext).toBe(true)

      act(() => {
        result.current.goToLastPage()
      })

      expect(result.current.canGoNext).toBe(false)
    })

    it('should correctly calculate canGoPrevious', () => {
      const data = createTestData(50)
      const { result } = renderHook(() => usePagination(data, { pageSize: 10 }))

      expect(result.current.canGoPrevious).toBe(false)

      act(() => {
        result.current.nextPage()
      })

      expect(result.current.canGoPrevious).toBe(true)
    })

    it('should return 1-indexed startIndex', () => {
      const data = createTestData(50)
      const { result } = renderHook(() => usePagination(data, { pageSize: 10 }))

      expect(result.current.startIndex).toBe(1)

      act(() => {
        result.current.goToPage(2)
      })

      expect(result.current.startIndex).toBe(11)
    })

    it('should calculate correct endIndex', () => {
      const data = createTestData(50)
      const { result } = renderHook(() => usePagination(data, { pageSize: 10 }))

      expect(result.current.endIndex).toBe(10)

      act(() => {
        result.current.goToLastPage()
      })

      expect(result.current.endIndex).toBe(50)
    })

    it('should calculate correct endIndex for partial last page', () => {
      const data = createTestData(55)
      const { result } = renderHook(() => usePagination(data, { pageSize: 10 }))

      act(() => {
        result.current.goToLastPage()
      })

      expect(result.current.endIndex).toBe(55)
    })
  })

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('edge cases', () => {
    it('should handle single item', () => {
      const data = createTestData(1)
      const { result } = renderHook(() => usePagination(data, { pageSize: 10 }))

      expect(result.current.totalItems).toBe(1)
      expect(result.current.totalPages).toBe(1)
      expect(result.current.currentData).toHaveLength(1)
      expect(result.current.canGoNext).toBe(false)
      expect(result.current.canGoPrevious).toBe(false)
    })

    it('should handle data exactly matching page size', () => {
      const data = createTestData(25)
      const { result } = renderHook(() => usePagination(data, { pageSize: 25 }))

      expect(result.current.totalPages).toBe(1)
      expect(result.current.currentData).toHaveLength(25)
    })

    it('should handle page size larger than data', () => {
      const data = createTestData(10)
      const { result } = renderHook(() => usePagination(data, { pageSize: 100 }))

      expect(result.current.totalPages).toBe(1)
      expect(result.current.currentData).toHaveLength(10)
    })

    it('should handle page size of 1', () => {
      const data = createTestData(5)
      const { result } = renderHook(() => usePagination(data, { pageSize: 1 }))

      expect(result.current.totalPages).toBe(5)
      expect(result.current.currentData).toHaveLength(1)
      expect(result.current.currentData[0].id).toBe(1)

      act(() => {
        result.current.nextPage()
      })

      expect(result.current.currentData[0].id).toBe(2)
    })
  })
})
