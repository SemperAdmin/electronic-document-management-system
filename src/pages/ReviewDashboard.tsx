import React, { useEffect, useMemo, useRef, useState } from 'react'
import { loadUnitStructureFromBundle } from '@/lib/unitStructure'
import { PermissionManager } from '../components/PermissionManager'
import { listRequests, listDocuments, listUsers, upsertRequest, upsertDocuments } from '@/lib/db'
import { usePagination } from '@/hooks/usePagination'
import { Pagination } from '@/components/Pagination'
import RequestTable from '../components/RequestTable'
import { Request } from '../types'

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
  const [permOpen, setPermOpen] = useState(false)
  const [expandedCard, setExpandedCard] = useState<Record<string, boolean>>({})
  const [expandedUserDetails, setExpandedUserDetails] = useState<Record<string, boolean>>({})
  const [showInScope, setShowInScope] = useState(false)
  const [expandedDocs, setExpandedDocs] = useState<Record<string, boolean>>({})
  const [openDocsId, setOpenDocsId] = useState<string | null>(null)
  const docsRef = useRef<HTMLDivElement | null>(null)
  const [activeTab, setActiveTab] = useState<'Pending' | 'In Scope'>('Pending');

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
      const map: Record<string, any> = {}
      for (const u of (remote as any)) if (u?.id) map[u.id] = u
      setUsers(map)
    }).catch(() => setUsers({}))
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
        ;(async () => {
          try {
            const merged = await loadUnitStructureFromBundle()
            for (const uic of Object.keys(merged || {})) {
              const v = (merged as any)[uic]
              if (v && Array.isArray(v._sections)) secMap[uic] = v._sections
              if (v && v._platoonSectionMap && typeof v._platoonSectionMap === 'object') pMap[uic] = v._platoonSectionMap
            }
          } catch {}
        })()
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
        const ouic = o.unitUic || ''
        const cc = (currentUser?.roleCompany && currentUser.roleCompany !== 'N/A') ? currentUser.roleCompany : ''
        const cu = (currentUser?.rolePlatoon && currentUser.rolePlatoon !== 'N/A') ? currentUser.rolePlatoon : ''
        const cuic = currentUser?.unitUic || ''
        return oc === cc && ou === cu && (!cuic || ouic === cuic)
      }
      if (role.includes('COMPANY')) {
        const oc = (o.company && o.company !== 'N/A') ? o.company : ''
        const cc = (currentUser?.roleCompany && currentUser.roleCompany !== 'N/A') ? currentUser.roleCompany : ''
        const ouic = o.unitUic || ''
        const cuic = currentUser?.unitUic || ''
        return oc === cc && (!cuic || ouic === cuic)
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

  const inScope = useMemo(() => {
    const role = String(currentUser?.role || '')
    return requests.filter(r => {
      const o = originatorFor(r)
      if (!o) return false
      if (role.includes('PLATOON')) {
        const oc = (o.company && o.company !== 'N/A') ? o.company : ''
        const ou = (o.unit && o.unit !== 'N/A') ? o.unit : ''
        const ouic = o.unitUic || ''
        const cc = (currentUser?.roleCompany && currentUser.roleCompany !== 'N/A') ? currentUser.roleCompany : ''
        const cu = (currentUser?.rolePlatoon && currentUser.rolePlatoon !== 'N/A') ? currentUser.rolePlatoon : ''
        const cuic = currentUser?.unitUic || ''
        return oc === cc && ou === cu && (!cuic || ouic === cuic)
      }
      if (role.includes('COMPANY')) {
        const oc = (o.company && o.company !== 'N/A') ? o.company : ''
        const cc = (currentUser?.roleCompany && currentUser.roleCompany !== 'N/A') ? currentUser.roleCompany : ''
        const ouic = o.unitUic || ''
        const cuic = currentUser?.unitUic || ''
        return oc === cc && (!cuic || ouic === cuic)
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
  }, [requests, currentUser, users, platoonSectionMap])

  const inScopeOther = useMemo(() => {
    const myStageIndex = STAGES.indexOf(myStage)
    return inScope.filter(r => {
      const stage = r.currentStage || 'PLATOON_REVIEW'
      const requestStageIndex = STAGES.indexOf(stage)
      return requestStageIndex > myStageIndex
    })
  }, [inScope, myStage])

  // Pagination for pending requests
  const pendingPagination = usePagination(pending, { pageSize: 25 })

  // Pagination for in-scope requests
  const inScopePagination = usePagination(inScopeOther, { pageSize: 25 })

  const docsFor = (reqId: string) => documents.filter(d => d.requestId === reqId)

  const formatCsvCell = (v: any) => {
    const s = String(v ?? '')
    const escaped = s.replace(/"/g, '""')
    return `"${escaped}"`
  }
  const buildRows = (list: Request[]) => {
    const headers = ['Request ID','Subject','Stage','Route Section','Originator','Unit UIC','Company','Unit','Created At','Due Date','Documents']
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
        o?.company || '',
        o?.unit || '',
        new Date(r.createdAt).toLocaleString(),
        r.dueDate ? new Date(r.dueDate).toLocaleDateString() : '',
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
  const exportPending = () => downloadCsv('review_pending.csv', buildRows(pending))
  const exportInScope = () => downloadCsv('review_in_scope.csv', buildRows(inScopeOther))
  const exportAll = () => downloadCsv('review_all.csv', buildRows([...pending, ...inScopeOther]))

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
          <div>
            <h2 className="text-xl font-semibold text-[var(--text)]">Review Dashboard</h2>
            <div className="mt-2 flex items-center gap-2">
              <span className="px-2 py-1 text-xs bg-brand-cream text-brand-navy rounded-full border border-brand-navy/30">{String(currentUser?.role || 'MEMBER')}</span>
              <button className="px-3 py-1 text-xs rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2 hidden md:block" onClick={exportAll}>Export All</button>
            </div>
          </div>
          {currentUser && String(currentUser.role || '') !== 'MEMBER' && (
            <div className="flex-shrink-0 hidden md:block">
              <button
                className="px-4 py-2 rounded bg-brand-red text-brand-cream border-2 border-brand-red-2 shadow hover:bg-brand-red-2"
                onClick={() => setPermOpen(true)}
              >
                Manage Permissions
              </button>
            </div>
          )}
        </div>
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('Pending')}
              className={`${activeTab === 'Pending' ? 'border-brand-navy text-brand-navy' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Pending
            </button>
            <button
              onClick={() => setActiveTab('In Scope')}
              className={`${activeTab === 'In Scope' ? 'border-brand-navy text-brand-navy' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              In Scope
            </button>
          </nav>
        </div>
        <div className="mt-4">
          {activeTab === 'Pending' && (
            <RequestTable
              title="Pending"
              requests={pendingPagination.currentData}
              users={users}
              onRowClick={(r) => setExpandedCard(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
              expandedRows={expandedCard}
            >
              {(r: Request) => (
                <div id={`details-rev-${r.id}`}>
                  <div className="mt-3">
                    <button
                      className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2"
                      aria-expanded={!!expandedDocs[r.id]}
                      aria-controls={`docs-rev-${r.id}`}
                      onClick={() => { setExpandedDocs(prev => ({ ...prev, [r.id]: !prev[r.id] })); setOpenDocsId(prev => (!expandedDocs[r.id] ? r.id : null)) }}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedDocs(prev => ({ ...prev, [r.id]: !prev[r.id] })); setOpenDocsId(prev => (!expandedDocs[r.id] ? r.id : null)) } }}
                    >
                      <span>Show Documents</span>
                      <svg width="10" height="10" viewBox="0 0 20 20" className={`transition-transform ${expandedDocs[r.id] ? 'rotate-180' : 'rotate-0'}`} aria-hidden="true"><path d="M5 7l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
                    </button>
                  </div>
                  <div
                    id={`docs-rev-${r.id}`}
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
                    {String(currentUser?.role || '').includes('COMPANY') && (
                      <div className="flex items-center gap-2 mr-auto">
                        <label className="sr-only">Battalion Section</label>
                        <select
                          aria-label="Battalion Section"
                          value={selectedSection[r.id] || ''}
                          onChange={(e) => setSelectedSection(prev => ({ ...prev, [r.id]: e.target.value }))}
                          className="px-3 py-2 border border-brand-navy/30 rounded-lg"
                        >
                          <option value="">Select section</option>
                          {(unitSections[currentUser?.unitUic || ''] || []).map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    )}
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
              )}
            </RequestTable>
          )}
          {activeTab === 'In Scope' && (
            <RequestTable
              title="In Scope"
              requests={inScopePagination.currentData}
              users={users}
              onRowClick={(r) => setExpandedCard(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
              expandedRows={expandedCard}
            >
              {(r: Request) => (
                <div id={`details-rev-${r.id}`}>
                  <div className="mt-3">
                    <button
                      className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded bg-brand-cream text-brand-navy border border-brand-navy/30 hover:bg-brand-gold-2"
                      aria-expanded={!!expandedDocs[r.id]}
                      aria-controls={`docs-rev-${r.id}`}
                      onClick={() => { setExpandedDocs(prev => ({ ...prev, [r.id]: !prev[r.id] })); setOpenDocsId(prev => (!expandedDocs[r.id] ? r.id : null)) }}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedDocs(prev => ({ ...prev, [r.id]: !prev[r.id] })); setOpenDocsId(prev => (!expandedDocs[r.id] ? r.id : null)) } }}
                    >
                      <span>Show Documents</span>
                      <svg width="10" height="10" viewBox="0 0 20 20" className={`transition-transform ${expandedDocs[r.id] ? 'rotate-180' : 'rotate-0'}`} aria-hidden="true"><path d="M5 7l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
                    </button>
                  </div>
                  <div
                    id={`docs-rev-${r.id}`}
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
                </div>
              )}
            </RequestTable>
          )}
        </div>
      </div>
      {permOpen && currentUser && (
        <PermissionManager currentUser={currentUser} onClose={() => setPermOpen(false)} />
      )}
    </div>
  )
}
