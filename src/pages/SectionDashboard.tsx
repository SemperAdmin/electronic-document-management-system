import React, { useEffect, useMemo, useRef, useState } from 'react'
import { loadUnitStructureFromBundle } from '@/lib/unitStructure'
import { UNITS } from '../lib/units'
import { useNavigate } from 'react-router-dom'
import { listRequests, listDocuments, listUsers, upsertRequest, upsertDocuments } from '@/lib/db'

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
  submitForUserId?: string
  documentIds: string[]
  createdAt: string
  currentStage?: string
  routeSection?: string
  activity?: RequestActivity[]
  commanderApprovalDate?: string
  externalPendingUnitUic?: string
  externalPendingUnitName?: string
  externalPendingStage?: string
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
  const [expandedCard, setExpandedCard] = useState<Record<string, boolean>>({})
  const [approvalDateEdit, setApprovalDateEdit] = useState<Record<string, string>>({})
  const [endorseUnitSel, setEndorseUnitSel] = useState<Record<string, string>>({})
  const [externalAssignSel, setExternalAssignSel] = useState<Record<string, string>>({})
  const [expandedDocs, setExpandedDocs] = useState<Record<string, boolean>>({})
  const [openDocsId, setOpenDocsId] = useState<string | null>(null)
  const docsRef = useRef<HTMLDivElement | null>(null)

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
      const byId: Record<string, UserProfile> = {}
      for (const u of (remote as any)) byId[u.id] = u
      setUsersById(byId)
    }).catch(() => setUsersById({}))
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
        ;(async () => {
          try {
            const merged = await loadUnitStructureFromBundle()
            for (const uic of Object.keys(merged || {})) {
              const v = (merged as any)[uic]
              if (v && v._platoonSectionMap && typeof v._platoonSectionMap === 'object') pMap[uic] = v._platoonSectionMap
              if (v && Array.isArray(v._sections)) secMap[uic] = v._sections
              if (v && Array.isArray(v._commandSections)) cmdMap[uic] = v._commandSections
            }
          } catch {}
        })()
      }
      setPlatoonSectionMap(pMap)
      setUnitSections(secMap)
      setCommandSections(cmdMap)
    } catch {}
  }, [])

  const sectionRouted = useMemo(() => {
    const cuic = currentUser?.unitUic || ''
    return requests.filter(r => {
      const stage = r.currentStage || ''
      const effectiveUic = stage === 'EXTERNAL_REVIEW' ? (r.externalPendingUnitUic || r.unitUic || '') : (r.unitUic || '')
      const section = battalionSectionFor(r)
      return (!!section) && (cuic ? effectiveUic === cuic : true)
    })
  }, [requests, currentUser])

  const visibleRequests = useMemo(() => {
    const norm = (n: string) => String(n || '').trim().replace(/^S(\d)\b/, 'S-$1')
    return sectionRouted.filter(r => {
      const sec = norm(battalionSectionFor(r))
      const sel = norm(selectedBattalionSection)
      return selectedBattalionSection ? sec === sel : true
    })
  }, [sectionRouted, selectedBattalionSection])

  const pendingInSection = useMemo(() => {
    return visibleRequests.filter(r => {
      const stage = r.currentStage || ''
      if (stage === 'BATTALION_REVIEW') return true
      if (stage === 'EXTERNAL_REVIEW' && !!r.routeSection) return true
      return false
    })
  }, [visibleRequests])

  const previousInSection = useMemo(() => {
    return visibleRequests.filter(r => (r.currentStage || '') !== 'BATTALION_REVIEW')
  }, [visibleRequests])

  function battalionSectionFor(r: Request) {
    const norm = (n: string) => String(n || '').trim().replace(/^S(\d)\b/, 'S-$1')
    if (r.routeSection) return norm(r.routeSection)
    const ouic = r.unitUic || ''
    const originator = usersById[r.uploadedById]
    const oc = (originator?.company && originator.company !== 'N/A') ? originator.company : ''
    const ou = (originator?.unit && originator.unit !== 'N/A') ? originator.unit : ''
    const mapped = platoonSectionMap[ouic]?.[oc]?.[ou] || ''
    return norm(mapped)
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

  const commanderStatus = (r: Request) => {
    const acts = Array.isArray(r.activity) ? r.activity : []
    const last = [...acts].reverse().find(a => /Commander/i.test(String(a.action || '')))
    if (!last) return ''
    if (/Rejected/i.test(last.action)) return 'Rejected'
    if (/Endorsed/i.test(last.action)) return 'Endorsed'
    if (/Approved/i.test(last.action)) return 'Approved'
    return ''
  }

  const docsFor = (reqId: string) => documents.filter(d => d.requestId === reqId)

  const formatCsvCell = (v: any) => {
    const s = String(v ?? '')
    const escaped = s.replace(/"/g, '""')
    return `"${escaped}"`
  }
  const buildRows = (list: Request[]) => {
    const headers = ['Request ID','Subject','Stage','Battalion Section','Route Section','Originator','Unit UIC','Created At','Documents']
    const rows = [headers]
    for (const r of list) {
      const docs = docsFor(r.id).map(d => d.name).join(' | ')
      rows.push([
        r.id,
        r.subject,
        r.currentStage || '',
        battalionSectionFor(r) || '',
        r.routeSection || '',
        originatorName(r),
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
  const exportPending = () => downloadCsv('battalion_pending.csv', buildRows(pendingInSection))
  const exportPrevious = () => downloadCsv('battalion_previous.csv', buildRows(previousInSection))
  const exportAll = () => downloadCsv('battalion_all.csv', buildRows([...pendingInSection, ...previousInSection]))

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
      await upsertDocuments(newDocs as any)
      await upsertRequest(updated as any)
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
      await upsertRequest(updated as any)
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
      await upsertRequest(updated as any)
    } catch {}
    setRequests(prev => prev.map(x => (x.id === updated.id ? updated : x)))
    setComments(prev => ({ ...prev, [r.id]: '' }))
  }

  const externalPending = useMemo(() => {
    const uic = currentUser?.unitUic || ''
    return requests.filter(r => {
      const stage = r.currentStage || ''
      if (stage !== 'EXTERNAL_REVIEW') return false
      const recipientUic = (r.externalPendingUnitUic || r.unitUic || '')
      return (uic ? recipientUic === uic : true)
    })
  }, [requests, currentUser])

  const assignExternalToSection = async (r: Request) => {
    const dest = externalAssignSel[r.id]
    if (!dest) return
    const actor = currentUser ? `${currentUser.rank} ${currentUser.lastName}, ${currentUser.firstName}${(currentUser as any).mi ? ` ${(currentUser as any).mi}` : ''}` : 'Battalion'
    const updated: Request = {
      ...r,
      currentStage: 'BATTALION_REVIEW',
      unitUic: currentUser?.unitUic || r.externalPendingUnitUic || r.unitUic,
      routeSection: dest,
      externalPendingUnitUic: undefined,
      externalPendingUnitName: undefined,
      externalPendingStage: undefined,
      activity: Array.isArray(r.activity) ? [...r.activity, { actor, timestamp: new Date().toISOString(), action: `Battalion assigned external request to section ${dest}` }] : [{ actor, timestamp: new Date().toISOString(), action: `Battalion assigned external request to section ${dest}` }]
    }
    try {
      await upsertRequest(updated as any)
    } catch {}
    setRequests(prev => prev.map(x => (x.id === updated.id ? updated : x)))
  }

  const renderCard = (r: Request) => {
    const section = battalionSectionFor(r)
    const isReturned = false
    return (
      <div key={r.id} className={`${isReturned ? 'p-4 border border-brand-red-2 rounded-lg bg-brand-cream' : 'p-4 border border-brand-navy/20 rounded-lg bg-[var(--surface)]'} transition-all duration-300`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="font-medium text-[var(--text)]">{r.subject}</div>
            <div className="text-sm text-[var(--muted)]">Submitted {new Date(r.createdAt).toLocaleString()}</div>
            <div className="text-xs text-[var(--muted)]">Stage {r.currentStage || 'PLATOON_REVIEW'}</div>
            <div className="text-xs text-[var(--muted)] mt-1">{originatorName(r)}</div>
            {r.commanderApprovalDate && (
              <div className="text-xs text-[var(--muted)] mt-1">Commander Approval: {new Date(r.commanderApprovalDate).toLocaleDateString()}</div>
            )}
          </div>
          <div className="text-right">
            <div className="text-sm">Battalion Section</div>
            <div className="font-semibold">{section || '—'}</div>
            {r.routeSection && (
              <div className="text-xs text-[var(--muted)] mt-1">Routed: {r.routeSection}</div>
            )}
            {r.externalPendingUnitName && (
              <div className="text-xs text-[var(--muted)] mt-1">Pending: {r.externalPendingUnitName}</div>
            )}
            <div className="mt-2">
              <button
                className="px-3 py-1 text-xs rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2"
                onClick={() => setExpandedCard(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
                aria-expanded={!!expandedCard[r.id]}
                aria-controls={`details-sec-${r.id}`}
              >
                {expandedCard[r.id] ? 'Hide Details' : 'Edit / Details'}
              </button>
            </div>
          </div>
        </div>
        {(r.currentStage === 'BATTALION_REVIEW' && commanderStatus(r) === 'Approved') && (
          <div className="mt-3 flex items-center gap-2">
            <label className="text-sm text-[var(--text)]">Commander Approval Date</label>
            <input
              type="date"
              value={approvalDateEdit[r.id] ?? (r.commanderApprovalDate ? new Date(r.commanderApprovalDate).toISOString().slice(0,10) : '')}
              onChange={(e) => setApprovalDateEdit(prev => ({ ...prev, [r.id]: e.target.value }))}
              className="px-3 py-2 border border-brand-navy/30 rounded-lg"
            />
            <button
              className="px-3 py-1 text-xs bg-brand-gold text-brand-charcoal rounded hover:bg-brand-gold-2"
              onClick={async () => {
                const actor = currentUser ? `${currentUser.rank} ${currentUser.lastName}, ${currentUser.firstName}${(currentUser as any).mi ? ` ${(currentUser as any).mi}` : ''}` : 'Battalion'
                const iso = approvalDateEdit[r.id] ? new Date(approvalDateEdit[r.id]).toISOString() : r.commanderApprovalDate
                const updated: Request = {
                  ...r,
                  commanderApprovalDate: iso,
                  activity: Array.isArray(r.activity) ? [...r.activity, { actor, timestamp: new Date().toISOString(), action: `Battalion updated commander approval date to ${approvalDateEdit[r.id] || ''}` }] : [{ actor, timestamp: new Date().toISOString(), action: `Battalion updated commander approval date to ${approvalDateEdit[r.id] || ''}` }]
                }
                try {
                  localStorage.setItem(`fs/requests/${updated.id}.json`, JSON.stringify(updated))
                  await fetch('/api/requests/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) })
                } catch {}
                setRequests(prev => prev.map(x => (x.id === updated.id ? updated : x)))
              }}
            >
              Save Date
            </button>
          </div>
        )}

        {(r.currentStage === 'BATTALION_REVIEW' && commanderStatus(r) === 'Endorsed') && (
          <div className="mt-3 flex items-center gap-2">
            <label className="text-sm text-[var(--text)]">Send to Unit</label>
            <select
              value={endorseUnitSel[r.id] || ''}
              onChange={(e) => setEndorseUnitSel(prev => ({ ...prev, [r.id]: e.target.value }))}
              className="px-3 py-2 border border-brand-navy/30 rounded-lg"
            >
              <option value="">Select unit</option>
              {UNITS.map(u => (
                <option key={u.uic} value={u.uic}>{u.unitName}</option>
              ))}
            </select>
            <button
              className="px-3 py-1 text-xs bg-brand-gold text-brand-charcoal rounded hover:bg-brand-gold-2"
              disabled={!endorseUnitSel[r.id]}
              onClick={async () => {
                const unit = UNITS.find(u => u.uic === endorseUnitSel[r.id])
                const actor = currentUser ? `${currentUser.rank} ${currentUser.lastName}, ${currentUser.firstName}${(currentUser as any).mi ? ` ${(currentUser as any).mi}` : ''}` : 'Battalion'
                const updated: Request = {
                  ...r,
                  currentStage: 'EXTERNAL_REVIEW',
                  externalPendingUnitUic: unit?.uic || endorseUnitSel[r.id],
                  externalPendingUnitName: unit?.unitName || endorseUnitSel[r.id],
                  externalPendingStage: 'Pending at external unit',
                  activity: Array.isArray(r.activity) ? [...r.activity, { actor, timestamp: new Date().toISOString(), action: `Battalion routed to unit ${unit?.unitName || endorseUnitSel[r.id]}` }] : [{ actor, timestamp: new Date().toISOString(), action: `Battalion routed to unit ${unit?.unitName || endorseUnitSel[r.id]}` }]
                }
                try {
                  localStorage.setItem(`fs/requests/${updated.id}.json`, JSON.stringify(updated))
                  await fetch('/api/requests/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) })
                } catch {}
                setRequests(prev => prev.map(x => (x.id === updated.id ? updated : x)))
              }}
            >
              Send
            </button>
          </div>
        )}
        <div id={`details-sec-${r.id}`} className={expandedCard[r.id] ? '' : 'hidden'}>
        <div className="mt-3">
          <button
            className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2"
            aria-expanded={!!expandedDocs[r.id]}
            aria-controls={`docs-sec-${r.id}`}
            onClick={() => { setExpandedDocs(prev => ({ ...prev, [r.id]: !prev[r.id] })); setOpenDocsId(prev => (!expandedDocs[r.id] ? r.id : null)) }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedDocs(prev => ({ ...prev, [r.id]: !prev[r.id] })); setOpenDocsId(prev => (!expandedDocs[r.id] ? r.id : null)) } }}
          >
            <span>Show Documents</span>
            <svg width="10" height="10" viewBox="0 0 20 20" className={`transition-transform ${expandedDocs[r.id] ? 'rotate-180' : 'rotate-0'}`} aria-hidden="true"><path d="M5 7l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
          </button>
        </div>
        <div
          id={`docs-sec-${r.id}`}
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
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-[var(--surface)] rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-[var(--text)]">Battalion Section Dashboard</h2>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 text-xs bg-brand-cream text-brand-navy rounded-full border border-brand-navy/30">{selectedBattalionSection || '—'}</span>
            <button className="px-3 py-1 text-xs rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2" onClick={exportAll}>Export All</button>
          </div>
        </div>

        <div className="space-y-8">
          {externalPending.length > 0 && (
            <div className="p-4 border border-brand-gold rounded-lg bg-brand-cream">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-[var(--text)]">Pending Assignment (External Requests)</h3>
                <span className="text-xs px-2 py-1 bg-brand-cream text-brand-navy rounded-full border border-brand-navy/30">{externalPending.length} item(s)</span>
              </div>
              <div className="flex flex-col gap-4">
                {externalPending.map(r => (
                  <div key={r.id} className="p-4 border border-brand-navy/20 rounded-lg bg-[var(--surface)] transition-all duration-300">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-[var(--text)]">{r.subject}</div>
                        <div className="text-sm text-[var(--muted)]">Submitted {new Date(r.createdAt).toLocaleString()}</div>
                        <div className="text-xs text-[var(--muted)] mt-1">From {r.externalPendingUnitName || 'External Unit'}</div>
                      </div>
                      <span className="px-2 py-1 text-xs bg-brand-cream text-brand-navy rounded-full border border-brand-navy/30">EXTERNAL_REVIEW</span>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <label className="text-sm text-[var(--text)]">Assign to Section</label>
                      <select
                        value={externalAssignSel[r.id] || ''}
                        onChange={(e) => setExternalAssignSel(prev => ({ ...prev, [r.id]: e.target.value }))}
                        className="px-3 py-2 border border-brand-navy/30 rounded-lg"
                      >
                        <option value="">Select section</option>
                        {(unitSections[currentUser?.unitUic || ''] || []).map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <button
                        className="px-3 py-1 text-xs bg-brand-gold text-brand-charcoal rounded hover:bg-brand-gold-2"
                        disabled={!externalAssignSel[r.id]}
                        onClick={() => assignExternalToSection(r)}
                      >
                        Assign
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <div className="flex items-center justify-between mb-3"><h3 className="text-lg font-semibold text-[var(--text)]">Pending in Section</h3><button className="px-3 py-1 text-xs rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2" onClick={exportPending}>Export Pending</button></div>
            <div className="flex flex-col gap-4">
              {pendingInSection.map(r => renderCard(r))}
            </div>
            {pendingInSection.length === 0 && (
              <div className="text-sm text-[var(--muted)]">No pending requests in this section.</div>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-3"><h3 className="text-lg font-semibold text-[var(--text)]">Previously in Section</h3><button className="px-3 py-1 text-xs rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2" onClick={exportPrevious}>Export Previous</button></div>
            <div className="flex flex-col gap-4">
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
