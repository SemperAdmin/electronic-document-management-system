import React, { useCallback } from 'react';
import { UserRecord } from '@/types';
import { FeedbackMessage } from './types';
import { MAX_FILES_PER_UPLOAD } from '@/lib/validation';
import { FileDropzone } from '../common/FileDropzone';
import { FeedbackAlert } from '../common/FeedbackAlert';

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
  /** @deprecated Use FileDropzone internally now */
  onFileSelect?: (event: React.ChangeEvent<HTMLInputElement>) => void;
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
  const handleFilesAdded = useCallback((files: File[]) => {
    setSelectedFiles(prev => [...prev, ...files]);
  }, [setSelectedFiles]);

  const handleFileRemoved = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }, [setSelectedFiles]);

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

      <FileDropzone
        files={selectedFiles}
        onFilesAdded={handleFilesAdded}
        onFileRemoved={handleFileRemoved}
        compact
      />

      <div className="flex justify-end gap-2">
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

      {feedback && (
        <FeedbackAlert
          type={feedback.type}
          message={feedback.message}
        />
      )}
    </form>
  );
};
