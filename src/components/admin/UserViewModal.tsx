import React, { memo } from 'react';
import { UNITS } from '@/lib/units';
import { UserRecord } from '@/types';

interface UserViewModalProps {
  user: UserRecord;
  onClose: () => void;
}

// Memoized to prevent unnecessary re-renders when parent state changes
export const UserViewModal: React.FC<UserViewModalProps> = memo(function UserViewModal({ user, onClose }) {
  const getScope = () => {
    const base = UNITS.find(x => x.uic === user.unitUic);
    const unitName = base ? base.unitName : user.unit;

    if (user.isUnitAdmin || user.role === 'COMMANDER') return unitName || '—';

    if (user.role === 'COMPANY_REVIEWER') {
      return (user.company && user.company !== 'N/A') ? user.company : '—';
    }

    if (user.role === 'PLATOON_REVIEWER') {
      const c = (user.company && user.company !== 'N/A') ? user.company : '';
      const p = (user.platoon && user.platoon !== 'N/A') ? user.platoon : '';
      const parts = [c, p].filter(Boolean);
      return parts.length ? parts.join(' / ') : '—';
    }

    return '—';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow w-full max-w-xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Profile</h3>
          <button className="text-gray-500" onClick={onClose}>✕</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-500">Name</div>
            <div className="font-medium">
              {user.rank} {user.lastName}, {user.firstName}{user.mi ? ` ${user.mi}` : ''}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Email</div>
            <div className="font-medium">{user.email}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">EDIPI</div>
            <div className="font-medium">{user.edipi || '—'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Service</div>
            <div className="font-medium">{user.service}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Role</div>
            <div className="font-medium">{user.role}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Scope</div>
            <div className="font-medium">{getScope()}</div>
          </div>
          {user.isUnitAdmin && (
            <div>
              <div className="text-sm text-gray-500">Permissions</div>
              <div className="font-medium text-purple-600">Unit Admin</div>
            </div>
          )}
          {user.isCommandStaff && (
            <div>
              <div className="text-sm text-gray-500">Access</div>
              <div className="font-medium text-blue-600">Command Staff</div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
});
