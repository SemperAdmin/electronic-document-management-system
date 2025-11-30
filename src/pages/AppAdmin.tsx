import React, { useEffect, useMemo, useState } from 'react'
import { UNITS, Unit } from '../lib/units'

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
}

export default function AppAdmin() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [assignMap, setAssignMap] = useState<Record<string, string>>({})

  useEffect(() => {
    try {
      const collected: UserProfile[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('fs/users/') && key.endsWith('.json')) {
          const rawU = localStorage.getItem(key)
          if (rawU) collected.push(JSON.parse(rawU))
        }
      }
      const staticUserModules = import.meta.glob('../users/*.json', { eager: true })
      const staticUsers: UserProfile[] = Object.values(staticUserModules).map((m: any) => (m?.default ?? m) as UserProfile)
      const map = new Map<string, UserProfile>()
      for (const u of staticUsers) map.set(u.id, u)
      for (const u of collected) map.set(u.id, u)
      setUsers(Array.from(map.values()))
    } catch {}
  }, [])

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
      localStorage.setItem(`fs/users/${updated.id}.json`, JSON.stringify(updated))
    } catch {}
    try {
      await fetch('/api/users/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) })
    } catch {}
    setUsers(prev => prev.map(u => (u.id === updated.id ? updated : u)))
    setFeedback({ type: 'success', message: `Assigned ${updated.rank} ${updated.lastName} as admin for ${unit.unitName}.` })
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">App Administration</h2>
      <p className="text-sm text-gray-600 mb-6">Manage Unit Admin assignments across all units.</p>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 px-3">Unit</th>
              <th className="py-2 px-3">UIC</th>
              <th className="py-2 px-3">Current Admin</th>
              <th className="py-2 px-3">Assign</th>
              <th className="py-2 px-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {UNITS.map(unit => {
              const admin = unitAdmins[unit.uic]
              const eligible = eligibleForUnit(unit)
              return (
                <tr key={unit.uic} className="border-b">
                  <td className="py-2 px-3">{unit.unitName}</td>
                  <td className="py-2 px-3">{unit.uic}</td>
                  <td className="py-2 px-3">{admin ? `${admin.rank} ${admin.lastName}, ${admin.firstName}${admin.mi ? ` ${admin.mi}` : ''}` : '—'}</td>
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
          </tbody>
        </table>
      </div>

      {feedback && (
        <div className={`mt-4 p-3 rounded-lg border ${feedback.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>{feedback.message}</div>
      )}
    </div>
  )
}
