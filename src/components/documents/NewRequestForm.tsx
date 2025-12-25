import React from 'react';
import { UserRecord } from '@/types';
import { FeedbackMessage } from './types';
import { MAX_FILES_PER_UPLOAD } from '@/lib/validation';

interface NewRequestFormProps {
  subject: string;
  setSubject: (value: string) => void;
  dueDate: string;
  setDueDate: (value: string) => void;
  notes: string;
  setNotes: (value: string) => void;
  selectedFiles: File[];
  setSelectedFiles: React.Dispatch<React.SetStateAction<File[]>>;
  submitForUserId: string;
  setSubmitForUserId: (value: string) => void;
  currentUser: UserRecord | null;
  eligibleUsers: UserRecord[];
  isReviewer: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  feedback: FeedbackMessage | null;
}

export const NewRequestForm: React.FC<NewRequestFormProps> = ({
  subject,
  setSubject,
  dueDate,
  setDueDate,
  notes,
  setNotes,
  selectedFiles,
  setSelectedFiles,
  submitForUserId,
  setSubmitForUserId,
  eligibleUsers,
  isReviewer,
  onSubmit,
  onCancel,
  onFileSelect,
  feedback,
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-[var(--text)] mb-1">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Document subject/title"
            className={`w-full px-3 py-2 border ${subject.trim() ? 'border-brand-navy/30' : 'border-brand-red'} rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold`}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-1">Due Date (optional)</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-3 py-2 border border-brand-navy/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold"
          />
        </div>
      </div>

      {isReviewer && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-[var(--text)] mb-1">Submit For (optional)</label>
            <select
              value={submitForUserId}
              onChange={(e) => setSubmitForUserId(e.target.value)}
              className="w-full px-3 py-2 border border-brand-navy/30 rounded-lg"
            >
              <option value="">Myself</option>
              {eligibleUsers.map(u => (
                <option key={u.id} value={u.id}>{u.rank} {u.lastName}, {u.firstName}{u.mi ? ` ${u.mi}` : ''}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-[var(--text)] mb-1">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Additional context for reviewers"
          className="w-full px-3 py-2 border border-brand-navy/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold"
        />
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <label className="bg-brand-navy text-brand-cream px-4 py-2 rounded-lg hover:bg-brand-red-2 cursor-pointer transition-colors inline-block">
          <input
            type="file"
            multiple
            onChange={onFileSelect}
            className="hidden"
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
          />
          Attach Files
        </label>
        <div className="flex-1">
          {selectedFiles.length > 0 ? (
            <div className="ml-2 flex flex-wrap gap-2">
              {selectedFiles.map((f, idx) => (
                <span key={idx} className="inline-flex items-center gap-2 px-2 py-1 text-xs bg-brand-cream text-brand-navy rounded border border-brand-navy/20">
                  <span className="max-w-[240px] truncate" title={f.name}>{f.name}</span>
                  <button
                    type="button"
                    className="text-brand-red-2 hover:underline"
                    onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                  >
                    Delete
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <span className="ml-2 text-xs text-[var(--muted)]">No files selected (max {MAX_FILES_PER_UPLOAD})</span>
          )}
        </div>
        <div className="md:ml-auto flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-brand-navy/30 text-brand-navy hover:bg-brand-cream"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-brand-gold text-brand-charcoal px-4 py-2 rounded-lg hover:bg-brand-gold-2 transition-colors disabled:opacity-60"
            disabled={!subject.trim()}
          >
            Submit
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`p-3 rounded-lg border ${feedback.type === 'success' ? 'bg-brand-cream border-brand-gold text-brand-navy' : 'bg-brand-cream border-brand-red text-brand-red'}`}>
          {feedback.message}
        </div>
      )}
    </form>
  );
};
