import React, { useEffect, useState } from 'react';
import { listRequests, listUsers } from '../lib/db';
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
}

export default function InstallationApp() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [usersById, setUsersById] = useState<Record<string, UserProfile>>({});
  const [expandedCard, setExpandedCard] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem('currentUser');
      if (raw) {
        setCurrentUser(JSON.parse(raw));
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (currentUser?.installationId) {
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
            <div id={`details-sec-${r.id}`} className="p-4 bg-gray-50">
              {/* Actions for installation admins can be added here */}
            </div>
          )}
        </RequestTable>
      </div>
    </div>
  );
}
