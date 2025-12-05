import React, { useState, useMemo } from 'react';
import { Request } from '../types';

interface User {
  id: string;
  rank: string;
  lastName: string;
  firstName: string;
  mi?: string;
  company?: string;
  platoon?: string;
  unit?: string;
  unitUic?: string;
  email?: string;
  role?: string;
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
  const [modalPeople, setModalPeople] = useState<User[] | null>(null);

  const allUsers = useMemo(() => Object.values(users), [users]);

  const originatorFor = (r: Request) => users[r.uploadedById] || null;

  const displayUnitPart = (part?: string) => (part && part !== 'N/A') ? part : '—';

  const battalionSectionFor = (r: Request) => {
    const norm = (n: string) => String(n || '').trim().replace(/^S(\d)\b/, 'S-$1');
    if (r.routeSection) return norm(r.routeSection);
    if (!platoonSectionMap) return '';

    const ouic = r.unitUic || '';
    const originator = users[r.uploadedById];
    if (!originator) return '';

    const getValidUnitPart = (part?: string) => (part && part !== 'N/A') ? part : '';
    const oc = getValidUnitPart(originator.company);
    const ou = getValidUnitPart(originator.platoon);
    const mapped = platoonSectionMap[ouic]?.[oc]?.[ou] || '';
    return norm(mapped);
  };

  const formatStage = (r: Request) => {
    const stage = r.currentStage || 'PLATOON_REVIEW';
    switch (stage) {
      case 'PLATOON_REVIEW':
        return 'Platoon';
      case 'COMPANY_REVIEW':
        return 'Company';
      case 'BATTALION_REVIEW': {
        const section = battalionSectionFor(r);
        return section || 'Battalion';
      }
      case 'COMMANDER_REVIEW':
        return r.routeSection || 'Commander';
      case 'EXTERNAL_REVIEW': {
        const unitName = r.externalPendingUnitName || 'External';
        const section = r.routeSection;
        return section ? `${unitName} - ${section}` : unitName;
      }
      case 'ARCHIVED':
        return 'Archived';
      default:
        return stage;
    }
  };

  const checkLastActivity = (r: Request, pattern: RegExp) => {
    const a = r.activity?.[r.activity.length - 1];
    return !!a && pattern.test(a.action || '');
  };

  const isReturned = (r: Request) => checkLastActivity(r, /returned/i);
  const isRejected = (r: Request) => checkLastActivity(r, /rejected/i);

  const getApprovalStatus = (r: Request): 'approved' | 'endorsed' | null => {
    const approved = r.activity?.some(a => /(approved by commander|commander.*approved)/i.test(String(a.action || '')));
    if (approved) return 'approved';
    const endorsed = r.activity?.some(a => /(endorsed by commander|commander.*endorsed)/i.test(String(a.action || '')));
    if (endorsed) return 'endorsed';
    return null;
  };

  const getCurrentUnit = (r: Request) => {
    const stage = r.currentStage || 'PLATOON_REVIEW';
    if (stage === 'EXTERNAL_REVIEW') {
      return r.externalPendingUnitName || 'External Unit';
    }
    const originator = originatorFor(r);
    return originator?.unit || r.unitUic || 'N/A';
  };

  const getPeopleAtActionLevel = (r: Request): User[] => {
    const stage = r.currentStage || 'PLATOON_REVIEW';

    switch (stage) {
      case 'PLATOON_REVIEW': {
        const originator = originatorFor(r);
        if (!originator) return [];
        return allUsers.filter(u =>
          u.unitUic === r.unitUic &&
          u.company === originator.company &&
          u.platoon === originator.platoon
        );
      }
      case 'COMPANY_REVIEW': {
        const originator = originatorFor(r);
        if (!originator) return [];
        return allUsers.filter(u =>
          u.unitUic === r.unitUic &&
          u.company === originator.company
        );
      }
      case 'BATTALION_REVIEW': {
        const section = battalionSectionFor(r);
        return allUsers.filter(u =>
          u.unitUic === r.unitUic &&
          u.company === section
        );
      }
      case 'COMMANDER_REVIEW': {
        if (r.routeSection) {
          return allUsers.filter(u =>
            u.unitUic === r.unitUic &&
            u.company === r.routeSection
          );
        }
        return allUsers.filter(u =>
          u.unitUic === r.unitUic &&
          (u.role === 'COMMANDER' || u.company === 'HQ')
        );
      }
      default:
        return [];
    }
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
              <th className="p-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider">Unit</th>
              <th className="p-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider">Originator</th>
              <th className="p-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider">Company</th>
              <th className="p-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider">Platoon</th>
              <th className="p-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider">Created</th>
              <th className="p-3 text-left text-xs font-semibold text-brand-navy uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => {
              const returned = isReturned(r);
              const rejected = isRejected(r);
              const isNegative = returned || rejected;
              const approvalStatus = getApprovalStatus(r);
              const isPositive = !!approvalStatus;
              const originator = originatorFor(r);
              const peopleAtLevel = getPeopleAtActionLevel(r);

              return (
                <React.Fragment key={r.id}>
                  <tr
                    className={`border-b border-brand-navy/20 hover:bg-brand-cream/50 cursor-pointer ${
                      isNegative ? 'bg-red-100' : isPositive ? 'bg-green-100' : ''
                    }`}
                    onClick={() => onRowClick(r)}
                  >
                    <td className={`p-3 text-sm ${isNegative ? 'text-red-700 font-bold' : isPositive ? 'text-green-700 font-bold' : 'text-[var(--text)]'}`}>
                      {returned && <span className="font-bold">Returned: </span>}
                      {rejected && <span className="font-bold">Rejected: </span>}
                      {approvalStatus === 'approved' && <span className="font-bold">Approved: </span>}
                      {approvalStatus === 'endorsed' && <span className="font-bold">Endorsed: </span>}
                      {r.subject}
                    </td>
                    <td className="p-3 text-sm text-[var(--text)]">
                      <span className="px-2 py-1 text-xs bg-brand-cream text-brand-navy rounded-full border border-brand-navy/30">
                        {formatStage(r)}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-[var(--text)]">
                      {getCurrentUnit(r)}
                    </td>
                    <td className="p-3 text-sm text-[var(--text)]">
                      {originator ? `${originator.rank} ${originator.lastName}, ${originator.firstName}` : 'N/A'}
                    </td>
                    <td className="p-3 text-sm text-[var(--text)]">
                      {displayUnitPart(originator?.company)}
                    </td>
                    <td className="p-3 text-sm text-[var(--text)]">
                      {displayUnitPart(originator?.platoon)}
                    </td>
                    <td className="p-3 text-sm text-[var(--text)]">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="p-3 text-sm text-[var(--text)]">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setModalPeople(peopleAtLevel);
                        }}
                        className="px-2 py-1 text-xs bg-brand-navy text-brand-cream rounded hover:bg-brand-red-2"
                      >
                        Contacts ({peopleAtLevel.length})
                      </button>
                    </td>
                  </tr>
                  {expandedRows[r.id] && (
                    <tr>
                      <td colSpan={8} className="p-4 bg-gray-50">
                        {children(r)}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {requests.length === 0 && (
              <tr>
                <td colSpan={8} className="p-3 text-sm text-center text-[var(--muted)]">
                  No requests to display.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Contact Modal */}
      {modalPeople && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50"
          onClick={() => setModalPeople(null)}
        >
          <div
            className="bg-[var(--surface)] rounded-lg shadow-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[var(--text)]">Contacts at Current Action Level</h3>
              <button
                onClick={() => setModalPeople(null)}
                className="text-[var(--muted)] hover:text-[var(--text)]"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              {modalPeople.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">No contacts found at this action level.</p>
              ) : (
                modalPeople.map((person) => (
                  <div
                    key={person.id}
                    className="p-4 border border-brand-navy/20 rounded-lg bg-brand-cream/30"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-[var(--text)]">
                          {person.rank} {person.lastName}, {person.firstName} {person.mi || ''}
                        </div>
                        <div className="text-sm text-[var(--muted)] mt-1">
                          {person.email || 'No email provided'}
                        </div>
                        {person.company && person.company !== 'N/A' && (
                          <div className="text-xs text-[var(--muted)] mt-1">
                            Company: {person.company}
                            {person.platoon && person.platoon !== 'N/A' && ` • Platoon: ${person.platoon}`}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestTable;
