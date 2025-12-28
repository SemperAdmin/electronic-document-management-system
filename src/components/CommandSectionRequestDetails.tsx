import React, { useState } from 'react';
import { Request, DocumentItem } from '../types';
import { DocumentList, DocumentPreview } from '@/components/common';

interface CommandSectionRequestDetailsProps {
  r: Request;
  docsFor: (requestId: string) => DocumentItem[];
  comments: Record<string, string>;
  setComments: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  attach: Record<string, File[]>;
  setAttach: React.Dispatch<React.SetStateAction<Record<string, File[]>>>;
  addFilesToRequest: (r: Request) => void;
  approveToCommander: (r: Request) => void;
  commandSectionReturn: (r: Request) => void;
  commandSections: string[];
  selectedCommandSection: Record<string, string>;
  setSelectedCommandSection: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  routeToCommandSection: (r: Request, targetSection: string) => void;
}

const CommandSectionRequestDetails: React.FC<CommandSectionRequestDetailsProps> = ({
  r,
  docsFor,
  comments,
  setComments,
  attach,
  setAttach,
  addFilesToRequest,
  approveToCommander,
  commandSectionReturn,
  commandSections,
  selectedCommandSection,
  setSelectedCommandSection,
  routeToCommandSection,
}) => {
  const [expandedDocs, setExpandedDocs] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const requestDocs = docsFor(r.id);

  return (
    <div id={`details-csec-${r.id}`} className="p-4 bg-gray-50 space-y-3">
      {/* Documents Section */}
      <div>
        <button
          className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2"
          aria-expanded={expandedDocs}
          aria-controls={`docs-csec-${r.id}`}
          onClick={() => setExpandedDocs(!expandedDocs)}
        >
          <span>{expandedDocs ? 'Hide' : 'Show'} Documents ({requestDocs.length})</span>
          <svg width="10" height="10" viewBox="0 0 20 20" className={`transition-transform ${expandedDocs ? 'rotate-180' : 'rotate-0'}`} aria-hidden="true">
            <path d="M5 7l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2"/>
          </svg>
        </button>
        <div
          id={`docs-csec-${r.id}`}
          className={`${expandedDocs ? 'mt-2 space-y-2 overflow-hidden transition-all duration-300 max-h-[50vh] opacity-100' : 'mt-2 space-y-2 overflow-hidden transition-all duration-300 max-h-0 opacity-0'}`}
        >
          <DocumentList
            documents={requestDocs.map(d => ({ ...d, fileUrl: (d as any).fileUrl }))}
            showIcons
            onPreview={(doc) => setPreviewDoc(requestDocs.find(d => d.id === doc.id) || null)}
          />
        </div>
      </div>

      {/* Comment Section */}
      <div>
        <label className="block text-sm font-medium text-[var(--text)] mb-1">Reviewer Comment</label>
        <textarea
          rows={2}
          value={comments[r.id] || ''}
          onChange={(e) => setComments(prev => ({ ...prev, [r.id]: e.target.value }))}
          className="w-full px-3 py-2 border border-brand-navy/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold"
          placeholder="Optional notes"
        />
      </div>

      {/* File Attachment */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="bg-brand-navy text-brand-cream px-3 py-1 text-sm rounded hover:bg-brand-red-2 cursor-pointer inline-block">
          <input
            type="file"
            multiple
            onChange={(e) => setAttach(prev => ({ ...prev, [r.id]: e.target.files ? Array.from(e.target.files) : [] }))}
            className="hidden"
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
          />
          Add Files
        </label>
        <span className="text-xs text-[var(--muted)]">
          {(attach[r.id] || []).length ? `${(attach[r.id] || []).length} file(s) selected` : 'No files selected'}
        </span>
        {(attach[r.id] || []).length > 0 && (
          <button
            className="px-3 py-1 text-xs bg-brand-gold text-brand-charcoal rounded hover:bg-brand-gold-2"
            onClick={() => addFilesToRequest(r)}
          >
            Save Files
          </button>
        )}
      </div>

      {/* Activity Log */}
      <div>
        <button
          className="px-3 py-1 text-xs rounded bg-brand-navy text-brand-cream hover:bg-brand-red-2"
          onClick={() => setExpandedLogs(!expandedLogs)}
          aria-expanded={expandedLogs}
          aria-controls={`logs-csec-${r.id}`}
        >
          {expandedLogs ? 'Hide' : 'Show'} Activity Log
        </button>
        <div id={`logs-csec-${r.id}`} className={expandedLogs ? 'mt-2 space-y-2' : 'hidden'}>
          {r.activity && r.activity.length ? (
            r.activity.map((a, idx) => (
              <div key={idx} className="text-xs text-gray-700">
                <div className="font-medium">{a.actor} • {new Date(a.timestamp).toLocaleString()} • {a.action}</div>
                {a.comment && <div className="text-gray-600 pl-4 border-l-2 border-gray-300 ml-2">{a.comment}</div>}
              </div>
            ))
          ) : (
            <div className="text-xs text-gray-500">No activity</div>
          )}
        </div>
      </div>

      {/* Route to Another Command Section */}
      {commandSections.length > 1 && (
        <div className="pt-2 border-t border-brand-navy/10">
          <label className="block text-sm font-medium text-[var(--text)] mb-1">Route to Another Section</label>
          <div className="flex items-center gap-2">
            <select
              value={selectedCommandSection[r.id] || ''}
              onChange={(e) => setSelectedCommandSection(prev => ({ ...prev, [r.id]: e.target.value }))}
              className="flex-1 px-3 py-2 border border-brand-navy/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold text-sm"
            >
              <option value="">Select section...</option>
              {commandSections
                .filter(sec => sec !== r.routeSection)
                .map(sec => (
                  <option key={sec} value={sec}>{sec}</option>
                ))
              }
            </select>
            <button
              className="px-4 py-2 rounded bg-brand-navy text-brand-cream hover:bg-brand-red-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => routeToCommandSection(r, selectedCommandSection[r.id] || '')}
              disabled={!selectedCommandSection[r.id]}
            >
              Route
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="pt-2 border-t border-brand-navy/10 flex items-center justify-end gap-2">
        <button
          className="px-4 py-2 rounded bg-brand-gold text-brand-charcoal font-medium hover:bg-brand-gold-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold"
          onClick={() => approveToCommander(r)}
        >
          Approve to Commander
        </button>
        <button
          className="px-4 py-2 rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold"
          onClick={() => commandSectionReturn(r)}
        >
          Return to Battalion
        </button>
      </div>

      {/* Document Preview Modal */}
      {previewDoc && (
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

export default CommandSectionRequestDetails;
