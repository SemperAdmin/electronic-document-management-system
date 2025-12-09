import React, { useEffect, useMemo, useState } from 'react'
import { listUsers, listHQMCDivisions, listHQMCSectionAssignments, upsertHQMCSectionAssignment, getUserByEdipi } from '../lib/db'
import { loadHQMCStructureFromBundle } from '@/lib/hqmcStructure'
import { UserRecord } from '@/types'

export default function HQMCAdmin() {
  const [currentUser, setCurrentUser] = useState<UserRecord | null>(null)
  const [divisions, setDivisions] = useState<Array<{ code: string; name: string }>>([])
  const [structure, setStructure] = useState<Array<{ division_name: string; division_code?: string; branch: string; description?: string }>>([])
  const [newBranch, setNewBranch] = useState<string>('')
  const [newBranchDesc, setNewBranchDesc] = useState<string>('')
  const [users, setUsers] = useState<UserRecord[]>([])
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [viewTab, setViewTab] = useState<'structure' | 'permissions'>('structure')
  const [assignments, setAssignments] = useState<Record<string, { reviewers: string[]; approvers: string[] }>>({})
  const [edipiReviewerByBranch, setEdipiReviewerByBranch] = useState<Record<string, string>>({})
  const [edipiApproverByBranch, setEdipiApproverByBranch] = useState<Record<string, string>>({})

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('currentUser')
      if (savedUser) setCurrentUser(JSON.parse(savedUser))
    } catch {}
    listHQMCDivisions().then((rows: any[]) => {
      try { setDivisions(rows.map((d: any) => ({ code: String(d.code || ''), name: String(d.name || '') }))) } catch { setDivisions([]) }
    })
    loadHQMCStructureFromBundle().then(rows => {
      setStructure(rows as any)
    })
    listUsers().then((remote) => setUsers(remote as any)).catch(() => setUsers([]))
    listHQMCSectionAssignments().then(rows => {
      const map: Record<string, { reviewers: string[]; approvers: string[] }> = {}
      for (const r of rows) {
        const key = `${r.division_code}::${r.branch}`
        map[key] = { reviewers: r.reviewers || [], approvers: r.approvers || [] }
      }
      setAssignments(map)
    })
  }, [])

  const myDivisionCode = currentUser?.hqmcDivision || (divisions[0]?.code || '')
  const myDivision = useMemo(() => divisions.find(d => d.code === myDivisionCode), [divisions, myDivisionCode])
  const branches = useMemo(() => structure.filter(s => String(s.division_code || '') === myDivisionCode), [structure, myDivisionCode])
  const divisionAdmins = useMemo(() => users.filter(u => !!u.isHqmcAdmin && String(u.hqmcDivision || '') === myDivisionCode), [users, myDivisionCode])

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">HQMC Administration</h2>

      {!currentUser?.isHqmcAdmin && (
        <div className="text-center text-gray-500">
          <p>You are not an HQMC admin.</p>
        </div>
      )}

      {currentUser?.isHqmcAdmin && (
        <div>
          <div className="mb-2 text-sm text-gray-600">Division: {myDivision ? `${myDivision.code} — ${myDivision.name}` : 'None assigned'}</div>
          <div className="border-b border-gray-200 mb-4">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
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

          {viewTab === 'structure' && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 px-3">Branch/Section</th>
                    <th className="py-2 px-3">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {branches.map(b => (
                    <tr key={b.branch} className="border-b">
                      <td className="py-2 px-3">{b.branch}</td>
                      <td className="py-2 px-3">{b.description || ''}</td>
                    </tr>
                  ))}
                  {branches.length === 0 && (
                    <tr><td colSpan={2} className="py-3 px-3 text-gray-500">No structure entries for your division.</td></tr>
                  )}
                </tbody>
              </table>
              {currentUser?.isHqmcAdmin && (
                <div className="mt-4 p-3 border rounded">
                  <div className="text-sm font-medium text-gray-900 mb-2">Add Branch/Section</div>
                  <div className="flex items-center gap-2">
                    <input value={newBranch} onChange={(e) => setNewBranch(e.target.value)} placeholder="Branch" className="px-2 py-1 border rounded" />
                    <input value={newBranchDesc} onChange={(e) => setNewBranchDesc(e.target.value)} placeholder="Description" className="px-2 py-1 border rounded w-64" />
                    <button
                      className="px-2 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
                      disabled={!newBranch.trim()}
                      onClick={async () => {
                        try {
                          await fetch('/api/hqmc-structure/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ division_code: myDivisionCode, division_name: divisions.find(d => d.code === myDivisionCode)?.name || '', branch: newBranch.trim(), description: newBranchDesc.trim() }) })
                          const rows = await fetch('/api/hqmc-structure').then(r => r.json())
                          setStructure(rows as any)
                          setNewBranch(''); setNewBranchDesc('')
                        } catch {}
                      }}
                    >Add</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {viewTab === 'permissions' && (
            <div className="grid grid-cols-1 gap-4">
              <div className="md:col-span-2 p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">Section Reviewers & Approvers</h4>
                  <button
                    className="text-sm px-2 py-1 bg-gray-100 rounded"
                    onClick={async () => {
                      for (const b of branches) {
                        const key = `${myDivisionCode}::${b.branch}`
                        const a = assignments[key] || { reviewers: [], approvers: [] }
                        await upsertHQMCSectionAssignment({ division_code: myDivisionCode, branch: b.branch, reviewers: a.reviewers, approvers: a.approvers })
                      }
                      setFeedback({ type: 'success', message: 'HQMC section permissions saved.' })
                    }}
                  >Save</button>
                </div>
                <div className="space-y-4">
                  {branches.map(b => {
                    const key = `${myDivisionCode}::${b.branch}`
                    const a = assignments[key] || { reviewers: [], approvers: [] }
                    const displayUser = (u: any) => `${u.rank || ''} ${u.lastName || ''}, ${u.firstName || ''}${u.mi ? ' ' + u.mi : ''}`.trim()
                    return (
                      <div key={key} className="p-3 border border-gray-200 rounded-lg">
                        <div className="font-medium text-gray-900 mb-2">{b.branch}</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <input
                                type="text"
                                value={edipiReviewerByBranch[key] || ''}
                                onChange={(e) => setEdipiReviewerByBranch(prev => ({ ...prev, [key]: e.target.value }))}
                                placeholder="Enter EDIPI to add reviewer"
                                className="px-2 py-1 border rounded w-56"
                              />
                              <button
                                className="px-2 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
                                disabled={!edipiReviewerByBranch[key]}
                                onClick={async () => {
                                  const ed = (edipiReviewerByBranch[key] || '').trim()
                                  if (!ed) return
                                  const { user } = await getUserByEdipi(ed)
                                  if (!user?.id) { setFeedback({ type: 'error', message: `No user found for EDIPI ${ed}` }); return }
                                  setAssignments(prev => ({ ...prev, [key]: { ...a, reviewers: Array.from(new Set([...(a.reviewers || []), user.id])) } }))
                                  setEdipiReviewerByBranch(prev => ({ ...prev, [key]: '' }))
                                  setFeedback({ type: 'success', message: `Added reviewer ${user.lastName || ''}, ${user.firstName || ''}` })
                                }}
                              >Add Reviewer</button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {(a.reviewers || []).map(userId => {
                                const u = users.find(x => x.id === userId)
                                return (
                                  <span key={userId} className="inline-flex items-center gap-2 px-3 py-1 text-xs bg-gray-100 rounded border">
                                    <span>{u ? displayUser(u) : userId}</span>
                                    <button className="text-red-600" onClick={() => setAssignments(prev => ({ ...prev, [key]: { ...a, reviewers: (a.reviewers || []).filter(id => id !== userId) } }))}>✕</button>
                                  </span>
                                )
                              })}
                              {(a.reviewers || []).length === 0 && (<span className="text-xs text-gray-500">No reviewers assigned</span>)}
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <input
                                type="text"
                                value={edipiApproverByBranch[key] || ''}
                                onChange={(e) => setEdipiApproverByBranch(prev => ({ ...prev, [key]: e.target.value }))}
                                placeholder="Enter EDIPI to add approver"
                                className="px-2 py-1 border rounded w-56"
                              />
                              <button
                                className="px-2 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
                                disabled={!edipiApproverByBranch[key]}
                                onClick={async () => {
                                  const ed = (edipiApproverByBranch[key] || '').trim()
                                  if (!ed) return
                                  const { user } = await getUserByEdipi(ed)
                                  if (!user?.id) { setFeedback({ type: 'error', message: `No user found for EDIPI ${ed}` }); return }
                                  setAssignments(prev => ({ ...prev, [key]: { ...a, approvers: Array.from(new Set([...(a.approvers || []), user.id])) } }))
                                  setEdipiApproverByBranch(prev => ({ ...prev, [key]: '' }))
                                  setFeedback({ type: 'success', message: `Added approver ${user.lastName || ''}, ${user.firstName || ''}` })
                                }}
                              >Add Approver</button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {(a.approvers || []).map(userId => {
                                const u = users.find(x => x.id === userId)
                                return (
                                  <span key={userId} className="inline-flex items-center gap-2 px-3 py-1 text-xs bg-gray-100 rounded border">
                                    <span>{u ? displayUser(u) : userId}</span>
                                    <button className="text-red-600" onClick={() => setAssignments(prev => ({ ...prev, [key]: { ...a, approvers: (a.approvers || []).filter(id => id !== userId) } }))}>✕</button>
                                  </span>
                                )
                              })}
                              {(a.approvers || []).length === 0 && (<span className="text-xs text-gray-500">No approvers assigned</span>)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {feedback && (
        <div className={`mt-4 p-3 rounded-lg border ${feedback.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>{feedback.message}</div>
      )}
    </div>
  )
}
