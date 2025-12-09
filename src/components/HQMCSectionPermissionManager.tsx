import React, { useEffect, useMemo, useState } from 'react'
import { listUsers, upsertHQMCSectionAssignment } from '@/lib/db'
import { UserRecord } from '@/types'

type Props = {
  currentUser: UserRecord
  divisionCode: string
  branches: string[]
  assignments: Array<{ division_code: string; branch: string; reviewers: string[]; approvers: string[] }>
  onClose: () => void
}

const keyFor = (div: string, branch: string) => `${div}::${branch}`

export default function HQMCSectionPermissionManager({ currentUser, divisionCode, branches, assignments, onClose }: Props) {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [selectedBranch, setSelectedBranch] = useState<string>('')
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [roleType, setRoleType] = useState<'reviewer' | 'approver'>('reviewer')
  const [busy, setBusy] = useState(false)

  useEffect(() => { listUsers().then(u => setUsers(u as any)).catch(() => setUsers([])) }, [])

  const assignmentsMap = useMemo(() => {
    const map: Record<string, { reviewers: string[]; approvers: string[] }> = {}
    for (const a of assignments) {
      map[keyFor(a.division_code, a.branch)] = { reviewers: a.reviewers || [], approvers: a.approvers || [] }
    }
    return map
  }, [assignments])

  const myId = String(currentUser.id || '')
  const canManageSelected = useMemo(() => {
    if (!selectedBranch) return false
    const a = assignmentsMap[keyFor(divisionCode, selectedBranch)] || { reviewers: [], approvers: [] }
    return (a.reviewers || []).includes(myId) || (a.approvers || []).includes(myId) || !!currentUser.isHqmcAdmin
  }, [selectedBranch, assignmentsMap, myId, currentUser])

  const eligibleUsers = useMemo(() => users.filter(u => String(u.hqmcDivision || '') === String(divisionCode || '') && String(u.id || '') !== myId), [users, divisionCode, myId])
  const assignedUsers = useMemo(() => {
    if (!selectedBranch) return [] as UserRecord[]
    const a = assignmentsMap[keyFor(divisionCode, selectedBranch)] || { reviewers: [], approvers: [] }
    const ids = Array.from(new Set([...(a.reviewers || []), ...(a.approvers || [])]))
    return ids.map(id => eligibleUsers.find(u => u.id === id)).filter(Boolean) as UserRecord[]
  }, [selectedBranch, assignmentsMap, eligibleUsers, divisionCode])

  const persist = async (next: { reviewers: string[]; approvers: string[] }) => {
    setBusy(true)
    try {
      await upsertHQMCSectionAssignment({ division_code: divisionCode, branch: selectedBranch, reviewers: next.reviewers, approvers: next.approvers } as any)
      try { await fetch('/api/permissions-audit/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actorId: currentUser.id, scope: { hqmcDivision: divisionCode, branch: selectedBranch }, event: 'hqmc_section_assignments_updated', timestamp: new Date().toISOString() }) }) } catch {}
    } finally {
      setBusy(false)
    }
  }

  const addUser = async () => {
    if (!canManageSelected || !selectedBranch || !selectedUserId) return
    const a = assignmentsMap[keyFor(divisionCode, selectedBranch)] || { reviewers: [], approvers: [] }
    const next = { reviewers: Array.from(new Set(a.reviewers || [])), approvers: Array.from(new Set(a.approvers || [])) }
    if (roleType === 'reviewer') next.reviewers = Array.from(new Set([...next.reviewers, selectedUserId]))
    else next.approvers = Array.from(new Set([...next.approvers, selectedUserId]))
    await persist(next)
    setSelectedUserId('')
  }

  const removeUser = async (uid: string) => {
    if (!canManageSelected || !selectedBranch) return
    const a = assignmentsMap[keyFor(divisionCode, selectedBranch)] || { reviewers: [], approvers: [] }
    const next = { reviewers: (a.reviewers || []).filter(id => id !== uid), approvers: (a.approvers || []).filter(id => id !== uid) }
    await persist(next)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow w-full max-w-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Manage HQMC Section Access</h3>
          <button className="text-gray-500" onClick={onClose}>✕</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
            <select className="w-full px-3 py-2 border rounded" value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}>
              <option value="">Select section</option>
              {branches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          {selectedBranch && !canManageSelected && (
            <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">You are not assigned to this section. Only assigned reviewers/approvers or HQMC admins can manage access.</div>
          )}
          {selectedBranch && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Add User</label>
                  <select className="w-full px-3 py-2 border rounded" value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} disabled={!canManageSelected}>
                    <option value="">Choose user</option>
                    {eligibleUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.rank} {u.lastName}, {u.firstName}{u.mi ? ` ${u.mi}` : ''} • {u.email}</option>
                    ))}
                  </select>
                  <div className="mt-2 flex items-center gap-2">
                    <label className="text-xs">Role</label>
                    <select className="px-2 py-1 border rounded text-xs" value={roleType} onChange={(e) => setRoleType(e.target.value as any)}>
                      <option value="reviewer">Reviewer</option>
                      <option value="approver">Approver</option>
                    </select>
                    <button className="ml-auto px-3 py-1 rounded bg-brand-red text-brand-cream hover:bg-brand-red-2 disabled:opacity-50" disabled={!canManageSelected || !selectedUserId || busy} onClick={addUser}>Add</button>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900 mb-1">Current Members</div>
                  <div className="space-y-2">
                    {assignedUsers.map(u => (
                      <div key={u.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="text-sm text-gray-700">{u.rank} {u.lastName}, {u.firstName}{u.mi ? ` ${u.mi}` : ''} • {u.email}</div>
                        <button className="px-3 py-1 text-xs bg-red-600 text-white rounded disabled:opacity-50" disabled={!canManageSelected || busy} onClick={() => removeUser(u.id)}>Remove</button>
                      </div>
                    ))}
                    {assignedUsers.length === 0 && (<div className="text-sm text-gray-500">No users assigned to this section.</div>)}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
