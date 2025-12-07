import React from 'react';
import { Request } from '../types';

interface CommandSectionRequestDetailsProps {
  r: Request;
  comments: Record<string, string>;
  setComments: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  approveToCommander: (r: Request) => void;
  commandSectionReturn: (r: Request) => void;
}

const CommandSectionRequestDetails: React.FC<CommandSectionRequestDetailsProps> = ({
  r,
  comments,
  setComments,
  approveToCommander,
  commandSectionReturn,
}) => {
  return (
    <div id={`details-csec-${r.id}`} className="p-4 bg-gray-50 space-y-3">
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
      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          className="px-4 py-2 rounded bg-brand-gold text-brand-charcoal font-medium hover:bg-brand-gold-2"
          onClick={() => approveToCommander(r)}
        >
          Approve to Commander
        </button>
        <button
          className="px-4 py-2 rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2"
          onClick={() => commandSectionReturn(r)}
        >
          Return to Battalion
        </button>
      </div>
    </div>
  );
};

export default CommandSectionRequestDetails;
