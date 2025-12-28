import React, { useState, useCallback, useRef } from 'react';
import { validateFile, validateFiles, MAX_FILES_PER_UPLOAD, ALLOWED_FILE_TYPES, FILE_TYPE_LABELS } from '@/lib/validation';

export interface FileDropzoneProps {
  /** Currently selected files */
  files: File[];
  /** Callback when files are added */
  onFilesAdded: (files: File[]) => void;
  /** Callback when a file is removed */
  onFileRemoved: (index: number) => void;
  /** Maximum number of files allowed */
  maxFiles?: number;
  /** Whether the dropzone is disabled */
  disabled?: boolean;
  /** Custom class name */
  className?: string;
  /** Compact mode (smaller UI) */
  compact?: boolean;
}

/**
 * Drag-and-drop file upload component with validation
 */
export const FileDropzone: React.FC<FileDropzoneProps> = ({
  files,
  onFilesAdded,
  onFileRemoved,
  maxFiles = MAX_FILES_PER_UPLOAD,
  disabled = false,
  className = '',
  compact = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const processFiles = useCallback((newFiles: File[]) => {
    if (disabled) return;

    setError(null);

    // Check if adding files would exceed limit
    const remainingSlots = maxFiles - files.length;
    if (remainingSlots <= 0) {
      setError(`Maximum ${maxFiles} files allowed. Remove some files first.`);
      return;
    }

    if (newFiles.length > remainingSlots) {
      setError(`Can only add ${remainingSlots} more file(s). Selected ${newFiles.length}.`);
      newFiles = newFiles.slice(0, remainingSlots);
    }

    // Validate files
    const validFiles: File[] = [];
    const errors: string[] = [];

    for (const file of newFiles) {
      const result = validateFile(file);
      if (result.valid) {
        validFiles.push(file);
      } else {
        errors.push(result.errors[0]);
      }
    }

    if (validFiles.length > 0) {
      onFilesAdded(validFiles);
    }

    if (errors.length > 0) {
      setError(errors.slice(0, 2).join(' '));
    }
  }, [disabled, files.length, maxFiles, onFilesAdded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    dragCounter.current = 0;

    if (disabled) return;

    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  }, [disabled, processFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
    processFiles(selectedFiles);
    // Reset input so same file can be selected again
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [processFiles]);

  const handleClick = useCallback(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.click();
    }
  }, [disabled]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
      e.preventDefault();
      inputRef.current?.click();
    }
  }, [disabled]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type: string): string => {
    if (type.includes('pdf')) return 'PDF';
    if (type.includes('word') || type.includes('document')) return 'DOC';
    if (type.includes('excel') || type.includes('spreadsheet')) return 'XLS';
    if (type.includes('image')) return 'IMG';
    if (type.includes('text')) return 'TXT';
    return 'FILE';
  };

  const acceptedTypes = ALLOWED_FILE_TYPES.join(',');
  const typeLabels = [...new Set(Object.values(FILE_TYPE_LABELS))].join(', ');

  return (
    <div className={className}>
      {/* Drop Zone */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        aria-label="Drop files here or click to browse"
        aria-disabled={disabled}
        className={`
          relative border-2 border-dashed rounded-lg transition-all cursor-pointer
          ${compact ? 'p-4' : 'p-6'}
          ${isDragOver
            ? 'border-brand-gold bg-brand-gold/10'
            : 'border-brand-navy/30 hover:border-brand-gold hover:bg-brand-cream/50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2
        `}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={acceptedTypes}
          onChange={handleFileInput}
          className="hidden"
          disabled={disabled}
          aria-hidden="true"
        />

        <div className={`flex flex-col items-center justify-center ${compact ? 'gap-2' : 'gap-3'}`}>
          {/* Upload Icon */}
          <div className={`${compact ? 'w-8 h-8' : 'w-12 h-12'} text-brand-navy/60`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
            </svg>
          </div>

          {/* Instructions */}
          <div className="text-center">
            <p className={`font-medium text-[var(--text)] ${compact ? 'text-sm' : 'text-base'}`}>
              {isDragOver ? 'Drop files here' : 'Drag & drop files here'}
            </p>
            <p className={`text-[var(--muted)] ${compact ? 'text-xs' : 'text-sm'}`}>
              or <span className="text-brand-gold font-medium">browse</span> to select
            </p>
          </div>

          {/* File type hint */}
          {!compact && (
            <p className="text-xs text-[var(--muted)] text-center max-w-xs">
              Supported: {typeLabels}
              <br />
              Max {maxFiles} files, 25MB each
            </p>
          )}
        </div>

        {/* Drag overlay indicator */}
        {isDragOver && (
          <div className="absolute inset-0 bg-brand-gold/20 rounded-lg flex items-center justify-center pointer-events-none">
            <span className="text-brand-gold font-semibold">Drop to upload</span>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg" role="alert">
          <p className="text-sm text-red-700 flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </p>
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-sm font-medium text-[var(--text)]">
            {files.length} file{files.length !== 1 ? 's' : ''} selected
          </p>
          <ul className="space-y-1" role="list" aria-label="Selected files">
            {files.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center gap-3 p-2 bg-brand-cream/50 rounded-lg border border-brand-navy/10 group"
              >
                {/* File type badge */}
                <span className="flex-shrink-0 w-10 h-10 rounded bg-brand-navy/10 flex items-center justify-center text-xs font-bold text-brand-navy">
                  {getFileIcon(file.type)}
                </span>

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text)] truncate" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {formatFileSize(file.size)}
                  </p>
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFileRemoved(index);
                  }}
                  className="flex-shrink-0 p-1 rounded text-brand-red hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={`Remove ${file.name}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Files remaining hint */}
      {files.length > 0 && files.length < maxFiles && (
        <p className="mt-2 text-xs text-[var(--muted)]">
          You can add {maxFiles - files.length} more file{maxFiles - files.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
};
