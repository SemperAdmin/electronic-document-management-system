import React, { useEffect, useMemo, useState } from 'react'
import { listInstallations, listUsers, upsertInstallation } from '@/lib/db'
import { UserRecord } from '@/types'

type Props = {
  currentUser: UserRecord
  onClose: () => void
}

export const InstallationPermissionManager: React.FC<Props> = ({ currentUser, onClose }) => {
  const [install, setInstall] = useState<any | null>(null)
  const [users, setUsers] = useState<UserRecord[]>([])
  const [selectedSection, setSelectedSection] = useState<string>('')
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    listInstallations().then((all) => {
      const target = (all as any[]).find(i => String(i.id) === String(currentUser.installationId || ''))
      setInstall(target || null)
    }).catch(() => setInstall(null))
    listUsers().then((u) => setUsers(u as any)).catch(() => setUsers([]))
  }, [])

  const sections: string[] = useMemo(() => (install?.sections || []), [install])
  const assignments: Record<string, string[]> = useMemo(() => (install?.sectionAssignments || {}), [install])
  const myId = String(currentUser.id || '')
  const canManageSection = useMemo(() => {
    if (!install || !selectedSection) return false
    if (currentUser.isInstallationAdmin) return true
    const list = assignments[selectedSection] || []
    return Array.isArray(list) && list.includes(myId)
  }, [install, selectedSection, assignments, myId, currentUser])

  const usersById = useMemo(() => users.reduce((acc, u) => ({ ...acc, [u.id]: u }), {} as Record<string, UserRecord>), [users])
  const currentAssigned = useMemo(() => {
    if (!selectedSection) return [] as UserRecord[]
    const ids = assignments[selectedSection] || []
    return ids.map(id => usersById[id]).filter(Boolean)
  }, [assignments, selectedSection, usersById])

  const eligibleUsers = useMemo(() => {
    const unitUics: string[] = Array.isArray(install?.unitUics) ? install.unitUics : []
    return users.filter(u => {
      if (u.id === currentUser.id) return false
      const inInstall = String(u.installationId || '') === String(install?.id || '')
      const byUnit = unitUics.includes(String(u.unitUic || ''))
      return inInstall || byUnit
    })
  }, [users, install, currentUser])

  const persistAssignments = async (nextAssign: Record<string, string[]>) => {
    if (!install) return
    setBusy(true)
    setError('')
    try {
      const payload = { ...install, sectionAssignments: nextAssign }
      const res = await upsertInstallation(payload)
      if (!res.ok) throw new Error('persist_failed')
      setInstall(payload)
      try {
        await fetch('/api/permissions-audit/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actorId: currentUser.id, scope: { installationId: install.id, section: selectedSection }, timestamp: new Date().toISOString(), event: 'installation_section_assignments_updated' }) })
      } catch {}
    } catch (e) {
      setError('Failed to persist installation assignments')
    } finally {
      setBusy(false)
    }
  }

  const addUserToSection = async () => {
    if (!canManageSection || !selectedSection || !selectedUserId) return
    const next: Record<string, string[]> = { ...assignments }
    const list = Array.isArray(next[selectedSection]) ? next[selectedSection] : []
    if (!list.includes(selectedUserId)) list.push(selectedUserId)
    next[selectedSection] = list
    await persistAssignments(next)
    setSelectedUserId('')
  }

  const removeUserFromSection = async (uid: string) => {
    if (!canManageSection || !selectedSection || !uid) return
    const next: Record<string, string[]> = { ...assignments }
    const list = Array.isArray(next[selectedSection]) ? next[selectedSection] : []
    next[selectedSection] = list.filter(id => id !== uid)
    await persistAssignments(next)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow w-full max-w-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Manage Installation Section Access</h3>
          <button className="text-gray-500" onClick={onClose}>✕</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
            <select className="w-full px-3 py-2 border rounded" value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)}>
              <option value="">Select section</option>
              {sections.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {selectedSection && !canManageSection && (
            <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">You do not have permission to manage this section. Only installation admins or assigned section members can manage access.</div>
          )}
          {selectedSection && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Add User to Section</label>
                <select className="w-full px-3 py-2 border rounded" value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} disabled={!canManageSection}>
                  <option value="">Choose user</option>
                  {eligibleUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.rank} {u.lastName}, {u.firstName}{u.mi ? ` ${u.mi}` : ''} • {u.email}</option>
                  ))}
                </select>
                <div className="mt-2 flex justify-end">
                  <button className="px-3 py-1 rounded bg-brand-red text-brand-cream hover:bg-brand-red-2 disabled:opacity-50" disabled={!canManageSection || !selectedUserId || busy} onClick={addUserToSection}>Add</button>
                </div>
              </div>
              <div className="mt-4">
                <div className="text-sm font-medium text-gray-900 mb-2">Current Members</div>
                <div className="space-y-2">
                  {currentAssigned.map(u => (
                    <div key={u.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="text-sm text-gray-700">{u.rank} {u.lastName}, {u.firstName}{u.mi ? ` ${u.mi}` : ''} • {u.email}</div>
                      <button className="px-3 py-1 text-xs bg-red-600 text-white rounded disabled:opacity-50" disabled={!canManageSection || busy} onClick={() => removeUserFromSection(u.id)}>Remove</button>
                    </div>
                  ))}
                  {currentAssigned.length === 0 && (
                    <div className="text-sm text-gray-500">No users assigned to this section.</div>
                  )}
                </div>
              </div>
              {error && <div className="p-2 bg-red-50 text-red-700 border border-red-200 rounded text-sm">{error}</div>}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default InstallationPermissionManager
