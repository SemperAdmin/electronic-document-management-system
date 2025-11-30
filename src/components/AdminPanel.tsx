import React, { useEffect, useMemo, useState } from 'react';
import { UNITS, Unit } from '../lib/units';
import { ProfileForm } from './ProfileForm';
import { HierarchicalDropdown } from './HierarchicalDropdown';

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
  commandOrder?: number;
  isUnitAdmin?: boolean;
}

const ROLES = ['MEMBER','PLATOON_REVIEWER','COMPANY_REVIEWER','COMMANDER'];

export const AdminPanel: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<Unit | undefined>(undefined);
  const [unitStructure, setUnitStructure] = useState<Record<string, any>>({});
  const [unitSections, setUnitSections] = useState<Record<string, string[]>>({});
  const [unitCommandSections, setUnitCommandSections] = useState<Record<string, string[]>>({});
  const [platoonSectionMap, setPlatoonSectionMap] = useState<Record<string, Record<string, Record<string, string>>>>({});
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [newCompany, setNewCompany] = useState('');
  const [newPlatoon, setNewPlatoon] = useState('');
  const [newSection, setNewSection] = useState('');
  const [newCommandSection, setNewCommandSection] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [filter, setFilter] = useState('');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [viewUser, setViewUser] = useState<UserProfile | null>(null);
  const [editingRole, setEditingRole] = useState<string>('');
  const [editingCompany, setEditingCompany] = useState<string | undefined>(undefined);
  const [editingPlatoon, setEditingPlatoon] = useState<string | undefined>(undefined);
  const [editingOrder, setEditingOrder] = useState<string>('');
  const [adminTab, setAdminTab] = useState<'unit' | 'users'>('unit');
  const [adminErrors, setAdminErrors] = useState<string[]>([]);
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [editingIsUnitAdmin, setEditingIsUnitAdmin] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<'profile' | 'admin'>('admin');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('unit_structure');
      if (raw) setUnitStructure(JSON.parse(raw));
    } catch {}
    try {
      // Hydrate sections and command sections from unit_structure
      const rawUs = localStorage.getItem('unit_structure');
      const secMap: Record<string, string[]> = {};
      const cmdMap: Record<string, string[]> = {};
      const pMap: Record<string, Record<string, Record<string, string>>> = {};
      if (rawUs) {
        const parsed = JSON.parse(rawUs);
        for (const uic of Object.keys(parsed || {})) {
          const v = parsed[uic];
          if (v && Array.isArray(v._sections)) secMap[uic] = v._sections;
          if (v && Array.isArray(v._commandSections)) cmdMap[uic] = v._commandSections;
          if (v && v._platoonSectionMap && typeof v._platoonSectionMap === 'object') pMap[uic] = v._platoonSectionMap;
        }
      } else {
        const staticUSModules = import.meta.glob('../unit-structure/unit-structure.json', { eager: true });
        const merged: Record<string, any> = {};
        for (const mod of Object.values(staticUSModules)) {
          const data: any = (mod as any)?.default ?? mod;
          Object.assign(merged, data);
        }
        for (const uic of Object.keys(merged || {})) {
          const v = merged[uic];
          if (v && Array.isArray(v._sections)) secMap[uic] = v._sections;
          if (v && Array.isArray(v._commandSections)) cmdMap[uic] = v._commandSections;
          if (v && v._platoonSectionMap && typeof v._platoonSectionMap === 'object') pMap[uic] = v._platoonSectionMap;
        }
      }
      setUnitSections(secMap);
      setUnitCommandSections(cmdMap);
      setPlatoonSectionMap(pMap);
    } catch {}
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
      const byId = new Map<string, UserProfile>();
      // Prefer static first, then overlay with collected/local to maintain latest edits
      for (const u of staticUsers) byId.set(u.id, u);
      for (const u of collected) byId.set(u.id, u);
      setUsers(Array.from(byId.values()));
    } catch {}
    try {
      const rawCurrent = localStorage.getItem('currentUser');
      if (rawCurrent) {
        const cu: UserProfile = JSON.parse(rawCurrent);
        setCurrentUser(cu);
        if (cu.unitUic) {
          const u = UNITS.find(x => x.uic === cu.unitUic);
          if (u) setSelectedUnit(u);
        }
      }
    } catch {}
  }, []);

  const companies = useMemo(() => {
    const key = selectedUnit?.uic || '';
    return key ? Object.keys(unitStructure[key] || {}) : [];
  }, [selectedUnit, unitStructure]);

  const platoons = useMemo(() => {
    const key = selectedUnit?.uic || '';
    if (!key || !selectedCompany) return [];
    return unitStructure[key]?.[selectedCompany] || [];
  }, [selectedUnit, selectedCompany, unitStructure]);

  const sections = useMemo(() => {
    const key = selectedUnit?.uic || '';
    return key ? (unitSections[key] || []) : [];
  }, [selectedUnit, unitSections]);

  const commandSections = useMemo(() => {
    const key = selectedUnit?.uic || '';
    return key ? (unitCommandSections[key] || []) : [];
  }, [selectedUnit, unitCommandSections]);

  const editCompanies = useMemo(() => {
    const key = editingUser?.unitUic || '';
    return key ? Object.keys(unitStructure[key] || {}) : [];
  }, [editingUser, unitStructure]);

  const editPlatoons = useMemo(() => {
    const key = editingUser?.unitUic || '';
    const companyKey = editingCompany || '';
    if (!key || !companyKey) return [];
    return unitStructure[key]?.[companyKey] || [];
  }, [editingUser, editingCompany, unitStructure]);

  const saveUnitStructure = () => {
    try {
      localStorage.setItem('unit_structure', JSON.stringify(unitStructure));
      fetch('/api/unit-structure/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(unitStructure) })
        .then(() => setFeedback({ type: 'success', message: 'Unit structure saved.' }))
        .catch(() => setFeedback({ type: 'error', message: 'Failed to persist unit structure.' }));
    } catch {
      setFeedback({ type: 'error', message: 'Failed to save unit structure.' });
    }
  };

  const saveUnitSections = () => {
    try {
      // Merge sections into unit_structure under _sections for the selected unit
      if (!selectedUnit) return;
      const key = selectedUnit.uic;
      const next = { ...unitStructure };
      next[key] = next[key] || {};
      next[key]._sections = unitSections[key] || [];
      setUnitStructure(next);
      localStorage.setItem('unit_structure', JSON.stringify(next));
      fetch('/api/unit-structure/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) })
        .then(() => setFeedback({ type: 'success', message: 'Unit sections saved.' }))
        .catch(() => setFeedback({ type: 'error', message: 'Failed to persist unit sections.' }));
    } catch {
      setFeedback({ type: 'error', message: 'Failed to save unit sections.' });
    }
  };

  const saveCommandSections = () => {
    try {
      if (!selectedUnit) return;
      const key = selectedUnit.uic;
      const next = { ...unitStructure };
      next[key] = next[key] || {};
      next[key]._commandSections = unitCommandSections[key] || [];
      setUnitStructure(next);
      localStorage.setItem('unit_structure', JSON.stringify(next));
      fetch('/api/unit-structure/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) })
        .then(() => setFeedback({ type: 'success', message: 'Command sections saved.' }))
        .catch(() => setFeedback({ type: 'error', message: 'Failed to persist command sections.' }));
    } catch {
      setFeedback({ type: 'error', message: 'Failed to save command sections.' });
    }
  };

  const savePlatoonSectionLinks = () => {
    try {
      if (!selectedUnit) return;
      const key = selectedUnit.uic;
      const next = { ...unitStructure };
      next[key] = next[key] || {};
      next[key]._platoonSectionMap = platoonSectionMap[key] || {};
      setUnitStructure(next);
      localStorage.setItem('unit_structure', JSON.stringify(next));
      fetch('/api/unit-structure/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) })
        .then(() => setFeedback({ type: 'success', message: 'Platoon-section links saved.' }))
        .catch(() => setFeedback({ type: 'error', message: 'Failed to persist links.' }));
    } catch {
      setFeedback({ type: 'error', message: 'Failed to save links.' });
    }
  };

  const addCompany = () => {
    if (!selectedUnit || !newCompany.trim()) return;
    const key = selectedUnit.uic;
    const next = { ...unitStructure };
    next[key] = next[key] || {};
    if (!next[key][newCompany.trim()]) {
      next[key][newCompany.trim()] = [];
      setUnitStructure(next);
      setSelectedCompany(newCompany.trim());
      setNewCompany('');
    }
  };

  const removeCompany = (company: string) => {
    if (!selectedUnit) return;
    const key = selectedUnit.uic;
    const next = { ...unitStructure };
    if (next[key]) {
      delete next[key][company];
      setUnitStructure(next);
      if (selectedCompany === company) setSelectedCompany('');
    }
  };

  const addPlatoon = () => {
    if (!selectedUnit || !selectedCompany || !newPlatoon.trim()) return;
    const key = selectedUnit.uic;
    const next = { ...unitStructure };
    next[key] = next[key] || {};
    next[key][selectedCompany] = next[key][selectedCompany] || [];
    if (!next[key][selectedCompany].includes(newPlatoon.trim())) {
      next[key][selectedCompany] = [...next[key][selectedCompany], newPlatoon.trim()];
      setUnitStructure(next);
      setNewPlatoon('');
    }
  };

  const removePlatoon = (platoon: string) => {
    if (!selectedUnit || !selectedCompany) return;
    const key = selectedUnit.uic;
    const next = { ...unitStructure };
    next[key][selectedCompany] = (next[key][selectedCompany] || []).filter(p => p !== platoon);
    setUnitStructure(next);
  };

  const addSection = () => {
    if (!selectedUnit || !newSection.trim()) return;
    const key = selectedUnit.uic;
    const next = { ...unitSections };
    next[key] = next[key] || [];
    if (!next[key].includes(newSection.trim())) {
      next[key] = [...next[key], newSection.trim()];
      setUnitSections(next);
      setNewSection('');
    }
  };

  const removeSection = (section: string) => {
    if (!selectedUnit) return;
    const key = selectedUnit.uic;
    const next = { ...unitSections };
    next[key] = (next[key] || []).filter(s => s !== section);
    setUnitSections(next);
  };

  const addCommandSection = () => {
    if (!selectedUnit || !newCommandSection.trim()) return;
    const key = selectedUnit.uic;
    const next = { ...unitCommandSections };
    next[key] = next[key] || [];
    if (!next[key].includes(newCommandSection.trim())) {
      next[key] = [...next[key], newCommandSection.trim()];
      setUnitCommandSections(next);
      setNewCommandSection('');
    }
  };

  const removeCommandSection = (section: string) => {
    if (!selectedUnit) return;
    const key = selectedUnit.uic;
    const next = { ...unitCommandSections };
    next[key] = (next[key] || []).filter(s => s !== section);
    setUnitCommandSections(next);
  };

  const updateUserRole = (id: string, role: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id !== id) return u
      if (role === 'COMPANY_REVIEWER') {
        return { ...u, role, unit: 'N/A' }
      }
      if (role === 'COMMANDER') {
        return { ...u, role, company: 'N/A', unit: 'N/A' }
      }
      return { ...u, role }
    }));
  };

  const saveUsers = () => {
    try {
      users.forEach(async (u) => {
        localStorage.setItem(`fs/users/${u.id}.json`, JSON.stringify(u));
        await fetch('/api/users/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(u) });
      });
      setFeedback({ type: 'success', message: 'Users updated.' });
    } catch {
      setFeedback({ type: 'error', message: 'Failed to update users.' });
    }
  };

  const downloadUser = (u: UserProfile) => {
    const blob = new Blob([JSON.stringify(u, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${u.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAllUsers = () => {
    const headers = ['id','name','firstName','mi','lastName','email','edipi','service','rank','role','battalion','company','unit','unitUic'];
    const rows = users.map(u => [
      u.id,
      u.name,
      u.firstName,
      u.mi || '',
      u.lastName,
      u.email,
      u.edipi,
      u.service,
      u.rank,
      u.role,
      u.battalion,
      u.company,
      u.unit,
      u.unitUic || ''
    ].map(v => {
      const s = String(v ?? '');
      if (s.includes(',') || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    }).join(','));
    const csv = '\ufeff' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-export.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetData = (key: 'users' | 'documents' | 'unit_structure') => {
    try {
      localStorage.removeItem(key);
      if (key === 'users') setUsers([]);
      if (key === 'unit_structure') setUnitStructure({});
      setFeedback({ type: 'success', message: `${key} cleared.` });
    } catch {
      setFeedback({ type: 'error', message: `Failed to clear ${key}.` });
    }
  };

  return (
    <div className="space-y-8">
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex gap-4">
            <button
              className={`px-4 py-2 rounded-t ${adminTab === 'unit' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              onClick={() => setAdminTab('unit')}
            >
              Unit Administration
            </button>
            <button
              className={`px-4 py-2 rounded-t ${adminTab === 'users' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              onClick={() => setAdminTab('users')}
            >
              User Administration
            </button>
          </div>
        </div>
      </div>

      {adminTab === 'unit' && (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Unit Administration</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
          <div className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2">
            {selectedUnit ? (
              <div>
                <div className="font-medium">{selectedUnit.unitName}</div>
                <div className="text-sm text-gray-500">UIC: {selectedUnit.uic} | RUC: {selectedUnit.ruc}</div>
              </div>
            ) : (
              <span className="text-gray-500">No unit assigned</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-900">Companies</h3>
              <button className="text-sm px-2 py-1 bg-gray-100 rounded" onClick={saveUnitStructure}>Save</button>
            </div>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newCompany}
                onChange={(e) => setNewCompany(e.target.value)}
                placeholder="Add company"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button className="px-3 py-2 bg-blue-600 text-white rounded-lg" onClick={addCompany}>Add</button>
            </div>
            <div className="space-y-2">
              {companies.map(c => (
                <div key={c} className="flex items-center justify-between p-2 border rounded">
                  <button className="text-left flex-1" onClick={() => setSelectedCompany(c)}>{c}</button>
                  <button className="text-red-600 text-sm" onClick={() => removeCompany(c)}>Remove</button>
                </div>
              ))}
              {companies.length === 0 && (
                <p className="text-sm text-gray-500">No companies configured</p>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-900">Platoons {selectedCompany ? `• ${selectedCompany}` : ''}</h3>
              {selectedUnit && selectedCompany && (
                <button className="text-sm px-2 py-1 bg-gray-100 rounded" onClick={savePlatoonSectionLinks}>Save Links</button>
              )}
            </div>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newPlatoon}
                onChange={(e) => setNewPlatoon(e.target.value)}
                placeholder="Add platoon"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!selectedCompany}
              />
              <button className="px-3 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50" onClick={addPlatoon} disabled={!selectedCompany}>Add</button>
            </div>
            <div className="space-y-2">
              {platoons.map(p => (
                <div key={p} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex-1">
                    <span className="mr-3">{p}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      className="px-2 py-1 border rounded"
                      value={(platoonSectionMap[selectedUnit?.uic || '']?.[selectedCompany]?.[p] || '')}
                      onChange={(e) => {
                        const uic = selectedUnit?.uic || '';
                        setPlatoonSectionMap(prev => {
                          const next = { ...prev };
                          next[uic] = next[uic] || {};
                          next[uic][selectedCompany] = next[uic][selectedCompany] || {};
                          next[uic][selectedCompany][p] = e.target.value;
                          return next;
                        });
                      }}
                    >
                      <option value="">Link to section</option>
                      {(unitSections[selectedUnit?.uic || ''] || []).map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <button className="text-red-600 text-sm" onClick={() => removePlatoon(p)}>Remove</button>
                  </div>
                </div>
              ))}
              {platoons.length === 0 && (
                <p className="text-sm text-gray-500">No platoons configured</p>
              )}
            </div>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-900">Battalion Sections</h3>
              <button className="text-sm px-2 py-1 bg-gray-100 rounded" onClick={saveUnitSections}>Save</button>
            </div>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newSection}
                onChange={(e) => setNewSection(e.target.value)}
                placeholder="Add section (e.g., S-1)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button className="px-3 py-2 bg-blue-600 text-white rounded-lg" onClick={addSection}>Add</button>
            </div>
            <div className="space-y-2">
              {sections.map(s => (
                <div key={s} className="flex items-center justify-between p-2 border rounded">
                  <span>{s}</span>
                  <button className="text-red-600 text-sm" onClick={() => removeSection(s)}>Remove</button>
                </div>
              ))}
              {sections.length === 0 && (
                <p className="text-sm text-gray-500">No battalion sections configured</p>
              )}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-900">Command Sections</h3>
              <button className="text-sm px-2 py-1 bg-gray-100 rounded" onClick={saveCommandSections}>Save</button>
            </div>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newCommandSection}
                onChange={(e) => setNewCommandSection(e.target.value)}
                placeholder="Add command section (e.g., SgtMaj, XO)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button className="px-3 py-2 bg-blue-600 text-white rounded-lg" onClick={addCommandSection}>Add</button>
            </div>
            <div className="space-y-2">
              {commandSections.map(s => (
                <div key={s} className="flex items-center justify-between p-2 border rounded">
                  <span>{s}</span>
                  <button className="text-red-600 text-sm" onClick={() => removeCommandSection(s)}>Remove</button>
                </div>
              ))}
              {commandSections.length === 0 && (
                <p className="text-sm text-gray-500">No command sections configured</p>
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      {adminTab === 'users' && (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">User Administration</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 px-3">Name</th>
                <th className="py-2 px-3">Email</th>
                <th className="py-2 px-3">EDIPI</th>
                <th className="py-2 px-3">Service</th>
                <th className="py-2 px-3">Rank</th>
                <th className="py-2 px-3">Role</th>
                <th className="py-2 px-3">Scope</th>
                <th className="py-2 px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users
                .filter(u => {
                  const textMatch = !filter || u.email.toLowerCase().includes(filter.toLowerCase()) || u.lastName.toLowerCase().includes(filter.toLowerCase());
                  const unitMatch = selectedUnit ? (u.unitUic === selectedUnit.uic || (u.unit && u.unit === selectedUnit.unitName)) : true;
                  // In the unit admin dashboard, only show accounts in the selected unit
                  return textMatch && unitMatch;
                })
                .map(u => (
                <tr key={u.id} className="border-b">
                  <td className="py-2 px-3">{u.lastName}, {u.firstName}{u.mi ? ` ${u.mi}` : ''}</td>
                  <td className="py-2 px-3">{u.email}</td>
                  <td className="py-2 px-3">{u.edipi}</td>
                  <td className="py-2 px-3">{u.service}</td>
                  <td className="py-2 px-3">{u.rank}</td>
                  <td className="py-2 px-3">{u.role}</td>
                  <td className="py-2 px-3">
                    {(() => {
                      const base = UNITS.find(x => x.uic === u.unitUic);
                      const unitName = base ? base.unitName : u.unit;
                      if (u.isUnitAdmin || u.role === 'COMMANDER') return unitName || '—';
                      if (u.role === 'COMPANY_REVIEWER') return (u.company && u.company !== 'N/A') ? u.company : '—';
                      if (u.role === 'PLATOON_REVIEWER') {
                        const c = (u.company && u.company !== 'N/A') ? u.company : '';
                        const p = (u.unit && u.unit !== 'N/A') ? u.unit : '';
                        const parts = [c, p].filter(Boolean);
                        return parts.length ? parts.join(' / ') : '—';
                      }
                      return '—';
                    })()}
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex gap-2">
                      <button className="px-2 py-1 text-xs bg-gray-100 rounded" onClick={() => setViewUser(u)}>View</button>
                      
                      {(currentUser?.isUnitAdmin || currentUser?.role === 'COMMANDER') && (
                        <button className="px-2 py-1 text-xs bg-purple-700 text-white rounded" onClick={() => {
                          setEditMode('admin');
                          setEditingUser(u);
                          setEditingRole(u.role);
                          setEditingCompany(u.company !== 'N/A' ? u.company : undefined);
                          setEditingPlatoon(u.unit !== 'N/A' ? u.unit : undefined);
                          setEditingOrder(typeof u.commandOrder === 'number' ? String(u.commandOrder) : '');
                          setEditingIsUnitAdmin(!!u.isUnitAdmin);
                        }}>Admin Edit</button>
                      )}
                      <button className="px-2 py-1 text-xs bg-red-600 text-white rounded" onClick={() => {
                        setUsers(prev => prev.filter(x => x.id !== u.id));
                        try { localStorage.removeItem(`fs/users/${u.id}.json`); } catch {}
                      }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={8} className="py-3 px-3 text-gray-500">No users</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex gap-2 mt-4">
          <input type="text" placeholder="Filter users..." value={filter} onChange={(e) => setFilter(e.target.value)} className="px-3 py-2 border rounded" />
          <button className="px-3 py-2 bg-blue-600 text-white rounded-lg" onClick={saveUsers}>Save</button>
          <button className="px-3 py-2 bg-gray-200 rounded" onClick={exportAllUsers}>Export All</button>
        </div>
      </div>
      )}

      {viewUser && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50" onClick={() => setViewUser(null)}>
          <div className="bg-white rounded-lg shadow w-full max-w-xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Profile</h3>
              <button className="text-gray-500" onClick={() => setViewUser(null)}>✕</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">Name</div>
                <div className="font-medium">{viewUser.rank} {viewUser.lastName}, {viewUser.firstName}{viewUser.mi ? ` ${viewUser.mi}` : ''}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Email</div>
                <div className="font-medium">{viewUser.email}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Service</div>
                <div className="font-medium">{viewUser.service}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Role</div>
                <div className="font-medium">{viewUser.role}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Scope</div>
                <div className="font-medium">{(() => {
                  const base = UNITS.find(x => x.uic === viewUser.unitUic);
                  const unitName = base ? base.unitName : viewUser.unit;
                  if (viewUser.isUnitAdmin || viewUser.role === 'COMMANDER') return unitName || '—';
                  if (viewUser.role === 'COMPANY_REVIEWER') return (viewUser.company && viewUser.company !== 'N/A') ? viewUser.company : '—';
                  if (viewUser.role === 'PLATOON_REVIEWER') {
                    const c = (viewUser.company && viewUser.company !== 'N/A') ? viewUser.company : '';
                    const p = (viewUser.unit && viewUser.unit !== 'N/A') ? viewUser.unit : '';
                    const parts = [c, p].filter(Boolean);
                    return parts.length ? parts.join(' / ') : '—';
                  }
                  return '—';
                })()}</div>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50" onClick={() => setViewUser(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50" onClick={() => setEditingUser(null)}>
          <div className="bg-white rounded-lg shadow w-full max-w-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Edit Profile</h3>
              <button className="text-gray-500" onClick={() => setEditingUser(null)}>✕</button>
            </div>
            {(editMode === 'profile' && currentUser && editingUser && currentUser.id === editingUser.id) && (
              <ProfileForm
                mode="edit"
                initial={editingUser}
                readOnly={false}
                onSaved={(updated) => {
                  setUsers(prev => prev.map(x => (x.id === updated.id ? updated : x)));
                  setEditingUser(null);
                  setFeedback({ type: 'success', message: 'Profile updated.' });
                }}
              />
            )}
            {(editMode === 'admin' && (currentUser?.isUnitAdmin || currentUser?.role === 'COMMANDER')) && (
              <div className="mt-6">
                <h4 className="text-md font-semibold text-gray-900 mb-3">Administrative</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="admin-role" className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select id="admin-role" aria-label="Role" value={editingRole} onChange={(e) => setEditingRole(e.target.value)} className="w-full px-3 py-2 border rounded">
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit Admin</label>
                    <div className="flex items-center gap-2">
                      <input id="admin-is-unit" type="checkbox" checked={editingIsUnitAdmin} onChange={(e) => setEditingIsUnitAdmin(e.target.checked)} />
                      <label htmlFor="admin-is-unit" className="text-sm text-gray-700">Grant Unit Admin privileges</label>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="admin-company" className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                    <select
                      id="admin-company"
                      value={editingCompany || ''}
                      onChange={(e) => { setEditingCompany(e.target.value || undefined); setEditingPlatoon(undefined); }}
                      className="w-full px-3 py-2 border rounded"
                    >
                      <option value="">{editCompanies.length ? 'Select company' : 'No companies configured'}</option>
                      {editCompanies.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="admin-platoon" className="block text-sm font-medium text-gray-700 mb-1">Platoon</label>
                    <select
                      id="admin-platoon"
                      value={editingPlatoon || ''}
                      onChange={(e) => setEditingPlatoon(e.target.value || undefined)}
                      disabled={!editingCompany || editPlatoons.length === 0}
                      className="w-full px-3 py-2 border rounded disabled:bg-gray-50"
                    >
                      <option value="">{editPlatoons.length ? 'Select platoon' : 'No platoons configured'}</option>
                      {editPlatoons.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {adminErrors.length > 0 && (
                  <div className="mt-3 p-3 border border-red-200 bg-red-50 text-red-800 rounded">
                    {adminErrors.map((err, idx) => (<div key={idx} className="text-sm">{err}</div>))}
                  </div>
                )}
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                    onClick={() => {
                      setEditingUser(null);
                      setAdminErrors([]);
                      setSavingAdmin(false);
                    }}
                  >Cancel</button>
                  <button
                    className={`px-4 py-2 rounded ${savingAdmin ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white flex items-center gap-2`}
                    aria-busy={savingAdmin}
                    disabled={savingAdmin}
                    onClick={async () => {
                      if (!editingUser) return;
                      const errs: string[] = [];
                      if (editingRole === 'COMPANY_REVIEWER' && !editingCompany) errs.push('Company is required for Company Reviewer.');
                      if (editingRole === 'PLATOON_REVIEWER' && (!editingCompany || !editingPlatoon)) errs.push('Company and Platoon are required for Platoon Reviewer.');
                      setAdminErrors(errs);
                      if (errs.length) return;
                      setSavingAdmin(true);
                      const updated = {
                        ...editingUser,
                        role: editingRole,
                        isUnitAdmin: editingIsUnitAdmin,
                        company: (editingIsUnitAdmin || editingRole === 'COMMANDER') ? 'N/A' : (editingCompany || 'N/A'),
                        unit: (editingIsUnitAdmin || editingRole === 'COMMANDER') ? (UNITS.find(x => x.uic === editingUser.unitUic)?.unitName || 'N/A') : (editingPlatoon || 'N/A'),
                      };
                      try { localStorage.setItem(`fs/users/${updated.id}.json`, JSON.stringify(updated)); } catch {}
                      try {
                        const res = await fetch('/api/users/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
                        if (!res.ok) throw new Error('persist_failed');
                      } catch (e) {
                        setSavingAdmin(false);
                        setFeedback({ type: 'error', message: 'Failed to save administrative changes.' });
                        return;
                      }
                      setUsers(prev => prev.map(x => (x.id === updated.id ? updated : x)));
                      try {
                        if (currentUser && currentUser.id === updated.id) {
                          localStorage.setItem('currentUser', JSON.stringify(updated));
                          setCurrentUser(updated);
                        }
                      } catch {}
                      setEditingUser(null);
                      setSavingAdmin(false);
                      setFeedback({ type: 'success', message: 'Administrative changes saved.' });
                    }}
                  >
                    {savingAdmin && (<span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>)}
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {feedback && (
        <div className={`p-3 rounded-lg border ${feedback.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {feedback.message}
        </div>
      )}
    </div>
  );
};
