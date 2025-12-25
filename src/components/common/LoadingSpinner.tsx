import React, { memo } from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-3',
};

/**
 * Reusable loading spinner component with optional message
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = memo(function LoadingSpinner({
  size = 'md',
  message,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className={`animate-spin rounded-full border-brand-navy border-t-transparent ${sizeClasses[size]}`}
        aria-hidden="true"
      />
      {message && (
        <span className="text-sm text-[var(--muted)]">{message}</span>
      )}
      <span className="sr-only">{message || 'Loading...'}</span>
    </div>
  );
});

interface FullPageLoaderProps {
  message?: string;
}

/**
 * Full page loading overlay
 */
export const FullPageLoader: React.FC<FullPageLoaderProps> = memo(function FullPageLoader({
  message = 'Loading...',
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
      <LoadingSpinner size="lg" message={message} />
    </div>
  );
});

interface SkeletonProps {
  className?: string;
  count?: number;
}

/**
 * Skeleton loader for content placeholders
 */
export const Skeleton: React.FC<SkeletonProps> = memo(function Skeleton({
  className = 'h-4 w-full',
  count = 1,
}) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`bg-gray-200 rounded animate-pulse ${className}`}
          aria-hidden="true"
        />
      ))}
    </>
  );
});
