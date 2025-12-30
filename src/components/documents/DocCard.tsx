import React, { memo, useState } from 'react';
import { Document } from './types';
import { formatStageLabel } from '@/lib/stage';
import { FileTypeIcon, DocumentPreview, canPreview } from '@/components/common';
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/supabase';

// Get NLF URL from environment variable
const NLF_BASE_URL = (import.meta as any)?.env?.VITE_NLF_URL || 'https://semperadmin.github.io/naval-letter-formatter';

interface DocCardProps {
  doc: Document;
  onView: (doc: Document) => void;
  onDelete: (doc: Document) => void;
}

// Check if document is a naval letter
function isNavalLetter(doc: Document): boolean {
  return doc.category === 'naval-letter' ||
         doc.name.startsWith('naval-letter-') ||
         doc.type === 'application/json' && doc.name.includes('naval-letter');
}

// Build NLF edit URL for a naval letter document
function buildNLFEditUrl(doc: Document): string {
  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabaseAnonKey();
  const returnUrl = encodeURIComponent(window.location.href);

  const params = new URLSearchParams({
    mode: 'edit',
    documentId: doc.id,
    returnUrl: returnUrl,
  });

  if (doc.requestId) {
    params.set('edmsId', doc.requestId);
  }
  if (doc.fileUrl) {
    params.set('fileUrl', doc.fileUrl);
  }
  if (supabaseUrl) {
    params.set('supabaseUrl', supabaseUrl);
  }
  if (supabaseKey) {
    params.set('supabaseKey', supabaseKey);
  }

  return `${NLF_BASE_URL}?${params.toString()}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Memoized to prevent re-renders when parent state changes but doc props stay the same
export const DocCard: React.FC<DocCardProps> = memo(function DocCard({ doc, onView, onDelete }) {
  const [showPreview, setShowPreview] = useState(false);
  const isPreviewable = doc.fileUrl && canPreview(doc.type, doc.name);
  const isNavalLetterDoc = isNavalLetter(doc);

  const handleOpenInNLF = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = buildNLFEditUrl(doc);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <article
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border border-brand-navy/20 rounded-lg bg-[var(--surface)] hover:bg-brand-cream/50 transition-colors gap-3"
        aria-label={`Document: ${doc.subject}`}
      >
        <div className="flex items-center space-x-3 min-w-0">
          <FileTypeIcon type={doc.type} fileName={doc.name} size="md" />
          <div className="min-w-0">
            <h4 className="font-medium text-[var(--text)] truncate">{doc.subject}</h4>
            <p className="text-sm text-[var(--muted)] truncate">{doc.name} • {formatFileSize(doc.size)} • {new Date(doc.uploadedAt).toLocaleDateString()}</p>
            {doc.dueDate && <p className="text-xs text-[var(--muted)]">Due {new Date(doc.dueDate).toLocaleDateString()}</p>}
            {doc.notes && <p className="text-xs text-[var(--muted)] mt-1 truncate">Notes: {doc.notes}</p>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Document actions">
          {doc.currentStage && (
            <span className="px-2 py-1 text-xs bg-brand-cream text-brand-navy rounded-full border border-brand-navy/30">
              {formatStageLabel({ currentStage: doc.currentStage })}
            </span>
          )}
          {isPreviewable && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowPreview(true); }}
              className="px-3 py-1 text-xs bg-brand-gold text-brand-charcoal rounded hover:bg-brand-gold-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold"
              aria-label={`Preview document ${doc.name}`}
            >
              Preview
            </button>
          )}
          {doc.fileUrl && isNavalLetterDoc && (
            <button
              type="button"
              onClick={handleOpenInNLF}
              className="px-3 py-1 text-xs bg-brand-navy text-brand-cream rounded hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold"
              aria-label={`Edit ${doc.name} in Naval Letter Formatter`}
            >
              Edit in NLF
            </button>
          )}
          {doc.fileUrl && !isNavalLetterDoc && (
            <a
              href={doc.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 text-xs bg-brand-cream text-brand-navy rounded hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold underline decoration-brand-red-2 underline-offset-2"
              aria-label={`Open document ${doc.name} in new tab`}
            >
              Open
            </a>
          )}
          {/* Hide View/Edit for naval letters - use Edit in NLF instead */}
          {!isNavalLetterDoc && (
            <button
              type="button"
              className="px-3 py-1 text-xs bg-brand-cream text-brand-navy rounded hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold underline decoration-brand-red-2 underline-offset-2"
              onClick={(e) => { e.stopPropagation(); onView(doc); }}
              aria-label={`View or edit document ${doc.subject}`}
            >
              View/Edit
            </button>
          )}
          <button
            type="button"
            className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            onClick={(e) => { e.stopPropagation(); onDelete(doc); }}
            aria-label={`Delete document ${doc.subject}`}
          >
            Delete
          </button>
        </div>
      </article>

      {/* Document Preview Modal */}
      {doc.fileUrl && (
        <DocumentPreview
          url={doc.fileUrl}
          fileName={doc.name}
          mimeType={doc.type}
          fileSize={doc.size}
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  );
});
