import React, { useEffect, useMemo, useRef, useState } from 'react'
import { loadUnitStructureFromBundle } from '@/lib/unitStructure'
import { listRequests, listDocuments, listUsers, upsertRequest, upsertDocuments } from '@/lib/db'

interface Request {
  id: string
  subject: string
  notes?: string
  unitUic?: string
  uploadedById: string
  submitForUserId?: string
  documentIds: string[]
  createdAt: string
  currentStage?: string
  activity?: Array<{ actor: string; timestamp: string; action: string; comment?: string }>
  routeSection?: string
  commanderApprovalDate?: string
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

export default function CommandDashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [requests, setRequests] = useState<Request[]>([])
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [users, setUsers] = useState<Record<string, any>>({})
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({})
  const [commandSections, setCommandSections] = useState<string[]>([])
  const [comments, setComments] = useState<Record<string, string>>({})
  const [attach, setAttach] = useState<Record<string, File[]>>({})
  const [expandedDocs, setExpandedDocs] = useState<Record<string, boolean>>({})
  const [openDocsId, setOpenDocsId] = useState<string | null>(null)
  const docsRef = useRef<HTMLDivElement | null>(null)
  const [platoonSectionMap, setPlatoonSectionMap] = useState<Record<string, Record<string, Record<string, string>>>>({})

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (openDocsId && docsRef.current && !docsRef.current.contains(e.target as Node)) {
        setExpandedDocs(prev => ({ ...prev, [openDocsId]: false }))
        setOpenDocsId(null)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && openDocsId) {
        setExpandedDocs(prev => ({ ...prev, [openDocsId]: false }))
        setOpenDocsId(null)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [openDocsId])
  const [expandedCard, setExpandedCard] = useState<Record<string, boolean>>({})

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

  useEffect(() => {
    try {
      const raw = localStorage.getItem('currentUser')
      if (raw) setCurrentUser(JSON.parse(raw))
    } catch {}
  }, [])

  useEffect(() => {
    listRequests().then((remote) => {
      setRequests(remote as any)
    }).catch(() => setRequests([]))
  }, [])

  useEffect(() => {
    listDocuments().then((remote) => {
      setDocuments(remote as any)
    }).catch(() => setDocuments([]))
  }, [])

  useEffect(() => {
    listUsers().then((remote) => {
      const map: Record<string, any> = {}
      for (const u of (remote as any)) if (u?.id) map[u.id] = u
      setUsers(map)
    }).catch(() => setUsers({}))
  }, [])

  useEffect(() => {
    try {
      const rawUs = localStorage.getItem('unit_structure')
      const sec: string[] = []
      const pMap: Record<string, Record<string, Record<string, string>>> = {}
      if (rawUs) {
        const parsed = JSON.parse(rawUs)
        const uic = currentUser?.unitUic || ''
        const v = parsed?.[uic]
        if (v && Array.isArray(v._commandSections)) sec.push(...v._commandSections)
        for (const key of Object.keys(parsed || {})) {
          const node = parsed[key]
          if (node && node._platoonSectionMap && typeof node._platoonSectionMap === 'object') pMap[key] = node._platoonSectionMap
        }
      } else {
        ;(async () => {
          try {
            const merged = await loadUnitStructureFromBundle()
            const uic = currentUser?.unitUic || ''
            const v = (merged as any)?.[uic]
            if (v && Array.isArray(v._commandSections)) sec.push(...v._commandSections)
            for (const key of Object.keys(merged || {})) {
              const node = (merged as any)[key]
              if (node && node._platoonSectionMap && typeof node._platoonSectionMap === 'object') pMap[key] = node._platoonSectionMap
            }
          } catch {}
        })()
      }
      setCommandSections(sec)
      setPlatoonSectionMap(pMap)
    } catch {}
  }, [currentUser])

  const docsFor = (reqId: string) => documents.filter(d => d.requestId === reqId)
  const originatorFor = (r: Request) => users[r.uploadedById] || null

  const battalionSectionFor = (r: Request) => {
    if (r.routeSection) return r.routeSection
    const ouic = r.unitUic || ''
    const o = originatorFor(r)
    const oc = (o?.company && o.company !== 'N/A') ? o.company : ''
    const ou = (o?.unit && o.unit !== 'N/A') ? o.unit : ''
    return platoonSectionMap[ouic]?.[oc]?.[ou] || ''
  }

  const inCommander = useMemo(() => {
    const cuic = currentUser?.unitUic || ''
    return requests.filter(r => {
      const stage = r.currentStage || ''
      const ouic = r.unitUic || ''
      return stage === 'COMMANDER_REVIEW' && (!r.routeSection || r.routeSection === '') && (cuic ? ouic === cuic : true)
    })
  }, [requests, currentUser])

  const byCommandSection = useMemo(() => {
    const cuic = currentUser?.unitUic || ''
    const result: Record<string, Request[]> = {}
    for (const name of commandSections) result[name] = []
    for (const r of requests) {
      const stage = r.currentStage || ''
      const ouic = r.unitUic || ''
      const name = r.routeSection || ''
      if (stage === 'COMMANDER_REVIEW' && name && (cuic ? ouic === cuic : true) && commandSections.includes(name)) {
        result[name] = result[name] || []
        result[name].push(r)
      }
    }
    return result
  }, [requests, currentUser, commandSections])

  const isReturned = (r: Request) => {
    const a = r.activity && r.activity.length ? r.activity[r.activity.length - 1] : null
    return !!a && /returned/i.test(String(a.action || ''))
  }

  const formatCsvCell = (v: any) => {
    const s = String(v ?? '')
    const escaped = s.replace(/"/g, '""')
    return `"${escaped}"`
  }
  const buildRows = (list: Request[]) => {
    const headers = ['Request ID','Subject','Stage','Route Section','Originator','Unit UIC','Created At','Documents']
    const rows = [headers]
    for (const r of list) {
      const o = originatorFor(r)
      const origin = o ? `${o.rank} ${o.lastName}, ${o.firstName}${o.mi ? ` ${o.mi}` : ''}` : ''
      const docs = docsFor(r.id).map(d => d.name).join(' | ')
      rows.push([
        r.id,
        r.subject,
        r.currentStage || '',
        r.routeSection || '',
        origin,
        r.unitUic || '',
        new Date(r.createdAt).toLocaleString(),
        docs
      ])
    }
    return rows.map(row => row.map(formatCsvCell).join(',')).join('\r\n')
  }
  const downloadCsv = (filename: string, csv: string) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  const exportCommander = () => downloadCsv('commander.csv', buildRows(inCommander))
  const exportSection = (name: string) => downloadCsv(`${name}.csv`, buildRows(byCommandSection[name] || []))
  const exportAll = () => downloadCsv('command_all.csv', buildRows([...inCommander, ...commandSections.flatMap(n => byCommandSection[n] || [])]))

  const updateRequest = async (r: Request, newStage: string, action: string) => {
    const actor = currentUser ? `${currentUser.rank} ${currentUser.lastName}, ${currentUser.firstName}${currentUser.mi ? ` ${currentUser.mi}` : ''}` : 'Reviewer'
    const entry = { actor, timestamp: new Date().toISOString(), action, comment: (comments[r.id] || '').trim() }
    const updated: Request = {
      ...r,
      currentStage: newStage,
      activity: Array.isArray(r.activity) ? [...r.activity, entry] : [entry]
    }
    try {
      await upsertRequest(updated as any)
    } catch {}
    setRequests(prev => prev.map(x => (x.id === updated.id ? updated : x)))
    setComments(prev => ({ ...prev, [r.id]: '' }))
  }

  const approveToCommander = async (r: Request) => {
    const actor = currentUser ? `${currentUser.rank} ${currentUser.lastName}, ${currentUser.firstName}${currentUser.mi ? ` ${currentUser.mi}` : ''}` : 'Reviewer'
    const entry = { actor, timestamp: new Date().toISOString(), action: 'Approved and routed to COMMANDER', comment: (comments[r.id] || '').trim() }
    const updated: Request = {
      ...r,
      currentStage: 'COMMANDER_REVIEW',
      routeSection: '',
      activity: Array.isArray(r.activity) ? [...r.activity, entry] : [entry]
    }
    try {
      await upsertRequest(updated as any)
    } catch {}
    setRequests(prev => prev.map(x => (x.id === updated.id ? updated : x)))
    setComments(prev => ({ ...prev, [r.id]: '' }))
  }

  const commanderDecision = async (r: Request, type: 'Approved' | 'Endorsed' | 'Rejected') => {
    const actor = currentUser ? `${currentUser.rank} ${currentUser.lastName}, ${currentUser.firstName}${currentUser.mi ? ` ${currentUser.mi}` : ''}` : 'Commander'
    const dest = battalionSectionFor(r)
    const actionText = type === 'Approved' ? 'Approved by Commander'
      : type === 'Endorsed' ? 'Endorsed by Commander'
      : 'Rejected by Commander — requires action'
    const updated: Request = {
      ...r,
      currentStage: 'BATTALION_REVIEW',
      routeSection: dest || r.routeSection || '',
      commanderApprovalDate: type === 'Approved' ? new Date().toISOString() : r.commanderApprovalDate,
      activity: Array.isArray(r.activity) ? [...r.activity, { actor, timestamp: new Date().toISOString(), action: actionText, comment: (comments[r.id] || '').trim() }] : [{ actor, timestamp: new Date().toISOString(), action: actionText, comment: (comments[r.id] || '').trim() }]
    }
    try {
      await upsertRequest(updated as any)
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
      await upsertDocuments(newDocs as any)
      await upsertRequest(updated as any)
    } catch {}
    setDocuments(prev => [...prev, ...newDocs])
    setRequests(prev => prev.map(x => (x.id === updated.id ? updated : x)))
    setAttach(prev => ({ ...prev, [r.id]: [] }))
    setComments(prev => ({ ...prev, [r.id]: '' }))
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-[var(--surface)] rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-[var(--text)]">Command Sections Dashboard</h2>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 text-xs bg-brand-cream text-brand-navy rounded-full border border-brand-navy/30">{currentUser?.unitUic || ''}</span>
            <button className="px-3 py-1 text-xs rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2" onClick={exportAll}>Export All</button>
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <div className="flex items-center justify-between mb-3"><h3 className="text-lg font-semibold text-[var(--text)]">Commander</h3><button className="px-3 py-1 text-xs rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2" onClick={exportCommander}>Export Commander</button></div>
            <div className="flex flex-col gap-4">
              {inCommander.map((r) => (
                <div key={r.id} className={`${isReturned(r) ? 'p-4 border border-brand-red-2 rounded-lg bg-brand-cream' : 'p-4 border border-brand-navy/20 rounded-lg bg-[var(--surface)]'} transition-all duration-300`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-[var(--text)]">{r.subject}</div>
                      <div className="text-sm text-[var(--muted)]">Submitted {new Date(r.createdAt).toLocaleString()}</div>
                      {originatorFor(r) && (
                        <div className="text-xs text-[var(--muted)] mt-1">
                          {originatorFor(r).rank} {originatorFor(r).lastName}{originatorFor(r).lastName ? ',' : ''} {originatorFor(r).firstName}{originatorFor(r).mi ? ` ${originatorFor(r).mi}` : ''}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 text-xs bg-brand-cream text-brand-navy rounded-full border border-brand-navy/30">{r.currentStage}</span>
                      {isReturned(r) && (
                        <span className="px-2 py-1 text-xs bg-brand-red-2 text-brand-cream rounded-full">Returned</span>
                      )}
                      <button
                        className="px-3 py-1 text-xs rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2"
                        onClick={() => setExpandedCard(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
                        aria-expanded={!!expandedCard[r.id]}
                        aria-controls={`details-cmd-${r.id}`}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedCard(prev => ({ ...prev, [r.id]: !prev[r.id] })) } }}
                      >
                        {expandedCard[r.id] ? 'Hide Details' : 'Edit / Details'}
                      </button>
                    </div>
                  </div>
                  <div id={`details-cmd-${r.id}`} className={expandedCard[r.id] ? '' : 'hidden'}>
                  <div className="mt-3">
                    <button
                      className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2"
                      aria-expanded={!!expandedDocs[r.id]}
                      aria-controls={`docs-cmd-${r.id}`}
                      onClick={() => { setExpandedDocs(prev => ({ ...prev, [r.id]: !prev[r.id] })); setOpenDocsId(prev => (!expandedDocs[r.id] ? r.id : null)) }}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedDocs(prev => ({ ...prev, [r.id]: !prev[r.id] })); setOpenDocsId(prev => (!expandedDocs[r.id] ? r.id : null)) } }}
                    >
                      <span>Show Documents</span>
                      <svg width="10" height="10" viewBox="0 0 20 20" className={`transition-transform ${expandedDocs[r.id] ? 'rotate-180' : 'rotate-0'}`} aria-hidden="true"><path d="M5 7l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
                    </button>
                  </div>
                  <div
                    id={`docs-cmd-${r.id}`}
                    ref={expandedDocs[r.id] ? docsRef : undefined}
                    className={`${expandedDocs[r.id] ? 'mt-2 space-y-2 overflow-hidden transition-all duration-300 max-h-[50vh] opacity-100' : 'mt-2 space-y-2 overflow-hidden transition-all duration-300 max-h-0 opacity-0'}`}
                  >
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
                    <button
                      className="px-3 py-2 rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold"
                      onClick={() => commanderDecision(r, 'Approved')}
                    >
                      Approved
                    </button>
                    <button
                      className="px-3 py-2 rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold"
                      onClick={() => commanderDecision(r, 'Endorsed')}
                    >
                      Endorsed
                    </button>
                    <button
                      className="px-3 py-2 rounded bg-brand-navy text-brand-cream hover:bg-brand-red-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold"
                      onClick={() => commanderDecision(r, 'Rejected')}
                    >
                      Rejected
                    </button>
                  </div>
                  <div className="mt-3">
                    <button
                      className="px-3 py-1 text-xs rounded bg-brand-navy text-brand-cream hover:bg-brand-red-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold"
                      onClick={() => setExpandedLogs(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
                      aria-expanded={!!expandedLogs[r.id]}
                      aria-controls={`logs-cmd-${r.id}`}
                    >
                      {expandedLogs[r.id] ? 'Hide' : 'Show'} Activity Log
                    </button>
                    <div id={`logs-cmd-${r.id}`} className={expandedLogs[r.id] ? 'mt-2 space-y-2' : 'hidden'}>
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
                </div>
              ))}
            </div>
            {inCommander.length === 0 && (
              <div className="text-sm text-[var(--muted)]">No requests for Commander.</div>
            )}
          </div>

          {commandSections.map((name) => (
            <div key={name}>
              <div className="flex items-center justify-between mb-3"><h3 className="text-lg font-semibold text-[var(--text)]">{name}</h3><button className="px-3 py-1 text-xs rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2" onClick={() => exportSection(name)}>Export {name}</button></div>
              <div className="flex flex-col gap-4">
                {(byCommandSection[name] || []).map((r) => (
                  <div key={r.id} className={`${isReturned(r) ? 'p-4 border border-brand-red-2 rounded-lg bg-brand-cream' : 'p-4 border border-brand-navy/20 rounded-lg bg-[var(--surface)]'} transition-all duration-300`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-[var(--text)]">{r.subject}</div>
                        <div className="text-sm text-[var(--muted)]">Submitted {new Date(r.createdAt).toLocaleString()}</div>
                        {originatorFor(r) && (
                          <div className="text-xs text-[var(--muted)] mt-1">
                            {originatorFor(r).rank} {originatorFor(r).lastName}{originatorFor(r).lastName ? ',' : ''} {originatorFor(r).firstName}{originatorFor(r).mi ? ` ${originatorFor(r).mi}` : ''}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 text-xs bg-brand-cream text-brand-navy rounded-full border border-brand-navy/30">{r.currentStage}</span>
                        {isReturned(r) && (
                          <span className="px-2 py-1 text-xs bg-brand-red-2 text-brand-cream rounded-full">Returned</span>
                        )}
                        <button
                          className="px-3 py-1 text-xs rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2"
                          onClick={() => setExpandedCard(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
                          aria-expanded={!!expandedCard[r.id]}
                          aria-controls={`details-csec-${r.id}`}
                        >
                          {expandedCard[r.id] ? 'Hide Details' : 'Edit / Details'}
                        </button>
                      </div>
                    </div>
                    <div id={`details-csec-${r.id}`} className={expandedCard[r.id] ? '' : 'hidden'}>
                    <div className="mt-3">
                      <button
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2"
                        aria-expanded={!!expandedDocs[r.id]}
                        aria-controls={`docs-csec-${r.id}`}
                        onClick={() => { setExpandedDocs(prev => ({ ...prev, [r.id]: !prev[r.id] })); setOpenDocsId(prev => (!expandedDocs[r.id] ? r.id : null)) }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedDocs(prev => ({ ...prev, [r.id]: !prev[r.id] })); setOpenDocsId(prev => (!expandedDocs[r.id] ? r.id : null)) } }}
                      >
                        <span>Show Documents</span>
                        <svg width="10" height="10" viewBox="0 0 20 20" className={`transition-transform ${expandedDocs[r.id] ? 'rotate-180' : 'rotate-0'}`} aria-hidden="true"><path d="M5 7l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
                      </button>
                    </div>
                    <div
                      id={`docs-csec-${r.id}`}
                      ref={expandedDocs[r.id] ? docsRef : undefined}
                      className={`${expandedDocs[r.id] ? 'mt-2 space-y-2 overflow-hidden transition-all duration-300 max-h-[50vh] opacity-100' : 'mt-2 space-y-2 overflow-hidden transition-all duration-300 max-h-0 opacity-0'}`}
                    >
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
                      <button
                        className="px-3 py-1 text-xs rounded bg-brand-navy text-brand-cream hover:bg-brand-red-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold"
                        onClick={() => setExpandedLogs(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
                        aria-expanded={!!expandedLogs[r.id]}
                        aria-controls={`logs-csec-${r.id}`}
                      >
                        {expandedLogs[r.id] ? 'Hide' : 'Show'} Activity Log
                      </button>
                      <div id={`logs-csec-${r.id}`} className={expandedLogs[r.id] ? 'mt-2 space-y-2' : 'hidden'}>
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
                        onClick={() => approveToCommander(r)}
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
                    <div className="mt-3">
                      <button
                        className="px-3 py-1 text-xs rounded bg-brand-navy text-brand-cream hover:bg-brand-red-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold"
                        onClick={() => setExpandedLogs(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
                        aria-expanded={!!expandedLogs[r.id]}
                        aria-controls={`logs-csec-${r.id}`}
                      >
                        {expandedLogs[r.id] ? 'Hide' : 'Show'} Activity Log
                      </button>
                      <div id={`logs-csec-${r.id}`} className={expandedLogs[r.id] ? 'mt-2 space-y-2' : 'hidden'}>
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
                ))}
              </div>
              {(byCommandSection[name] || []).length === 0 && (
                <div className="text-sm text-[var(--muted)]">No requests for {name}.</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
