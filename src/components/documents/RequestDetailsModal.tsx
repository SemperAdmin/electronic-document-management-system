import React, { useState } from 'react';
import { Request, UserRecord } from '@/types';
import { Document, FeedbackMessage } from './types';
import { DocCard } from './DocCard';
import { originatorArchiveOnly } from '@/lib/stage';
import { validateFile, MAX_FILES_PER_UPLOAD } from '@/lib/validation';

interface RequestDetailsModalProps {
  request: Request;
  documents: Document[];
  currentUser: UserRecord | null;
  editSubject: string;
  setEditSubject: (value: string) => void;
  editDueDate: string;
  setEditDueDate: (value: string) => void;
  editNotes: string;
  setEditNotes: (value: string) => void;
  attachFiles: File[];
  setAttachFiles: React.Dispatch<React.SetStateAction<File[]>>;
  docsExpanded: boolean;
  setDocsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  onClose: () => void;
  onSave: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onViewDoc: (doc: Document) => void;
  onDeleteDoc: (doc: Document) => void;
}

export const RequestDetailsModal: React.FC<RequestDetailsModalProps> = ({
  request,
  documents,
  currentUser,
  editSubject,
  setEditSubject,
  editDueDate,
  setEditDueDate,
  editNotes,
  setEditNotes,
  attachFiles,
  setAttachFiles,
  docsExpanded,
  setDocsExpanded,
  onClose,
  onSave,
  onArchive,
  onDelete,
  onViewDoc,
  onDeleteDoc,
}) => {
  const [fileError, setFileError] = useState<string | null>(null);
  const isOwner = currentUser && currentUser.id === request.uploadedById;
  const showArchiveOnly = originatorArchiveOnly(request, String(currentUser?.id || ''));
  const requestDocs = documents.filter(d => d.requestId === request.id && d.type !== 'request');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    // Check if adding these files would exceed the limit
    if (attachFiles.length + files.length > MAX_FILES_PER_UPLOAD) {
      setFileError(`Cannot add ${files.length} file(s). Maximum ${MAX_FILES_PER_UPLOAD} files allowed.`);
      try { e.target.value = '' } catch {}
      return;
    }

    // Validate each file
    const validFiles: File[] = [];
    const errors: string[] = [];

    for (const file of files) {
      const result = validateFile(file);
      if (result.valid) {
        validFiles.push(file);
      } else {
        errors.push(...result.errors);
      }
    }

    // Add valid files
    if (validFiles.length > 0) {
      setAttachFiles(prev => [...prev, ...validFiles]);
      setFileError(null);
    }

    // Show errors if any files were rejected
    if (errors.length > 0) {
      setFileError(errors.slice(0, 2).join(' '));
    }

    try { e.target.value = '' } catch {}
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[var(--surface)] rounded-lg shadow w-full max-w-2xl p-6 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-[var(--text)]">Request</h3>
          <button className="text-brand-navy" onClick={onClose}>✕</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1">Subject</label>
            <input
              type="text"
              value={editSubject}
              onChange={(e) => setEditSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-[var(--muted)]">Submitted {new Date(request.createdAt).toLocaleString()}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">Due Date</label>
              <input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {request.currentStage && (
            <span className="px-2 py-1 text-xs bg-brand-cream text-brand-navy rounded-full border border-brand-navy/30">
              {request.currentStage}
            </span>
          )}

          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1">Notes</label>
            <textarea
              rows={3}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              className="w-full px-3 py-2 border border-brand-navy/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold"
            />
          </div>

          {/* Activity Log */}
          <div>
            <h4 className="text-sm font-medium text-[var(--text)]">Action Log</h4>
            <div className="mt-2 space-y-2">
              {request.activity && request.activity.length ? (
                request.activity.map((a, idx) => (
                  <div key={idx} className="text-xs text-gray-700">
                    <div className="font-medium">{a.actor} • {new Date(a.timestamp).toLocaleString()} • {a.action}</div>
                    {a.comment && <div className="text-gray-600">{a.comment}</div>}
                  </div>
                ))
              ) : (
                <div className="text-xs text-gray-500">No activity</div>
              )}
            </div>
          </div>

          {/* Documents */}
          <div>
            <h4 className="text-sm font-medium text-[var(--text)]">Documents</h4>
            <button
              className="mt-2 px-3 py-1 rounded bg-brand-navy text-brand-cream hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold underline decoration-brand-red-2 underline-offset-2"
              aria-expanded={docsExpanded}
              aria-controls="docs-panel"
              onClick={() => setDocsExpanded(p => !p)}
            >
              {docsExpanded ? 'Hide' : 'Show'} Documents ({requestDocs.length})
            </button>

            <div id="docs-panel" className={docsExpanded ? 'mt-3 space-y-2' : 'hidden'}>
              {requestDocs.map(d => (
                <DocCard key={d.id} doc={d} onView={onViewDoc} onDelete={onDeleteDoc} />
              ))}
              {requestDocs.length === 0 && (
                <div className="text-sm text-[var(--muted)]">No documents attached</div>
              )}
            </div>

            {/* Attach files (only if not archive-only) */}
            {!showArchiveOnly && (
              <div className="mt-3">
                <label className="bg-brand-navy text-brand-cream px-3 py-1 rounded-lg hover:brightness-110 cursor-pointer inline-block">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                  />
                  Add Files
                </label>
                {fileError && (
                  <p className="text-sm text-red-600 mt-1" role="alert">{fileError}</p>
                )}
                <div className="ml-2 flex flex-wrap gap-2 mt-2">
                  {attachFiles.length === 0 ? (
                    <span className="text-xs text-[var(--muted)]">No files selected</span>
                  ) : (
                    attachFiles.map((f, idx) => (
                      <span key={idx} className="inline-flex items-center gap-2 px-2 py-1 text-xs bg-brand-cream text-brand-navy rounded border border-brand-navy/20">
                        <span className="max-w-[240px] truncate" title={f.name}>{f.name}</span>
                        <button
                          type="button"
                          className="text-brand-red-2 hover:underline"
                          onClick={() => setAttachFiles(prev => prev.filter((_, i) => i !== idx))}
                        >
                          Delete
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-2">
          <button
            className="px-4 py-2 rounded-lg border border-brand-navy/30 text-brand-navy hover:bg-brand-cream"
            onClick={onClose}
          >
            Close
          </button>

          {showArchiveOnly ? (
            <button
              className="px-4 py-2 rounded-lg bg-brand-gold text-brand-charcoal hover:brightness-110"
              onClick={onArchive}
            >
              Archive
            </button>
          ) : (
            <button
              className="px-4 py-2 rounded-lg bg-brand-navy text-brand-cream hover:brightness-110"
              onClick={onSave}
              disabled={!isOwner}
            >
              Save Changes
            </button>
          )}

          {isOwner && (
            <button
              className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
              onClick={onDelete}
            >
              Delete Request
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
