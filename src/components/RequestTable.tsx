import React from 'react';
import { Request } from '../types';

interface User {
  id: string;
  rank: string;
  lastName: string;
  firstName: string;
  mi?: string;
  company?: string;
  platoon?: string;
}

interface RequestTableProps {
  requests: Request[];
  users: Record<string, User>;
  onRowClick: (request: Request) => void;
  title: string;
  expandedRows: Record<string, boolean>;
  children: (request: Request) => React.ReactNode;
  platoonSectionMap?: Record<string, Record<string, Record<string, string>>>;
}

const RequestTable: React.FC<RequestTableProps> = ({ requests, users, onRowClick, title, expandedRows, children, platoonSectionMap }) => {
  const originatorFor = (r: Request) => users[r.uploadedById] || null;

  const battalionSectionFor = (r: Request) => {
    const norm = (n: string) => String(n || '').trim().replace(/^S(\d)\b/, 'S-$1');
    if (r.routeSection) return norm(r.routeSection);
    if (!platoonSectionMap) return '';
    const ouic = r.unitUic || '';
    const originator = users[r.uploadedById];
    const oc = (originator?.company && originator.company !== 'N/A') ? originator.company : '';
    const ou = (originator?.platoon && originator.platoon !== 'N/A') ? originator.platoon : '';
    const mapped = platoonSectionMap[ouic]?.[oc]?.[ou] || '';
    return norm(mapped);
  };

  const formatStage = (r: Request) => {
    const stage = r.currentStage || 'PLATOON_REVIEW';
    if (stage === 'PLATOON_REVIEW') return 'Platoon';
    if (stage === 'COMPANY_REVIEW') return 'Company';
    if (stage === 'BATTALION_REVIEW') {
      const section = battalionSectionFor(r);
      return section || 'Battalion';
    }
    if (stage === 'COMMANDER_REVIEW') return r.routeSection || 'Commander';
    if (stage === 'EXTERNAL_REVIEW') {
      const unitName = (r as any).externalPendingUnitName || 'External';
      const section = r.routeSection;
      return section ? `${unitName} - ${section}` : unitName;
    }
    if (stage === 'ARCHIVED') return 'Archived';
    return stage;
  };

  const isReturned = (r: Request) => {
    const a = r.activity && r.activity.length ? r.activity[r.activity.length - 1] : null;
    return !!a && /returned/i.test(String(a.action || ''));
  };

  const isRejected = (r: Request) => {
    const a = r.activity && r.activity.length ? r.activity[r.activity.length - 1] : null;
    return !!a && /rejected/i.test(String(a.action || ''));
  };

  const isApproved = (r: Request) => {
    return r.activity?.some(a => /commander.*approved|commander.*endorsed/i.test(String(a.action || '')));
  };

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
                  className={`border-b border-brand-navy/20 hover:bg-brand-cream/50 cursor-pointer ${
                    isReturned(r) || isRejected(r) ? 'bg-red-100' : isApproved(r) ? 'bg-green-100' : ''
                  }`}
                  onClick={() => onRowClick(r)}
                >
                  <td className={`p-3 text-sm ${(isReturned(r) || isRejected(r)) ? 'text-red-700 font-bold' : 'text-[var(--text)]'}`}>
                    {isReturned(r) && <span className="font-bold">Returned: </span>}
                    {isRejected(r) && <span className="font-bold">Rejected: </span>}
                    {r.subject}
                  </td>
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
                    <td colSpan={4} className="p-4 bg-gray-50">
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
