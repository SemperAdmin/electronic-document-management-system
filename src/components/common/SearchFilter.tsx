import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface FilterState {
  search: string;
  status: string[];
  dateFrom: string;
  dateTo: string;
  originatorId: string;
}

export interface FilterOption {
  value: string;
  label: string;
}

export interface SearchFilterProps {
  /** Current filter state */
  filters: FilterState;
  /** Callback when filters change */
  onFiltersChange: (filters: FilterState) => void;
  /** Status options for dropdown */
  statusOptions?: FilterOption[];
  /** Originator options for dropdown */
  originatorOptions?: FilterOption[];
  /** Placeholder text for search input */
  searchPlaceholder?: string;
  /** Whether to show the advanced filters panel */
  showAdvanced?: boolean;
  /** Additional class name */
  className?: string;
}

export const defaultFilters: FilterState = {
  search: '',
  status: [],
  dateFrom: '',
  dateTo: '',
  originatorId: '',
};

// ============================================================================
// SearchFilter Component
// ============================================================================

export const SearchFilter: React.FC<SearchFilterProps> = ({
  filters,
  onFiltersChange,
  statusOptions = [],
  originatorOptions = [],
  searchPlaceholder = 'Search requests...',
  showAdvanced = true,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Ensure status is always an array to prevent runtime errors (memoized to avoid re-renders)
  const statusArray = useMemo(() => Array.isArray(filters.status) ? filters.status : [], [filters.status]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (statusArray.length > 0) count++;
    if (filters.dateFrom) count++;
    if (filters.dateTo) count++;
    if (filters.originatorId) count++;
    return count;
  }, [statusArray, filters.dateFrom, filters.dateTo, filters.originatorId]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, search: e.target.value });
  }, [filters, onFiltersChange]);

  const handleStatusChange = useCallback((status: string) => {
    const newStatuses = statusArray.includes(status)
      ? statusArray.filter(s => s !== status)
      : [...statusArray, status];
    onFiltersChange({ ...filters, status: newStatuses });
  }, [filters, statusArray, onFiltersChange]);

  const handleDateFromChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, dateFrom: e.target.value });
  }, [filters, onFiltersChange]);

  const handleDateToChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, dateTo: e.target.value });
  }, [filters, onFiltersChange]);

  const handleOriginatorChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ ...filters, originatorId: e.target.value });
  }, [filters, onFiltersChange]);

  const clearAllFilters = useCallback(() => {
    onFiltersChange(defaultFilters);
    searchInputRef.current?.focus();
  }, [onFiltersChange]);

  const clearSearch = useCallback(() => {
    onFiltersChange({ ...filters, search: '' });
    searchInputRef.current?.focus();
  }, [filters, onFiltersChange]);

  // Keyboard shortcut for search focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const hasActiveFilters = filters.search || activeFilterCount > 0;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={filters.search}
            onChange={handleSearchChange}
            placeholder={searchPlaceholder}
            className="block w-full pl-10 pr-10 py-2 border border-brand-navy/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold bg-[var(--surface)] text-[var(--text)]"
            aria-label="Search"
          />
          {filters.search && (
            <button
              onClick={clearSearch}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <div className="absolute inset-y-0 right-8 flex items-center pointer-events-none text-xs text-gray-400">
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 bg-gray-100 rounded border border-gray-200 font-mono">⌘K</kbd>
          </div>
        </div>

        {showAdvanced && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors
              ${isExpanded || activeFilterCount > 0
                ? 'bg-brand-gold/10 border-brand-gold text-brand-navy'
                : 'border-brand-navy/30 text-[var(--text)] hover:bg-brand-cream/50'
              }
            `}
            aria-expanded={isExpanded}
            aria-controls="filter-panel"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-brand-navy rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>
        )}

        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="flex items-center gap-1 px-3 py-2 text-sm text-brand-red hover:text-brand-red-2 hover:bg-red-50 rounded-lg transition-colors"
            aria-label="Clear all filters"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="hidden sm:inline">Clear</span>
          </button>
        )}
      </div>

      {/* Advanced Filters Panel */}
      {showAdvanced && isExpanded && (
        <div
          id="filter-panel"
          className="p-4 bg-brand-cream/30 border border-brand-navy/10 rounded-lg space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status Filter */}
            {statusOptions.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">Status</label>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {statusOptions.map(option => (
                    <label
                      key={option.value}
                      className="flex items-center gap-2 p-2 rounded hover:bg-white/50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={statusArray.includes(option.value)}
                        onChange={() => handleStatusChange(option.value)}
                        className="h-4 w-4 text-brand-navy border-gray-300 rounded focus:ring-brand-gold"
                      />
                      <span className="text-sm text-[var(--text)]">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">Date Range</label>
              <div className="space-y-2">
                <div>
                  <label className="sr-only">From date</label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={handleDateFromChange}
                    className="block w-full px-3 py-2 border border-brand-navy/30 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold"
                    aria-label="From date"
                  />
                </div>
                <div>
                  <label className="sr-only">To date</label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={handleDateToChange}
                    min={filters.dateFrom}
                    className="block w-full px-3 py-2 border border-brand-navy/30 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold"
                    aria-label="To date"
                  />
                </div>
              </div>
            </div>

            {/* Originator Filter */}
            {originatorOptions.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">Originator</label>
                <select
                  value={filters.originatorId}
                  onChange={handleOriginatorChange}
                  className="block w-full px-3 py-2 border border-brand-navy/30 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold"
                  aria-label="Filter by originator"
                >
                  <option value="">All originators</option>
                  {originatorOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Active Filters Summary */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-brand-navy/10">
              <span className="text-sm text-[var(--muted)]">Active filters:</span>
              {statusArray.map(status => {
                const option = statusOptions.find(o => o.value === status);
                return (
                  <span
                    key={status}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-brand-navy/10 text-brand-navy rounded-full text-xs"
                  >
                    {option?.label || status}
                    <button
                      onClick={() => handleStatusChange(status)}
                      className="hover:text-brand-red"
                      aria-label={`Remove ${option?.label || status} filter`}
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                );
              })}
              {filters.dateFrom && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-brand-navy/10 text-brand-navy rounded-full text-xs">
                  From: {filters.dateFrom}
                  <button
                    onClick={() => onFiltersChange({ ...filters, dateFrom: '' })}
                    className="hover:text-brand-red"
                    aria-label="Remove from date filter"
                  >
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}
              {filters.dateTo && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-brand-navy/10 text-brand-navy rounded-full text-xs">
                  To: {filters.dateTo}
                  <button
                    onClick={() => onFiltersChange({ ...filters, dateTo: '' })}
                    className="hover:text-brand-red"
                    aria-label="Remove to date filter"
                  >
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}
              {filters.originatorId && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-brand-navy/10 text-brand-navy rounded-full text-xs">
                  {originatorOptions.find(o => o.value === filters.originatorId)?.label || 'Originator'}
                  <button
                    onClick={() => onFiltersChange({ ...filters, originatorId: '' })}
                    className="hover:text-brand-red"
                    aria-label="Remove originator filter"
                  >
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Hook for filter logic
// ============================================================================

export interface UseSearchFilterOptions<T> {
  /** Array of items to filter */
  items: T[];
  /** Function to get searchable text from an item */
  getSearchText: (item: T) => string;
  /** Function to get the status of an item */
  getStatus?: (item: T) => string;
  /** Function to get the date of an item (as ISO string or Date) */
  getDate?: (item: T) => string | Date | undefined;
  /** Function to get the originator ID of an item */
  getOriginatorId?: (item: T) => string;
}

export function useSearchFilter<T>(
  filters: FilterState,
  options: UseSearchFilterOptions<T>
): T[] {
  return useMemo(() => {
    // Ensure items is always an array
    let result = Array.isArray(options.items) ? options.items : [];
    // Ensure status is always an array
    const statusArray = Array.isArray(filters.status) ? filters.status : [];

    // Full-text search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(item =>
        options.getSearchText(item).toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (statusArray.length > 0 && options.getStatus) {
      result = result.filter(item =>
        statusArray.includes(options.getStatus!(item))
      );
    }

    // Date range filter
    if ((filters.dateFrom || filters.dateTo) && options.getDate) {
      result = result.filter(item => {
        const itemDate = options.getDate!(item);
        if (!itemDate) return false;

        const date = new Date(itemDate);
        if (isNaN(date.getTime())) return false;

        if (filters.dateFrom) {
          const fromDate = new Date(filters.dateFrom);
          if (date < fromDate) return false;
        }

        if (filters.dateTo) {
          const toDate = new Date(filters.dateTo);
          toDate.setHours(23, 59, 59, 999); // Include the entire day
          if (date > toDate) return false;
        }

        return true;
      });
    }

    // Originator filter
    if (filters.originatorId && options.getOriginatorId) {
      result = result.filter(item =>
        options.getOriginatorId!(item) === filters.originatorId
      );
    }

    return result;
  }, [filters, options]);
}
