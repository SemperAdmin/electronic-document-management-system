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
// Naval Letter Attachment Database Types
// ============================================================================

/** Database row for naval_letter_attachments table (snake_case) */
export interface NavalLetterAttachmentRow {
  id: string;
  request_id: string;
  filename: string;
  storage_path: string;
  content_type: string;
  source: string;
  file_size: number;
  ssic: string | null;
  subject: string | null;
  letter_type: string | null;
  created_at: string;
  created_by: string | null;
}

/** Application type for naval letter attachments (camelCase) */
export interface NavalLetterAttachment {
  id: string;
  requestId: string;
  filename: string;
  storagePath: string;
  contentType: string;
  source: string;
  fileSize: number;
  ssic: string | null;
  subject: string | null;
  letterType: string | null;
  createdAt: string;
  createdBy: string | null;
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

/** SSIC crosswalk record for retention lookups */
export interface SSICCrosswalkRecord {
  ssic: string;
  ssicTitle: string;
  retentionYears: number | null;
  retentionPeriod: string;
  cutoffTrigger: 'CY' | 'FY' | 'Event' | string;
  disposalAction: string;
}

// ============================================================================
// API Response Types
// ============================================================================

/** Response from the receive-naval-letter edge function */
export interface ReceiveNavalLetterResponse {
  success: boolean;
  attachmentId?: string;
  storagePath?: string;
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

/** Props for NavalLetterAttachmentList component */
export interface NavalLetterAttachmentListProps {
  /** The request ID to fetch attachments for */
  requestId: string;
  /** Optional callback when an attachment is viewed */
  onView?: (attachment: NavalLetterAttachment) => void;
  /** Optional callback when an attachment is downloaded */
  onDownload?: (attachment: NavalLetterAttachment) => void;
}

// ============================================================================
// Type Conversion Utilities
// ============================================================================

/** Convert database row to application type */
export function fromNavalLetterAttachmentRow(row: NavalLetterAttachmentRow): NavalLetterAttachment {
  return {
    id: row.id,
    requestId: row.request_id,
    filename: row.filename,
    storagePath: row.storage_path,
    contentType: row.content_type,
    source: row.source,
    fileSize: row.file_size,
    ssic: row.ssic,
    subject: row.subject,
    letterType: row.letter_type,
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}

/** Convert application type to database row */
export function toNavalLetterAttachmentRow(
  attachment: Partial<NavalLetterAttachment>
): Partial<NavalLetterAttachmentRow> {
  const row: Partial<NavalLetterAttachmentRow> = {};

  if (attachment.id !== undefined) row.id = attachment.id;
  if (attachment.requestId !== undefined) row.request_id = attachment.requestId;
  if (attachment.filename !== undefined) row.filename = attachment.filename;
  if (attachment.storagePath !== undefined) row.storage_path = attachment.storagePath;
  if (attachment.contentType !== undefined) row.content_type = attachment.contentType;
  if (attachment.source !== undefined) row.source = attachment.source;
  if (attachment.fileSize !== undefined) row.file_size = attachment.fileSize;
  if (attachment.ssic !== undefined) row.ssic = attachment.ssic;
  if (attachment.subject !== undefined) row.subject = attachment.subject;
  if (attachment.letterType !== undefined) row.letter_type = attachment.letterType;
  if (attachment.createdAt !== undefined) row.created_at = attachment.createdAt;
  if (attachment.createdBy !== undefined) row.created_by = attachment.createdBy;

  return row;
}
