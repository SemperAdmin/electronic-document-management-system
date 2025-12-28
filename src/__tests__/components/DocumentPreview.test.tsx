import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { renderHook, act } from '@testing-library/react'
import { FileTypeIcon, getFileType, canPreview, useDocumentPreview } from '../../components/common/DocumentPreview'

// ============================================================================
// getFileType Tests
// ============================================================================

describe('getFileType', () => {
  it('should detect PDF from MIME type', () => {
    expect(getFileType('application/pdf')).toBe('pdf')
  })

  it('should detect PDF from file extension', () => {
    expect(getFileType('application/octet-stream', 'document.pdf')).toBe('pdf')
  })

  it('should detect Word documents from MIME type', () => {
    expect(getFileType('application/msword')).toBe('doc')
    expect(getFileType('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('doc')
  })

  it('should detect Word documents from file extension', () => {
    expect(getFileType('application/octet-stream', 'report.doc')).toBe('doc')
    expect(getFileType('application/octet-stream', 'report.docx')).toBe('doc')
  })

  it('should detect Excel files from MIME type', () => {
    expect(getFileType('application/vnd.ms-excel')).toBe('xls')
    expect(getFileType('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).toBe('xls')
  })

  it('should detect Excel files from file extension', () => {
    expect(getFileType('application/octet-stream', 'data.xls')).toBe('xls')
    expect(getFileType('application/octet-stream', 'data.xlsx')).toBe('xls')
  })

  it('should detect images from MIME type', () => {
    expect(getFileType('image/jpeg')).toBe('img')
    expect(getFileType('image/png')).toBe('img')
    expect(getFileType('image/gif')).toBe('img')
    expect(getFileType('image/webp')).toBe('img')
  })

  it('should detect images from file extension', () => {
    expect(getFileType('application/octet-stream', 'photo.jpg')).toBe('img')
    expect(getFileType('application/octet-stream', 'photo.jpeg')).toBe('img')
    expect(getFileType('application/octet-stream', 'icon.png')).toBe('img')
    expect(getFileType('application/octet-stream', 'animation.gif')).toBe('img')
    expect(getFileType('application/octet-stream', 'image.webp')).toBe('img')
    expect(getFileType('application/octet-stream', 'vector.svg')).toBe('img')
    expect(getFileType('application/octet-stream', 'bitmap.bmp')).toBe('img')
  })

  it('should detect text files from MIME type', () => {
    expect(getFileType('text/plain')).toBe('txt')
    expect(getFileType('text/html')).toBe('txt')
  })

  it('should detect text files from file extension', () => {
    expect(getFileType('application/octet-stream', 'readme.txt')).toBe('txt')
  })

  it('should return file for unknown types', () => {
    expect(getFileType('application/octet-stream')).toBe('file')
    expect(getFileType('application/unknown', 'data.bin')).toBe('file')
  })

  it('should be case-insensitive for extensions', () => {
    expect(getFileType('application/octet-stream', 'DOCUMENT.PDF')).toBe('pdf')
    expect(getFileType('application/octet-stream', 'Image.JPG')).toBe('img')
  })
})

// ============================================================================
// canPreview Tests
// ============================================================================

describe('canPreview', () => {
  it('should return true for PDF files', () => {
    expect(canPreview('application/pdf')).toBe(true)
    expect(canPreview('application/octet-stream', 'document.pdf')).toBe(true)
  })

  it('should return true for image files', () => {
    expect(canPreview('image/jpeg')).toBe(true)
    expect(canPreview('image/png')).toBe(true)
    expect(canPreview('application/octet-stream', 'photo.jpg')).toBe(true)
  })

  it('should return false for Word documents', () => {
    expect(canPreview('application/msword')).toBe(false)
    expect(canPreview('application/octet-stream', 'document.docx')).toBe(false)
  })

  it('should return false for Excel files', () => {
    expect(canPreview('application/vnd.ms-excel')).toBe(false)
    expect(canPreview('application/octet-stream', 'data.xlsx')).toBe(false)
  })

  it('should return false for text files', () => {
    expect(canPreview('text/plain')).toBe(false)
    expect(canPreview('application/octet-stream', 'readme.txt')).toBe(false)
  })

  it('should return false for unknown file types', () => {
    expect(canPreview('application/octet-stream')).toBe(false)
    expect(canPreview('application/unknown', 'data.bin')).toBe(false)
  })
})

// ============================================================================
// FileTypeIcon Tests
// ============================================================================

describe('FileTypeIcon', () => {
  it('should render PDF icon with correct label', () => {
    render(<FileTypeIcon type="application/pdf" />)
    expect(screen.getByRole('img', { name: 'PDF file' })).toBeInTheDocument()
    expect(screen.getByText('PDF')).toBeInTheDocument()
  })

  it('should render DOC icon for Word documents', () => {
    render(<FileTypeIcon type="application/msword" />)
    expect(screen.getByRole('img', { name: 'DOC file' })).toBeInTheDocument()
    expect(screen.getByText('DOC')).toBeInTheDocument()
  })

  it('should render XLS icon for Excel files', () => {
    render(<FileTypeIcon type="application/vnd.ms-excel" />)
    expect(screen.getByRole('img', { name: 'XLS file' })).toBeInTheDocument()
    expect(screen.getByText('XLS')).toBeInTheDocument()
  })

  it('should render IMG icon for images', () => {
    render(<FileTypeIcon type="image/jpeg" />)
    expect(screen.getByRole('img', { name: 'IMG file' })).toBeInTheDocument()
    expect(screen.getByText('IMG')).toBeInTheDocument()
  })

  it('should render TXT icon for text files', () => {
    render(<FileTypeIcon type="text/plain" />)
    expect(screen.getByRole('img', { name: 'TXT file' })).toBeInTheDocument()
    expect(screen.getByText('TXT')).toBeInTheDocument()
  })

  it('should render FILE icon for unknown types', () => {
    render(<FileTypeIcon type="application/octet-stream" />)
    expect(screen.getByRole('img', { name: 'FILE file' })).toBeInTheDocument()
    expect(screen.getByText('FILE')).toBeInTheDocument()
  })

  it('should use fileName to determine type when MIME is generic', () => {
    render(<FileTypeIcon type="application/octet-stream" fileName="document.pdf" />)
    expect(screen.getByRole('img', { name: 'PDF file' })).toBeInTheDocument()
  })

  it('should apply different sizes', () => {
    const { rerender, container } = render(<FileTypeIcon type="application/pdf" size="sm" />)
    expect(container.querySelector('.w-8')).toBeInTheDocument()

    rerender(<FileTypeIcon type="application/pdf" size="md" />)
    expect(container.querySelector('.w-10')).toBeInTheDocument()

    rerender(<FileTypeIcon type="application/pdf" size="lg" />)
    expect(container.querySelector('.w-12')).toBeInTheDocument()
  })

  it('should apply custom className', () => {
    const { container } = render(<FileTypeIcon type="application/pdf" className="custom-class" />)
    expect(container.querySelector('.custom-class')).toBeInTheDocument()
  })
})

// ============================================================================
// useDocumentPreview Hook Tests
// ============================================================================

describe('useDocumentPreview', () => {
  it('should start with closed state', () => {
    const { result } = renderHook(() => useDocumentPreview())
    expect(result.current.isOpen).toBe(false)
    expect(result.current.previewState).toBeNull()
  })

  it('should open preview with state', () => {
    const { result } = renderHook(() => useDocumentPreview())

    act(() => {
      result.current.openPreview({
        url: 'https://example.com/doc.pdf',
        fileName: 'doc.pdf',
        mimeType: 'application/pdf',
      })
    })

    expect(result.current.isOpen).toBe(true)
    expect(result.current.previewState).toEqual({
      url: 'https://example.com/doc.pdf',
      fileName: 'doc.pdf',
      mimeType: 'application/pdf',
    })
  })

  it('should open preview with file size', () => {
    const { result } = renderHook(() => useDocumentPreview())

    act(() => {
      result.current.openPreview({
        url: 'https://example.com/doc.pdf',
        fileName: 'doc.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
      })
    })

    expect(result.current.previewState?.fileSize).toBe(1024)
  })

  it('should close preview', () => {
    const { result } = renderHook(() => useDocumentPreview())

    act(() => {
      result.current.openPreview({
        url: 'https://example.com/doc.pdf',
        fileName: 'doc.pdf',
        mimeType: 'application/pdf',
      })
    })

    expect(result.current.isOpen).toBe(true)

    act(() => {
      result.current.closePreview()
    })

    expect(result.current.isOpen).toBe(false)
    expect(result.current.previewState).toBeNull()
  })

  it('should update preview state when opening new file', () => {
    const { result } = renderHook(() => useDocumentPreview())

    act(() => {
      result.current.openPreview({
        url: 'https://example.com/doc1.pdf',
        fileName: 'doc1.pdf',
        mimeType: 'application/pdf',
      })
    })

    act(() => {
      result.current.openPreview({
        url: 'https://example.com/image.jpg',
        fileName: 'image.jpg',
        mimeType: 'image/jpeg',
      })
    })

    expect(result.current.previewState).toEqual({
      url: 'https://example.com/image.jpg',
      fileName: 'image.jpg',
      mimeType: 'image/jpeg',
    })
  })
})
