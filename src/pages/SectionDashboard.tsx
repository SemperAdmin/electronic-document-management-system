import React, { useEffect, useMemo, useRef, useState } from 'react'
import { loadUnitStructureFromBundle } from '@/lib/unitStructure'
import { UNITS } from '../lib/units'
import { listRequests, listDocuments, listUsers, upsertRequest, upsertDocuments } from '@/lib/db'
import RequestTable from '../components/RequestTable'
import { Request } from '../types'

interface UserProfile {
  id: string
  firstName: string
  lastName: string
  mi?: string
  rank: string
  company: string
  unit: string
  unitUic?: string
  platoon?: string
}

interface RequestActivity {
  actor: string
  timestamp: string
  action: string
  comment?: string
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
  const [unitSections, setUnitSections] = useState<Record<string, string[]>>({})
  const [selectedBattalionSection, setSelectedBattalionSection] = useState<string>('')
  const [comments, setComments] = useState<Record<string, string>>({})
  const [attach, setAttach] = useState<Record<string, File[]>>({})
  const [commandSections, setCommandSections] = useState<Record<string, string[]>>({})
  const [selectedCmdSection, setSelectedCmdSection] = useState<Record<string, string>>({})
  const [expandedCard, setExpandedCard] = useState<Record<string, boolean>>({})
  const [approvalDateEdit, setApprovalDateEdit] = useState<Record<string, string>>({})
  const [endorseUnitSel, setEndorseUnitSel] = useState<Record<string, string>>({})
  const [endorseUnitSearch, setEndorseUnitSearch] = useState<Record<string, string>>({})
  const [externalAssignSel, setExternalAssignSel] = useState<Record<string, string>>({})
  const [expandedDocs, setExpandedDocs] = useState<Record<string, boolean>>({})
  const [openDocsId, setOpenDocsId] = useState<string | null>(null)
  const docsRef = useRef<HTMLDivElement | null>(null)
  const [activeTab, setActiveTab] = useState<'Pending' | 'Previously in Section'>('Pending');

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
    if (!selectedBattalionSection) {
      return sectionRouted
    }
    return sectionRouted.filter(r => {
      const section = battalionSectionFor(r)
      return section === selectedBattalionSection
    })
  }, [sectionRouted, selectedBattalionSection])

  const pendingInSection = useMemo(() => {
    return visibleRequests.filter(r => (r.currentStage || '') === 'BATTALION_REVIEW')
  }, [visibleRequests])

  const previousInSection = useMemo(() => {
    return visibleRequests.filter(r => {
      const stage = r.currentStage || ''
      return stage === 'COMMANDER_REVIEW' || stage === 'ARCHIVED'
    })
  }, [visibleRequests])

  function battalionSectionFor(r: Request) {
    const norm = (n: string) => String(n || '').trim().replace(/^S(\d)\b/, 'S-$1')
    if (r.routeSection) return norm(r.routeSection)
    const ouic = r.unitUic || ''
    const originator = usersById[r.uploadedById]
    const oc = (originator?.company && originator.company !== 'N/A') ? originator.company : ''
    const ou = (originator?.platoon && originator.platoon !== 'N/A') ? originator.platoon : ''
    const mapped = platoonSectionMap[ouic]?.[oc]?.[ou] || ''
    return norm(mapped)
  }

  const formatStage = (r: Request) => {
    const stage = r.currentStage || 'PLATOON_REVIEW'
    if (stage === 'PLATOON_REVIEW') return 'Platoon'
    if (stage === 'COMPANY_REVIEW') return 'Company'
    if (stage === 'BATTALION_REVIEW') return r.routeSection || 'Battalion'
    if (stage === 'COMMANDER_REVIEW') return r.routeSection || 'Commander'
    if (stage === 'EXTERNAL_REVIEW') return (r as any).externalPendingUnitName || 'External'
    if (stage === 'ARCHIVED') return 'Archived'
    return stage
  }

  const originatorName = (r: Request) => {
    const u = usersById[r.uploadedById]
    if (!u) return '—'
    const parts = [u.rank, u.lastName + ',', u.firstName, u.mi ? u.mi : ''].filter(Boolean)
    return parts.join(' ').trim()
  }

  const originatorAffiliation = (r: Request) => {
    const u = usersById[r.uploadedById]
    if (!u) return ''
    const vals = [
      (u.unit && u.unit !== 'N/A') ? u.unit : null,
      (u.company && u.company !== 'N/A') ? u.company : null,
      (u.platoon && u.platoon !== 'N/A') ? u.platoon : null,
    ].filter(Boolean) as string[]
    return vals.join(' • ')
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
      routeSection: dest === 'COMMANDER' ? '' : dest,
      activity: Array.isArray(r.activity) ? [...r.activity, entry] : [entry]
    }
    try {
      await upsertRequest(updated as any)
    } catch {}
    setRequests(prev => prev.map(x => (x.id === updated.id ? updated : x)))
    setComments(prev => ({ ...prev, [r.id]: '' }))
  }

  const endorseRequest = async (r: Request) => {
    const uic = endorseUnitSel[r.id]
    if (!uic) return
    const unit = UNITS.find(u => u.uic === uic)
    const actor = currentUser ? `${currentUser.rank} ${currentUser.lastName}, ${currentUser.firstName}${currentUser.mi ? ` ${currentUser.mi}` : ''}` : 'Reviewer'
    const entry = { actor, timestamp: new Date().toISOString(), action: `Endorsed to ${unit?.unitName || uic}`, comment: (comments[r.id] || '').trim() }
    const updated: Request = {
      ...r,
      currentStage: 'EXTERNAL_REVIEW',
      externalPendingUnitUic: uic,
      externalPendingUnitName: unit?.unitName || uic,
      activity: Array.isArray(r.activity) ? [...r.activity, entry] : [entry]
    }
    try {
      await upsertRequest(updated as any)
    } catch {}
    setRequests(prev => prev.map(x => (x.id === updated.id ? updated : x)))
    setComments(prev => ({ ...prev, [r.id]: '' }))
    setEndorseUnitSel(prev => ({ ...prev, [r.id]: '' }))
    setEndorseUnitSearch(prev => ({ ...prev, [r.id]: '' }))
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

  const filteredUnits = useMemo(() => {
    const result: Record<string, typeof UNITS> = {}
    for (const rId of Object.keys(endorseUnitSearch)) {
      const searchTerm = (endorseUnitSearch[rId] || '').toLowerCase();
      if (!searchTerm) {
        result[rId] = UNITS;
        continue;
      }
      result[rId] = UNITS.filter(u => {
        return (
          u.ruc.toLowerCase().startsWith(searchTerm) ||
          u.uic.toLowerCase().startsWith(searchTerm) ||
          u.mcc.toLowerCase().startsWith(searchTerm) ||
          u.unitName.toLowerCase().startsWith(searchTerm)
        );
      });
    }
    return result;
  }, [endorseUnitSearch]);

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

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-[var(--surface)] rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-[var(--text)]">Battalion Section Dashboard</h2>
          <div className="flex items-center gap-2">
            <select
              value={selectedBattalionSection}
              onChange={(e) => setSelectedBattalionSection(e.target.value)}
              className="px-3 py-2 border border-brand-navy/30 rounded-lg"
            >
              <option value="">All Sections</option>
              {(unitSections[currentUser?.unitUic || ''] || []).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
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
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
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
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('Pending')}
                className={`${activeTab === 'Pending' ? 'border-brand-navy text-brand-navy' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Pending
              </button>
              <button
                onClick={() => setActiveTab('Previously in Section')}
                className={`${activeTab === 'Previously in Section' ? 'border-brand-navy text-brand-navy' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Previously in Section
              </button>
            </nav>
          </div>
          <div className="mt-4">
            {activeTab === 'Pending' && (
              <RequestTable
                title="Pending"
                requests={pendingInSection}
                users={usersById}
                onRowClick={(r) => setExpandedCard(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
                expandedRows={expandedCard}
              >
                {(r: Request) => (
                  <div id={`details-sec-${r.id}`} className="p-4 bg-gray-50">
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
                      <select
                        value={selectedCmdSection[r.id] || 'COMMANDER'}
                        onChange={e => setSelectedCmdSection(prev => ({...prev, [r.id]: e.target.value}))}
                        className="px-3 py-2 border border-brand-navy/30 rounded-lg"
                      >
                        <option value="COMMANDER">Commander</option>
                        {(commandSections[currentUser?.unitUic || ''] || []).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
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
                    <div className="mt-3 flex items-center justify-end gap-2">
                      <input
                        type="text"
                        placeholder="Search for external unit..."
                        value={endorseUnitSearch[r.id] || ''}
                        onChange={(e) => setEndorseUnitSearch(prev => ({ ...prev, [r.id]: e.target.value }))}
                        className="w-full px-3 py-2 border border-brand-navy/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-gold"
                      />
                      <select
                        value={endorseUnitSel[r.id] || ''}
                        onChange={e => setEndorseUnitSel(prev => ({...prev, [r.id]: e.target.value}))}
                        className="px-3 py-2 border border-brand-navy/30 rounded-lg"
                      >
                        <option value="">Select unit</option>
                        {(filteredUnits[r.id] || UNITS).map(u => <option key={u.uic} value={u.uic}>{u.unitName} ({u.uic})</option>)}
                      </select>
                      <button
                        className="px-3 py-2 rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold"
                        onClick={() => endorseRequest(r)}
                        disabled={!endorseUnitSel[r.id]}
                      >
                        Endorse
                      </button>
                    </div>
                  </div>
                )}
              </RequestTable>
            )}
            {activeTab === 'Previously in Section' && (
              <RequestTable
                title="Previously in Section"
                requests={previousInSection}
                users={usersById}
                onRowClick={(r) => setExpandedCard(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
                expandedRows={expandedCard}
              >
                {(r: Request) => (
                  <div id={`details-sec-${r.id}`} className="p-4 bg-gray-50">
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
                  </div>
                )}
              </RequestTable>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
