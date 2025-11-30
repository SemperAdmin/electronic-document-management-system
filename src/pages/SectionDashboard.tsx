import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface UserProfile {
  id: string
  firstName: string
  lastName: string
  mi?: string
  rank: string
  company: string
  unit: string
  unitUic?: string
}

interface RequestActivity {
  actor: string
  timestamp: string
  action: string
  comment?: string
}

interface Request {
  id: string
  subject: string
  notes?: string
  unitUic?: string
  uploadedById: string
  documentIds: string[]
  createdAt: string
  currentStage?: string
  routeSection?: string
  activity?: RequestActivity[]
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

export default function SectionDashboard() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [requests, setRequests] = useState<Request[]>([])
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [usersById, setUsersById] = useState<Record<string, UserProfile>>({})
  const [platoonSectionMap, setPlatoonSectionMap] = useState<Record<string, Record<string, Record<string, string>>>>({})
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({})
  const [dashOpen, setDashOpen] = useState(false)
  const [hasSectionDashboard, setHasSectionDashboard] = useState(false)
  const [unitSections, setUnitSections] = useState<Record<string, string[]>>({})
  const [selectedBattalionSection, setSelectedBattalionSection] = useState<string>('')
  const [comments, setComments] = useState<Record<string, string>>({})
  const [attach, setAttach] = useState<Record<string, File[]>>({})
  const [commandSections, setCommandSections] = useState<Record<string, string[]>>({})
  const [selectedCmdSection, setSelectedCmdSection] = useState<Record<string, string>>({})
  const navigate = useNavigate()

  useEffect(() => {
    try {
      const raw = localStorage.getItem('currentUser')
      if (raw) setCurrentUser(JSON.parse(raw))
    } catch {}
  }, [])

  useEffect(() => {
    try {
      const uic = currentUser?.unitUic || ''
      const c = (currentUser?.company && currentUser.company !== 'N/A') ? currentUser.company : ''
      const p = (currentUser?.unit && currentUser.unit !== 'N/A') ? currentUser.unit : ''
      const linked = platoonSectionMap[uic]?.[c]?.[p] || ''
      setSelectedBattalionSection(linked)
    } catch {}
  }, [currentUser, platoonSectionMap])

  useEffect(() => {
    try {
      const rawUS = localStorage.getItem('unit_structure')
      if (!currentUser || !rawUS) { setHasSectionDashboard(false); return }
      const us = JSON.parse(rawUS)
      const uic = currentUser?.unitUic || ''
      const c = (currentUser?.company && currentUser.company !== 'N/A') ? currentUser.company : ''
      const p = (currentUser?.unit && currentUser.unit !== 'N/A') ? currentUser.unit : ''
      const linked = us?.[uic]?._platoonSectionMap?.[c]?.[p] || ''
      setHasSectionDashboard(!!linked)
    } catch {
      setHasSectionDashboard(false)
    }
  }, [currentUser])

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
      const byId: Record<string, UserProfile> = {}
      for (const u of staticUsers) byId[u.id] = u
      for (const u of collected) byId[u.id] = u
      setUsersById(byId)
    } catch {}
  }, [])

  useEffect(() => {
    try {
      const rawUs = localStorage.getItem('unit_structure')
      const pMap: Record<string, Record<string, Record<string, string>>> = {}
      const secMap: Record<string, string[]> = {}
      const cmdMap: Record<string, string[]> = {}
      if (rawUs) {
        const parsed = JSON.parse(rawUs)
        for (const uic of Object.keys(parsed || {})) {
          const v = parsed[uic]
          if (v && v._platoonSectionMap && typeof v._platoonSectionMap === 'object') pMap[uic] = v._platoonSectionMap
          if (v && Array.isArray(v._sections)) secMap[uic] = v._sections
          if (v && Array.isArray(v._commandSections)) cmdMap[uic] = v._commandSections
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
          if (v && v._platoonSectionMap && typeof v._platoonSectionMap === 'object') pMap[uic] = v._platoonSectionMap
          if (v && Array.isArray(v._sections)) secMap[uic] = v._sections
          if (v && Array.isArray(v._commandSections)) cmdMap[uic] = v._commandSections
        }
      }
      setPlatoonSectionMap(pMap)
      setUnitSections(secMap)
      setCommandSections(cmdMap)
    } catch {}
  }, [])

  const sectionRouted = useMemo(() => {
    const cuic = currentUser?.unitUic || ''
    return requests.filter(r => {
      const ouic = r.unitUic || ''
      const section = battalionSectionFor(r)
      return (!!section) && (cuic ? ouic === cuic : true)
    })
  }, [requests, currentUser])

  const visibleRequests = useMemo(() => {
    return sectionRouted.filter(r => {
      const sec = battalionSectionFor(r)
      return selectedBattalionSection ? sec === selectedBattalionSection : true
    })
  }, [sectionRouted, selectedBattalionSection])

  const pendingInSection = useMemo(() => {
    return visibleRequests.filter(r => (r.currentStage || '') === 'BATTALION_REVIEW')
  }, [visibleRequests])

  const previousInSection = useMemo(() => {
    return visibleRequests.filter(r => (r.currentStage || '') !== 'BATTALION_REVIEW')
  }, [visibleRequests])

  function battalionSectionFor(r: Request) {
    if (r.routeSection) return r.routeSection
    const ouic = r.unitUic || ''
    const originator = usersById[r.uploadedById]
    const oc = (originator?.company && originator.company !== 'N/A') ? originator.company : ''
    const ou = (originator?.unit && originator.unit !== 'N/A') ? originator.unit : ''
    return platoonSectionMap[ouic]?.[oc]?.[ou] || ''
  }

  const originatorName = (r: Request) => {
    const u = usersById[r.uploadedById]
    if (!u) return '—'
    const parts = [u.rank, u.lastName + ',', u.firstName, u.mi ? u.mi : ''].filter(Boolean)
    return parts.join(' ').trim()
  }

  const approvalInfo = (r: Request) => {
    const acts = Array.isArray(r.activity) ? r.activity : []
    const lastApproved = [...acts].reverse().find(a => a.action === 'Approved')
    return lastApproved ? new Date(lastApproved.timestamp).toLocaleString() : ''
  }

  const docsFor = (reqId: string) => documents.filter(d => d.requestId === reqId)

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
    })) as any
    const actor = `${currentUser.rank} ${currentUser.lastName}, ${currentUser.firstName}${currentUser.mi ? ` ${currentUser.mi}` : ''}`
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

  const approveRequest = async (r: Request) => {
    const dest = selectedCmdSection[r.id] || 'COMMANDER'
    const actor = currentUser ? `${currentUser.rank} ${currentUser.lastName}, ${currentUser.firstName}${currentUser.mi ? ` ${currentUser.mi}` : ''}` : 'Reviewer'
    const actionText = dest === 'COMMANDER' ? 'Approved to COMMANDER' : `Approved and routed to ${dest}`
    const entry = { actor, timestamp: new Date().toISOString(), action: actionText, comment: (comments[r.id] || '').trim() }
    const updated: Request = {
      ...r,
      currentStage: 'COMMANDER_REVIEW',
      routeSection: dest === 'COMMANDER' ? r.routeSection : dest,
      activity: Array.isArray(r.activity) ? [...r.activity, entry] : [entry]
    }
    try {
      localStorage.setItem(`fs/requests/${updated.id}.json`, JSON.stringify(updated))
      await fetch('/api/requests/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) })
    } catch {}
    setRequests(prev => prev.map(x => (x.id === updated.id ? updated : x)))
    setComments(prev => ({ ...prev, [r.id]: '' }))
  }

  const rejectRequest = async (r: Request) => {
    const actor = currentUser ? `${currentUser.rank} ${currentUser.lastName}, ${currentUser.firstName}${currentUser.mi ? ` ${currentUser.mi}` : ''}` : 'Reviewer'
    const entry = { actor, timestamp: new Date().toISOString(), action: 'Returned to previous stage', comment: (comments[r.id] || '').trim() }
    const updated: Request = {
      ...r,
      currentStage: 'COMPANY_REVIEW',
      activity: Array.isArray(r.activity) ? [...r.activity, entry] : [entry]
    }
    try {
      localStorage.setItem(`fs/requests/${updated.id}.json`, JSON.stringify(updated))
      await fetch('/api/requests/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) })
    } catch {}
    setRequests(prev => prev.map(x => (x.id === updated.id ? updated : x)))
    setComments(prev => ({ ...prev, [r.id]: '' }))
  }

  const renderCard = (r: Request) => {
    const section = battalionSectionFor(r)
    const isReturned = false
    return (
      <div key={r.id} className={`${isReturned ? 'p-4 border border-brand-red-2 rounded-lg bg-brand-cream' : 'p-4 border border-brand-navy/20 rounded-lg bg-[var(--surface)]'}`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="font-medium text-[var(--text)]">{r.subject}</div>
            <div className="text-sm text-[var(--muted)]">Submitted {new Date(r.createdAt).toLocaleString()}</div>
            <div className="text-xs text-[var(--muted)]">Stage {r.currentStage || 'PLATOON_REVIEW'}</div>
            <div className="text-xs text-[var(--muted)] mt-1">{originatorName(r)}</div>
          </div>
          <div className="text-right">
            <div className="text-sm">Battalion Section</div>
            <div className="font-semibold">{section || '—'}</div>
            {r.routeSection && (
              <div className="text-xs text-[var(--muted)] mt-1">Routed: {r.routeSection}</div>
            )}
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {docsFor(r.id).map(d => (
            <div key={d.id} className="flex items-center justify-between p-3 border border-brand-navy/20 rounded-lg bg-[var(--surface)]">
              <div className="text-sm text-[var(--muted)]">
                <div className="font-medium text-[var(--text)]">{d.name}</div>
                <div>{new Date(d.uploadedAt as any).toLocaleDateString()}</div>
              </div>
              <div className="flex items-center gap-2">
                {(d as any).fileUrl ? (
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
          <div className="flex items-center gap-2 mr-auto">
            <select
              aria-label="Command Route"
              value={selectedCmdSection[r.id] || ''}
              onChange={(e) => setSelectedCmdSection(prev => ({ ...prev, [r.id]: e.target.value }))}
              className="px-3 py-2 border border-brand-navy/30 rounded-lg"
            >
              <option value="">COMMANDER</option>
              {(commandSections[currentUser?.unitUic || ''] || []).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <button
            className="px-3 py-2 rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold"
            onClick={() => approveRequest(r)}
          >
            Approve
          </button>
          <button
            className="px-3 py-2 rounded bg-brand-navy text-brand-cream hover:bg-brand-red-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold"
            onClick={() => rejectRequest(r)}
          >
            Return
          </button>
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
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-[var(--surface)] rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-[var(--text)]">Battalion Section Dashboard</h2>
          <span className="px-2 py-1 text-xs bg-brand-cream text-brand-navy rounded-full border border-brand-navy/30">{selectedBattalionSection || '—'}</span>
        </div>
        <div className="space-y-8">
          <div>
            <h3 className="text-lg font-semibold text-[var(--text)] mb-3">Pending in Section</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {pendingInSection.map(r => renderCard(r))}
            </div>
            {pendingInSection.length === 0 && (
              <div className="text-sm text-[var(--muted)]">No pending requests in this section.</div>
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[var(--text)] mb-3">Previously in Section</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {previousInSection.map(r => renderCard(r))}
            </div>
            {previousInSection.length === 0 && (
              <div className="text-sm text-[var(--muted)]">No historical requests for this section.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
