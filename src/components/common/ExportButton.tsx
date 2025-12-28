import React, { useState, useCallback, useRef, useEffect } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface ExportColumn<T> {
  /** Column header text */
  header: string;
  /** Function to get the value from an item */
  getValue: (item: T) => string | number | boolean | null | undefined;
  /** Optional formatter for the value */
  format?: (value: any) => string;
}

export interface ExportButtonProps<T> {
  /** Items to export */
  items: T[];
  /** Column definitions */
  columns: ExportColumn<T>[];
  /** Filename for the downloaded file (without extension) */
  filename?: string;
  /** Button label */
  label?: string;
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'text';
  /** Additional class name */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Show count of items to export */
  showCount?: boolean;
  /** Export format options */
  formats?: ('csv' | 'json')[];
}

// ============================================================================
// CSV/JSON Generation Utilities
// ============================================================================

function escapeCsvCell(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateCsv<T>(items: T[], columns: ExportColumn<T>[]): string {
  const headers = columns.map(col => escapeCsvCell(col.header));
  const headerRow = headers.join(',');

  const dataRows = items.map(item => {
    return columns.map(col => {
      const value = col.getValue(item);
      const formatted = col.format ? col.format(value) : value;
      return escapeCsvCell(formatted);
    }).join(',');
  });

  return [headerRow, ...dataRows].join('\r\n');
}

export function generateJson<T>(items: T[], columns: ExportColumn<T>[]): string {
  const data = items.map(item => {
    const row: Record<string, any> = {};
    columns.forEach(col => {
      const value = col.getValue(item);
      row[col.header] = col.format ? col.format(value) : value;
    });
    return row;
  });
  return JSON.stringify(data, null, 2);
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// ExportButton Component
// ============================================================================

export function ExportButton<T>({
  items,
  columns,
  filename = 'export',
  label = 'Export',
  variant = 'secondary',
  className = '',
  disabled = false,
  showCount = true,
  formats = ['csv'],
}: ExportButtonProps<T>): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleExport = useCallback((format: 'csv' | 'json') => {
    setIsExporting(true);
    setIsOpen(false);

    // Use setTimeout to allow UI to update
    setTimeout(() => {
      try {
        const timestamp = new Date().toISOString().slice(0, 10);
        const fullFilename = `${filename}_${timestamp}`;

        if (format === 'csv') {
          const csv = generateCsv(items, columns);
          downloadFile(csv, `${fullFilename}.csv`, 'text/csv');
        } else {
          const json = generateJson(items, columns);
          downloadFile(json, `${fullFilename}.json`, 'application/json');
        }
      } catch (error) {
        console.error('Export failed:', error);
      } finally {
        setIsExporting(false);
      }
    }, 100);
  }, [items, columns, filename]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const variantClasses = {
    primary: 'bg-brand-navy text-brand-cream hover:bg-brand-navy/90',
    secondary: 'bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold/10',
    text: 'text-brand-navy hover:bg-brand-cream/50',
  };

  const isDisabled = disabled || items.length === 0 || isExporting;

  // If only one format, just use a button
  if (formats.length === 1) {
    return (
      <button
        onClick={() => handleExport(formats[0])}
        disabled={isDisabled}
        className={`
          inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
          transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantClasses[variant]}
          ${className}
        `}
      >
        {isExporting ? (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        )}
        <span>{label}</span>
        {showCount && items.length > 0 && (
          <span className="text-xs opacity-75">({items.length})</span>
        )}
      </button>
    );
  }

  // Multiple formats - show dropdown
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isDisabled}
        className={`
          inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
          transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantClasses[variant]}
          ${className}
        `}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        {isExporting ? (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        )}
        <span>{label}</span>
        {showCount && items.length > 0 && (
          <span className="text-xs opacity-75">({items.length})</span>
        )}
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-40 bg-[var(--surface)] border border-brand-navy/20 rounded-lg shadow-lg z-50"
          role="menu"
        >
          {formats.includes('csv') && (
            <button
              onClick={() => handleExport('csv')}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[var(--text)] hover:bg-brand-cream/50 first:rounded-t-lg"
              role="menuitem"
            >
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export as CSV
            </button>
          )}
          {formats.includes('json') && (
            <button
              onClick={() => handleExport('json')}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[var(--text)] hover:bg-brand-cream/50 last:rounded-b-lg"
              role="menuitem"
            >
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              Export as JSON
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Common Export Column Presets
// ============================================================================

export const dateFormatter = (value: any): string => {
  if (!value) return '';
  const date = new Date(value);
  return isNaN(date.getTime()) ? '' : date.toLocaleDateString();
};

export const dateTimeFormatter = (value: any): string => {
  if (!value) return '';
  const date = new Date(value);
  return isNaN(date.getTime()) ? '' : date.toLocaleString();
};

export const booleanFormatter = (value: any): string => {
  return value ? 'Yes' : 'No';
};

export const arrayFormatter = (value: any): string => {
  if (!Array.isArray(value)) return '';
  return value.join(', ');
};
