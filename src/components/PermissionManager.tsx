import React, { useEffect, useMemo, useState } from 'react'
import { listUsers, upsertUser } from '@/lib/db'
import { UserRecord } from '@/types'

interface PermissionManagerProps {
  currentUser: UserRecord
  onClose: () => void
}

export const PermissionManager: React.FC<PermissionManagerProps> = ({ currentUser, onClose }) => {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string>('')

  useEffect(() => {
    listUsers().then((result) => {
      setUsers(result.data || [])
    }).catch(() => setUsers([]))
  }, [])

  const canManage = useMemo(() => {
    const r = String(currentUser.role || '')
    return r !== 'MEMBER'
  }, [currentUser])

  const eligibleUsers = useMemo(() => {
    const scopeFilter = (u: UserRecord) => {
      const cuic = currentUser.unitUic || ''
      const role = String(currentUser.role || '')
      if (role.includes('PLATOON')) {
        const oc = (u.company && u.company !== 'N/A') ? u.company : ''
        const ou = (u.platoon && u.platoon !== 'N/A') ? u.platoon : ''
        const cc = (currentUser.company && currentUser.company !== 'N/A') ? currentUser.company : ''
        const cu = (currentUser.platoon && currentUser.platoon !== 'N/A') ? currentUser.platoon : ''
        return oc === cc && ou === cu
      }
      if (role.includes('COMPANY')) {
        const oc = (u.company && u.company !== 'N/A') ? u.company : ''
        const cc = (currentUser.company && currentUser.company !== 'N/A') ? currentUser.company : ''
        return oc === cc
      }
      if (role.includes('COMMANDER')) {
        return (u.unitUic || '') === cuic
      }
      return false
    }
    return users.filter(u => u.id !== currentUser.id && scopeFilter(u))
  }, [users, currentUser])

  const currentAccess = useMemo(() => {
    const role = String(currentUser.role || '')
    const scopeFilter = (u: UserRecord) => {
      const cuic = currentUser.unitUic || ''
      if (role.includes('PLATOON')) {
        const oc = (u.company && u.company !== 'N/A') ? u.company : ''
        const ou = (u.platoon && u.platoon !== 'N/A') ? u.platoon : ''
        const cc = (currentUser.company && currentUser.company !== 'N/A') ? currentUser.company : ''
        const cu = (currentUser.platoon && currentUser.platoon !== 'N/A') ? currentUser.platoon : ''
        return oc === cc && ou === cu
      }
      if (role.includes('COMPANY')) {
        const oc = (u.company && u.company !== 'N/A') ? u.company : ''
        const cc = (currentUser.company && currentUser.company !== 'N/A') ? currentUser.company : ''
        return oc === cc
      }
      if (role.includes('COMMANDER')) {
        return (u.unitUic || '') === cuic
      }
      return false
    }
    return users.filter(u => u.id !== currentUser.id && scopeFilter(u) && String(u.role || '') === role)
  }, [users, currentUser])

  const grantEquivalentPermission = async () => {
    try {
      setBusy(true)
      setError('')
      const target = users.find(u => u.id === selectedUserId)
    if (!canManage || !target) { setBusy(false); return }
    const role = String(currentUser.role || '')
    const next: UserRecord = { ...target }
    next.role = role
    if (role.includes('PLATOON')) {
      next.roleCompany = (currentUser.company && currentUser.company !== 'N/A') ? currentUser.company : 'N/A'
      const cu = (currentUser.platoon && currentUser.platoon !== 'N/A') ? currentUser.platoon : 'N/A'
      next.rolePlatoon = cu
    } else if (role.includes('COMPANY')) {
      next.roleCompany = (currentUser.company && currentUser.company !== 'N/A') ? currentUser.company : 'N/A'
      next.rolePlatoon = 'N/A'
    } else if (role.includes('COMMANDER')) {
      next.roleCompany = 'N/A'
      next.rolePlatoon = 'N/A'
    }
      try {
        const res = await upsertUser({
          id: next.id,
          email: next.email,
          rank: next.rank,
          firstName: next.firstName,
          lastName: next.lastName,
          mi: next.mi,
          service: next.service,
          role: next.role,
          unitUic: next.unitUic,
          unit: next.unit,
          company: next.company,
          isUnitAdmin: !!next.isUnitAdmin,
          isCommandStaff: !!next.isCommandStaff,
          edipi: next.edipi,
          passwordHash: next.passwordHash,
          roleCompany: (next as any).roleCompany,
          rolePlatoon: (next as any).rolePlatoon,
        })
        if (!res.ok) throw new Error('persist_failed')
      } catch (e) {
        setError('Failed to persist user changes')
      }
      const logEntry = {
        actorId: currentUser.id,
        actorRole: currentUser.role,
        targetId: next.id,
        grantedRole: next.role,
        timestamp: new Date().toISOString(),
        scope: {
          unitUic: currentUser.unitUic || '',
          company: currentUser.company,
          unit: currentUser.unit
        }
      }
      try {
        await fetch('/api/permissions-audit/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logEntry) })
      } catch {}
      setUsers(prev => prev.map(u => (u.id === next.id ? next : u)))
      setSelectedUserId('')
      setConfirmOpen(false)
      setBusy(false)
    } catch {
      setBusy(false)
      setError('Operation failed')
    }
  }

  const revokePermission = async (targetId: string) => {
    try {
      setBusy(true)
      setError('')
      const target = users.find(u => u.id === targetId)
      if (!target) { setBusy(false); return }
      const role = String(currentUser.role || '')
      // ensure scope
      const inList = currentAccess.some(u => u.id === targetId)
      if (!inList) { setBusy(false); setError('Target not in scope'); return }
      const next: UserRecord = { ...target }
      next.role = 'MEMBER'
      next.company = 'N/A'
      next.unit = 'N/A'
      next.isCommandStaff = false
      ;(next as any).roleCompany = 'N/A'
      ;(next as any).rolePlatoon = 'N/A'
      try {
        const res = await upsertUser({
          id: next.id,
          email: next.email,
          rank: next.rank,
          firstName: next.firstName,
          lastName: next.lastName,
          mi: next.mi,
          service: next.service,
          role: next.role,
          unitUic: next.unitUic,
          unit: next.unit,
          company: next.company,
          isUnitAdmin: !!next.isUnitAdmin,
          isCommandStaff: !!next.isCommandStaff,
          edipi: next.edipi,
          passwordHash: next.passwordHash,
          roleCompany: (next as any).roleCompany,
          rolePlatoon: (next as any).rolePlatoon,
        })
        if (!res.ok) throw new Error('persist_failed')
      } catch (e) {
        setError('Failed to persist user changes')
      }
      const logEntry = {
        actorId: currentUser.id,
        actorRole: currentUser.role,
        targetId: next.id,
        action: 'Revoked',
        previousRole: role,
        timestamp: new Date().toISOString()
      }
      try { await fetch('/api/permissions-audit/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logEntry) }) } catch {}
      setUsers(prev => prev.map(u => (u.id === next.id ? next : u)))
      setConfirmRemoveId('')
      setBusy(false)
    } catch {
      setBusy(false)
      setError('Operation failed')
    }
  }

  if (!canManage) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow w-full max-w-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Manage Permissions</h3>
          <button className="text-gray-500" onClick={onClose}>✕</button>
        </div>
        <div className="space-y-3">
          <div className="text-sm text-gray-700">Grant your current permission level to users in your scope.</div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select User</label>
            <select className="w-full px-3 py-2 border rounded" value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
              <option value="">Choose user</option>
              {eligibleUsers.map(u => (
                <option key={u.id} value={u.id}>{u.rank} {u.lastName}, {u.firstName}{u.mi ? ` ${u.mi}` : ''} • {u.email}</option>
              ))}
            </select>
          </div>
          <div className="mt-4">
            <div className="text-sm font-medium text-gray-900 mb-2">Current Access</div>
            <div className="space-y-2">
              {currentAccess.map(u => (
                <div key={u.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="text-sm text-gray-700">{u.rank} {u.lastName}, {u.firstName}{u.mi ? ` ${u.mi}` : ''} • {u.email}</div>
                  <button className="px-3 py-1 text-xs bg-red-600 text-white rounded" onClick={() => setConfirmRemoveId(u.id)}>Remove Access</button>
                </div>
              ))}
              {currentAccess.length === 0 && (
                <div className="text-sm text-gray-500">No users currently have this access in your scope.</div>
              )}
            </div>
          </div>
          {error && <div className="p-2 bg-red-50 text-red-700 border border-red-200 rounded text-sm">{error}</div>}
        </div>
        <div className="mt-4 flex justify-center">
          <button
            className="px-4 py-2 rounded bg-brand-red text-brand-cream hover:bg-brand-red-2 disabled:opacity-50"
            disabled={!selectedUserId || busy}
            onClick={() => setConfirmOpen(true)}
          >
            Grant Equivalent Permission
          </button>
        </div>
        {confirmOpen && (
          <div className="mt-4 p-3 border rounded">
            <div className="text-sm">Confirm granting your permission level to the selected user?</div>
            <div className="mt-3 flex justify-end gap-2">
              <button className="px-3 py-1 border rounded" onClick={() => setConfirmOpen(false)}>Cancel</button>
              <button className="px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-50" disabled={busy} onClick={grantEquivalentPermission}>Confirm</button>
            </div>
          </div>
        )}
        {confirmRemoveId && (
          <div className="mt-4 p-3 border rounded">
            <div className="text-sm">Confirm removing access for the selected user?</div>
            <div className="mt-3 flex justify-end gap-2">
              <button className="px-3 py-1 border rounded" onClick={() => setConfirmRemoveId('')}>Cancel</button>
              <button className="px-3 py-1 rounded bg-red-600 text-white disabled:opacity-50" disabled={busy} onClick={() => revokePermission(confirmRemoveId)}>Remove</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
