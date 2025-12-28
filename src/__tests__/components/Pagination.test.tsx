import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Pagination } from '../../components/Pagination'

describe('Pagination Component', () => {
  const defaultProps = {
    currentPage: 1,
    totalPages: 10,
    totalItems: 100,
    pageSize: 10,
    startIndex: 1,
    endIndex: 10,
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
    onNext: vi.fn(),
    onPrevious: vi.fn(),
    onFirst: vi.fn(),
    onLast: vi.fn(),
    canGoNext: true,
    canGoPrevious: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================================================
  // Rendering Tests
  // ============================================================================

  describe('rendering', () => {
    it('should render pagination info correctly', () => {
      render(<Pagination {...defaultProps} />)

      expect(screen.getByText(/Showing/)).toBeInTheDocument()
      // Check that the pagination info section contains the expected values
      const pageInfo = screen.getByText(/Showing/).closest('div')
      expect(pageInfo).toHaveTextContent('Showing')
      expect(pageInfo).toHaveTextContent('1')
      expect(pageInfo).toHaveTextContent('to')
      expect(pageInfo).toHaveTextContent('100')
      expect(pageInfo).toHaveTextContent('items')
    })

    it('should render current page indicator', () => {
      render(<Pagination {...defaultProps} currentPage={5} totalPages={10} />)

      expect(screen.getByText(/Page/)).toBeInTheDocument()
      expect(screen.getByText('5 / 10')).toBeInTheDocument()
    })

    it('should render all navigation buttons', () => {
      render(<Pagination {...defaultProps} />)

      expect(screen.getByLabelText('Go to first page')).toBeInTheDocument()
      expect(screen.getByLabelText('Go to previous page')).toBeInTheDocument()
      expect(screen.getByLabelText('Go to next page')).toBeInTheDocument()
      expect(screen.getByLabelText('Go to last page')).toBeInTheDocument()
    })

    it('should render page size selector by default', () => {
      render(<Pagination {...defaultProps} />)

      expect(screen.getByLabelText('Show:')).toBeInTheDocument()
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('should hide page size selector when showPageSizeSelector is false', () => {
      render(<Pagination {...defaultProps} showPageSizeSelector={false} />)

      expect(screen.queryByLabelText('Show:')).not.toBeInTheDocument()
    })

    it('should render jump to page input', () => {
      render(<Pagination {...defaultProps} />)

      expect(screen.getByLabelText('Go to:')).toBeInTheDocument()
      expect(screen.getByRole('spinbutton')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Go' })).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Navigation Button Tests
  // ============================================================================

  describe('navigation buttons', () => {
    it('should disable first and previous buttons when on first page', () => {
      render(<Pagination {...defaultProps} canGoPrevious={false} />)

      expect(screen.getByLabelText('Go to first page')).toBeDisabled()
      expect(screen.getByLabelText('Go to previous page')).toBeDisabled()
    })

    it('should disable next and last buttons when on last page', () => {
      render(<Pagination {...defaultProps} canGoNext={false} />)

      expect(screen.getByLabelText('Go to next page')).toBeDisabled()
      expect(screen.getByLabelText('Go to last page')).toBeDisabled()
    })

    it('should enable all buttons when in middle of pages', () => {
      render(
        <Pagination
          {...defaultProps}
          currentPage={5}
          canGoPrevious={true}
          canGoNext={true}
        />
      )

      expect(screen.getByLabelText('Go to first page')).not.toBeDisabled()
      expect(screen.getByLabelText('Go to previous page')).not.toBeDisabled()
      expect(screen.getByLabelText('Go to next page')).not.toBeDisabled()
      expect(screen.getByLabelText('Go to last page')).not.toBeDisabled()
    })

    it('should call onFirst when first button is clicked', async () => {
      const onFirst = vi.fn()
      render(<Pagination {...defaultProps} onFirst={onFirst} canGoPrevious={true} />)

      await userEvent.click(screen.getByLabelText('Go to first page'))

      expect(onFirst).toHaveBeenCalledTimes(1)
    })

    it('should call onPrevious when previous button is clicked', async () => {
      const onPrevious = vi.fn()
      render(<Pagination {...defaultProps} onPrevious={onPrevious} canGoPrevious={true} />)

      await userEvent.click(screen.getByLabelText('Go to previous page'))

      expect(onPrevious).toHaveBeenCalledTimes(1)
    })

    it('should call onNext when next button is clicked', async () => {
      const onNext = vi.fn()
      render(<Pagination {...defaultProps} onNext={onNext} canGoNext={true} />)

      await userEvent.click(screen.getByLabelText('Go to next page'))

      expect(onNext).toHaveBeenCalledTimes(1)
    })

    it('should call onLast when last button is clicked', async () => {
      const onLast = vi.fn()
      render(<Pagination {...defaultProps} onLast={onLast} canGoNext={true} />)

      await userEvent.click(screen.getByLabelText('Go to last page'))

      expect(onLast).toHaveBeenCalledTimes(1)
    })
  })

  // ============================================================================
  // Page Size Selector Tests
  // ============================================================================

  describe('page size selector', () => {
    it('should render default page size options', () => {
      render(<Pagination {...defaultProps} />)

      const select = screen.getByRole('combobox')
      expect(select).toHaveValue('10')

      // Check options
      expect(screen.getByRole('option', { name: '10' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: '25' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: '50' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: '100' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'All' })).toBeInTheDocument()
    })

    it('should render custom page size options', () => {
      render(<Pagination {...defaultProps} pageSizeOptions={[5, 15, 30]} />)

      expect(screen.getByRole('option', { name: '5' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: '15' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: '30' })).toBeInTheDocument()
    })

    it('should call onPageSizeChange when selecting a new size', async () => {
      const onPageSizeChange = vi.fn()
      render(<Pagination {...defaultProps} onPageSizeChange={onPageSizeChange} />)

      await userEvent.selectOptions(screen.getByRole('combobox'), '25')

      expect(onPageSizeChange).toHaveBeenCalledWith(25)
    })

    it('should call onPageSizeChange with totalItems when selecting All', async () => {
      const onPageSizeChange = vi.fn()
      render(
        <Pagination
          {...defaultProps}
          totalItems={100}
          onPageSizeChange={onPageSizeChange}
        />
      )

      await userEvent.selectOptions(screen.getByRole('combobox'), 'all')

      expect(onPageSizeChange).toHaveBeenCalledWith(100)
    })
  })

  // ============================================================================
  // Jump to Page Tests
  // ============================================================================

  describe('jump to page', () => {
    it('should have placeholder showing current page', () => {
      render(<Pagination {...defaultProps} currentPage={5} />)

      const input = screen.getByRole('spinbutton')
      expect(input).toHaveAttribute('placeholder', '5')
    })

    it('should call onPageChange when valid page entered and Go clicked', async () => {
      const onPageChange = vi.fn()
      render(<Pagination {...defaultProps} onPageChange={onPageChange} totalPages={10} />)

      const input = screen.getByRole('spinbutton')
      await userEvent.type(input, '5')
      await userEvent.click(screen.getByRole('button', { name: 'Go' }))

      expect(onPageChange).toHaveBeenCalledWith(5)
    })

    it('should call onPageChange when Enter is pressed', async () => {
      const onPageChange = vi.fn()
      render(<Pagination {...defaultProps} onPageChange={onPageChange} totalPages={10} />)

      const input = screen.getByRole('spinbutton')
      await userEvent.type(input, '7{Enter}')

      expect(onPageChange).toHaveBeenCalledWith(7)
    })

    it('should not call onPageChange for invalid page number', async () => {
      const onPageChange = vi.fn()
      render(<Pagination {...defaultProps} onPageChange={onPageChange} totalPages={10} />)

      const input = screen.getByRole('spinbutton')
      await userEvent.type(input, '15') // Greater than totalPages
      await userEvent.click(screen.getByRole('button', { name: 'Go' }))

      expect(onPageChange).not.toHaveBeenCalled()
    })

    it('should not call onPageChange for page 0', async () => {
      const onPageChange = vi.fn()
      render(<Pagination {...defaultProps} onPageChange={onPageChange} totalPages={10} />)

      const input = screen.getByRole('spinbutton')
      await userEvent.type(input, '0')
      await userEvent.click(screen.getByRole('button', { name: 'Go' }))

      expect(onPageChange).not.toHaveBeenCalled()
    })

    it('should disable Go button when input is empty', () => {
      render(<Pagination {...defaultProps} />)

      const goButton = screen.getByRole('button', { name: 'Go' })
      expect(goButton).toBeDisabled()
    })

    it('should clear input after successful navigation', async () => {
      const onPageChange = vi.fn()
      render(<Pagination {...defaultProps} onPageChange={onPageChange} totalPages={10} />)

      const input = screen.getByRole('spinbutton')
      await userEvent.type(input, '5')
      await userEvent.click(screen.getByRole('button', { name: 'Go' }))

      expect(input).toHaveValue(null)
    })
  })

  // ============================================================================
  // Accessibility Tests
  // ============================================================================

  describe('accessibility', () => {
    it('should have accessible labels on all buttons', () => {
      render(<Pagination {...defaultProps} canGoPrevious={true} />)

      expect(screen.getByRole('button', { name: 'Go to first page' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Go to previous page' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Go to next page' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Go to last page' })).toBeInTheDocument()
    })

    it('should have proper input constraints', () => {
      render(<Pagination {...defaultProps} totalPages={10} />)

      const input = screen.getByRole('spinbutton')
      expect(input).toHaveAttribute('min', '1')
      expect(input).toHaveAttribute('max', '10')
    })

    it('should associate labels with form controls', () => {
      render(<Pagination {...defaultProps} />)

      expect(screen.getByLabelText('Show:')).toBeInTheDocument()
      expect(screen.getByLabelText('Go to:')).toBeInTheDocument()
    })
  })
})
