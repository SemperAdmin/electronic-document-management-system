import React, { useEffect, useState } from 'react';
import { listRequests, listUsers, upsertRequest } from '../lib/db';
import RequestTable from '../components/RequestTable';
import { Request } from '../types';

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  mi?: string;
  rank: string;
  company: string;
  unit: string;
  unitUic?: string;
  platoon?: string;
  installationId?: string;
  is_installation_admin?: boolean;
}

export default function InstallationApp() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [usersById, setUsersById] = useState<Record<string, UserProfile>>({});
  const [expandedCard, setExpandedCard] = useState<Record<string, boolean>>({});
  const [comments, setComments] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem('currentUser');
      if (raw) {
        setCurrentUser(JSON.parse(raw));
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (currentUser?.is_installation_admin && currentUser?.installationId) {
      listRequests().then((remote) => {
        const installationRequests = (remote as Request[]).filter(
          (r) => r.installationId === currentUser.installationId && r.currentStage === 'INSTALLATION_REVIEW'
        );
        setRequests(installationRequests);
      }).catch(() => setRequests([]));
    }
  }, [currentUser]);

  useEffect(() => {
    listUsers().then((remote) => {
      const byId: Record<string, UserProfile> = {};
      for (const u of (remote as any)) byId[u.id] = u;
      setUsersById(byId);
    }).catch(() => setUsersById({}));
  }, []);

  const handleInstallationDecision = async (r: Request, decision: 'Approved' | 'Rejected') => {
    if (!currentUser) return;

    const actor = `${currentUser.rank} ${currentUser.lastName}, ${currentUser.firstName}`;
    const actionText = decision === 'Approved'
      ? `Approved by Installation Admin at ${currentUser.installationId}`
      : `Rejected by Installation Admin at ${currentUser.installationId}`;

    const updated: Request = {
      ...r,
      currentStage: 'ARCHIVED',
      finalStatus: decision,
      installationId: '', // Clear installation ID after review
      activity: [
        ...(r.activity || []),
        {
          actor,
          timestamp: new Date().toISOString(),
          action: actionText,
          comment: comments[r.id] || '',
        },
      ],
    };

    try {
      await upsertRequest(updated);
      setRequests(prev => prev.filter(req => req.id !== r.id));
      setComments(prev => ({ ...prev, [r.id]: '' }));
    } catch (error) {
      console.error(`Failed to ${decision.toLowerCase()} request:`, error);
      // Optionally, show an error to the user
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Installation Dashboard</h2>
        <RequestTable
          title="Pending Installation Review"
          requests={requests}
          users={usersById}
          onRowClick={(r) => setExpandedCard(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
          expandedRows={expandedCard}
          platoonSectionMap={{}}
        >
          {(r: Request) => (
            <div id={`details-iapp-${r.id}`} className="p-4 bg-gray-50 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reviewer Comment</label>
                <textarea
                  rows={2}
                  value={comments[r.id] || ''}
                  onChange={(e) => setComments(prev => ({ ...prev, [r.id]: e.target.value }))}
                  className="w-full px-3 py-2 border border-brand-navy/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold"
                  placeholder="Optional notes for your decision"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  className="px-4 py-2 rounded bg-brand-red text-white font-medium hover:bg-brand-red-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-red"
                  onClick={() => handleInstallationDecision(r, 'Rejected')}
                >
                  Reject
                </button>
                <button
                  className="px-4 py-2 rounded bg-brand-gold text-brand-charcoal font-medium hover:bg-brand-gold-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold"
                  onClick={() => handleInstallationDecision(r, 'Approved')}
                >
                  Approve
                </button>
              </div>
            </div>
          )}
        </RequestTable>
      </div>
    </div>
  );
}
