// types.ts
// Type definitions for SSIC Records Management

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
  | 'UNSPECIFIED';

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
export interface SsicRecord {
  ssic: string;
  nomenclature: string;
  bucket: string;
  bucketTitle: string;
  dau: string;
  isPermanent: boolean;
  cutoffTrigger: CutoffTrigger;
  cutoffDescription: string;
  retentionValue: number | null;
  retentionUnit: RetentionUnit;
  disposalAction: DisposalAction;
  dispositionText: string;
  seriesTitle: string;
}

/**
 * Search result with primary record
 */
export interface SsicSearchResult {
  ssic: string;
  nomenclature: string;
  records: SsicRecord[];
  primaryRecord: SsicRecord;
}
