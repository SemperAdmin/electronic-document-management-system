/**
 * Types for Naval Letter Formatter (NLF) integration
 */

// ============================================================================
// NLF Payload Types (received from Naval Letter Formatter)
// ============================================================================

/** The attachment data structure received from NLF */
export interface NLFAttachment {
  version: string;
  createdAt: string;
  edmsId: string;
  ssic: string;
  ssicTitle: string;
  subject: string;
  from: string;
  to: string;
  via: string[];
  paragraphs: NLFParagraph[];
  enclosures: NLFEnclosure[];
  letterType: string;
  headerType: string;
}

/** Paragraph structure in NLF letter */
export interface NLFParagraph {
  number: string;
  text: string;
  subparagraphs?: NLFParagraph[];
}

/** Enclosure reference in NLF letter */
export interface NLFEnclosure {
  number: number;
  description: string;
}

/** Record updates to apply when receiving NLF data */
export interface NLFRecordUpdates {
  ssic: string;
  subject: string;
}

/** Complete payload received from NLF */
export interface NLFPayload {
  attachment: NLFAttachment;
  filename: string;
  recordUpdates: NLFRecordUpdates;
}

// ============================================================================
// Retention Calculation Types
// ============================================================================

/** Result of retention calculation based on SSIC */
export interface RetentionResult {
  retentionPeriod: string;
  cutoffTrigger: string;
  disposalAction: string;
  calculatedDisposalDate: string | null;
}

// ============================================================================
// API Response Types
// ============================================================================

/** Response from the receive-naval-letter edge function */
export interface ReceiveNavalLetterResponse {
  success: boolean;
  documentId?: string;
  fileUrl?: string;
  retention?: RetentionResult;
  error?: string;
}

// ============================================================================
// Component Props Types
// ============================================================================

/** Props for CreateNavalLetterButton component */
export interface CreateNavalLetterButtonProps {
  /** The request ID to link the naval letter to */
  requestId: string;
  /** User's unit code for NLF context */
  userUnitCode: string;
  /** Optional callback when button is clicked */
  onLaunch?: () => void;
  /** Optional additional class name */
  className?: string;
  /** Whether the button is disabled */
  disabled?: boolean;
}
