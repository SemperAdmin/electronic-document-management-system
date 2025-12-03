import React, { useEffect, useMemo, useState } from 'react';
import { UnitSelector } from './UnitSelector';
import { UNITS, Unit } from '../lib/units';
import { sha256Hex } from '@/lib/crypto';
import { listUsers, upsertUser, getUserById, listCompaniesForUnit, listPlatoonsForCompany } from '@/lib/db';
import { signUp } from '@/lib/auth';

interface UserProfile {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  mi?: string;
  email: string;
  edipi: string;
  edipiHash?: string;
  service: string;
  rank: string;
  role: string;
  battalion: string;
  company: string;
  unit: string;
  platoon?: string;
  unitUic?: string;
  passwordHash: string;
  isUnitAdmin?: boolean;
  roleCompany?: string;
  rolePlatoon?: string;
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
  const [platoon, setPlatoon] = useState((initial as any).platoon || '');
  const [selectedUnit, setSelectedUnit] = useState<Unit | undefined>(undefined);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [unitStructure, setUnitStructure] = useState<Record<string, Record<string, string[]>>>({});
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [existingUsers, setExistingUsers] = useState<UserProfile[]>([]);
  const [unitHasAdmin, setUnitHasAdmin] = useState<boolean>(false);
  const [roleCompany, setRoleCompany] = useState(initial.roleCompany || '');
  const [rolePlatoon, setRolePlatoon] = useState(initial.rolePlatoon || '');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [companyOptionsDb, setCompanyOptionsDb] = useState<string[]>([]);
  const [platoonOptionsDb, setPlatoonOptionsDb] = useState<string[]>([]);
  const [roleCompanyOptionsDb, setRoleCompanyOptionsDb] = useState<string[]>([]);
  const [rolePlatoonOptionsDb, setRolePlatoonOptionsDb] = useState<string[]>([]);

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
    if (initial.company) setCompany(String(initial.company));
    if ((initial as any).platoon) setPlatoon(String((initial as any).platoon));
    if ((initial as any).roleCompany) setRoleCompany(String((initial as any).roleCompany));
    if ((initial as any).rolePlatoon) setRolePlatoon(String((initial as any).rolePlatoon));
    if (initial.unitUic) {
      const u = UNITS.find(x => x.uic === initial.unitUic);
      if (u) setSelectedUnit(u);
    }
  }, [initial.name]);

  const rankOptions = useMemo(() => SERVICE_RANKS[service] || [], [service]);
  const battalionOptions = useMemo(() => Object.keys(UNIT_STRUCTURE), []);
  const companyOptions = useMemo(() => {
    if (!selectedUnit) return [];
    const fromDb = companyOptionsDb
    if (fromDb && fromDb.length) return fromDb
    const raw = unitStructure[selectedUnit.uic] || {};
    return Object.keys(raw).filter(k => !k.startsWith('_') && Array.isArray(raw[k]));
  }, [selectedUnit, unitStructure, companyOptionsDb]);
  const platoonOptions = useMemo(() => (selectedUnit && company ? unitStructure[selectedUnit.uic]?.[company] || [] : []), [selectedUnit, company, unitStructure]);
  const platoonOptionsResolved = useMemo(() => {
    if (!selectedUnit || !company) return []
    const fromDb = platoonOptionsDb
    if (fromDb && fromDb.length) return fromDb
    return platoonOptions
  }, [selectedUnit, company, platoonOptionsDb, platoonOptions])
  const roleCompanyOptions = useMemo(() => {
    if (!selectedUnit) return [];
    const fromDb = roleCompanyOptionsDb
    if (fromDb && fromDb.length) return fromDb
    const raw = unitStructure[selectedUnit.uic] || {};
    return Object.keys(raw).filter(k => !k.startsWith('_') && Array.isArray(raw[k]));
  }, [selectedUnit, unitStructure, roleCompanyOptionsDb]);
  const rolePlatoonOptions = useMemo(() => (selectedUnit && roleCompany ? unitStructure[selectedUnit.uic]?.[roleCompany] || [] : []), [selectedUnit, roleCompany, unitStructure]);
  const rolePlatoonOptionsResolved = useMemo(() => {
    if (!selectedUnit || !roleCompany) return []
    const fromDb = rolePlatoonOptionsDb
    if (fromDb && fromDb.length) return fromDb
    return rolePlatoonOptions
  }, [selectedUnit, roleCompany, rolePlatoonOptionsDb, rolePlatoonOptions])

  const companyOptionsWithCurrent = useMemo(() => {
    const base = companyOptions.slice()
    const cur = (company || (initial as any).company || (initial as any).user_company || '')
    return (cur && !base.includes(cur)) ? [cur, ...base] : base
  }, [companyOptions, company, initial]);

  const platoonOptionsWithCurrent = useMemo(() => {
    const base = platoonOptionsResolved.slice()
    const cur = (platoon || (initial as any).platoon || (initial as any).user_platoon || '')
    return (cur && !base.includes(cur)) ? [cur, ...base] : base
  }, [platoonOptionsResolved, platoon, initial]);
  const roleCompanyOptionsWithCurrent = useMemo(() => {
    const base = roleCompanyOptions.slice();
    const cur = roleCompany || (initial as any).roleCompany || '';
    const list = cur && !base.includes(cur) ? [cur, ...base] : base;
    return Array.from(new Set(list));
  }, [roleCompanyOptions, roleCompany, initial]);
  const rolePlatoonOptionsWithCurrent = useMemo(() => {
    const base = rolePlatoonOptionsResolved.slice();
    const cur = rolePlatoon || (initial as any).rolePlatoon || '';
    if (cur && !base.includes(cur)) return [cur, ...base];
    return base;
  }, [rolePlatoonOptionsResolved, rolePlatoon, initial]);

  useEffect(() => {
    // Hydrate current company/platoon from DB for edit mode
    ;(async () => {
      try {
        if (mode === 'edit' && initial.id) {
          const u = await getUserById(String(initial.id))
          if (u) {
            if (u.company && !company) setCompany(String(u.company))
            if ((u as any).platoon && !platoon) setPlatoon(String((u as any).platoon))
            if ((u as any).roleCompany && !roleCompany) setRoleCompany(String((u as any).roleCompany))
            if ((u as any).rolePlatoon && !rolePlatoon) setRolePlatoon(String((u as any).rolePlatoon))
          }
        }
      } catch {}
    })()
  }, [mode, initial.id])

  useEffect(() => {
    if (!rankOptions.includes(rank)) setRank('');
  }, [rankOptions]);

  useEffect(() => {
    setCompany('');
    setPlatoon('');
  }, [battalion]);

  useEffect(() => {
    setPlatoon('');
  }, [company]);
  useEffect(() => {
    setRolePlatoon('');
  }, [roleCompany]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('unit_structure');
      if (raw) setUnitStructure(JSON.parse(raw));
    } catch {}
  }, [selectedUnit]);

  useEffect(() => {
    const uic = selectedUnit?.uic || ''
    if (!uic) { setCompanyOptionsDb([]); setRoleCompanyOptionsDb([]); return }
    listCompaniesForUnit(uic).then((vals) => {
      setCompanyOptionsDb(vals || [])
      setRoleCompanyOptionsDb(vals || [])
    }).catch(() => { setCompanyOptionsDb([]); setRoleCompanyOptionsDb([]) })
  }, [selectedUnit])

  useEffect(() => {
    const uic = selectedUnit?.uic || ''
    const comp = company || ''
    if (!uic || !comp) { setPlatoonOptionsDb([]); return }
    listPlatoonsForCompany(uic, comp).then((vals) => setPlatoonOptionsDb(vals || [])).catch(() => setPlatoonOptionsDb([]))
  }, [selectedUnit, company])

  useEffect(() => {
    const uic = selectedUnit?.uic || ''
    const comp = roleCompany || ''
    if (!uic || !comp) { setRolePlatoonOptionsDb([]); return }
    listPlatoonsForCompany(uic, comp).then((vals) => setRolePlatoonOptionsDb(vals || [])).catch(() => setRolePlatoonOptionsDb([]))
  }, [selectedUnit, roleCompany])

  useEffect(() => {
    listUsers().then((users) => {
      setExistingUsers(users as any);
    }).catch(() => setExistingUsers([]));
  }, []);

  useEffect(() => {
    const uic = selectedUnit?.uic || '';
    if (!uic) { setUnitHasAdmin(false); return; }
    const has = existingUsers.some(u => !!u.isUnitAdmin && (u.unitUic || '') === uic);
    setUnitHasAdmin(has);
  }, [selectedUnit, existingUsers]);

  useEffect(() => {
    if (selectedUnit) {
      if (!company && initial.company && companyOptionsWithCurrent.includes(initial.company)) setCompany(String(initial.company));
      const initPlt = (initial as any).platoon;
      if (!platoon && initPlt && platoonOptionsWithCurrent.includes(initPlt)) setPlatoon(String(initPlt));
    }
  }, [selectedUnit, companyOptionsWithCurrent, platoonOptionsWithCurrent, company, platoon, initial]);

  const validateEdipi = (value: string) => /^[0-9]{10}$/.test(value);
  const isEdipiTaken = (value: string, excludeId?: string) => {
    try {
      return existingUsers.some(u => String(u.edipi) === String(value) && String(u.id) !== String(excludeId || ''));
    } catch {
      return false;
    }
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
    if (role === 'COMPANY_REVIEWER' && !roleCompany) return setFeedback({ type: 'error', message: 'Role Company is required for Company Reviewer.' });
    if (role === 'PLATOON_REVIEWER' && (!roleCompany || !rolePlatoon)) return setFeedback({ type: 'error', message: 'Role Company and Role Platoon are required for Platoon Reviewer.' });

    const fullName = `${firstName.trim()}${mi ? ' ' + mi.trim().toUpperCase() : ''} ${lastName.trim()}`;
    let id = initial.id ? String(initial.id) : `usr-${Date.now()}`;
    let passwordHash = initial.passwordHash || '';
    if (mode === 'create') {
      if (!password || password.length < 8) return setFeedback({ type: 'error', message: 'Password must be at least 8 characters.' });
      if (password !== confirmPassword) return setFeedback({ type: 'error', message: 'Passwords do not match.' });
      try {
        const { data, error } = await signUp(email.trim(), password);
        if (error) {
          setFeedback({ type: 'error', message: `Failed to create auth user: ${String(error.message || error)}` });
          return;
        }
        const authUserId = data?.user?.id ? String(data.user.id) : '';
        if (!authUserId) {
          setFeedback({ type: 'error', message: 'Auth user ID missing after sign up.' });
          return;
        }
        id = authUserId;
      } catch (e: any) {
        setFeedback({ type: 'error', message: `Failed to create auth user: ${String(e?.message || e)}` });
        return;
      }
      passwordHash = await sha256Hex(password);
    } else if (mode === 'edit' && password) {
      if (password.length < 8) return setFeedback({ type: 'error', message: 'Password must be at least 8 characters.' });
      if (password !== confirmPassword) return setFeedback({ type: 'error', message: 'Passwords do not match.' });
      passwordHash = await sha256Hex(password);
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
      unit: selectedUnit?.unitName || 'N/A',
      unitUic: selectedUnit?.uic,
      passwordHash,
      isUnitAdmin: mode === 'create' && selectedUnit && !unitHasAdmin ? true : isUnitAdmin,
      roleCompany: roleCompany || undefined,
      rolePlatoon: rolePlatoon || undefined,
      platoon: platoon || 'N/A',
    };

    try {
      const res = await upsertUser({
        id: user.id,
        email: user.email,
        rank: user.rank,
        firstName: user.firstName,
        lastName: user.lastName,
        mi: user.mi,
        service: user.service,
        role: user.role,
        unitUic: user.unitUic,
        unit: selectedUnit?.unitName || 'N/A',
        company: user.company,
        isUnitAdmin: !!user.isUnitAdmin,
        edipi: user.edipi,
        passwordHash: passwordHash,
        platoon: platoon || 'N/A',
        roleCompany: roleCompany || undefined,
        rolePlatoon: rolePlatoon || undefined,
      })
      if (!res.ok) { setFeedback({ type: 'error', message: `Failed to save profile: ${String((res as any)?.error?.message || (res as any)?.error || 'unknown')}` }); return }
      setFeedback({ type: 'success', message: initial.id ? 'Profile updated.' : (selectedUnit && !unitHasAdmin ? 'Profile created. You have been assigned Unit Admin for this unit.' : 'Profile created.') });
      onSaved?.(user);
    } catch {
      setFeedback({ type: 'error', message: 'Failed to save profile.' });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">{mode === 'edit' ? 'Manage Profile' : 'Create Profile'}</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        {(mode === 'create' && selectedUnit && !unitHasAdmin) && (
          <div className="p-3 border border-yellow-200 bg-yellow-50 text-yellow-800 rounded">
            No Unit Admin is currently assigned for <span className="font-medium">{selectedUnit.unitName}</span> (UIC {selectedUnit.uic}). You will be assigned Unit Admin for this unit when you create your account.
          </div>
        )}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 text-center">Personal Information</h3>
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
          {mode === 'create' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={readOnly}
              />
                <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={readOnly}
              />
              </div>
            </>
          ) : (
            <></>
          )}
          
          </div>
        </div>

        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow p-6 w-full max-w-md">
              <h4 className="text-lg font-semibold mb-4">Update Password</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={readOnly}
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={readOnly}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" className="px-4 py-2 bg-gray-100 text-gray-800 rounded border border-gray-300" onClick={() => setShowPasswordModal(false)}>Cancel</button>
                <button type="button" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" onClick={() => setShowPasswordModal(false)}>Save</button>
              </div>
            </div>
          </div>
        )}

        {mode === 'edit' && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 text-center">Roles (View Only)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled
              >
                {ROLES.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={roleCompany || String((initial as any).roleCompany || '')}
                onChange={(e) => setRoleCompany(e.target.value)}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              >
                <option value="">{roleCompanyOptionsWithCurrent.length ? 'Select company' : 'No companies configured'}</option>
                {roleCompanyOptionsWithCurrent.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={rolePlatoon || String((initial as any).rolePlatoon || '')}
                onChange={(e) => setRolePlatoon(e.target.value)}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              >
                <option value="">{rolePlatoonOptionsWithCurrent.length ? 'Select platoon' : 'No platoons configured'}</option>
                {rolePlatoonOptionsWithCurrent.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <input id="pf-is-unit-admin" type="checkbox" checked={isUnitAdmin} onChange={(e) => setIsUnitAdmin(e.target.checked)} disabled={readOnly || !canEditAdmin} />
                <label htmlFor="pf-is-unit-admin" className="text-sm text-gray-700">Grant Unit Admin privileges</label>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={(initial as any)?.isCommandStaff || role === 'COMMANDER'} disabled />
                <span className="text-sm text-gray-700">Allow access to Command Sections Dashboard</span>
              </div>
            </div>
          </div>
        </div>
        )}


        <h3 className="text-lg font-semibold text-gray-900 mb-3 text-center">Unit Assignment</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <UnitSelector onUnitSelect={(u) => setSelectedUnit(u)} selectedUnit={selectedUnit} />
          </div>
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                <select
                  value={company || String(initial.company || '')}
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
                  value={platoon || String((initial as any).platoon || '')}
                  onChange={(e) => setPlatoon(e.target.value)}
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
          </div>
        </div>

        {feedback && (
          <div className={`p-3 rounded-lg border ${feedback.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
            {feedback.message}
          </div>
        )}

        <div className="flex items-center justify-between">
          {mode === 'edit' && (
            <button type="button" className="px-4 py-2 bg-brand-cream text-brand-navy rounded border border-gray-300 hover:brightness-105" onClick={() => setShowPasswordModal(true)} disabled={readOnly}>Update Password</button>
          )}
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50" disabled={readOnly}>{mode === 'edit' ? 'Save' : 'Create Profile'}</button>
        </div>
      </form>
    </div>
  );
};
