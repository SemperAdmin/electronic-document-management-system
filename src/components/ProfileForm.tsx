import React, { useEffect, useMemo, useState } from 'react';
import { UnitSelector } from './UnitSelector';
import { UNITS, Unit } from '../lib/units';

interface UserProfile {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  mi?: string;
  email: string;
  edipi: string;
  service: string;
  rank: string;
  role: string;
  battalion: string;
  company: string;
  unit: string;
  unitUic?: string;
  passwordHash: string;
  isUnitAdmin?: boolean;
}

interface ProfileFormProps {
  onSaved?: (user: UserProfile) => void;
  initial?: Partial<UserProfile>;
  mode?: 'create' | 'edit';
  readOnly?: boolean;
  canEditRole?: boolean;
  canEditAdmin?: boolean;
}

const SERVICE_RANKS: Record<string, string[]> = {
  'Marine Corps': ['Pvt', 'PFC', 'LCpl', 'Cpl', 'Sgt', 'SSgt', 'GySgt', 'MSgt', '1stSgt', 'SgtMaj', 'MGySgt', 'WO', 'CWO2', 'CWO3', 'CWO4', 'CWO5', '2ndLt', '1stLt', 'Capt', 'Maj', 'LtCol', 'Col', 'BGen', 'MajGen', 'LtGen', 'Gen'],
  'Army': ['PV1', 'PV2', 'PFC', 'SPC', 'CPL', 'SGT', 'SSG', 'SFC', 'MSG', '1SG', 'SGM', 'WO1', 'CW2', 'CW3', 'CW4', 'CW5', '2LT', '1LT', 'CPT', 'MAJ', 'LTC', 'COL', 'BG', 'MG', 'LTG', 'GEN'],
  'Navy': ['SR', 'SA', 'SN', 'PO3', 'PO2', 'PO1', 'CPO', 'SCPO', 'MCPO', 'CWO2', 'CWO3', 'CWO4', 'CWO5', 'ENS', 'LTJG', 'LT', 'LCDR', 'CDR', 'CAPT', 'RDML', 'RADM', 'VADM', 'ADM'],
  'Air Force': ['AB', 'Amn', 'A1C', 'SrA', 'SSgt', 'TSgt', 'MSgt', 'SMSgt', 'CMSgt', '2d Lt', '1st Lt', 'Capt', 'Maj', 'Lt Col', 'Col', 'Brig Gen', 'Maj Gen', 'Lt Gen', 'Gen'],
  'Space Force': ['Spc1', 'Spc2', 'Spc3', 'Spc4', 'Spc5', 'Spc6', 'Spc7', 'Spc8', 'Spc9', '2d Lt', '1st Lt', 'Capt', 'Maj', 'Lt Col', 'Col', 'Brig Gen', 'Maj Gen', 'Lt Gen', 'Gen'],
};
const ROLES = ['MEMBER','PLATOON_REVIEWER','COMPANY_REVIEWER','COMMANDER'];

const UNIT_STRUCTURE: Record<string, Record<string, string[]>> = {
  '1st Battalion': {
    'Alpha Company': ['1st Platoon', '2nd Platoon', '3rd Platoon'],
    'Bravo Company': ['1st Platoon', '2nd Platoon'],
  },
  '2nd Battalion': {
    'Charlie Company': ['1st Platoon', '2nd Platoon'],
    'Delta Company': ['1st Platoon'],
  },
};

export const ProfileForm: React.FC<ProfileFormProps> = ({ onSaved, initial = {}, mode = 'create', readOnly = false, canEditRole = false, canEditAdmin = false }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mi, setMi] = useState('');
  const [email, setEmail] = useState(initial.email || '');
  const [edipi, setEdipi] = useState(initial.edipi || '');
  const [service, setService] = useState(initial.service || '');
  const [rank, setRank] = useState(initial.rank || '');
  const [role, setRole] = useState(initial.role || 'MEMBER');
  const [isUnitAdmin, setIsUnitAdmin] = useState<boolean>(!!initial.isUnitAdmin);
  const [battalion, setBattalion] = useState(initial.battalion || '');
  const [company, setCompany] = useState(initial.company || '');
  const [unit, setUnit] = useState(initial.unit || '');
  const [selectedUnit, setSelectedUnit] = useState<Unit | undefined>(undefined);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [unitStructure, setUnitStructure] = useState<Record<string, Record<string, string[]>>>({});
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (initial.name) {
      const parts = String(initial.name).trim().split(/\s+/);
      if (parts.length >= 2) {
        setFirstName(parts[0]);
        setLastName(parts[parts.length - 1]);
        if (parts.length === 3 && parts[1].length === 1) setMi(parts[1].toUpperCase());
      }
    }
    if (initial.firstName) setFirstName(String(initial.firstName));
    if (initial.lastName) setLastName(String(initial.lastName));
    if (initial.mi) setMi(String(initial.mi));
    if (initial.unitUic) {
      const u = UNITS.find(x => x.uic === initial.unitUic);
      if (u) setSelectedUnit(u);
    }
  }, [initial.name]);

  const rankOptions = useMemo(() => SERVICE_RANKS[service] || [], [service]);
  const battalionOptions = useMemo(() => Object.keys(UNIT_STRUCTURE), []);
  const companyOptions = useMemo(() => (selectedUnit ? Object.keys(unitStructure[selectedUnit.uic] || {}) : []), [selectedUnit, unitStructure]);
  const platoonOptions = useMemo(() => (selectedUnit && company ? unitStructure[selectedUnit.uic]?.[company] || [] : []), [selectedUnit, company, unitStructure]);

  const companyOptionsWithCurrent = useMemo(() => {
    const base = companyOptions.slice();
    const cur = company || initial.company || '';
    if (cur && !base.includes(cur)) return [cur, ...base];
    return base;
  }, [companyOptions, company, initial.company]);

  const platoonOptionsWithCurrent = useMemo(() => {
    const base = platoonOptions.slice();
    const cur = unit || initial.unit || '';
    if (cur && !base.includes(cur)) return [cur, ...base];
    return base;
  }, [platoonOptions, unit, initial.unit]);

  useEffect(() => {
    if (!rankOptions.includes(rank)) setRank('');
  }, [rankOptions]);

  useEffect(() => {
    setCompany('');
    setUnit('');
  }, [battalion]);

  useEffect(() => {
    setUnit('');
  }, [company]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('unit_structure');
      if (raw) setUnitStructure(JSON.parse(raw));
    } catch {}
  }, [selectedUnit]);

  useEffect(() => {
    if (selectedUnit) {
      if (!company && initial.company && companyOptionsWithCurrent.includes(initial.company)) setCompany(String(initial.company));
      if (!unit && initial.unit && platoonOptionsWithCurrent.includes(initial.unit)) setUnit(String(initial.unit));
    }
  }, [selectedUnit, companyOptionsWithCurrent, platoonOptionsWithCurrent, company, unit, initial.company, initial.unit]);

  const validateEdipi = (value: string) => /^[0-9]{10}$/.test(value);
  const isEdipiTaken = (value: string, excludeId?: string) => {
    try {
      const collected: UserProfile[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('fs/users/') && key.endsWith('.json')) {
          const rawU = localStorage.getItem(key);
          if (rawU) collected.push(JSON.parse(rawU));
        }
      }
      const staticUserModules = import.meta.glob('../users/*.json', { eager: true });
      const staticUsers: UserProfile[] = Object.values(staticUserModules).map((m: any) => (m?.default ?? m) as UserProfile);
      const all = [...staticUsers, ...collected];
      return all.some(u => String(u.edipi) === String(value) && String(u.id) !== String(excludeId || ''));
    } catch {
      return false;
    }
  };
  const hashPassword = async (value: string) => {
    const enc = new TextEncoder();
    const data = enc.encode(value);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (readOnly) return;

    if (!firstName.trim()) return setFeedback({ type: 'error', message: 'First name is required.' });
    if (!lastName.trim()) return setFeedback({ type: 'error', message: 'Last name is required.' });
    if (mi && !/^[A-Za-z]$/.test(mi)) return setFeedback({ type: 'error', message: 'MI must be a single letter.' });
    if (!email.trim()) return setFeedback({ type: 'error', message: 'Email is required.' });
    if (!validateEdipi(edipi)) return setFeedback({ type: 'error', message: 'EDIPI must be 10 digits.' });
    if (!service) return setFeedback({ type: 'error', message: 'Service is required.' });
    if (!rank) return setFeedback({ type: 'error', message: 'Rank is required.' });
    if (isEdipiTaken(edipi, initial.id ? String(initial.id) : undefined)) return setFeedback({ type: 'error', message: 'EDIPI already exists.' });

    const fullName = `${firstName.trim()}${mi ? ' ' + mi.trim().toUpperCase() : ''} ${lastName.trim()}`;
    const id = initial.id ? String(initial.id) : `usr-${Date.now()}`;
    let passwordHash = initial.passwordHash || '';
    if (mode === 'create') {
      if (!password || password.length < 8) return setFeedback({ type: 'error', message: 'Password must be at least 8 characters.' });
      passwordHash = await hashPassword(password);
    } else if (mode === 'edit' && password) {
      passwordHash = await hashPassword(password);
    }
    const user: UserProfile = {
      id,
      name: fullName,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      mi: mi ? mi.trim().toUpperCase() : undefined,
      email: email.trim(),
      edipi,
      service,
      rank,
      role,
      battalion: battalion || 'N/A',
      company: company || 'N/A',
      unit: unit || selectedUnit?.unitName || 'N/A',
      unitUic: selectedUnit?.uic,
      passwordHash,
      isUnitAdmin,
    };

    try {
      localStorage.setItem(`fs/users/${user.id}.json`, JSON.stringify(user));
      localStorage.setItem('currentUser', JSON.stringify(user));
      const res = await fetch('/api/users/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(user) });
      const data = await res.json().catch(() => ({ ok: false }));
      if (!res.ok || !data.ok) {
        setFeedback({ type: 'error', message: 'File write failed. Restart dev server to enable saving to src/users.' });
        return;
      }
      setFeedback({ type: 'success', message: initial.id ? 'Profile updated.' : 'Profile created.' });
      onSaved?.(user);
    } catch {
      setFeedback({ type: 'error', message: 'Failed to save profile.' });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">{mode === 'edit' ? 'Manage Profile' : 'Create Profile'}</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={readOnly}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={readOnly}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">MI</label>
            <input
              type="text"
              value={mi}
              maxLength={1}
              onChange={(e) => setMi(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={readOnly}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={readOnly}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">EDIPI</label>
            <input
              type="text"
              value={edipi}
              onChange={(e) => setEdipi(e.target.value)}
              placeholder="10 digits"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={readOnly}
            />
            <p className="text-xs text-gray-500 mt-1">Must be exactly 10 digits</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{mode === 'edit' ? 'New Password (optional)' : 'Password'}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'edit' ? 'Leave blank to keep current' : ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={readOnly}
            />
            {mode === 'create' && (
              <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
            )}
          </div>
          <div>
            <label className="block text sm font-medium text-gray-700 mb-1">Service</label>
            <select
              value={service}
              onChange={(e) => setService(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={readOnly}
            >
              <option value="" disabled>Select service</option>
              {Object.keys(SERVICE_RANKS).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rank</label>
            <select
              value={rank}
              onChange={(e) => setRank(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={readOnly}
            >
              <option value="" disabled>Select rank</option>
              {rankOptions.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={readOnly || !canEditRole}
          >
            {ROLES.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Unit Admin</label>
          <div className="flex items-center gap-2">
            <input id="pf-is-unit-admin" type="checkbox" checked={isUnitAdmin} onChange={(e) => setIsUnitAdmin(e.target.checked)} disabled={readOnly || !canEditAdmin} />
            <label htmlFor="pf-is-unit-admin" className="text-sm text-gray-700">Grant Unit Admin privileges</label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
          <UnitSelector onUnitSelect={(u) => setSelectedUnit(u)} selectedUnit={selectedUnit} />
          <p className="text-xs text-gray-500 mt-2">Select a unit to enable company and platoon.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
            <select
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              disabled={readOnly || !selectedUnit || companyOptionsWithCurrent.length === 0}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            >
              <option value="">{companyOptionsWithCurrent.length ? 'Select company' : 'No companies configured'}</option>
              {companyOptionsWithCurrent.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Platoon</label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              disabled={readOnly || !selectedUnit || !company || platoonOptionsWithCurrent.length === 0}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            >
              <option value="">{platoonOptionsWithCurrent.length ? 'Select platoon' : 'No platoons configured'}</option>
              {platoonOptionsWithCurrent.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>

        {feedback && (
          <div className={`p-3 rounded-lg border ${feedback.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
            {feedback.message}
          </div>
        )}

        <div className="flex justify-end">
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50" disabled={readOnly}>{mode === 'edit' ? 'Save' : 'Create Profile'}</button>
        </div>
      </form>
    </div>
  );
};
