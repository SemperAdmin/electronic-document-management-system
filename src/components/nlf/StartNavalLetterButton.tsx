import React, { useState, useCallback } from 'react';
import { getAccessToken } from '@/lib/auth';
import { upsertRequest } from '@/lib/db';
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/supabase';
import { UserRecord } from '@/types';

// Get NLF URL from environment variable
const NLF_BASE_URL = (import.meta as any)?.env?.VITE_NLF_URL || 'https://semperadmin.github.io/naval-letter-formatter';

interface StartNavalLetterButtonProps {
  /** Current user creating the request */
  currentUser: UserRecord | null;
  /** Callback when request is created and NLF is launched */
  onRequestCreated?: (requestId: string) => void;
  /** Optional additional class name */
  className?: string;
}

/**
 * Button to start a new request by creating a naval letter.
 * Creates a draft request, then launches NLF to compose the letter.
 * When NLF saves, it updates the request with subject, SSIC, etc.
 */
export function StartNavalLetterButton({
  currentUser,
  onRequestCreated,
  className = '',
}: StartNavalLetterButtonProps): React.ReactElement {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = useCallback(async () => {
    if (!currentUser || isCreating) return;

    setIsCreating(true);
    setError(null);

    try {
      // Get the current auth token (optional - may not have Supabase session)
      const token = await getAccessToken();

      // Generate a new request ID
      const requestId = crypto.randomUUID();

      // Create a draft request
      const result = await upsertRequest({
        id: requestId,
        subject: '(Draft - Naval Letter in Progress)',
        uploadedById: currentUser.id,
        unitUic: currentUser.unitUic,
        documentIds: [],
        createdAt: new Date().toISOString(),
        currentStage: 'ORIGINATOR_REVIEW',
        activity: [{
          actor: `${currentUser.rank || ''} ${currentUser.lastName || ''}, ${currentUser.firstName || ''}`.trim(),
          actorRole: currentUser.role,
          timestamp: new Date().toISOString(),
          action: 'Created draft for Naval Letter',
        }],
      });

      if (!result.ok) {
        setError(result.error || 'Failed to create draft request');
        setIsCreating(false);
        return;
      }

      // Build the NLF launch URL with context parameters
      const supabaseUrl = getSupabaseUrl();
      const supabaseKey = getSupabaseAnonKey();

      const params = new URLSearchParams({
        edmsId: requestId,
        unitCode: currentUser.unitUic || '',
        returnUrl: window.location.href,  // URLSearchParams handles encoding
      });

      // Include Supabase credentials so NLF can save back to EDMS
      if (supabaseUrl) {
        params.set('supabaseUrl', supabaseUrl);
      }
      if (supabaseKey) {
        params.set('supabaseKey', supabaseKey);
      }

      // Only include token if available (may not have Supabase session)
      if (token) {
        params.set('token', token);
      }

      const launchUrl = `${NLF_BASE_URL}?${params.toString()}`;

      // Notify parent that request was created
      if (onRequestCreated) {
        onRequestCreated(requestId);
      }

      // Open NLF in a new tab
      window.open(launchUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Failed to create draft and launch NLF:', err);
      setError('Failed to start naval letter');
    } finally {
      setIsCreating(false);
    }
  }, [currentUser, onRequestCreated, isCreating]);

  const isDisabled = !currentUser || isCreating;

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
        aria-describedby={error ? 'start-nlf-error' : undefined}
      >
        {isCreating ? (
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
          // Mail/letter icon
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        )}
        <span>{isCreating ? 'Creating...' : 'Start from Naval Letter'}</span>
      </button>

      {error && (
        <p
          id="start-nlf-error"
          className="mt-1 text-xs text-red-600"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}

export default StartNavalLetterButton;
