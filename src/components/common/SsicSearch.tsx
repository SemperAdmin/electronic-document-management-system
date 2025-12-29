import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SsicRecord, SsicSearchResult } from '@/ssic-data/types';
import { search, initializeData, getRecordsForSsic, formatRetention, formatCutoff, getDisposalSummary } from '@/ssic-data';
import { SSIC_DATA } from '@/ssic-data/data';

// Initialize SSIC data on module load
let initialized = false;
if (!initialized) {
  initializeData(SSIC_DATA);
  initialized = true;
}

export interface SsicSelection {
  ssic: string;
  nomenclature: string;
  bucket?: string;
  bucketTitle?: string;
  isPermanent: boolean;
  retentionValue: number | null;
  retentionUnit: string;
  cutoffTrigger: string;
  cutoffDescription: string;
  disposalAction: string;
  dau: string;
}

interface SsicSearchProps {
  value: SsicSelection | null;
  onChange: (selection: SsicSelection | null) => void;
  required?: boolean;
  disabled?: boolean;
}

export const SsicSearch: React.FC<SsicSearchProps> = ({
  value,
  onChange,
  required = false,
  disabled = false,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SsicSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [showBuckets, setShowBuckets] = useState(false);
  const [availableBuckets, setAvailableBuckets] = useState<SsicRecord[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) {
        const searchResults = search(query);
        setResults(searchResults);
        setIsOpen(searchResults.length > 0);
      } else {
        setResults([]);
        setIsOpen(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = useCallback((result: SsicSearchResult) => {
    const record = result.primaryRecord;
    const buckets = getRecordsForSsic(result.ssic);

    if (buckets.length > 1) {
      setAvailableBuckets(buckets);
      setShowBuckets(true);
      setIsOpen(false);
    } else {
      onChange({
        ssic: record.ssic,
        nomenclature: record.nomenclature,
        bucket: record.bucket,
        bucketTitle: record.bucketTitle,
        isPermanent: record.isPermanent,
        retentionValue: record.retentionValue,
        retentionUnit: record.retentionUnit,
        cutoffTrigger: record.cutoffTrigger,
        cutoffDescription: record.cutoffDescription,
        disposalAction: record.disposalAction,
        dau: record.dau,
      });
      setQuery('');
      setIsOpen(false);
      setShowBuckets(false);
    }
  }, [onChange]);

  const handleBucketSelect = useCallback((record: SsicRecord) => {
    onChange({
      ssic: record.ssic,
      nomenclature: record.nomenclature,
      bucket: record.bucket,
      bucketTitle: record.bucketTitle,
      isPermanent: record.isPermanent,
      retentionValue: record.retentionValue,
      retentionUnit: record.retentionUnit,
      cutoffTrigger: record.cutoffTrigger,
      cutoffDescription: record.cutoffDescription,
      disposalAction: record.disposalAction,
      dau: record.dau,
    });
    setQuery('');
    setShowBuckets(false);
    setAvailableBuckets([]);
  }, [onChange]);

  const handleClear = () => {
    onChange(null);
    setQuery('');
    setShowBuckets(false);
    setAvailableBuckets([]);
  };

  // If we have a selection, show it
  if (value) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-[var(--text)]">
          SSIC Classification {required && <span className="text-brand-red">*</span>}
        </label>
        <div className="p-3 border border-brand-navy/30 rounded-lg bg-brand-cream/30">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-brand-navy">
                {value.ssic} - {value.nomenclature}
              </div>
              {value.bucketTitle && (
                <div className="text-xs text-[var(--muted)] mt-1">
                  {value.bucketTitle}
                </div>
              )}
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-brand-red hover:underline"
              >
                Change
              </button>
            )}
          </div>

          {/* Retention Summary */}
          <div className={`mt-3 p-2 rounded text-sm ${value.isPermanent ? 'bg-blue-50 border border-blue-200' : 'bg-amber-50 border border-amber-200'}`}>
            <div className="font-medium text-xs uppercase tracking-wide mb-1">
              {value.isPermanent ? '📁 Permanent Record' : '⏱️ Temporary Record'}
            </div>
            <div className="text-xs space-y-1">
              <div><span className="text-[var(--muted)]">Retention:</span> {formatRetention(value as any)}</div>
              <div><span className="text-[var(--muted)]">Cutoff:</span> {formatCutoff(value.cutoffTrigger as any)}</div>
              <div><span className="text-[var(--muted)]">Disposal:</span> {value.isPermanent ? 'Transfer to NARA' : 'Destroy'}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show bucket selection if multiple buckets
  if (showBuckets && availableBuckets.length > 0) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-[var(--text)]">
          SSIC Classification {required && <span className="text-brand-red">*</span>}
        </label>
        <div className="border border-brand-navy/30 rounded-lg overflow-hidden">
          <div className="bg-brand-cream p-2 border-b border-brand-navy/20 flex items-center justify-between">
            <span className="font-medium text-sm text-brand-navy">
              {availableBuckets[0].ssic} - {availableBuckets[0].nomenclature}
            </span>
            <button
              type="button"
              onClick={() => { setShowBuckets(false); setAvailableBuckets([]); }}
              className="text-xs text-brand-navy hover:underline"
            >
              Back to search
            </button>
          </div>
          <div className="text-xs text-[var(--muted)] p-2 bg-gray-50">
            Select a record category:
          </div>
          <div className="max-h-60 overflow-y-auto">
            {availableBuckets.map((bucket, idx) => (
              <button
                key={bucket.bucket}
                type="button"
                onClick={() => handleBucketSelect(bucket)}
                className="w-full text-left px-3 py-2 hover:bg-brand-gold/20 border-b border-gray-100 last:border-0"
              >
                <div className="font-medium text-sm text-[var(--text)]">
                  {bucket.bucketTitle}
                </div>
                <div className={`text-xs mt-1 ${bucket.isPermanent ? 'text-blue-600' : 'text-amber-600'}`}>
                  {bucket.isPermanent ? 'PERMANENT' : `${formatRetention(bucket)} · ${formatCutoff(bucket.cutoffTrigger)}`}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show search input
  return (
    <div className="space-y-2" ref={dropdownRef}>
      <label className="block text-sm font-medium text-[var(--text)]">
        SSIC Classification {required && <span className="text-brand-red">*</span>}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && results.length > 0 && setIsOpen(true)}
          disabled={disabled}
          placeholder="Search by topic or SSIC code..."
          className={`w-full px-3 py-2 border ${required && !value ? 'border-brand-red/50' : 'border-brand-navy/30'} rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold pr-8`}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">
          🔍
        </span>
      </div>
      <p className="text-xs text-[var(--muted)]">
        e.g., "personnel", "training", "1000", "3000"
      </p>

      {/* Search Results Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-w-lg bg-white border border-brand-navy/30 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {results.map((result) => (
            <button
              key={result.ssic}
              type="button"
              onClick={() => handleSelect(result)}
              className="w-full text-left px-3 py-2 hover:bg-brand-gold/20 border-b border-gray-100 last:border-0"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-brand-navy">
                    {result.ssic} - {result.nomenclature}
                  </div>
                  <div className={`text-xs mt-1 ${result.primaryRecord.isPermanent ? 'text-blue-600' : 'text-amber-600'}`}>
                    {getDisposalSummary(result.primaryRecord)}
                  </div>
                </div>
                {result.records.length > 1 && (
                  <span className="text-xs text-[var(--muted)] whitespace-nowrap">
                    {result.records.length} categories
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SsicSearch;
