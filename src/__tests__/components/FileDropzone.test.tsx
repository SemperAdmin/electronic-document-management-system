import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FileDropzone } from '../../components/common/FileDropzone'

describe('FileDropzone Component', () => {
  const defaultProps = {
    files: [] as File[],
    onFilesAdded: vi.fn(),
    onFileRemoved: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================================================
  // Rendering Tests
  // ============================================================================

  describe('Rendering', () => {
    it('should render the dropzone with default text', () => {
      render(<FileDropzone {...defaultProps} />)
      expect(screen.getByText(/Drag & drop files here/i)).toBeInTheDocument()
      expect(screen.getByText(/browse/i)).toBeInTheDocument()
    })

    it('should display file count when files are selected', () => {
      const testFile = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      render(<FileDropzone {...defaultProps} files={[testFile]} />)
      expect(screen.getByText(/1 file selected/i)).toBeInTheDocument()
    })

    it('should display plural for multiple files', () => {
      const testFiles = [
        new File(['test1'], 'test1.pdf', { type: 'application/pdf' }),
        new File(['test2'], 'test2.pdf', { type: 'application/pdf' }),
      ]
      render(<FileDropzone {...defaultProps} files={testFiles} />)
      expect(screen.getByText(/2 files selected/i)).toBeInTheDocument()
    })

    it('should render file names in the list', () => {
      const testFile = new File(['test'], 'my-document.pdf', { type: 'application/pdf' })
      render(<FileDropzone {...defaultProps} files={[testFile]} />)
      expect(screen.getByText('my-document.pdf')).toBeInTheDocument()
    })

    it('should show file type badge', () => {
      const testFile = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      render(<FileDropzone {...defaultProps} files={[testFile]} />)
      expect(screen.getByText('PDF')).toBeInTheDocument()
    })

    it('should render in compact mode', () => {
      render(<FileDropzone {...defaultProps} compact />)
      // In compact mode, the detailed file info text is hidden
      expect(screen.queryByText(/Max.*files/)).not.toBeInTheDocument()
    })
  })

  // ============================================================================
  // Interaction Tests
  // ============================================================================

  describe('Interactions', () => {
    it('should be clickable when not disabled', async () => {
      render(<FileDropzone {...defaultProps} />)
      const dropzone = screen.getByRole('button', { name: /Drop files here or click to browse/i })
      expect(dropzone).not.toHaveAttribute('aria-disabled', 'true')
    })

    it('should be disabled when disabled prop is true', () => {
      render(<FileDropzone {...defaultProps} disabled />)
      const dropzone = screen.getByRole('button', { name: /Drop files here or click to browse/i })
      expect(dropzone).toHaveAttribute('aria-disabled', 'true')
    })

    it('should call onFileRemoved when remove button is clicked', async () => {
      const user = userEvent.setup()
      const testFile = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      render(<FileDropzone {...defaultProps} files={[testFile]} />)

      const removeButton = screen.getByRole('button', { name: /Remove test.pdf/i })
      await user.click(removeButton)

      expect(defaultProps.onFileRemoved).toHaveBeenCalledWith(0)
    })

    it('should handle keyboard navigation (Enter key)', async () => {
      const user = userEvent.setup()
      render(<FileDropzone {...defaultProps} />)
      const dropzone = screen.getByRole('button', { name: /Drop files here or click to browse/i })

      dropzone.focus()
      await user.keyboard('{Enter}')

      // The hidden input should be triggered (we can't fully test file dialog)
      // But we can verify no error occurs
    })

    it('should handle keyboard navigation (Space key)', async () => {
      const user = userEvent.setup()
      render(<FileDropzone {...defaultProps} />)
      const dropzone = screen.getByRole('button', { name: /Drop files here or click to browse/i })

      dropzone.focus()
      await user.keyboard(' ')
    })
  })

  // ============================================================================
  // Drag and Drop Tests
  // ============================================================================

  describe('Drag and Drop', () => {
    it('should update visual state on drag enter', () => {
      render(<FileDropzone {...defaultProps} />)
      const dropzone = screen.getByRole('button', { name: /Drop files here or click to browse/i })

      fireEvent.dragEnter(dropzone, {
        dataTransfer: {
          items: [{ kind: 'file', type: 'application/pdf' }],
          files: [],
        },
      })

      expect(screen.getByText(/Drop files here/i)).toBeInTheDocument()
    })

    it('should reset visual state on drag leave', () => {
      render(<FileDropzone {...defaultProps} />)
      const dropzone = screen.getByRole('button', { name: /Drop files here or click to browse/i })

      fireEvent.dragEnter(dropzone, {
        dataTransfer: {
          items: [{ kind: 'file', type: 'application/pdf' }],
          files: [],
        },
      })

      fireEvent.dragLeave(dropzone)

      // After leaving, it should reset
      expect(screen.getByText(/Drag & drop files here/i)).toBeInTheDocument()
    })

    it('should handle drop event', () => {
      render(<FileDropzone {...defaultProps} />)
      const dropzone = screen.getByRole('button', { name: /Drop files here or click to browse/i })

      const testFile = new File(['test'], 'test.pdf', { type: 'application/pdf' })

      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [testFile],
        },
      })

      expect(defaultProps.onFilesAdded).toHaveBeenCalled()
    })
  })

  // ============================================================================
  // Validation Tests
  // ============================================================================

  describe('Validation', () => {
    it('should show error when max files exceeded', () => {
      const files = [
        new File(['1'], '1.pdf', { type: 'application/pdf' }),
        new File(['2'], '2.pdf', { type: 'application/pdf' }),
        new File(['3'], '3.pdf', { type: 'application/pdf' }),
        new File(['4'], '4.pdf', { type: 'application/pdf' }),
        new File(['5'], '5.pdf', { type: 'application/pdf' }),
      ]

      render(<FileDropzone {...defaultProps} files={files} maxFiles={5} />)
      const dropzone = screen.getByRole('button', { name: /Drop files here or click to browse/i })

      const newFile = new File(['test'], 'test.pdf', { type: 'application/pdf' })

      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [newFile],
        },
      })

      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('should show remaining files message', () => {
      const files = [
        new File(['1'], '1.pdf', { type: 'application/pdf' }),
        new File(['2'], '2.pdf', { type: 'application/pdf' }),
      ]

      render(<FileDropzone {...defaultProps} files={files} maxFiles={5} />)
      expect(screen.getByText(/You can add 3 more files/i)).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Accessibility Tests
  // ============================================================================

  describe('Accessibility', () => {
    it('should have accessible role and label', () => {
      render(<FileDropzone {...defaultProps} />)
      const dropzone = screen.getByRole('button', { name: /Drop files here or click to browse/i })
      expect(dropzone).toBeInTheDocument()
    })

    it('should have aria-disabled when disabled', () => {
      render(<FileDropzone {...defaultProps} disabled />)
      const dropzone = screen.getByRole('button', { name: /Drop files here or click to browse/i })
      expect(dropzone).toHaveAttribute('aria-disabled', 'true')
    })

    it('should have accessible file list', () => {
      const testFile = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      render(<FileDropzone {...defaultProps} files={[testFile]} />)
      expect(screen.getByRole('list', { name: /Selected files/i })).toBeInTheDocument()
    })

    it('should have accessible remove buttons with file names', () => {
      const testFile = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      render(<FileDropzone {...defaultProps} files={[testFile]} />)
      expect(screen.getByRole('button', { name: /Remove test.pdf/i })).toBeInTheDocument()
    })

    it('should have error alert role for validation errors', () => {
      const files = Array(5).fill(null).map((_, i) =>
        new File([`${i}`], `${i}.pdf`, { type: 'application/pdf' })
      )

      render(<FileDropzone {...defaultProps} files={files} maxFiles={5} />)
      const dropzone = screen.getByRole('button', { name: /Drop files here or click to browse/i })

      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [new File(['test'], 'test.pdf', { type: 'application/pdf' })],
        },
      })

      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })
})
