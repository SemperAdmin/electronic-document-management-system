import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderHook, act } from '@testing-library/react'
import { UploadProgress, useUploadProgress, UploadItem } from '../../components/common/UploadProgress'

describe('UploadProgress Component', () => {
  const defaultProps = {
    items: [] as UploadItem[],
    onRetry: vi.fn(),
    onCancel: vi.fn(),
    onDismiss: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================================================
  // Rendering Tests
  // ============================================================================

  describe('Rendering', () => {
    it('should return null when items array is empty', () => {
      const { container } = render(<UploadProgress {...defaultProps} />)
      expect(container.firstChild).toBeNull()
    })

    it('should render header with upload count', () => {
      const items: UploadItem[] = [
        { id: '1', fileName: 'test.pdf', progress: 50, status: 'uploading' },
      ]
      render(<UploadProgress {...defaultProps} items={items} />)
      expect(screen.getByText(/Uploading 1 file/)).toBeInTheDocument()
    })

    it('should render plural for multiple uploads', () => {
      const items: UploadItem[] = [
        { id: '1', fileName: 'test1.pdf', progress: 50, status: 'uploading' },
        { id: '2', fileName: 'test2.pdf', progress: 30, status: 'uploading' },
      ]
      render(<UploadProgress {...defaultProps} items={items} />)
      expect(screen.getByText(/Uploading 2 files/)).toBeInTheDocument()
    })

    it('should show completed message when all uploads are done', () => {
      const items: UploadItem[] = [
        { id: '1', fileName: 'test1.pdf', progress: 100, status: 'complete' },
        { id: '2', fileName: 'test2.pdf', progress: 100, status: 'complete' },
      ]
      render(<UploadProgress {...defaultProps} items={items} />)
      expect(screen.getByText(/2 files uploaded/)).toBeInTheDocument()
    })

    it('should show error count when uploads fail', () => {
      const items: UploadItem[] = [
        { id: '1', fileName: 'test.pdf', progress: 0, status: 'error', error: 'Failed' },
      ]
      render(<UploadProgress {...defaultProps} items={items} />)
      expect(screen.getByText(/1 upload failed/)).toBeInTheDocument()
    })

    it('should render file names', () => {
      const items: UploadItem[] = [
        { id: '1', fileName: 'document.pdf', progress: 50, status: 'uploading' },
      ]
      render(<UploadProgress {...defaultProps} items={items} />)
      expect(screen.getByText('document.pdf')).toBeInTheDocument()
    })

    it('should show progress percentage', () => {
      const items: UploadItem[] = [
        { id: '1', fileName: 'test.pdf', progress: 75, status: 'uploading' },
      ]
      render(<UploadProgress {...defaultProps} items={items} />)
      // 75% appears in both header and file row, so we check for multiple
      const progressElements = screen.getAllByText('75%')
      expect(progressElements.length).toBeGreaterThanOrEqual(1)
    })

    it('should show error message for failed uploads', () => {
      const items: UploadItem[] = [
        { id: '1', fileName: 'test.pdf', progress: 0, status: 'error', error: 'Network error' },
      ]
      render(<UploadProgress {...defaultProps} items={items} />)
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })

    it('should calculate overall progress correctly', () => {
      const items: UploadItem[] = [
        { id: '1', fileName: 'test1.pdf', progress: 100, status: 'complete' },
        { id: '2', fileName: 'test2.pdf', progress: 50, status: 'uploading' },
      ]
      render(<UploadProgress {...defaultProps} items={items} />)
      // (100 + 50) / 2 = 75% - this appears in both header and file progress
      // The header shows overall progress, check it's shown
      const progressElements = screen.getAllByText('75%')
      expect(progressElements.length).toBeGreaterThanOrEqual(1)
    })
  })

  // ============================================================================
  // Interaction Tests
  // ============================================================================

  describe('Interactions', () => {
    it('should call onRetry when retry button is clicked', async () => {
      const user = userEvent.setup()
      const items: UploadItem[] = [
        { id: '1', fileName: 'test.pdf', progress: 0, status: 'error', error: 'Failed' },
      ]
      render(<UploadProgress {...defaultProps} items={items} />)

      const retryButton = screen.getByText('Retry')
      await user.click(retryButton)

      expect(defaultProps.onRetry).toHaveBeenCalledWith('1')
    })

    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup()
      const items: UploadItem[] = [
        { id: '1', fileName: 'test.pdf', progress: 50, status: 'uploading' },
      ]
      render(<UploadProgress {...defaultProps} items={items} />)

      const cancelButton = screen.getByRole('button', { name: /Cancel upload/i })
      await user.click(cancelButton)

      expect(defaultProps.onCancel).toHaveBeenCalledWith('1')
    })

    it('should call onDismiss when dismiss button is clicked on completed upload', async () => {
      const user = userEvent.setup()
      const items: UploadItem[] = [
        { id: '1', fileName: 'test.pdf', progress: 100, status: 'complete' },
      ]
      render(<UploadProgress {...defaultProps} items={items} />)

      const dismissButton = screen.getByRole('button', { name: /Dismiss test.pdf/i })
      await user.click(dismissButton)

      expect(defaultProps.onDismiss).toHaveBeenCalledWith('1')
    })

    it('should call onDismiss when dismiss button is clicked on error upload', async () => {
      const user = userEvent.setup()
      const items: UploadItem[] = [
        { id: '1', fileName: 'test.pdf', progress: 0, status: 'error', error: 'Failed' },
      ]
      render(<UploadProgress {...defaultProps} items={items} />)

      const dismissButton = screen.getByRole('button', { name: /Dismiss test.pdf/i })
      await user.click(dismissButton)

      expect(defaultProps.onDismiss).toHaveBeenCalledWith('1')
    })
  })

  // ============================================================================
  // Status Icon Tests
  // ============================================================================

  describe('Status Icons', () => {
    it('should show spinner for uploading status', () => {
      const items: UploadItem[] = [
        { id: '1', fileName: 'test.pdf', progress: 50, status: 'uploading' },
      ]
      const { container } = render(<UploadProgress {...defaultProps} items={items} />)
      expect(container.querySelector('.animate-spin')).toBeInTheDocument()
    })

    it('should show spinner for pending status', () => {
      const items: UploadItem[] = [
        { id: '1', fileName: 'test.pdf', progress: 0, status: 'pending' },
      ]
      const { container } = render(<UploadProgress {...defaultProps} items={items} />)
      expect(container.querySelector('.animate-spin')).toBeInTheDocument()
    })

    it('should show checkmark for complete status', () => {
      const items: UploadItem[] = [
        { id: '1', fileName: 'test.pdf', progress: 100, status: 'complete' },
      ]
      const { container } = render(<UploadProgress {...defaultProps} items={items} />)
      expect(container.querySelector('.text-green-600')).toBeInTheDocument()
    })

    it('should show X for error status', () => {
      const items: UploadItem[] = [
        { id: '1', fileName: 'test.pdf', progress: 0, status: 'error' },
      ]
      const { container } = render(<UploadProgress {...defaultProps} items={items} />)
      expect(container.querySelector('.text-brand-red')).toBeInTheDocument()
    })
  })
})

// ============================================================================
// useUploadProgress Hook Tests
// ============================================================================

describe('useUploadProgress Hook', () => {
  it('should start with empty items', () => {
    const { result } = renderHook(() => useUploadProgress())
    expect(result.current.items).toEqual([])
  })

  it('should add item correctly', () => {
    const { result } = renderHook(() => useUploadProgress())

    act(() => {
      result.current.addItem('1', 'test.pdf')
    })

    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0]).toEqual({
      id: '1',
      fileName: 'test.pdf',
      progress: 0,
      status: 'pending',
    })
  })

  it('should update progress correctly', () => {
    const { result } = renderHook(() => useUploadProgress())

    act(() => {
      result.current.addItem('1', 'test.pdf')
    })

    act(() => {
      result.current.updateProgress('1', 50)
    })

    expect(result.current.items[0].progress).toBe(50)
    expect(result.current.items[0].status).toBe('uploading')
  })

  it('should set complete correctly', () => {
    const { result } = renderHook(() => useUploadProgress())

    act(() => {
      result.current.addItem('1', 'test.pdf')
    })

    act(() => {
      result.current.setComplete('1')
    })

    expect(result.current.items[0].progress).toBe(100)
    expect(result.current.items[0].status).toBe('complete')
  })

  it('should set error correctly', () => {
    const { result } = renderHook(() => useUploadProgress())

    act(() => {
      result.current.addItem('1', 'test.pdf')
    })

    act(() => {
      result.current.setError('1', 'Upload failed')
    })

    expect(result.current.items[0].status).toBe('error')
    expect(result.current.items[0].error).toBe('Upload failed')
  })

  it('should remove item correctly', () => {
    const { result } = renderHook(() => useUploadProgress())

    act(() => {
      result.current.addItem('1', 'test.pdf')
      result.current.addItem('2', 'test2.pdf')
    })

    expect(result.current.items).toHaveLength(2)

    act(() => {
      result.current.removeItem('1')
    })

    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].id).toBe('2')
  })

  it('should reset all items', () => {
    const { result } = renderHook(() => useUploadProgress())

    act(() => {
      result.current.addItem('1', 'test.pdf')
      result.current.addItem('2', 'test2.pdf')
    })

    expect(result.current.items).toHaveLength(2)

    act(() => {
      result.current.reset()
    })

    expect(result.current.items).toHaveLength(0)
  })

  it('should correctly detect active uploads', () => {
    const { result } = renderHook(() => useUploadProgress())

    expect(result.current.hasActiveUploads).toBe(false)

    act(() => {
      result.current.addItem('1', 'test.pdf')
    })

    expect(result.current.hasActiveUploads).toBe(true)

    act(() => {
      result.current.setComplete('1')
    })

    expect(result.current.hasActiveUploads).toBe(false)
  })

  it('should detect active uploads with uploading status', () => {
    const { result } = renderHook(() => useUploadProgress())

    act(() => {
      result.current.addItem('1', 'test.pdf')
      result.current.updateProgress('1', 50)
    })

    expect(result.current.hasActiveUploads).toBe(true)
  })
})
