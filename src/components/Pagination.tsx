import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  startIndex: number;
  endIndex: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onNext: () => void;
  onPrevious: () => void;
  onFirst: () => void;
  onLast: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
  pageSizeOptions?: number[];
  showPageSizeSelector?: boolean;
}

/**
 * Reusable pagination component
 *
 * Displays:
 * - Page navigation buttons (First, Previous, Next, Last)
 * - Current page indicator (Showing X-Y of Z items)
 * - Page size selector (25, 50, 100, All)
 * - Jump to page input
 */
export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  startIndex,
  endIndex,
  onPageChange,
  onPageSizeChange,
  onNext,
  onPrevious,
  onFirst,
  onLast,
  canGoNext,
  canGoPrevious,
  pageSizeOptions = [10, 25, 50, 100],
  showPageSizeSelector = true,
}) => {
  const [jumpToPage, setJumpToPage] = React.useState('');

  const handleJumpToPage = () => {
    const page = parseInt(jumpToPage, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      onPageChange(page);
      setJumpToPage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleJumpToPage();
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2 bg-gray-50 rounded-lg border border-gray-200">
      {/* Page info */}
      <div className="text-sm text-gray-600">
        Showing <span className="font-semibold">{startIndex}</span> to{' '}
        <span className="font-semibold">{endIndex}</span> of{' '}
        <span className="font-semibold">{totalItems}</span> items
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onFirst}
          disabled={!canGoPrevious}
          className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="First page"
          aria-label="Go to first page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        <button
          onClick={onPrevious}
          disabled={!canGoPrevious}
          className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Previous page"
          aria-label="Go to previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Current page indicator */}
        <div className="flex items-center gap-2 px-3">
          <span className="text-sm text-gray-600">
            Page{' '}
            <span className="font-semibold">
              {currentPage} / {totalPages}
            </span>
          </span>
        </div>

        <button
          onClick={onNext}
          disabled={!canGoNext}
          className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Next page"
          aria-label="Go to next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          onClick={onLast}
          disabled={!canGoNext}
          className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Last page"
          aria-label="Go to last page"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>

      {/* Page size selector */}
      {showPageSizeSelector && (
        <div className="flex items-center gap-2">
          <label htmlFor="pageSize" className="text-sm text-gray-600">
            Show:
          </label>
          <select
            id="pageSize"
            value={pageSize}
            onChange={(e) => {
              const value = e.target.value;
              if (value === 'all') {
                onPageSizeChange(totalItems);
              } else {
                onPageSizeChange(parseInt(value, 10));
              }
            }}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
            <option value="all">All</option>
          </select>
        </div>
      )}

      {/* Jump to page */}
      <div className="flex items-center gap-2">
        <label htmlFor="jumpToPage" className="text-sm text-gray-600">
          Go to:
        </label>
        <input
          id="jumpToPage"
          type="number"
          min={1}
          max={totalPages}
          value={jumpToPage}
          onChange={(e) => setJumpToPage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={String(currentPage)}
          className="w-16 px-2 py-1 border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleJumpToPage}
          disabled={!jumpToPage}
          className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Go
        </button>
      </div>
    </div>
  );
};
