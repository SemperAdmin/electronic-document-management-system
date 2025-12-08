import React, { useEffect, useMemo, useState } from 'react'
import { UNITS, Unit } from '../lib/units'
import { upsertUser, listUsers, listRequests, listInstallations, listHQMCDivisions } from '../lib/db'
import { Installation, UserRecord } from '../types'
import { Pagination } from '@/components/Pagination'

export default function AppAdmin() {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [assignMap, setAssignMap] = useState<Record<string, string>>({})
  const [assignInstallationMap, setAssignInstallationMap] = useState<Record<string, string>>({})
  const [requests, setRequests] = useState<Array<{ id: string; subject: string; unitUic?: string; currentStage?: string; uploadedById: string; createdAt: string }>>([])
  const [mainTab, setMainTab] = useState<'unit' | 'installation' | 'hqmc'>('unit')
  const [subTab, setSubTab] = useState<'assigned' | 'missing'>('assigned')
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [selectedInstallation, setSelectedInstallation] = useState<string>('');
  const [hqmcDivisions, setHqmcDivisions] = useState<Array<{ id: string; name: string; code: string }>>([])
  const [selectedHqmcDivision, setSelectedHqmcDivision] = useState<string>('')

  const refreshUsers = () => {
    listUsers().then((us) => setUsers(us as any)).catch(() => setUsers([]))
  }

  const refreshRequests = () => {
    listRequests().then((rs) => setRequests(rs as any)).catch(() => setRequests([]))
  }

  const refreshAll = () => { setFeedback(null); refreshUsers(); refreshRequests(); }

  useEffect(() => {
    refreshAll()
    listInstallations().then(data => setInstallations(data as Installation[]));
    listHQMCDivisions().then(data => setHqmcDivisions(data));
  }, [mainTab, subTab])

  const unitAdmins = useMemo(() => {
    const byUic: Record<string, UserRecord | undefined> = {}
    for (const u of users) {
      if (u.isUnitAdmin && u.unitUic) {
        byUic[u.unitUic] = u
      }
    }
    return byUic
  }, [users])

  const installationAdminsById = useMemo(() => {
    const map: Record<string, UserRecord[]> = {}
    for (const u of users) {
      if (u.isInstallationAdmin && u.installationId) {
        const id = u.installationId
        map[id] = map[id] || []
        map[id].push(u)
      }
    }
    return map
  }, [users])

  const eligibleForUnit = (unit: Unit) => users.filter(u => (u.unitUic === unit.uic) || (!u.unitUic && u.unit === unit.unitName))

  const assignAdmin = async (unit: Unit) => {
    const selectedId = assignMap[unit.uic]
    if (!selectedId) return
    const user = users.find(x => x.id === selectedId)
    if (!user) return
    const updated: UserRecord = { ...user, isUnitAdmin: true, unitUic: unit.uic, unit: unit.unitName, company: 'N/A' }
    try {
      const res = await upsertUser({
        id: updated.id,
        email: updated.email,
        rank: updated.rank,
        firstName: updated.firstName,
        lastName: updated.lastName,
        mi: updated.mi,
        service: updated.service,
        role: updated.role,
        unitUic: updated.unitUic,
        unit: updated.unit,
        company: updated.company,
        isUnitAdmin: !!updated.isUnitAdmin,
        isInstallationAdmin: !!updated.isInstallationAdmin,
        isCommandStaff: !!updated.isCommandStaff,
        edipi: updated.edipi,
      })
      if (!res.ok) { setFeedback({ type: 'error', message: 'Failed to assign admin (DB error).' }); return }
    } catch {}
    setUsers(prev => prev.map(u => (u.id === updated.id ? updated : u)))
    setFeedback({ type: 'success', message: `Assigned ${updated.rank} ${updated.lastName} as admin for ${unit.unitName}.` })
  }

  const assignInstallationAdmin = async () => {
    const selectedId = assignInstallationMap['installation']
    if (!selectedId) return
    const user = users.find(x => x.id === selectedId)
    if (!user) return
    const updated: UserRecord = { ...user, isInstallationAdmin: true, installationId: selectedInstallation }
    try {
      const res = await upsertUser({
        id: updated.id,
        email: updated.email,
        rank: updated.rank,
        firstName: updated.firstName,
        lastName: updated.lastName,
        mi: updated.mi,
        service: updated.service,
        role: updated.role,
        unitUic: updated.unitUic,
        unit: updated.unit,
        company: updated.company,
        isUnitAdmin: !!updated.isUnitAdmin,
        isInstallationAdmin: !!updated.isInstallationAdmin,
        isCommandStaff: !!updated.isCommandStaff,
        edipi: updated.edipi,
        installationId: updated.installationId,
      })
      if (!res.ok) { setFeedback({ type: 'error', message: 'Failed to assign installation admin (DB error).' }); return }
    } catch {}
    setUsers(prev => prev.map(u => (u.id === updated.id ? updated : u)))
    setFeedback({ type: 'success', message: `Assigned ${updated.rank} ${updated.lastName} as installation admin.` })
  }

  const unitsWithAdmin = useMemo(() => UNITS.filter(u => !!unitAdmins[u.uic]), [unitAdmins])
  const hqmcAdmins = useMemo(() => users.filter(u => !!u.isHqmcAdmin), [users])
  const unitsWithoutAdmin = useMemo(() => UNITS.filter(u => !unitAdmins[u.uic]), [unitAdmins])
  const installationsWithAdmin = useMemo(() => installations.filter(i => (installationAdminsById as any)[i.id]?.length), [installations, installationAdminsById])
  const installationsWithoutAdmin = useMemo(() => installations.filter(i => !((installationAdminsById as any)[i.id]?.length)), [installations, installationAdminsById])
  const hqmcAdminsByDivision = useMemo(() => {
    const map: Record<string, UserRecord[]> = {}
    for (const u of users) {
      if (u.isHqmcAdmin && u.hqmcDivision) {
        const code = u.hqmcDivision
        map[code] = map[code] || []
        map[code].push(u)
      }
    }
    return map
  }, [users])

  const pendingApprovals = useMemo(() => {
    const STAGES = ['PLATOON_REVIEW','COMPANY_REVIEW','BATTALION_REVIEW','COMMANDER_REVIEW']
    return requests.filter(r => STAGES.includes(String(r.currentStage || '')))
  }, [requests])

  const [assignedPage, setAssignedPage] = useState(1)
  const [assignedPageSize, setAssignedPageSize] = useState(10)
  const assignedTotal = unitsWithAdmin.length
  const assignedTotalPages = Math.max(1, Math.ceil(assignedTotal / (assignedPageSize || 1)))
  const assignedCurrentPage = Math.min(assignedPage, assignedTotalPages)
  const assignedStartIndex = assignedTotal === 0 ? 0 : (assignedCurrentPage - 1) * assignedPageSize + 1
  const assignedEndIndex = assignedTotal === 0 ? 0 : Math.min(assignedStartIndex + assignedPageSize - 1, assignedTotal)
  const assignedSlice = unitsWithAdmin.slice((assignedCurrentPage - 1) * assignedPageSize, (assignedCurrentPage - 1) * assignedPageSize + assignedPageSize)

  const [missingPage, setMissingPage] = useState(1)
  const [missingPageSize, setMissingPageSize] = useState(10)
  const missingTotal = unitsWithoutAdmin.length
  const missingTotalPages = Math.max(1, Math.ceil(missingTotal / (missingPageSize || 1)))
  const missingCurrentPage = Math.min(missingPage, missingTotalPages)
  const missingStartIndex = missingTotal === 0 ? 0 : (missingCurrentPage - 1) * missingPageSize + 1
  const missingEndIndex = missingTotal === 0 ? 0 : Math.min(missingStartIndex + missingPageSize - 1, missingTotal)
  const missingSlice = unitsWithoutAdmin.slice((missingCurrentPage - 1) * missingPageSize, (missingCurrentPage - 1) * missingPageSize + missingPageSize)

  const migrateToSupabase = async () => {
    setFeedback({ type: 'error', message: 'Migration via UI disabled. Use terminal command if needed.' })
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">App Administration</h2>
      

      <div className="mb-4 flex gap-2">
        <button className={`px-4 py-2 rounded ${mainTab === 'unit' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`} onClick={() => { setMainTab('unit'); setSubTab('assigned') }}>Unit Admin</button>
        <button className={`px-4 py-2 rounded ${mainTab === 'installation' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`} onClick={() => { setMainTab('installation'); setSubTab('assigned') }}>Installation Admin</button>
        <button className={`px-4 py-2 rounded ${mainTab === 'hqmc' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`} onClick={() => { setMainTab('hqmc'); setSubTab('assigned') }}>HQMC Admin</button>
      </div>
      <div className="mb-4 flex gap-2">
        <button className={`px-4 py-2 rounded ${subTab === 'assigned' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`} onClick={() => setSubTab('assigned')}>Assigned</button>
        <button className={`px-4 py-2 rounded ${subTab === 'missing' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`} onClick={() => setSubTab('missing')}>Missing</button>
      </div>

      {mainTab === 'installation' && subTab === 'assigned' && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Installation Admin Assigned</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 px-3">Installation</th>
                  <th className="py-2 px-3">Current Admin(s)</th>
                </tr>
              </thead>
              <tbody>
                {installationsWithAdmin.map(i => (
                  <tr key={i.id} className="border-b">
                    <td className="py-2 px-3">{i.name}</td>
                    <td className="py-2 px-3">{(installationAdminsById[i.id] || []).map(u => `${u.rank} ${u.lastName}, ${u.firstName}${u.mi ? ` ${u.mi}` : ''}`).join(' • ')}</td>
                  </tr>
                ))}
                {installationsWithAdmin.length === 0 && (
                  <tr><td colSpan={2} className="py-3 px-3 text-gray-500">No installations have admins assigned.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {mainTab === 'installation' && subTab === 'missing' && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Installation Admin Missing</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 px-3">Installation</th>
                  <th className="py-2 px-3">Assign</th>
                  <th className="py-2 px-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {installationsWithoutAdmin.map(i => (
                  <tr key={i.id} className="border-b">
                    <td className="py-2 px-3">{i.name}</td>
                    <td className="py-2 px-3">
                      <select
                        value={assignInstallationMap[i.id] || ''}
                        onChange={(e) => setAssignInstallationMap(prev => ({ ...prev, [i.id]: e.target.value }))}
                        className="px-2 py-1 border rounded"
                      >
                        <option value="">Select user</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>{`${u.rank} ${u.lastName}, ${u.firstName}${u.mi ? ` ${u.mi}` : ''}`}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-3">
                      <button
                        className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
                        disabled={!assignInstallationMap[i.id]}
                        onClick={async () => {
                          const selectedId = assignInstallationMap[i.id]
                          const user = users.find(x => x.id === selectedId)
                          if (!user) return
                          const updated: UserRecord = { ...user, isInstallationAdmin: true, installationId: i.id }
                          try {
                            const res = await upsertUser({
                              id: updated.id,
                              email: updated.email,
                              rank: updated.rank,
                              firstName: updated.firstName,
                              lastName: updated.lastName,
                              mi: updated.mi,
                              service: updated.service,
                              role: updated.role,
                              unitUic: updated.unitUic,
                              unit: updated.unit,
                              company: updated.company,
                              isUnitAdmin: !!updated.isUnitAdmin,
                              isInstallationAdmin: !!updated.isInstallationAdmin,
                              isCommandStaff: !!updated.isCommandStaff,
                              edipi: updated.edipi,
                              installationId: updated.installationId,
                            })
                            if (!res.ok) { setFeedback({ type: 'error', message: 'Failed to assign installation admin (DB error).' }); return }
                          } catch {}
                          setUsers(prev => prev.map(u => (u.id === updated.id ? updated : u)))
                          setFeedback({ type: 'success', message: `Assigned ${updated.rank} ${updated.lastName} as installation admin.` })
                        }}
                      >Assign</button>
                    </td>
                  </tr>
                ))}
                {installationsWithoutAdmin.length === 0 && (
                  <tr><td colSpan={3} className="py-3 px-3 text-gray-500">All installations have admins assigned.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {mainTab === 'unit' && subTab === 'assigned' && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Unit Admin Assigned</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 px-3">Unit</th>
                  <th className="py-2 px-3">UIC</th>
                  <th className="py-2 px-3">Current Admin</th>
                </tr>
              </thead>
              <tbody>
                {assignedSlice.map(unit => {
                  const admin = unitAdmins[unit.uic]!
                  return (
                    <tr key={unit.uic} className="border-b">
                      <td className="py-2 px-3">{unit.unitName}</td>
                      <td className="py-2 px-3">{unit.uic}</td>
                      <td className="py-2 px-3">{`${admin.rank} ${admin.lastName}, ${admin.firstName}${admin.mi ? ` ${admin.mi}` : ''}`}</td>
                    </tr>
                  )
                })}
                {unitsWithAdmin.length === 0 && (
                  <tr><td colSpan={3} className="py-3 px-3 text-gray-500">No units have admins assigned.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4">
            <Pagination
              currentPage={assignedCurrentPage}
              totalPages={assignedTotalPages}
              totalItems={assignedTotal}
              pageSize={assignedPageSize}
              startIndex={assignedStartIndex}
              endIndex={assignedEndIndex}
              onPageChange={(p) => setAssignedPage(p)}
              onPageSizeChange={(s) => { setAssignedPageSize(s); setAssignedPage(1) }}
              onNext={() => setAssignedPage(Math.min(assignedCurrentPage + 1, assignedTotalPages))}
              onPrevious={() => setAssignedPage(Math.max(assignedCurrentPage - 1, 1))}
              onFirst={() => setAssignedPage(1)}
              onLast={() => setAssignedPage(assignedTotalPages)}
              canGoNext={assignedCurrentPage < assignedTotalPages}
              canGoPrevious={assignedCurrentPage > 1}
              pageSizeOptions={[5,10,25,50]}
            />
          </div>
        </div>
      )}

      {mainTab === 'unit' && subTab === 'missing' && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Unit Admin Missing</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 px-3">Unit</th>
                  <th className="py-2 px-3">UIC</th>
                  <th className="py-2 px-3">Assign</th>
                  <th className="py-2 px-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {missingSlice.map(unit => {
                  const eligible = eligibleForUnit(unit)
                  return (
                    <tr key={unit.uic} className="border-b">
                      <td className="py-2 px-3">{unit.unitName}</td>
                      <td className="py-2 px-3">{unit.uic}</td>
                      <td className="py-2 px-3">
                        <select
                          value={assignMap[unit.uic] || ''}
                          onChange={(e) => setAssignMap(prev => ({ ...prev, [unit.uic]: e.target.value }))}
                          className="px-2 py-1 border rounded"
                        >
                          <option value="">{eligible.length ? 'Select user' : 'No eligible users'}</option>
                          {eligible.map(u => (
                            <option key={u.id} value={u.id}>{`${u.rank} ${u.lastName}, ${u.firstName}${u.mi ? ` ${u.mi}` : ''}`}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-3">
                        <button
                          className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
                          disabled={!assignMap[unit.uic]}
                          onClick={() => assignAdmin(unit)}
                        >Assign</button>
                      </td>
                    </tr>
                  )
                })}
                {unitsWithoutAdmin.length === 0 && (
                  <tr><td colSpan={4} className="py-3 px-3 text-gray-500">All units have admins assigned.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4">
            <Pagination
              currentPage={missingCurrentPage}
              totalPages={missingTotalPages}
              totalItems={missingTotal}
              pageSize={missingPageSize}
              startIndex={missingStartIndex}
              endIndex={missingEndIndex}
              onPageChange={(p) => setMissingPage(p)}
              onPageSizeChange={(s) => { setMissingPageSize(s); setMissingPage(1) }}
              onNext={() => setMissingPage(Math.min(missingCurrentPage + 1, missingTotalPages))}
              onPrevious={() => setMissingPage(Math.max(missingCurrentPage - 1, 1))}
              onFirst={() => setMissingPage(1)}
              onLast={() => setMissingPage(missingTotalPages)}
              canGoNext={missingCurrentPage < missingTotalPages}
              canGoPrevious={missingCurrentPage > 1}
              pageSizeOptions={[5,10,25,50]}
            />
          </div>
        </div>
      )}

      

      {mainTab === 'hqmc' && subTab === 'assigned' && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">HQMC Admin Assigned</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-2">Current HQMC Admins</h4>
              <ul className="space-y-2">
                {hqmcAdmins.map(a => (
                  <li key={a.id} className="flex items-center justify-between p-2 border rounded">
                    <span>{`${a.rank} ${a.lastName}, ${a.firstName}${a.mi ? ` ${a.mi}` : ''}`}{a.hqmcDivision ? ` • ${a.hqmcDivision}` : ''}</span>
                    <button
                      className="px-2 py-1 text-xs bg-red-600 text-white rounded"
                      onClick={async () => {
                        const updated = { ...a, isHqmcAdmin: false }
                        try {
                          const res = await upsertUser({
                            id: updated.id,
                            email: updated.email,
                            rank: updated.rank,
                            firstName: updated.firstName,
                            lastName: updated.lastName,
                            mi: updated.mi,
                            service: updated.service,
                            role: updated.role,
                            unitUic: updated.unitUic,
                            unit: updated.unit,
                            company: updated.company,
                            isUnitAdmin: !!updated.isUnitAdmin,
                            isInstallationAdmin: !!updated.isInstallationAdmin,
                            isCommandStaff: !!updated.isCommandStaff,
                            isHqmcAdmin: !!updated.isHqmcAdmin,
                            hqmcDivision: updated.hqmcDivision,
                            edipi: updated.edipi,
                          })
                          if (!res.ok) { setFeedback({ type: 'error', message: 'Failed to remove HQMC admin (DB error).' }); return }
                        } catch {}
                        setUsers(prev => prev.map(u => (u.id === updated.id ? updated as UserRecord : u)))
                        setFeedback({ type: 'success', message: `Removed HQMC admin: ${updated.rank} ${updated.lastName}.` })
                      }}
                    >Remove</button>
                  </li>
                ))}
                {hqmcAdmins.length === 0 && (<li className="text-sm text-gray-500">No HQMC admins assigned.</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}
      {mainTab === 'hqmc' && subTab === 'missing' && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">HQMC Admin Missing</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 px-3">Division</th>
                  <th className="py-2 px-3">Assign</th>
                  <th className="py-2 px-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {hqmcDivisions.filter(d => !(hqmcAdminsByDivision[d.code]?.length)).map(d => (
                  <tr key={d.code} className="border-b">
                    <td className="py-2 px-3">{d.code} — {d.name}</td>
                    <td className="py-2 px-3">
                      <select
                        value={assignInstallationMap[`hqmc_${d.code}`] || ''}
                        onChange={(e) => setAssignInstallationMap(prev => ({ ...prev, [`hqmc_${d.code}`]: e.target.value }))}
                        className="px-2 py-1 border rounded"
                      >
                        <option value="">Select user</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>{`${u.rank} ${u.lastName}, ${u.firstName}${u.mi ? ` ${u.mi}` : ''}`}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-3">
                      <button
                        className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
                        disabled={!assignInstallationMap[`hqmc_${d.code}`]}
                        onClick={async () => {
                          const selectedId = assignInstallationMap[`hqmc_${d.code}`]
                          const user = users.find(x => x.id === selectedId)
                          if (!user) return
                          const updated: UserRecord = { ...user, isHqmcAdmin: true, hqmcDivision: d.code }
                          try {
                            const res = await upsertUser({
                              id: updated.id,
                              email: updated.email,
                              rank: updated.rank,
                              firstName: updated.firstName,
                              lastName: updated.lastName,
                              mi: updated.mi,
                              service: updated.service,
                              role: updated.role,
                              unitUic: updated.unitUic,
                              unit: updated.unit,
                              company: updated.company,
                              isUnitAdmin: !!updated.isUnitAdmin,
                              isInstallationAdmin: !!updated.isInstallationAdmin,
                              isCommandStaff: !!updated.isCommandStaff,
                              isHqmcAdmin: !!updated.isHqmcAdmin,
                              hqmcDivision: updated.hqmcDivision,
                              edipi: updated.edipi,
                            })
                            if (!res.ok) { setFeedback({ type: 'error', message: 'Failed to assign HQMC admin (DB error).' }); return }
                          } catch {}
                          setUsers(prev => prev.map(u => (u.id === updated.id ? updated : u)))
                          setFeedback({ type: 'success', message: `Assigned ${updated.rank} ${updated.lastName} as HQMC admin for ${d.code}.` })
                        }}
                      >Assign</button>
                    </td>
                  </tr>
                ))}
                {hqmcDivisions.filter(d => !(hqmcAdminsByDivision[d.code]?.length)).length === 0 && (
                  <tr><td colSpan={3} className="py-3 px-3 text-gray-500">All HQMC divisions have admins assigned.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {feedback && (
        <div className={`mt-4 p-3 rounded-lg border ${feedback.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>{feedback.message}</div>
      )}
      </div>
    </div>
  )
}
