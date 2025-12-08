import React, { useEffect, useState, useRef } from 'react';
import { Unit, UNITS } from '../lib/units';
import { listInstallations, upsertInstallation, listUsers, getUserByEdipi } from '../lib/db';
import { Installation } from '../types';
import { Pagination } from '@/components/Pagination';

export default function InstallationAdmin() {
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [selectedInstallation, setSelectedInstallation] = useState<Installation | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [filterQuery, setFilterQuery] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [viewTab, setViewTab] = useState<'unit' | 'structure' | 'permissions'>('unit');
  const [unitTab, setUnitTab] = useState<'assigned' | 'unassigned'>('assigned');
  const [users, setUsers] = useState<any[]>([]);

  const [assignedPage, setAssignedPage] = useState(1);
  const [assignedPageSize, setAssignedPageSize] = useState(10);
  const [unassignedPage, setUnassignedPage] = useState(1);
  const [unassignedPageSize, setUnassignedPageSize] = useState(10);

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('currentUser');
      if (savedUser) {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        listInstallations().then(data => {
          const installation = (data as Installation[]).find(i => i.id === user.installationId);
          if (installation) {
            setSelectedInstallation(installation);
          }
        });
        listUsers().then((remote) => setUsers(remote as any)).catch(() => setUsers([]));
      }
    } catch (error) {
      console.error('Failed to load user from localStorage:', error);
    }
  }, []);

  const handleUnitToggle = (unitUic: string) => {
    if (selectedInstallation) {
      const newUnitUics = selectedInstallation.unitUics.includes(unitUic)
        ? selectedInstallation.unitUics.filter(uic => uic !== unitUic)
        : [...selectedInstallation.unitUics, unitUic];
      setSelectedInstallation({ ...selectedInstallation, unitUics: newUnitUics });
    }
  };

  const handleSaveChanges = async () => {
    if (selectedInstallation) {
      const { ok, error } = await upsertInstallation(selectedInstallation);
      if (ok) {
        setFeedback({ type: 'success', message: 'Installation units updated successfully.' });
      } else {
        setFeedback({ type: 'error', message: `Failed to update installation: ${error.message}` });
      }
    }
  };

  const filteredUnits = (() => {
    const q = filterQuery.toLowerCase().trim();
    if (!q) return UNITS.slice().sort((a, b) => a.unitName.localeCompare(b.unitName));
    const ranked = UNITS.map(unit => {
      const name = unit.unitName.toLowerCase();
      const ruc = unit.ruc.toLowerCase();
      const uic = unit.uic.toLowerCase();
      const mcc = unit.mcc.toLowerCase();
      const address = `${unit.streetAddress} ${unit.cityState} ${unit.zip}`.toLowerCase();
      let rank = Infinity as number;
      if (ruc.startsWith(q)) rank = 1;
      else if (mcc.startsWith(q)) rank = 2;
      else if (name.startsWith(q)) rank = 3;
      else if (uic.startsWith(q)) rank = 4;
      else if (address.includes(q)) rank = 5;
      return { unit, rank };
    }).filter(x => x.rank !== Infinity)
      .sort((a, b) => a.rank === b.rank ? a.unit.unitName.localeCompare(b.unit.unitName) : a.rank - b.rank)
      .map(x => x.unit);
    return ranked;
  })();

  const assignedUnits = (selectedInstallation ? filteredUnits.filter(u => selectedInstallation.unitUics.includes(u.uic)) : []);
  const unassignedUnits = (selectedInstallation ? filteredUnits.filter(u => !selectedInstallation.unitUics.includes(u.uic)) : []);

  const assignedTotal = assignedUnits.length;
  const assignedTotalPages = Math.max(1, Math.ceil(assignedTotal / (assignedPageSize || 1)));
  const assignedCurrentPage = Math.min(assignedPage, assignedTotalPages);
  const assignedStartIndex = assignedTotal === 0 ? 0 : (assignedCurrentPage - 1) * assignedPageSize + 1;
  const assignedEndIndex = assignedTotal === 0 ? 0 : Math.min(assignedStartIndex + assignedPageSize - 1, assignedTotal);
  const assignedSlice = assignedUnits.slice((assignedCurrentPage - 1) * assignedPageSize, (assignedCurrentPage - 1) * assignedPageSize + assignedPageSize);

  const unassignedTotal = unassignedUnits.length;
  const unassignedTotalPages = Math.max(1, Math.ceil(unassignedTotal / (unassignedPageSize || 1)));
  const unassignedCurrentPage = Math.min(unassignedPage, unassignedTotalPages);
  const unassignedStartIndex = unassignedTotal === 0 ? 0 : (unassignedCurrentPage - 1) * unassignedPageSize + 1;
  const unassignedEndIndex = unassignedTotal === 0 ? 0 : Math.min(unassignedStartIndex + unassignedPageSize - 1, unassignedTotal);
  const unassignedSlice = unassignedUnits.slice((unassignedCurrentPage - 1) * unassignedPageSize, (unassignedCurrentPage - 1) * unassignedPageSize + unassignedPageSize);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Installation Administration</h2>

      {!selectedInstallation && (
        <div className="text-center text-gray-500">
          <p>You are not assigned to an installation.</p>
        </div>
      )}

      {selectedInstallation && (<>
        <div>
          {viewTab === 'unit' && (
            <>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Managing Units for {selectedInstallation.name}
              </h3>
              <div className="mb-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search by name, RUC, UIC, MCC, address or ZIP"
                    className="px-4 py-2 border rounded w-full"
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') setFilterQuery(searchInput); if (e.key === 'Escape') { setSearchInput(''); setFilterQuery(''); } }}
                    ref={inputRef}
                  />
                  <button
                    className="px-3 py-2 bg-blue-600 text-white rounded"
                    onClick={() => setFilterQuery(searchInput)}
                  >Search</button>
                  <button
                    className="px-3 py-2 bg-gray-200 rounded"
                    onClick={() => { setSearchInput(''); setFilterQuery(''); inputRef.current?.focus(); }}
                  >Clear</button>
                </div>
              </div>
            </>
          )}
          <div className="border-b border-gray-200 mb-4">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setViewTab('unit')}
                className={`${viewTab === 'unit' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
              >Unit</button>
              <button
                onClick={() => setViewTab('structure')}
                className={`${viewTab === 'structure' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
              >Structure</button>
              <button
                onClick={() => setViewTab('permissions')}
                className={`${viewTab === 'permissions' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
              >Permissions</button>
            </nav>
          </div>
          {viewTab === 'unit' && (
            <div className="border-b border-gray-200 mb-4">
              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                <button
                  onClick={() => setUnitTab('assigned')}
                  className={`${unitTab === 'assigned' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
                >Assigned Units</button>
                <button
                  onClick={() => setUnitTab('unassigned')}
                  className={`${unitTab === 'unassigned' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
                >Unassigned Units</button>
              </nav>
            </div>
          )}
          <div className="overflow-x-auto">
            {viewTab === 'unit' && unitTab === 'assigned' && (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 px-3">Assigned</th>
                    <th className="py-2 px-3">Unit Name</th>
                    <th className="py-2 px-3">RUC</th>
                    <th className="py-2 px-3">UIC</th>
                    <th className="py-2 px-3">MCC</th>
                    <th className="py-2 px-3">Address</th>
                  </tr>
                </thead>
                <tbody>
                  {assignedSlice.map(unit => (
                    <tr key={unit.uic} className="border-b">
                      <td className="py-2 px-3">
                        <input
                          type="checkbox"
                          checked={true}
                          onChange={() => handleUnitToggle(unit.uic)}
                        />
                      </td>
                      <td className="py-2 px-3">{unit.unitName}</td>
                      <td className="py-2 px-3">{unit.ruc}</td>
                      <td className="py-2 px-3">{unit.uic}</td>
                      <td className="py-2 px-3">{unit.mcc}</td>
                      <td className="py-2 px-3">{`${unit.streetAddress}, ${unit.cityState} ${unit.zip}`}</td>
                    </tr>
                  ))}
                  {assignedSlice.length === 0 && (
                    <tr><td colSpan={6} className="py-3 px-3 text-gray-500">No assigned units</td></tr>
                  )}
                </tbody>
              </table>
            )}
            {viewTab === 'unit' && unitTab === 'unassigned' && (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 px-3">Assign</th>
                    <th className="py-2 px-3">Unit Name</th>
                    <th className="py-2 px-3">RUC</th>
                    <th className="py-2 px-3">UIC</th>
                    <th className="py-2 px-3">MCC</th>
                    <th className="py-2 px-3">Address</th>
                  </tr>
                </thead>
                <tbody>
                  {unassignedSlice.map(unit => (
                    <tr key={unit.uic} className="border-b">
                      <td className="py-2 px-3">
                        <input
                          type="checkbox"
                          checked={false}
                          onChange={() => handleUnitToggle(unit.uic)}
                        />
                      </td>
                      <td className="py-2 px-3">{unit.unitName}</td>
                      <td className="py-2 px-3">{unit.ruc}</td>
                      <td className="py-2 px-3">{unit.uic}</td>
                      <td className="py-2 px-3">{unit.mcc}</td>
                      <td className="py-2 px-3">{`${unit.streetAddress}, ${unit.cityState} ${unit.zip}`}</td>
                    </tr>
                  ))}
                  {unassignedSlice.length === 0 && (
                    <tr><td colSpan={6} className="py-3 px-3 text-gray-500">No unassigned units</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
          {viewTab === 'unit' && unitTab === 'assigned' && (
            <div className="mt-4">
              <Pagination
                currentPage={assignedCurrentPage}
                totalPages={assignedTotalPages}
                totalItems={assignedTotal}
                pageSize={assignedPageSize}
                startIndex={assignedStartIndex}
                endIndex={assignedEndIndex}
                onPageChange={p => setAssignedPage(p)}
                onPageSizeChange={s => { setAssignedPageSize(s); setAssignedPage(1); }}
                onNext={() => setAssignedPage(Math.min(assignedCurrentPage + 1, assignedTotalPages))}
                onPrevious={() => setAssignedPage(Math.max(assignedCurrentPage - 1, 1))}
                onFirst={() => setAssignedPage(1)}
                onLast={() => setAssignedPage(assignedTotalPages)}
                canGoNext={assignedCurrentPage < assignedTotalPages}
                canGoPrevious={assignedCurrentPage > 1}
                pageSizeOptions={[5,10,25,50]}
              />
            </div>
          )}
          {viewTab === 'unit' && unitTab === 'unassigned' && (
            <div className="mt-4">
              <Pagination
                currentPage={unassignedCurrentPage}
                totalPages={unassignedTotalPages}
                totalItems={unassignedTotal}
                pageSize={unassignedPageSize}
                startIndex={unassignedStartIndex}
                endIndex={unassignedEndIndex}
                onPageChange={p => setUnassignedPage(p)}
                onPageSizeChange={s => { setUnassignedPageSize(s); setUnassignedPage(1); }}
                onNext={() => setUnassignedPage(Math.min(unassignedCurrentPage + 1, unassignedTotalPages))}
                onPrevious={() => setUnassignedPage(Math.max(unassignedCurrentPage - 1, 1))}
                onFirst={() => setUnassignedPage(1)}
                onLast={() => setUnassignedPage(unassignedTotalPages)}
                canGoNext={unassignedCurrentPage < unassignedTotalPages}
                canGoPrevious={unassignedCurrentPage > 1}
                pageSizeOptions={[5,10,25,50]}
              />
            </div>
          )}
          {viewTab === 'structure' && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">Installation Sections</h4>
                <button
                  className="text-sm px-2 py-1 bg-gray-100 rounded"
                  onClick={() => {
                    if (!selectedInstallation) return;
                    upsertInstallation({
                      ...selectedInstallation,
                      sections: selectedInstallation.sections || [],
                      commandSections: selectedInstallation.commandSections || [],
                    }).then(({ ok }) => {
                      setFeedback(ok ? { type: 'success', message: 'Installation sections saved.' } : { type: 'error', message: 'Failed to save installation sections.' })
                    })
                  }}
                >Save</button>
              </div>
              <SectionEditor
                label="Add section (e.g., Admin, Security)"
                list={selectedInstallation.sections || []}
                onAdd={(val: string) => {
                  if (!val.trim()) return;
                  setSelectedInstallation(prev => prev ? { ...prev, sections: Array.from(new Set([...(prev.sections || []), val.trim()])) } : prev)
                }}
                onRemove={(val: string) => {
                  setSelectedInstallation(prev => prev ? { ...prev, sections: (prev.sections || []).filter(s => s !== val) } : prev)
                }}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">Installation Command Sections</h4>
                <button
                  className="text-sm px-2 py-1 bg-gray-100 rounded"
                  onClick={() => {
                    if (!selectedInstallation) return;
                    upsertInstallation({
                      ...selectedInstallation,
                      sections: selectedInstallation.sections || [],
                      commandSections: selectedInstallation.commandSections || [],
                    }).then(({ ok }) => {
                      setFeedback(ok ? { type: 'success', message: 'Installation command sections saved.' } : { type: 'error', message: 'Failed to save installation command sections.' })
                    })
                  }}
                >Save</button>
              </div>
              <SectionEditor
                label="Add command section (e.g., XO, SgtMaj)"
                list={selectedInstallation.commandSections || []}
                onAdd={(val: string) => {
                  if (!val.trim()) return;
                  setSelectedInstallation(prev => prev ? { ...prev, commandSections: Array.from(new Set([...(prev.commandSections || []), val.trim()])) } : prev)
                }}
                onRemove={(val: string) => {
                  setSelectedInstallation(prev => prev ? { ...prev, commandSections: (prev.commandSections || []).filter(s => s !== val) } : prev)
                }}
              />
            </div>
          </div>
          )}

          {viewTab === 'permissions' && selectedInstallation && (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">Installation Commander</h4>
                  <div className="text-sm text-gray-600">{(() => {
                    const u = users.find(x => x.id === selectedInstallation.commanderUserId)
                    return u ? `${u.rank || ''} ${u.lastName || ''}, ${u.firstName || ''}`.trim() : 'None'
                  })()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Enter EDIPI"
                    className="px-2 py-1 border rounded w-48"
                    value={(selectedInstallation as any)._commanderEdipi || ''}
                    onChange={(e) => setSelectedInstallation(prev => prev ? ({ ...(prev as any), _commanderEdipi: e.target.value }) : prev)}
                  />
                  <button
                    className="px-2 py-1 bg-blue-600 text-white rounded"
                    onClick={async () => {
                      const ed = String((selectedInstallation as any)._commanderEdipi || '').trim()
                      if (!ed) return
                      const { user } = await getUserByEdipi(ed)
                      if (!user?.id) { setFeedback({ type: 'error', message: `No user found for EDIPI ${ed}` }); return }
                      setSelectedInstallation(prev => prev ? ({ ...prev, commanderUserId: user.id }) : prev)
                      setFeedback({ type: 'success', message: `Set installation commander: ${user.lastName || ''}, ${user.firstName || ''}` })
                    }}
                  >Set</button>
                  <button
                    className="px-2 py-1 bg-gray-200 rounded"
                    onClick={() => setSelectedInstallation(prev => prev ? ({ ...prev, commanderUserId: undefined, _commanderEdipi: '' }) : prev)}
                  >Clear</button>
                  <button
                    className="px-2 py-1 bg-gray-100 rounded"
                    onClick={async () => {
                      if (!selectedInstallation) return
                      const { ok } = await upsertInstallation(selectedInstallation)
                      setFeedback(ok ? { type: 'success', message: 'Installation commander saved.' } : { type: 'error', message: 'Failed to save installation commander.' })
                    }}
                  >Save</button>
                </div>
              </div>
              <PermissionsEditor
                title="Section Permissions"
                sections={selectedInstallation.sections || []}
                assignments={selectedInstallation.sectionAssignments || {}}
                users={users}
                onAddByEdipi={async (section, edipi) => {
                  const { user } = await getUserByEdipi(edipi);
                  if (!user?.id) {
                    setFeedback({ type: 'error', message: `No user found for EDIPI ${edipi}` });
                    return;
                  }
                  setSelectedInstallation(prev => prev ? {
                    ...prev,
                    sectionAssignments: {
                      ...(prev.sectionAssignments || {}),
                      [section]: Array.from(new Set([...(prev.sectionAssignments?.[section] || []), user.id]))
                    }
                  } : prev)
                  setFeedback({ type: 'success', message: `Added ${user.lastName || ''}, ${user.firstName || ''} to ${section}` })
                }}
                onRemove={(section, userId) => {
                  setSelectedInstallation(prev => prev ? {
                    ...prev,
                    sectionAssignments: {
                      ...(prev.sectionAssignments || {}),
                      [section]: (prev.sectionAssignments?.[section] || []).filter((id: string) => id !== userId)
                    }
                  } : prev)
                }}
                onSave={async () => {
                  if (!selectedInstallation) return;
                  const { ok } = await upsertInstallation(selectedInstallation);
                  setFeedback(ok ? { type: 'success', message: 'Section permissions saved.' } : { type: 'error', message: 'Failed to save section permissions.' })
                }}
              />
              <PermissionsEditor
                title="Command Section Permissions"
                sections={selectedInstallation.commandSections || []}
                assignments={selectedInstallation.commandSectionAssignments || {}}
                users={users}
                onAddByEdipi={async (section, edipi) => {
                  const { user } = await getUserByEdipi(edipi);
                  if (!user?.id) {
                    setFeedback({ type: 'error', message: `No user found for EDIPI ${edipi}` });
                    return;
                  }
                  setSelectedInstallation(prev => prev ? {
                    ...prev,
                    commandSectionAssignments: {
                      ...(prev.commandSectionAssignments || {}),
                      [section]: Array.from(new Set([...(prev.commandSectionAssignments?.[section] || []), user.id]))
                    }
                  } : prev)
                  setFeedback({ type: 'success', message: `Added ${user.lastName || ''}, ${user.firstName || ''} to ${section}` })
                }}
                onRemove={(section, userId) => {
                  setSelectedInstallation(prev => prev ? {
                    ...prev,
                    commandSectionAssignments: {
                      ...(prev.commandSectionAssignments || {}),
                      [section]: (prev.commandSectionAssignments?.[section] || []).filter((id: string) => id !== userId)
                    }
                  } : prev)
                }}
                onSave={async () => {
                  if (!selectedInstallation) return;
                  const { ok } = await upsertInstallation(selectedInstallation);
                  setFeedback(ok ? { type: 'success', message: 'Command section permissions saved.' } : { type: 'error', message: 'Failed to save command section permissions.' })
                }}
              />
            </div>
          )}
          <button
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
            onClick={handleSaveChanges}
          >
            Save Changes
          </button>
        </div>
      </>)}

      {feedback && (
        <div className={`mt-4 p-3 rounded-lg border ${feedback.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {feedback.message}
        </div>
      )}
    </div>
  );
}

type SectionEditorProps = {
  label: string;
  list: string[];
  onAdd: (val: string) => void;
  onRemove: (val: string) => void;
};

const SectionEditor: React.FC<SectionEditorProps> = ({ label, list, onAdd, onRemove }) => {
  const [value, setValue] = useState('');
  return (
    <div>
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={label}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button className="px-3 py-2 bg-blue-600 text-white rounded-lg" onClick={() => { onAdd(value); setValue(''); }}>Add</button>
      </div>
      <div className="space-y-2">
        {list.map(s => (
          <div key={s} className="flex items-center justify-between p-2 border rounded">
            <span>{s}</span>
            <button className="text-red-600 text-sm" onClick={() => onRemove(s)}>Remove</button>
          </div>
        ))}
        {list.length === 0 && (
          <p className="text-sm text-gray-500">No sections configured</p>
        )}
      </div>
    </div>
  );
};

type PermissionsEditorProps = {
  title: string;
  sections: string[];
  assignments: Record<string, string[]>;
  users: Array<{ id: string; rank?: string; firstName?: string; lastName?: string; mi?: string }>;
  onAddByEdipi: (section: string, edipi: string) => Promise<void> | void;
  onRemove: (section: string, userId: string) => void;
  onSave: () => Promise<void> | void;
};

const PermissionsEditor: React.FC<PermissionsEditorProps> = ({ title, sections, assignments, users, onAddByEdipi, onRemove, onSave }) => {
  const [edipiBySection, setEdipiBySection] = useState<Record<string, string>>({});

  const displayUser = (u: any) => `${u.rank || ''} ${u.lastName || ''}, ${u.firstName || ''}${u.mi ? ' ' + u.mi : ''}`.trim();

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-gray-900">{title}</h4>
        <button className="text-sm px-2 py-1 bg-gray-100 rounded" onClick={() => onSave()}>Save</button>
      </div>
      <div className="space-y-4">
        {sections.length === 0 && (
          <p className="text-sm text-gray-500">No sections configured.</p>
        )}
        {sections.map(section => (
          <div key={section} className="p-3 border border-gray-200 rounded-lg">
            <div className="font-medium text-gray-900 mb-2">{section}</div>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                value={edipiBySection[section] || ''}
                onChange={(e) => setEdipiBySection(prev => ({ ...prev, [section]: e.target.value }))}
                placeholder="Enter EDIPI"
                className="px-2 py-1 border rounded w-48"
              />
              <button
                className="px-2 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
                disabled={!edipiBySection[section]}
                onClick={async () => { const ed = (edipiBySection[section] || '').trim(); if (ed) { await onAddByEdipi(section, ed); setEdipiBySection(prev => ({ ...prev, [section]: '' })); } }}
              >Find & Add</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(assignments[section] || []).map(userId => {
                const u = users.find(x => x.id === userId);
                return (
                  <span key={userId} className="inline-flex items-center gap-2 px-3 py-1 text-xs bg-gray-100 rounded border">
                    <span>{u ? displayUser(u) : userId}</span>
                    <button className="text-red-600" onClick={() => onRemove(section, userId)}>✕</button>
                  </span>
                );
              })}
              {(assignments[section] || []).length === 0 && (
                <span className="text-xs text-gray-500">No users assigned</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
