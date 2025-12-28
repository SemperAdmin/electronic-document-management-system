import React, { useState, useRef, useEffect } from 'react';
import { Request, ActionEntry, DocumentItem } from '@/types';
import { DocumentList, DocumentPreview } from './index';

export interface RequestFormDetailsProps {
  request: Request;
  documents: DocumentItem[];
  comment: string;
  onCommentChange: (value: string) => void;
  attachedFiles: File[];
  onFilesChange: (files: File[]) => void;
  onSaveFiles: () => void;
  /** Whether file attachment is allowed */
  canAttachFiles?: boolean;
  /** Label for comment field */
  commentLabel?: string;
  /** Placeholder for comment field */
  commentPlaceholder?: string;
  /** Additional content to render above action buttons */
  children?: React.ReactNode;
  /** Action buttons to render at the bottom */
  actionButtons?: React.ReactNode;
  /** Whether to show document preview functionality */
  showPreview?: boolean;
  /** ID prefix for accessibility */
  idPrefix?: string;
}

export const RequestFormDetails: React.FC<RequestFormDetailsProps> = ({
  request,
  documents,
  comment,
  onCommentChange,
  attachedFiles,
  onFilesChange,
  onSaveFiles,
  canAttachFiles = true,
  commentLabel = 'Comment',
  commentPlaceholder = 'Optional notes',
  children,
  actionButtons,
  showPreview = true,
  idPrefix = 'req',
}) => {
  const [expandedDocs, setExpandedDocs] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const docsRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle outside click to close docs
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (expandedDocs && docsRef.current && !docsRef.current.contains(e.target as Node)) {
        setExpandedDocs(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && expandedDocs) {
        setExpandedDocs(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [expandedDocs]);

  const handleToggleDocs = () => {
    setExpandedDocs(!expandedDocs);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    onFilesChange([...attachedFiles, ...files]);
    try { e.target.value = ''; } catch {}
  };

  const removeFile = (index: number) => {
    onFilesChange(attachedFiles.filter((_, i) => i !== index));
  };

  const requestDocs = documents.filter(d => d.requestId === request.id);

  return (
    <div id={`${idPrefix}-details-${request.id}`} className="space-y-3">
      {/* Documents Section */}
      <div>
        <button
          className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold"
          aria-expanded={expandedDocs}
          aria-controls={`${idPrefix}-docs-${request.id}`}
          onClick={handleToggleDocs}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleToggleDocs(); } }}
        >
          <span>{expandedDocs ? 'Hide' : 'Show'} Documents ({requestDocs.length})</span>
          <svg width="10" height="10" viewBox="0 0 20 20" className={`transition-transform ${expandedDocs ? 'rotate-180' : 'rotate-0'}`} aria-hidden="true">
            <path d="M5 7l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2"/>
          </svg>
        </button>
      </div>
      <div
        id={`${idPrefix}-docs-${request.id}`}
        ref={expandedDocs ? docsRef : undefined}
        className={`${expandedDocs ? 'space-y-2 overflow-hidden transition-all duration-300 max-h-[50vh] opacity-100' : 'overflow-hidden transition-all duration-300 max-h-0 opacity-0'}`}
      >
        <DocumentList
          documents={requestDocs.map(d => ({ ...d, fileUrl: (d as any).fileUrl }))}
          showIcons
          onPreview={showPreview ? (doc) => setPreviewDoc(requestDocs.find(d => d.id === doc.id) || null) : undefined}
        />
      </div>

      {/* Comment Section - Responsive layout */}
      <div>
        <label className="block text-sm font-medium text-[var(--text)] mb-1">{commentLabel}</label>
        <textarea
          rows={2}
          value={comment}
          onChange={(e) => onCommentChange(e.target.value)}
          className="w-full px-3 py-2 border border-brand-navy/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold text-sm"
          placeholder={commentPlaceholder}
        />
      </div>

      {/* File Attachment Section */}
      {canAttachFiles && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="bg-brand-navy text-brand-cream px-3 py-1 text-sm rounded hover:bg-brand-red-2 cursor-pointer inline-block">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
            />
            Add Files
          </label>
          <span className="text-xs text-[var(--muted)]">
            {attachedFiles.length ? `${attachedFiles.length} file(s) selected` : 'No files selected'}
          </span>
          {attachedFiles.length > 0 && (
            <button
              className="px-3 py-1 text-xs bg-brand-gold text-brand-charcoal rounded hover:bg-brand-gold-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold"
              onClick={onSaveFiles}
            >
              Save Files
            </button>
          )}
        </div>
      )}

      {/* Attached Files Preview */}
      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachedFiles.map((f, idx) => (
            <span key={idx} className="inline-flex items-center gap-2 px-2 py-1 text-xs bg-brand-cream text-brand-navy rounded border border-brand-navy/20">
              <span className="max-w-[120px] md:max-w-[200px] truncate" title={f.name}>{f.name}</span>
              <button
                type="button"
                className="text-brand-red-2 hover:underline"
                onClick={() => removeFile(idx)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Additional Content (routing options, etc.) */}
      {children}

      {/* Activity Log Section */}
      <div>
        <button
          className="px-3 py-1 text-xs rounded bg-brand-navy text-brand-cream hover:bg-brand-red-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold"
          onClick={() => setExpandedLogs(!expandedLogs)}
          aria-expanded={expandedLogs}
          aria-controls={`${idPrefix}-logs-${request.id}`}
        >
          {expandedLogs ? 'Hide' : 'Show'} Activity Log
        </button>
        <div
          id={`${idPrefix}-logs-${request.id}`}
          className={expandedLogs ? 'mt-2 space-y-2 max-h-[30vh] overflow-y-auto' : 'hidden'}
        >
          {request.activity && request.activity.length ? (
            request.activity.map((a, idx) => (
              <div key={idx} className="text-xs text-gray-700">
                <div className="font-medium">
                  {a.actor}
                  {a.actorRole ? ` • ${a.actorRole}` : ''}
                  {' • '}
                  {new Date(a.timestamp).toLocaleString()}
                  {' • '}
                  {a.action}
                </div>
                {a.comment && <div className="text-gray-600 pl-4 border-l-2 border-gray-300 ml-2">{a.comment}</div>}
              </div>
            ))
          ) : (
            <div className="text-xs text-gray-500">No activity</div>
          )}
        </div>
      </div>

      {/* Action Buttons - Responsive grid on mobile */}
      {actionButtons && (
        <div className="pt-2 border-t border-brand-navy/10">
          <div className="flex flex-wrap items-center justify-end gap-2">
            {actionButtons}
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && showPreview && (
        <DocumentPreview
          fileName={previewDoc.name}
          url={(previewDoc as any).fileUrl || ''}
          mimeType={(previewDoc as any).type || ''}
          fileSize={(previewDoc as any).size || 0}
          isOpen={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </div>
  );
};

// Compact version for mobile - shows inline with minimal chrome
export interface RequestFormCompactProps {
  request: Request;
  documents: DocumentItem[];
  comment: string;
  onCommentChange: (value: string) => void;
  onAction: (action: string) => void;
  actions: Array<{ label: string; value: string; variant?: 'primary' | 'secondary' | 'danger' }>;
}

export const RequestFormCompact: React.FC<RequestFormCompactProps> = ({
  request,
  documents,
  comment,
  onCommentChange,
  onAction,
  actions,
}) => {
  const [showDocs, setShowDocs] = useState(false);
  const requestDocs = documents.filter(d => d.requestId === request.id);

  const getButtonClass = (variant?: 'primary' | 'secondary' | 'danger') => {
    switch (variant) {
      case 'primary':
        return 'bg-brand-gold text-brand-charcoal hover:bg-brand-gold-2';
      case 'danger':
        return 'bg-brand-navy text-brand-cream hover:bg-brand-red-2';
      case 'secondary':
      default:
        return 'bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2';
    }
  };

  return (
    <div className="p-3 space-y-2 bg-[var(--surface)] rounded-lg border border-brand-navy/20">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-[var(--text)] truncate">{request.subject}</div>
          <div className="text-xs text-[var(--muted)]">{new Date(request.createdAt).toLocaleDateString()}</div>
        </div>
        <button
          className="text-xs text-brand-navy underline whitespace-nowrap"
          onClick={() => setShowDocs(!showDocs)}
        >
          {requestDocs.length} doc{requestDocs.length !== 1 ? 's' : ''}
        </button>
      </div>

      {/* Documents (collapsed by default) */}
      {showDocs && (
        <div className="space-y-1">
          {requestDocs.map(d => (
            <div key={d.id} className="text-xs text-[var(--muted)] flex items-center gap-2">
              <span className="truncate flex-1">{d.name}</span>
              {(d as any).fileUrl && (
                <a
                  href={(d as any).fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-navy underline"
                >
                  Open
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Quick Comment */}
      <input
        type="text"
        value={comment}
        onChange={(e) => onCommentChange(e.target.value)}
        placeholder="Add note..."
        className="w-full px-2 py-1 text-sm border border-brand-navy/20 rounded focus:outline-none focus:ring-1 focus:ring-brand-gold"
      />

      {/* Action Buttons - Horizontal scroll on mobile */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {actions.map(action => (
          <button
            key={action.value}
            onClick={() => onAction(action.value)}
            className={`px-3 py-1 text-xs rounded whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold ${getButtonClass(action.variant)}`}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default RequestFormDetails;
