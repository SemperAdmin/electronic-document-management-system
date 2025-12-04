import React from 'react';
import { Request } from '../types';

interface User {
  id: string;
  rank: string;
  lastName: string;
  firstName: string;
  mi?: string;
}

interface RequestTableProps {
  requests: Request[];
  users: Record<string, User>;
  onRowClick: (request: Request) => void;
  title: string;
  expandedRows: Record<string, boolean>;
  children: (request: Request) => React.ReactNode;
}

const formatStage = (r: Request) => {
  const stage = r.currentStage || 'PLATOON_REVIEW'
  if (stage === 'PLATOON_REVIEW') return 'Platoon'
  if (stage === 'COMPANY_REVIEW') return 'Company'
  if (stage === 'BATTALION_REVIEW') return r.routeSection || 'Battalion'
  if (stage === 'COMMANDER_REVIEW') return r.routeSection || 'Commander'
  if (stage === 'ARCHIVED') return 'Archived'
  return stage
}

const RequestTable: React.FC<RequestTableProps> = ({ requests, users, onRowClick, title, expandedRows, children }) => {
  const originatorFor = (r: Request) => users[r.uploadedById] || null;

  return (
    <div>
      <h3 className="text-lg font-semibold text-[var(--text)] mb-3">{title}</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-[var(--surface)] border border-brand-navy/20">
          <thead className="bg-brand-cream border-b border-brand-navy/20">
            <tr>
              <th className="p-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider">Subject</th>
              <th className="p-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider">Status</th>
              <th className="p-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider">Originator</th>
              <th className="p-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider">Created</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <React.Fragment key={r.id}>
                <tr
                  className="border-b border-brand-navy/20 hover:bg-brand-cream/50 cursor-pointer"
                  onClick={() => onRowClick(r)}
                >
                  <td className="p-3 text-sm text-[var(--text)]">{r.subject}</td>
                  <td className="p-3 text-sm text-[var(--text)]">
                    <span className="px-2 py-1 text-xs bg-brand-cream text-brand-navy rounded-full border border-brand-navy/30">
                      {formatStage(r)}
                    </span>
                  </td>
                  <td className="p-3 text-sm text-[var(--text)]">
                    {originatorFor(r) ? `${originatorFor(r)!.rank} ${originatorFor(r)!.lastName}, ${originatorFor(r)!.firstName}` : 'N/A'}
                  </td>
                  <td className="p-3 text-sm text-[var(--text)]">{new Date(r.createdAt).toLocaleDateString()}</td>
                </tr>
                {expandedRows[r.id] && (
                  <tr>
                    <td colSpan={4} className="p-4">
                      {children(r)}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan={4} className="p-3 text-sm text-center text-[var(--muted)]">
                  No requests to display.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RequestTable;
