import React, { useEffect, useMemo, useState } from 'react'

interface Request {
  id: string
  subject: string
  dueDate?: string
  notes?: string
  unitUic: string
  uploadedById: string
  documentIds: string[]
  createdAt: string
  currentStage?: string
  activity?: Array<{ actor: string; timestamp: string; action: string; comment?: string }>
  routeSection?: string
}

interface DocumentItem {
  id: string
  name: string
  type: string
  size: number
  uploadedAt: string | Date
  subject: string
  requestId?: string
}

const ORIGINATOR_STAGE = 'ORIGINATOR_REVIEW'
const STAGES = ['PLATOON_REVIEW', 'COMPANY_REVIEW', 'BATTALION_REVIEW', 'COMMANDER_REVIEW', 'ARCHIVED']

const nextStage = (stage?: string) => {
  const i = STAGES.indexOf(stage || STAGES[0])
  return i >= 0 && i < STAGES.length - 1 ? STAGES[i + 1] : STAGES[i] || STAGES[0]
}

const prevStage = (stage?: string) => {
  const i = STAGES.indexOf(stage || STAGES[0])
  return i > 0 ? STAGES[i - 1] : STAGES[0]
}

const isReturned = (r: Request) => {
  const a = r.activity && r.activity.length ? r.activity[r.activity.length - 1] : null
  return !!a && /returned/i.test(String(a.action || ''))
}

export default function ReviewDashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [requests, setRequests] = useState<Request[]>([])
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [comments, setComments] = useState<Record<string, string>>({})
  const [users, setUsers] = useState<Record<string, any>>({})
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({})
  const [attach, setAttach] = useState<Record<string, File[]>>({})
  const [selectedSection, setSelectedSection] = useState<Record<string, string>>({})
  const [unitSections, setUnitSections] = useState<Record<string, string[]>>({})
  const [platoonSectionMap, setPlatoonSectionMap] = useState<Record<string, Record<string, Record<string, string>>>>({})

  useEffect(() => {
    try {
      const raw = localStorage.getItem('currentUser')
      if (raw) setCurrentUser(JSON.parse(raw))
    } catch {}
  }, [])

  useEffect(() => {
    try {
      const reqModules = import.meta.glob('../requests/*.json', { eager: true })
      const diskReqs: Request[] = Object.values(reqModules).map((m: any) => (m?.default ?? m) as Request)
      const lsReqs: Request[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('fs/requests/') && key.endsWith('.json')) {
          const raw = localStorage.getItem(key)
          if (raw) lsReqs.push(JSON.parse(raw))
        }
      }
      const byId = new Map<string, Request>()
      for (const r of diskReqs) byId.set(r.id, r)
      for (const r of lsReqs) byId.set(r.id, r)
      setRequests(Array.from(byId.values()))
    } catch {}
  }, [])

  useEffect(() => {
    try {
      const docModules = import.meta.glob('../documents/*.json', { eager: true })
      const diskDocs: DocumentItem[] = Object.values(docModules).map((m: any) => (m?.default ?? m) as DocumentItem)
      const lsDocs: DocumentItem[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('fs/documents/') && key.endsWith('.json')) {
          const raw = localStorage.getItem(key)
          if (raw) lsDocs.push(JSON.parse(raw))
        }
      }
      const byId = new Map<string, DocumentItem>()
      for (const d of diskDocs) byId.set(d.id, d)
      for (const d of lsDocs) byId.set(d.id, d)
      setDocuments(Array.from(byId.values()))
    } catch {}
  }, [])

  useEffect(() => {
    try {
      const userModules = import.meta.glob('../users/*.json', { eager: true })
      const diskUsers: any[] = Object.values(userModules).map((m: any) => m?.default ?? m)
      const map: Record<string, any> = {}
      for (const u of diskUsers) if (u?.id) map[u.id] = u
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('fs/users/') && key.endsWith('.json')) {
          const raw = localStorage.getItem(key)
          if (raw) {
            const u = JSON.parse(raw)
            if (u?.id) map[u.id] = u
          }
        }
      }
      setUsers(map)
    } catch {}
  }, [])

  useEffect(() => {
    try {
      const rawUs = localStorage.getItem('unit_structure')
      const secMap: Record<string, string[]> = {}
      const pMap: Record<string, Record<string, Record<string, string>>> = {}
      if (rawUs) {
        const parsed = JSON.parse(rawUs)
        for (const uic of Object.keys(parsed || {})) {
          const v = parsed[uic]
          if (v && Array.isArray(v._sections)) secMap[uic] = v._sections
          if (v && v._platoonSectionMap && typeof v._platoonSectionMap === 'object') pMap[uic] = v._platoonSectionMap
        }
      } else {
        const staticUSModules = import.meta.glob('../unit-structure/unit-structure.json', { eager: true })
        const merged: Record<string, any> = {}
        for (const mod of Object.values(staticUSModules)) {
          const data: any = (mod as any)?.default ?? mod
          Object.assign(merged, data)
        }
        for (const uic of Object.keys(merged || {})) {
          const v = merged[uic]
          if (v && Array.isArray(v._sections)) secMap[uic] = v._sections
          if (v && v._platoonSectionMap && typeof v._platoonSectionMap === 'object') pMap[uic] = v._platoonSectionMap
        }
      }
      setUnitSections(secMap)
      setPlatoonSectionMap(pMap)
    } catch {}
  }, [])

  const myStage = useMemo(() => {
    const role = String(currentUser?.role || '')
    if (role.includes('PLATOON')) return 'PLATOON_REVIEW'
    if (role.includes('COMPANY')) return 'COMPANY_REVIEW'
    if (role.includes('BATTALION')) return 'BATTALION_REVIEW'
    if (role.includes('COMMANDER')) return 'COMMANDER_REVIEW'
    return 'PLATOON_REVIEW'
  }, [currentUser])

  const originatorFor = (r: Request) => users[r.uploadedById] || null

  const pending = useMemo(() => {
    const inStage = requests.filter(r => (r.currentStage || 'PLATOON_REVIEW') === myStage)
    const role = String(currentUser?.role || '')
    const byScope = inStage.filter(r => {
      const o = originatorFor(r)
      if (!o) return false
      if (role.includes('PLATOON')) {
        const oc = (o.company && o.company !== 'N/A') ? o.company : ''
        const ou = (o.unit && o.unit !== 'N/A') ? o.unit : ''
        const cc = (currentUser?.company && currentUser.company !== 'N/A') ? currentUser.company : ''
        const cu = (currentUser?.unit && currentUser.unit !== 'N/A') ? currentUser.unit : ''
        return oc === cc && ou === cu
      }
      if (role.includes('COMPANY')) {
        const oc = (o.company && o.company !== 'N/A') ? o.company : ''
        const cc = (currentUser?.company && currentUser.company !== 'N/A') ? currentUser.company : ''
        return oc === cc
      }
      if (role.includes('BATTALION')) {
        const cuic = currentUser?.unitUic || ''
        const cc = (currentUser?.company && currentUser.company !== 'N/A') ? currentUser.company : ''
        const cu = (currentUser?.unit && currentUser.unit !== 'N/A') ? currentUser.unit : ''
        const linked = platoonSectionMap[cuic]?.[cc]?.[cu] || ''
        if (r.routeSection) {
          return linked ? (r.routeSection === linked) : true
        }
        return cuic ? (o.unitUic === cuic) : true
      }
      if (role.includes('COMMANDER')) {
        const ouic = o.unitUic || ''
        const cuic = currentUser?.unitUic || ''
        return cuic ? (ouic === cuic) : true
      }
      return true
    })
    return byScope
  }, [requests, myStage, currentUser, users])

  const docsFor = (reqId: string) => documents.filter(d => d.requestId === reqId)

  const updateRequest = async (r: Request, newStage: string, action: string) => {
    const actor = currentUser ? `${currentUser.rank} ${currentUser.lastName}, ${currentUser.firstName}${currentUser.mi ? ` ${currentUser.mi}` : ''}` : 'Reviewer'
    const entry = { actor, timestamp: new Date().toISOString(), action, comment: (comments[r.id] || '').trim() }
    const updated: Request = {
      ...r,
      currentStage: newStage,
      routeSection: (newStage === 'BATTALION_REVIEW' && selectedSection[r.id]) ? selectedSection[r.id] : r.routeSection,
      activity: Array.isArray(r.activity) ? [...r.activity, entry] : [entry]
    }
    try {
      localStorage.setItem(`fs/requests/${updated.id}.json`, JSON.stringify(updated))
      await fetch('/api/requests/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) })
    } catch {}
    setRequests(prev => prev.map(x => (x.id === updated.id ? updated : x)))
    setComments(prev => ({ ...prev, [r.id]: '' }))
  }

  const addFilesToRequest = async (r: Request) => {
    const files = attach[r.id] || []
    if (!files.length || !currentUser?.id) return
    const now = Date.now()
    const newDocs: DocumentItem[] = files.map((file, idx) => ({
      id: `${now}-${idx}`,
      name: file.name,
      type: file.type,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      subject: r.subject,
      requestId: r.id,
      // @ts-ignore
      fileUrl: URL.createObjectURL(file)
    })) as any

    const actor = currentUser ? `${currentUser.rank} ${currentUser.lastName}, ${currentUser.firstName}${currentUser.mi ? ` ${currentUser.mi}` : ''}` : 'Reviewer'
    const entry = { actor, timestamp: new Date().toISOString(), action: `Reviewer added ${newDocs.length} document(s)`, comment: (comments[r.id] || '').trim() }

    const updated: Request = {
      ...r,
      documentIds: [...(r.documentIds || []), ...newDocs.map(d => d.id)],
      activity: Array.isArray(r.activity) ? [...r.activity, entry] : [entry]
    }
    try {
      for (const d of newDocs) {
        const serializable = { ...d }
        localStorage.setItem(`fs/documents/${d.id}.json`, JSON.stringify(serializable))
        await fetch('/api/documents/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(serializable) })
      }
      localStorage.setItem(`fs/requests/${updated.id}.json`, JSON.stringify(updated))
      await fetch('/api/requests/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) })
    } catch {}
    setDocuments(prev => [...prev, ...newDocs])
    setRequests(prev => prev.map(x => (x.id === updated.id ? updated : x)))
    setAttach(prev => ({ ...prev, [r.id]: [] }))
    setComments(prev => ({ ...prev, [r.id]: '' }))
  }

  return (
    <div className="min-h-screen">
      <div className="bg-[var(--surface)] rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-[var(--text)]">Review Dashboard</h2>
          <span className="px-2 py-1 text-xs bg-brand-cream text-brand-navy rounded-full border border-brand-navy/30">{myStage}</span>
        </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {pending.map((r) => (
            <div key={r.id} className={`${isReturned(r) ? 'p-4 border border-brand-red-2 rounded-lg bg-brand-cream' : 'p-4 border border-brand-navy/20 rounded-lg bg-[var(--surface)]'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-[var(--text)]">{r.subject}</div>
                  <div className="text-sm text-[var(--muted)]">Submitted {new Date(r.createdAt).toLocaleString()}</div>
                  {r.dueDate && <div className="text-xs text-[var(--muted)]">Due {new Date(r.dueDate).toLocaleDateString()}</div>}
                  {originatorFor(r) && (
                    <div className="text-xs text-[var(--muted)] mt-1">
                      {originatorFor(r).rank} {originatorFor(r).lastName}{originatorFor(r).lastName ? ',' : ''} {originatorFor(r).firstName}{originatorFor(r).mi ? ` ${originatorFor(r).mi}` : ''}
                      {((originatorFor(r).company && originatorFor(r).company !== 'N/A') || (originatorFor(r).unit && originatorFor(r).unit !== 'N/A')) && (
                        <> • {[originatorFor(r).company && originatorFor(r).company !== 'N/A' ? originatorFor(r).company : null, originatorFor(r).unit && originatorFor(r).unit !== 'N/A' ? originatorFor(r).unit : null].filter(Boolean).join(' • ')}</>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 text-xs bg-brand-cream text-brand-navy rounded-full border border-brand-navy/30">{r.currentStage}</span>
                  {isReturned(r) && (
                    <span className="px-2 py-1 text-xs bg-brand-red-2 text-brand-cream rounded-full">Returned</span>
                  )}
                </div>
              </div>
              {String(currentUser?.role || '').includes('COMPANY') && (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text)] mb-1">Battalion Section</label>
                    <select
                      value={selectedSection[r.id] || ''}
                      onChange={(e) => setSelectedSection(prev => ({ ...prev, [r.id]: e.target.value }))}
                      className="w-full px-3 py-2 border border-brand-navy/30 rounded-lg"
                    >
                      <option value="">Select section</option>
                      {(unitSections[currentUser?.unitUic || ''] || []).map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  {r.routeSection && (
                    <div className="text-sm text-[var(--muted)] md:self-end">Previously routed to: {r.routeSection}</div>
                  )}
                </div>
              )}
              <div className="mt-3 space-y-2">
                {docsFor(r.id).map(d => (
                  <div key={d.id} className="flex items-center justify-between p-3 border border-brand-navy/20 rounded-lg bg-[var(--surface)]">
                    <div className="text-sm text-[var(--muted)]">
                      <div className="font-medium text-[var(--text)]">{d.name}</div>
                      <div>{new Date(d.uploadedAt as any).toLocaleDateString()}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      { (d as any).fileUrl ? (
                        <a href={(d as any).fileUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1 text-xs bg-brand-cream text-brand-navy rounded hover:bg-brand-gold-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold">Open</a>
                      ) : (
                        <span className="px-3 py-1 text-xs bg-brand-cream text-brand-navy rounded opacity-60" aria-disabled="true">Open</span>
                      )}
                    </div>
                  </div>
                ))}
                {docsFor(r.id).length === 0 && (
                  <div className="text-sm text-[var(--muted)]">No documents</div>
                )}
              </div>
              <div className="mt-3">
                <button
                  className="px-3 py-1 text-xs rounded bg-brand-navy text-brand-cream hover:bg-brand-red-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold"
                  onClick={() => setExpandedLogs(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
                  aria-expanded={!!expandedLogs[r.id]}
                  aria-controls={`logs-${r.id}`}
                >
                  {expandedLogs[r.id] ? 'Hide' : 'Show'} Activity Log
                </button>
                <div id={`logs-${r.id}`} className={expandedLogs[r.id] ? 'mt-2 space-y-2' : 'hidden'}>
                  {r.activity && r.activity.length ? (
                    r.activity.map((a, idx) => (
                      <div key={idx} className="text-xs text-gray-700">
                        <div className="font-medium">{a.actor} • {new Date(a.timestamp).toLocaleString()} • {a.action}</div>
                        {a.comment && <div className="text-gray-600">{a.comment}</div>}
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-gray-500">No activity</div>
                  )}
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-sm font-medium text-[var(--text)] mb-1">Reviewer Comment</label>
                <textarea
                  rows={2}
                  value={comments[r.id] || ''}
                  onChange={(e) => setComments(prev => ({ ...prev, [r.id]: e.target.value }))}
                  className="w-full px-3 py-2 border border-brand-navy/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold"
                  placeholder="Optional notes"
                />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <label className="bg-brand-navy text-brand-cream px-3 py-1 rounded hover:bg-brand-red-2 cursor-pointer inline-block">
                  <input
                    type="file"
                    multiple
                    onChange={(e) => setAttach(prev => ({ ...prev, [r.id]: e.target.files ? Array.from(e.target.files) : [] }))}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                  />
                  Add Files
                </label>
                <span className="text-xs text-[var(--muted)]">{(attach[r.id] || []).length ? `${(attach[r.id] || []).length} file(s) selected` : 'No files selected'}</span>
                <button
                  className="px-3 py-1 text-xs bg-brand-gold text-brand-charcoal rounded hover:bg-brand-gold-2"
                  onClick={() => addFilesToRequest(r)}
                  disabled={!attach[r.id] || !(attach[r.id] || []).length}
                >
                  Save Files
                </button>
              </div>
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  className="px-3 py-2 rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold"
                  onClick={() => {
                    const role = String(currentUser?.role || '')
                    if (role.includes('COMPANY')) {
                      if (!selectedSection[r.id]) return
                      updateRequest(r, 'BATTALION_REVIEW', `Approved and routed to ${selectedSection[r.id]}`)
                    } else {
                      updateRequest(r, nextStage(r.currentStage), 'Approved')
                    }
                  }}
                  disabled={String(currentUser?.role || '').includes('COMPANY') && !selectedSection[r.id]}
                >
                  Approve
                </button>
                <button
                  className="px-3 py-2 rounded bg-brand-navy text-brand-cream hover:bg-brand-red-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold"
                  onClick={() => updateRequest(r, (r.currentStage === 'PLATOON_REVIEW' ? ORIGINATOR_STAGE : prevStage(r.currentStage)), (r.currentStage === 'PLATOON_REVIEW' ? 'Returned to originator for revision' : 'Returned to previous stage'))}
                >
                  Return
                </button>
              </div>
            </div>
          ))}
        </div>
        {pending.length === 0 && (
          <div className="text-sm text-[var(--muted)]">No requests in your stage.</div>
        )}
      </div>
    </div>
  )
}
