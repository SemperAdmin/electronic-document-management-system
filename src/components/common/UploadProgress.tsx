import React from 'react';

export interface UploadItem {
  id: string;
  fileName: string;
  progress: number; // 0-100
  status: 'pending' | 'uploading' | 'complete' | 'error';
  error?: string;
}

interface UploadProgressProps {
  items: UploadItem[];
  onRetry?: (id: string) => void;
  onCancel?: (id: string) => void;
  onDismiss?: (id: string) => void;
  className?: string;
}

/**
 * Upload progress indicator showing multiple file uploads
 */
export const UploadProgress: React.FC<UploadProgressProps> = ({
  items,
  onRetry,
  onCancel,
  onDismiss,
  className = '',
}) => {
  if (items.length === 0) return null;

  const completedCount = items.filter(i => i.status === 'complete').length;
  const errorCount = items.filter(i => i.status === 'error').length;
  const uploadingCount = items.filter(i => i.status === 'uploading' || i.status === 'pending').length;

  const overallProgress = items.length > 0
    ? Math.round(items.reduce((sum, i) => sum + (i.status === 'complete' ? 100 : i.progress), 0) / items.length)
    : 0;

  return (
    <div className={`bg-[var(--surface)] border border-brand-navy/20 rounded-lg shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-3 bg-brand-cream/50 border-b border-brand-navy/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {uploadingCount > 0 ? (
            <svg className="w-5 h-5 text-brand-navy animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : errorCount > 0 ? (
            <svg className="w-5 h-5 text-brand-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <span className="font-medium text-[var(--text)]">
            {uploadingCount > 0
              ? `Uploading ${uploadingCount} file${uploadingCount !== 1 ? 's' : ''}...`
              : errorCount > 0
              ? `${errorCount} upload${errorCount !== 1 ? 's' : ''} failed`
              : `${completedCount} file${completedCount !== 1 ? 's' : ''} uploaded`}
          </span>
        </div>
        <span className="text-sm text-[var(--muted)]">{overallProgress}%</span>
      </div>

      {/* Overall progress bar */}
      <div className="h-1 bg-gray-200">
        <div
          className={`h-full transition-all duration-300 ${
            errorCount > 0 ? 'bg-brand-red' : 'bg-brand-gold'
          }`}
          style={{ width: `${overallProgress}%` }}
        />
      </div>

      {/* File list */}
      <div className="max-h-64 overflow-y-auto">
        {items.map((item) => (
          <UploadItemRow
            key={item.id}
            item={item}
            onRetry={onRetry}
            onCancel={onCancel}
            onDismiss={onDismiss}
          />
        ))}
      </div>
    </div>
  );
};

interface UploadItemRowProps {
  item: UploadItem;
  onRetry?: (id: string) => void;
  onCancel?: (id: string) => void;
  onDismiss?: (id: string) => void;
}

const UploadItemRow: React.FC<UploadItemRowProps> = ({
  item,
  onRetry,
  onCancel,
  onDismiss,
}) => {
  return (
    <div className="p-3 border-b border-brand-navy/5 last:border-b-0 flex items-center gap-3">
      {/* Status icon */}
      <div className="flex-shrink-0">
        {item.status === 'uploading' || item.status === 'pending' ? (
          <svg className="w-4 h-4 text-brand-gold animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : item.status === 'complete' ? (
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-brand-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[var(--text)] truncate" title={item.fileName}>
          {item.fileName}
        </p>
        {item.status === 'error' && item.error && (
          <p className="text-xs text-brand-red mt-0.5">{item.error}</p>
        )}
        {(item.status === 'uploading' || item.status === 'pending') && (
          <div className="mt-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-gold transition-all duration-300"
              style={{ width: `${item.progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Progress or actions */}
      <div className="flex-shrink-0 flex items-center gap-2">
        {item.status === 'uploading' && (
          <span className="text-xs text-[var(--muted)]">{item.progress}%</span>
        )}
        {item.status === 'error' && onRetry && (
          <button
            onClick={() => onRetry(item.id)}
            className="text-xs text-brand-navy hover:text-brand-red underline"
          >
            Retry
          </button>
        )}
        {(item.status === 'uploading' || item.status === 'pending') && onCancel && (
          <button
            onClick={() => onCancel(item.id)}
            className="p-1 rounded hover:bg-red-100 text-brand-red"
            aria-label={`Cancel upload of ${item.fileName}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        {(item.status === 'complete' || item.status === 'error') && onDismiss && (
          <button
            onClick={() => onDismiss(item.id)}
            className="p-1 rounded hover:bg-gray-100 text-gray-400"
            aria-label={`Dismiss ${item.fileName}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Hook for managing upload progress state
 */
export function useUploadProgress() {
  const [items, setItems] = React.useState<UploadItem[]>([]);

  const addItem = React.useCallback((id: string, fileName: string) => {
    setItems(prev => [...prev, { id, fileName, progress: 0, status: 'pending' }]);
  }, []);

  const updateProgress = React.useCallback((id: string, progress: number) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, progress, status: 'uploading' } : item
    ));
  }, []);

  const setComplete = React.useCallback((id: string) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, progress: 100, status: 'complete' } : item
    ));
  }, []);

  const setError = React.useCallback((id: string, error: string) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, status: 'error', error } : item
    ));
  }, []);

  const removeItem = React.useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const reset = React.useCallback(() => {
    setItems([]);
  }, []);

  const hasActiveUploads = items.some(i => i.status === 'uploading' || i.status === 'pending');

  return {
    items,
    addItem,
    updateProgress,
    setComplete,
    setError,
    removeItem,
    reset,
    hasActiveUploads,
  };
}
