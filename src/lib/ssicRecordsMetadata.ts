// ssicRecordsMetadata.ts
// Complete SSIC metadata optimized for disposal date calculation

/**
 * Cutoff triggers determine WHEN the retention clock starts
 */
export type CutoffTrigger = 
  | 'CALENDAR_YEAR'      // End of calendar year (Dec 31)
  | 'FISCAL_YEAR'        // End of fiscal year (Sep 30)
  | 'CASE_CLOSURE'       // When case/matter is closed
  | 'SEPARATION'         // When individual separates from service
  | 'EVENT_BASED'        // Specific event (superseded, obsolete, etc.)
  | 'IMMEDIATE'          // No cutoff, starts immediately
  | 'UNSPECIFIED';       // Cannot determine

/**
 * Retention unit for the disposal calculation
 */
export type RetentionUnit = 'YEARS' | 'MONTHS' | 'DAYS' | 'EVENT_BASED' | 'UNSPECIFIED';

/**
 * Disposal action type
 */
export type DisposalAction = 'DESTROY' | 'TRANSFER_NARA' | 'UNSPECIFIED';

/**
 * Complete metadata for a single SSIC-bucket combination
 */
export interface SsicRecordMetadata {
  // Identification
  ssic: string;
  nomenclature: string;
  bucket: string;
  bucketTitle: string;
  dau: string;
  
  // Disposal Classification
  isPermanent: boolean;
  
  // Cutoff Information (when does retention period start)
  cutoffTrigger: CutoffTrigger;
  cutoffDescription: string;
  
  // Retention Period
  retentionValue: number | null;
  retentionUnit: RetentionUnit;
  
  // Disposal Action
  disposalAction: DisposalAction;
  
  // Original text for reference
  dispositionText: string;
  
  // Series info
  seriesTitle: string;
}

/**
 * Parse disposition text to extract structured data
 */
export function parseDisposition(dispositionText: string): {
  isPermanent: boolean;
  cutoffTrigger: CutoffTrigger;
  cutoffDescription: string;
  retentionValue: number | null;
  retentionUnit: RetentionUnit;
  disposalAction: DisposalAction;
} {
  const text = dispositionText.toUpperCase();
  
  // Determine if permanent
  const isPermanent = text.includes('PERMANENT');
  
  // Determine disposal action
  let disposalAction: DisposalAction = 'UNSPECIFIED';
  if (text.includes('DESTROY') || text.includes('DELETE')) {
    disposalAction = 'DESTROY';
  } else if (text.includes('TRANSFER') && text.includes('NATIONAL ARCHIVES')) {
    disposalAction = 'TRANSFER_NARA';
  }
  
  // Determine cutoff trigger
  let cutoffTrigger: CutoffTrigger = 'UNSPECIFIED';
  let cutoffDescription = '';
  
  if (text.includes('CALENDAR YEAR') || text.includes('CY.') || text.includes('AT CY')) {
    cutoffTrigger = 'CALENDAR_YEAR';
    cutoffDescription = 'End of calendar year (December 31)';
  } else if (text.includes('FISCAL YEAR') || text.includes('FY.') || text.includes('AT FY')) {
    cutoffTrigger = 'FISCAL_YEAR';
    cutoffDescription = 'End of fiscal year (September 30)';
  } else if (text.includes('CASE CLOSURE') || text.includes('CASE CLOSED')) {
    cutoffTrigger = 'CASE_CLOSURE';
    cutoffDescription = 'Upon case closure';
  } else if (text.includes('SEPARATION') || text.includes('SEPARATED')) {
    cutoffTrigger = 'SEPARATION';
    cutoffDescription = 'Upon separation from service';
  } else if (text.includes('SUPERSEDED') || text.includes('OBSOLETE') || text.includes('CANCELED')) {
    cutoffTrigger = 'EVENT_BASED';
    cutoffDescription = 'When superseded, obsolete, or canceled';
  } else if (text.includes('IMMEDIATELY') || text.includes('WHEN 6 MONTHS OLD') || text.includes('WHEN 90 DAYS')) {
    cutoffTrigger = 'IMMEDIATE';
    cutoffDescription = 'From date of record creation';
  }
  
  // Extract retention period
  let retentionValue: number | null = null;
  let retentionUnit: RetentionUnit = 'UNSPECIFIED';
  
  // Look for year patterns
  const yearMatch = text.match(/(\d+)\s*YEARS?\s*(AFTER|OLD)/);
  if (yearMatch) {
    retentionValue = parseInt(yearMatch[1], 10);
    retentionUnit = 'YEARS';
  }
  
  // Look for month patterns
  if (!retentionValue) {
    const monthMatch = text.match(/(\d+)\s*MONTHS?\s*(AFTER|OLD)/);
    if (monthMatch) {
      retentionValue = parseInt(monthMatch[1], 10);
      retentionUnit = 'MONTHS';
    }
  }
  
  // Look for day patterns
  if (!retentionValue) {
    const dayMatch = text.match(/(\d+)\s*DAYS?\s*(AFTER|OLD)/);
    if (dayMatch) {
      retentionValue = parseInt(dayMatch[1], 10);
      retentionUnit = 'DAYS';
    }
  }
  
  // Check for event-based retention
  if (!retentionValue && (text.includes('WHEN SUPERSEDED') || text.includes('WHEN OBSOLETE') || text.includes('WHEN CANCELED'))) {
    retentionUnit = 'EVENT_BASED';
  }
  
  return {
    isPermanent,
    cutoffTrigger,
    cutoffDescription,
    retentionValue,
    retentionUnit,
    disposalAction
  };
}

/**
 * Calculate disposal date based on metadata and record date
 * 
 * @param metadata - The record metadata
 * @param recordDate - Date the record was created
 * @param cutoffDate - Optional override for cutoff date (for case closure, separation, etc.)
 * @returns Calculated disposal date or null if cannot be calculated
 */
export function calculateDisposalDate(
  metadata: SsicRecordMetadata,
  recordDate: Date,
  cutoffDate?: Date
): Date | null {
  // Permanent records are never disposed
  if (metadata.isPermanent) {
    return null;
  }
  
  // Must have retention value for calculation
  if (metadata.retentionValue === null || metadata.retentionUnit === 'EVENT_BASED' || metadata.retentionUnit === 'UNSPECIFIED') {
    return null;
  }
  
  // Determine the cutoff date (when retention period starts)
  let effectiveCutoffDate: Date;
  
  if (cutoffDate) {
    // Use provided cutoff date (for case closure, separation, etc.)
    effectiveCutoffDate = cutoffDate;
  } else {
    // Calculate based on trigger
    switch (metadata.cutoffTrigger) {
      case 'CALENDAR_YEAR':
        // End of calendar year containing the record date
        effectiveCutoffDate = new Date(recordDate.getFullYear(), 11, 31); // Dec 31
        break;
        
      case 'FISCAL_YEAR':
        // End of fiscal year (Sep 30)
        // If record is Oct-Dec, FY ends next Sep 30
        // If record is Jan-Sep, FY ends current Sep 30
        const month = recordDate.getMonth();
        const year = recordDate.getFullYear();
        if (month >= 9) { // Oct, Nov, Dec (months 9, 10, 11)
          effectiveCutoffDate = new Date(year + 1, 8, 30); // Sep 30 next year
        } else {
          effectiveCutoffDate = new Date(year, 8, 30); // Sep 30 current year
        }
        break;
        
      case 'IMMEDIATE':
        // Retention starts from record date
        effectiveCutoffDate = recordDate;
        break;
        
      case 'CASE_CLOSURE':
      case 'SEPARATION':
      case 'EVENT_BASED':
        // These require a cutoff date to be provided
        return null;
        
      default:
        // Default to calendar year
        effectiveCutoffDate = new Date(recordDate.getFullYear(), 11, 31);
    }
  }
  
  // Calculate disposal date by adding retention period to cutoff date
  const disposalDate = new Date(effectiveCutoffDate);
  
  switch (metadata.retentionUnit) {
    case 'YEARS':
      disposalDate.setFullYear(disposalDate.getFullYear() + metadata.retentionValue);
      break;
    case 'MONTHS':
      disposalDate.setMonth(disposalDate.getMonth() + metadata.retentionValue);
      break;
    case 'DAYS':
      disposalDate.setDate(disposalDate.getDate() + metadata.retentionValue);
      break;
  }
  
  return disposalDate;
}

/**
 * Format disposal information for display
 */
export function formatDisposalInfo(metadata: SsicRecordMetadata): string {
  if (metadata.isPermanent) {
    return 'Permanent Record - Transfer to National Archives';
  }
  
  if (metadata.retentionUnit === 'EVENT_BASED') {
    return `Destroy when ${metadata.cutoffDescription.toLowerCase()}`;
  }
  
  if (metadata.retentionValue === null) {
    return 'Retention period not specified';
  }
  
  const unit = metadata.retentionUnit === 'YEARS' ? 'year' : 
               metadata.retentionUnit === 'MONTHS' ? 'month' : 'day';
  const plural = metadata.retentionValue !== 1 ? 's' : '';
  
  let trigger = '';
  switch (metadata.cutoffTrigger) {
    case 'CALENDAR_YEAR':
      trigger = 'after end of calendar year';
      break;
    case 'FISCAL_YEAR':
      trigger = 'after end of fiscal year';
      break;
    case 'CASE_CLOSURE':
      trigger = 'after case closure';
      break;
    case 'SEPARATION':
      trigger = 'after separation';
      break;
    case 'IMMEDIATE':
      trigger = 'from record date';
      break;
    default:
      trigger = 'after cutoff';
  }
  
  return `Destroy ${metadata.retentionValue} ${unit}${plural} ${trigger}`;
}

// Example usage:
//
// const metadata = getMetadataForSsic('1050')[0];
// const recordDate = new Date('2024-03-15');
// const disposalDate = calculateDisposalDate(metadata, recordDate);
// // For SSIC 1050 with 3-year retention and calendar year cutoff:
// // recordDate: March 15, 2024
// // cutoffDate: December 31, 2024 (end of CY)
// // disposalDate: December 31, 2027 (3 years after cutoff)
