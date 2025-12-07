// src/lib/reviewers.ts
import { UserRecord } from '../types';

export const normalizeString = (v?: string): string => {
  const s = String(v || '').trim();
  return s && s !== 'N/A' ? s : '';
};

export const hasReviewer = (
  users: UserRecord[],
  role: 'PLATOON_REVIEWER' | 'COMPANY_REVIEWER',
  scope: { company: string; platoon?: string; uic: string }
): boolean => {
  return users.some(u => {
    if (String(u.role || '') !== role) return false;

    const userCompany = normalizeString(u.roleCompany || u.company);
    if (userCompany !== scope.company) return false;

    if (role === 'PLATOON_REVIEWER') {
      const userPlatoon = normalizeString(u.rolePlatoon || u.platoon);
      if (userPlatoon !== (scope.platoon || '')) return false;
    }

    return String(u.unitUic || '') === String(scope.uic || '');
  });
};
