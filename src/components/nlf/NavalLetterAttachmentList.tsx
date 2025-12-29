import React, { useState } from 'react';
import { DocumentRecord } from '@/lib/db';
import { useNavalLetterAttachments } from '@/hooks/useNavalLetterAttachments';

interface NavalLetterAttachmentListProps {
  /** The request ID to fetch attachments for */
  requestId: string;
  /** Optional callback when a document is viewed */
  onView?: (doc: DocumentRecord) => void;
  /** Optional callback when a document is downloaded */
  onDownload?: (doc: DocumentRecord) => void;
}

/**
 * Displays a list of naval letter documents for a request.
 */
export function NavalLetterAttachmentList({
  requestId,
  onView,
  onDownload,
}: NavalLetterAttachmentListProps): React.ReactElement {
  const { documents, loading, error, downloadDocument, getDocumentContent } =
    useNavalLetterAttachments(requestId);
  const [previewData, setPreviewData] = useState<{
    doc: DocumentRecord;
    content: Record<string, unknown>;
  } | null>(null);

  const handleView = async (doc: DocumentRecord) => {
    if (onView) {
      onView(doc);
      return;
    }

    // Default behavior: load and show preview
    const content = await getDocumentContent(doc);
    if (content) {
      setPreviewData({ doc, content });
    }
  };

  const handleDownload = async (doc: DocumentRecord) => {
    if (onDownload) {
      onDownload(doc);
      return;
    }

    // Default behavior: download the file
    await downloadDocument(doc);
  };

  const closePreview = () => {
    setPreviewData(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <svg className="w-5 h-5 animate-spin text-brand-navy" fill="none" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <span className="ml-2 text-sm text-[var(--muted)]">Loading naval letters...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-2 text-sm text-red-600" role="alert">
        Failed to load naval letters: {error}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <p className="py-2 text-sm text-[var(--muted)]">No naval letters attached</p>
    );
  }

  return (
    <>
      <ul className="space-y-2" role="list" aria-label="Naval letter attachments">
        {documents.map((doc) => (
          <li
            key={doc.id}
            className="flex items-center gap-3 p-3 border border-brand-navy/20 rounded-lg hover:bg-brand-cream/30 transition-colors"
          >
            {/* Mail/Letter icon */}
            <div className="flex-shrink-0">
              <svg
                className="w-5 h-5 text-brand-navy"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>

            {/* Document info */}
            <div className="flex-1 min-w-0">
              <p
                className="font-medium text-sm text-[var(--text)] truncate"
                title={doc.name}
              >
                {doc.name}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                {doc.category === 'naval-letter' && (
                  <span className="text-xs text-[var(--muted)]">Naval Letter</span>
                )}
                <span className="text-xs text-[var(--muted)]">
                  {formatFileSize(doc.size)}
                </span>
              </div>
            </div>

            {/* Badge */}
            <span className="flex-shrink-0 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded font-medium">
              Naval Letter
            </span>

            {/* Date */}
            <span className="flex-shrink-0 text-xs text-[var(--muted)]">
              {formatDate(doc.uploadedAt)}
            </span>

            {/* Actions */}
            <div className="flex-shrink-0 flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleView(doc)}
                className="p-1.5 text-brand-navy hover:bg-brand-cream rounded transition-colors"
                title="View"
                aria-label={`View ${doc.name}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => handleDownload(doc)}
                className="p-1.5 text-brand-navy hover:bg-brand-cream rounded transition-colors"
                title="Download"
                aria-label={`Download ${doc.name}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
              </button>
            </div>
          </li>
        ))}
      </ul>

      {/* Preview Modal */}
      {previewData && (
        <NavalLetterPreviewModal
          doc={previewData.doc}
          content={previewData.content}
          onClose={closePreview}
          onDownload={() => handleDownload(previewData.doc)}
        />
      )}
    </>
  );
}

/**
 * Modal to preview naval letter content
 */
interface NavalLetterPreviewModalProps {
  doc: DocumentRecord;
  content: Record<string, unknown>;
  onClose: () => void;
  onDownload: () => void;
}

function NavalLetterPreviewModal({
  doc,
  content,
  onClose,
  onDownload,
}: NavalLetterPreviewModalProps): React.ReactElement {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-title"
    >
      <div
        className="bg-[var(--surface)] rounded-lg shadow-lg w-full max-w-3xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-navy/20">
          <div>
            <h3 id="preview-title" className="text-lg font-semibold text-[var(--text)]">
              Naval Letter Preview
            </h3>
            <p className="text-sm text-[var(--muted)]">{doc.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-brand-navy hover:text-brand-navy/70 transition-colors"
            aria-label="Close preview"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <dl className="space-y-4">
            {content.ssic && (
              <div>
                <dt className="text-sm font-medium text-[var(--muted)]">SSIC</dt>
                <dd className="mt-1 text-sm text-[var(--text)]">
                  {String(content.ssic)} - {String(content.ssicTitle || '')}
                </dd>
              </div>
            )}
            {content.subject && (
              <div>
                <dt className="text-sm font-medium text-[var(--muted)]">Subject</dt>
                <dd className="mt-1 text-sm text-[var(--text)]">{String(content.subject)}</dd>
              </div>
            )}
            {content.from && (
              <div>
                <dt className="text-sm font-medium text-[var(--muted)]">From</dt>
                <dd className="mt-1 text-sm text-[var(--text)]">{String(content.from)}</dd>
              </div>
            )}
            {content.to && (
              <div>
                <dt className="text-sm font-medium text-[var(--muted)]">To</dt>
                <dd className="mt-1 text-sm text-[var(--text)]">{String(content.to)}</dd>
              </div>
            )}
            {Array.isArray(content.via) && content.via.length > 0 && (
              <div>
                <dt className="text-sm font-medium text-[var(--muted)]">Via</dt>
                <dd className="mt-1 text-sm text-[var(--text)]">
                  {content.via.join(' → ')}
                </dd>
              </div>
            )}
            {content.letterType && (
              <div>
                <dt className="text-sm font-medium text-[var(--muted)]">Letter Type</dt>
                <dd className="mt-1 text-sm text-[var(--text)]">{String(content.letterType)}</dd>
              </div>
            )}
            {Array.isArray(content.paragraphs) && content.paragraphs.length > 0 && (
              <div>
                <dt className="text-sm font-medium text-[var(--muted)]">Content</dt>
                <dd className="mt-1 space-y-2">
                  {content.paragraphs.map((p: any, idx: number) => (
                    <p key={idx} className="text-sm text-[var(--text)]">
                      <span className="font-medium">{p.number}.</span> {p.text}
                    </p>
                  ))}
                </dd>
              </div>
            )}
            {Array.isArray(content.enclosures) && content.enclosures.length > 0 && (
              <div>
                <dt className="text-sm font-medium text-[var(--muted)]">Enclosures</dt>
                <dd className="mt-1">
                  <ol className="list-decimal list-inside text-sm text-[var(--text)]">
                    {content.enclosures.map((enc: any) => (
                      <li key={enc.number}>{enc.description}</li>
                    ))}
                  </ol>
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-brand-navy/20">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-brand-navy border border-brand-navy/30 rounded-lg hover:bg-brand-cream transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onDownload}
            className="px-4 py-2 text-sm font-medium bg-brand-navy text-brand-cream rounded-lg hover:brightness-110 transition-colors inline-flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Download JSON
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default NavalLetterAttachmentList;
