// disposalCalculator.ts
// Utilities for calculating disposal dates

import { SsicRecord, CutoffTrigger } from './types';

/**
 * Calculate disposal date based on record metadata and dates
 * 
 * @param record - The SSIC record metadata
 * @param recordDate - Date the record was created
 * @param eventDate - Optional date for event-based cutoffs (case closure, separation, etc.)
 * @returns Disposal date or null if cannot be calculated or permanent
 */
export function calculateDisposalDate(
  record: SsicRecord,
  recordDate: Date,
  eventDate?: Date
): Date | null {
  // Permanent records are never disposed
  if (record.isPermanent) {
    return null;
  }
  
  // Must have numeric retention value
  if (record.retentionValue === null) {
    return null;
  }
  
  // Event-based retention requires event date
  if (record.retentionUnit === 'EVENT_BASED' || record.retentionUnit === 'UNSPECIFIED') {
    return null;
  }
  
  // Calculate cutoff date
  const cutoffDate = calculateCutoffDate(record.cutoffTrigger, recordDate, eventDate);
  if (!cutoffDate) {
    return null;
  }
  
  // Add retention period to cutoff date
  const disposalDate = new Date(cutoffDate);
  
  switch (record.retentionUnit) {
    case 'YEARS':
      disposalDate.setFullYear(disposalDate.getFullYear() + record.retentionValue);
      break;
    case 'MONTHS':
      disposalDate.setMonth(disposalDate.getMonth() + record.retentionValue);
      break;
    case 'DAYS':
      disposalDate.setDate(disposalDate.getDate() + record.retentionValue);
      break;
  }
  
  return disposalDate;
}

/**
 * Calculate the cutoff date based on trigger type
 */
export function calculateCutoffDate(
  trigger: CutoffTrigger,
  recordDate: Date,
  eventDate?: Date
): Date | null {
  switch (trigger) {
    case 'CALENDAR_YEAR':
      // End of calendar year (December 31)
      return new Date(recordDate.getFullYear(), 11, 31);
      
    case 'FISCAL_YEAR':
      // End of fiscal year (September 30)
      // FY runs Oct 1 - Sep 30
      const month = recordDate.getMonth();
      const year = recordDate.getFullYear();
      // Oct-Dec = FY ends next Sep 30
      // Jan-Sep = FY ends current Sep 30
      if (month >= 9) {
        return new Date(year + 1, 8, 30);
      } else {
        return new Date(year, 8, 30);
      }
      
    case 'IMMEDIATE':
      // Retention starts from record date
      return new Date(recordDate);
      
    case 'CASE_CLOSURE':
    case 'SEPARATION':
    case 'EVENT_BASED':
      // Requires event date
      return eventDate ? new Date(eventDate) : null;
      
    case 'UNSPECIFIED':
    default:
      // Default to calendar year
      return new Date(recordDate.getFullYear(), 11, 31);
  }
}

/**
 * Format retention info for display
 */
export function formatRetention(record: SsicRecord): string {
  if (record.isPermanent) {
    return 'Permanent - Transfer to NARA';
  }
  
  if (record.retentionUnit === 'EVENT_BASED') {
    return 'Destroy when obsolete/superseded';
  }
  
  if (record.retentionValue === null) {
    return 'Retention not specified';
  }
  
  const unit = record.retentionUnit === 'YEARS' ? 'year' :
               record.retentionUnit === 'MONTHS' ? 'month' : 'day';
  const s = record.retentionValue !== 1 ? 's' : '';
  
  return `${record.retentionValue} ${unit}${s}`;
}

/**
 * Format cutoff trigger for display
 */
export function formatCutoff(trigger: CutoffTrigger): string {
  switch (trigger) {
    case 'CALENDAR_YEAR':
      return 'End of Calendar Year';
    case 'FISCAL_YEAR':
      return 'End of Fiscal Year';
    case 'CASE_CLOSURE':
      return 'Case Closure';
    case 'SEPARATION':
      return 'Separation';
    case 'EVENT_BASED':
      return 'Event-Based';
    case 'IMMEDIATE':
      return 'Record Date';
    default:
      return 'Unspecified';
  }
}

/**
 * Get disposal summary for display
 */
export function getDisposalSummary(record: SsicRecord): string {
  if (record.isPermanent) {
    return 'PERMANENT: Transfer to National Archives';
  }
  
  const retention = formatRetention(record);
  const cutoff = formatCutoff(record.cutoffTrigger);
  
  return `TEMPORARY: ${retention} after ${cutoff}`;
}
