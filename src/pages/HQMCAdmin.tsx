import React, { useEffect, useMemo, useState } from 'react'
import { listHQMCStructure, listHQMCDivisions, listUsers, upsertUser } from '../lib/db'
import { UserRecord } from '@/types'

export default function HQMCAdmin() {
  const [currentUser, setCurrentUser] = useState<UserRecord | null>(null)
  const [divisions, setDivisions] = useState<Array<{ id: string; name: string; code: string }>>([])
  const [structure, setStructure] = useState<Array<{ division_name: string; division_code?: string; branch: string; description?: string }>>([])
  const [users, setUsers] = useState<UserRecord[]>([])
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [viewTab, setViewTab] = useState<'structure' | 'permissions'>('structure')

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('currentUser')
      if (savedUser) setCurrentUser(JSON.parse(savedUser))
    } catch {}
    listHQMCDivisions().then(setDivisions)
    listHQMCStructure().then(setStructure)
    listUsers().then((remote) => setUsers(remote as any)).catch(() => setUsers([]))
  }, [])

  const myDivisionCode = currentUser?.hqmcDivision || ''
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
            </div>
          )}

          {viewTab === 'permissions' && (
            <div className="grid grid-cols-1 gap-4">
              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">Division Admins</h4>
                </div>
                <ul className="space-y-2">
                  {divisionAdmins.map(a => (
                    <li key={a.id} className="flex items-center justify-between p-2 border rounded">
                      <span>{`${a.rank || ''} ${a.lastName || ''}, ${a.firstName || ''}`.trim()}</span>
                      <button
                        className="px-2 py-1 text-xs bg-red-600 text-white rounded"
                        onClick={async () => {
                          const updated = { ...a, isHqmcAdmin: false }
                          try {
                            const res = await upsertUser({ id: updated.id, isHqmcAdmin: !!updated.isHqmcAdmin })
                            if (!res.ok) { setFeedback({ type: 'error', message: 'Failed to remove HQMC admin (DB error).' }); return }
                          } catch {}
                          setUsers(prev => prev.map(u => (u.id === updated.id ? updated as UserRecord : u)))
                          setFeedback({ type: 'success', message: `Removed HQMC admin: ${updated.lastName || ''}.` })
                        }}
                      >Remove</button>
                    </li>
                  ))}
                  {divisionAdmins.length === 0 && (<li className="text-sm text-gray-500">No HQMC admins for this division.</li>)}
                </ul>
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

