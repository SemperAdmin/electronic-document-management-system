import React, { useEffect, useMemo, useState } from 'react'
import { UNITS, Unit } from '../lib/units'
import { upsertUser, listUsers, listRequests, listInstallations } from '../lib/db'
import { Installation } from '../types'

interface UserProfile {
  id: string
  name: string
  firstName: string
  lastName: string
  mi?: string
  email: string
  edipi: string
  service: string
  rank: string
  role: string
  battalion: string
  company: string
  unit: string
  unitUic?: string
  passwordHash: string
  isUnitAdmin?: boolean
  isInstallationAdmin?: boolean
  isCommandStaff?: boolean
  installationId?: string
}

export default function AppAdmin() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [assignMap, setAssignMap] = useState<Record<string, string>>({})
  const [assignInstallationMap, setAssignInstallationMap] = useState<Record<string, string>>({})
  const [requests, setRequests] = useState<Array<{ id: string; subject: string; unitUic?: string; currentStage?: string; uploadedById: string; createdAt: string }>>([])
  const [adminView, setAdminView] = useState<'assigned' | 'missing' | 'installation'>('assigned')
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [selectedInstallation, setSelectedInstallation] = useState<string>('');

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
  }, [adminView])

  const unitAdmins = useMemo(() => {
    const byUic: Record<string, UserProfile | undefined> = {}
    for (const u of users) {
      if (u.isUnitAdmin && u.unitUic) {
        byUic[u.unitUic] = u
      }
    }
    return byUic
  }, [users])

  const eligibleForUnit = (unit: Unit) => users.filter(u => (u.unitUic === unit.uic) || (!u.unitUic && u.unit === unit.unitName))

  const assignAdmin = async (unit: Unit) => {
    const selectedId = assignMap[unit.uic]
    if (!selectedId) return
    const user = users.find(x => x.id === selectedId)
    if (!user) return
    const updated: UserProfile = { ...user, isUnitAdmin: true, unitUic: unit.uic, unit: unit.unitName, company: 'N/A' }
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
    const updated: UserProfile = { ...user, isInstallationAdmin: true, installationId: selectedInstallation }
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
  const unitsWithoutAdmin = useMemo(() => UNITS.filter(u => !unitAdmins[u.uic]), [unitAdmins])

  const pendingApprovals = useMemo(() => {
    const STAGES = ['PLATOON_REVIEW','COMPANY_REVIEW','BATTALION_REVIEW','COMMANDER_REVIEW']
    return requests.filter(r => STAGES.includes(String(r.currentStage || '')))
  }, [requests])

  const migrateToSupabase = async () => {
    setFeedback({ type: 'error', message: 'Migration via UI disabled. Use terminal command if needed.' })
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">App Administration</h2>
      

      <div className="mb-4 flex gap-2">
        <button
          className={`px-4 py-2 rounded ${adminView === 'assigned' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          onClick={() => setAdminView('assigned')}
        >Unit Admin Assigned</button>
        <button
          className={`px-4 py-2 rounded ${adminView === 'missing' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          onClick={() => setAdminView('missing')}
        >Unit Admin Missing</button>
        <button
          className={`px-4 py-2 rounded ${adminView === 'installation' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          onClick={() => setAdminView('installation')}
        >Installation Admin</button>
      </div>

      {adminView === 'installation' && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Assign Installation Admin</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 px-3">Assign</th>
                  <th className="py-2 px-3">Installation</th>
                  <th className="py-2 px-3">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-2 px-3">
                    <select
                      value={assignInstallationMap['installation'] || ''}
                      onChange={(e) => setAssignInstallationMap({ 'installation': e.target.value })}
                      className="px-2 py-1 border rounded"
                    >
                      <option value="">Select user</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{`${u.rank} ${u.lastName}, ${u.firstName}${u.mi ? ` ${u.mi}` : ''}`}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 px-3">
                    <select
                      value={selectedInstallation}
                      onChange={(e) => setSelectedInstallation(e.target.value)}
                      className="px-2 py-1 border rounded"
                    >
                      <option value="">Select installation</option>
                      {installations.map(i => (
                        <option key={i.id} value={i.id}>{i.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 px-3">
                    <button
                      className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
                      disabled={!assignInstallationMap['installation'] || !selectedInstallation}
                      onClick={() => assignInstallationAdmin()}
                    >Assign</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {adminView === 'assigned' && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Unit Admin Assigned</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 px-3">Unit</th>
                  <th className="py-2 px-3">UIC</th>
                  <th className="py-2 px-3">Current Admin</th>
                  <th className="py-2 px-3">Installation</th>
                </tr>
              </thead>
              <tbody>
                {unitsWithAdmin.map(unit => {
                  const admin = unitAdmins[unit.uic]!
                  const installation = installations.find(i => Array.isArray(i.unitUics) && i.unitUics.includes(unit.uic));
                  return (
                    <tr key={unit.uic} className="border-b">
                      <td className="py-2 px-3">{unit.unitName}</td>
                      <td className="py-2 px-3">{unit.uic}</td>
                      <td className="py-2 px-3">{`${admin.rank} ${admin.lastName}, ${admin.firstName}${admin.mi ? ` ${admin.mi}` : ''}`}</td>
                      <td className="py-2 px-3">{installation ? installation.name : 'N/A'}</td>
                    </tr>
                  )
                })}
                {unitsWithAdmin.length === 0 && (
                  <tr><td colSpan={4} className="py-3 px-3 text-gray-500">No units have admins assigned.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {adminView === 'missing' && (
        <div>
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
                {unitsWithoutAdmin.map(unit => {
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
        </div>
      )}

      

      {feedback && (
        <div className={`mt-4 p-3 rounded-lg border ${feedback.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>{feedback.message}</div>
      )}
    </div>
  )
}
