import React from 'react';
import { Request, DocumentItem } from '../types';

interface CommanderRequestDetailsProps {
  r: Request;
  docsFor: (requestId: string) => DocumentItem[];
  expandedDocs: Record<string, boolean>;
  setExpandedDocs: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setOpenDocsId: React.Dispatch<React.SetStateAction<string | null>>;
  docsRef: React.RefObject<HTMLDivElement>;
  comments: Record<string, string>;
  setComments: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  attach: Record<string, File[]>;
  setAttach: React.Dispatch<React.SetStateAction<Record<string, File[]>>>;
  addFilesToRequest: (r: Request) => void;
  selectedCommandSection: Record<string, string>;
  setSelectedCommandSection: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  commandSections: string[];
  sendToCommandSection: (r: Request) => void;
  commanderDecision: (r: Request, type: 'Approved' | 'Endorsed' | 'Rejected') => void;
  expandedLogs: Record<string, boolean>;
  setExpandedLogs: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

const CommanderRequestDetails: React.FC<CommanderRequestDetailsProps> = ({
  r,
  docsFor,
  expandedDocs,
  setExpandedDocs,
  setOpenDocsId,
  docsRef,
  comments,
  setComments,
  attach,
  setAttach,
  addFilesToRequest,
  selectedCommandSection,
  setSelectedCommandSection,
  commandSections,
  sendToCommandSection,
  commanderDecision,
  expandedLogs,
  setExpandedLogs,
}) => {
  const isCommandSectionSelected = selectedCommandSection[r.id] && selectedCommandSection[r.id] !== 'NONE';

  const handleToggleDocs = () => {
    const isExpanded = !!expandedDocs[r.id];
    setExpandedDocs(prev => ({ ...prev, [r.id]: !isExpanded }));
    setOpenDocsId(isExpanded ? null : r.id);
  };

  return (
    <div id={`details-cmd-${r.id}`}>
      <div className="mt-3">
        <button
          className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2"
          aria-expanded={!!expandedDocs[r.id]}
          aria-controls={`docs-cmd-${r.id}`}
          onClick={handleToggleDocs}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleToggleDocs(); } }}
        >
          <span>Show Documents</span>
          <svg width="10" height="10" viewBox="0 0 20 20" className={`transition-transform ${expandedDocs[r.id] ? 'rotate-180' : 'rotate-0'}`} aria-hidden="true"><path d="M5 7l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
        </button>
      </div>
      <div
        id={`docs-cmd-${r.id}`}
        ref={expandedDocs[r.id] ? docsRef : undefined}
        className={`${expandedDocs[r.id] ? 'mt-2 space-y-2 overflow-hidden transition-all duration-300 max-h-[50vh] opacity-100' : 'mt-2 space-y-2 overflow-hidden transition-all duration-300 max-h-0 opacity-0'}`}
      >
        {docsFor(r.id).map(d => (
          <div key={d.id} className="flex items-center justify-between p-3 border border-brand-navy/20 rounded-lg bg-[var(--surface)]">
            <div className="text-sm text-[var(--muted)]">
              <div className="font-medium text-[var(--text)]">{d.name}</div>
              <div>{new Date(d.uploadedAt).toLocaleDateString()}</div>
            </div>
            <div className="flex items-center gap-2">
              {d.fileUrl ? (
                <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1 text-xs bg-brand-cream text-brand-navy rounded hover:bg-brand-gold-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold">Open</a>
              ) : (
                <span className="px-3 py-1 text-xs bg-brand-cream text-brand-navy rounded opacity-60" aria-disabled="true">Open</span>
              )}
            </div>
          </div>
        ))}
        {docsFor(r.id).length === 0 && (
          <div className="text-sm text-[var(--muted)]">No documents</div>
        )}
      </div>
      <div className="mt-3">
        <label className="block text-sm font-medium text-[var(--text)] mb-1">Reviewer Comment</label>
        <textarea
          rows={2}
          value={comments[r.id] || ''}
          onChange={(e) => setComments(prev => ({ ...prev, [r.id]: e.target.value }))}
          className="w-full px-3 py-2 border border-brand-navy/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold"
          placeholder="Optional notes"
        />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <label className="bg-brand-navy text-brand-cream px-3 py-1 rounded hover:bg-brand-red-2 cursor-pointer inline-block">
          <input
            type="file"
            multiple
            onChange={(e) => setAttach(prev => ({ ...prev, [r.id]: e.target.files ? Array.from(e.target.files) : [] }))}
            className="hidden"
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
          />
          Add Files
        </label>
        <span className="text-xs text-[var(--muted)]">{(attach[r.id] || []).length ? `${(attach[r.id] || []).length} file(s) selected` : 'No files selected'}</span>
        <button
          className="px-3 py-1 text-xs bg-brand-gold text-brand-charcoal rounded hover:bg-brand-gold-2"
          onClick={() => addFilesToRequest(r)}
          disabled={!attach[r.id] || !(attach[r.id] || []).length}
        >
          Save Files
        </button>
      </div>
      <div className="mt-3">
        <label className="block text-sm font-medium text-[var(--text)] mb-2">Route to Command Section for Review</label>
        <select
          value={selectedCommandSection[r.id] || 'NONE'}
          onChange={e => setSelectedCommandSection(prev => ({...prev, [r.id]: e.target.value}))}
          className="w-full px-3 py-2 border border-brand-navy/30 rounded-lg"
        >
          <option value="NONE">None - Make final decision below</option>
          {commandSections.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {isCommandSectionSelected ? (
          <p className="text-xs text-[var(--muted)] mt-1">
            Click "Send to {selectedCommandSection[r.id]}" to route for their review
          </p>
        ) : (
          <p className="text-xs text-[var(--muted)] mt-1">
            Select a command section to get their input first, or make your final decision below
          </p>
        )}
      </div>
      {isCommandSectionSelected && (
        <div className="mt-3 flex items-center justify-end">
          <button
            className="px-4 py-2 rounded bg-brand-gold text-brand-charcoal font-medium hover:bg-brand-gold-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold"
            onClick={() => sendToCommandSection(r)}
          >
            Send to {selectedCommandSection[r.id]}
          </button>
        </div>
      )}
      <div className="mt-3">
        <label className="block text-sm font-medium text-[var(--text)] mb-2">Final Decision</label>
        <div className="flex items-center justify-end gap-2">
          <button
            className="px-3 py-2 rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold"
            onClick={() => commanderDecision(r, 'Approved')}
          >
            Approved
          </button>
          <button
            className="px-3 py-2 rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold"
            onClick={() => commanderDecision(r, 'Endorsed')}
          >
            Endorsed
          </button>
          <button
            className="px-3 py-2 rounded bg-brand-navy text-brand-cream hover:bg-brand-red-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold"
            onClick={() => commanderDecision(r, 'Rejected')}
          >
            Rejected
          </button>
        </div>
      </div>
      <div className="mt-3">
        <button
          className="px-3 py-1 text-xs rounded bg-brand-navy text-brand-cream hover:bg-brand-red-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold"
          onClick={() => setExpandedLogs(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
          aria-expanded={!!expandedLogs[r.id]}
          aria-controls={`logs-cmd-${r.id}`}
        >
          {expandedLogs[r.id] ? 'Hide' : 'Show'} Activity Log
        </button>
        <div id={`logs-cmd-${r.id}`} className={expandedLogs[r.id] ? 'mt-2 space-y-2' : 'hidden'}>
          {r.activity && r.activity.length ? (
            r.activity.map((a, idx) => (
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
    </div>
  );
};

export default CommanderRequestDetails;
