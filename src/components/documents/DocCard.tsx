import React, { memo } from 'react';
import { Document } from './types';
import { formatStageLabel } from '@/lib/stage';
import { Request } from '@/types';

interface DocCardProps {
  doc: Document;
  onView: (doc: Document) => void;
  onDelete: (doc: Document) => void;
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
  const formatStage = (r: Partial<Request>) => formatStageLabel(r);

  return (
    <article
      className="flex items-center justify-between p-4 border border-brand-navy/20 rounded-lg bg-[var(--surface)] hover:bg-brand-cream/50 transition-colors"
      aria-label={`Document: ${doc.subject}`}
    >
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-brand-cream rounded-lg flex items-center justify-center" aria-hidden="true">
          <svg className="w-5 h-5 text-brand-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <h4 className="font-medium text-[var(--text)]">{doc.subject}</h4>
          <p className="text-sm text-[var(--muted)]">{doc.name} • {formatFileSize(doc.size)} • {new Date(doc.uploadedAt).toLocaleDateString()}</p>
          {doc.dueDate && <p className="text-xs text-[var(--muted)]">Due {new Date(doc.dueDate).toLocaleDateString()}</p>}
          {doc.notes && <p className="text-xs text-[var(--muted)] mt-1">Notes: {doc.notes}</p>}
        </div>
      </div>
      <div className="flex items-center space-x-2" role="group" aria-label="Document actions">
        {doc.currentStage && (
          <span className="px-2 py-1 text-xs bg-brand-cream text-brand-navy rounded-full border border-brand-navy/30">
            {formatStage({ currentStage: doc.currentStage } as Request)}
          </span>
        )}
        {doc.fileUrl && (
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
        <button
          type="button"
          className="px-3 py-1 text-xs bg-brand-cream text-brand-navy rounded hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold underline decoration-brand-red-2 underline-offset-2"
          onClick={(e) => { e.stopPropagation(); onView(doc); }}
          aria-label={`View or edit document ${doc.subject}`}
        >
          View/Edit
        </button>
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
  );
});
