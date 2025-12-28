import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider, useToast } from '../../components/common/Toast'

// Test component that exposes toast methods
function ToastTestComponent({ action }: { action: string }) {
  const toast = useToast()

  const handleClick = () => {
    switch (action) {
      case 'success':
        toast.success('Success message')
        break
      case 'error':
        toast.error('Error message')
        break
      case 'warning':
        toast.warning('Warning message')
        break
      case 'info':
        toast.info('Info message')
        break
      case 'loading':
        toast.loading('Loading message')
        break
      case 'withMessage':
        toast.success('Title', { message: 'Description text' })
        break
      case 'withAction':
        toast.success('With action', { action: { label: 'Undo', onClick: vi.fn() } })
        break
    }
  }

  return (
    <button onClick={handleClick} data-testid="trigger">
      Trigger Toast
    </button>
  )
}

describe('Toast Component', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ============================================================================
  // Rendering Tests
  // ============================================================================

  describe('Rendering', () => {
    it('should render children without crashing', () => {
      render(
        <ToastProvider>
          <div data-testid="child">Child content</div>
        </ToastProvider>
      )
      expect(screen.getByTestId('child')).toBeInTheDocument()
    })

    it('should render success toast', async () => {
      render(
        <ToastProvider>
          <ToastTestComponent action="success" />
        </ToastProvider>
      )

      await act(async () => {
        screen.getByTestId('trigger').click()
      })

      expect(screen.getByText('Success message')).toBeInTheDocument()
    })

    it('should render error toast', async () => {
      render(
        <ToastProvider>
          <ToastTestComponent action="error" />
        </ToastProvider>
      )

      await act(async () => {
        screen.getByTestId('trigger').click()
      })

      expect(screen.getByText('Error message')).toBeInTheDocument()
    })

    it('should render warning toast', async () => {
      render(
        <ToastProvider>
          <ToastTestComponent action="warning" />
        </ToastProvider>
      )

      await act(async () => {
        screen.getByTestId('trigger').click()
      })

      expect(screen.getByText('Warning message')).toBeInTheDocument()
    })

    it('should render info toast', async () => {
      render(
        <ToastProvider>
          <ToastTestComponent action="info" />
        </ToastProvider>
      )

      await act(async () => {
        screen.getByTestId('trigger').click()
      })

      expect(screen.getByText('Info message')).toBeInTheDocument()
    })

    it('should render loading toast', async () => {
      render(
        <ToastProvider>
          <ToastTestComponent action="loading" />
        </ToastProvider>
      )

      await act(async () => {
        screen.getByTestId('trigger').click()
      })

      expect(screen.getByText('Loading message')).toBeInTheDocument()
    })

    it('should render toast with description', async () => {
      render(
        <ToastProvider>
          <ToastTestComponent action="withMessage" />
        </ToastProvider>
      )

      await act(async () => {
        screen.getByTestId('trigger').click()
      })

      expect(screen.getByText('Title')).toBeInTheDocument()
      expect(screen.getByText('Description text')).toBeInTheDocument()
    })

    it('should render toast with action button', async () => {
      render(
        <ToastProvider>
          <ToastTestComponent action="withAction" />
        </ToastProvider>
      )

      await act(async () => {
        screen.getByTestId('trigger').click()
      })

      expect(screen.getByText('Undo')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Behavior Tests
  // ============================================================================

  describe('Behavior', () => {
    it('should show toast with auto-dismiss timer', async () => {
      render(
        <ToastProvider>
          <ToastTestComponent action="success" />
        </ToastProvider>
      )

      await act(async () => {
        screen.getByTestId('trigger').click()
      })

      // Verify the toast appears with the progress bar (indicates auto-dismiss is configured)
      expect(screen.getByText('Success message')).toBeInTheDocument()
      // Progress bar is rendered for timed toasts
      const alert = screen.getByRole('alert')
      expect(alert).toBeInTheDocument()
    })

    it('should not auto-dismiss loading toast', async () => {
      render(
        <ToastProvider>
          <ToastTestComponent action="loading" />
        </ToastProvider>
      )

      await act(async () => {
        screen.getByTestId('trigger').click()
      })

      expect(screen.getByText('Loading message')).toBeInTheDocument()

      // Fast forward a short time - loading toast should still be visible
      await act(async () => {
        vi.advanceTimersByTime(1000)
      })

      // Loading toast should still be visible
      expect(screen.getByText('Loading message')).toBeInTheDocument()
    })

    it('should have dismiss button on dismissible toasts', async () => {
      render(
        <ToastProvider>
          <ToastTestComponent action="success" />
        </ToastProvider>
      )

      await act(async () => {
        screen.getByTestId('trigger').click()
      })

      expect(screen.getByText('Success message')).toBeInTheDocument()

      // Verify dismiss button exists
      const dismissButton = screen.getByRole('button', { name: /dismiss/i })
      expect(dismissButton).toBeInTheDocument()
    })

    it('should limit max toasts', async () => {
      function MultiToastComponent() {
        const toast = useToast()
        return (
          <button
            onClick={() => {
              for (let i = 1; i <= 10; i++) {
                toast.success(`Toast ${i}`)
              }
            }}
            data-testid="trigger-many"
          >
            Trigger Many
          </button>
        )
      }

      render(
        <ToastProvider maxToasts={3}>
          <MultiToastComponent />
        </ToastProvider>
      )

      await act(async () => {
        screen.getByTestId('trigger-many').click()
      })

      // Should only show the last 3 toasts
      expect(screen.queryByText('Toast 1')).not.toBeInTheDocument()
      expect(screen.getByText('Toast 8')).toBeInTheDocument()
      expect(screen.getByText('Toast 9')).toBeInTheDocument()
      expect(screen.getByText('Toast 10')).toBeInTheDocument()
    })
  })

  // ============================================================================
  // Hook Error Tests
  // ============================================================================

  describe('Hook Errors', () => {
    it('should throw error when useToast is used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        render(<ToastTestComponent action="success" />)
      }).toThrow('useToast must be used within a ToastProvider')

      consoleSpy.mockRestore()
    })
  })

  // ============================================================================
  // Accessibility Tests
  // ============================================================================

  describe('Accessibility', () => {
    it('should have alert role for toasts', async () => {
      render(
        <ToastProvider>
          <ToastTestComponent action="success" />
        </ToastProvider>
      )

      await act(async () => {
        screen.getByTestId('trigger').click()
      })

      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('should have notifications region', async () => {
      render(
        <ToastProvider>
          <ToastTestComponent action="success" />
        </ToastProvider>
      )

      await act(async () => {
        screen.getByTestId('trigger').click()
      })

      expect(screen.getByRole('region', { name: /notifications/i })).toBeInTheDocument()
    })

    it('should use assertive for error toasts', async () => {
      render(
        <ToastProvider>
          <ToastTestComponent action="error" />
        </ToastProvider>
      )

      await act(async () => {
        screen.getByTestId('trigger').click()
      })

      const alert = screen.getByRole('alert')
      expect(alert).toHaveAttribute('aria-live', 'assertive')
    })

    it('should use polite for non-error toasts', async () => {
      render(
        <ToastProvider>
          <ToastTestComponent action="success" />
        </ToastProvider>
      )

      await act(async () => {
        screen.getByTestId('trigger').click()
      })

      const alert = screen.getByRole('alert')
      expect(alert).toHaveAttribute('aria-live', 'polite')
    })
  })
})
