import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';

interface SessionTimeoutProps {
  /** Time until session expires in milliseconds (default: 30 minutes) */
  sessionDuration?: number;
  /** Time before expiry to show warning in milliseconds (default: 5 minutes) */
  warningBefore?: number;
  /** Callback when session expires (defaults to redirect to home) */
  onExpire?: () => void;
  /** Callback to extend session (optional, timer resets automatically) */
  onExtend?: () => void;
  /** Whether the session is currently active */
  isActive?: boolean;
}

/**
 * Session timeout warning component
 * Shows a modal when the session is about to expire
 */
export const SessionTimeout: React.FC<SessionTimeoutProps> = ({
  sessionDuration = 30 * 60 * 1000, // 30 minutes
  warningBefore = 5 * 60 * 1000, // 5 minutes
  onExpire,
  onExtend,
  isActive = true,
}) => {
  // Default expire handler: clear localStorage and redirect to home
  const handleExpire = useCallback(() => {
    if (onExpire) {
      onExpire();
    } else {
      // Default behavior: clear session and redirect
      localStorage.removeItem('currentUser');
      window.location.hash = '#/';
      window.location.reload();
    }
  }, [onExpire]);

  // Default extend handler: just reset timers (no-op by default)
  const handleExtendCallback = useCallback(() => {
    onExtend?.();
  }, [onExtend]);
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(warningBefore);
  const expiryTimeRef = useRef<number>(Date.now() + sessionDuration);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const expiryTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const countdownRef = useRef<ReturnType<typeof setInterval>>();

  const resetTimers = useCallback(() => {
    // Clear existing timers
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    setShowWarning(false);
    expiryTimeRef.current = Date.now() + sessionDuration;

    // Set warning timer
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      setTimeRemaining(warningBefore);

      // Start countdown
      countdownRef.current = setInterval(() => {
        const remaining = expiryTimeRef.current - Date.now();
        if (remaining <= 0) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          handleExpire();
        } else {
          setTimeRemaining(remaining);
        }
      }, 1000);
    }, sessionDuration - warningBefore);

    // Set expiry timer
    expiryTimerRef.current = setTimeout(() => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      handleExpire();
    }, sessionDuration);
  }, [sessionDuration, warningBefore, handleExpire]);

  // Initialize timers when component mounts or session becomes active
  useEffect(() => {
    if (isActive) {
      resetTimers();
    }

    return () => {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [isActive, resetTimers]);

  // Reset timers on user activity
  useEffect(() => {
    if (!isActive) return;

    const handleActivity = () => {
      if (!showWarning) {
        // Only auto-extend if warning is not showing yet
        resetTimers();
      }
    };

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(event => window.addEventListener(event, handleActivity, { passive: true }));

    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
    };
  }, [isActive, showWarning, resetTimers]);

  const handleExtend = useCallback(() => {
    handleExtendCallback();
    resetTimers();
  }, [handleExtendCallback, resetTimers]);

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!showWarning || typeof window === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]"
      role="alertdialog"
      aria-labelledby="session-timeout-title"
      aria-describedby="session-timeout-description"
    >
      <div className="bg-[var(--surface)] rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-yellow-50 border-b border-yellow-200 flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 id="session-timeout-title" className="font-semibold text-yellow-800">
              Session Expiring Soon
            </h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p id="session-timeout-description" className="text-[var(--text)] mb-4">
            Your session will expire due to inactivity. You will be logged out in:
          </p>

          {/* Countdown */}
          <div className="text-center mb-6">
            <div className="text-4xl font-bold text-brand-red tabular-nums">
              {formatTime(timeRemaining)}
            </div>
            <p className="text-sm text-[var(--muted)] mt-1">minutes remaining</p>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-6">
            <div
              className="h-full bg-yellow-500 transition-all duration-1000"
              style={{ width: `${(timeRemaining / warningBefore) * 100}%` }}
            />
          </div>

          <p className="text-sm text-[var(--muted)] text-center">
            Click "Stay Logged In" to extend your session, or you'll be redirected to the login page.
          </p>
        </div>

        {/* Actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={handleExpire}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Log Out Now
          </button>
          <button
            onClick={handleExtend}
            className="px-4 py-2 text-sm font-medium text-white bg-brand-navy rounded-lg hover:bg-brand-navy/90 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2"
            autoFocus
          >
            Stay Logged In
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

/**
 * Hook for session timeout functionality without the modal
 */
export function useSessionTimeout(options: {
  sessionDuration?: number;
  warningBefore?: number;
  onExpire: () => void;
  onWarning?: () => void;
  isActive?: boolean;
}) {
  const {
    sessionDuration = 30 * 60 * 1000,
    warningBefore = 5 * 60 * 1000,
    onExpire,
    onWarning,
    isActive = true,
  } = options;

  const [isWarning, setIsWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(sessionDuration);
  const expiryTimeRef = useRef<number>(Date.now() + sessionDuration);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const expiryTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const countdownRef = useRef<ReturnType<typeof setInterval>>();

  const extend = useCallback(() => {
    // Clear existing timers
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    setIsWarning(false);
    setTimeRemaining(sessionDuration);
    expiryTimeRef.current = Date.now() + sessionDuration;

    if (!isActive) return;

    // Set warning timer
    warningTimerRef.current = setTimeout(() => {
      setIsWarning(true);
      onWarning?.();

      // Start countdown
      countdownRef.current = setInterval(() => {
        const remaining = expiryTimeRef.current - Date.now();
        if (remaining <= 0) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          onExpire();
        } else {
          setTimeRemaining(remaining);
        }
      }, 1000);
    }, sessionDuration - warningBefore);

    // Set expiry timer
    expiryTimerRef.current = setTimeout(onExpire, sessionDuration);
  }, [sessionDuration, warningBefore, onExpire, onWarning, isActive]);

  useEffect(() => {
    extend();
    return () => {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [extend]);

  return {
    isWarning,
    timeRemaining,
    extend,
    formatTimeRemaining: () => {
      const totalSeconds = Math.ceil(timeRemaining / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    },
  };
}
