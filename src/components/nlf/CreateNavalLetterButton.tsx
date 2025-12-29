import React, { useState, useCallback } from 'react';
import { getAccessToken } from '@/lib/auth';
import { CreateNavalLetterButtonProps } from '@/types/nlf';

// Get NLF URL from environment variable
const NLF_BASE_URL = (import.meta as any)?.env?.VITE_NLF_URL || 'https://semperadmin.github.io/naval-letter-formatter';

/**
 * Button component to launch the Naval Letter Formatter from a request.
 * Opens NLF in a new tab with the request context parameters.
 */
export function CreateNavalLetterButton({
  requestId,
  userUnitCode,
  onLaunch,
  className = '',
  disabled = false,
}: CreateNavalLetterButtonProps): React.ReactElement {
  const [isLaunching, setIsLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = useCallback(async () => {
    if (disabled || isLaunching) return;

    setIsLaunching(true);
    setError(null);

    try {
      // Get the current auth token
      const token = await getAccessToken();
      if (!token) {
        setError('No active session. Please log in again.');
        setIsLaunching(false);
        return;
      }

      // Build the NLF launch URL with context parameters
      const returnUrl = encodeURIComponent(window.location.href);
      const params = new URLSearchParams({
        edmsId: requestId,
        unitCode: userUnitCode || '',
        returnUrl: returnUrl,
        token: token,
      });

      const launchUrl = `${NLF_BASE_URL}?${params.toString()}`;

      // Call the onLaunch callback if provided
      if (onLaunch) {
        onLaunch();
      }

      // Open NLF in a new tab
      window.open(launchUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Failed to launch Naval Letter Formatter:', err);
      setError('Failed to launch Naval Letter Formatter');
    } finally {
      setIsLaunching(false);
    }
  }, [requestId, userUnitCode, onLaunch, disabled, isLaunching]);

  const isDisabled = disabled || isLaunching;

  return (
    <div className="inline-flex flex-col items-start">
      <button
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        className={`
          inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
          bg-brand-navy text-brand-cream
          hover:brightness-110
          focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors
          ${className}
        `}
        aria-describedby={error ? 'nlf-error' : undefined}
      >
        {isLaunching ? (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : (
          // Document with plus icon
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        )}
        <span>{isLaunching ? 'Launching...' : 'Create Naval Letter'}</span>
      </button>

      {error && (
        <p
          id="nlf-error"
          className="mt-1 text-xs text-red-600"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}

export default CreateNavalLetterButton;
