import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FeedbackAlert, EmptyState } from '../../components/common/FeedbackAlert'

describe('FeedbackAlert Component', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ============================================================================
  // Rendering Tests
  // ============================================================================

  describe('rendering', () => {
    it('should render success alert', () => {
      render(<FeedbackAlert type="success" message="Operation successful" />)

      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText('Operation successful')).toBeInTheDocument()
    })

    it('should render error alert', () => {
      render(<FeedbackAlert type="error" message="Something went wrong" />)

      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('should render warning alert', () => {
      render(<FeedbackAlert type="warning" message="Please be careful" />)

      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText('Please be careful')).toBeInTheDocument()
    })

    it('should render info alert', () => {
      render(<FeedbackAlert type="info" message="Here is some info" />)

      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText('Here is some info')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Styling Tests
  // ============================================================================

  describe('styling', () => {
    it('should apply success styles', () => {
      render(<FeedbackAlert type="success" message="Success" />)

      const alert = screen.getByRole('alert')
      expect(alert).toHaveClass('bg-green-50')
      expect(alert).toHaveClass('border-green-200')
      expect(alert).toHaveClass('text-green-800')
    })

    it('should apply error styles', () => {
      render(<FeedbackAlert type="error" message="Error" />)

      const alert = screen.getByRole('alert')
      expect(alert).toHaveClass('bg-red-50')
      expect(alert).toHaveClass('border-red-200')
      expect(alert).toHaveClass('text-red-800')
    })

    it('should apply warning styles', () => {
      render(<FeedbackAlert type="warning" message="Warning" />)

      const alert = screen.getByRole('alert')
      expect(alert).toHaveClass('bg-yellow-50')
      expect(alert).toHaveClass('border-yellow-200')
      expect(alert).toHaveClass('text-yellow-800')
    })

    it('should apply info styles', () => {
      render(<FeedbackAlert type="info" message="Info" />)

      const alert = screen.getByRole('alert')
      expect(alert).toHaveClass('bg-blue-50')
      expect(alert).toHaveClass('border-blue-200')
      expect(alert).toHaveClass('text-blue-800')
    })

    it('should apply custom className', () => {
      render(<FeedbackAlert type="info" message="Info" className="custom-class" />)

      expect(screen.getByRole('alert')).toHaveClass('custom-class')
    })
  })

  // ============================================================================
  // Dismiss Button Tests
  // ============================================================================

  describe('dismiss button', () => {
    it('should not render dismiss button when onDismiss is not provided', () => {
      render(<FeedbackAlert type="info" message="No dismiss" />)

      expect(screen.queryByLabelText('Dismiss alert')).not.toBeInTheDocument()
    })

    it('should render dismiss button when onDismiss is provided', () => {
      render(<FeedbackAlert type="info" message="Dismissable" onDismiss={() => {}} />)

      expect(screen.getByLabelText('Dismiss alert')).toBeInTheDocument()
    })

    it('should call onDismiss when dismiss button is clicked', async () => {
      vi.useRealTimers() // Use real timers for userEvent
      const onDismiss = vi.fn()
      render(<FeedbackAlert type="info" message="Click to dismiss" onDismiss={onDismiss} />)

      await userEvent.click(screen.getByLabelText('Dismiss alert'))

      expect(onDismiss).toHaveBeenCalledTimes(1)
    })
  })

  // ============================================================================
  // Auto-Dismiss Tests
  // ============================================================================

  describe('auto-dismiss', () => {
    it('should not auto-dismiss by default', async () => {
      const onDismiss = vi.fn()
      render(<FeedbackAlert type="info" message="No auto dismiss" onDismiss={onDismiss} />)

      act(() => {
        vi.advanceTimersByTime(10000)
      })

      expect(onDismiss).not.toHaveBeenCalled()
    })

    it('should auto-dismiss after default delay', async () => {
      const onDismiss = vi.fn()
      render(
        <FeedbackAlert
          type="success"
          message="Auto dismiss"
          onDismiss={onDismiss}
          autoDismiss={true}
        />
      )

      expect(onDismiss).not.toHaveBeenCalled()

      act(() => {
        vi.advanceTimersByTime(5000) // Default delay
      })

      expect(onDismiss).toHaveBeenCalledTimes(1)
    })

    it('should auto-dismiss after custom delay', async () => {
      const onDismiss = vi.fn()
      render(
        <FeedbackAlert
          type="info"
          message="Custom delay"
          onDismiss={onDismiss}
          autoDismiss={true}
          autoDismissDelay={3000}
        />
      )

      act(() => {
        vi.advanceTimersByTime(2999)
      })
      expect(onDismiss).not.toHaveBeenCalled()

      act(() => {
        vi.advanceTimersByTime(1)
      })
      expect(onDismiss).toHaveBeenCalledTimes(1)
    })

    it('should not auto-dismiss if no onDismiss handler', async () => {
      // This shouldn't throw or cause any issues
      render(
        <FeedbackAlert
          type="info"
          message="No handler"
          autoDismiss={true}
        />
      )

      act(() => {
        vi.advanceTimersByTime(10000)
      })

      // Alert should still be visible
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('should cleanup timer on unmount', () => {
      const onDismiss = vi.fn()
      const { unmount } = render(
        <FeedbackAlert
          type="info"
          message="Cleanup test"
          onDismiss={onDismiss}
          autoDismiss={true}
          autoDismissDelay={5000}
        />
      )

      unmount()

      act(() => {
        vi.advanceTimersByTime(10000)
      })

      // Should not throw or call onDismiss after unmount
      expect(onDismiss).not.toHaveBeenCalled()
    })
  })

  // ============================================================================
  // Accessibility Tests
  // ============================================================================

  describe('accessibility', () => {
    it('should have role="alert"', () => {
      render(<FeedbackAlert type="info" message="Accessible alert" />)

      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('should use aria-live="assertive" for errors', () => {
      render(<FeedbackAlert type="error" message="Error message" />)

      expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive')
    })

    it('should use aria-live="polite" for non-errors', () => {
      render(<FeedbackAlert type="success" message="Success message" />)

      expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'polite')
    })

    it('should hide icon from screen readers', () => {
      render(<FeedbackAlert type="info" message="Icon test" />)

      const svg = screen.getByRole('alert').querySelector('svg')
      expect(svg).toHaveAttribute('aria-hidden', 'true')
    })

    it('should have accessible dismiss button', () => {
      render(<FeedbackAlert type="info" message="Dismiss test" onDismiss={() => {}} />)

      const dismissButton = screen.getByLabelText('Dismiss alert')
      expect(dismissButton).toBeInTheDocument()
    })
  })
})

// ============================================================================
// EmptyState Component Tests
// ============================================================================

describe('EmptyState Component', () => {
  describe('rendering', () => {
    it('should render title', () => {
      render(<EmptyState title="No items found" />)

      expect(screen.getByText('No items found')).toBeInTheDocument()
    })

    it('should render description when provided', () => {
      render(
        <EmptyState
          title="No items"
          description="There are no items to display"
        />
      )

      expect(screen.getByText('There are no items to display')).toBeInTheDocument()
    })

    it('should not render description when not provided', () => {
      render(<EmptyState title="No items" />)

      expect(screen.queryByText(/to display/)).not.toBeInTheDocument()
    })

    it('should render custom icon', () => {
      const CustomIcon = () => <span data-testid="custom-icon">Icon</span>
      render(<EmptyState title="With icon" icon={<CustomIcon />} />)

      expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
    })

    it('should render action button when provided', () => {
      const ActionButton = () => <button>Add New</button>
      render(<EmptyState title="No items" action={<ActionButton />} />)

      expect(screen.getByRole('button', { name: 'Add New' })).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      const { container } = render(
        <EmptyState title="Custom class" className="my-custom-class" />
      )

      expect(container.firstChild).toHaveClass('my-custom-class')
    })
  })

  describe('accessibility', () => {
    it('should hide icon from screen readers', () => {
      const Icon = () => <svg data-testid="icon" />
      render(<EmptyState title="With icon" icon={<Icon />} />)

      const iconWrapper = screen.getByTestId('icon').parentElement
      expect(iconWrapper).toHaveAttribute('aria-hidden', 'true')
    })

    it('should have proper heading structure', () => {
      render(<EmptyState title="Empty State Title" />)

      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Empty State Title')
    })
  })
})
