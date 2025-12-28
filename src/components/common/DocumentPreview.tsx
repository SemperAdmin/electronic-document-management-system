import React, { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';

// ============================================================================
// File Type Icons
// ============================================================================

export type FileIconType = 'pdf' | 'doc' | 'xls' | 'img' | 'txt' | 'file';

const fileTypeColors: Record<FileIconType, string> = {
  pdf: 'bg-red-100 text-red-700 border-red-200',
  doc: 'bg-blue-100 text-blue-700 border-blue-200',
  xls: 'bg-green-100 text-green-700 border-green-200',
  img: 'bg-purple-100 text-purple-700 border-purple-200',
  txt: 'bg-gray-100 text-gray-700 border-gray-200',
  file: 'bg-gray-100 text-gray-700 border-gray-200',
};

const fileTypeLabels: Record<FileIconType, string> = {
  pdf: 'PDF',
  doc: 'DOC',
  xls: 'XLS',
  img: 'IMG',
  txt: 'TXT',
  file: 'FILE',
};

export function getFileType(mimeType: string, fileName?: string): FileIconType {
  const type = mimeType.toLowerCase();
  const name = (fileName || '').toLowerCase();

  if (type.includes('pdf') || name.endsWith('.pdf')) return 'pdf';
  // Check Excel before Word since spreadsheetml.document contains 'document'
  if (type.includes('excel') || type.includes('spreadsheet') || name.endsWith('.xls') || name.endsWith('.xlsx')) return 'xls';
  if (type.includes('word') || type.includes('wordprocessingml') || name.endsWith('.doc') || name.endsWith('.docx')) return 'doc';
  if (type.includes('image') || /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(name)) return 'img';
  if (type.includes('text') || name.endsWith('.txt')) return 'txt';
  return 'file';
}

export function canPreview(mimeType: string, fileName?: string): boolean {
  const fileType = getFileType(mimeType, fileName);
  return fileType === 'pdf' || fileType === 'img';
}

interface FileTypeIconProps {
  type: string;
  fileName?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const FileTypeIcon: React.FC<FileTypeIconProps> = ({
  type,
  fileName,
  size = 'md',
  className = '',
}) => {
  const fileType = getFileType(type, fileName);
  const colors = fileTypeColors[fileType];
  const label = fileTypeLabels[fileType];

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-xs',
    lg: 'w-12 h-12 text-sm',
  };

  return (
    <div
      className={`
        ${sizeClasses[size]}
        ${colors}
        rounded border flex items-center justify-center font-bold
        ${className}
      `}
      role="img"
      aria-label={`${label} file`}
    >
      {label}
    </div>
  );
};

// ============================================================================
// Document Preview Modal
// ============================================================================

interface DocumentPreviewProps {
  /** URL of the document to preview */
  url: string;
  /** File name for display */
  fileName: string;
  /** MIME type of the file */
  mimeType: string;
  /** File size in bytes */
  fileSize?: number;
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Optional callback to download the file */
  onDownload?: () => void;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  url,
  fileName,
  mimeType,
  fileSize,
  isOpen,
  onClose,
  onDownload,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);

  const fileType = getFileType(mimeType, fileName);
  const previewable = canPreview(mimeType, fileName);

  // Reset state when URL changes
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    setZoom(100);
  }, [url]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setError('Failed to load document preview');
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === '+' || e.key === '=') {
      setZoom(prev => Math.min(prev + 25, 200));
    } else if (e.key === '-') {
      setZoom(prev => Math.max(prev - 25, 50));
    } else if (e.key === '0') {
      setZoom(100);
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!isOpen || typeof window === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-title"
    >
      <div
        className="bg-[var(--surface)] rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] mx-4 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3 min-w-0">
            <FileTypeIcon type={mimeType} fileName={fileName} size="md" />
            <div className="min-w-0">
              <h2 id="preview-title" className="font-medium text-[var(--text)] truncate">
                {fileName}
              </h2>
              {fileSize && (
                <p className="text-sm text-[var(--muted)]">{formatFileSize(fileSize)}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom controls for images */}
            {fileType === 'img' && (
              <div className="flex items-center gap-1 mr-2">
                <button
                  onClick={() => setZoom(prev => Math.max(prev - 25, 50))}
                  className="p-1.5 rounded hover:bg-gray-200 text-gray-600"
                  aria-label="Zoom out"
                  disabled={zoom <= 50}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
                <span className="text-sm text-gray-600 w-12 text-center">{zoom}%</span>
                <button
                  onClick={() => setZoom(prev => Math.min(prev + 25, 200))}
                  className="p-1.5 rounded hover:bg-gray-200 text-gray-600"
                  aria-label="Zoom in"
                  disabled={zoom >= 200}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                <button
                  onClick={() => setZoom(100)}
                  className="p-1.5 rounded hover:bg-gray-200 text-gray-600 text-xs"
                  aria-label="Reset zoom"
                >
                  Reset
                </button>
              </div>
            )}

            {/* Download button */}
            {onDownload ? (
              <button
                onClick={onDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-navy text-brand-cream rounded-lg hover:bg-brand-navy/90 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </button>
            ) : (
              <a
                href={url}
                download={fileName}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-navy text-brand-cream rounded-lg hover:bg-brand-navy/90 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </a>
            )}

            {/* Open in new tab */}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded hover:bg-gray-200 text-gray-600"
              aria-label="Open in new tab"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-gray-200 text-gray-600"
              aria-label="Close preview"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-auto bg-gray-100 relative min-h-[400px]">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-brand-navy/20 border-t-brand-navy rounded-full animate-spin" />
                <p className="text-sm text-[var(--muted)]">Loading preview...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-6">
                <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <p className="text-[var(--text)] font-medium mb-1">{error}</p>
                <p className="text-sm text-[var(--muted)]">Try downloading the file instead</p>
              </div>
            </div>
          )}

          {!previewable ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-6">
                <FileTypeIcon type={mimeType} fileName={fileName} size="lg" className="mx-auto mb-4" />
                <p className="text-[var(--text)] font-medium mb-1">Preview not available</p>
                <p className="text-sm text-[var(--muted)] mb-4">
                  This file type cannot be previewed in the browser
                </p>
                <a
                  href={url}
                  download={fileName}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-brand-navy text-brand-cream rounded-lg hover:bg-brand-navy/90"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download File
                </a>
              </div>
            </div>
          ) : fileType === 'pdf' ? (
            <iframe
              src={`${url}#toolbar=1&navpanes=0`}
              className="w-full h-full min-h-[500px]"
              title={`Preview of ${fileName}`}
              onLoad={handleLoad}
              onError={handleError}
            />
          ) : fileType === 'img' ? (
            <div className="flex items-center justify-center p-4 min-h-[400px]">
              <img
                src={url}
                alt={fileName}
                className="max-w-full max-h-full object-contain transition-transform duration-200"
                style={{ transform: `scale(${zoom / 100})` }}
                onLoad={handleLoad}
                onError={handleError}
              />
            </div>
          ) : null}
        </div>

        {/* Footer with keyboard shortcuts hint */}
        <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 text-xs text-[var(--muted)] flex items-center justify-between">
          <span>Press ESC to close</span>
          {fileType === 'img' && <span>+/- to zoom, 0 to reset</span>}
        </div>
      </div>
    </div>,
    document.body
  );
};

// ============================================================================
// Hook for managing preview state
// ============================================================================

interface PreviewState {
  url: string;
  fileName: string;
  mimeType: string;
  fileSize?: number;
}

export function useDocumentPreview() {
  const [previewState, setPreviewState] = useState<PreviewState | null>(null);

  const openPreview = useCallback((state: PreviewState) => {
    setPreviewState(state);
  }, []);

  const closePreview = useCallback(() => {
    setPreviewState(null);
  }, []);

  return {
    isOpen: previewState !== null,
    previewState,
    openPreview,
    closePreview,
  };
}
